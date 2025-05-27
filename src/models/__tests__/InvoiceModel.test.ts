// src/models/__tests__/InvoiceModel.test.ts

// Mock dependencies
jest.mock('@/lib/db', () => ({
  pool: {
    query: jest.fn(),
  },
}));

import { pool } from '@/lib/db'; // This will be our mock pool
import { InvoiceModel, InvoiceData, PaymentData } from '../InvoiceModel'; // Adjusted import path

// Cast pool.query to jest.Mock for type safety in tests
const mockPoolQuery = pool.query as jest.Mock;

describe('InvoiceModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPoolQuery.mockReset();
  });

  describe('recordInvoice', () => {
    const mockInvoiceData: InvoiceData = {
      userId: 'user-123',
      stripeInvoiceId: 'in_123',
      stripeSubscriptionId: 'sub_123',
      status: 'paid',
      amountDue: 0,
      amountPaid: 2000,
      amountRemaining: 0,
      currency: 'usd',
      hostedInvoiceUrl: 'https://stripe.com/invoice/in_123',
      invoicePdfUrl: 'https://stripe.com/invoice/in_123/pdf',
      createdDate: new Date(),
      dueDate: null,
      periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      periodEnd: new Date(),
      description: 'Monthly Subscription',
    };

    it('should insert a new invoice correctly', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 }); // Simulate successful insert

      await InvoiceModel.recordInvoice(mockInvoiceData);

      expect(pool.query).toHaveBeenCalledTimes(1);
      const [query, params] = mockPoolQuery.mock.calls[0];
      expect(query).toContain('INSERT INTO invoices');
      expect(query).toContain('ON CONFLICT ("stripeInvoiceId") DO UPDATE SET');
      expect(params).toEqual([
        mockInvoiceData.userId, mockInvoiceData.stripeInvoiceId, mockInvoiceData.stripeSubscriptionId,
        mockInvoiceData.status, mockInvoiceData.amountDue, mockInvoiceData.amountPaid,
        mockInvoiceData.amountRemaining, mockInvoiceData.currency, mockInvoiceData.hostedInvoiceUrl,
        mockInvoiceData.invoicePdfUrl, mockInvoiceData.createdDate, mockInvoiceData.dueDate,
        mockInvoiceData.periodStart, mockInvoiceData.periodEnd, mockInvoiceData.description,
      ]);
    });

    it('should update an existing invoice on conflict', async () => {
      // The same query is used for UPSERT, so the mock setup is similar.
      // The behavior (insert vs update) is handled by PostgreSQL's ON CONFLICT.
      mockPoolQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 }); // Simulate successful upsert

      const updatedInvoiceData = { ...mockInvoiceData, status: 'void' };
      await InvoiceModel.recordInvoice(updatedInvoiceData);

      expect(pool.query).toHaveBeenCalledTimes(1);
      const [query, params] = mockPoolQuery.mock.calls[0];
      expect(query).toContain('INSERT INTO invoices');
      expect(query).toContain('ON CONFLICT ("stripeInvoiceId") DO UPDATE SET');
      expect(params[3]).toBe('void'); // Check that status is updated
    });

    it('should throw an error if database query fails', async () => {
      mockPoolQuery.mockRejectedValueOnce(new Error('DB error'));
      await expect(InvoiceModel.recordInvoice(mockInvoiceData)).rejects.toThrow('DB error');
    });
  });

  describe('recordPayment', () => {
    const mockPaymentData: PaymentData = {
      stripeInvoiceId: 'in_123',
      stripeChargeId: 'ch_123',
      amount: 2000,
      currency: 'usd',
      status: 'succeeded',
      createdDate: new Date(),
    };
    const internalInvoiceId = 1;

    it('should record a payment for an existing invoice', async () => {
      // Mock finding the internal invoice ID
      mockPoolQuery.mockResolvedValueOnce({ rows: [{ id: internalInvoiceId }], rowCount: 1 });
      // Mock inserting the payment
      mockPoolQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await InvoiceModel.recordPayment(mockPaymentData);

      expect(pool.query).toHaveBeenCalledTimes(2);
      // Check first call (SELECT id FROM invoices)
      expect(mockPoolQuery.mock.calls[0][0]).toContain('SELECT id FROM invoices WHERE "stripeInvoiceId" = $1');
      expect(mockPoolQuery.mock.calls[0][1]).toEqual([mockPaymentData.stripeInvoiceId]);
      // Check second call (INSERT INTO payments)
      const [insertQuery, insertParams] = mockPoolQuery.mock.calls[1];
      expect(insertQuery).toContain('INSERT INTO payments');
      expect(insertQuery).toContain('ON CONFLICT ("stripeChargeId") DO NOTHING');
      expect(insertParams).toEqual([
        internalInvoiceId, mockPaymentData.stripeChargeId, mockPaymentData.amount,
        mockPaymentData.currency, mockPaymentData.status, mockPaymentData.createdDate,
      ]);
    });

    it('should not record payment if invoice does not exist', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 }); // Invoice not found

      // Spy on console.warn
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      await InvoiceModel.recordPayment(mockPaymentData);

      expect(pool.query).toHaveBeenCalledTimes(1); // Only the SELECT query
      expect(mockPoolQuery.mock.calls[0][0]).toContain('SELECT id FROM invoices');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        `Invoice with stripeInvoiceId ${mockPaymentData.stripeInvoiceId} not found. Payment for charge ${mockPaymentData.stripeChargeId} cannot be recorded.`
      );
      consoleWarnSpy.mockRestore();
    });
     it('should throw an error if database query for invoice lookup fails', async () => {
      mockPoolQuery.mockRejectedValueOnce(new Error('DB error looking up invoice'));
      await expect(InvoiceModel.recordPayment(mockPaymentData)).rejects.toThrow('DB error looking up invoice');
    });

    it('should throw an error if database query for payment insert fails', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [{ id: internalInvoiceId }], rowCount: 1 }); // Invoice found
      mockPoolQuery.mockRejectedValueOnce(new Error('DB error inserting payment')); // Payment insert fails
      await expect(InvoiceModel.recordPayment(mockPaymentData)).rejects.toThrow('DB error inserting payment');
    });
  });

  describe('listByUserId', () => {
    const userId = 'user-with-invoices';
    const mockDbInvoices = [
      { 
        userId, stripeInvoiceId: 'in_1', stripeSubscriptionId: 'sub_1', status: 'paid', amountDue: 0, amountPaid: 1000, amountRemaining: 0, currency: 'usd', 
        hostedInvoiceUrl: 'url1', invoicePdfUrl: 'pdf1', createdDate: new Date('2023-01-15T10:00:00Z'), dueDate: null, 
        periodStart: new Date('2023-01-01T00:00:00Z'), periodEnd: new Date('2023-02-01T00:00:00Z'), description: 'Invoice 1'
      },
      { 
        userId, stripeInvoiceId: 'in_2', stripeSubscriptionId: 'sub_1', status: 'open', amountDue: 2000, amountPaid: 0, amountRemaining: 2000, currency: 'usd', 
        hostedInvoiceUrl: 'url2', invoicePdfUrl: 'pdf2', createdDate: new Date('2023-02-15T10:00:00Z'), dueDate: new Date('2023-03-01T00:00:00Z'), 
        periodStart: new Date('2023-02-01T00:00:00Z'), periodEnd: new Date('2023-03-01T00:00:00Z'), description: 'Invoice 2'
      },
    ];

    it('should fetch and return invoices for a user', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: mockDbInvoices });

      const invoices = await InvoiceModel.listByUserId(userId);

      expect(pool.query).toHaveBeenCalledTimes(1);
      expect(mockPoolQuery.mock.calls[0][0]).toContain('SELECT');
      expect(mockPoolQuery.mock.calls[0][0]).toContain('FROM invoices WHERE "userId" = $1 ORDER BY "createdDate" DESC');
      expect(mockPoolQuery.mock.calls[0][1]).toEqual([userId]);
      
      expect(invoices).toHaveLength(2);
      expect(invoices[0].stripeInvoiceId).toBe('in_1');
      expect(invoices[1].stripeInvoiceId).toBe('in_2');
      // Ensure dates are Date objects
      expect(invoices[0].createdDate).toBeInstanceOf(Date);
      expect(invoices[0].periodStart).toBeInstanceOf(Date);
    });

    it('should return an empty array if user has no invoices', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [] });
      const invoices = await InvoiceModel.listByUserId('user-no-invoices');
      expect(invoices).toEqual([]);
    });
    
    it('should throw an error if database query fails', async () => {
      mockPoolQuery.mockRejectedValueOnce(new Error('DB list error'));
      await expect(InvoiceModel.listByUserId(userId)).rejects.toThrow('DB list error');
    });
  });
});

// Helper to ensure all promises resolve if any test fails mid-await chain
afterAll(async () => {
  await new Promise(resolve => setImmediate(resolve));
});
