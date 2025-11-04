#!/usr/bin/env bash
set -euo pipefail

ZIP_IN="deji-api.zip"
WORKDIR="./deji-api-work"
OUTZIP="deji-api-complete.zip"

if [ ! -f "$ZIP_IN" ]; then
  echo "Error: $ZIP_IN not found in $(pwd). Place deji-api.zip here and re-run."
  exit 1
fi

echo "Cleaning old workdir..."
rm -rf "$WORKDIR" "$OUTZIP"
mkdir -p "$WORKDIR"

echo "Unzipping $ZIP_IN to $WORKDIR..."
unzip -q "$ZIP_IN" -d "$WORKDIR"

write_file() {
  local path="$1"; shift
  local content="$*"
  local full="$WORKDIR/$path"
  mkdir -p "$(dirname "$full")"
  printf "%s" "$content" > "$full"
  echo "WROTE: $path"
}

echo "Applying patched backend files..."

# backend package.json
write_file "package.json" '{
  "name": "deji-api-backend",
  "version": "1.0.0",
  "description": "Deji API - Backend (patched)",
  "main": "index.js",
  "type": "module",
  "scripts": {
    "dev": "nodemon index.js",
    "start": "node index.js",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev --name init",
    "seed": "node prisma/seed.js"
  },
  "dependencies": {
    "@prisma/client": "^6.13.0",
    "bcrypt": "^6.0.0",
    "cookie-parser": "^1.4.6",
    "cors": "^2.8.5",
    "dotenv": "^17.2.1",
    "express": "^5.1.0",
    "jsonwebtoken": "^9.0.2",
    "nodemailer": "^7.0.5"
  },
  "devDependencies": {
    "nodemon": "^3.1.10",
    "prisma": "^6.13.0"
  }
}'

# prisma/schema.prisma
write_file "prisma/schema.prisma" 'generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Tenant {
  id        String   @id @default(uuid())
  name      String   @unique
  createdAt DateTime @default(now())
  users     User[]
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  name         String?
  password     String
  role         String   @default("user")
  tenantId     String
  tenant       Tenant   @relation(fields: [tenantId], references: [id])
  refreshToken String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}'

# index.js (root)
write_file "index.js" 'import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import routes from "./src/routes/index.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cookieParser());
app.use(express.json());

app.use(cors({
  origin: process.env.VITE_API_URL_ORIGIN || "http://localhost:5173",
  credentials: true
}));

app.use("/api", routes);

app.get("/", (req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));'

# src/config/prisma.js
write_file "src/config/prisma.js" 'import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
export default prisma;'

# token.service.js
write_file "src/services/token.service.js" 'import jwt from "jsonwebtoken";

export const generateAccessToken = (payload) => {
  const expiresIn = process.env.ACCESS_TOKEN_EXPIRES_IN || "15m";
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

export const generateRefreshToken = (payload) => {
  const expiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || "30d";
  return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, { expiresIn });
};'

# auth.controller.js
write_file "src/controllers/auth.controller.js" 'import bcrypt from "bcrypt";
import prisma from "../config/prisma.js";
import { generateAccessToken, generateRefreshToken } from "../services/token.service.js";

const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/",
  maxAge: (Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS || 30) * 24 * 60 * 60 * 1000)
};

export const registerUser = async (req, res) => {
  const { email, password, name, tenantName, role } = req.body;
  if (!email || !password || !tenantName) return res.status(400).json({ error: "email, password and tenantName are required" });

  try {
    let tenant = await prisma.tenant.findUnique({ where: { name: tenantName } });
    if (!tenant) {
      tenant = await prisma.tenant.create({ data: { name: tenantName } });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashed,
        role: role || "admin",
        tenantId: tenant.id
      }
    });

    return res.status(201).json({ message: "User created", user: { id: user.id, email: user.email, tenantId: tenant.id } });
  } catch (err) {
    console.error("registerUser error:", err);
    return res.status(500).json({ error: "Could not register user" });
  }
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "email and password required" });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: "Invalid credentials" });

    const accessToken = generateAccessToken({ userId: user.id, tenantId: user.tenantId, role: user.role });
    const refreshToken = generateRefreshToken({ userId: user.id });

    await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });

    res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTS);

    return res.json({
      accessToken,
      user: { id: user.id, email: user.email, tenantId: user.tenantId, role: user.role }
    });
  } catch (err) {
    console.error("loginUser error:", err);
    return res.status(500).json({ error: "Login failed" });
  }
};

export const logoutUser = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (token) {
      await prisma.user.updateMany({ where: { refreshToken: token }, data: { refreshToken: null } });
    }
    res.clearCookie("refreshToken", { path: "/" });
    return res.json({ message: "Logged out" });
  } catch (err) {
    console.error("logoutUser error:", err);
    return res.status(500).json({ error: "Logout failed" });
  }
};'

# refresh.controller.js
write_file "src/controllers/refresh.controller.js" 'import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";

export const refreshAccessToken = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ error: "No refresh token" });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    } catch (err) {
      return res.status(403).json({ error: "Invalid or expired refresh token" });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user || user.refreshToken !== token) {
      return res.status(403).json({ error: "Refresh token revoked or invalid" });
    }

    const accessToken = jwt.sign({ userId: user.id, tenantId: user.tenantId, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || "15m" });

    return res.json({ accessToken });
  } catch (err) {
    console.error("refreshAccessToken error:", err);
    return res.status(500).json({ error: "Could not refresh token" });
  }
};'

# middleware
write_file "src/middleware/auth.js" 'import jwt from "jsonwebtoken";

export const authenticate = (req, res, next) => {
  const authHeader = req.headers?.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return res.status(401).json({ error: "No token provided" });

  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      if (err.name === "TokenExpiredError") return res.status(401).json({ error: "Token expired" });
      return res.status(401).json({ error: "Invalid token" });
    }
    req.user = decoded;
    next();
  });
};

export const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  if (roles.length && !roles.includes(req.user.role)) return res.status(403).json({ error: "Forbidden" });
  next();
};'

# routes
write_file "src/routes/auth.routes.js" 'import express from "express";
import { registerUser, loginUser, logoutUser } from "../controllers/auth.controller.js";
import { refreshAccessToken } from "../controllers/refresh.controller.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/refresh", refreshAccessToken);
router.post("/logout", logoutUser);

export default router;'

write_file "src/routes/dashboard.routes.js" 'import express from "express";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.get("/dashboard", authenticate, async (req, res) => {
  const { userId, tenantId } = req.user;
  return res.json({
    message: "Dashboard data",
    userId,
    tenantId,
    stats: { contacts: 120, invoices: 18, lowStock: 3 }
  });
});

export default router;'

write_file "src/routes/index.js" 'import express from "express";
import authRoutes from "./auth.routes.js";
import dashboardRoutes from "./dashboard.routes.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/", dashboardRoutes);

export default router;'

# seed
write_file "prisma/seed.js" 'import prismaClient from "@prisma/client";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
dotenv.config();

const { PrismaClient } = prismaClient;
const prisma = new PrismaClient();

async function main() {
  const tenantName = process.env.SEED_TENANT_NAME || "DejiDemo";
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@dejidemo.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Pass1234!";

  let tenant = await prisma.tenant.findUnique({ where: { name: tenantName } });
  if (!tenant) {
    tenant = await prisma.tenant.create({ data: { name: tenantName } });
    console.log("Created tenant", tenant.name);
  }

  let user = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!user) {
    const hashed = await bcrypt.hash(adminPassword, 10);
    user = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashed,
        role: "admin",
        tenantId: tenant.id
      }
    });
    console.log("Created admin user", adminEmail);
  } else {
    console.log("Admin user already exists");
  }

  console.log("Seed complete.");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });'

echo "Applying frontend patches..."

mkdir -p "$WORKDIR/deji-frontend/src/pages"
mkdir -p "$WORKDIR/deji-frontend/src/services"

write_file "deji-frontend/package.json" '{
  "name": "deji-frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "vite": "^5.0.0"
  }
}'

write_file "deji-frontend/index.html" '<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Deji Frontend</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>'

write_file "deji-frontend/src/main.jsx" 'import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")).render(<App />);'

write_file "deji-frontend/src/App.jsx" 'import React, { useState, useEffect } from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import { getAccessToken } from "./services/authService";

export default function App() {
  const [token, setToken] = useState(getAccessToken());

  useEffect(() => {
    setToken(getAccessToken());
  }, []);

  return token ? <Dashboard onLogout={() => setToken(null)} /> : <Login onLogin={(t) => setToken(t)} />;
}'

write_file "deji-frontend/src/services/authService.js" 'export const getAccessToken = () => localStorage.getItem("accessToken");
export const setAccessToken = (token) => {
  if (!token) localStorage.removeItem("accessToken");
  else localStorage.setItem("accessToken", token);
};'

write_file "deji-frontend/src/services/api.js" 'import { getAccessToken, setAccessToken } from "./authService";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export async function fetchWithRefresh(path, opts = {}) {
  const url = `${BASE}${path}`;
  const token = getAccessToken();
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const options = { ...opts, headers, credentials: "include" };

  let res = await fetch(url, options);

  if (res.status === 401) {
    const refreshRes = await fetch(`${BASE.replace("/api", "")}/api/auth/refresh`, {
      method: "POST",
      credentials: "include"
    });

    if (refreshRes.ok) {
      const data = await refreshRes.json();
      const newAccessToken = data.accessToken;
      setAccessToken(newAccessToken);
      options.headers.Authorization = `Bearer ${newAccessToken}`;
      res = await fetch(url, options);
      return res;
    } else {
      setAccessToken(null);
      return res;
    }
  }

  return res;
}'

write_file "deji-frontend/src/pages/Login.jsx" 'import React, { useState } from "react";
import { setAccessToken } from "../services/authService";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || data.message || "Login failed");
        return;
      }
      setAccessToken(data.accessToken);
      if (onLogin) onLogin(data.accessToken);
    } catch (err) {
      console.error(err);
      setErr("Network error");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Login</h2>
      <form onSubmit={submit}>
        <div><input placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div><input placeholder="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <button type="submit">Login</button>
        {err && <p style={{ color: "red" }}>{err}</p>}
      </form>
    </div>
  );
}'

write_file "deji-frontend/src/pages/Dashboard.jsx" 'import React, { useEffect, useState } from "react";
import { fetchWithRefresh } from "../services/api";
import { setAccessToken } from "../services/authService";

export default function Dashboard({ onLogout }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = async () => {
    setError(null);
    try {
      const res = await fetchWithRefresh("/dashboard", { method: "GET" });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setAccessToken(null);
          if (onLogout) onLogout();
          return;
        }
        const err = await res.json();
        setError(err.error || err.message || "Failed to load");
        return;
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
      setError("Network error");
    }
  };

  useEffect(() => { load(); }, []);

  const logout = async () => {
    await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/logout`, {
      method: "POST",
      credentials: "include"
    });
    setAccessToken(null);
    if (onLogout) onLogout();
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Dashboard</h2>
      <button onClick={logout}>Logout</button>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {data ? <pre>{JSON.stringify(data, null, 2)}</pre> : <p>Loading...</p>}
    </div>
  );
}'

echo "Creating final zip $OUTZIP ..."
rm -f "$OUTZIP"
(cd "$WORKDIR" && zip -r "../$OUTZIP" . >/dev/null)
echo "Done. Created $OUTZIP in $(pwd)."

echo "PATCH COMPLETE. The updated project is at: $OUTZIP"
echo "You can now unzip it locally and run the instructions in the README (see next steps)."
