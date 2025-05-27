// src/models/InvoiceModel.ts
import { pool } from '@/lib/db';
import Stripe from 'stripe';

// Simplified interface for what we expect from a Stripe Invoice object
// This helps in type checking and clarifies dependencies.
export interface InvoiceData {
  userId: string; // Our internal user ID, resolved by the caller
  stripeInvoiceId: string;
  stripeSubscriptionId?: string | null;
  status: string;
  amountDue: number;
  amountPaid: number;
  amountRemaining: number;
  currency: string;
  hostedInvoiceUrl?: string | null;
  invoicePdfUrl?: string | null;
  createdDate: Date; // Stripe's 'created' or 'status_transitions.paid_at'
  dueDate?: Date | null;
  periodStart: Date;
  periodEnd: Date;
  description?: string | null;
  lines?: Stripe.ApiList<Stripe.InvoiceLineItem>; // For more details if needed
}

// Simplified interface for what we expect for payment data
export interface PaymentData {
  stripeInvoiceId: string; // To look up our internal invoiceId
  stripeChargeId: string;
  amount: number;
  currency: string;
  status: string;
  createdDate: Date;
}

export const InvoiceModel = {
  /**
   * Records an invoice from Stripe into the local database.
   * Performs an UPSERT based on stripeInvoiceId.
   * @param invoiceData - The data for the invoice.
   */
  async recordInvoice(invoiceData: InvoiceData): Promise<void> {
    if (!pool) throw new Error('Database not configured');

    const {
      userId,
      stripeInvoiceId,
      stripeSubscriptionId,
      status,
      amountDue,
      amountPaid,
      amountRemaining,
      currency,
      hostedInvoiceUrl,
      invoicePdfUrl,
      createdDate,
      dueDate,
      periodStart,
      periodEnd,
      description,
    } = invoiceData;

    const query = `
      INSERT INTO invoices (
        "userId", "stripeInvoiceId", "stripeSubscriptionId", status, "amountDue", 
        "amountPaid", "amountRemaining", currency, "hostedInvoiceUrl", "invoicePdfUrl", 
        "createdDate", "dueDate", "periodStart", "periodEnd", description
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT ("stripeInvoiceId") DO UPDATE SET
        "userId" = EXCLUDED."userId",
        "stripeSubscriptionId" = EXCLUDED."stripeSubscriptionId",
        status = EXCLUDED.status,
        "amountDue" = EXCLUDED."amountDue",
        "amountPaid" = EXCLUDED."amountPaid",
        "amountRemaining" = EXCLUDED."amountRemaining",
        currency = EXCLUDED.currency,
        "hostedInvoiceUrl" = EXCLUDED."hostedInvoiceUrl",
        "invoicePdfUrl" = EXCLUDED."invoicePdfUrl",
        "createdDate" = EXCLUDED."createdDate",
        "dueDate" = EXCLUDED."dueDate",
        "periodStart" = EXCLUDED."periodStart",
        "periodEnd" = EXCLUDED."periodEnd",
        description = EXCLUDED.description;
    `;

    try {
      await pool.query(query, [
        userId, stripeInvoiceId, stripeSubscriptionId, status, amountDue,
        amountPaid, amountRemaining, currency, hostedInvoiceUrl, invoicePdfUrl,
        createdDate, dueDate, periodStart, periodEnd, description
      ]);
      console.log(`Invoice ${stripeInvoiceId} recorded/updated for user ${userId}.`);
    } catch (error) {
      console.error(`Error recording invoice ${stripeInvoiceId}:`, error);
      throw error;
    }
  },

  /**
   * Records a payment related to an invoice.
   * @param paymentData - The data for the payment.
   */
  async recordPayment(paymentData: PaymentData): Promise<void> {
    if (!pool) throw new Error('Database not configured');

    const {
      stripeInvoiceId, // Used to find the internal invoice ID
      stripeChargeId,
      amount,
      currency,
      status,
      createdDate,
    } = paymentData;

    // First, find the internal ID of the invoice using stripeInvoiceId
    const invoiceRes = await pool.query<{ id: number }>(
      `SELECT id FROM invoices WHERE "stripeInvoiceId" = $1`,
      [stripeInvoiceId]
    );

    if (invoiceRes.rows.length === 0) {
      console.warn(`Invoice with stripeInvoiceId ${stripeInvoiceId} not found. Payment for charge ${stripeChargeId} cannot be recorded.`);
      // Depending on strictness, you might throw an error or just log
      // For now, if invoice doesn't exist, we can't link payment. This might happen if webhooks arrive out of order.
      // A more robust system might queue this payment or retry.
      return; 
    }
    const internalInvoiceId = invoiceRes.rows[0].id;

    const query = `
      INSERT INTO payments (
        "invoiceId", "stripeChargeId", amount, currency, status, "createdDate"
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT ("stripeChargeId") DO NOTHING; -- Or DO UPDATE if payment status can change
    `;

    try {
      await pool.query(query, [
        internalInvoiceId, stripeChargeId, amount, currency, status, createdDate
      ]);
      console.log(`Payment for charge ${stripeChargeId} (Invoice ${stripeInvoiceId}) recorded.`);
    } catch (error) {
      console.error(`Error recording payment for charge ${stripeChargeId}:`, error);
      throw error;
    }
  },

  /**
   * Lists all invoices for a given user.
   * @param userId - The internal ID of the user.
   * @returns A promise that resolves to an array of invoice data.
   */
  async listByUserId(userId: string): Promise<InvoiceData[]> {
    if (!pool) throw new Error('Database not configured');

    const query = `
      SELECT 
        "userId", "stripeInvoiceId", "stripeSubscriptionId", status, "amountDue", 
        "amountPaid", "amountRemaining", currency, "hostedInvoiceUrl", "invoicePdfUrl", 
        "createdDate", "dueDate", "periodStart", "periodEnd", description
      FROM invoices
      WHERE "userId" = $1
      ORDER BY "createdDate" DESC;
    `;

    try {
      const res = await pool.query(query, [userId]);
      // Map database rows to InvoiceData interface.
      // Note: Database date fields will be Date objects or strings depending on pg driver settings.
      // Assuming they are directly compatible or will be handled by JSON serialization.
      return res.rows.map(row => ({
        userId: row.userId,
        stripeInvoiceId: row.stripeInvoiceId,
        stripeSubscriptionId: row.stripeSubscriptionId,
        status: row.status,
        amountDue: row.amountDue, // Stored in cents
        amountPaid: row.amountPaid, // Stored in cents
        amountRemaining: row.amountRemaining, // Stored in cents
        currency: row.currency,
        hostedInvoiceUrl: row.hostedInvoiceUrl,
        invoicePdfUrl: row.invoicePdfUrl,
        createdDate: new Date(row.createdDate),
        dueDate: row.dueDate ? new Date(row.dueDate) : null,
        periodStart: new Date(row.periodStart),
        periodEnd: new Date(row.periodEnd),
        description: row.description,
        // lines: undefined, // Not fetching lines in list view for brevity
      }));
    } catch (error) {
      console.error(`Error listing invoices for user ${userId}:`, error);
      throw error;
    }
  }
};
