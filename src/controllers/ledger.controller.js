import {
  addLedgerEntry,
  getLedgerEntries as getLedgerEntriesService,
  getLedgerSummary,
} from '../services/ledger.service.js';

const VALID_TYPES = ['INCOME', 'EXPENSE'];

export async function createLedgerEntry(req, res) {
  const tenantId = req.user.tenantId;
  const { type, amount, description, relatedInvoiceId, reference, category, date, notes } = req.body;

  if (!type || !amount || !description) {
    return res.status(400).json({ error: 'Type, amount, and description are required.' });
  }
  if (!VALID_TYPES.includes(type.toUpperCase())) {
    return res.status(400).json({ error: 'Invalid type. Must be INCOME or EXPENSE.' });
  }
  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number.' });
  }

  try {
    const entry = await addLedgerEntry({
      tenantId, type, amount: parsedAmount,
      description, relatedInvoiceId, reference, category, date,
    });
    return res.status(201).json(entry);
  } catch (error) {
    console.error('Create Ledger Entry Error:', error);
    return res.status(500).json({ error: 'Failed to create ledger entry.', message: error.message });
  }
}

export async function listLedgerEntries(req, res) {
  const tenantId = req.user.tenantId;
  const { type, startDate, endDate, limit } = req.query;

  if (type && !VALID_TYPES.includes(type.toUpperCase())) {
    return res.status(400).json({ error: 'Invalid type filter.' });
  }

  try {
    const entries = await getLedgerEntriesService({
      tenantId,
      type: type?.toUpperCase(),
      startDate: startDate ? new Date(startDate) : undefined,
      endDate:   endDate   ? new Date(endDate)   : undefined,
      limit: Number(limit) || 500,
    });
    // Return array directly so frontend safeArray() works
    return res.status(200).json(entries);
  } catch (error) {
    console.error('List Ledger Entries Error:', error);
    return res.status(500).json({ error: 'Failed to fetch ledger entries.', message: error.message });
  }
}

export async function getLedgerStats(req, res) {
  const tenantId = req.user.tenantId;
  try {
    const summary = await getLedgerSummary(tenantId);
    return res.status(200).json(summary);
  } catch (error) {
    console.error('Get Ledger Stats Error:', error);
    return res.status(500).json({ error: 'Failed to compute ledger statistics.', message: error.message });
  }
}

export async function getTrialBalance(req, res) {
  const tenantId = req.user.tenantId;
  try {
    const summary = await getLedgerSummary(tenantId);
    return res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Get Trial Balance Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ── Financial report handlers (used by reports.routes.js) ────────────────────
import {
  getIncomeStatement,
  getBalanceSheet,
  getFinancialRatios,
} from '../services/ledger.enhanced.service.js';

export async function getIncomeStatementReport(req, res) {
  const tenantId = req.user?.tenantId || req.tenantId;
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    return res.status(400).json({ success: false, message: 'startDate and endDate are required' });
  }
  try {
    const result = await getIncomeStatement(tenantId, startDate, endDate);
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('Get Income Statement Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getBalanceSheetReport(req, res) {
  const tenantId = req.user?.tenantId || req.tenantId;
  try {
    const result = await getBalanceSheet(tenantId);
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('Get Balance Sheet Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getFinancialRatiosReport(req, res) {
  const tenantId = req.user?.tenantId || req.tenantId;
  try {
    const result = await getFinancialRatios(tenantId);
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('Get Financial Ratios Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
