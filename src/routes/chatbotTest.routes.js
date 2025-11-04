import express from 'express';
import { handleIncomingMessage } from '../services/chatbot.service.js';

const router = express.Router();

// POST /api/chatbot/test  { tenantId, from, text, isAdmin }
router.post('/chatbot/test', async (req, res) => {
  try {
    const reply = await handleIncomingMessage(req.body);
    res.json({ reply });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed' });
  }
});

export default router;
