import express from "express";
import * as tripController from "../controllers/tripController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { attachRole, requireAdmin } from "../middleware/roleMiddleware.js";
import { validateId } from "../middleware/validateId.js";

const router = express.Router();

router.get("/public/browse", tripController.getPublicBrowse);

router.use(verifyToken, attachRole);

router.post("/", requireAdmin, tripController.create);
router.get("/", tripController.getAll);
router.get("/:id", validateId, tripController.getById);
router.put("/:id", validateId, requireAdmin, tripController.update);
router.delete("/:id", validateId, requireAdmin, tripController.remove);

export default router;
