// src/routes/subscription.routes.js
import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  getMySubscription,
  getPlanCatalog,
  postUpgrade,
  postCancel,
  postResume,
  getMyUsage,
} from '../controllers/subscription.controller.js';

const router = express.Router();

router.use(authenticate);

// Catalog for frontend dropdown/pricing page
router.get('/plans', getPlanCatalog);

// My subscription/usage
router.get('/', getMySubscription);
router.get('/usage', getMyUsage);

// Admin: upgrade/cancel/resume (limit to tenant admins)
router.post('/upgrade', authorize(['admin']), postUpgrade);
router.post('/cancel', authorize(['admin']), postCancel);
router.post('/resume', authorize(['admin']), postResume);

export default router;
