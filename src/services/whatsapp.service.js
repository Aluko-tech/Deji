import axios from 'axios';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import fetch from 'node-fetch';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { handleIncomingMessage } from './chatbot.service.js';

dotenv.config();

const token = process.env.WHATSAPP_TOKEN;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const whatsappApiUrl = `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

let openaiClient = null;

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

/**
 * Process any incoming WhatsApp message (text/audio/admin command)
 */
export async function processIncomingMessage(user, message) {
  let reply = '';

  try {
    if (message.type === 'text' && message.text?.body.startsWith('#')) {
      reply = await handleAdminCommand(user, message.text.body);
    } else if (message.type === 'text') {
      reply = await handleTextMessage(user, message.text.body);
    } else if (message.type === 'audio') {
      reply = await handleAudioMessage(user, message.audio.id);
    } else {
      reply = 'Unsupported message type.';
    }

    await sendWhatsAppMessage(user.phone, reply);
  } catch (err) {
    console.error('Error processing incoming message:', err);
  }

  return reply;
}

async function handleTextMessage(user, text) {
  const reply = await handleIncomingMessage(user, text);
  return reply;
}

async function handleAudioMessage(user, mediaId) {
  const openai = getOpenAIClient();
  if (!openai) {
    return 'Audio processing is currently unavailable.';
  }

  const { url } = await getMediaUrl(mediaId);
  const audioPath = await downloadMediaToTmp(url);

  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fsSync.createReadStream(audioPath),
      model: 'whisper-1',
    });

    const textMessage = transcription.text;
    const reply = await handleIncomingMessage(user, textMessage);
    return reply;
  } finally {
    await fs.unlink(audioPath).catch(() => undefined);
  }
}

async function handleAdminCommand(user, command) {
  const lowerCmd = command.toLowerCase();

  if (lowerCmd === '#stats') {
    const count = 123;
    return `📊 Total messages logged: ${count}`;
  }

  if (lowerCmd.startsWith('#broadcast')) {
    const msg = command.replace('#broadcast', '').trim();
    const users = [{ phone: user.phone }];
    for (const u of users) {
      await sendWhatsAppMessage(u.phone, msg);
    }
    return `✅ Broadcast sent to ${users.length} users`;
  }

  return '⚠️ Unknown admin command.';
}

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
