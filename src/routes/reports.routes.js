import express from "express";
import {
  getOverviewReport,
  getSegmentsReport,
  getLedgerReport,
  getRevenueReport,
  getExpensesReport,
  getProfitLossReport,
  getSalesByProductReport,
  getCustomerGrowthReport,
  getOutstandingInvoicesReport,
  getCashFlowReport,
  getSalesCohorts,
  getInsightsReport, // 🧠 NEW — AI insights endpoint
} from "../controllers/report.controller.js";

import { authenticate } from "../middleware/auth.js";
import { enforceLimit } from "../middleware/planLimit.middleware.js";

const router = express.Router();

// 🔒 All report routes require authentication
router.use(authenticate);

// ✅ Dashboard Reports
router.get("/overview", getOverviewReport);
router.get("/segments", getSegmentsReport);
router.get("/ledger", getLedgerReport);

// ✅ Financial Reports
router.get("/revenue", getRevenueReport);
router.get("/expenses", getExpensesReport);
router.get("/profit-loss", getProfitLossReport);
router.get("/sales-by-product", getSalesByProductReport);
router.get("/customers-growth", getCustomerGrowthReport);
router.get("/outstanding-invoices", getOutstandingInvoicesReport);
router.get("/cash-flow", getCashFlowReport);

// ✅ Advanced Reports (Pro/Business only)
router.get("/advanced/sales-cohorts", enforceLimit("reportsAdvanced"), getSalesCohorts);

// 🧠 Intelligent Insights (AI-driven)
router.get("/insights", enforceLimit("reportsAdvanced"), getInsightsReport);

export default router;
