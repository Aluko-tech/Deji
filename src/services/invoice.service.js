import prisma from '../config/prisma.js';
import { logAudit } from '../utils/auditLog.js';
import { sendLowStockAlert as sendEmailAlert } from './email.service.js';
import { sendLowStockAlert as sendWhatsAppAlert } from './whatsapp.service.js';

// ✅ helpers: generateNextInvoiceNumber, prepareLineItems, applyStockDeductionForInvoice
// (assumed already implemented)

/**
 * Create Invoice (with stock handling + audit + alerts)
 */
export async function createInvoiceWithStock(tenantId, data) {
  const { userId, contactId, lineItems, dueDate } = data;

  // Generate invoice number + prepare line items
  const invoiceNumber = await generateNextInvoiceNumber(tenantId);
  const { preparedItems, subtotal } = await prepareLineItems(tenantId, lineItems);

  // Create invoice
  const invoice = await prisma.invoice.create({
    data: {
      tenantId,
      contactId,
      invoiceNumber,
      status: 'PENDING',
      issueDate: new Date(),
      dueDate: dueDate ? new Date(dueDate) : new Date(),
      subtotal,
      tax: 0,
      discount: 0,
      total: subtotal,
      lineItems: {
        create: preparedItems.map(({ productId, description, quantity, unitPrice, total }) => ({
          productId,
          description,
          quantity,
          unitPrice,
          total,
        })),
      },
    },
    include: { lineItems: true, contact: true },
  });

  // Deduct stock + trigger alerts
  const lowStockProducts = await applyStockDeductionForInvoice(tenantId, preparedItems, {
    userId,
    reason: `Invoice ${invoice.invoiceNumber} created`,
  });

  if (lowStockProducts.length > 0) {
    for (const product of lowStockProducts) {
      const alertMessage = `⚠️ Low stock alert: ${product.name} has only ${product.stock} units left (Tenant: ${tenantId}).`;

      await sendEmailAlert(tenantId, alertMessage);
      await sendWhatsAppAlert(tenantId, alertMessage);

      await logAudit(userId, tenantId, 'LOW_STOCK_ALERT', {
        productId: product.id,
        stock: product.stock,
      });
    }
  }

  await logAudit(userId, tenantId, 'CREATE_INVOICE', { invoiceId: invoice.id });

  return invoice;
}

/**
 * Get invoices (with filters/pagination support later)
 */
export async function getInvoicesService(tenantId, query = {}) {
  return prisma.invoice.findMany({
    where: { tenantId },
    include: { contact: true, lineItems: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getInvoiceByIdService(tenantId, id) {
  return prisma.invoice.findFirst({
    where: { id, tenantId },
    include: { contact: true, lineItems: true, payments: true },
  });
}

export async function updateInvoiceService(tenantId, id, data, userId) {
  const updated = await prisma.invoice.update({
    where: { id_tenantId: { id, tenantId } }, // ✅ composite key
    data,
    include: { lineItems: true, contact: true },
  });

  await logAudit(userId, tenantId, 'UPDATE_INVOICE', { invoiceId: updated.id });
  return updated;
}

export async function deleteInvoiceService(tenantId, id, userId) {
  const deleted = await prisma.invoice.delete({
    where: { id_tenantId: { id, tenantId } },
    include: { lineItems: true, contact: true },
  });

  await logAudit(userId, tenantId, 'DELETE_INVOICE', { invoiceId: deleted.id });
  return deleted;
}

/**
 * ✅ Recompute invoice status based on payments
 */
export async function recomputeInvoiceStatus(invoiceId) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true },
  });

  if (!invoice) return null;

  const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);

  let status = 'UNPAID';
  if (totalPaid >= invoice.total) status = 'PAID';
  else if (totalPaid > 0) status = 'PARTIALLY_PAID';

  const updatedInvoice = await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status },
  });

  return updatedInvoice;
}
