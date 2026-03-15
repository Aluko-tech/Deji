import { Router } from 'express';
import {
  getProductProfitability,
  getProductDetails,
  getRevenueByProduct,
  getCOGSByProduct,
  getRevenueByRep,
  getAnalyticsKPIs,
} from '../controllers/analytics.controller.js';

const router = Router();

// Legacy endpoints (kept for backward compat)
router.get('/product-profitability', getProductProfitability);
router.get('/product/:id/details',   getProductDetails);

// New endpoints wired to frontend api.js
router.get('/revenue-by-product', getRevenueByProduct);
router.get('/cogs-by-product',    getCOGSByProduct);
router.get('/revenue-by-rep',     getRevenueByRep);
router.get('/kpis',               getAnalyticsKPIs);

export default router;
