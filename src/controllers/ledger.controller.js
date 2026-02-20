import {
  addLedgerEntry,
  getLedgerEntries as getLedgerEntriesService,
  getLedgerSummary,
} from '../services/ledger.service.js';
import {
  getLedgerEntries as getEnhancedLedgerEntries,
  getTrialBalance as getTrialBalanceService,
  getIncomeStatement,
  getBalanceSheet,
  getFinancialRatios,
} from '../services/ledger.enhanced.service.js';

const VALID_TYPES = ['INCOME', 'EXPENSE'];

export async function createLedgerEntry(req, res) {
  const tenantId = req.user.tenantId;
  const { type, amount, description, relatedInvoiceId } = req.body;

  if (!type || !amount || !description) {
    return res.status(400).json({ error: 'Type, amount, and description are required.' });
  }

  if (!VALID_TYPES.includes(type.toUpperCase())) {
    return res.status(400).json({ error: 'Invalid ledger type. Must be INCOME or EXPENSE.' });
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number.' });
  }

  try {
    const entry = await addLedgerEntry({
      tenantId,
      type: type.toUpperCase(),
      amount: parsedAmount,
      description,
      relatedInvoiceId,
    });
    return res.status(201).json(entry);
  } catch (error) {
    console.error('Create Ledger Entry Error:', error);
    return res.status(500).json({
      error: 'Failed to create ledger entry.',
      message: error.message,
    });
  }
}

export async function listLedgerEntries(req, res) {
  const tenantId = req.user.tenantId;
  const { type, startDate, endDate } = req.query;

  if (type && !VALID_TYPES.includes(type.toUpperCase())) {
    return res.status(400).json({ error: 'Invalid ledger type filter. Must be INCOME or EXPENSE.' });
  }

  const filters = {
    tenantId,
    type: type?.toUpperCase(),
  };

  if (startDate && isNaN(Date.parse(startDate))) {
    return res.status(400).json({ error: 'Invalid startDate format.' });
  }
  if (endDate && isNaN(Date.parse(endDate))) {
    return res.status(400).json({ error: 'Invalid endDate format.' });
  }

  filters.startDate = startDate ? new Date(startDate) : undefined;
  filters.endDate = endDate ? new Date(endDate) : undefined;

  try {
    const entries = await getLedgerEntriesService(filters);
    return res.status(200).json(entries);
  } catch (error) {
    console.error('List Ledger Entries Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch ledger entries.',
      message: error.message,
    });
  }
}

export async function getLedgerStats(req, res) {
  const tenantId = req.user.tenantId;

  try {
    const summary = await getLedgerSummary(tenantId);
    return res.status(200).json(summary);
  } catch (error) {
    console.error('Get Ledger Stats Error:', error);
    return res.status(500).json({
      error: 'Failed to compute ledger statistics.',
      message: error.message,
    });
  }
}

/**
 * Get paginated ledger entries with advanced filtering
 */
export async function getLedgerEntries(req, res) {
  const tenantId = req.tenantId;
  const { page, limit, accountId, type, startDate, endDate } = req.query;

  try {
    const result = await getEnhancedLedgerEntries(tenantId, {
      page: Number(page) || 1,
      limit: Number(limit) || 50,
      accountId,
      type,
      startDate,
      endDate,
    });
    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Get Ledger Entries Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch ledger entries',
      error: error.message,
    });
  }
}

/**
 * Get trial balance with debit/credit totals
 */
export async function getTrialBalance(req, res) {
  const tenantId = req.tenantId;

  try {
    const result = await getTrialBalanceService(tenantId);
    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Get Trial Balance Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to compute trial balance',
      error: error.message,
    });
  }
}

/**
 * Get income statement for a date range
 */
export async function getIncomeStatementReport(req, res) {
  const tenantId = req.tenantId;
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({
      success: false,
      message: 'startDate and endDate are required',
    });
  }

  try {
    const result = await getIncomeStatement(tenantId, startDate, endDate);
    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Get Income Statement Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to compute income statement',
      error: error.message,
    });
  }
}

/**
 * Get balance sheet
 */
export async function getBalanceSheetReport(req, res) {
  const tenantId = req.tenantId;

  try {
    const result = await getBalanceSheet(tenantId);
    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Get Balance Sheet Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to compute balance sheet',
      error: error.message,
    });
  }
}

/**
 * Get financial ratios
 */
export async function getFinancialRatiosReport(req, res) {
  const tenantId = req.tenantId;

  try {
    const result = await getFinancialRatios(tenantId);
    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Get Financial Ratios Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to compute financial ratios',
      error: error.message,
    });
  }
}
