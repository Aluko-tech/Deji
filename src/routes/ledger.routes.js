import express from 'express';
import {
  createLedgerEntry,
  listLedgerEntries,
  getLedgerStats,
} from '../controllers/ledger.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// 🔐 Require authentication for all ledger routes
router.use(authenticate);

/**
 * @route   POST /api/ledger
 * @desc    Create a new ledger entry (INCOME or EXPENSE)
 * @access  Private
 */
router.post('/', createLedgerEntry);

/**
 * @route   GET /api/ledger
 * @desc    List ledger entries (optional filters: type, startDate, endDate)
 * @access  Private
 */
router.get('/', listLedgerEntries);

/**
 * @route   GET /api/ledger/summary
 * @desc    Get ledger statistics (total income, total expense, balance)
 * @access  Private
 */
router.get('/summary', getLedgerStats);

export default router;
