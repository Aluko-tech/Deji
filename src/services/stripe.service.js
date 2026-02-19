import Stripe from 'stripe';
import prisma from '../config/prisma.js';

let stripeClient = null;

function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Stripe is not configured. Missing STRIPE_SECRET_KEY.');
  }

  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-01-27',
    });
  }

  return stripeClient;
}

export async function createCheckoutSession(tenantId, plan) {
  const stripe = getStripeClient();

  const priceMap = {
    starter: 'price_123',
    pro: 'price_456',
    business: 'price_789',
  };

  if (!priceMap[plan]) throw new Error('Invalid plan');

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'subscription',
    line_items: [{ price: priceMap[plan], quantity: 1 }],
    success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/cancel`,
    metadata: { tenantId, plan },
  });

  return session;
}

export async function handleStripeWebhook(event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;

      const tenantId = session.metadata.tenantId;
      const plan = session.metadata.plan;

      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          plan,
          planActive: true,
          planActivatedAt: new Date(),
        },
      });

      break;
    }
    default:
      console.log(`Unhandled event type ${event.type}`);
  }
}
