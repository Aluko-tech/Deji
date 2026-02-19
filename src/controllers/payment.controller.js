import {
  createPaymentService,
  getPaymentsService,
  getPaymentByIdService,
  updatePaymentService,
  deletePaymentService,
} from '../services/payment.service.js';

export const createPayment = async (req, res) => {
  try {
    const payment = await createPaymentService(req.user.tenantId, { ...req.body, userId: req.user.id });
    res.status(201).json({ success: true, message: 'Payment recorded successfully', data: payment });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Failed to create payment', data: null });
  }
};

export const getPayments = async (req, res) => {
  try {
    const payments = await getPaymentsService(req.user.tenantId, req.query);
    res.json({ success: true, message: 'Payments fetched successfully', data: payments });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch payments', data: null });
  }
};

export const getPaymentById = async (req, res) => {
  try {
    const payment = await getPaymentByIdService(req.user.tenantId, req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found', data: null });
    res.json({ success: true, message: 'Payment fetched successfully', data: payment });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch payment', data: null });
  }
};

export const updatePayment = async (req, res) => {
  try {
    const payment = await updatePaymentService(req.user.tenantId, req.params.id, req.body);
    res.json({ success: true, message: 'Payment updated successfully', data: payment });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Failed to update payment', data: null });
  }
};

export const deletePayment = async (req, res) => {
  try {
    const payment = await deletePaymentService(req.user.tenantId, req.params.id);
    res.json({ success: true, message: 'Payment deleted successfully', data: payment });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete payment', data: null });
  }
};
