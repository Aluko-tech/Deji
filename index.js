// index.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import routes from "./src/routes/index.js";
import { startCurrencyRateJob } from "./src/jobs/currencyRates.job.js";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Explicit allowed origins (frontend + backend + env)
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://dejiapi.online",         // frontend domain
  "https://www.dejiapi.online",     // optional www
  "https://deji-api.onrender.com",  // backend render domain
  process.env.CLIENT_URL,           // fallback from .env
].filter(Boolean);

// ✅ CORS configuration
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

// ✅ Middleware
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// 🌍 Locale middleware
app.use((req, res, next) => {
  req.locale =
    req.headers["accept-language"]?.split(",")[0]?.trim().slice(0, 2) || "en";
  next();
});

// 🩺 Health check
app.get("/api/healthz", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Deji API is alive 🚀",
    origin: req.headers.origin,
    allowedOrigins,
  });
});

// ✅ Routes
app.use("/api", routes);

// ✅ Background job
if (typeof startCurrencyRateJob === "function") {
  startCurrencyRateJob();
}

// ✅ Global error handler
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ message: "CORS policy: origin not allowed." });
  }
  res.status(500).json({ error: "Internal Server Error" });
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log("🌍 Allowed Origins:", allowedOrigins);
});
