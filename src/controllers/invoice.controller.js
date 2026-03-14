import prisma from '../config/prisma.js';
import {
  createInvoiceWithStock,
  getInvoicesService,
  getInvoiceByIdService,
  updateInvoiceService,
  deleteInvoiceService,
} from '../services/invoice.service.js';
import { logAudit } from '../services/auditLog.service.js';
import { generateInvoicePDF } from '../utils/pdfGenerator.js';

export const createInvoice = async (req, res) => {
  try {
    const invoice = await createInvoiceWithStock(req.tenantId, { ...req.body, userId: req.userId });
    
    await logAudit({
      tenantId: req.tenantId,
      userId: req.userId,
      action: 'CREATE_INVOICE',
      model: 'Invoice',
      modelId: invoice.id,
      details: { invoiceNumber: invoice.invoiceNumber, total: invoice.total },
    });

    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    console.error('❌ Create Invoice Error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

export const getInvoices = async (req, res) => {
  try {
    const invoices = await getInvoicesService(req.tenantId, req.query);
    res.json({ success: true, data: invoices });
  } catch (error) {
    console.error('❌ Get Invoices Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getInvoiceById = async (req, res) => {
  try {
    const invoice = await getInvoiceByIdService(req.tenantId, req.params.id);
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });
    res.json({ success: true, data: invoice });
  } catch (error) {
    console.error('❌ Get Invoice Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateInvoice = async (req, res) => {
  try {
    const invoice = await updateInvoiceService(req.tenantId, req.params.id, req.body);
    
    await logAudit({
      tenantId: req.tenantId,
      userId: req.userId,
      action: 'UPDATE_INVOICE',
      model: 'Invoice',
      modelId: req.params.id,
      details: req.body,
    });

    res.json({ success: true, data: invoice });
  } catch (error) {
    console.error('❌ Update Invoice Error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

export const deleteInvoice = async (req, res) => {
  try {
    const invoice = await deleteInvoiceService(req.tenantId, req.params.id);
    
    await logAudit({
      tenantId: req.tenantId,
      userId: req.userId,
      action: 'DELETE_INVOICE',
      model: 'Invoice',
      modelId: req.params.id,
    });

    res.json({ success: true, data: invoice });
  } catch (error) {
    console.error('❌ Delete Invoice Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const exportInvoicePDF = async (req, res) => {
  try {
    const pdfBuffer = await generateInvoicePDF(req.user.tenantId, req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate PDF', data: null });
  }
};

export const recordPayment = async (req, res) => {
  try {
    const { amount, method, note } = req.body;
    const tenantId = req.tenantId || req.user?.tenantId;
    const invoiceId = req.params.id;

    const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, tenantId }, include: { payments: true } });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const totalPaid = invoice.payments.reduce((s, p) => s + p.amount, 0) + Number(amount);
    const newStatus = totalPaid >= invoice.total ? 'PAID' : totalPaid > 0 ? 'PARTIALLY_PAID' : 'PENDING';

    const payment = await prisma.payment.create({
      data: {
        tenantId,
        invoiceId,
        amount: Number(amount),
        method: method || 'cash',
        status: 'PAID',
        note: note || null,
      },
    });

    await prisma.invoice.update({ where: { id: invoiceId }, data: { status: newStatus } });

    res.status(201).json({ success: true, data: payment, invoiceStatus: newStatus });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getFinanceSummary = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const now = new Date();
    const startOfDay = new Date(now.setHours(0,0,0,0));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [
      totalRevenue, monthRevenue, todayRevenue,
      totalPending, totalOverdue, invoiceCount,
      paidCount, pendingCount, overdueCount,
      recentPayments,
    ] = await Promise.all([
      prisma.payment.aggregate({ where: { tenantId, status: 'PAID' }, _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { tenantId, status: 'PAID', createdAt: { gte: startOfMonth } }, _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { tenantId, status: 'PAID', createdAt: { gte: startOfDay } }, _sum: { amount: true } }),
      prisma.invoice.aggregate({ where: { tenantId, status: { in: ['PENDING', 'PARTIALLY_PAID'] } }, _sum: { total: true } }),
      prisma.invoice.count({ where: { tenantId, status: 'PENDING', dueDate: { lt: new Date() } } }),
      prisma.invoice.count({ where: { tenantId } }),
      prisma.invoice.count({ where: { tenantId, status: 'PAID' } }),
      prisma.invoice.count({ where: { tenantId, status: { in: ['PENDING', 'PARTIALLY_PAID'] } } }),
      prisma.invoice.count({ where: { tenantId, status: 'PENDING', dueDate: { lt: new Date() } } }),
      prisma.payment.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { invoice: { select: { invoiceNumber: true, contact: { select: { name: true } } } } },
      }),
    ]);

    res.json({
      totalRevenue: totalRevenue._sum.amount || 0,
      monthRevenue: monthRevenue._sum.amount || 0,
      todayRevenue: todayRevenue._sum.amount || 0,
      totalOutstanding: totalPending._sum.total || 0,
      overdueCount,
      invoiceCount,
      paidCount,
      pendingCount,
      recentPayments,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
