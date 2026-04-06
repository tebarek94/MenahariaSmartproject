import express from "express";
import * as reportController from "../controllers/reportController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { attachRole, requireAdmin } from "../middleware/roleMiddleware.js";
import { validateId } from "../middleware/validateId.js";

const router = express.Router();

router.use(verifyToken, attachRole, requireAdmin);

router.post("/", reportController.create);
router.get("/", reportController.getAll);
router.get("/:id", validateId, reportController.getById);
router.put("/:id", validateId, reportController.update);
router.delete("/:id", validateId, reportController.remove);

export default router;
