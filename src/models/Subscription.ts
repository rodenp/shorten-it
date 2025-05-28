// src/models/Subscription.ts
import { pool } from '@/lib/db';

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
      planId: string;
      nextBillingDate: Date;
      usage: number;
      limit: number;
    }>(
      `
      SELECT "userId", "planId", "nextBillingDate", usage, "limit"
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
        nextBillingDate: row.nextBillingDate,
        usage: row.usage,
        limit: row.limit,
      };
    }
    // Default to Free plan
    const freeRes = await pool.query<{ limit: string }>(
      `SELECT "limit" FROM plans WHERE id = 'free'`
    );
    const freeLimit = freeRes.rows[0]?.limit ?? '0';
    return {
      userId,
      planId: 'free',
      nextBillingDate: null,
      usage: 0,
      limit: Number(freeLimit),
    };
  },

  /** Upsert a user's subscription plan */
  async updatePlan(userId: string, planId: string): Promise<Subscription> {
    if (!pool) throw new Error('Database not configured');

    // Look up plan settings
    const planRes = await pool.query<{ period: string; limit: string }>(
      `SELECT period, "limit" FROM plans WHERE id = $1`,
      [planId]
    );
    if (planRes.rows.length === 0) {
      throw new Error('Invalid plan ID');
    }
    const { period, limit: limitStr } = planRes.rows[0];
    const limitNum = Number(limitStr);

    // Calculate next billing date
    const nextBillingDate = new Date();
    if (period.toLowerCase().startsWith('annual')) {
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
    } else {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    }

    // Upsert subscription record
    await pool.query(
      `
      INSERT INTO subscriptions ("userId","planId","nextBillingDate",usage,"limit")
      VALUES ($1,$2,$3,0,$4)
      ON CONFLICT ("userId") DO UPDATE
        SET "planId" = $2,
            "nextBillingDate" = $3,
            "limit" = $4
      `,
      [userId, planId, nextBillingDate.toISOString(), limitNum]
    );

    return {
      userId,
      planId,
      nextBillingDate,
      usage: 0,
      limit: limitNum,
    };
  }
};
