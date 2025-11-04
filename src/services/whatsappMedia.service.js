// src/services/whatsappMedia.service.js
import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const token = process.env.WHATSAPP_TOKEN;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Exchange media ID → direct URL
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

// Download media to tmp folder and return local path
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
