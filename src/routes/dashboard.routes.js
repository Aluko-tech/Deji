// src/routes/dashboard.routes.js

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { 
  getDashboardStats, 
  getLowStockProducts, 
  getDashboardData 
} from '../controllers/dashboard.controller.js'; 

const router = express.Router();

// ✅ Routes handled by controllers only 
 
router.get('/low-stock', authenticate, getLowStockProducts); 
router.get('/', authenticate, getDashboardData); 
router.get('/stats', authenticate, getDashboardStats); 

export default router;