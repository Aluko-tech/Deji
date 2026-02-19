import {
  createInvoiceWithStock,
  getInvoicesService,
  getInvoiceByIdService,
  updateInvoiceService,
  deleteInvoiceService,
} from '../services/invoice.service.js';
import { generateInvoicePDF } from '../utils/pdfGenerator.js';

export const createInvoice = async (req, res) => {
  try {
    const invoice = await createInvoiceWithStock(req.user.tenantId, { ...req.body, userId: req.user.id });
    res.status(201).json({ success: true, message: 'Invoice created successfully', data: invoice });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Failed to create invoice', data: null });
  }
};

export const getInvoices = async (req, res) => {
  try {
    const invoices = await getInvoicesService(req.user.tenantId, req.query);
    res.json({ success: true, message: 'Invoices fetched successfully', data: invoices });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch invoices', data: null });
  }
};

export const getInvoiceById = async (req, res) => {
  try {
    const invoice = await getInvoiceByIdService(req.user.tenantId, req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found', data: null });
    res.json({ success: true, message: 'Invoice fetched successfully', data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch invoice', data: null });
  }
};

export const updateInvoice = async (req, res) => {
  try {
    const invoice = await updateInvoiceService(req.user.tenantId, req.params.id, req.body);
    res.json({ success: true, message: 'Invoice updated successfully', data: invoice });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Failed to update invoice', data: null });
  }
};

export const deleteInvoice = async (req, res) => {
  try {
    const invoice = await deleteInvoiceService(req.user.tenantId, req.params.id);
    res.json({ success: true, message: 'Invoice cancelled successfully', data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete invoice', data: null });
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
