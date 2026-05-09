import express from "express";
import { validatePassenger } from "../middleware/validatePassenger.js";
import { createPassenger } from "../controllers/passenger.controller.js";

const router = express.Router();

router.post("/passenger/register/start", validatePassenger, createPassenger);

export default router;
