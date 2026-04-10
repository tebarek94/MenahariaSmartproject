import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

/** Same resolution as `authController` so tokens issued at login always verify here. */
function resolveJwtSecret() {
  const secret = String(process.env.JWT_SECRET ?? process.env.SECRET ?? "").trim();
  return secret || null;
}

export const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || typeof authHeader !== "string") {
      return res.status(403).json({ message: "No token provided" });
    }

    const trimmed = authHeader.trim();
    const bearerMatch = /^Bearer\s+(\S+)/i.exec(trimmed);
    const rawToken = bearerMatch ? bearerMatch[1] : trimmed.split(/\s+/).pop();
    if (!rawToken) {
      return res.status(403).json({ message: "No token provided" });
    }

    const secret = resolveJwtSecret();
    if (!secret) {
      console.error("JWT: JWT_SECRET (or SECRET) is not set — cannot verify tokens.");
      return res.status(500).json({
        message: "Server misconfiguration: JWT secret is not set",
      });
    }

    jwt.verify(rawToken, secret, (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      req.user = decoded;
      next();
    });
  } catch (e) {
    console.error("verifyToken:", e);
    return res.status(401).json({ message: "Unauthorized" });
  }
};
