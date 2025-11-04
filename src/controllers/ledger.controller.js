import {
  addLedgerEntry,
  getLedgerEntries,
  getLedgerSummary,
} from '../services/ledger.service.js';

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
    const entries = await getLedgerEntries(filters);
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
