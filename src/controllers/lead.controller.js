import {
  createLeadService,
  getLeadsService,
  getLeadByIdService,
  updateLeadService,
  deleteLeadService,
} from '../services/lead.service.js';
import { logAudit } from '../utils/auditLog.js';

/**
 * Create Lead
 */
export const createLead = async (req, res) => {
  try {
    const lead = await createLeadService(req.user.tenantId, req.body);

    await logAudit(req.user.id, req.user.tenantId, 'CREATE_LEAD', {
      leadId: lead.id,
    });

    res.status(201).json({ message: 'Lead created successfully', data: lead });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Failed to create lead' });
  }
};

/**
 * Get All Leads
 */
export const getLeads = async (req, res) => {
  try {
    const leads = await getLeadsService(req.user.tenantId, req.query);
    res.json({ total: leads.length, data: leads });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch leads', error: error.message });
  }
};

/**
 * Get Lead by ID
 */
export const getLeadById = async (req, res) => {
  try {
    const lead = await getLeadByIdService(req.user.tenantId, req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    res.json({ data: lead });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch lead', error: error.message });
  }
};

/**
 * Update Lead
 */
export const updateLead = async (req, res) => {
  try {
    const lead = await updateLeadService(req.user.tenantId, req.params.id, req.body);

    await logAudit(req.user.id, req.user.tenantId, 'UPDATE_LEAD', {
      leadId: lead.id,
    });

    res.json({ message: 'Lead updated successfully', data: lead });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Failed to update lead' });
  }
};

/**
 * Delete Lead
 */
export const deleteLead = async (req, res) => {
  try {
    const lead = await deleteLeadService(req.user.tenantId, req.params.id);

    await logAudit(req.user.id, req.user.tenantId, 'DELETE_LEAD', {
      leadId: lead.id,
    });

    res.json({ message: 'Lead deleted successfully', data: lead });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete lead', error: error.message });
  }
};
