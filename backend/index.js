import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";
import helmet from "helmet";

import "./src/config/db.js";
import { errorHandler } from "./src/middleware/errorHandler.js";
import { apiNotFoundHandler } from "./src/middleware/apiNotFoundHandler.js";

import authRoutes from "./src/routes/authRoutes.js";
import userRoutes from "./src/routes/userRoutes.js";
import roleRoutes from "./src/routes/roleRoutes.js";
import permissionRoutes from "./src/routes/permissionRoutes.js";
import rolePermissionRoutes from "./src/routes/rolePermissionRoutes.js";
import loginHistoryRoutes from "./src/routes/loginHistoryRoutes.js";
import routeRoutes from "./src/routes/routeRoutes.js";
import vehicleRoutes from "./src/routes/vehicleRoutes.js";
import seatRoutes from "./src/routes/seatRoutes.js";
import tripRoutes from "./src/routes/tripRoutes.js";
import ticketRoutes from "./src/routes/ticketRoutes.js";
import paymentRoutes from "./src/routes/chapaPaymentRoutes.js";
import cargoRoutes from "./src/routes/cargoRoutes.js";
import notificationRoutes from "./src/routes/notificationRoutes.js";
import reportRoutes from "./src/routes/reportRoutes.js";
import viewRoutes from "./src/routes/viewRoutes.js";
import supportChatRoutes from "./src/routes/supportChatRoutes.js";
import refundRequestRoutes from "./src/routes/refundRequestRoutes.js";
import { initSocketServer } from "./src/realtime/socketServer.js";
import * as chapaPaymentController from "./src/controllers/chapaPaymentController.js";
import { adminAuditLoginHistory } from "./src/middleware/adminAuditLogMiddleware.js";

const app = express();
const PORT = Number(process.env.PORT) || 5000;

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  : null;

app.use(helmet());
app.use(
  cors({
    origin: corsOrigins?.length ? corsOrigins : true,
    credentials: true,
  })
);

// Chapa webhooks must see the raw body for HMAC verification (do not run express.json first).
app.post(
  "/api/payments/chapa/webhook",
  express.raw({ type: ["application/json", "application/*+json"] }),
  (req, res, next) => {
    try {
      const buf = Buffer.isBuffer(req.body)
        ? req.body
        : Buffer.from(String(req.body ?? ""), "utf8");
      req.chapaRawBody = buf;
      const text = buf.toString("utf8").trim();
      req.body = text ? JSON.parse(text) : {};
      next();
    } catch {
      res.status(400).json({ message: "Invalid JSON payload" });
    }
  },
  chapaPaymentController.handleChapaWebhook
);

// Optional Chapa server callback target (initialize payload). App confirms payment via verify API + return_url.
app.all("/api/payments/chapa/callback", (_req, res) => {
  res.status(200).json({ ok: true, message: "Acknowledged; verify via /api/payments/chapa/verify/:tx_ref" });
});

app.use(express.json({ limit: "1mb" }));

/** After auth runs on each route, successful admin writes are mirrored into `login_history` (see middleware). */
app.use(adminAuditLoginHistory);

app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "Menahariya API",
    api: "/api",
  });
});

const API = "/api";

app.use(API, authRoutes);
app.use(`${API}/users`, userRoutes);
app.use(`${API}/roles`, roleRoutes);
app.use(`${API}/permissions`, permissionRoutes);
app.use(`${API}/role-permissions`, rolePermissionRoutes);
app.use(`${API}/login-history`, loginHistoryRoutes);
app.use(`${API}/routes`, routeRoutes);
app.use(`${API}/vehicles`, vehicleRoutes);
app.use(`${API}/seats`, seatRoutes);
app.use(`${API}/trips`, tripRoutes);
app.use(`${API}/tickets`, ticketRoutes);
app.use(`${API}/payments`, paymentRoutes);
app.use(`${API}/cargo`, cargoRoutes);
app.use(`${API}/notifications`, notificationRoutes);
app.use(`${API}/support-chat`, supportChatRoutes);
app.use(`${API}/refund-requests`, refundRequestRoutes);
app.use(`${API}/reports`, reportRoutes);
app.use(`${API}/views`, viewRoutes);

app.use(apiNotFoundHandler);
app.use(errorHandler);

const httpServer = http.createServer(app);
initSocketServer(httpServer, corsOrigins);

httpServer.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Realtime (Socket.IO) on the same port, path /socket.io`);
});
