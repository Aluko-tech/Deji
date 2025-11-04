import express from 'express';
import { handleWhatsAppWebhook, verifyWebhook } from '../controllers/whatsappWebhook.controller.js';

const router = express.Router();

router.get('/', verifyWebhook); // For Meta webhook verification
router.post('/', handleWhatsAppWebhook); // For receiving messages and delivery status

export default router;
