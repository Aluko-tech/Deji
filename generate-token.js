// generate-token.js
import jwt from "jsonwebtoken";

// Dummy user payload (replace with actual user data if needed)
const payload = {
  userId: "123e4567-e89b-12d3-a456-426614174000",
  tenantId: "tenant-001",
  role: "admin",
};

// Sign the token
const token = jwt.sign(payload, "youngpastor", {
  expiresIn: "7d", // valid for 7 days
});

console.log("✅ Your JWT token:\n");
console.log(token);
