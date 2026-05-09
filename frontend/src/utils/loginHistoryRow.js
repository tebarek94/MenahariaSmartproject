/** Backend stores admin audit lines in `device_info` with prefix AUDIT. */
export function isAuditDeviceInfo(deviceInfo) {
  const s = String(deviceInfo ?? "").trimStart();
  return s.length >= 5 && s.slice(0, 5).toUpperCase() === "AUDIT";
}

export function isAuditLoginHistoryRow(row) {
  return isAuditDeviceInfo(row?.device_info);
}

const HTTP_VERBS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);

/**
 * Parse `device_info` for admin rows. New format: `AUDIT Create POST /api/users`.
 * Legacy: `AUDIT POST /api/users` (no activity word).
 * @returns {{ activity: string, method: string, path: string, raw: string } | null}
 */
export function parseAuditLine(deviceInfo) {
  const raw = String(deviceInfo ?? "").trimStart();
  if (!isAuditDeviceInfo(raw)) return null;
  const rest = raw.slice(5).trim();
  const tokens = rest.split(/\s+/).filter(Boolean);
  if (tokens.length < 2) {
    return { activity: "—", method: "—", path: rest, raw };
  }

  const t0 = tokens[0];
  const t1 = tokens[1];

  if (
    ["Create", "Update", "Delete", "Write"].includes(t0) &&
    HTTP_VERBS.has(String(t1 || "").toUpperCase())
  ) {
    const method = String(t1).toUpperCase();
    const path = tokens.slice(2).join(" ") || "";
    return { activity: t0, method, path, raw };
  }

  if (HTTP_VERBS.has(String(t0 || "").toUpperCase())) {
    const method = String(t0).toUpperCase();
    const path = tokens.slice(1).join(" ") || "";
    let activity = "Write";
    if (method === "POST") activity = "Create";
    else if (method === "PUT" || method === "PATCH") activity = "Update";
    else if (method === "DELETE") activity = "Delete";
    return { activity, method, path, raw };
  }

  return { activity: "—", method: "—", path: rest, raw };
}

export function normalizeLoginHistoryRow(row) {
  if (!row || typeof row !== "object") return row;
  const o = { ...row };
  if (o.id != null && o.id !== "") o.id = Number(o.id);
  if (o.user_id != null && o.user_id !== "") o.user_id = Number(o.user_id);
  if (o.device_info != null) o.device_info = String(o.device_info);
  if (o.ip_address != null) o.ip_address = String(o.ip_address);
  return o;
}
