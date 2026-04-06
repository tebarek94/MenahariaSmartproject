import * as routeModel from "../models/routeModel.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";

export const create = async (req, res) => {
  try {
    const { origin, destination, distance_km } = req.body;
    if (!origin || !destination) {
      return sendError(res, "origin and destination are required", 400);
    }
    const result = await routeModel.createRoute(
      origin,
      destination,
      distance_km != null ? Number(distance_km) : null
    );
    return sendSuccess(res, { message: "Route created", id: result.insertId }, 201);
  } catch (err) {
    return sendError(res, "Failed to create route", 500, err);
  }
};

export const getAll = async (req, res) => {
  try {
    const rows = await routeModel.getAllRoutes();
    return sendSuccess(res, rows);
  } catch (err) {
    return sendError(res, "Failed to list routes", 500, err);
  }
};

export const getById = async (req, res) => {
  try {
    const rows = await routeModel.getRouteById(req.params.id);
    if (!rows.length) return sendError(res, "Route not found", 404);
    return sendSuccess(res, rows[0]);
  } catch (err) {
    return sendError(res, "Failed to get route", 500, err);
  }
};

export const update = async (req, res) => {
  try {
    const { origin, destination, distance_km } = req.body;
    if (!origin || !destination) {
      return sendError(res, "origin and destination are required", 400);
    }
    await routeModel.updateRoute(
      req.params.id,
      origin,
      destination,
      distance_km != null ? Number(distance_km) : null
    );
    return sendSuccess(res, { message: "Route updated" });
  } catch (err) {
    return sendError(res, "Failed to update route", 500, err);
  }
};

export const remove = async (req, res) => {
  try {
    await routeModel.deleteRoute(req.params.id);
    return sendSuccess(res, { message: "Route deleted" });
  } catch (err) {
    return sendError(res, "Failed to delete route", 500, err);
  }
};
