import "dotenv/config";
import express from "express";
import cors from "cors";

import "./src/config/db.js";
import { errorHandler } from "./src/middleware/errorHandler.js";

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
import paymentRoutes from "./src/routes/paymentRoutes.js";
import cargoRoutes from "./src/routes/cargoRoutes.js";
import cargoReceiptRoutes from "./src/routes/cargoReceiptRoutes.js";
import notificationRoutes from "./src/routes/notificationRoutes.js";
import reportRoutes from "./src/routes/reportRoutes.js";
import viewRoutes from "./src/routes/viewRoutes.js";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

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
app.use(`${API}/cargo-receipts`, cargoReceiptRoutes);
app.use(`${API}/notifications`, notificationRoutes);
app.use(`${API}/reports`, reportRoutes);
app.use(`${API}/views`, viewRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
