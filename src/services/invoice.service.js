import prisma from '../config/prisma.js';
import { setIdempotentResponse, getIdempotentResponse } from '../utils/idempotencyStore.js';

const INVOICE_SCOPE = 'invoice:create';

export function calculateInvoiceTotals(lineItems, taxRate = 0, discount = 0) {
  const subtotal = lineItems.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0);
  const tax = subtotal * (Number(taxRate) / 100);
  const total = subtotal + tax - Number(discount);

  return {
    subtotal,
    tax,
    discount: Number(discount),
    total,
  };
}

async function ensureAccount(tx, tenantId, name, type) {
  return tx.account.upsert({
    where: { id: `${tenantId}-${name}` },
    update: {},
    create: {
      id: `${tenantId}-${name}`,
      tenantId,
      name,
      type,
    },
  });
}

export async function createInvoiceWithStock(tenantId, data) {
  const { userId, contactId, lineItems = [], dueDate, currency = 'NGN', idempotencyKey, taxRate = 0, discount = 0 } = data;

  if (!contactId) throw new Error('contactId is required.');
  if (!Array.isArray(lineItems) || lineItems.length === 0) throw new Error('lineItems are required.');

  const cached = getIdempotentResponse(tenantId, INVOICE_SCOPE, idempotencyKey);
  if (cached) return cached;

  const created = await prisma.$transaction(async (tx) => {
    const productIds = lineItems.map((item) => item.productId).filter(Boolean);
    const products = productIds.length
      ? await tx.product.findMany({ where: { tenantId, id: { in: productIds } } })
      : [];

    const productMap = new Map(products.map((p) => [p.id, p]));

    const preparedLineItems = lineItems.map((item) => {
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);

      if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Each line item quantity must be > 0.');
      if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new Error('Each line item unitPrice must be >= 0.');

      if (item.productId) {
        const product = productMap.get(item.productId);
        if (!product) throw new Error(`Product not found for id ${item.productId}.`);
        if (product.currency !== currency) throw new Error(`Currency mismatch for product ${product.name}.`);
        if (product.stock < quantity) throw new Error(`Insufficient stock for ${product.name}.`);
      }

      return {
        productId: item.productId || null,
        description: item.description || productMap.get(item.productId)?.name || 'Item',
        quantity,
        unitPrice,
        total: quantity * unitPrice,
      };
    });

    const totals = calculateInvoiceTotals(preparedLineItems, taxRate, discount);

    const invoiceCount = await tx.invoice.count({ where: { tenantId } });
    const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(6, '0')}`;

    for (const item of preparedLineItems) {
      if (!item.productId) continue;
      const updateResult = await tx.product.updateMany({
        where: { id: item.productId, tenantId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });

      if (updateResult.count !== 1) {
        throw new Error('Stock update failed due to concurrent update or insufficient stock.');
      }

      await tx.stockAuditLog.create({
        data: {
          tenantId,
          productId: item.productId,
          changeType: 'deduct',
          oldValue: productMap.get(item.productId).stock,
          newValue: productMap.get(item.productId).stock - item.quantity,
          triggeredBy: userId || 'system',
        },
      });
    }

    const invoice = await tx.invoice.create({
      data: {
        tenantId,
        contactId,
        invoiceNumber,
        status: 'PENDING',
        issueDate: new Date(),
        dueDate: dueDate ? new Date(dueDate) : new Date(),
        subtotal: totals.subtotal,
        tax: totals.tax,
        discount: totals.discount,
        total: totals.total,
        currency,
        lineItems: { create: preparedLineItems },
      },
      include: { lineItems: true, contact: true },
    });

    const ar = await ensureAccount(tx, tenantId, 'Accounts Receivable', 'ASSET');
    const revenue = await ensureAccount(tx, tenantId, 'Sales Revenue', 'REVENUE');

    await tx.ledgerEntry.createMany({
      data: [
        {
          tenantId,
          accountId: ar.id,
          type: 'INCOME',
          amount: totals.total,
          description: `Invoice ${invoice.invoiceNumber} receivable`,
          reference: invoice.id,
        },
        {
          tenantId,
          accountId: revenue.id,
          type: 'INCOME',
          amount: totals.total,
          description: `Invoice ${invoice.invoiceNumber} revenue`,
          reference: invoice.id,
        },
      ],
    });

    return invoice;
  });

  setIdempotentResponse(tenantId, INVOICE_SCOPE, idempotencyKey, created);
  return created;
}

export async function getInvoicesService(tenantId, query = {}) {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(query.limit || 20)));
  const skip = (page - 1) * limit;

  const where = {
    tenantId,
    ...(query.status ? { status: query.status } : {}),
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
    where: { id, tenantId },
    include: { contact: true, lineItems: true, payments: true },
  });
}

export async function updateInvoiceService(tenantId, id, data) {
  const updated = await prisma.invoice.updateMany({
    where: { id, tenantId },
    data,
  });

  if (updated.count !== 1) throw new Error('Invoice not found.');

  return getInvoiceByIdService(tenantId, id);
}

export async function deleteInvoiceService(tenantId, id) {
  const updated = await prisma.invoice.updateMany({
    where: { id, tenantId },
    data: { status: 'CANCELLED' },
  });

  if (updated.count !== 1) throw new Error('Invoice not found.');

  return getInvoiceByIdService(tenantId, id);
}

export async function recomputeInvoiceStatus(tenantId, invoiceId, tx = prisma) {
  const invoice = await tx.invoice.findFirst({ where: { id: invoiceId, tenantId }, include: { payments: true } });
  if (!invoice) throw new Error('Invoice not found.');

  const paid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const balance = Number(invoice.total) - paid;
  const nextStatus = balance <= 0 ? 'PAID' : paid > 0 ? 'PARTIALLY_PAID' : 'PENDING';

  const updated = await tx.invoice.update({ where: { id: invoice.id }, data: { status: nextStatus } });
  return { invoice: updated, paid, balance, status: nextStatus };
}
