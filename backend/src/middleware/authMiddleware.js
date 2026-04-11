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

    req.user = result.payload;
    next();
  } catch (e) {
    console.error("verifyToken:", e);
    return res.status(401).json({ message: "Unauthorized" });
  }
};
