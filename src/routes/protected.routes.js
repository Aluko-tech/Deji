// src/routes/protected.routes.js
import express from "express";
import { authenticate } from "../middleware/auth.js";
import { authorizeRoles } from "../middleware/role.js";

const router = express.Router();

// Accessible to only admins
router.get("/admin", authenticate, authorizeRoles("admin"), (req, res) => {
  res.json({
    message: `👑 Welcome Admin ${req.user.userId} from tenant ${req.user.tenantId}`,
  });
});

// Accessible to only staff
router.get("/staff", authenticate, authorizeRoles("staff"), (req, res) => {
  res.json({
    message: `🛠️ Welcome Staff ${req.user.userId}`,
  });
});

// Accessible to both admin and staff
router.get("/shared", authenticate, authorizeRoles("admin", "staff"), (req, res) => {
  res.json({
    message: `✅ Shared access for ${req.user.role}`,
  });
});


export default router;
