// src/services/ai.service.js
import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Simple Chat Completion (system+user messages → assistant reply)
export async function aiChatComplete({ system, user, context = {} }) {
  const body = {
    model: 'gpt-4o-mini', // any modern lightweight GPT is fine
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
      ...(context.messages || []),
    ],
    temperature: 0.2,
  };

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenAI chat error: ${t}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

// Speech-to-text with Whisper
export async function transcribeAudio(localFilePath, mimeType = 'audio/ogg') {
  const form = new FormData();
  form.append('model', 'whisper-1');
  form.append('file', await fs.readFile(localFilePath), {
    filename: path.basename(localFilePath),
    contentType: mimeType,
  });

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      ...form.getHeaders(),
    },
    body: form,
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenAI transcription error: ${t}`);
  }

  const data = await res.json();
  return data.text?.trim() || '';
}
