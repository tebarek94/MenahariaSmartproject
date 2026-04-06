import express from "express";
import * as rolePermissionController from "../controllers/rolePermissionController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { attachRole, requireAdmin } from "../middleware/roleMiddleware.js";
import { validateNumericParam } from "../middleware/validateId.js";

const router = express.Router();

router.use(verifyToken, attachRole, requireAdmin);

router.post("/", rolePermissionController.assign);
router.get("/", rolePermissionController.getAll);
router.get(
  "/role/:roleId",
  validateNumericParam("roleId"),
  rolePermissionController.getByRoleId
);
router.delete(
  "/:roleId/:permissionId",
  validateNumericParam("roleId"),
  validateNumericParam("permissionId"),
  rolePermissionController.remove
);

export default router;
