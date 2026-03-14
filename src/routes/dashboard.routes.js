import { Router } from "express";
import { getDashboardData, getDashboardStats, getLowStockProducts } from "../controllers/dashboard.controller.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.get("/low-stock", authenticate, getLowStockProducts);
router.get("/stats", authenticate, getDashboardStats);
router.get("/", authenticate, getDashboardData);

export default router;
