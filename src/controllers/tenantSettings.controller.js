// src/controllers/tenantSettings.controller.js
import {
  getTenantSettings as getSettingsService,
  updateTenantSettings as updateSettingsService,
} from "../services/tenantSettings.service.js";
import { logAudit } from "../utils/auditLog.js";
import cloudinary from "../utils/cloudinary.js";
import fs from "fs";

// ✅ GET /tenant-settings
export const getTenantSettings = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const settings = await getSettingsService(tenantId);
    res.json(settings);
  } catch (error) {
    console.error("Error fetching tenant settings:", error);
    res.status(500).json({ error: "Failed to fetch tenant settings" });
  }
};

// ✅ PUT /tenant-settings
export const updateTenantSettings = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const data = req.body;
    let logoUrl = null;

    // 🖼️ Handle logo upload
    if (req.file) {
      if (process.env.UPLOAD_PROVIDER === "cloudinary") {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: "deji-api/logos",
        });
        logoUrl = result.secure_url;
        fs.unlinkSync(req.file.path); // delete temp file
      } else {
        logoUrl = `/uploads/logos/${req.file.filename}`;
      }
    }

    // Combine body + logo
    const payload = { ...data, ...(logoUrl && { logoUrl }) };

    // Update in DB
    const updated = await updateSettingsService(tenantId, payload);

    // Log in audit trail
    await logAudit({
      tenantId,
      userId: req.user.id,
      action: "UPDATE_TENANT_SETTINGS",
      model: "TenantSettings",
      details: JSON.stringify(payload),
    });

    res.json(updated);
  } catch (error) {
    console.error("Error updating tenant settings:", error);
    res.status(500).json({ error: "Failed to update tenant settings" });
  }
};
