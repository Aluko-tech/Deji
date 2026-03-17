// src/routes/upload.routes.js
import express from "express";
import upload from "../middleware/upload.js";
import { uploadLogo, uploadImage } from "../controllers/upload.controller.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// POST /api/uploads/logo
router.post("/logo",  authenticate, upload.single("file"), uploadLogo);
// POST /api/uploads/image  (product images, variant images, etc.)
router.post("/image", authenticate, upload.single("file"), uploadImage);

export default router;
