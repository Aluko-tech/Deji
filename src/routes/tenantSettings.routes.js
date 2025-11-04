import express from "express";
import {
  getTenantSettings,
  updateTenantSettings,
} from "../controllers/tenantSettings.controller.js";
import {
  getPreferences,
  updatePreferences,
} from "../controllers/notification.controller.js";
import { authenticate } from "../middleware/auth.js";
import { auditLog } from "../middleware/auditLog.middleware.js";
import upload from "../middleware/upload.js";

const router = express.Router();

// ✅ protect all routes
router.use(authenticate);

// Get tenant settings
router.get(
  "/",
  auditLog("VIEW_TENANT_SETTINGS", "TenantSettings"),
  getTenantSettings
);

// Update tenant settings (with logo upload)
router.put(
  "/",
  upload.single("logo"),
  auditLog("UPDATE_TENANT_SETTINGS", "TenantSettings"),
  updateTenantSettings
);

// Notification preferences
router.get(
  "/preferences",
  auditLog("VIEW_NOTIFICATION_PREFS", "TenantSettings"),
  getPreferences
);

router.put(
  "/preferences",
  auditLog("UPDATE_NOTIFICATION_PREFS", "TenantSettings"),
  updatePreferences
);

export default router;
