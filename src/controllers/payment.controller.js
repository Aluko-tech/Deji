import {
  createPaymentService,
  getPaymentsService,
  getPaymentByIdService,
  updatePaymentService,
  deletePaymentService,
} from '../services/payment.service.js';
import { logAudit } from '../utils/auditLog.js';

/**
 * Create Payment
 */
export const createPayment = async (req, res) => {
  try {
    const payment = await createPaymentService(req.user.tenantId, req.body);

    await logAudit(req.user.id, req.user.tenantId, 'CREATE_PAYMENT', {
      paymentId: payment.id,
    });

    res.status(201).json({ message: 'Payment created successfully', data: payment });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Failed to create payment' });
  }
};

/**
 * Get All Payments
 */
export const getPayments = async (req, res) => {
  try {
    const payments = await getPaymentsService(req.user.tenantId, req.query);
    res.json({ total: payments.length, data: payments });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch payments', error: error.message });
  }
};

/**
 * Get Payment by ID
 */
export const getPaymentById = async (req, res) => {
  try {
    const payment = await getPaymentByIdService(req.user.tenantId, req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    res.json({ data: payment });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch payment', error: error.message });
  }
};

/**
 * Update Payment
 */
export const updatePayment = async (req, res) => {
  try {
    const payment = await updatePaymentService(req.user.tenantId, req.params.id, req.body);

    await logAudit(req.user.id, req.user.tenantId, 'UPDATE_PAYMENT', {
      paymentId: payment.id,
    });

    res.json({ message: 'Payment updated successfully', data: payment });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Failed to update payment' });
  }
};

/**
 * Delete Payment
 */
export const deletePayment = async (req, res) => {
  try {
    const payment = await deletePaymentService(req.user.tenantId, req.params.id);

    await logAudit(req.user.id, req.user.tenantId, 'DELETE_PAYMENT', {
      paymentId: payment.id,
    });

    res.json({ message: 'Payment deleted successfully', data: payment });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete payment', error: error.message });
  }
};
