const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_xxx');
const prisma = require('../prismaClient');

// Raw body is needed for signature verification; assume top-level express app mounts raw body for this route
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        // create customer/subscription record
        // store minimal data, full sync can be done via another job
        await prisma.subscription.create({ data: {
          userId: session.metadata && session.metadata.userId ? session.metadata.userId : undefined,
          stripeCustomer: session.customer,
          stripeSubId: session.subscription,
          plan: session.display_items ? session.display_items[0].plan.nickname : 'starter',
          status: 'active'
        }}).catch(e=>console.error('prisma sub create',e));
        break;
      case 'invoice.paid':
        // mark invoice paid
        break;
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        // update subscription status
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  } catch (err) {
    console.error('Error handling webhook', err);
  }

  res.json({ received: true });
});

module.exports = router;
