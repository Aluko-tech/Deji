import Stripe from 'stripe';
import prisma from '../config/prisma.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-01-27', // adjust if newer
});

// ✅ Create Checkout Session
export async function createCheckoutSession(tenantId, plan) {
  // Example plans → you can map from DB
  const priceMap = {
    starter: 'price_123', // replace with real Stripe Price IDs
    pro: 'price_456',
    business: 'price_789',
  };

  if (!priceMap[plan]) throw new Error('Invalid plan');

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'subscription',
    line_items: [
      { price: priceMap[plan], quantity: 1 },
    ],
    success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/cancel`,
    metadata: { tenantId, plan },
  });

  return session;
}

// ✅ Handle webhook event
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
