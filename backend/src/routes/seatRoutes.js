import express from "express";
import * as seatController from "../controllers/seatController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { attachRole, requireAdminForMutations } from "../middleware/roleMiddleware.js";
import { validateId, validateNumericParam } from "../middleware/validateId.js";

const router = express.Router();

router.use(verifyToken, attachRole, requireAdminForMutations);

router.post("/", seatController.create);
router.get("/", seatController.getAll);
router.get(
  "/vehicle/:vehicleId",
  validateNumericParam("vehicleId"),
  seatController.getByVehicleId
);
router.get("/:id", validateId, seatController.getById);
router.put("/:id", validateId, seatController.update);
router.delete("/:id", validateId, seatController.remove);

export default router;
