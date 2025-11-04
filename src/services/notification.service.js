// src/services/notification.service.js
import { sendEmail } from './email.service.js';
import { sendWhatsAppMessage } from './whatsapp.service.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getNotificationPreference(tenantId) {
  return prisma.notificationPreference.findUnique({ where: { tenantId } });
}

export async function updateNotificationPreference(tenantId, data) {
  return prisma.notificationPreference.upsert({
    where: { tenantId },
    create: { tenantId, ...data },
    update: { ...data },
  });
}

export async function fetchNotificationPreferences(req, res) {
  const tenantId = req.user?.tenantId;
  try {
    const prefs = await getNotificationPreference(tenantId);
    if (!prefs) {
      return res.status(404).json({ error: 'Notification preferences not found' });
    }
    res.json(prefs);
  } catch (err) {
    console.error('Failed to fetch notification preferences:', err);
    res.status(500).json({ error: 'Failed to fetch notification preferences' });
  }
}

/**
 * Send notification to tenant according to their preferences.
 * Logs notification attempt to NotificationLog.
 * @param {string} tenantId
 * @param {string} type - Notification type (e.g. 'LOW_STOCK_ALERT')
 * @param {string} recipient - Email or phone number
 * @param {string} content - Message content (string)
 */
export async function sendNotification({ tenantId, type, recipient, content }) {
  const prefs = await getNotificationPreference(tenantId);
  if (!prefs) {
    console.warn(`No notification preferences set for tenant ${tenantId}`);
    return { success: false, error: 'No preferences found' };
  }

  const results = [];

  if (prefs.notifyByEmail && recipient.includes('@')) {
    const emailResult = await sendEmail({
      to: recipient,
      subject: `[${type}] Notification`,
      html: content,
    });
    results.push({ channel: 'email', ...emailResult });
    await logNotification({
      tenantId,
      type,
      channel: 'email',
      recipient,
      content,
      success: emailResult.success,
      error: emailResult.error ? String(emailResult.error) : null,
    });
  }

  if (prefs.notifyByWhatsApp && /^\+?[0-9]+$/.test(recipient)) {
    const waResult = await sendWhatsAppMessage(recipient, content);
    results.push({ channel: 'whatsapp', ...waResult });
    await logNotification({
      tenantId,
      type,
      channel: 'whatsapp',
      recipient,
      content,
      success: waResult.success,
      error: waResult.error ? String(waResult.error) : null,
    });
  }

  return results;
}

async function logNotification(data) {
  try {
    await prisma.notificationLog.create({ data });
  } catch (error) {
    console.error('Failed to log notification:', error);
  }
}

export async function saveNotificationPreferences(req, res) {
  const tenantId = req.user?.tenantId;
  const data = req.body;
  try {
    const updated = await updateNotificationPreference(tenantId, data);
    res.json(updated);
  } catch (err) {
    console.error('Failed to update notification preferences:', err);
    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
}

export async function getNotificationLogs(req, res) {
  const tenantId = req.user?.tenantId;
  const {
    skip = 0,
    take = 50,
    type,
    channel,
    recipient,
    success,
    dateFrom,
    dateTo,
  } = req.query;

  const filters = { tenantId };

  if (type) filters.type = type;
  if (channel) filters.channel = channel;
  if (recipient) filters.recipient = recipient;
  if (success !== undefined) filters.success = success === 'true';

  if (dateFrom || dateTo) {
    filters.createdAt = {};
    if (dateFrom) filters.createdAt.gte = new Date(dateFrom);
    if (dateTo) filters.createdAt.lte = new Date(dateTo);
  }

  try {
    const logs = await prisma.notificationLog.findMany({
      where: filters,
      orderBy: { createdAt: 'desc' },
      skip: Number(skip),
      take: Number(take),
    });

    res.json({ data: logs, meta: { skip, take } });
  } catch (err) {
    console.error('Failed to fetch notification logs:', err);
    res.status(500).json({ error: 'Failed to fetch notification logs' });
  }
}
