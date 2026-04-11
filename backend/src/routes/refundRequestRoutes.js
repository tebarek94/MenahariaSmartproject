import express from "express";
import * as refundRequestController from "../controllers/refundRequestController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { attachRole } from "../middleware/roleMiddleware.js";
import { validateId } from "../middleware/validateId.js";

const router = express.Router();

router.use(verifyToken, attachRole);

router.post("/", refundRequestController.create);
router.get("/mine", refundRequestController.listMine);
router.get("/", refundRequestController.listAll);
router.patch("/:id", validateId, refundRequestController.updateStatus);

export default router;
