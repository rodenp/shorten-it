// utils/stripe.js
const { STRIPE_SECRET_KEY } = require('../config/stripeConfig');
const stripe = require('stripe')(STRIPE_SECRET_KEY);

/**
 * Initializes and returns the Stripe SDK instance.
 * This is already done when the module is loaded.
 * You can directly import and use the 'stripe' object from this module.
 */
const getStripeInstance = () => {
  if (!STRIPE_SECRET_KEY || STRIPE_SECRET_KEY === 'your_stripe_secret_key_placeholder') {
    console.warn(
      'Stripe secret key is not set or is using the placeholder value. ' +
      'Please set the STRIPE_SECRET_KEY environment variable.'
    );
  }
  return stripe;
};

// Export the initialized stripe instance for direct use
/**
 * Creates a new Stripe customer or retrieves an existing one.
 * @param {object} user - The user object from your database.
 * @param {string} user.email - The user's email address.
 * @param {string} [user.name] - The user's name (optional).
 * @param {string} [userId] - Your internal user ID for metadata (optional).
 * @returns {Promise<object>} The Stripe customer object.
 */
const getOrCreateStripeCustomer = async (user, userId = null) => {
  if (!user || !user.email) {
    throw new Error('User email is required to create or retrieve a Stripe customer.');
  }

  try {
    // Search for existing customers by email
    const existingCustomers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      return existingCustomers.data[0];
    }

    // Create a new customer
    const customerParams = {
      email: user.email,
      name: user.name, // Optional: Stripe will use email if name is not provided
    };
    if (userId) {
      customerParams.metadata = {
        userId: userId, // Your internal user ID
      };
    }
    const newCustomer = await stripe.customers.create(customerParams);
    return newCustomer;
  } catch (error) {
    console.error('Error creating or retrieving Stripe customer:', error);
    throw error; // Rethrow or handle as appropriate for your application
  }
};

/**
 * Creates a Stripe Checkout session for a user to subscribe to a plan.
 * @param {string} customerId - The Stripe customer ID.
 * @param {string} priceId - The Stripe price ID for the selected plan.
 * @param {string} successUrl - The URL to redirect to on successful payment.
 * @param {string} cancelUrl - The URL to redirect to if payment is canceled.
 * @param {string} [userId] - Optional. Your internal user ID to pass as metadata to the checkout session.
 * @returns {Promise<object>} The Stripe Checkout session object.
 */
const createCheckoutSession = async (customerId, priceId, successUrl, cancelUrl, userId = null) => {
  if (!customerId || !priceId) {
    throw new Error('Customer ID and Price ID are required to create a checkout session.');
  }
  if (!successUrl || !cancelUrl) {
    throw new Error('Success URL and Cancel URL are required.');
  }

  const checkoutSessionParams = {
    mode: 'subscription',
    payment_method_types: ['card'],
    customer: customerId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
  };

  if (userId) {
    checkoutSessionParams.client_reference_id = userId; // Recommended for reconciliation
    checkoutSessionParams.metadata = {
        userId: userId // Can also pass metadata this way
    };
  }

  try {
    const session = await stripe.checkout.sessions.create(checkoutSessionParams);
    return session;
  } catch (error) {
    console.error('Error creating Stripe Checkout session:', error);
    throw error;
  }
};

module.exports = {
  stripe: getStripeInstance(), // Ensure instance is created with a check
  getOrCreateStripeCustomer,
  createCheckoutSession,
  handleStripeWebhook,
  getUserByStripeCustomerId, // Added helper
  // We will add more functions here (placeholder for future additions)
};

// Attempt to require InvoiceModel. Adjust path if build process places it elsewhere.
// This assumes InvoiceModel.ts is compiled to InvoiceModel.js in the same directory,
// or that the environment can handle .ts requires.
const { InvoiceModel } = require('../src/models/InvoiceModel'); 
const { pool } = require('../src/lib/db'); // Required for getUserByStripeCustomerId

/**
 * Retrieves an internal user ID from a Stripe Customer ID.
 * @param {string} stripeCustomerId The Stripe Customer ID.
 * @returns {Promise<string|null>} The internal user ID, or null if not found.
 */
async function getUserByStripeCustomerId(stripeCustomerId) {
  if (!stripeCustomerId) return null;
  if (!pool) {
    console.error('Database pool not available in getUserByStripeCustomerId.');
    return null; 
  }

  // First, try to find in 'users' table if it has a stripeCustomerId column
  // For this example, we assume users table does not directly store stripeCustomerId.
  // Instead, we check 'subscriptions' table as it was updated to store stripeCustomerId.
  try {
    // Querying subscriptions table for a userId associated with the stripeCustomerId
    // This assumes a user might have multiple subscription entries over time,
    // but their stripeCustomerId should consistently map to the same internal userId.
    const res = await pool.query(
      `SELECT "userId" FROM subscriptions WHERE "stripeCustomerId" = $1 LIMIT 1`,
      [stripeCustomerId]
    );
    if (res.rows.length > 0) {
      return res.rows[0].userId;
    }

    // Fallback: If not in subscriptions, maybe users table has it (less likely based on current design)
    // const userRes = await pool.query(`SELECT id FROM users WHERE "stripeCustomerId" = $1 LIMIT 1`, [stripeCustomerId]);
    // if (userRes.rows.length > 0) return userRes.rows[0].id;

    console.warn(`No user found for stripeCustomerId: ${stripeCustomerId}`);
    return null;
  } catch (error) {
    console.error(`Error fetching user by stripeCustomerId ${stripeCustomerId}:`, error);
    return null;
  }
}


/**
 * Handles incoming Stripe webhooks.
 * Verifies the event signature and processes relevant event types.
 * @param {Buffer|string} rawBody - The raw request body from Stripe.
 * @param {string} signature - The 'Stripe-Signature' header value.
 * @param {string} webhookSecret - Your Stripe webhook signing secret.
 * @returns {Promise<object|null>} An object indicating success or an error, or null if event is not processed.
 */
async function handleStripeWebhook(rawBody, signature, webhookSecret) {
  if (!rawBody || !signature || !webhookSecret) {
    console.error('Webhook handler called with missing rawBody, signature, or webhookSecret.');
    throw new Error('Missing webhook parameters.');
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    // Return a response to Stripe acknowledging receipt but indicating an error
    return { received: true, error: 'Webhook signature verification failed.', status: 400 };
  }

  // Successfully constructed event
  console.log('Stripe webhook event received:', event.type, event.id);

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      console.log(`Checkout session completed for customer ${session.customer}, subscription ${session.subscription}.`);
      // Fulfillment logic (e.g., update user's subscription in your DB) should happen here.
      // This was partially covered in SubscriptionModel.updatePlan which can be triggered by your API
      // after user completes checkout and is redirected to success_url.
      // Alternatively, some initial subscription record update can happen here.
      // For instance, storing stripeSubscriptionId and stripeCustomerId against the user.
      // const userId = session.client_reference_id || (session.metadata ? session.metadata.userId : null);
      // if (userId && session.customer && session.subscription) {
      //   // Call a function, e.g. from SubscriptionModel, to update user's Stripe details
      //   // await SubscriptionModel.activateSubscription(userId, session.customer, session.subscription);
      // }
      break;
    }

    case 'invoice.created': // Good for initial record, might not have all payment details yet
    case 'invoice.updated': // Status changes, amounts might change
    case 'invoice.paid':    // Final confirmation of payment for the invoice
    case 'invoice.payment_succeeded': { // Often used interchangeably with invoice.paid for subscription payments
      const invoice = event.data.object;
      console.log(`Processing ${event.type} for Stripe invoice ${invoice.id}, customer ${invoice.customer}.`);
      
      if (!invoice.customer || typeof invoice.customer !== 'string') {
        console.error(`Invoice ${invoice.id} is missing a valid customer ID.`);
        break;
      }
      const userId = await getUserByStripeCustomerId(invoice.customer);

      if (!userId) {
        console.error(`Could not find user for Stripe customer ID: ${invoice.customer} from invoice ${invoice.id}. Invoice not recorded.`);
        break;
      }

      const invoiceData = {
        userId: userId,
        stripeInvoiceId: invoice.id,
        stripeSubscriptionId: invoice.subscription, // Typically string, or null
        status: invoice.status, // e.g., 'draft', 'open', 'paid', 'void', 'uncollectible'
        amountDue: invoice.amount_due,
        amountPaid: invoice.amount_paid,
        amountRemaining: invoice.amount_remaining,
        currency: invoice.currency,
        hostedInvoiceUrl: invoice.hosted_invoice_url,
        invoicePdfUrl: invoice.invoice_pdf,
        // Stripe 'created' is seconds, convert to JS Date. For 'paid', use status_transitions.paid_at
        createdDate: invoice.status === 'paid' && invoice.status_transitions?.paid_at ? new Date(invoice.status_transitions.paid_at * 1000) : new Date(invoice.created * 1000),
        dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
        periodStart: new Date(invoice.period_start * 1000),
        periodEnd: new Date(invoice.period_end * 1000),
        description: invoice.lines?.data[0]?.description || invoice.description || 'Subscription Invoice', // Get description from first line item or invoice itself
        lines: invoice.lines, // Pass full lines if InvoiceModel needs more details
      };
      try {
        await InvoiceModel.recordInvoice(invoiceData);
      } catch (dbError) {
        console.error(`Failed to record invoice ${invoice.id} due to DB error:`, dbError);
        // Potentially return an error status to Stripe if this is critical for retries
      }

      // If invoice is paid and has a charge ID, record the payment explicitly
      // Note: invoice.payment_succeeded often implies a charge.succeeded for the same charge.
      // Handling it here ensures the link if charge.succeeded webhook is missed or processed later.
      if ((event.type === 'invoice.paid' || event.type === 'invoice.payment_succeeded') && invoice.charge && typeof invoice.charge === 'string') {
        // Attempt to retrieve the charge to get its created date, or use invoice paid_at date
        let chargeCreatedDate = new Date(); // Fallback to now
        let chargeStatus = 'succeeded'; // Assume succeeded if invoice is paid
        let chargeAmount = invoice.amount_paid; // Amount from invoice context

        try {
            const charge = await stripe.charges.retrieve(invoice.charge);
            chargeCreatedDate = new Date(charge.created * 1000);
            chargeStatus = charge.status;
            chargeAmount = charge.amount; // Use actual charge amount
        } catch (chargeError) {
            console.warn(`Could not retrieve charge ${invoice.charge} for invoice ${invoice.id}. Using invoice data for payment record. Error: ${chargeError.message}`);
            // Fallback to invoice's paid_at time if charge retrieval fails
            if (invoice.status_transitions?.paid_at) {
                 chargeCreatedDate = new Date(invoice.status_transitions.paid_at * 1000);
            }
        }
        
        const paymentData = {
          stripeInvoiceId: invoice.id,
          stripeChargeId: invoice.charge,
          amount: chargeAmount,
          currency: invoice.currency,
          status: chargeStatus,
          createdDate: chargeCreatedDate,
        };
        try {
          await InvoiceModel.recordPayment(paymentData);
        } catch (dbError) {
          console.error(`Failed to record payment for charge ${invoice.charge} (invoice ${invoice.id}) due to DB error:`, dbError);
        }
      }
      break;
    }
    
    case 'charge.succeeded': {
      const charge = event.data.object;
      // Only record payment if it's associated with an invoice and that invoice exists.
      // This prevents duplicate payment entries if 'invoice.paid' already handled it.
      // However, some charges might not be directly from invoices handled by 'invoice.paid' (e.g. one-off charges not through a subscription invoice)
      // The requirement is "charge related to an invoice succeeds".
      if (charge.invoice && typeof charge.invoice === 'string') {
        console.log(`Processing charge.succeeded for charge ${charge.id}, invoice ${charge.invoice}.`);
        // Check if this payment was already recorded (e.g., by invoice.paid handler)
        // This check would require querying payments table; InvoiceModel.recordPayment uses ON CONFLICT DO NOTHING for stripeChargeId.
        const paymentData = {
          stripeInvoiceId: charge.invoice,
          stripeChargeId: charge.id,
          amount: charge.amount,
          currency: charge.currency,
          status: charge.status,
          createdDate: new Date(charge.created * 1000),
        };
        try {
          await InvoiceModel.recordPayment(paymentData);
        } catch (dbError) {
          console.error(`Failed to record payment for charge ${charge.id} (invoice ${charge.invoice}) from charge.succeeded event due to DB error:`, dbError);
        }
      } else {
        console.log(`Charge ${charge.id} succeeded but is not associated with an invoice. No payment record created through this path.`);
      }
      break;
    }

    case 'invoice.payment_failed': {
      const failedInvoice = event.data.object; // Type is Stripe.Invoice
      console.log(`Invoice payment failed for Stripe invoice ${failedInvoice.id}, customer ${failedInvoice.customer}.`);
      // TODO: Handle payment failures:
      // 1. Notify the user about the payment failure.
      // 2. Update user's subscription status (e.g., 'past_due') in your local DB.
      // 3. Potentially restrict access to features if payment isn't resolved.
      // 4. Update invoice status in your local 'invoices' table.
      if (failedInvoice.customer && typeof failedInvoice.customer === 'string') {
        const userId = await getUserByStripeCustomerId(failedInvoice.customer);
        if (userId) {
          // Example: Update local invoice status
          // await InvoiceModel.updateInvoiceStatus(failedInvoice.id, failedInvoice.status);
        }
      }
      break;
    }
    
    // Add other event types to handle as needed:
    // - customer.subscription.updated (e.g. plan changes, cancellations initiated by Stripe/user via portal)
    // - customer.subscription.deleted (e.g. subscription fully ended after cancellation period)

    default:
      console.log(`Unhandled Stripe webhook event type: ${event.type} (ID: ${event.id})`);
      return { received: true, message: `Unhandled event type: ${event.type}` };
  }

  // Return a response to acknowledge receipt of the event
  return { received: true, processedEvent: event.type };
}
