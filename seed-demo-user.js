/**
 * Demo User Seeder
 * Creates a test user and tenant for development/demo purposes
 * Usage: node seed-demo-user.js
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function seedDemoUser() {
  try {
    console.log("🌱 Seeding demo user and tenant...");

    // Check if demo tenant already exists
    const existingTenant = await prisma.tenant.findFirst({
      where: { name: "Demo Company" },
    });

    if (existingTenant) {
      console.log("ℹ️  Demo tenant already exists. Skipping...");
      await prisma.$disconnect();
      return;
    }

    // Create demo tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: "Demo Company",
      },
    });

    console.log("✅ Tenant created:", tenant.name);

    // Hash password
    const hashedPassword = await bcrypt.hash("demo123456", 10);

    // Create demo user
    const user = await prisma.user.create({
      data: {
        email: "demo@example.com",
        password: hashedPassword,
        role: "admin",
        tenantId: tenant.id,
      },
    });

    console.log("✅ Demo user created:");
    console.log("   Email: demo@example.com");
    console.log("   Password: demo123456");
    console.log("   Role: admin");
    console.log("   Tenant: Demo Company");

    console.log("\n🎉 Demo setup complete! You can now log in with these credentials.");

    await prisma.$disconnect();
  } catch (error) {
    console.error("❌ Seeding error:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

seedDemoUser();
