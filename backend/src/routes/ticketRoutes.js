import express from "express";
import * as ticketController from "../controllers/ticketController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { attachRole } from "../middleware/roleMiddleware.js";
import { validateId } from "../middleware/validateId.js";

const router = express.Router();

router.use(verifyToken, attachRole);

router.post("/", ticketController.create);
router.get("/", ticketController.getAll);
router.get("/:id", validateId, ticketController.getById);
router.put("/:id", validateId, ticketController.update);
router.delete("/:id", validateId, ticketController.remove);

export default router;
