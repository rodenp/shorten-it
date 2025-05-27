// config/stripeConfig.js

// It's recommended to store your Stripe secret key as an environment variable
// and access it using process.env.STRIPE_SECRET_KEY
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'your_stripe_secret_key_placeholder';

// Define product and price IDs for your plans
// Replace these with your actual product and price IDs from your Stripe dashboard
const PRODUCT_IDS = {
  FREE: 'prod_free_placeholder', // Example Product ID for Free plan
  PRO: 'prod_pro_placeholder',   // Example Product ID for Pro plan
  BUSINESS: 'prod_business_placeholder', // Example Product ID for Business plan
};

const PRICE_IDS = {
  PRO: 'price_pro_placeholder', // Example Price ID for Pro plan
  BUSINESS: 'price_business_placeholder', // Example Price ID for Business plan
  // Free plans typically don't have a price ID in the same way,
  // as they don't involve a payment.
  // However, if you have a $0 price for tracking, you can add it here.
};

module.exports = {
  STRIPE_SECRET_KEY,
  PRODUCT_IDS,
  PRICE_IDS,
};
