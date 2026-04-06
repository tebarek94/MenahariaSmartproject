import express from "express";
import * as loginHistoryController from "../controllers/loginHistoryController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { attachRole, requireAdmin } from "../middleware/roleMiddleware.js";
import { validateId, validateNumericParam } from "../middleware/validateId.js";

const router = express.Router();

router.use(verifyToken, attachRole, requireAdmin);

router.post("/", loginHistoryController.create);
router.get("/", loginHistoryController.getAll);
router.get(
  "/user/:userId",
  validateNumericParam("userId"),
  loginHistoryController.getByUserId
);
router.get("/:id", validateId, loginHistoryController.getById);
router.put("/:id", validateId, loginHistoryController.update);
router.delete("/:id", validateId, loginHistoryController.remove);

export default router;
