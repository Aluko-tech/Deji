import express from "express";
import prisma from "../config/prisma.js"; // adjust if in src/prisma/client.js
import axios from "axios";
import nodemailer from "nodemailer";

const router = express.Router();

// Health check endpoint
router.get("/health", async (req, res) => {
  const checks = {};

  try {
    // API check
    checks.api = "ok";

    // DB check
    await prisma.$queryRaw`SELECT 1`; // lightweight ping
    checks.database = "ok";

    // Tenant context check (verify at least 1 tenant exists)
    const tenant = await prisma.tenant.findFirst();
    checks.tenant = tenant ? "ok" : "none_found";

    // WhatsApp API check (optional: only if configured)
    if (process.env.WHATSAPP_API_URL && process.env.WHATSAPP_ACCESS_TOKEN) {
      try {
        await axios.get(`${process.env.WHATSAPP_API_URL}/v1/status`, {
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          },
        });
        checks.whatsapp = "ok";
      } catch (err) {
        checks.whatsapp = "error";
      }
    }

    // Email check (optional: only if SMTP configured)
    if (process.env.SMTP_HOST) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          secure: false,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });
        await transporter.verify();
        checks.email = "ok";
      } catch (err) {
        checks.email = "error";
      }
    }

    return res.status(200).json({
      status: "ok",
      checks,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      error: error.message,
      checks,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
