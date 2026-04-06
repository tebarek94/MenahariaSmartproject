import express from "express";
import * as notificationController from "../controllers/notificationController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { attachRole } from "../middleware/roleMiddleware.js";
import { validateId } from "../middleware/validateId.js";

const router = express.Router();

router.use(verifyToken, attachRole);

router.post("/", notificationController.create);
router.get("/", notificationController.getAll);
router.get("/:id", validateId, notificationController.getById);
router.put("/:id", validateId, notificationController.update);
router.delete("/:id", validateId, notificationController.remove);

export default router;
