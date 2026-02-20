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
