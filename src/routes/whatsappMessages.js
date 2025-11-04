import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { sendWhatsAppMessage } from '../controllers/whatsapp.controller.js';

const router = express.Router();

router.post('/send', authenticate, sendWhatsAppMessage);

export default router;
