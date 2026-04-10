import express from "express";
import * as ticketController from "../controllers/ticketController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { attachRole } from "../middleware/roleMiddleware.js";
import { validateId } from "../middleware/validateId.js";

const router = express.Router();

// Token-based flows are public because the token itself is the credential.
router.post("/validate-qr", ticketController.validateQrCode);
router.get("/download/:token", ticketController.downloadTicket);

router.use(verifyToken, attachRole);

router.post("/", ticketController.create);
router.get("/", ticketController.getAll);
router.get("/:id", validateId, ticketController.getById);
router.put("/:id", validateId, ticketController.update);
router.delete("/:id", validateId, ticketController.remove);

// QR Code specific routes
router.post("/:id/regenerate-qr", validateId, ticketController.regenerateQrCode);
router.get("/:id/qr-status", validateId, ticketController.getQrCodeStatus);

// Download ticket routes
router.post("/:id/generate-download", validateId, ticketController.generateDownloadToken);
router.get("/:id/download-status", validateId, ticketController.getDownloadStatus);

export default router;
