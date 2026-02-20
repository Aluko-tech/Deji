import express from "express";
import {
  getOverviewReport,
  getSegmentsReport,
  getLedgerReport,
  getInsightsReport,
} from "../controllers/report.controller.js";
import {
  getIncomeStatementReport,
  getBalanceSheetReport,
  getFinancialRatiosReport,
} from "../controllers/ledger.controller.js";

import { authenticate } from "../middleware/auth.js";
import { enforceLimit } from "../middleware/planLimit.middleware.js";

const router = express.Router();

// 🔒 All report routes require authentication
router.use(authenticate);

// ✅ Dashboard Reports
router.get("/overview", getOverviewReport);
router.get("/segments", getSegmentsReport);
router.get("/ledger", getLedgerReport);

// 💰 Financial Reports
router.get("/income-statement", getIncomeStatementReport);
router.get("/balance-sheet", getBalanceSheetReport);
router.get("/financial-ratios", getFinancialRatiosReport);

// 🧠 Intelligent Insights (AI-driven)
router.get("/insights", enforceLimit("reportsAdvanced"), getInsightsReport);

export default router;
