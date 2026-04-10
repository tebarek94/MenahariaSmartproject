import express from "express";
import rateLimit from "express-rate-limit";
const router = express.Router();

import authController from "../controllers/authController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.LOGIN_RATE_LIMIT_MAX) || 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts, try again later." },
});

// ================= AUTH =================
router.post("/register", authController.register);
router.post("/login", loginLimiter, authController.login);

// ================= PROFILE =================
router.get("/profile", verifyToken, authController.getProfile);

export default router;
