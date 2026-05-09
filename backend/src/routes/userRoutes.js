import express from "express";
import * as userController from "../controllers/userController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { attachRole } from "../middleware/roleMiddleware.js";
import { validateId, validateNumericParam } from "../middleware/validateId.js";

const router = express.Router();

router.use(verifyToken, attachRole);

router.post("/", userController.create);
router.get("/passengers", userController.listPassengers);
router.get("/driver-assignments", userController.listDriverAssignments);
router.post("/driver-assignments", userController.assignPassengerToDriver);
router.delete(
  "/driver-assignments/:passengerId",
  validateNumericParam("passengerId"),
  userController.unassignPassengerFromDriver
);
router.get("/", userController.getAll);
router.get("/:id", validateId, userController.getById);
router.put("/:id", validateId, userController.update);
router.delete("/:id", validateId, userController.remove);

export default router;
