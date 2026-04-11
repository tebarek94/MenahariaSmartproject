import express from "express";
import * as paymentController from "../controllers/chapaPaymentController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { attachRole } from "../middleware/roleMiddleware.js";
import { validateId } from "../middleware/validateId.js";

const router = express.Router();

// Webhook is registered in index.js (before express.json) with raw body for signatures.

router.use(verifyToken, attachRole);

router.post("/chapa/initialize", paymentController.initializeChapaPayment);
router.get("/chapa/verify/:tx_ref", paymentController.verifyChapaPayment);

// Get Chapa configuration (admin only)
router.get("/chapa/config", paymentController.getChapaConfig);

// ================= ORIGINAL PAYMENT ENDPOINTS (BACKWARD COMPATIBILITY) =================

// Create payment (legacy)
router.post("/", paymentController.create);

// Get all payments
router.get("/", paymentController.getAll);

// Get payment by ID
router.get("/:id", validateId, paymentController.getById);

// Update payment (admin only)
router.put("/:id", validateId, paymentController.update);

// Delete payment (admin only)
router.delete("/:id", validateId, paymentController.remove);

export default router;
