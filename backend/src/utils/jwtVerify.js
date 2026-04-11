import jwt from "jsonwebtoken";

/** Same resolution as `authController` / `authMiddleware`. */
export function resolveJwtSecret() {
  const secret = String(process.env.JWT_SECRET ?? process.env.SECRET ?? "").trim();
  return secret || null;
}

export function extractBearerToken(authHeader) {
  if (!authHeader || typeof authHeader !== "string") return null;
  const trimmed = authHeader.trim();
  const bearerMatch = /^Bearer\s+(\S+)/i.exec(trimmed);
  if (bearerMatch) return bearerMatch[1];
  const parts = trimmed.split(/\s+/);
  return parts.length ? parts[parts.length - 1] : null;
}

/**
 * @returns {{ ok: true, payload: object } | { ok: false, reason: "no_token" | "no_secret" | "invalid" }}
 */
export function verifyAccessToken(rawToken) {
  if (!rawToken || typeof rawToken !== "string") {
    return { ok: false, reason: "no_token" };
  }
  const secret = resolveJwtSecret();
  if (!secret) {
    return { ok: false, reason: "no_secret" };
  }
  try {
    const payload = jwt.verify(rawToken, secret);
    return { ok: true, payload };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}
