import express from "express";
const router = express.Router();

import authController from "../controllers/authController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

// ================= AUTH =================
router.post("/register", authController.register);
router.post("/login", authController.login);

// ================= PROFILE =================
router.get("/profile", verifyToken, authController.getProfile);

export default router;
