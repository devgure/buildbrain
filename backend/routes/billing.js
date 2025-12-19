const express = require('express');
const router = express.Router();
const stripeService = require('../services/stripeService');
const prisma = require('../prismaClient');
const auth = require('../middleware/auth');

router.use(auth);

// Return pricing info
router.get('/plans', (req, res) => {
  res.json({
    plans: [
      { id: 'starter', name: 'Starter', price_monthly: 25000, currency: 'usd' },
      { id: 'pro', name: 'Pro', price_monthly: 250000, currency: 'usd' },
      { id: 'enterprise', name: 'Enterprise', price_yearly: 2500000, currency: 'usd' }
    ]
  });
});

// Create a Stripe Checkout session
router.post('/checkout', async (req, res) => {
  const { planId } = req.body;
  try {
    const session = await stripeService.createCheckoutSession(req.user, planId);
    res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'checkout failed' });
  }
});

module.exports = router;
