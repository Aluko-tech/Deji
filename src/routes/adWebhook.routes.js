import { Router } from 'express';
import crypto from 'crypto';
import prisma from '../db.js';
import { createLeadFromWebhook, getOnDutyReps, toggleRepDuty } from '../services/leadAssignment.service.js';

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Find tenant by webhook secret token */
async function getTenantByToken(token) {
  if (!token) return null;
  const settings = await prisma.tenantSettings.findFirst({
    where: { webhookToken: token },
    include: { tenant: true },
  });
  return settings?.tenant || null;
}

/** Find tenant by tenantId param (for platform webhooks that use tenantId in URL) */
async function getTenantById(tenantId) {
  return prisma.tenant.findUnique({ where: { id: tenantId } });
}

// ─── META (Facebook / Instagram) ─────────────────────────────────────────────
// Verification handshake — Meta calls this once when you register the webhook
router.get('/meta/:tenantId', (req, res) => {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
  const expected = process.env.META_WEBHOOK_VERIFY_TOKEN || 'deji_meta_verify';
  if (mode === 'subscribe' && token === expected) {
    console.log('Meta webhook verified for tenant', req.params.tenantId);
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// Incoming Meta lead
router.post('/meta/:tenantId', async (req, res) => {
  res.sendStatus(200); // always ack immediately
  try {
    const tenant = await getTenantById(req.params.tenantId);
    if (!tenant) return;

    const body = req.body;
    // Meta sends: { object: "page", entry: [{ changes: [{ value: { leadgen_id, form_id, field_data } }] }] }
    const entries = body?.entry || [];
    for (const entry of entries) {
      for (const change of (entry.changes || [])) {
        const value = change.value || {};
        if (change.field !== 'leadgen' && !value.leadgen_id) continue;

        // Flatten field_data array [{ name, values }] into object
        const fields = {};
        for (const f of (value.field_data || [])) {
          fields[f.name] = f.values?.[0] || '';
        }

        await createLeadFromWebhook(tenant.id, {
          name:         fields.full_name || fields.name || '',
          email:        fields.email || '',
          phone:        fields.phone_number || fields.phone || '',
          source:       'Facebook',
          channel:      'Facebook Lead Ad',
          campaignName: value.campaign_name || fields.campaign_name || '',
          adSet:        value.ad_name || '',
          formName:     value.form_id || '',
          platform:     'meta',
        });
      }
    }
  } catch (err) {
    console.error('Meta webhook error:', err.message);
  }
});

// ─── TIKTOK ───────────────────────────────────────────────────────────────────
router.post('/tiktok/:tenantId', async (req, res) => {
  res.sendStatus(200);
  try {
    const tenant = await getTenantById(req.params.tenantId);
    if (!tenant) return;

    const body = req.body;
    // TikTok Lead Gen sends field answers in lead_answers array
    const answers = body?.lead_answers || body?.answers || [];
    const fields = {};
    for (const a of answers) {
      fields[a.field_name?.toLowerCase()] = a.answer || '';
    }

    await createLeadFromWebhook(tenant.id, {
      name:         fields.full_name || fields.name || `${fields.first_name || ''} ${fields.last_name || ''}`.trim(),
      email:        fields.email || '',
      phone:        fields.phone_number || fields.phone || '',
      source:       'TikTok',
      channel:      'TikTok Lead Ad',
      campaignName: body.campaign_name || '',
      adSet:        body.ad_group_name || '',
      formName:     body.form_name || '',
      platform:     'tiktok',
    });
  } catch (err) {
    console.error('TikTok webhook error:', err.message);
  }
});

// ─── GOOGLE ───────────────────────────────────────────────────────────────────
router.post('/google/:tenantId', async (req, res) => {
  res.sendStatus(200);
  try {
    const tenant = await getTenantById(req.params.tenantId);
    if (!tenant) return;

    const body = req.body;
    // Google Lead Form webhook sends userColumnData array
    const cols = body?.userColumnData || body?.lead_data || [];
    const fields = {};
    for (const c of (Array.isArray(cols) ? cols : [])) {
      fields[(c.columnId || c.field || '').toLowerCase()] = c.stringValue || c.value || '';
    }

    await createLeadFromWebhook(tenant.id, {
      name:         fields.full_name || fields.name || `${fields.first_name || ''} ${fields.last_name || ''}`.trim(),
      email:        fields.email || '',
      phone:        fields.phone_number || fields.phone || '',
      source:       'Google',
      channel:      'Google Lead Form',
      campaignName: body.campaign_name || body.campaignName || '',
      adSet:        body.ad_group || body.adGroup || '',
      formName:     body.lead_form_name || '',
      platform:     'google',
    });
  } catch (err) {
    console.error('Google webhook error:', err.message);
  }
});

// ─── GENERIC (Typeform, Tally, custom) ───────────────────────────────────────
router.post('/generic/:tenantId', async (req, res) => {
  res.sendStatus(200);
  try {
    const tenant = await getTenantById(req.params.tenantId);
    if (!tenant) return;

    const body = req.body;
    // Accept flat object or Typeform-style { form_response: { answers } }
    let fields = body;
    if (body.form_response?.answers) {
      for (const a of body.form_response.answers) {
        const key = a.field?.ref || a.field?.id || '';
        fields[key] = a.text || a.email || a.phone_number || a.number || '';
      }
    }

    await createLeadFromWebhook(tenant.id, {
      name:         fields.name || fields.full_name || fields.fullName || '',
      email:        fields.email || '',
      phone:        fields.phone || fields.phone_number || fields.phoneNumber || '',
      company:      fields.company || '',
      source:       fields.source || 'Form',
      channel:      fields.channel || 'Generic Webhook',
      campaignName: fields.campaign || fields.campaignName || '',
      platform:     'generic',
    });
  } catch (err) {
    console.error('Generic webhook error:', err.message);
  }
});

// ─── REP DUTY MANAGEMENT (admin only) ────────────────────────────────────────
import { authenticate, authorize } from '../middleware/auth.js';

// Get all reps with their duty status
router.get('/duty/reps', authenticate, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const reps = await prisma.user.findMany({
      where: {
        tenantId: req.user.tenantId,
        isActive: true,
        role: { in: ['sales', 'staff', 'admin', 'manager'] },
      },
      select: {
        id: true, firstName: true, lastName: true,
        email: true, role: true, metadata: true,
      },
      orderBy: { firstName: 'asc' },
    });

    const result = reps.map(r => {
      let meta = {};
      try { meta = typeof r.metadata === 'string' ? JSON.parse(r.metadata || '{}') : (r.metadata || {}); } catch {}
      return { ...r, onDuty: meta.onDuty === true, metadata: undefined };
    });

    res.json({ data: result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Toggle a rep on/off duty
router.patch('/duty/reps/:userId', authenticate, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { onDuty } = req.body;
    await toggleRepDuty(req.user.tenantId, req.params.userId, onDuty);
    res.json({ message: `Rep ${onDuty ? 'set On Duty' : 'set Off Duty'}` });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get queued leads (assigned to nobody)
router.get('/queued', authenticate, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const leads = await prisma.lead.findMany({
      where: {
        tenantId: req.user.tenantId,
        assignedTo: null,
        notes: { contains: '⏳ Queued' },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ data: leads, count: leads.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Manually assign a queued lead
router.patch('/queued/:leadId/assign', authenticate, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { assignedTo } = req.body;
    const lead = await prisma.lead.update({
      where: { id: req.params.leadId, tenantId: req.user.tenantId },
      data: { assignedTo, notes: null, status: 'new' },
    });
    res.json({ message: 'Lead assigned', data: lead });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

export default router;