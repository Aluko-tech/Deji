// src/routes/chatbot.routes.js
import express from 'express';
import { onWhatsAppIncoming } from '../controllers/chatbot.controller.js';

const router = express.Router();

// Meta webhook verification (GET)
router.get('/whatsapp/webhook', (req, res) => {
  const verify_token = process.env.WHATSAPP_VERIFY_TOKEN;
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === verify_token) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// Incoming message (POST)
router.post('/whatsapp/webhook', onWhatsAppIncoming);

export default router;
