import express from "express";
import * as seatController from "../controllers/seatController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { attachRole, requireAdminForMutations } from "../middleware/roleMiddleware.js";
import { validateId, validateNumericParam } from "../middleware/validateId.js";

const router = express.Router();

router.use(verifyToken, attachRole);

router.get("/", seatController.getAll);
router.get(
  "/vehicle/:vehicleId",
  validateNumericParam("vehicleId"),
  seatController.getByVehicleId
);
router.get(
  "/vehicle/:vehicleId/available",
  validateNumericParam("vehicleId"),
  seatController.getAvailableByVehicleId
);
router.get(
  "/vehicle/:vehicleId/locked",
  validateNumericParam("vehicleId"),
  seatController.getLockedByVehicleId
);
router.get(
  "/vehicle/:vehicleId/seat-number/:seatNumber/lock-status",
  validateNumericParam("vehicleId"),
  validateNumericParam("seatNumber"),
  seatController.getLockStatus
);
router.get("/:id", validateId, seatController.getById);

router.post("/lock", seatController.lock);
router.post("/unlock", seatController.unlock);

router.post("/", requireAdminForMutations, seatController.create);
router.put("/:id", validateId, requireAdminForMutations, seatController.update);
router.delete("/:id", validateId, requireAdminForMutations, seatController.remove);

export default router;
