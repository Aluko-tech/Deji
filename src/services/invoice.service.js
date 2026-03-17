import prisma from '../config/prisma.js';
import { setIdempotentResponse, getIdempotentResponse } from '../utils/idempotencyStore.js';

const INVOICE_SCOPE = 'invoice:create';

export function calculateInvoiceTotals(lineItems, taxRate = 0, discount = 0) {
  const subtotal = lineItems.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0);
  const tax = subtotal * (Number(taxRate) / 100);
  const total = subtotal + tax - Number(discount);
  return { subtotal, tax, discount: Number(discount), total };
}

async function ensureAccount(client, tenantId, name, type) {
  return client.account.upsert({
    where:  { id: `${tenantId}-${name}` },
    update: {},
    create: { id: `${tenantId}-${name}`, tenantId, name, type },
  });
}

async function deductWarehouseStock(tx, tenantId, productId, quantity, preferredWarehouseId = null) {
  const stocks = await tx.warehouseStock.findMany({
    where: { productId, tenantId, quantity: { gt: 0 } },
    orderBy: { quantity: 'desc' },
    include: { warehouse: { select: { id: true, name: true, isActive: true } } },
  });

  if (stocks.length === 0) return null;

  let chosen = null;
  if (preferredWarehouseId) {
    chosen = stocks.find(s => s.warehouseId === preferredWarehouseId);
  }
  if (!chosen) chosen = stocks[0];

  if (chosen.quantity < quantity) {
    throw new Error(
      `Insufficient warehouse stock in "${chosen.warehouse.name}". ` +
      `Available: ${chosen.quantity}, needed: ${quantity}.`
    );
  }

  await tx.warehouseStock.update({
    where: { warehouseId_productId: { warehouseId: chosen.warehouseId, productId } },
    data:  { quantity: { decrement: quantity } },
  });

  return chosen.warehouseId;
}

export async function createInvoiceWithStock(tenantId, data) {
  const {
    userId, contactId, lineItems = [], dueDate, currency = 'NGN',
    idempotencyKey, taxRate = 0, discount = 0, warehouseId = null,
  } = data;

  if (!contactId) throw new Error('contactId is required.');
  if (!Array.isArray(lineItems) || lineItems.length === 0) throw new Error('lineItems are required.');

  const cached = getIdempotentResponse(tenantId, INVOICE_SCOPE, idempotencyKey);
  if (cached) return cached;

  // ── Step 1: Core invoice + stock deduction inside transaction (keep it lean) ──
  const created = await prisma.$transaction(async (tx) => {
    const productIds = lineItems.map(item => item.productId).filter(Boolean);
    const products   = productIds.length
      ? await tx.product.findMany({ where: { tenantId, id: { in: productIds } } })
      : [];
    const productMap = new Map(products.map(p => [p.id, p]));

    const preparedLineItems = lineItems.map(item => {
      const quantity  = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);

      if (!Number.isFinite(quantity)  || quantity  <= 0) throw new Error('Each line item quantity must be > 0.');
      if (!Number.isFinite(unitPrice) || unitPrice <  0) throw new Error('Each line item unitPrice must be >= 0.');

      if (item.productId) {
        const product = productMap.get(item.productId);
        if (!product) throw new Error(`Product not found for id ${item.productId}.`);
        if (product.currency !== currency) throw new Error(`Currency mismatch for product ${product.name}.`);
        if (product.stock < quantity)      throw new Error(`Insufficient stock for ${product.name}.`);
      }

      return {
        productId:   item.productId || null,
        warehouseId: item.warehouseId || warehouseId || null,
        description: item.description || productMap.get(item.productId)?.name || 'Item',
        quantity,
        unitPrice,
        total: quantity * unitPrice,
      };
    });

    const totals = calculateInvoiceTotals(preparedLineItems, taxRate, discount);
    const invoiceCount  = await tx.invoice.count({ where: { tenantId } });
    const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(6, '0')}`;

    for (const item of preparedLineItems) {
      if (!item.productId) continue;

      const updateResult = await tx.product.updateMany({
        where: { id: item.productId, tenantId, stock: { gte: item.quantity } },
        data:  { stock: { decrement: item.quantity } },
      });
      if (updateResult.count !== 1) {
        throw new Error('Stock update failed due to concurrent update or insufficient stock.');
      }

      const usedWarehouseId = await deductWarehouseStock(
        tx, tenantId, item.productId, item.quantity, item.warehouseId
      );

      const prod = productMap.get(item.productId);
      await tx.stockAuditLog.create({
        data: {
          tenantId,
          productId:   item.productId,
          changeType:  'INVOICE_DEDUCT',
          oldValue:    prod.stock,
          newValue:    prod.stock - item.quantity,
          triggeredBy: usedWarehouseId
            ? `Invoice · warehouse:${usedWarehouseId}`
            : (userId || 'system'),
        },
      });
    }

    const dbLineItems = preparedLineItems.map(({ warehouseId: _wh, ...rest }) => rest);

    return tx.invoice.create({
      data: {
        tenantId, contactId, invoiceNumber,
        status: 'PENDING', issueDate: new Date(),
        dueDate: dueDate ? new Date(dueDate) : new Date(),
        subtotal: totals.subtotal, tax: totals.tax,
        discount: totals.discount, total: totals.total, currency,
        lineItems: { create: dbLineItems },
      },
      include: { lineItems: true, contact: true },
    });
  }, { timeout: 15000 });

  // ── Step 2: Ledger entries OUTSIDE transaction (avoids Supabase 5s timeout) ──
  try {
    const ar      = await ensureAccount(prisma, tenantId, 'Accounts Receivable', 'ASSET');
    const revenue = await ensureAccount(prisma, tenantId, 'Sales Revenue',       'REVENUE');
    await prisma.ledgerEntry.create({
      data: {
        tenantId, accountId: ar.id, type: 'INCOME',
        amount:      created.total,
        description: `Invoice ${created.invoiceNumber} receivable`,
        reference:   created.id,
      },
    });
    await prisma.ledgerEntry.create({
      data: {
        tenantId, accountId: revenue.id, type: 'INCOME',
        amount:      created.total,
        description: `Invoice ${created.invoiceNumber} revenue`,
        reference:   created.id,
      },
    });
  } catch (e) {
    console.error('[LEDGER] Failed to create ledger entries for invoice', created.invoiceNumber, e.message);
  }

  setIdempotentResponse(tenantId, INVOICE_SCOPE, idempotencyKey, created);
  return created;
}

export async function getInvoicesService(tenantId, query = {}) {
  const page  = Math.max(1,   Number(query.page  || 1));
  const limit = Math.min(100, Math.max(1, Number(query.limit || 20)));
  const skip  = (page - 1) * limit;
  const where = {
    tenantId,
    ...(query.status   ? { status:   query.status   } : {}),
    ...(query.currency ? { currency: query.currency } : {}),
  };
  const [data, total] = await prisma.$transaction([
    prisma.invoice.findMany({ where, include: { contact: true, lineItems: true }, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.invoice.count({ where }),
  ]);
  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
}

export async function getInvoiceByIdService(tenantId, id) {
  return prisma.invoice.findFirst({
    where:   { id, tenantId },
    include: { contact: true, lineItems: true, payments: true },
  });
}

export async function updateInvoiceService(tenantId, id, data) {
  const invoice = await prisma.invoice.findFirst({ where: { id, tenantId } });
  if (!invoice) throw new Error('Invoice not found.');
  await prisma.invoice.update({ where: { id }, data });
  return getInvoiceByIdService(tenantId, id);
}

export async function deleteInvoiceService(tenantId, id) {
  const invoice = await prisma.invoice.findFirst({ where: { id, tenantId } });
  if (!invoice) throw new Error('Invoice not found.');
  await prisma.invoice.update({ where: { id }, data: { status: 'CANCELLED' } });
  return getInvoiceByIdService(tenantId, id);
}

export async function recomputeInvoiceStatus(tenantId, invoiceId, tx = prisma) {
  const invoice = await tx.invoice.findFirst({ where: { id: invoiceId, tenantId }, include: { payments: true } });
  if (!invoice) throw new Error('Invoice not found.');
  const paid       = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const balance    = Number(invoice.total) - paid;
  const nextStatus = balance <= 0 ? 'PAID' : paid > 0 ? 'PARTIALLY_PAID' : 'PENDING';
  const updated    = await tx.invoice.update({ where: { id: invoice.id }, data: { status: nextStatus } });
  return { invoice: updated, paid, balance, status: nextStatus };
}