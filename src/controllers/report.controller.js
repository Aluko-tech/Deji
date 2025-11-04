// src/controllers/report.controller.js
import { PrismaClient } from "@prisma/client";
import { logAction } from "../utils/auditLog.js";
import * as reportService from "../services/reports.service.js";
import { generateInsights } from "../services/insight.service.js"; // 🧠 NEW for AI insights

const prisma = new PrismaClient();

/**
 * 🟢 CREATE REPORT
 */
export const createReport = async (req, res) => {
  const { title, content, type, relatedId } = req.body;
  const { tenantId, userId } = req.user;

  if (!title) return res.status(400).json({ message: "Report title is required." });

  try {
    const report = await prisma.report.create({
      data: { title, content, type, relatedId, tenantId, createdById: userId },
    });

    await logAction({
      tenantId,
      userId,
      action: "CREATE_REPORT",
      details: `Created report: ${title}`,
    });

    res.status(201).json({ message: "Report created successfully.", report });
  } catch (err) {
    console.error("❌ Create Report Error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
};

/**
 * 🟢 GET REPORTS (filters + pagination)
 */
export const getReports = async (req, res) => {
  const { tenantId } = req.user;
  const { type, search, skip = 0, take = 20 } = req.query;

  try {
    const reports = await prisma.report.findMany({
      where: {
        tenantId,
        type: type || undefined,
        OR: search
          ? [{ title: { contains: search, mode: "insensitive" } }]
          : undefined,
      },
      skip: Number(skip),
      take: Number(take),
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({ reports });
  } catch (err) {
    console.error("❌ Get Reports Error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
};

/**
 * 🟢 UPDATE REPORT
 */
export const updateReport = async (req, res) => {
  const { id } = req.params;
  const { tenantId, userId } = req.user;
  const updates = req.body;

  try {
    const report = await prisma.report.findUnique({ where: { id } });

    if (!report || report.tenantId !== tenantId) {
      return res.status(404).json({ message: "Report not found or access denied." });
    }

    const updated = await prisma.report.update({
      where: { id },
      data: updates,
    });

    await logAction({
      tenantId,
      userId,
      action: "UPDATE_REPORT",
      details: `Updated report #${id}`,
    });

    res.status(200).json({ message: "Report updated.", report: updated });
  } catch (err) {
    console.error("❌ Update Report Error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
};

/**
 * 🟢 DELETE REPORT
 */
export const deleteReport = async (req, res) => {
  const { id } = req.params;
  const { tenantId, userId } = req.user;

  try {
    const report = await prisma.report.findUnique({ where: { id } });

    if (!report || report.tenantId !== tenantId) {
      return res.status(404).json({ message: "Report not found or access denied." });
    }

    await prisma.report.delete({ where: { id } });

    await logAction({
      tenantId,
      userId,
      action: "DELETE_REPORT",
      details: `Deleted report #${id}`,
    });

    res.status(200).json({ message: "Report deleted successfully." });
  } catch (err) {
    console.error("❌ Delete Report Error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
};

/**
 * 🧾 REVENUE REPORT
 */
export async function getRevenueReport(req, res) {
  try {
    const { period = "monthly", startDate, endDate, export: exportType } = req.query;
    const { tenantId, userId } = req.user;

    const data = await reportService.getRevenueReport(tenantId, { period, startDate, endDate, exportType });

    await logAction({
      tenantId,
      userId,
      action: "VIEW_REVENUE_REPORT",
      details: "Viewed Revenue Report",
    });

    res.json(data);
  } catch (error) {
    console.error("❌ Revenue Report Error:", error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * 💸 EXPENSES REPORT
 */
export async function getExpensesReport(req, res) {
  try {
    const { category, startDate, endDate, export: exportType } = req.query;
    const { tenantId, userId } = req.user;

    const data = await reportService.getExpensesReport(tenantId, { category, startDate, endDate, exportType });

    await logAction({
      tenantId,
      userId,
      action: "VIEW_EXPENSES_REPORT",
      details: "Viewed Expenses Report",
    });

    res.json(data);
  } catch (error) {
    console.error("❌ Expenses Report Error:", error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * 📈 PROFIT & LOSS REPORT
 */
export async function getProfitLossReport(req, res) {
  try {
    const { startDate, endDate, export: exportType } = req.query;
    const { tenantId, userId } = req.user;

    const data = await reportService.getProfitLossReport(tenantId, { startDate, endDate, exportType });

    await logAction({
      tenantId,
      userId,
      action: "VIEW_PROFIT_LOSS_REPORT",
      details: "Viewed Profit & Loss Report",
    });

    res.json(data);
  } catch (error) {
    console.error("❌ Profit & Loss Report Error:", error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * 🛍️ SALES BY PRODUCT REPORT
 */
export async function getSalesByProductReport(req, res) {
  try {
    const { startDate, endDate, top = 5, export: exportType } = req.query;
    const { tenantId, userId } = req.user;

    const data = await reportService.getSalesByProductReport(tenantId, { startDate, endDate, top, exportType });

    await logAction({
      tenantId,
      userId,
      action: "VIEW_SALES_BY_PRODUCT_REPORT",
      details: "Viewed Sales by Product Report",
    });

    res.json(data);
  } catch (error) {
    console.error("❌ Sales by Product Report Error:", error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * 👥 CUSTOMER GROWTH REPORT
 */
export async function getCustomerGrowthReport(req, res) {
  try {
    const { period = "monthly", startDate, endDate, export: exportType } = req.query;
    const { tenantId, userId } = req.user;

    const data = await reportService.getCustomerGrowthReport(tenantId, { period, startDate, endDate, exportType });

    await logAction({
      tenantId,
      userId,
      action: "VIEW_CUSTOMER_GROWTH_REPORT",
      details: "Viewed Customer Growth Report",
    });

    res.json(data);
  } catch (error) {
    console.error("❌ Customer Growth Report Error:", error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * 🧾 OUTSTANDING INVOICES REPORT
 */
export async function getOutstandingInvoicesReport(req, res) {
  try {
    const { export: exportType } = req.query;
    const { tenantId, userId } = req.user;

    const data = await reportService.getOutstandingInvoicesReport(tenantId, { exportType });

    await logAction({
      tenantId,
      userId,
      action: "VIEW_OUTSTANDING_INVOICES_REPORT",
      details: "Viewed Outstanding Invoices Report",
    });

    res.json(data);
  } catch (error) {
    console.error("❌ Outstanding Invoices Report Error:", error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * 💰 CASH FLOW REPORT
 */
export async function getCashFlowReport(req, res) {
  try {
    const { startDate, endDate, export: exportType } = req.query;
    const { tenantId, userId } = req.user;

    const data = await reportService.getCashFlowReport(tenantId, { startDate, endDate, exportType });

    await logAction({
      tenantId,
      userId,
      action: "VIEW_CASH_FLOW_REPORT",
      details: "Viewed Cash Flow Report",
    });

    res.json(data);
  } catch (error) {
    console.error("❌ Cash Flow Report Error:", error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * 🧮 OVERVIEW REPORT (Dashboard Summary)
 */
export const getOverviewReport = async (req, res) => {
  const { tenantId, userId } = req.user;

  try {
    const overview = await reportService.getOverviewReport(tenantId);

    await logAction({
      tenantId,
      userId,
      action: "VIEW_OVERVIEW_REPORT",
      details: "Viewed dashboard overview report",
    });

    res.status(200).json({ success: true, data: overview });
  } catch (error) {
    console.error("❌ Overview Report Error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

/**
 * 🧩 SEGMENTS REPORT
 */
export const getSegmentsReport = async (req, res) => {
  const { tenantId, userId } = req.user;

  try {
    const segments = await reportService.getSegmentsReport(tenantId);

    await logAction({
      tenantId,
      userId,
      action: "VIEW_SEGMENTS_REPORT",
      details: "Viewed business segments report",
    });

    res.status(200).json({ success: true, data: segments });
  } catch (error) {
    console.error("❌ Segments Report Error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

/**
 * 📚 LEDGER SUMMARY REPORT
 */
export const getLedgerReport = async (req, res) => {
  const { tenantId, userId } = req.user;
  const { startDate, endDate } = req.query;

  try {
    const ledgerSummary = await reportService.getLedgerReport(tenantId, { startDate, endDate });

    await logAction({
      tenantId,
      userId,
      action: "VIEW_LEDGER_REPORT",
      details: "Viewed ledger summary report",
    });

    res.status(200).json({ success: true, data: ledgerSummary });
  } catch (error) {
    console.error("❌ Ledger Report Error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

/**
 * 🧠 INTELLIGENT INSIGHTS REPORT
 */
export const getInsightsReport = async (req, res) => {
  try {
    const { tenantId, userId } = req.user;

    const [revenueAgg, expenseAgg] = await Promise.all([
      prisma.invoice.aggregate({
        _sum: { total: true },
        where: { tenantId },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { tenantId, type: "expense" },
      }),
    ]);

    const data = {
      revenue: revenueAgg._sum.total || 0,
      expenses: expenseAgg._sum.amount || 0,
    };

    const insight = generateInsights(data);

    await logAction({
      tenantId,
      userId,
      action: "VIEW_INSIGHTS_REPORT",
      details: "Viewed AI-generated business insights",
    });

    res.status(200).json({ success: true, data: { ...data, insight } });
  } catch (error) {
    console.error("❌ Insights Report Error:", error);
    res.status(500).json({ message: "Failed to generate insights." });
  }
};
