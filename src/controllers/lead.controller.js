import {
  createLeadService,
  getLeadsService,
  getLeadByIdService,
  updateLeadService,
  deleteLeadService,
  getLeadStatsService,
} from '../services/lead.service.js';
import { logAudit } from '../utils/auditLog.js';

export const createLead = async (req, res) => {
  try {
    const lead = await createLeadService(req.user.tenantId, req.body, req.user);
    await logAudit(req.user.id, req.user.tenantId, 'CREATE_LEAD', { leadId: lead.id });
    res.status(201).json({ message: 'Lead created successfully', data: lead });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Failed to create lead' });
  }
};

export const getLeads = async (req, res) => {
  try {
    const result = await getLeadsService(req.user.tenantId, req.query, req.user);
    res.json({ total: result.total, data: result.leads, page: result.page, totalPages: result.totalPages });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch leads', error: error.message });
  }
};

export const getLeadById = async (req, res) => {
  try {
    const lead = await getLeadByIdService(req.user.tenantId, req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    res.json({ data: lead });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch lead', error: error.message });
  }
};

export const updateLead = async (req, res) => {
  try {
    const lead = await updateLeadService(req.user.tenantId, req.params.id, req.body);
    await logAudit(req.user.id, req.user.tenantId, 'UPDATE_LEAD', { leadId: lead.id });
    res.json({ message: 'Lead updated successfully', data: lead });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Failed to update lead' });
  }
};

export const deleteLead = async (req, res) => {
  try {
    const lead = await deleteLeadService(req.user.tenantId, req.params.id);
    await logAudit(req.user.id, req.user.tenantId, 'DELETE_LEAD', { leadId: lead.id });
    res.json({ message: 'Lead deleted successfully', data: lead });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete lead', error: error.message });
  }
};

export const getLeadStats = async (req, res) => {
  try {
    const stats = await getLeadStatsService(req.user.tenantId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch lead stats', error: error.message });
  }
};
