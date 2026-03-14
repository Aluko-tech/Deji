import { Router } from "express";
import { getProductProfitability, getProductDetails } from "../controllers/analytics.controller.js";

const router = Router();

// GET /api/analytics/product-profitability
router.get("/product-profitability", getProductProfitability);

// GET /api/analytics/product/:id/details
router.get("/product/:id/details", getProductDetails);

export default router;
