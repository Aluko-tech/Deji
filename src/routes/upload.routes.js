// src/routes/upload.routes.js
import express from "express";
import upload from "../middleware/upload.js";
import { uploadLogo } from "../controllers/upload.controller.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// POST /api/uploads/logo
router.post("/logo", authenticate, upload.single("file"), uploadLogo);

export default router;
