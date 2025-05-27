// src/models/__tests__/SubscriptionModel.test.ts

// Mock dependencies
jest.mock('@/lib/db', () => ({
  pool: {
    query: jest.fn(),
  },
}));

// Mock Stripe configuration
jest.mock('../../config/stripeConfig', () => ({
  STRIPE_SECRET_KEY: 'sk_test_mock',
  PRODUCT_IDS: {
    FREE: 'prod_free_placeholder',
    PRO: 'prod_pro_placeholder',
    BUSINESS: 'prod_business_placeholder',
  },
  PRICE_IDS: {
    PRO: 'price_pro_placeholder',
    BUSINESS: 'price_business_placeholder',
  },
}));

// Mock Stripe SDK
const mockStripe = {
  customers: {
    create: jest.fn(),
    list: jest.fn(),
  },
  subscriptions: {
    create: jest.fn(),
    retrieve: jest.fn(),
    update: jest.fn(),
    del: jest.fn(),
  },
};
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => mockStripe);
});

import { pool } from '@/lib/db'; // This will be our mock pool
import { SubscriptionModel, Subscription, Plan } from '../Subscription'; // Adjusted import path
import stripeConfig from '../../config/stripeConfig'; // Adjusted import path

// Cast pool.query to jest.Mock for type safety in tests
const mockPoolQuery = pool.query as jest.Mock;

describe('SubscriptionModel', () => {
  beforeEach(() => {
    // Clear all mock implementations and calls before each test
    jest.clearAllMocks();
    mockPoolQuery.mockReset();
  });

  describe('listPlans', () => {
    it('should fetch and format plans correctly', async () => {
      const mockDbPlans = [
        { id: 'free', name: 'Free', price: '0', period: 'Monthly', limit: '100', features: ['feat1'] },
        { id: 'pro', name: 'Pro', price: '20', period: 'Monthly', limit: '1000', features: ['feat1', 'feat2'] },
      ];
      mockPoolQuery.mockResolvedValueOnce({ rows: mockDbPlans });

      const plans = await SubscriptionModel.listPlans();

      expect(pool.query).toHaveBeenCalledTimes(1);
      expect(plans).toEqual([
        { id: 'free', name: 'Free', price: 0, period: 'Monthly', limit: 100, features: ['feat1'] },
        { id: 'pro', name: 'Pro', price: 20, period: 'Monthly', limit: 1000, features: ['feat1', 'feat2'] },
      ]);
    });
  });

  describe('listFeatureSections', () => {
    it('should fetch and group features correctly', async () => {
      const mockDbFeatures = [
        { section: 'Core', features: [{ key: 'feat1', label: 'Feature 1' }] },
        { section: 'Advanced', features: [{ key: 'feat2', label: 'Feature 2' }] },
      ];
      mockPoolQuery.mockResolvedValueOnce({ rows: mockDbFeatures });

      const sections = await SubscriptionModel.listFeatureSections();
      expect(pool.query).toHaveBeenCalledTimes(1);
      expect(sections).toEqual(mockDbFeatures);
    });
  });

  describe('getByUserId', () => {
    it('should return existing subscription with Stripe IDs', async () => {
      const userId = 'user-123';
      const mockSub = {
        userId,
        planId: 'pro',
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_123',
        nextBillingDate: new Date(),
        usage: 10,
        limit: 1000,
      };
      mockPoolQuery.mockResolvedValueOnce({ rows: [mockSub] });

      const sub = await SubscriptionModel.getByUserId(userId);
      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('SELECT "userId", "planId", "stripeCustomerId"'), [userId]);
      expect(sub).toEqual(mockSub);
    });

    it('should return default free plan if no subscription exists', async () => {
      const userId = 'user-404';
      mockPoolQuery.mockResolvedValueOnce({ rows: [] }); // No subscription found
      mockPoolQuery.mockResolvedValueOnce({ rows: [{ limit: '100' }] }); // Free plan limit lookup

      const sub = await SubscriptionModel.getByUserId(userId);
      expect(pool.query).toHaveBeenCalledTimes(2);
      expect(sub).toEqual({
        userId,
        planId: 'free',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        nextBillingDate: null,
        usage: 0,
        limit: 100,
      });
    });
  });

  describe('updatePlan', () => {
    const userId = 'user-test';
    const userEmail = 'test@example.com';

    it('upgrades from free to paid (PRO plan)', async () => {
      // Mock current subscription (free plan)
      mockPoolQuery.mockResolvedValueOnce({ rows: [] }); // getByUserId -> no sub
      mockPoolQuery.mockResolvedValueOnce({ rows: [{ limit: '100' }] }); // getByUserId -> free plan limit
      // Mock new plan details from DB
      mockPoolQuery.mockResolvedValueOnce({ rows: [{ period: 'Monthly', limit: '1000' }] });
      // Mock Stripe customer creation
      const mockStripeCustomer = { id: 'cus_new', email: userEmail };
      mockStripe.customers.create.mockResolvedValueOnce(mockStripeCustomer);
      // Mock DB update for stripeCustomerId (this might be part of the final upsert in actual code)
      mockPoolQuery.mockResolvedValueOnce({ rows: [] }); // For the UPDATE subscriptions SET "stripeCustomerId"
      // Mock Stripe subscription creation
      const mockStripeSub = { id: 'sub_new_pro', current_period_end: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) };
      mockStripe.subscriptions.create.mockResolvedValueOnce(mockStripeSub);
      // Mock final DB upsert
      mockPoolQuery.mockResolvedValueOnce({ rows: [] });

      const newPlanId = 'PRO';
      const result = await SubscriptionModel.updatePlan(userId, newPlanId, userEmail);

      expect(mockStripe.customers.create).toHaveBeenCalledWith({ email: userEmail, name: userId });
      expect(mockStripe.subscriptions.create).toHaveBeenCalledWith({
        customer: mockStripeCustomer.id,
        items: [{ price: stripeConfig.PRICE_IDS.PRO }],
        proration_behavior: 'create_prorations',
        expand: expect.any(Array),
      });
      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO subscriptions'), expect.arrayContaining([
        userId, newPlanId, mockStripeCustomer.id, mockStripeSub.id
      ]));
      expect(result.planId).toBe(newPlanId);
      expect(result.stripeSubscriptionId).toBe(mockStripeSub.id);
    });
    
    it('upgrades between paid plans (PRO to BUSINESS)', async () => {
      const currentStripeSubId = 'sub_current_pro';
      const currentStripeCustId = 'cus_existing';
      const mockCurrentSub: Subscription = {
        userId, planId: 'PRO', stripeCustomerId: currentStripeCustId, stripeSubscriptionId: currentStripeSubId,
        nextBillingDate: new Date(), usage: 50, limit: 1000,
      };
      mockPoolQuery.mockResolvedValueOnce({ rows: [mockCurrentSub] }); // getByUserId
      mockPoolQuery.mockResolvedValueOnce({ rows: [{ period: 'Monthly', limit: '5000' }] }); // New plan (BUSINESS) details

      mockStripe.subscriptions.retrieve.mockResolvedValueOnce({ items: { data: [{ id: 'item_123' }] } });
      const updatedStripeSub = { id: currentStripeSubId, current_period_end: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) };
      mockStripe.subscriptions.update.mockResolvedValueOnce(updatedStripeSub);
      mockPoolQuery.mockResolvedValueOnce({ rows: [] }); // Final DB upsert

      const newPlanId = 'BUSINESS';
      const result = await SubscriptionModel.updatePlan(userId, newPlanId, userEmail);

      expect(mockStripe.subscriptions.retrieve).toHaveBeenCalledWith(currentStripeSubId);
      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith(currentStripeSubId, {
        items: [{ id: 'item_123', price: stripeConfig.PRICE_IDS.BUSINESS }],
        proration_behavior: 'create_prorations',
        expand: expect.any(Array),
      });
      expect(result.planId).toBe(newPlanId);
      expect(result.stripeSubscriptionId).toBe(currentStripeSubId);
    });

    it('downgrades from paid to free', async () => {
      const currentStripeSubId = 'sub_current_pro_to_free';
      const currentStripeCustId = 'cus_existing_to_free';
      const mockCurrentSub: Subscription = {
        userId, planId: 'PRO', stripeCustomerId: currentStripeCustId, stripeSubscriptionId: currentStripeSubId,
        nextBillingDate: new Date(), usage: 50, limit: 1000,
      };
      mockPoolQuery.mockResolvedValueOnce({ rows: [mockCurrentSub] }); // getByUserId
      mockPoolQuery.mockResolvedValueOnce({ rows: [{ period: 'Monthly', limit: '100' }] }); // Free plan details
      
      mockStripe.subscriptions.del.mockResolvedValueOnce({ id: currentStripeSubId, status: 'canceled' }); // Stripe cancellation
      mockPoolQuery.mockResolvedValueOnce({ rows: [] }); // Final DB upsert

      const newPlanId = 'free';
      const result = await SubscriptionModel.updatePlan(userId, newPlanId, userEmail);

      expect(mockStripe.subscriptions.del).toHaveBeenCalledWith(currentStripeSubId);
      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO subscriptions'), expect.arrayContaining([
        userId, newPlanId, currentStripeCustId, null // stripeSubscriptionId should be null
      ]));
      expect(result.planId).toBe('free');
      expect(result.stripeSubscriptionId).toBeNull();
    });

    it('throws error for invalid plan ID', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [] }); // getByUserId
      mockPoolQuery.mockResolvedValueOnce({ rows: [{ limit: '100' }] }); // getByUserId -> free plan limit
      
      // No mock for planRes query as it should throw before that based on PRICE_IDS check
      // OR, if the PRICE_IDS check passes but plan isn't in DB:
      // mockPoolQuery.mockResolvedValueOnce({ rows: [] }); // newPlanRes query

      await expect(SubscriptionModel.updatePlan(userId, 'invalid-plan', userEmail))
        .rejects.toThrow('Invalid or unsupported plan ID for Stripe: invalid-plan');
    });
  });

  describe('cancelSubscription', () => {
    const userId = 'user-to-cancel';
    it('cancels an active Stripe subscription (sets cancel_at_period_end)', async () => {
      const stripeSubId = 'sub_active_to_cancel';
      const stripeCustId = 'cus_active_to_cancel';
      const mockCurrentSub: Subscription = {
        userId, planId: 'PRO', stripeCustomerId: stripeCustId, stripeSubscriptionId: stripeSubId,
        nextBillingDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 15), // In 15 days
        usage: 20, limit: 1000
      };
      mockPoolQuery.mockResolvedValueOnce({ rows: [mockCurrentSub] }); // getByUserId
      mockPoolQuery.mockResolvedValueOnce({ rows: [{ limit: '100' }] }); // Free plan limit lookup
      
      const periodEndTimestamp = Math.floor(mockCurrentSub.nextBillingDate!.getTime() / 1000);
      mockStripe.subscriptions.update.mockResolvedValueOnce({ 
        id: stripeSubId, 
        status: 'active', // Remains active until period end
        cancel_at_period_end: true,
        current_period_end: periodEndTimestamp 
      });
      
      // Mock for the UPDATE query in cancelSubscription
      mockPoolQuery.mockResolvedValueOnce({ 
        rows: [{ 
          planId: 'free', 
          stripeCustomerId: stripeCustId, 
          stripeSubscriptionId: null, 
          nextBillingDate: null, 
          usage: 0, 
          limit: 100 
        }] 
      });

      const result = await SubscriptionModel.cancelSubscription(userId);

      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith(stripeSubId, { cancel_at_period_end: true });
      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE subscriptions'), [100, userId]);
      expect(result.planId).toBe('free');
      expect(result.stripeSubscriptionId).toBeNull(); // Locally reflects immediate intent
    });

    it('handles cancelling a free plan (no Stripe call)', async () => {
      const mockFreeSub: Subscription = {
        userId, planId: 'free', stripeCustomerId: null, stripeSubscriptionId: null,
        nextBillingDate: null, usage: 0, limit: 100
      };
      mockPoolQuery.mockResolvedValueOnce({ rows: [mockFreeSub] }); // getByUserId
      mockPoolQuery.mockResolvedValueOnce({ rows: [{ limit: '100' }] }); // Free plan limit lookup
      
      // Mock for the UPDATE query (might not run if already free, but good to have)
      mockPoolQuery.mockResolvedValueOnce({ rows: [] }); // No rows updated if already free and no record existed to update
                                                          // Or, it could return the current state if an update happens to reset usage/ensure correct limit.

      const result = await SubscriptionModel.cancelSubscription(userId);
      
      expect(mockStripe.subscriptions.update).not.toHaveBeenCalled();
      expect(mockStripe.subscriptions.del).not.toHaveBeenCalled();
      // Check if it returns the 'free' state
      expect(result.planId).toBe('free');
      expect(result.stripeSubscriptionId).toBeNull();
    });
  });
});

// Helper to ensure all promises resolve if any test fails mid-await chain
afterAll(async () => {
  await new Promise(resolve => setImmediate(resolve));
});
