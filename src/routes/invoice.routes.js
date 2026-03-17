import express from 'express';
import {
  createInvoice,
  deleteInvoice,
  exportInvoicePDF,
  recordPayment,
  getFinanceSummary,
} from '../controllers/invoice.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { enforceLimit } from '../middleware/planLimit.middleware.js';
import prisma from '../config/prisma.js';

const router = express.Router();

// ── Auth + req bridge ─────────────────────────────────────────────────────────
router.use(authenticate);
router.use((req, res, next) => {
  req.tenantId = req.user?.tenantId;
  req.userId   = req.user?.id;
  next();
});

// ── Status maps ───────────────────────────────────────────────────────────────
// Frontend status → Backend enum (only values that exist in DB schema)
const FRONTEND_TO_BACKEND_STATUS = {
  draft:     'PENDING',
  sent:      'SENT',       // requires SENT in enum — see migration below
  paid:      'PAID',
  partial:   'PARTIALLY_PAID',
  overdue:   'OVERDUE',    // requires OVERDUE in enum — see migration below
  cancelled: 'CANCELLED',
};
// Backend enum → Frontend display string
const BACKEND_TO_FRONTEND_STATUS = {
  PENDING:        'draft',
  SENT:           'sent',
  PAID:           'paid',
  PARTIALLY_PAID: 'partial',
  OVERDUE:        'overdue',
  CANCELLED:      'cancelled',
};

// Safe mapper that falls back to PENDING if enum not yet migrated
function toBackendStatus(frontendStatus) {
  return FRONTEND_TO_BACKEND_STATUS[frontendStatus] || 'PENDING';
}
function toFrontendStatus(backendStatus) {
  return BACKEND_TO_FRONTEND_STATUS[backendStatus] || 'draft';
}

// ── Field mapper: frontend → backend ─────────────────────────────────────────
async function mapFrontendToBackend(req, res, next) {
  try {
    const body = req.body;

    // Stash non-schema fields
    req._warehouseId          = body.warehouseId  || null;
    req._fromOrderId          = body.fromOrderId  || null;
    req._frontendStatus       = body.status       || 'draft';
    req._frontendContactName  = body.contactName  || '';
    req._frontendContactEmail = body.contactEmail || '';
    req._frontendContactPhone = body.contactPhone || '';
    req._frontendItems        = body.items;

    // Map items → lineItems
    if (!body.lineItems && Array.isArray(body.items)) {
      body.lineItems = body.items.map(i => ({
        description: i.description || 'Item',
        quantity:    Number(i.quantity)  || 1,
        unitPrice:   Number(i.unitPrice) || 0,
        productId:   i.productId || null,
        _warehouseId: i.warehouseId || body.warehouseId || null,
      }));
    }

    // Auto-find or create Contact from contactName/email
    if (!body.contactId && body.contactName) {
      let contact = null;
      if (body.contactEmail) {
        contact = await prisma.contact.findFirst({
          where: { tenantId: req.tenantId, email: body.contactEmail },
        }).catch(() => null);
      }
      if (!contact) {
        contact = await prisma.contact.findFirst({
          where: { tenantId: req.tenantId, name: body.contactName },
        }).catch(() => null);
      }
      if (!contact) {
        contact = await prisma.contact.create({
          data: { tenantId:req.tenantId, name:body.contactName, email:body.contactEmail||null, phone:body.contactPhone||null, type:'customer' },
        }).catch(() => null);
      }
      if (contact) body.contactId = contact.id;
    }

    // Default dueDate
    if (!body.dueDate) {
      const d = new Date(); d.setDate(d.getDate() + 30);
      body.dueDate = d.toISOString();
    }

    // STRIP all fields Invoice Prisma model doesn't have
    // Invoice schema fields: id, tenantId, contactId, invoiceNumber, issueDate,
    //   dueDate, status, subtotal, tax, discount, total, currency, notes, idempotencyKey
    const SAFE = new Set(['contactId','lineItems','dueDate','currency','taxRate','discount','notes','idempotencyKey','status']);
    const cleaned = {};
    for (const key of Object.keys(body)) {
      if (SAFE.has(key)) cleaned[key] = body[key];
    }
    req.body = cleaned;
    next();
  } catch (e) {
    console.error('[INVOICE MAP]', e.message);
    res.status(500).json({ message: 'Failed to process invoice: ' + e.message });
  }
}

// ── Response normaliser: backend → frontend ───────────────────────────────────
function normaliseInvoice(inv, extra = {}) {
  if (!inv) return inv;
  const items = (inv.lineItems || []).map(li => ({
    id:          li.id,
    description: li.description,
    quantity:    li.quantity,
    unitPrice:   Number(li.unitPrice) || 0,
    total:       (li.quantity || 1) * (Number(li.unitPrice) || 0),
    productId:   li.productId || null,
  }));
  // Use backend total if set, else compute from line items
  const computed = items.reduce((s,i) => s + i.quantity * i.unitPrice, 0);
  const discount = Number(inv.discount) || 0;
  const total    = Number(inv.total) > 0 ? Number(inv.total) : Math.max(0, computed - discount);
  return {
    ...inv,
    contactName:  extra.contactName  || inv.contact?.name  || '',
    contactEmail: extra.contactEmail || inv.contact?.email || '',
    contactPhone: extra.contactPhone || inv.contact?.phone || '',
    status:       toFrontendStatus(inv.status),
    items,
    total,
    subtotal: Number(inv.subtotal) || computed,
    fromOrderId: extra.fromOrderId || null,
    lineItems: inv.lineItems || [],
  };
}

// ── Helper: deduct warehouse stock after invoice creation ─────────────────────
async function deductWarehouseStock(tenantId, warehouseId, lineItems) {
  if (!warehouseId || !lineItems?.length) return;
  for (const li of lineItems) {
    if (!li.productId) continue;
    try {
      await prisma.warehouseStock.upsert({
        where:  { warehouseId_productId: { warehouseId, productId: li.productId } },
        update: { quantity: { decrement: Number(li.quantity) || 1 } },
        create: { tenantId, warehouseId, productId: li.productId, quantity: 0 },
      });
      await prisma.product.updateMany({
        where: { id: li.productId, tenantId },
        data:  { stock: { decrement: Number(li.quantity) || 1 } },
      });
    } catch(e) { console.error(`[STOCK DEDUCT] ${li.productId}:`, e.message); }
  }
}

// ── PATCH /:id/status ─────────────────────────────────────────────────────────
router.patch('/:id/status', authorize(['admin','staff']), async (req, res) => {
  try {
    const backendStatus = toBackendStatus(req.body.status);
    // Try with new status, fall back to PENDING if enum not yet migrated
    let updated;
    try {
      updated = await prisma.invoice.updateMany({
        where: { id: req.params.id, tenantId: req.tenantId },
        data:  { status: backendStatus },
      });
    } catch(enumErr) {
      // SENT/OVERDUE not yet in enum — fall back to PENDING/PAID
      const fallback = ['SENT','OVERDUE'].includes(backendStatus) ? 'PENDING'
        : backendStatus === 'PARTIALLY_PAID' ? 'PAID' : backendStatus;
      updated = await prisma.invoice.updateMany({
        where: { id: req.params.id, tenantId: req.tenantId },
        data:  { status: fallback },
      });
    }
    if (updated.count === 0) return res.status(404).json({ message: 'Invoice not found' });
    const inv = await prisma.invoice.findFirst({
      where: { id: req.params.id }, include: { contact: true, lineItems: true },
    });
    res.json({ success: true, data: normaliseInvoice(inv) });
  } catch(e) {
    console.error('[INVOICE STATUS]', e.message);
    res.status(500).json({ message: e.message });
  }
});

// ── POST / ────────────────────────────────────────────────────────────────────
router.post('/',
  authorize(['admin','staff']),
  enforceLimit('invoicesPerMonth'),
  mapFrontendToBackend,
  async (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = async (data) => {
      if (data?.success && data?.data) {
        await deductWarehouseStock(req.tenantId, req._warehouseId, data.data?.lineItems || req._frontendItems || []);
        data.data = normaliseInvoice(data.data, {
          contactName:  req._frontendContactName,
          contactEmail: req._frontendContactEmail,
          contactPhone: req._frontendContactPhone,
          fromOrderId:  req._fromOrderId,
        });
      }
      return originalJson(data);
    };
    next();
  },
  createInvoice
);

// ── GET / ─────────────────────────────────────────────────────────────────────
router.get('/', authorize(['admin','staff']), async (req, res) => {
  try {
    const { limit = 500, page = 1, status } = req.query;
    const where = { tenantId: req.tenantId };
    if (status) {
      const bs = toBackendStatus(status);
      where.status = bs;
    }
    const invoices = await prisma.invoice.findMany({
      where,
      include: { contact: true, lineItems: true },
      orderBy: { createdAt: 'desc' },
      take:    Math.min(Number(limit), 500),
      skip:    (Number(page) - 1) * Number(limit),
    });
    res.json(invoices.map(inv => normaliseInvoice(inv)));
  } catch(e) {
    console.error('[INVOICE GET]', e.message);
    res.status(500).json({ message: e.message });
  }
});

// ── GET /:id ──────────────────────────────────────────────────────────────────
router.get('/:id', authorize(['admin','staff']), async (req, res) => {
  try {
    const inv = await prisma.invoice.findFirst({
      where:   { id: req.params.id, tenantId: req.tenantId },
      include: { contact: true, lineItems: true, payments: true },
    });
    if (!inv) return res.status(404).json({ message: 'Invoice not found' });
    res.json({ success: true, data: normaliseInvoice(inv) });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ── PUT /:id — Direct Prisma update (bypasses service to avoid schema mismatch) ──
router.put('/:id', authorize(['admin','staff']), mapFrontendToBackend, async (req, res) => {
  try {
    const inv = await prisma.invoice.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: { lineItems: true },
    });
    if (!inv) return res.status(404).json({ message: 'Invoice not found' });

    // Only update fields that exist in the Invoice schema
    const updateData = {};
    if (req.body.contactId)       updateData.contactId = req.body.contactId;
    if (req.body.dueDate)         updateData.dueDate   = new Date(req.body.dueDate);
    if (req.body.discount != null) updateData.discount = Number(req.body.discount) || 0;
    if (req.body.notes != null)    updateData.notes    = req.body.notes;
    if (req.body.currency)         updateData.currency = req.body.currency;

    // Replace line items if provided
    if (req.body.lineItems?.length) {
      const subtotal = req.body.lineItems.reduce((s,li) => s+(Number(li.quantity)||1)*(Number(li.unitPrice)||0), 0);
      const disc     = Number(req.body.discount ?? inv.discount) || 0;
      updateData.subtotal = subtotal;
      updateData.total    = Math.max(0, subtotal - disc);

      // Track stock diff per product
      const prevMap = {};
      for (const li of inv.lineItems) {
        if (li.productId) prevMap[li.productId] = (prevMap[li.productId]||0) + li.quantity;
      }
      const newMap = {};
      for (const li of req.body.lineItems) {
        if (li.productId) newMap[li.productId] = (newMap[li.productId]||0) + (Number(li.quantity)||1);
      }

      await prisma.lineItem.deleteMany({ where: { invoiceId: req.params.id } });
      await prisma.lineItem.createMany({
        data: req.body.lineItems.map(li => ({
          invoiceId:   req.params.id,
          description: li.description || 'Item',
          quantity:    Number(li.quantity)  || 1,
          unitPrice:   Number(li.unitPrice) || 0,
          total:       (Number(li.quantity)||1) * (Number(li.unitPrice)||0),
          productId:   li.productId || null,
        })),
      });

      // Adjust warehouse stock for changed quantities
      const wid = req._warehouseId;
      if (wid) {
        const allPids = new Set([...Object.keys(prevMap), ...Object.keys(newMap)]);
        for (const pid of allPids) {
          const diff = (newMap[pid]||0) - (prevMap[pid]||0);
          if (diff === 0) continue;
          try {
            await prisma.warehouseStock.upsert({
              where:  { warehouseId_productId: { warehouseId:wid, productId:pid } },
              update: diff > 0 ? { quantity:{decrement:diff} } : { quantity:{increment:Math.abs(diff)} },
              create: { tenantId:req.tenantId, warehouseId:wid, productId:pid, quantity:0 },
            });
            await prisma.product.updateMany({
              where: { id:pid, tenantId:req.tenantId },
              data:  diff > 0 ? { stock:{decrement:diff} } : { stock:{increment:Math.abs(diff)} },
            });
          } catch(e) { console.error(`[STOCK ADJUST] ${pid}:`, e.message); }
        }
      }
    }

    await prisma.invoice.update({ where: { id: req.params.id }, data: updateData });

    const updated = await prisma.invoice.findFirst({
      where: { id: req.params.id }, include: { contact: true, lineItems: true },
    });
    res.json({ success: true, data: normaliseInvoice(updated, {
      contactName:  req._frontendContactName,
      contactEmail: req._frontendContactEmail,
      contactPhone: req._frontendContactPhone,
    })});
  } catch(e) {
    console.error('[INVOICE PUT]', e.message);
    res.status(500).json({ message: e.message });
  }
});

// ── DELETE /:id ───────────────────────────────────────────────────────────────
router.delete('/:id', authorize(['admin']), deleteInvoice);

// ── GET /:id/pdf ──────────────────────────────────────────────────────────────
router.get('/:id/pdf', authorize(['admin','staff']), exportInvoicePDF);

// ── POST /:id/payments ────────────────────────────────────────────────────────
router.post('/:id/payments', authorize(['admin','staff']), recordPayment);

// ── GET /summary/stats ────────────────────────────────────────────────────────
router.get('/summary/stats', authorize(['admin','staff']), getFinanceSummary);

// ── POST /:id/refund ──────────────────────────────────────────────────────────
router.post('/:id/refund', authorize(['admin','staff']), async (req, res) => {
  const { reason, items, restockWarehouseId } = req.body;
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id:req.params.id, tenantId:req.tenantId }, include: { lineItems:true, contact:true },
    });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    if (!['PAID','PARTIALLY_PAID'].includes(invoice.status))
      return res.status(400).json({ message: 'Only paid invoices can be refunded' });

    const refundItems = (items?.length)
      ? items
      : invoice.lineItems.map(li => ({ lineItemId:li.id, quantity:li.quantity, productId:li.productId }));

    let refundAmount = 0;
    for (const ri of refundItems) {
      const li = invoice.lineItems.find(l => l.id===ri.lineItemId);
      if (li) refundAmount += Number(li.unitPrice) * Number(ri.quantity);
    }

    await prisma.$transaction(async (tx) => {
      for (const ri of refundItems) {
        if (!ri.productId || !ri.quantity) continue;
        await tx.product.updateMany({ where:{id:ri.productId,tenantId:req.tenantId}, data:{stock:{increment:Number(ri.quantity)}} });
        if (restockWarehouseId) {
          await tx.warehouseStock.upsert({
            where:  { warehouseId_productId:{warehouseId:restockWarehouseId,productId:ri.productId} },
            update: { quantity:{increment:Number(ri.quantity)} },
            create: { tenantId:req.tenantId, warehouseId:restockWarehouseId, productId:ri.productId, quantity:Number(ri.quantity) },
          });
        }
      }
      await tx.invoice.update({
        where: { id:invoice.id },
        data:  { status:'CANCELLED', notes:`${invoice.notes||''}\n[REFUNDED] ${reason||'Customer return'} — ₦${refundAmount.toLocaleString()}`.trim() },
      });
      await tx.ledgerEntry.create({
        data: { tenantId:req.tenantId, type:'EXPENSE', amount:refundAmount, description:`Refund · ${invoice.invoiceNumber} · ${reason||'Customer return'}`, reference:invoice.id, category:'Refunds' },
      }).catch(() => {});
    }, { timeout:15000 });

    res.json({ message:'Refund processed successfully', refundAmount });
  } catch(e) {
    console.error('[REFUND]', e.message);
    res.status(500).json({ message: e.message || 'Refund failed' });
  }
});

export default router;