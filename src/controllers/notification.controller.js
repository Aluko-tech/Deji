// src/controllers/notification.controller.js
import { PrismaClient } from '@prisma/client';

import {
  getNotificationPreference,
  updateNotificationPreference,
  sendNotification,
} from '../services/notification.service.js';

const prisma = new PrismaClient();
/**
 * GET /api/notifications/preferences
 */
export async function getPreferences(req, res) {
  try {
    const prefs = await getNotificationPreference(req.user.tenantId);
    res.json(prefs || { notifyByEmail: true, notifyByWhatsApp: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch notification preferences' });
  }
}

/**
 * PUT /api/notifications/preferences
 */
export async function updatePreferences(req, res) {
  try {
    const updated = await updateNotificationPreference(req.user.tenantId, req.body);
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
}

/**
 * GET /api/notifications/logs
 * Optional query params: skip, take, type, channel
 */
export async function getNotificationLogs(req, res) {
  const { tenantId } = req.user;
  const { skip = 0, take = 50, type, channel } = req.query;

  const where = { tenantId };
  if (type) where.type = type;
  if (channel) where.channel = channel;

  try {
    const logs = await prisma.notificationLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: Number(skip),
      take: Number(take),
    });
    res.json(logs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch notification logs' });
  }
}
