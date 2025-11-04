// src/controllers/auth.controller.js
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { logAudit } from "../services/auditLog.service.js";

const prisma = new PrismaClient();

/**
 * Helper to generate JWT
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user.id,        // ✅ include userId
      tenantId: user.tenantId,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

/**
 * ✅ REGISTER USER + TENANT
 */
export const registerUser = async (req, res) => {
  const { email, password, role, tenantName } = req.body;

  if (!email || !password || !role || !tenantName) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create tenant
    const tenant = await prisma.tenant.create({
      data: { name: tenantName },
    });

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
        tenantId: tenant.id,
      },
    });

    // Generate token right after registration
    const token = generateToken(user);

    // Log audit
    await logAudit({
      tenantId: tenant.id,
      userId: user.id,
      action: "REGISTER_USER",
      model: "User",
      modelId: user.id,
      details: `Registered new user "${email}" with role "${role}" and created tenant "${tenantName}".`,
    });

    return res.status(201).json({
      message: "User and tenant created successfully.",
      token, // ✅ include token so user can be logged in immediately
      user: {
        id: user.id,
        email: user.email,
        tenant: tenant.name,
        tenantId: tenant.id,
        role: user.role,
      },
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Email or tenant already exists." });
    }
    console.error("❌ Registration Error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

/**
 * ✅ LOGIN USER
 */
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { tenant: true },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // ✅ Create JWT with userId
    const token = generateToken(user);

    // Log audit
    await logAudit({
      tenantId: user.tenantId,
      userId: user.id,
      action: "LOGIN",
      model: "User",
      modelId: user.id,
      details: `User "${user.email}" logged in successfully.`,
    });

    return res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        email: user.email,
        tenant: user.tenant?.name,
        tenantId: user.tenantId,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("❌ Login Error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

/**
 * ✅ GET LOGGED-IN USER INFO
 */
export const getMe = async (req, res) => {
  try {
    // req.user is attached from auth middleware
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },  // ✅ correct source of userId
      include: { tenant: true },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenant: user.tenant?.name || null,
        tenantId: user.tenantId,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching user info:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};
