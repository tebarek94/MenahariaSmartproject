import express from "express";
import * as cargoReceiptController from "../controllers/cargoReceiptController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { attachRole, requireAdmin } from "../middleware/roleMiddleware.js";
import { validateId } from "../middleware/validateId.js";

const router = express.Router();

router.use(verifyToken, attachRole);

/** Passenger (and any authenticated user with matching cargo): own receipts + view one by id */
router.get("/my", cargoReceiptController.getMine);
router.get("/:id", validateId, cargoReceiptController.getById);

router.use(requireAdmin);

router.post("/", cargoReceiptController.create);
router.get("/", cargoReceiptController.getAll);
router.put("/:id", validateId, cargoReceiptController.update);
router.delete("/:id", validateId, cargoReceiptController.remove);

export default router;
