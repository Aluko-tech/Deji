// src/controllers/chatbot.controller.js
import { handleIncomingMessage } from '../services/chatbot.service.js';
import { sendWhatsAppMessage } from '../services/whatsapp.service.js';
import { getMediaUrl, downloadMediaToTmp } from '../services/whatsappMedia.service.js';
import { transcribeAudio } from '../services/ai.service.js';
import prisma from '../config/prisma.js';

/**
 * Handle incoming WhatsApp messages (text and voice).
 * Assumes your webhook already extracts messages into a normalized payload.
 */
export async function onWhatsAppIncoming(req, res) {
  try {
    // Meta webhook raw payload:
    const entry = req.body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const msg = value?.messages?.[0];
    const from = msg?.from; // phone number
    const tenantId = value?.metadata?.display_phone_number_id ? await resolveTenantFromPhoneNumberId(value.metadata.display_phone_number_id) : null;

    if (!msg || !from || !tenantId) {
      return res.sendStatus(200);
    }

    // Is sender an admin from this tenant?
    const user = await prisma.user.findFirst({
      where: { tenantId, phone: from },
      select: { id: true, role: true },
    });
    const isAdmin = !!user && (user.role === 'admin' || user.role === 'staff');

    // TEXT
    if (msg.type === 'text') {
      const text = msg.text?.body || '';
      const reply = await handleIncomingMessage({ tenantId, from, text, isAdmin });
      await sendWhatsAppMessage(from, reply);
      return res.sendStatus(200);
    }

    // VOICE NOTE
    if (msg.type === 'audio') {
      const mediaId = msg.audio?.id;
      if (!mediaId) return res.sendStatus(200);

      const { url, mimeType } = await getMediaUrl(mediaId);
      const tmpPath = await downloadMediaToTmp(url);

      let transcript = '';
      try {
        transcript = await transcribeAudio(tmpPath, mimeType || 'audio/ogg');
      } catch (e) {
        await sendWhatsAppMessage(from, '⚠️ Could not transcribe your voice note.');
        return res.sendStatus(200);
      }

      const reply = await handleIncomingMessage({ tenantId, from, text: transcript, isAdmin });
      await sendWhatsAppMessage(from, reply);
      return res.sendStatus(200);
    }

    // Unsupported types
    await sendWhatsAppMessage(from, '🤖 I can handle text and voice notes for now.');
    res.sendStatus(200);
  } catch (err) {
    console.error('Chatbot webhook error:', err);
    // Always 200 to prevent Meta retries with exponential backoff
    return res.sendStatus(200);
  }
}

// Example resolver: map WA phone number id → tenant
async function resolveTenantFromPhoneNumberId(phoneNumberId) {
  // If you store this mapping, resolve it here.
  // For now, try: first tenant or a lookup table tenantPhoneMap
  const t = await prisma.tenant.findFirst({});
  return t?.id || null;
}
