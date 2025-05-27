// src/models/Subscription.ts
import { pool } from '@/lib/db';
import Stripe from 'stripe';
// Attempt to import config. If this fails in a real TS environment,
// we might need to adjust tsconfig.json (e.g. esModuleInterop: true)
// or use require if the project setup dictates.
const stripeConfig = require('../../config/stripeConfig');

const stripe = new Stripe(stripeConfig.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16', // Use a fixed API version
});

export interface Plan {
  id: string;
  name: string;
  price: number;
  period: string;     // e.g. 'Monthly' | 'Annual'
  limit: number;      // click limit per billing period (0 = unlimited)
  features: string[]; // list of feature keys
}

export interface Subscription {
  userId: string;
  planId: string;
  stripeCustomerId?: string | null; // Added
  stripeSubscriptionId?: string | null; // Added
  nextBillingDate: Date | null;
  usage: number;
  limit: number;
}

export const SubscriptionModel = {
  /** Fetch all plans with their feature keys from the database */
  async listPlans(): Promise<Plan[]> {
    if (!pool) throw new Error('Database not configured');
    const res = await pool.query<{
      id: string;
      name: string;
      price: string;
      period: string;
      limit: string;
      features: string[];
    }>(
      `
      SELECT
        p.id,
        p.name,
        p.price,
        p.period,
        p."limit",
        array_agg(f.key ORDER BY f.section, f.id) AS features
      FROM plans p
      JOIN plan_features pf ON pf.plan_id = p.id
      JOIN features f       ON f.id       = pf.feature_id
      GROUP BY p.id, p.name, p.price, p.period, p."limit"
      ORDER BY p.price
      `
    );
    return res.rows.map(row => ({
      id: row.id,
      name: row.name,
      price: parseFloat(row.price),
      period: row.period,
      limit: Number(row.limit),
      features: row.features,
    }));
  },

  /** Fetch all features grouped by section */
  async listFeatureSections(): Promise<
    { section: string; features: { key: string; label: string }[] }[]
  > {
    if (!pool) throw new Error('Database not configured');
    const res = await pool.query<{
      section: string;
      features: { key: string; label: string }[];
    }>(
      `
      SELECT
        f.section,
        json_agg(
          json_build_object('key', f.key, 'label', f.label)
          ORDER BY f.id
        ) AS features
      FROM features f
      GROUP BY f.section
      ORDER BY
        CASE f.section
          WHEN 'Core' THEN 1
          WHEN 'Advanced' THEN 2
          WHEN 'Essentials' THEN 3
          ELSE 4 END
      `
    );
    return res.rows.map(row => ({
      section: row.section,
      features: row.features as { key: string; label: string }[],
    }));
  },

  /** Get a user's current subscription, defaulting to Free if none exists */
  async getByUserId(userId: string): Promise<Subscription> {
    if (!pool) throw new Error('Database not configured');
    const res = await pool.query<{
      userId: string;
      userId: string;
      planId: string;
      stripeCustomerId: string | null; // Added
      stripeSubscriptionId: string | null; // Added
      nextBillingDate: Date | null; // Nullable for free plan
      usage: number;
      limit: number;
    }>(
      `
      SELECT "userId", "planId", "stripeCustomerId", "stripeSubscriptionId", "nextBillingDate", usage, "limit"
      FROM subscriptions
      WHERE "userId" = $1
      LIMIT 1
      `,
      [userId]
    );
    if (res.rows.length > 0) {
      const row = res.rows[0];
      return {
        userId: row.userId,
        planId: row.planId,
        stripeCustomerId: row.stripeCustomerId,
        stripeSubscriptionId: row.stripeSubscriptionId,
        nextBillingDate: row.nextBillingDate,
        usage: row.usage,
        limit: row.limit,
      };
    }
    // Default to Free plan (no Stripe IDs)
    const freeRes = await pool.query<{ limit: string }>(
      `SELECT "limit" FROM plans WHERE id = 'free'`
    );
    const freeLimit = freeRes.rows[0]?.limit ?? '0';
    return {
      userId,
      planId: 'free',
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      nextBillingDate: null,
      usage: 0,
      limit: Number(freeLimit),
    };
  },

  /** Upsert a user's subscription plan, integrating with Stripe */
  async updatePlan(userId: string, newPlanId: string, userEmail?: string): Promise<Subscription> {
    if (!pool) throw new Error('Database not configured');
    if (!stripeConfig.PRICE_IDS[newPlanId.toUpperCase()] && newPlanId !== 'free') {
        throw new Error(`Invalid or unsupported plan ID for Stripe: ${newPlanId}`);
    }

    const currentSubscription = await this.getByUserId(userId);
    let { stripeCustomerId, stripeSubscriptionId } = currentSubscription;

    // Look up new plan details
    const newPlanRes = await pool.query<{ period: string; limit: string }>(
      `SELECT period, "limit" FROM plans WHERE id = $1`,
      [newPlanId]
    );
    if (newPlanRes.rows.length === 0) {
      throw new Error(`Invalid new plan ID: ${newPlanId}`);
    }
    const { period: newPlanPeriod, limit: newPlanLimitStr } = newPlanRes.rows[0];
    const newPlanLimitNum = Number(newPlanLimitStr);
    let newNextBillingDate: Date | null = new Date();

    if (newPlanId === 'free') {
      // Downgrading to Free: Cancel Stripe subscription if it exists
      if (stripeSubscriptionId) {
        try {
          await stripe.subscriptions.del(stripeSubscriptionId);
          console.log(`Stripe subscription ${stripeSubscriptionId} cancelled for user ${userId}.`);
        } catch (error) {
          console.error(`Error cancelling Stripe subscription ${stripeSubscriptionId} for user ${userId}:`, error);
          // Potentially throw, but for now, we'll allow local DB update to 'free'
          // throw new Error('Failed to cancel Stripe subscription.');
        }
        stripeSubscriptionId = null; // Clear Stripe subscription ID
      }
      newNextBillingDate = null; // Free plans don't have a next billing date
    } else {
      // Upgrading or changing paid plans
      const newStripePriceId = stripeConfig.PRICE_IDS[newPlanId.toUpperCase()];
      if (!newStripePriceId) {
        throw new Error(`Stripe Price ID not found for plan: ${newPlanId}`);
      }

      if (!stripeCustomerId && userEmail) {
        // Create Stripe customer if one doesn't exist
        try {
          const customer = await stripe.customers.create({ email: userEmail, name: userId }); // Assuming userId can be name
          stripeCustomerId = customer.id;
          // Persist stripeCustomerId immediately
          await pool.query(
            `UPDATE subscriptions SET "stripeCustomerId" = $1 WHERE "userId" = $2`,
            [stripeCustomerId, userId]
          );
        } catch (error) {
          console.error(`Error creating Stripe customer for user ${userId}:`, error);
          throw new Error('Failed to create Stripe customer.');
        }
      } else if (!stripeCustomerId) {
          throw new Error('User email is required to create a new Stripe customer for a paid plan.');
      }


      if (stripeSubscriptionId) {
        // User has an existing subscription, update it (upgrade/downgrade between paid plans)
        try {
          const currentStripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
          const updatedSubscription = await stripe.subscriptions.update(stripeSubscriptionId, {
            items: [{
              id: currentStripeSub.items.data[0].id, // Get the ID of the current subscription item
              price: newStripePriceId,
            }],
            proration_behavior: 'create_prorations', // Apply prorations
            expand: ['latest_invoice.payment_intent', 'pending_setup_intent'],
          });
          newNextBillingDate = new Date(updatedSubscription.current_period_end * 1000);
          stripeSubscriptionId = updatedSubscription.id; // Should be the same, but good to re-assign
        } catch (error) {
          console.error(`Error updating Stripe subscription for user ${userId}:`, error);
          throw new Error('Failed to update Stripe subscription.');
        }
      } else {
        // User is moving from Free to a Paid plan (new subscription)
        try {
          const newStripeSubscription = await stripe.subscriptions.create({
            customer: stripeCustomerId,
            items: [{ price: newStripePriceId }],
            proration_behavior: 'create_prorations',
            expand: ['latest_invoice.payment_intent', 'pending_setup_intent'],
            // trial_period_days: newPlanId.toUpperCase() === 'PRO' ? 14 : undefined, // Example: Add trial for PRO plan
          });
          stripeSubscriptionId = newStripeSubscription.id;
          newNextBillingDate = new Date(newStripeSubscription.current_period_end * 1000);
        } catch (error) {
          console.error(`Error creating new Stripe subscription for user ${userId}:`, error);
          throw new Error('Failed to create new Stripe subscription.');
        }
      }
    }

    // Upsert local subscription record
    const query = `
      INSERT INTO subscriptions ("userId", "planId", "stripeCustomerId", "stripeSubscriptionId", "nextBillingDate", usage, "limit")
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT ("userId") DO UPDATE
        SET "planId" = EXCLUDED."planId",
            "stripeCustomerId" = EXCLUDED."stripeCustomerId",
            "stripeSubscriptionId" = EXCLUDED."stripeSubscriptionId",
            "nextBillingDate" = EXCLUDED."nextBillingDate",
            "limit" = EXCLUDED."limit",
            usage = CASE WHEN "planId" != EXCLUDED."planId" THEN 0 ELSE subscriptions.usage END; -- Reset usage if plan changes
    `;
    await pool.query(query, [
      userId,
      newPlanId,
      stripeCustomerId,
      stripeSubscriptionId,
      newNextBillingDate ? newNextBillingDate.toISOString() : null,
      currentSubscription.planId === newPlanId ? currentSubscription.usage : 0, // Reset usage if plan changes
      newPlanLimitNum,
    ]);

    return {
      userId,
      planId: newPlanId,
      stripeCustomerId,
      stripeSubscriptionId,
      nextBillingDate: newNextBillingDate,
      usage: currentSubscription.planId === newPlanId ? currentSubscription.usage : 0,
      limit: newPlanLimitNum,
    };
  },

  async cancelSubscription(userId: string): Promise<Subscription> {
    if (!pool) throw new Error('Database not configured');

    const currentSubscription = await this.getByUserId(userId);
    let { stripeSubscriptionId } = currentSubscription;

    const freePlanRes = await pool.query<{ limit: string }>(
      `SELECT "limit" FROM plans WHERE id = 'free'`
    );
    if (freePlanRes.rows.length === 0) {
      throw new Error('Free plan details not found.'); // Should not happen
    }
    const freePlanLimit = Number(freePlanRes.rows[0].limit);

    if (stripeSubscriptionId) {
      try {
        // Option 1: Cancel immediately
        // await stripe.subscriptions.del(stripeSubscriptionId);
        // console.log(`Stripe subscription ${stripeSubscriptionId} cancelled immediately for user ${userId}.`);

        // Option 2: Cancel at period end (more user-friendly)
        const cancelledStripeSub = await stripe.subscriptions.update(stripeSubscriptionId, {
          cancel_at_period_end: true,
        });
        console.log(`Stripe subscription ${stripeSubscriptionId} for user ${userId} scheduled to cancel at period end: ${new Date(cancelledStripeSub.cancel_at_period_end * 1000)}.`);
        // Note: The local DB will reflect 'free' immediately.
        // Webhooks should handle the actual subscription expiry from Stripe if further action is needed then.
        // For this model, we are reflecting the user's intent to cancel and reverting them to free locally.
        stripeSubscriptionId = null; // Nullify as user has chosen to cancel.
                                     // Or keep it if you want to show 'pending cancellation' status.
                                     // For simplicity here, we nullify it.
      } catch (error) {
        console.error(`Error cancelling Stripe subscription ${currentSubscription.stripeSubscriptionId} for user ${userId}:`, error);
        // Depending on policy, you might throw or allow local cancellation anyway.
        // For now, we'll log and proceed to update local to 'free'.
        // throw new Error('Failed to cancel Stripe subscription.');
      }
    }

    // Update local subscription to 'free' plan
    const query = `
      UPDATE subscriptions
      SET "planId" = 'free',
          "stripeSubscriptionId" = NULL,
          "nextBillingDate" = NULL,
          "limit" = $1,
          usage = 0
      WHERE "userId" = $2
      RETURNING "planId", "stripeCustomerId", "stripeSubscriptionId", "nextBillingDate", usage, "limit";
    `;
    // If the user wasn't in the subscriptions table (e.g. was already free and somehow called cancel)
    // this update won't do anything, which is fine. We'll return a 'free' state object.
    // To be robust, we could do an INSERT ... ON CONFLICT DO UPDATE if a 'free' user might not have a row.
    // However, getByUserId already defaults to a Free plan structure if no row exists.

    const updatedResult = await pool.query(query, [freePlanLimit, userId]);

    if (updatedResult.rows.length > 0) {
        const updatedRow = updatedResult.rows[0];
        return {
            userId,
            planId: updatedRow.planId,
            stripeCustomerId: updatedRow.stripeCustomerId, // Persists from before
            stripeSubscriptionId: updatedRow.stripeSubscriptionId, // Will be null
            nextBillingDate: updatedRow.nextBillingDate, // Will be null
            usage: updatedRow.usage, // Will be 0
            limit: updatedRow.limit, // Free plan limit
        };
    }
    
    // If the UPDATE didn't affect any rows (e.g., user had no existing subscription record)
    // return a representation of the 'free' plan state.
    // This ensures consistency with how getByUserId handles users not in the table.
    return {
        userId,
        planId: 'free',
        stripeCustomerId: currentSubscription.stripeCustomerId, // Preserve if they had one
        stripeSubscriptionId: null,
        nextBillingDate: null,
        usage: 0,
        limit: freePlanLimit,
    };
  }
};
