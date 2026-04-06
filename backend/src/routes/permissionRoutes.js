import express from "express";
import * as permissionController from "../controllers/permissionController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { attachRole, requireAdmin } from "../middleware/roleMiddleware.js";
import { validateId } from "../middleware/validateId.js";

const router = express.Router();

router.use(verifyToken, attachRole, requireAdmin);

router.post("/", permissionController.create);
router.get("/", permissionController.getAll);
router.get("/:id", validateId, permissionController.getById);
router.put("/:id", validateId, permissionController.update);
router.delete("/:id", validateId, permissionController.remove);

export default router;
