// src/routes/index.js
import { Router } from "express";

import authRoutes from "./auth.routes.js";
import protectedRoutes from "./protected.routes.js";
import contactRoutes from "./contact.routes.js";
import tagRoutes from "./tag.routes.js";
import productRoutes from "./product.routes.js";
import leadRoutes from "./lead.routes.js";
import invoiceRoutes from "./invoice.routes.js";
import paymentRoutes from "./payment.routes.js";
import whatsappRoutes from "./whatsappMessages.js";
import webhookRoutes from "./whatsappWebhook.routes.js";
import ledgerRoutes from "./ledger.routes.js";
import tenantSettingsRoutes from "./tenantSettings.routes.js";
import dashboardRoutes from "./dashboard.routes.js";
import auditLogRoutes from "./auditLog.routes.js";
import notificationRoutes from "./notification.routes.js";
import localizationRoutes from "./localization.routes.js";
import subscriptionRoutes from "./subscription.routes.js";
import stripeRoutes from "./stripe.routes.js";
import chatbotRoutes from "./chatbot.routes.js";
import chatbotTestRoutes from "./chatbotTest.routes.js";
import healthRoutes from "./health.js";
import uploadRoutes from "./upload.routes.js";

import { authenticate } from "../middleware/auth.js";
import { localeMiddleware } from "../middleware/locale.middleware.js";
import express from "express";

const router = express.Router();

// ✅ Public/unprotected
router.use("/auth", authRoutes);
router.use("/", protectedRoutes);
router.use("/whatsapp", whatsappRoutes);
router.use("/whatsapp", webhookRoutes);
router.use("/stripe", stripeRoutes);
router.use("/health", healthRoutes);
router.use("/uploads", uploadRoutes);

// ✅ Protected / authenticated
router.use("/contacts", authenticate, contactRoutes);
router.use("/tags", authenticate, tagRoutes);
router.use("/products", authenticate, productRoutes);
router.use("/leads", authenticate, leadRoutes);
router.use("/invoices", authenticate, invoiceRoutes);
router.use("/payments", authenticate, paymentRoutes);
router.use("/ledger", authenticate, ledgerRoutes);
router.use("/tenant-settings", authenticate, tenantSettingsRoutes);
router.use("/dashboard", authenticate, dashboardRoutes);
router.use("/audit-logs", authenticate, auditLogRoutes);
router.use("/notifications", authenticate, notificationRoutes);
router.use("/localization", authenticate, localeMiddleware, localizationRoutes);
router.use("/subscription", authenticate, subscriptionRoutes);
router.use("/chatbot", authenticate, chatbotRoutes);
router.use("/chatbot-test", authenticate, chatbotTestRoutes);

export default router;
