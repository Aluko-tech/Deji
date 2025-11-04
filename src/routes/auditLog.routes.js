import express from 'express';
import { getAuditLogs } from '../controllers/auditLog.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);
router.get('/', authorize(['admin']), getAuditLogs);

export default router;
