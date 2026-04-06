import { getRoleById } from "../models/roleModel.js";
import { isAdmin, isDriver, isPassenger, normalizeRoleName } from "../constants/roles.js";

export async function attachRole(req, res, next) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (req.user.role_name) {
      req.roleName = normalizeRoleName(req.user.role_name);
      return next();
    }
    if (req.user.role_id == null) {
      return res.status(403).json({ message: "Missing role" });
    }
    const rows = await getRoleById(req.user.role_id);
    if (!rows.length) {
      return res.status(403).json({ message: "Invalid role" });
    }
    req.roleName = normalizeRoleName(rows[0].name);
    next();
  } catch (err) {
    next(err);
  }
}

export function requireAdmin(req, res, next) {
  if (!isAdmin(req.roleName)) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

export function requireDriver(req, res, next) {
  if (!isDriver(req.roleName)) {
    return res.status(403).json({ message: "Driver access required" });
  }
  next();
}

export function requirePassenger(req, res, next) {
  if (!isPassenger(req.roleName)) {
    return res.status(403).json({ message: "Passenger / user access required" });
  }
  next();
}

/** Allow GET for any authenticated role with attachRole; writes need admin. */
export function requireAdminForMutations(req, res, next) {
  const m = req.method.toUpperCase();
  if (m === "GET" || m === "HEAD" || m === "OPTIONS") return next();
  return requireAdmin(req, res, next);
}
