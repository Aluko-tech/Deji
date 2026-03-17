import express from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma from '../config/prisma.js';

const router = express.Router();
router.use(authenticate);

// ── GET / — list entries ──────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { limit = 1000, type, category } = req.query;
    const where = { tenantId: req.user.tenantId };
    if (type)     where.type     = type.toUpperCase();
    if (category) where.category = category;

    const entries = await prisma.ledgerEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' }, // use createdAt — safe on ALL schema versions
      take:    Math.min(Number(limit), 1000),
    });

    // Normalize: expose `date` from createdAt if date field doesn't exist yet
    const normalized = entries.map(e => ({
      ...e,
      date:          e.date          ?? e.createdAt,
      category:      e.category      ?? null,
      paymentMethod: e.paymentMethod ?? null,
      accountCode:   e.accountCode   ?? null,
      currency:      e.currency      ?? 'NGN',
      fxRate:        e.fxRate        ?? null,
      notes:         e.notes         ?? null,
    }));

    res.json({ data: normalized, total: normalized.length });
  } catch(e) {
    console.error('[LEDGER GET]', e.message);
    res.status(500).json({ message: e.message });
  }
});

// ── POST / — create entry ──────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const {
      type, amount, description, category, reference,
      date, paymentMethod, accountCode, currency, fxRate, notes, accountId,
    } = req.body;

    if (!type || !amount || !description) {
      return res.status(400).json({ message: 'type, amount, and description are required' });
    }

    // Build data — only include fields that exist in current schema
    const data = {
      tenantId:    req.user.tenantId,
      type:        type.toUpperCase(),
      amount:      Number(amount),
      description: description.trim(),
      reference:   reference || `${type==="INCOME"?"INC":"EXP"}-${Date.now().toString().slice(-6)}`,
    };

    // Add optional fields only if they exist in schema (post-migration)
    // We try to add them — if migration hasn't run, Prisma will throw on unknown fields
    // so we catch and retry without them
    const optionalFields = {
      category:      category      || null,
      paymentMethod: paymentMethod || null,
      accountCode:   accountCode   || null,
      currency:      currency      || 'NGN',
      fxRate:        fxRate ? Number(fxRate) : null,
      notes:         notes         || null,
      accountId:     accountId     || null,
    };

    // Try with all fields first (post-migration)
    let entry;
    try {
      entry = await prisma.ledgerEntry.create({ data: { ...data, ...optionalFields } });
    } catch(fieldErr) {
      // If unknown field error, fall back to base fields only (pre-migration)
      if (fieldErr.message.includes('Unknown argument') || fieldErr.code === 'P2009') {
        console.warn('[LEDGER] Optional fields not in schema yet, using base fields only');
        entry = await prisma.ledgerEntry.create({ data });
      } else {
        throw fieldErr;
      }
    }

    // Normalize response
    res.status(201).json({
      success: true,
      data: {
        ...entry,
        date:          entry.date          ?? entry.createdAt,
        category:      entry.category      ?? category      ?? null,
        paymentMethod: entry.paymentMethod ?? paymentMethod ?? null,
        accountCode:   entry.accountCode   ?? accountCode   ?? null,
        currency:      entry.currency      ?? currency      ?? 'NGN',
      },
    });
  } catch(e) {
    console.error('[LEDGER POST]', e.message);
    res.status(500).json({ message: e.message });
  }
});

// ── DELETE /:id ────────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const entry = await prisma.ledgerEntry.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId },
    });
    if (!entry) return res.status(404).json({ message: 'Entry not found' });
    await prisma.ledgerEntry.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch(e) {
    console.error('[LEDGER DELETE]', e.message);
    res.status(500).json({ message: e.message });
  }
});

// ── GET /summary ───────────────────────────────────────────────────────────────
router.get('/summary', async (req, res) => {
  try {
    const entries = await prisma.ledgerEntry.findMany({
      where: { tenantId: req.user.tenantId },
    });
    const income  = entries.filter(e=>e.type==='INCOME').reduce((s,e)=>s+Number(e.amount),0);
    const expense = entries.filter(e=>e.type==='EXPENSE').reduce((s,e)=>s+Number(e.amount),0);
    res.json({ income, expense, net: income - expense, count: entries.length });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ── GET /trial-balance ─────────────────────────────────────────────────────────
router.get('/trial-balance', async (req, res) => {
  try {
    const entries = await prisma.ledgerEntry.findMany({
      where: { tenantId: req.user.tenantId },
    });
    const balances = {};
    entries.forEach(e => {
      const key = e.accountCode || (e.type==='INCOME' ? '4099' : '5099');
      if (!balances[key]) balances[key] = { debit: 0, credit: 0 };
      if (e.type === 'INCOME') balances[key].credit += Number(e.amount);
      else                     balances[key].debit  += Number(e.amount);
    });
    res.json({ balances });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

export default router;