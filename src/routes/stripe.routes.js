import express from 'express';
import { createCheckout, stripeWebhook } from '../controllers/stripe.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';


const router = express.Router();

router.post('/checkout', authenticate, authorize, createCheckout);

// Stripe webhook (must be raw body)
router.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

export default router;
