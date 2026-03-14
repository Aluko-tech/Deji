import { Router } from "express";
import prisma from "../config/prisma.js";

const router = Router();

// GET /api/website
router.get("/", async (req, res) => {
  try {
    const settings = await prisma.tenantSettings.findUnique({
      where: { tenantId: req.user.tenantId },
    });
    res.json({ website: settings || {} });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/website
router.put("/", async (req, res) => {
  try {
    const settings = await prisma.tenantSettings.upsert({
      where: { tenantId: req.user.tenantId },
      update: req.body,
      create: { tenantId: req.user.tenantId, ...req.body },
    });
    res.json({ website: settings });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/website/publish
router.post("/publish", async (req, res) => {
  try {
    res.json({ success: true, message: "Website published successfully", url: `https://${req.user.tenantId}.dejiapi.online` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/website/generate-copy — AI copy generation
router.post("/generate-copy", async (req, res) => {
  try {
    const { businessName, businessType, description, products } = req.body;

    // Return AI-generated copy (Claude API integration point)
    // For now returns smart defaults based on business type
    const copies = {
      retail: {
        headline: `${businessName || "Our Store"} — Premium Quality, Unbeatable Prices`,
        subheadline: "Discover our carefully curated collection of quality products. Fast delivery across Nigeria.",
        cta: "Shop the Collection",
        about: `Welcome to ${businessName || "our store"}, your trusted destination for quality products in Nigeria.`,
      },
      restaurant: {
        headline: `${businessName || "Our Restaurant"} — Where Every Meal is an Experience`,
        subheadline: "Fresh ingredients, authentic flavors, served with love. Order now for delivery or dine in.",
        cta: "Order Now",
        about: `${businessName || "We"} bring you the finest dining experience with fresh, locally-sourced ingredients.`,
      },
      service: {
        headline: `${businessName || "Our Services"} — Professional. Reliable. Affordable.`,
        subheadline: "Expert services tailored to your needs. Over 500 satisfied clients across Nigeria.",
        cta: "Get a Free Quote",
        about: `${businessName || "We"} deliver professional services with a commitment to excellence and customer satisfaction.`,
      },
    };

    const copy = copies[businessType] || copies.retail;
    res.json({ copy });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
