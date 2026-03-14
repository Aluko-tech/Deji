import prisma from '../config/prisma.js';
import { getIdempotentResponse, setIdempotentResponse } from '../utils/idempotencyStore.js';
import { recomputeInvoiceStatus } from './invoice.service.js';

const PAYMENT_SCOPE = 'payment:create';

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

export async function createPaymentService(tenantId, data) {
  const { userId, invoiceId, amount, method, status = 'PAID', note, idempotencyKey } = data;
  const numericAmount = Number(amount);

  if (!invoiceId) throw new Error('invoiceId is required.');
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) throw new Error('Amount must be positive.');

  const cached = getIdempotentResponse(tenantId, PAYMENT_SCOPE, idempotencyKey);
  if (cached) return cached;

  const result = await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({ where: { id: invoiceId, tenantId }, include: { payments: true } });
    if (!invoice) throw new Error('Invoice not found.');

    const paidSoFar = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const balance = Number(invoice.total) - paidSoFar;

    if (numericAmount > balance) throw new Error('Payment amount exceeds invoice balance.');

    const payment = await tx.payment.create({
      data: {
        tenantId,
        invoiceId,
        amount: numericAmount,
        method,
        status,
        note,
      },
    });

    const cash = await ensureAccount(tx, tenantId, 'Cash', 'ASSET');
    const ar = await ensureAccount(tx, tenantId, 'Accounts Receivable', 'ASSET');

    await tx.ledgerEntry.createMany({
      data: [
        {
          tenantId,
          accountId: cash.id,
          type: 'INCOME',
          amount: numericAmount,
          description: `Payment received for invoice ${invoice.invoiceNumber}`,
          reference: payment.id,
        },
        {
          tenantId,
          accountId: ar.id,
          type: 'EXPENSE',
          amount: numericAmount,
          description: `Receivable reduced for invoice ${invoice.invoiceNumber}`,
          reference: payment.id,
        },
      ],
    });

    const updated = await recomputeInvoiceStatus(tenantId, invoiceId, tx);

    return {
      payment,
      invoiceStatus: updated.status,
      paid: updated.paid,
      balance: updated.balance,
      userId,
    };
  });

  setIdempotentResponse(tenantId, PAYMENT_SCOPE, idempotencyKey, result);
  return result;
}

export async function updatePaymentService(tenantId, id, data) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.payment.findFirst({ where: { id, tenantId } });
    if (!existing) throw new Error('Payment not found.');

    const payment = await tx.payment.update({ where: { id }, data });
    const { status: invoiceStatus, paid, balance } = await recomputeInvoiceStatus(tenantId, payment.invoiceId, tx);
    return { payment, invoiceStatus, paid, balance };
  });
}

export async function deletePaymentService(tenantId, id) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.payment.findFirst({ where: { id, tenantId } });
    if (!existing) throw new Error('Payment not found or access denied.');

    await tx.payment.delete({ where: { id } });
    const { status: invoiceStatus, paid, balance } = await recomputeInvoiceStatus(tenantId, existing.invoiceId, tx);

    return { paymentId: id, invoiceStatus, paid, balance };
  });
}

export async function getPaymentsService(tenantId, query = {}) {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(query.limit || 20)));
  const skip = (page - 1) * limit;

  const where = {
    tenantId,
    ...(query.invoiceId ? { invoiceId: query.invoiceId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.method ? { method: query.method } : {}),
  };

  const [data, total] = await prisma.$transaction([
    prisma.payment.findMany({ where, include: { invoice: true }, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.payment.count({ where }),
  ]);

  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
}

export async function getPaymentByIdService(tenantId, id) {
  return prisma.payment.findFirst({
    where: { id, tenantId },
    include: { invoice: true },
  });
}
