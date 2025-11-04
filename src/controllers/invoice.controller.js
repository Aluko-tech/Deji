import {
  createInvoiceWithStock,
  getInvoicesService,
  getInvoiceByIdService,
  updateInvoiceService,
  deleteInvoiceService,
} from '../services/invoice.service.js';
import { logAudit } from '../utils/auditLog.js';
import { generateInvoicePDF } from '../utils/pdfGenerator.js';

/**
 * Create Invoice
 */
export const createInvoice = async (req, res) => {
  try {
    const invoice = await createInvoiceWithStock(req.user.tenantId, req.body);

    await logAudit(req.user.id, req.user.tenantId, 'CREATE_INVOICE', {
      invoiceId: invoice.id,
    });

    res.status(201).json({ message: 'Invoice created successfully', data: invoice });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Failed to create invoice' });
  }
};

/**
 * Get All Invoices (with filters, pagination, sorting)
 */
export const getInvoices = async (req, res) => {
  try {
    const invoices = await getInvoicesService(req.user.tenantId, req.query);
    res.json({ total: invoices.length, data: invoices });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch invoices', error: error.message });
  }
};

/**
 * Get Invoice by ID
 */
export const getInvoiceById = async (req, res) => {
  try {
    const invoice = await getInvoiceByIdService(req.user.tenantId, req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json({ data: invoice });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch invoice', error: error.message });
  }
};

/**
 * Update Invoice
 */
export const updateInvoice = async (req, res) => {
  try {
    const invoice = await updateInvoiceService(req.user.tenantId, req.params.id, req.body);

    await logAudit(req.user.id, req.user.tenantId, 'UPDATE_INVOICE', {
      invoiceId: invoice.id,
    });

    res.json({ message: 'Invoice updated successfully', data: invoice });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Failed to update invoice' });
  }
};

/**
 * Delete Invoice
 */
export const deleteInvoice = async (req, res) => {
  try {
    const invoice = await deleteInvoiceService(req.user.tenantId, req.params.id);

    await logAudit(req.user.id, req.user.tenantId, 'DELETE_INVOICE', {
      invoiceId: invoice.id,
    });

    res.json({ message: 'Invoice deleted successfully', data: invoice });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete invoice', error: error.message });
  }
};

/**
 * Export Invoice as PDF
 */
export const exportInvoicePDF = async (req, res) => {
  try {
    const pdfBuffer = await generateInvoicePDF(req.user.tenantId, req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate PDF', error: error.message });
  }
};
