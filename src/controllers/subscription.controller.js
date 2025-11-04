// src/controllers/subscription.controller.js
import {
  getSubscription,
  upgradeSubscription,
  cancelSubscription,
  resumeSubscription,
  getUsage,
  PLAN_LIMITS,
} from '../services/subscription.service.js';

export async function getMySubscription(req, res) {
  try {
    const sub = await getSubscription(req.user.tenantId);
    res.json(sub);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
}

export async function getPlanCatalog(req, res) {
  // Static catalog for frontend
  res.json({
    plans: [
      {
        code: 'FREE',
        name: 'Free',
        monthly: 0,
        features: PLAN_LIMITS.FREE,
      },
      {
        code: 'PRO',
        name: 'Pro',
        monthly: 29, // placeholder; integrate payment gateway later
        features: PLAN_LIMITS.PRO,
      },
      {
        code: 'BUSINESS',
        name: 'Business',
        monthly: 99,
        features: PLAN_LIMITS.BUSINESS,
      },
    ],
  });
}

export async function postUpgrade(req, res) {
  try {
    const { plan, metadata } = req.body;
    const updated = await upgradeSubscription({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      plan,
      metadata: metadata || null,
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || 'Failed to upgrade subscription' });
  }
}

export async function postCancel(req, res) {
  try {
    const updated = await cancelSubscription({
      tenantId: req.user.tenantId,
      userId: req.user.id,
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Failed to cancel subscription' });
  }
}

export async function postResume(req, res) {
  try {
    const updated = await resumeSubscription({
      tenantId: req.user.tenantId,
      userId: req.user.id,
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Failed to resume subscription' });
  }
}

export async function getMyUsage(req, res) {
  try {
    const usage = await getUsage(req.user.tenantId);
    res.json(usage);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch usage' });
  }
}
