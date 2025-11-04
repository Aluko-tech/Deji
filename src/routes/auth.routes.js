// src/routes/auth.routes.js
import { Router } from "express";
import { registerUser, loginUser, getMe } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", authenticate, getMe);

export default router;
