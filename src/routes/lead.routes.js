import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { enforceLimit } from '../middleware/planLimit.middleware.js';
import { createLead, getLeads, getLeadById, updateLead, deleteLead, getLeadStats } from '../controllers/lead.controller.js';

const router = express.Router();
router.use(authenticate);

// Roles that can interact with leads (visibility is filtered server-side per role)
const LEAD_ROLES = ['admin', 'manager', 'staff', 'sales', 'sales_rep', 'marketer', 'accountant'];

router.get('/stats', authorize(LEAD_ROLES), getLeadStats);
router.post('/', authorize(LEAD_ROLES), enforceLimit('leadsMax'), createLead);
router.get('/', authorize(LEAD_ROLES), getLeads);
router.get('/:id', authorize(LEAD_ROLES), getLeadById);
router.put('/:id', authorize(LEAD_ROLES), updateLead);
router.delete('/:id', authorize(['admin', 'manager']), deleteLead);

export default router;
