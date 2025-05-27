// utils/__tests__/stripe.test.js

// Mock dependencies
jest.mock('../src/lib/db', () => ({ // Path to db relative to this test file's eventual location if utils is at root
  pool: {
    query: jest.fn(),
  },
}), { virtual: true }); // virtual true if path is not directly resolvable or for clarity

// Mock InvoiceModel if it's directly imported and used by other functions in stripe.js (not strictly needed for getUserByStripeCustomerId)
jest.mock('../src/models/InvoiceModel', () => ({ // Path to InvoiceModel
  InvoiceModel: {
    recordInvoice: jest.fn(),
    recordPayment: jest.fn(),
  }
}), { virtual: true });


// Import the specific function to test and its dependencies
// Assuming stripe.js is in 'utils' and this test is in 'utils/__tests__'
// Adjust the path to stripe.js functions as necessary based on actual export structure
// If getUserByStripeCustomerId is directly exported:
// const { getUserByStripeCustomerId } = require('../stripe'); 
// If it's part of a larger export object (as it seems to be):
const stripeUtils = require('../stripe'); 
const { pool } = require('../src/lib/db'); // Mocked pool

const mockPoolQuery = pool.query;

describe('Stripe Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPoolQuery.mockReset();
  });

  describe('getUserByStripeCustomerId', () => {
    it('should return userId if found in subscriptions table', async () => {
      const stripeCustomerId = 'cus_test123';
      const expectedUserId = 'user_abc789';
      mockPoolQuery.mockResolvedValueOnce({ rows: [{ userId: expectedUserId }], rowCount: 1 });

      const userId = await stripeUtils.getUserByStripeCustomerId(stripeCustomerId);

      expect(pool.query).toHaveBeenCalledTimes(1);
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT "userId" FROM subscriptions WHERE "stripeCustomerId" = $1 LIMIT 1',
        [stripeCustomerId]
      );
      expect(userId).toBe(expectedUserId);
    });

    it('should return null if stripeCustomerId is not found', async () => {
      const stripeCustomerId = 'cus_notfound';
      mockPoolQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      
      // Spy on console.warn
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});


      const userId = await stripeUtils.getUserByStripeCustomerId(stripeCustomerId);

      expect(pool.query).toHaveBeenCalledTimes(1);
      expect(userId).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(`No user found for stripeCustomerId: ${stripeCustomerId}`);
      
      consoleWarnSpy.mockRestore();
    });

    it('should return null if stripeCustomerId is null or undefined', async () => {
      let userId = await stripeUtils.getUserByStripeCustomerId(null);
      expect(userId).toBeNull();
      userId = await stripeUtils.getUserByStripeCustomerId(undefined);
      expect(userId).toBeNull();
      expect(pool.query).not.toHaveBeenCalled();
    });

    it('should return null and log error if database query fails', async () => {
      const stripeCustomerId = 'cus_db_error';
      mockPoolQuery.mockRejectedValueOnce(new Error('Database connection error'));

      // Spy on console.error
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const userId = await stripeUtils.getUserByStripeCustomerId(stripeCustomerId);

      expect(pool.query).toHaveBeenCalledTimes(1);
      expect(userId).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `Error fetching user by stripeCustomerId ${stripeCustomerId}:`, 
        expect.any(Error)
      );
      consoleErrorSpy.mockRestore();
    });

     it('should return null if pool is not available (edge case)', async () => {
      const originalPool = require('../src/lib/db').pool;
      jest.doMock('../src/lib/db', () => ({ pool: null }), {virtual: true}); // Temporarily make pool null

      const stripeUtilsReimported = require('../stripe'); // Re-import to get the modified module
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const userId = await stripeUtilsReimported.getUserByStripeCustomerId('cus_test_no_pool');
      
      expect(userId).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Database pool not available in getUserByStripeCustomerId.');
      
      consoleErrorSpy.mockRestore();
      // Restore original mock for other tests if any were to follow in this file.
      // This is tricky with module-level mocks and re-imports.
      // For isolated tests, this is fine. For larger suites, more robust mocking strategies might be needed.
      jest.doMock('../src/lib/db', () => ({ pool: originalPool }), {virtual: true});
    });
  });
});

// Helper to ensure all promises resolve if any test fails mid-await chain
afterAll(async () => {
  await new Promise(resolve => setImmediate(resolve));
});
