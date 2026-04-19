import dotenv from "dotenv";
import { extractBearerToken, verifyAccessToken } from "../utils/jwtVerify.js";

dotenv.config();

export const verifyToken = (req, res, next) => {
  try {
    const rawToken = extractBearerToken(req.headers.authorization);
    if (!rawToken) {
      return res.status(403).json({ message: "No token provided" });
    }

    const result = verifyAccessToken(rawToken);
    if (!result.ok) {
      if (result.reason === "no_secret") {
        console.error("JWT: JWT_SECRET (or SECRET) is not set — cannot verify tokens.");
        return res.status(500).json({
          message: "Server misconfiguration: JWT secret is not set",
        });
      }
      return res.status(401).json({ message: "Unauthorized" });
    }

    const p = result.payload;
    const idRaw = p?.id ?? p?.sub;
    const n =
      idRaw == null || idRaw === "" ? NaN : Number(idRaw);
    const id = Number.isFinite(n) ? n : null;
    req.user = id != null ? { ...p, id } : p;
    next();
  } catch (e) {
    console.error("verifyToken:", e);
    return res.status(401).json({ message: "Unauthorized" });
  }
};
