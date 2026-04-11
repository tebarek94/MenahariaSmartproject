import express from "express";
import * as supportChatController from "../controllers/supportChatController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { attachRole, requireAdmin, requirePassenger } from "../middleware/roleMiddleware.js";
import { validateNumericParam } from "../middleware/validateId.js";

const router = express.Router();

router.use(verifyToken, attachRole);

router.get("/my-messages", requirePassenger, supportChatController.myMessages);
router.get("/threads", requireAdmin, supportChatController.listThreads);
router.get(
  "/threads/:passengerUserId",
  validateNumericParam("passengerUserId"),
  requireAdmin,
  supportChatController.threadMessages
);

export default router;
