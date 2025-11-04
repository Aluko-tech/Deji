import { createCheckoutSession, handleStripeWebhook } from '../services/stripe.service.js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function createCheckout(req, res) {
  try {
    const { plan } = req.body;
    const tenantId = req.user.tenantId; // ensure only tenant admin calls this

    const session = await createCheckoutSession(tenantId, plan);
    res.json({ url: session.url });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function stripeWebhook(req, res) {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  await handleStripeWebhook(event);
  res.json({ received: true });
}
