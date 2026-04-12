import express from "express";
import rateLimit from "express-rate-limit";
const router = express.Router();

import authController from "../controllers/authController.js";
import {
  twoFactorRequestEnable,
  twoFactorEnable,
  twoFactorRequestDisable,
  twoFactorDisable,
} from "../controllers/twoFactorController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.LOGIN_RATE_LIMIT_MAX) || 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts, try again later." },
});

const passengerRegisterStartLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.PASSENGER_REGISTER_START_RATE_LIMIT_MAX) || 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many registration attempts, try again later." },
});

const passengerRegisterVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.PASSENGER_REGISTER_VERIFY_RATE_LIMIT_MAX) || 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many verification attempts, try again later." },
});

// ================= AUTH =================
router.post("/register", authController.register);
router.post(
  "/passenger/register/start",
  passengerRegisterStartLimiter,
  authController.registerPassengerStart
);
router.post(
  "/passenger/register/verify",
  passengerRegisterVerifyLimiter,
  authController.registerPassengerVerify
);
router.post("/login", loginLimiter, authController.login);
router.post("/login/2fa", loginLimiter, authController.loginTwoFactor);

// ================= PROFILE =================
router.get("/profile", verifyToken, authController.getProfile);
router.post("/profile/two-factor/request-enable", verifyToken, twoFactorRequestEnable);
router.post("/profile/two-factor/enable", verifyToken, twoFactorEnable);
router.post("/profile/two-factor/request-disable", verifyToken, twoFactorRequestDisable);
router.post("/profile/two-factor/disable", verifyToken, twoFactorDisable);

export default router;
