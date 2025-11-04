import prisma from '../config/prisma.js';
import { logAudit } from '../utils/auditLog.js';
import { recomputeInvoiceStatus } from './invoice.service.js';

/**
 * Create a payment, then recalc invoice status.
 */
export async function createPaymentService(tenantId, data) {
  const { userId, invoiceId, amount, method, status = 'PAID', note } = data;

  if (!amount || Number(amount) <= 0) throw new Error('Amount must be positive.');

  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, tenantId } });
  if (!invoice) throw new Error('Invoice not found.');

  const payment = await prisma.payment.create({
    data: { tenantId, invoiceId, amount: Number(amount), method, status, note },
  });

  const { status: invoiceStatus, paid, balance } = await recomputeInvoiceStatus(tenantId, invoiceId);

  await logAudit(userId, tenantId, 'CREATE_PAYMENT', { paymentId: payment.id, invoiceId });

  return { payment, invoiceStatus, paid, balance };
}

export async function updatePaymentService(tenantId, id, data) {
  const payment = await prisma.payment.update({
    where: { id, tenantId },
    data,
  });

  const { status: invoiceStatus, paid, balance } = await recomputeInvoiceStatus(tenantId, payment.invoiceId);

  return { payment, invoiceStatus, paid, balance };
}

export async function deletePaymentService(tenantId, id) {
  const existing = await prisma.payment.findFirst({ where: { id, tenantId } });
  if (!existing) throw new Error('Payment not found or access denied.');

  await prisma.payment.delete({ where: { id } });

  const { status: invoiceStatus, paid, balance } = await recomputeInvoiceStatus(tenantId, existing.invoiceId);

  return { paymentId: id, invoiceStatus, paid, balance };
}

export async function getPaymentsService(tenantId) {
  return prisma.payment.findMany({
    where: { tenantId },
    include: { invoice: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getPaymentByIdService(tenantId, id) {
  return prisma.payment.findFirst({
    where: { id, tenantId },
    include: { invoice: true },
  });
}
