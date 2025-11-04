import axios from 'axios';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { handleIncomingMessage } from './chatbot.service.js';

dotenv.config();

const token = process.env.WHATSAPP_TOKEN;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const whatsappApiUrl = `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Process any incoming WhatsApp message (text/audio/admin command)
 */

export async function processIncomingMessage(user, message) {
  let reply = '';

  try {
    // Admin commands start with #
    if (message.type === 'text' && message.text?.body.startsWith('#')) {
      reply = await handleAdminCommand(user, message.text.body);
    }
    // Text messages
    else if (message.type === 'text') {
      reply = await handleTextMessage(user, message.text.body);
    }
    // Audio messages
    else if (message.type === 'audio') {
      reply = await handleAudioMessage(user, message.audio.id);
    } else {
      reply = 'Unsupported message type.';
    }

    // Send reply
    await sendWhatsAppMessage(user.phone, reply);
  } catch (err) {
    console.error('Error processing incoming message:', err);
  }

  return reply;
}

/**
 * Text message handler
 */
async function handleTextMessage(user, text) {
  // Log or process message in chatbot service
  const reply = await handleIncomingMessage(user, text);
  return reply;
}

/**
 * Audio message handler
 */
async function handleAudioMessage(user, mediaId) {
  // 1️⃣ Get media URL
  const { url } = await getMediaUrl(mediaId);

  // 2️⃣ Download media to temp folder
  const audioPath = await downloadMediaToTmp(url);

  // 3️⃣ Transcribe using OpenAI Whisper
  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream(audioPath),
    model: 'whisper-1',
  });

  const textMessage = transcription.text;

  // 4️⃣ Handle message like text
  const reply = await handleIncomingMessage(user, textMessage);

  // 5️⃣ Clean up
  await fs.unlink(audioPath);

  return reply;
}

/**
 * Admin commands handler
 */
async function handleAdminCommand(user, command) {
  const lowerCmd = command.toLowerCase();

  // Example: #stats
  if (lowerCmd === '#stats') {
    // Example: fetch message stats from DB
    // const count = await prisma.whatsAppMessage.count();
    const count = 123; // placeholder
    return `📊 Total messages logged: ${count}`;
  }

  // Example: #broadcast your message here
  if (lowerCmd.startsWith('#broadcast')) {
    const msg = command.replace('#broadcast', '').trim();
    // Fetch all users from DB & send (pseudo)
    // const users = await prisma.whatsAppUser.findMany({ select: { phone: true } });
    const users = [{ phone: user.phone }]; // placeholder
    for (const u of users) {
      await sendWhatsAppMessage(u.phone, msg);
    }
    return `✅ Broadcast sent to ${users.length} users`;
  }

  return '⚠️ Unknown admin command.';
}

/**
 * General-purpose WhatsApp sender
 */
export async function sendWhatsAppMessage(to, text) {
  try {
    const response = await axios.post(
      whatsappApiUrl,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log('📲 WhatsApp message sent:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('❌ WhatsApp send error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
}

/**
 * Get media URL from WhatsApp API
 */
export async function getMediaUrl(mediaId) {
  const res = await fetch(`https://graph.facebook.com/v20.0/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Failed to fetch media URL: ${t}`);
  }
  const json = await res.json();
  return { url: json.url, mimeType: json.mime_type };
}

/**
 * Download media to tmp folder and return local path
 */
export async function downloadMediaToTmp(url) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Failed to download media: ${t}`);
  }
  const arrayBuf = await res.arrayBuffer();
  const buf = Buffer.from(arrayBuf);
  const filename = `wa-${Date.now()}.bin`;
  const fullpath = path.join(__dirname, '../../tmp', filename);
  await fs.mkdir(path.dirname(fullpath), { recursive: true });
  await fs.writeFile(fullpath, buf);
  return fullpath;
}

/**
 * Low-stock WhatsApp alert
 */
export async function sendLowStockAlert(products = [], recipient = process.env.ALERT_PHONE_NUMBER) {
  if (!products.length) return;

  const formattedProducts = products
    .map(
      (p, i) =>
        `${i + 1}. *${p.name}*\n   Stock: ${p.stock}\n   Threshold: ${p.lowStockThreshold}`
    )
    .join('\n\n');

  const message = `⚠️ *Low Stock Alert*\n\nThe following items are below threshold:\n\n${formattedProducts}\n\nPlease restock promptly.`;

  return await sendWhatsAppMessage(recipient, message);
}
