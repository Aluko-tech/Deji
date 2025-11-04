// src/middleware/auditLog.middleware.js
import { logAudit } from '../services/auditLog.service.js';

export function auditLog(action, model) {
  return async (req, res, next) => {
    const tenantId = req.user?.tenantId || null;
    const userId = req.user?.id || null;
    const modelId = req.params.id || null;

    const details = {
      method: req.method,
      path: req.originalUrl,
      body: req.body,
      query: req.query,
    };

    try {
      await logAudit({
        tenantId,
        userId,
        action,
        model,
        modelId,
        details,
      });
    } catch (err) {
      console.error('Audit log failed:', err);
    }

    next();
  };
}
