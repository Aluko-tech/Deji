// src/middleware/auth.js
import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";

/**
 * ✅ Authenticate Middleware — verifies JWT and attaches user/tenant
 */
export const authenticate = async (req, res, next) => {
  try {
    const token =
      req.headers.authorization?.split(" ")[1] || req.cookies?.token;

    if (!token)
      return res.status(401).json({ message: "No token provided." });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("🧩 Decoded JWT:", decoded);

    // ✅ Ensure correct property names
    const userId = decoded.userId || decoded.id;
    const tenantId = decoded.tenantId;
    const role = decoded.role;

    if (!userId) {
      console.error("❌ No userId found in decoded token:", decoded);
      return res.status(401).json({ message: "Invalid token payload." });
    }

    // ✅ Fetch user properly
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user) {
      console.error("❌ User not found in DB:", userId);
      return res.status(401).json({ message: "User not found or unauthorized." });
    }

    // ✅ Attach context
    req.user = user;
    req.userId = user.id;
    req.role = user.role;
    req.tenantId = user.tenantId;

    next();
  } catch (err) {
    console.error("❌ Auth Middleware Error:", err);
    return res.status(401).json({
      message:
        err.name === "TokenExpiredError"
          ? "Token expired. Please log in again."
          : "Invalid or expired token.",
    });
  }
};

/**
 * ✅ Authorize Middleware — restricts route to specific roles
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden: insufficient permissions." });
    }
    next();
  };
};
