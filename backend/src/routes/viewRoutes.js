import express from "express";
import * as viewController from "../controllers/viewController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import {
  attachRole,
  requireAdmin,
  requireDriver,
  requirePassenger,
} from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get(
  "/admin-dashboard",
  verifyToken,
  attachRole,
  requireAdmin,
  viewController.adminDashboard
);
router.get(
  "/passenger-dashboard",
  verifyToken,
  attachRole,
  requirePassenger,
  viewController.passengerDashboard
);
router.get(
  "/driver-dashboard",
  verifyToken,
  attachRole,
  requireDriver,
  viewController.driverDashboard
);

/** Joined relation views (admin): query ?limit=1–200, default 50 */
router.get(
  "/tickets-relations",
  verifyToken,
  attachRole,
  requireAdmin,
  viewController.ticketsRelations
);
router.get(
  "/vehicles-relations",
  verifyToken,
  attachRole,
  requireAdmin,
  viewController.vehiclesRelations
);
router.get(
  "/cargo-relations",
  verifyToken,
  attachRole,
  requireAdmin,
  viewController.cargoRelations
);
router.get(
  "/seats-relations",
  verifyToken,
  attachRole,
  requireAdmin,
  viewController.seatsRelations
);
router.get(
  "/relations-overview",
  verifyToken,
  attachRole,
  requireAdmin,
  viewController.relationsOverview
);

export default router;
