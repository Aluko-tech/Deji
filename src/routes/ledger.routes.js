import express from 'express';
import {
  createLedgerEntry,
  listLedgerEntries,
  getLedgerStats,
  getTrialBalance,
} from '../controllers/ledger.controller.js';
import { authenticate } from '../middleware/auth.js';
import { deleteLedgerEntry } from '../services/ledger.service.js';

const router = express.Router();
router.use(authenticate);

// GET /api/ledger — list entries (used by ledger page)
router.get('/', listLedgerEntries);

// POST /api/ledger — create expense/income entry
router.post('/', createLedgerEntry);

// DELETE /api/ledger/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await deleteLedgerEntry({ id: req.params.id, tenantId: req.user.tenantId });
    if (!result) return res.status(404).json({ message: 'Entry not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/ledger/summary
router.get('/summary', getLedgerStats);

// GET /api/ledger/trial-balance
router.get('/trial-balance', getTrialBalance);

export default router;
