import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function checkAndCreateUser() {
  try {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: "demo@example.com" },
    });

    if (user) {
      console.log("✅ Demo user already exists:", user.email);
      return;
    }

    console.log("⚠️ Demo user not found, creating...");

    // Check if tenant exists
    let tenant = await prisma.tenant.findFirst({
      where: { name: "Demo Company" },
    });

    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: { name: "Demo Company" },
      });
      console.log("✅ Created tenant:", tenant.name);
    } else {
      console.log("✅ Tenant already exists:", tenant.name);
    }

    // Create user with bcrypt hashed password
    const hashedPassword = await bcrypt.hash("demo123456", 10);
    const newUser = await prisma.user.create({
      data: {
        email: "demo@example.com",
        password: hashedPassword,
        role: "admin",
        tenantId: tenant.id,
      },
    });

    console.log("✅ Created demo user successfully!");
    console.log("   Email: demo@example.com");
    console.log("   Password: demo123456");
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndCreateUser();
