import {
  createLeadService,
  getLeadsService,
  getLeadByIdService,
  updateLeadService,
  deleteLeadService,
  getLeadStatsService,
} from '../services/lead.service.js';
import { logAudit } from '../utils/auditLog.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createLead = async (req, res) => {
  try {
    const lead = await createLeadService(req.user.tenantId, req.body, req.user);
    await logAudit({
      userId:   req.user.id,
      tenantId: req.user.tenantId,
      action:   'CREATE_LEAD',
      model:    'Lead',
      modelId:  lead.id,
    });
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
    const prevLead = await getLeadByIdService(req.user.tenantId, req.params.id);
    const lead     = await updateLeadService(req.user.tenantId, req.params.id, req.body);

    // ── Auto-create a delivered order when lead stage → "delivered" ──────────
    // Triggers Finance page to show it in "Ready to Invoice" banner
    const isNowDelivered = req.body.status === 'delivered' && prevLead?.status !== 'delivered';
    // Also handle legacy "won" status from old pipeline/lead detail page
    const isNowWon       = req.body.status === 'won' && prevLead?.status !== 'won';

    if (isNowDelivered || isNowWon) {
      try {
        await prisma.order.create({
          data: {
            tenantId:    req.user.tenantId,
            userId:      req.user.id,
            assignedTo:  req.user.id,
            leadId:      lead.id,
            totalAmount: Number(lead.expectedValue) || 0,
            status:      'delivered',
            notes:       `Auto-created from delivered lead: ${lead.name}`,
            orderItems: {
              create: [{
                productId: null,
                quantity:  1,
                price:     Number(lead.expectedValue) || 0,
              }],
            },
          },
        });
        console.log(`✅ Auto-order created for delivered lead: ${lead.name}`);
      } catch (orderErr) {
        console.error('⚠️ Failed to auto-create order from delivered lead:', orderErr.message);
      }
    }

    await logAudit({
      userId:   req.user.id,
      tenantId: req.user.tenantId,
      action:   'UPDATE_LEAD',
      model:    'Lead',
      modelId:  lead.id,
    });

    res.json({ message: 'Lead updated successfully', data: lead });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Failed to update lead' });
  }
};

export const deleteLead = async (req, res) => {
  try {
    const lead = await deleteLeadService(req.user.tenantId, req.params.id);
    await logAudit({
      userId:   req.user.id,
      tenantId: req.user.tenantId,
      action:   'DELETE_LEAD',
      model:    'Lead',
      modelId:  lead.id,
    });
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