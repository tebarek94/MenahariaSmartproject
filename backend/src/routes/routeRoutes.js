import express from "express";
import * as routeController from "../controllers/routeController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { attachRole, requireAdminForMutations } from "../middleware/roleMiddleware.js";
import { validateId } from "../middleware/validateId.js";

const router = express.Router();

router.use(verifyToken, attachRole, requireAdminForMutations);

router.post("/", routeController.create);
router.get("/", routeController.getAll);
router.get("/:id", validateId, routeController.getById);
router.put("/:id", validateId, routeController.update);
router.delete("/:id", validateId, routeController.remove);

export default router;
