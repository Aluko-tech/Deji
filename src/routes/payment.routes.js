import express from 'express';
import {
  createPayment,
  getPayments,
  getPaymentById,
  updatePayment,
  deletePayment,
} from '../controllers/payment.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// ✅ protect all routes
router.use(authenticate);

router.post('/', authorize(['admin', 'staff']), createPayment);
router.get('/', authorize(['admin', 'staff']), getPayments);
router.get('/:id', authorize(['admin', 'staff']), getPaymentById);
router.put('/:id', authorize(['admin']), updatePayment);
router.delete('/:id', authorize(['admin']), deletePayment);

export default router;
