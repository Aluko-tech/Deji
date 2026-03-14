import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { enforceLimit } from '../middleware/planLimit.middleware.js';
import { sendWhatsAppMessage } from '../controllers/whatsapp.controller.js';

const router = express.Router();

router.post('/send', authenticate, enforceLimit('whatsappEnabled'), sendWhatsAppMessage);

export default router;
