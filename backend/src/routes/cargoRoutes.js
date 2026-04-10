import express from "express";
import * as cargoController from "../controllers/cargoController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { attachRole } from "../middleware/roleMiddleware.js";
import { validateId } from "../middleware/validateId.js";

const router = express.Router();

router.use(verifyToken, attachRole);

router.post("/", cargoController.create);
router.post("/bulk-assign-trip", cargoController.bulkAssignTrip);
router.get("/", cargoController.getAll);
router.get("/:id", validateId, cargoController.getById);
router.put("/:id", validateId, cargoController.update);
router.delete("/:id", validateId, cargoController.remove);

export default router;
