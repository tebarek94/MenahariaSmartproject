import express from "express";
import * as paymentController from "../controllers/paymentController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { attachRole } from "../middleware/roleMiddleware.js";
import { validateId } from "../middleware/validateId.js";

const router = express.Router();

router.use(verifyToken, attachRole);

router.post("/", paymentController.create);
router.get("/", paymentController.getAll);
router.get("/:id", validateId, paymentController.getById);
router.put("/:id", validateId, paymentController.update);
router.delete("/:id", validateId, paymentController.remove);

export default router;
