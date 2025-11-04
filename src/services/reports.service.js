import prisma from '../db.js';
import { exportToCSV, exportToExcel } from '../utils/exporter.js';

/**
 * Revenue Report
 */
export async function getRevenueReport(tenantId, { period, startDate, endDate, exportType }) {
  const invoices = await prisma.invoice.findMany({
    where: {
      tenantId,
      status: 'PAID',
      date: {
        gte: startDate ? new Date(startDate) : undefined,
        lte: endDate ? new Date(endDate) : undefined,
      },
    },
    select: { amount: true, date: true },
  });

  let grouped = {};
  invoices.forEach(inv => {
    let key;
    const d = new Date(inv.date);
    if (period === 'daily') key = d.toISOString().split('T')[0];
    else if (period === 'monthly') key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    else if (period === 'yearly') key = d.getFullYear();
    else key = `W${getWeek(d)}-${d.getFullYear()}`;

    grouped[key] = (grouped[key] || 0) + inv.amount;
  });

  const data = Object.entries(grouped).map(([period, total]) => ({ period, total }));

  return exportIfNeeded(data, exportType);
}

/**
 * Expenses Report
 */
export async function getExpensesReport(tenantId, { category, startDate, endDate, exportType }) {
  const expenses = await prisma.ledger.findMany({
    where: {
      tenantId,
      type: 'EXPENSE',
      category: category || undefined,
      date: {
        gte: startDate ? new Date(startDate) : undefined,
        lte: endDate ? new Date(endDate) : undefined,
      },
    },
    select: { amount: true, category: true, date: true },
  });

  return exportIfNeeded(expenses, exportType);
}

/**
 * Profit & Loss
 */
export async function getProfitLossReport(tenantId, { startDate, endDate, exportType }) {
  const revenue = await prisma.invoice.aggregate({
    where: {
      tenantId,
      status: 'PAID',
      date: { gte: startDate ? new Date(startDate) : undefined, lte: endDate ? new Date(endDate) : undefined },
    },
    _sum: { amount: true },
  });

  const expenses = await prisma.ledger.aggregate({
    where: {
      tenantId,
      type: 'EXPENSE',
      date: { gte: startDate ? new Date(startDate) : undefined, lte: endDate ? new Date(endDate) : undefined },
    },
    _sum: { amount: true },
  });

  const data = {
    revenue: revenue._sum.amount || 0,
    expenses: expenses._sum.amount || 0,
    profit: (revenue._sum.amount || 0) - (expenses._sum.amount || 0),
  };

  return exportIfNeeded([data], exportType);
}

/**
 * Sales by Product
 */
export async function getSalesByProductReport(tenantId, { startDate, endDate, top, exportType }) {
  const sales = await prisma.invoiceItem.groupBy({
    by: ['productId'],
    _sum: { quantity: true, total: true },
    where: {
      invoice: {
        tenantId,
        status: 'PAID',
        date: { gte: startDate ? new Date(startDate) : undefined, lte: endDate ? new Date(endDate) : undefined },
      },
    },
    orderBy: { _sum: { total: 'desc' } },
    take: parseInt(top, 10),
  });

  const productIds = sales.map(s => s.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });

  const data = sales.map(s => ({
    product: products.find(p => p.id === s.productId)?.name || 'Unknown',
    quantity: s._sum.quantity,
    total: s._sum.total,
  }));

  return exportIfNeeded(data, exportType);
}

/**
 * Customer Growth
 */
export async function getCustomerGrowthReport(tenantId, { period, startDate, endDate, exportType }) {
  const customers = await prisma.contact.findMany({
    where: {
      tenantId,
      createdAt: { gte: startDate ? new Date(startDate) : undefined, lte: endDate ? new Date(endDate) : undefined },
    },
    select: { createdAt: true },
  });

  let grouped = {};
  customers.forEach(c => {
    const d = new Date(c.createdAt);
    let key = period === 'daily'
      ? d.toISOString().split('T')[0]
      : `${d.getFullYear()}-${d.getMonth() + 1}`;
    grouped[key] = (grouped[key] || 0) + 1;
  });

  const data = Object.entries(grouped).map(([period, count]) => ({ period, count }));

  return exportIfNeeded(data, exportType);
}

/**
 * Outstanding Invoices
 */
export async function getOutstandingInvoicesReport(tenantId, { exportType }) {
  const invoices = await prisma.invoice.findMany({
    where: { tenantId, status: 'UNPAID' },
    select: { id: true, customerId: true, dueDate: true, amount: true },
  });

  const today = new Date();
  const data = invoices.map(inv => {
    const age = Math.floor((today - new Date(inv.dueDate)) / (1000 * 60 * 60 * 24));
    let bucket = age <= 30 ? '0-30 days' : age <= 60 ? '31-60 days' : age <= 90 ? '61-90 days' : '90+ days';
    return { ...inv, age, bucket };
  });

  return exportIfNeeded(data, exportType);
}

/**
 * Cash Flow
 */
export async function getCashFlowReport(tenantId, { startDate, endDate, exportType }) {
  const inflows = await prisma.payment.aggregate({
    where: {
      tenantId,
      date: { gte: startDate ? new Date(startDate) : undefined, lte: endDate ? new Date(endDate) : undefined },
    },
    _sum: { amount: true },
  });

  const outflows = await prisma.ledger.aggregate({
    where: {
      tenantId,
      type: 'EXPENSE',
      date: { gte: startDate ? new Date(startDate) : undefined, lte: endDate ? new Date(endDate) : undefined },
    },
    _sum: { amount: true },
  });

  const data = {
    inflows: inflows._sum.amount || 0,
    outflows: outflows._sum.amount || 0,
    net: (inflows._sum.amount || 0) - (outflows._sum.amount || 0),
  };

  return exportIfNeeded([data], exportType);
}

/**
 * Helpers
 */
function getWeek(d) {
  const oneJan = new Date(d.getFullYear(), 0, 1);
  const numberOfDays = Math.floor((d - oneJan) / (24 * 60 * 60 * 1000));
  return Math.ceil((d.getDay() + 1 + numberOfDays) / 7);
}

function exportIfNeeded(data, exportType) {
  if (exportType === 'csv') return exportToCSV(data);
  if (exportType === 'excel') return exportToExcel(data);
  return data;
}

/**
 * 🔹 Overview Report
 * Shows quick stats (for dashboard cards)
 */
export async function getOverviewReport(tenantId) {
  const [invoices, payments, contacts, expenses] = await Promise.all([
    prisma.invoice.aggregate({
      where: { tenantId },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { tenantId },
      _sum: { amount: true },
    }),
    prisma.contact.count({ where: { tenantId } }),
    prisma.ledger.aggregate({
      where: { tenantId, type: "EXPENSE" },
      _sum: { amount: true },
    }),
  ]);

  const totalRevenue = invoices._sum.amount || 0;
  const totalPayments = payments._sum.amount || 0;
  const totalExpenses = expenses._sum.amount || 0;
  const totalCustomers = contacts;

  return {
    totalRevenue,
    totalPayments,
    totalExpenses,
    totalCustomers,
    netIncome: totalRevenue - totalExpenses,
  };
}

/**
 * 🔹 Segments Report
 * Group metrics by key categories
 */
export async function getSegmentsReport(tenantId) {
  const invoicesByStatus = await prisma.invoice.groupBy({
    by: ["status"],
    _sum: { amount: true },
    where: { tenantId },
  });

  const contactsByType = await prisma.contact.groupBy({
    by: ["type"], // e.g., "Lead", "Client"
    _count: { id: true },
    where: { tenantId },
  });

  return {
    invoicesByStatus,
    contactsByType,
  };
}

/**
 * 🔹 Ledger Report
 * Simple cashbook overview: total income vs expenses
 */
export async function getLedgerReport(tenantId, { startDate, endDate }) {
  const [income, expense] = await Promise.all([
    prisma.ledger.aggregate({
      where: {
        tenantId,
        type: "INCOME",
        date: {
          gte: startDate ? new Date(startDate) : undefined,
          lte: endDate ? new Date(endDate) : undefined,
        },
      },
      _sum: { amount: true },
    }),
    prisma.ledger.aggregate({
      where: {
        tenantId,
        type: "EXPENSE",
        date: {
          gte: startDate ? new Date(startDate) : undefined,
          lte: endDate ? new Date(endDate) : undefined,
        },
      },
      _sum: { amount: true },
    }),
  ]);

  return {
    totalIncome: income._sum.amount || 0,
    totalExpense: expense._sum.amount || 0,
    netBalance: (income._sum.amount || 0) - (expense._sum.amount || 0),
  };
}
