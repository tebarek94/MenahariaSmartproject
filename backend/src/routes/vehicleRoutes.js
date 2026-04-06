import express from "express";
import * as vehicleController from "../controllers/vehicleController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { attachRole, requireAdminForMutations } from "../middleware/roleMiddleware.js";
import { validateId } from "../middleware/validateId.js";

const router = express.Router();

router.use(verifyToken, attachRole, requireAdminForMutations);

router.post("/", vehicleController.create);
router.get("/", vehicleController.getAll);
router.get("/:id", validateId, vehicleController.getById);
router.put("/:id", validateId, vehicleController.update);
router.delete("/:id", validateId, vehicleController.remove);

export default router;
