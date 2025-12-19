const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_xxx');

const YOUR_DOMAIN = process.env.APP_URL || 'http://localhost:4000';

async function createCheckoutSession(user, planId) {
  // Map planId to price ids (these should exist in your Stripe account)
  const priceMap = {
    starter: process.env.STRIPE_PRICE_STARTER || 'price_starter',
    pro: process.env.STRIPE_PRICE_PRO || 'price_pro',
    enterprise: process.env.STRIPE_PRICE_ENTERPRISE || 'price_enterprise'
  };
  const price = priceMap[planId] || priceMap.starter;

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: user.email,
    line_items: [{ price, quantity: 1 }],
    success_url: `${YOUR_DOMAIN}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${YOUR_DOMAIN}/billing/cancel`
  });
  return session;
}

module.exports = { createCheckoutSession };
