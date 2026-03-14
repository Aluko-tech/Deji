import express from 'express';
import {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  exportInvoicePDF,
  recordPayment,
  getFinanceSummary,
} from '../controllers/invoice.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { enforceLimit } from '../middleware/planLimit.middleware.js';

const router = express.Router();

// ✅ protect all routes
router.use(authenticate);

// Create invoice (plan limit + role)
router.post('/', authorize(['admin', 'staff']), enforceLimit('invoicesPerMonth'), createInvoice);

// Get all invoices
router.get('/', authorize(['admin', 'staff']), getInvoices);

// Get invoice by ID
router.get('/:id', authorize(['admin', 'staff']), getInvoiceById);

// Update invoice
router.put('/:id', authorize(['admin']), updateInvoice);

// Delete invoice
router.delete('/:id', authorize(['admin']), deleteInvoice);

// Export invoice PDF
router.get('/:id/pdf', authorize(['admin', 'staff']), exportInvoicePDF);

// Record payment
router.post('/:id/payments', authorize(['admin', 'staff']), recordPayment);

// Get finance summary
router.get('/summary/stats', authorize(['admin', 'staff']), getFinanceSummary);

export default router;
