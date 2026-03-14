import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { enforceLimit } from '../middleware/planLimit.middleware.js';
import { createLead, getLeads, getLeadById, updateLead, deleteLead, getLeadStats } from '../controllers/lead.controller.js';

const router = express.Router();
router.use(authenticate);

router.get('/stats', authorize(['admin', 'staff']), getLeadStats);
router.post('/', authorize(['admin', 'staff']), enforceLimit('leadsMax'), createLead);
router.get('/', authorize(['admin', 'staff']), getLeads);
router.get('/:id', authorize(['admin', 'staff']), getLeadById);
router.put('/:id', authorize(['admin', 'staff']), updateLead);
router.delete('/:id', authorize(['admin']), deleteLead);

export default router;
