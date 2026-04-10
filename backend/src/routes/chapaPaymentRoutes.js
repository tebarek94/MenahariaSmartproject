import express from "express";
import * as paymentController from "../controllers/chapaPaymentController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { attachRole } from "../middleware/roleMiddleware.js";
import { validateId } from "../middleware/validateId.js";

const router = express.Router();

// Webhook first — must not use JWT (Chapa server callback)
router.post(
  "/chapa/webhook",
  express.raw({ type: "application/json" }),
  (req, res, next) => {
    try {
      const raw = req.body;
      const str = Buffer.isBuffer(raw)
        ? raw.toString("utf8")
        : typeof raw === "string"
          ? raw
          : JSON.stringify(raw ?? {});
      req.body = JSON.parse(str);
      next();
    } catch (err) {
      return res.status(400).json({ message: "Invalid JSON payload" });
    }
  },
  paymentController.handleChapaWebhook
);

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
