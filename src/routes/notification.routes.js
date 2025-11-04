// src/routes/notification.routes.js
import express from "express";
import {
  getPreferences,
  updatePreferences,
  getNotificationLogs,
} from "../controllers/notification.controller.js";
import { authenticate } from "../middleware/auth.js";
import { tenantContext } from "../middleware/tenantContext.js";

const router = express.Router();

// Apply middleware to all routes
router.use(authenticate, tenantContext);

router.get("/preferences", getPreferences);
router.put("/preferences", updatePreferences);
router.get("/logs", getNotificationLogs);

export default router;
