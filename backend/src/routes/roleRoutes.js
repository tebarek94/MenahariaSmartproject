import express from "express";
import * as roleController from "../controllers/roleController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { attachRole, requireAdmin } from "../middleware/roleMiddleware.js";
import { validateId } from "../middleware/validateId.js";

const router = express.Router();

router.use(verifyToken, attachRole, requireAdmin);

router.post("/", roleController.create);
router.get("/", roleController.getAll);
router.get("/:id", validateId, roleController.getById);
router.put("/:id", validateId, roleController.update);
router.delete("/:id", validateId, roleController.remove);

export default router;
