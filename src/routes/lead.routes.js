import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  createLead,
  getLeads,
  getLeadById,
  updateLead,
  deleteLead,
} from '../controllers/lead.controller.js';

const router = express.Router();

// ✅ protect all routes
router.use(authenticate);

// Create lead
router.post('/', authorize(['admin', 'staff']), createLead);

// Get all leads
router.get('/', authorize(['admin', 'staff']), getLeads);

// Get single lead
router.get('/:id', authorize(['admin', 'staff']), getLeadById);

// Update lead
router.put('/:id', authorize(['admin', 'staff']), updateLead);

// Delete lead
router.delete('/:id', authorize(['admin']), deleteLead);

export default router;
