import { createCheckoutSession, handleStripeWebhook } from '../services/stripe.service.js';
import Stripe from 'stripe';

let stripeClient = null;

function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Stripe is not configured. Missing STRIPE_SECRET_KEY.');
  }

  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }

  return stripeClient;
}

export async function createCheckout(req, res) {
  try {
    const { plan } = req.body;
    const tenantId = req.user.tenantId;

    const session = await createCheckoutSession(tenantId, plan);
    res.json({ success: true, message: 'Checkout session created', data: { url: session.url } });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message, data: null });
  }
}

export async function stripeWebhook(req, res) {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).json({ success: false, message: `Webhook Error: ${err.message}`, data: null });
  }

  await handleStripeWebhook(event);
  res.json({ success: true, message: 'Webhook processed', data: { received: true } });
}
