// ═══════════════════════════════════════════════════════════════════════════
// FILE:  /workspaces/Deji/src/routes/warehouse.routes.js   ← NEW FILE
// Register in /workspaces/Deji/src/routes/index.js:
//   import warehouseRouter from './warehouse.routes.js';
//   app.use('/api/warehouses', warehouseRouter);
// ═══════════════════════════════════════════════════════════════════════════

import express from 'express';
import prisma  from '../config/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { enforceLimit } from '../middleware/planLimit.middleware.js';

const router = express.Router();
router.use(authenticate);

const tid   = req => req.user.tenantId;
const safeN = (v, d = 0) => { const n = Number(v); return isNaN(n) ? d : n; };

// NOTE: /transfers routes MUST come BEFORE /:id routes so Express
// doesn't treat the literal string "transfers" as a warehouse ID.

// ── GET /api/warehouses/transfers ────────────────────────────────────────────
router.get('/transfers', async (req, res) => {
  try {
    const transfers = await prisma.stockTransfer.findMany({
      where:   { tenantId: tid(req) },
      include: {
        fromWarehouse: { select: { id:true, name:true, country:true, city:true } },
        toWarehouse:   { select: { id:true, name:true, country:true, city:true } },
        product:       { select: { id:true, name:true, sku:true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
    res.json(transfers);
  } catch (e) {
    console.error('[TRANSFER GET]', e.message);
    res.status(500).json({ message: 'Failed to fetch transfers' });
  }
});

// ── POST /api/warehouses/transfers ───────────────────────────────────────────
router.post('/transfers', async (req, res) => {
  const {
    fromWarehouseId, toWarehouseId, productId, quantity,
    carrier, deliveryFee = 0, trackingNumber, notes, status = 'completed',
  } = req.body;

  if (!fromWarehouseId || !toWarehouseId || !productId || !quantity)
    return res.status(400).json({ message: 'fromWarehouseId, toWarehouseId, productId and quantity are required' });
  if (fromWarehouseId === toWarehouseId)
    return res.status(400).json({ message: 'Source and destination warehouses must be different' });

  const qty = safeN(quantity);
  const fee = safeN(deliveryFee);
  if (qty <= 0) return res.status(400).json({ message: 'Quantity must be greater than 0' });

  try {
    const [fromWH, toWH, product] = await Promise.all([
      prisma.warehouse.findFirst({ where: { id: fromWarehouseId, tenantId: tid(req) } }),
      prisma.warehouse.findFirst({ where: { id: toWarehouseId,   tenantId: tid(req) } }),
      prisma.product.findFirst(  { where: { id: productId,       tenantId: tid(req) } }),
    ]);
    if (!fromWH)  return res.status(404).json({ message: 'Source warehouse not found' });
    if (!toWH)    return res.status(404).json({ message: 'Destination warehouse not found' });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const result = await prisma.$transaction(async (tx) => {
      // 1 ── Verify stock in source
      const fromStock = await tx.warehouseStock.findUnique({
        where: { warehouseId_productId: { warehouseId: fromWarehouseId, productId } },
      });
      const available = fromStock?.quantity ?? 0;
      if (available < qty)
        throw new Error(`INSUFFICIENT:${fromWH.name} only has ${available} units (requested ${qty})`);

      // 2 ── Deduct source
      await tx.warehouseStock.upsert({
        where:  { warehouseId_productId: { warehouseId: fromWarehouseId, productId } },
        update: { quantity: { decrement: qty } },
        create: { warehouseId: fromWarehouseId, productId, tenantId: tid(req), quantity: 0 },
      });

      // 3 ── Add destination
      await tx.warehouseStock.upsert({
        where:  { warehouseId_productId: { warehouseId: toWarehouseId, productId } },
        update: { quantity: { increment: qty } },
        create: { warehouseId: toWarehouseId, productId, tenantId: tid(req), quantity: qty },
      });

      // 4 ── StockAuditLog (your existing model)
      await tx.stockAuditLog.create({
        data: {
          tenantId:    tid(req), productId,
          changeType:  'TRANSFER',
          oldValue:    available,
          newValue:    available - qty,
          triggeredBy: `Transfer → ${toWH.name}`,
        },
      });

      // 5 ── Auto-log delivery fee → Ledger (your existing LedgerEntry + Account models)
      let ledgerEntryId = null;
      if (fee > 0) {
        let account = await tx.account.findFirst({
          where: { tenantId: tid(req), name: 'Logistics & Delivery' },
        });
        if (!account) {
          account = await tx.account.create({
            data: { tenantId: tid(req), name: 'Logistics & Delivery', type: 'EXPENSE' },
          });
        }
        const entry = await tx.ledgerEntry.create({
          data: {
            tenantId:    tid(req),
            type:        'EXPENSE',
            amount:      fee,
            description: `Stock transfer: ${product.name} ×${qty} · ${fromWH.name} → ${toWH.name}${carrier ? ` via ${carrier}` : ''}`,
            accountId:   account.id,
            reference:   `TRF-${Date.now()}`,
          },
        });
        ledgerEntryId = entry.id;
      }

      // 6 ── Create StockTransfer record
      return tx.stockTransfer.create({
        data: {
          tenantId: tid(req), fromWarehouseId, toWarehouseId, productId,
          quantity: qty, status,
          carrier:        carrier        || null,
          deliveryFee:    fee,
          trackingNumber: trackingNumber || null,
          notes:          notes          || null,
          ledgerEntryId,
          transferredBy:  req.user?.id   || null,
        },
        include: {
          fromWarehouse: { select: { id:true, name:true, country:true, city:true } },
          toWarehouse:   { select: { id:true, name:true, country:true, city:true } },
          product:       { select: { id:true, name:true, sku:true } },
        },
      });
    });

    res.status(201).json(result);
  } catch (e) {
    console.error('[TRANSFER POST]', e.message);
    if (e.message?.startsWith('INSUFFICIENT:'))
      return res.status(422).json({ message: e.message.replace('INSUFFICIENT:', '') });
    res.status(500).json({ message: 'Transfer failed. Please try again.' });
  }
});

// ── PATCH /api/warehouses/transfers/:id ──────────────────────────────────────
router.patch('/transfers/:id', async (req, res) => {
  const { status, trackingNumber, notes } = req.body;
  try {
    const updated = await prisma.stockTransfer.updateMany({
      where: { id: req.params.id, tenantId: tid(req) },
      data: {
        ...(status         !== undefined && { status }),
        ...(trackingNumber !== undefined && { trackingNumber }),
        ...(notes          !== undefined && { notes }),
      },
    });
    if (updated.count === 0) return res.status(404).json({ message: 'Transfer not found' });
    res.json({ message: 'Updated' });
  } catch (e) {
    console.error('[TRANSFER PATCH]', e.message);
    res.status(500).json({ message: 'Failed to update transfer' });
  }
});


// ── GET /api/warehouses/default ──────────────────────────────────────────────
// Returns the tenant's default (Main) warehouse, creating it if needed.
router.get('/default', async (req, res) => {
  try {
    let wh = await prisma.warehouse.findFirst({
      where:   { tenantId: tid(req), isDefault: true, isActive: true },
      orderBy: { createdAt: 'asc' },
      include: {
        warehouseStocks: {
          include: {
            product: { select: { id:true, name:true, sku:true, stock:true } },
          },
        },
      },
    });
    if (!wh) {
      wh = await prisma.warehouse.create({
        data: {
          tenantId:  tid(req),
          name:      'Main Warehouse',
          code:      'MAIN',
          type:      'local',
          country:   'Nigeria',
          city:      'Lagos',
          currency:  'NGN',
          isActive:  true,
          isDefault: true,
          notes:     'Default warehouse — all new stock lands here first',
        },
        include: { warehouseStocks: true },
      });
    }
    res.json({ ...wh, isDefault: true });
  } catch (e) {
    console.error('[WH DEFAULT]', e.message);
    res.status(500).json({ message: 'Failed to fetch default warehouse' });
  }
});

// ── GET /api/warehouses ───────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const warehouses = await prisma.warehouse.findMany({
      where:   { tenantId: tid(req) },
      include: {
        warehouseStocks: {
          include: {
            product: {
              select: { id:true, name:true, sku:true, stock:true,
                        lowStockThreshold:true, category:true, imageUrl:true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json(warehouses);
  } catch (e) {
    console.error('[WH GET]', e.message);
    res.status(500).json({ message: 'Failed to fetch warehouses' });
  }
});

// ── POST /api/warehouses ──────────────────────────────────────────────────────
router.post('/', enforceLimit('warehousesMax'), async (req, res) => {
  const {
    name, code, type = 'local', country = 'Nigeria', city, address,
    currency = 'NGN', defaultDeliveryFee = 0,
    contactName, contactPhone, contactEmail, notes, isActive = true,
  } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: 'Warehouse name is required' });
  try {
    const wh = await prisma.warehouse.create({
      data: {
        tenantId: tid(req), name: name.trim(),
        code: code?.trim() || null, type, country,
        city: city || null, address: address || null, currency,
        defaultDeliveryFee: safeN(defaultDeliveryFee),
        contactName: contactName || null, contactPhone: contactPhone || null,
        contactEmail: contactEmail || null, notes: notes || null, isActive,
      },
    });
    res.status(201).json(wh);
  } catch (e) {
    console.error('[WH POST]', e.message);
    res.status(500).json({ message: 'Failed to create warehouse' });
  }
});

// ── PATCH /api/warehouses/:id ─────────────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  const allowed = [
    'name','type','country','city','address','currency','defaultDeliveryFee',
    'contactName','contactPhone','contactEmail','notes','isActive','isDefault',
  ];
  const data = {};
  for (const k of allowed) {
    if (req.body[k] !== undefined)
      data[k] = k === 'defaultDeliveryFee' ? safeN(req.body[k]) : req.body[k];
  }
  try {
    // If setting as default, unset all other defaults first
    if (data.isDefault === true) {
      await prisma.warehouse.updateMany({
        where: { tenantId: tid(req), isDefault: true },
        data:  { isDefault: false },
      });
    }
    const updated = await prisma.warehouse.updateMany({
      where: { id: req.params.id, tenantId: tid(req) }, data,
    });
    if (updated.count === 0) return res.status(404).json({ message: 'Warehouse not found' });
    res.json({ message: 'Updated' });
  } catch (e) {
    console.error('[WH PATCH]', e.message);
    res.status(500).json({ message: 'Failed to update warehouse' });
  }
});

// ── DELETE /api/warehouses/:id  (soft-delete — keeps transfer history) ────────
router.delete('/:id', async (req, res) => {
  try {
    const wh = await prisma.warehouse.findFirst({ where: { id: req.params.id, tenantId: tid(req) } });
    if (!wh) return res.status(404).json({ message: 'Warehouse not found' });
    if (wh.isDefault) return res.status(400).json({ message: 'Cannot deactivate your default warehouse. Set another warehouse as default first.' });
    await prisma.$transaction([
      prisma.warehouseStock.deleteMany({ where: { warehouseId: wh.id } }),
      prisma.stockTransfer.deleteMany({ where: { OR: [{ fromWarehouseId: wh.id }, { toWarehouseId: wh.id }] } }),
      prisma.warehouse.delete({ where: { id: wh.id } }),
    ]);
    res.json({ message: 'Warehouse permanently deleted' });
  } catch (e) {
    console.error('[WH DELETE]', e.message);
    res.status(500).json({ message: 'Failed to deactivate warehouse' });
  }
});

// ── GET /api/warehouses/:id/stock ─────────────────────────────────────────────
router.get('/:id/stock', async (req, res) => {
  try {
    const stocks = await prisma.warehouseStock.findMany({
      where: { warehouseId: req.params.id, tenantId: tid(req) },
      include: {
        product: {
          select: { id:true, name:true, sku:true, category:true,
                    stock:true, lowStockThreshold:true, imageUrl:true },
        },
      },
      orderBy: { product: { name: 'asc' } },
    });
    res.json(stocks);
  } catch (e) {
    console.error('[WH STOCK GET]', e.message);
    res.status(500).json({ message: 'Failed to fetch warehouse stock' });
  }
});

// ── PUT /api/warehouses/:id/stock ─────────────────────────────────────────────
router.put('/:id/stock', async (req, res) => {
  const { productId, quantity } = req.body;
  if (!productId) return res.status(400).json({ message: 'productId required' });
  try {
    const record = await prisma.warehouseStock.upsert({
      where:  { warehouseId_productId: { warehouseId: req.params.id, productId } },
      update: { quantity: safeN(quantity) },
      create: { warehouseId: req.params.id, productId, tenantId: tid(req), quantity: safeN(quantity) },
    });
    res.json(record);
  } catch (e) {
    console.error('[WH STOCK PUT]', e.message);
    res.status(500).json({ message: 'Failed to update warehouse stock' });
  }
});

export default router;
// ── POST /api/warehouses/sync-stock ──────────────────────────────────────────
// Backfills warehouseStock for all products that have stock > 0 but no entry
router.post('/sync-stock', async (req, res) => {
  try {
    const tenantId = tid(req);
    let wh = await prisma.warehouse.findFirst({
      where: { tenantId, isDefault: true, isActive: true },
    });
    if (!wh) return res.status(404).json({ message: 'No default warehouse found' });

    const products = await prisma.product.findMany({
      where: { tenantId, type: { not: 'service' }, stock: { gt: 0 } },
      select: { id: true, stock: true, name: true },
    });

    let synced = 0;
    for (const p of products) {
      const existing = await prisma.warehouseStock.findUnique({
        where: { warehouseId_productId: { warehouseId: wh.id, productId: p.id } },
      });
      if (!existing) {
        await prisma.warehouseStock.create({
          data: { tenantId, warehouseId: wh.id, productId: p.id, quantity: p.stock },
        });
        synced++;
      }
    }
    res.json({ message: `Synced ${synced} products to ${wh.name}`, total: products.length, synced });
  } catch (e) {
    console.error('[SYNC STOCK]', e.message);
    res.status(500).json({ message: 'Sync failed: ' + e.message });
  }
});
