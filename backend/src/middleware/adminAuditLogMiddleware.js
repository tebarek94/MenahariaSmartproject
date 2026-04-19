import { isAdmin, normalizeRoleName } from "../constants/roles.js";
import * as loginHistoryModel from "../models/loginHistoryModel.js";

function clientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.trim()) {
    return xf.split(",")[0].trim().slice(0, 45);
  }
  const raw = req.socket?.remoteAddress || req.ip || null;
  return raw ? String(raw).slice(0, 45) : null;
}

/**
 * After successful responses, append a row to `login_history` for admin mutations
 * so the admin "Login history" screen shows sign-ins and API actions in one feed.
 * `device_info` uses prefix `AUDIT` (login rows keep the browser User-Agent).
 */
function shouldRecordAdminAudit(req, res) {
  if (res.statusCode < 200 || res.statusCode >= 300) return false;
  const method = String(req.method || "GET").toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return false;

  const path = (req.originalUrl || req.url || "").split("?")[0];
  if (!path.startsWith("/api")) return false;

  if (!req.user?.id) return false;
  if (!isAdmin(normalizeRoleName(req.user.role_name))) return false;

  if (path === "/api/login" || path.startsWith("/api/login/")) return false;
  if (path.startsWith("/api/passenger/register")) return false;
  if (path.startsWith("/api/payments/chapa/webhook")) return false;
  if (path === "/api/payments/chapa/callback") return false;

  return true;
}

/** Human label for audit UI: Create / Update / Delete (maps HTTP verb). */
function auditActivityLabel(method) {
  const m = String(method || "GET").toUpperCase();
  if (m === "POST") return "Create";
  if (m === "PUT" || m === "PATCH") return "Update";
  if (m === "DELETE") return "Delete";
  return "Write";
}

export function adminAuditLoginHistory(req, res, next) {
  res.on("finish", () => {
    try {
      if (!shouldRecordAdminAudit(req, res)) return;
      const path = (req.originalUrl || req.url || "").split("?")[0];
      const method = String(req.method || "GET").toUpperCase();
      const activity = auditActivityLabel(method);
      // Example: AUDIT Create POST /api/users — first token is activity, then HTTP verb, then path
      const line = `AUDIT ${activity} ${method} ${path}`;
      const safe = line.length > 500 ? `${line.slice(0, 497)}...` : line;
      void loginHistoryModel.createLoginHistory(req.user.id, safe, clientIp(req)).catch((err) => {
        console.error("adminAuditLoginHistory:", err);
      });
    } catch (e) {
      console.error("adminAuditLoginHistory:", e);
    }
  });
  next();
}
