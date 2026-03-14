// env.js MUST be first — ES module imports are hoisted, so dotenv
// must be in its own file imported before anything else reads process.env
import "./env.js";

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import routes from "./src/routes/index.js";
import { startCurrencyRateJob } from "./src/jobs/currencyRates.job.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ✅ CORS
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://dejiapi.online",
  "https://www.dejiapi.online",
  "https://deji-api.onrender.com",
  process.env.CLIENT_URL,
].filter(Boolean);

app.use((req, res, next) => {
  const origin    = req.headers.origin;
  const isAllowed = allowedOrigins.includes(origin) ||
                    (origin && origin.includes(".app.github.dev"));
  if (isAllowed) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// ✅ Core middleware
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// 🌍 Locale detection
app.use((req, res, next) => {
  req.locale = req.headers["accept-language"]?.split(",")[0]?.trim().slice(0, 2) || "en";
  next();
});

// 🩺 Health check — shows which env vars are loaded
app.get("/api/healthz", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Deji API is alive 🚀",
    env: {
      APP_URL:    process.env.APP_URL    ? "✅ set" : "❌ missing",
      EMAIL_USER: process.env.EMAIL_USER ? "✅ set" : "❌ missing",
      JWT_SECRET: process.env.JWT_SECRET ? "✅ set" : "❌ missing",
    },
  });
});

// ✅ Routes
app.use("/api", routes);

// ✅ Background jobs
try {
  if (typeof startCurrencyRateJob === "function") startCurrencyRateJob();
} catch (err) {
  console.error("⚠️ Failed to start currency rate job:", err.message);
}

// ✅ Error handler
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.stack);
  if (err.message === "Not allowed by CORS")
    return res.status(403).json({ message: "CORS policy: origin not allowed." });
  res.status(500).json({ error: "Internal Server Error" });
});

// ✅ Start
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📧 Email: ${process.env.EMAIL_USER || "❌ NOT LOADED"}`);
  console.log(`🌐 App URL: ${process.env.APP_URL  || "❌ NOT LOADED"}`);
});
// ── Crash prevention ─────────────────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err.message, err.stack);
});
process.on('unhandledRejection', (reason) => {
  console.error('💥 Unhandled Rejection:', reason);
});
