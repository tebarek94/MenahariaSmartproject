import * as viewModel from "../models/viewModel.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";

export const adminDashboard = async (req, res) => {
  try {
    const data = await viewModel.getAdminDashboardView();
    return sendSuccess(res, data);
  } catch (err) {
    return sendError(res, "Failed to load admin view", 500, err);
  }
};

export const driverDashboard = async (req, res) => {
  try {
    const data = await viewModel.getDriverDashboardView(req.user.id);
    return sendSuccess(res, data);
  } catch (err) {
    return sendError(res, "Failed to load driver view", 500, err);
  }
};

export const passengerDashboard = async (req, res) => {
  try {
    const data = await viewModel.getPassengerDashboardView(req.user.id);
    return sendSuccess(res, data);
  } catch (err) {
    return sendError(res, "Failed to load passenger view", 500, err);
  }
};

export const ticketsRelations = async (req, res) => {
  try {
    const data = await viewModel.getTicketsRelationsView(req.query.limit);
    return sendSuccess(res, data);
  } catch (err) {
    return sendError(res, "Failed to load tickets relations view", 500, err);
  }
};

export const vehiclesRelations = async (req, res) => {
  try {
    const data = await viewModel.getVehiclesRelationsView(req.query.limit);
    return sendSuccess(res, data);
  } catch (err) {
    return sendError(res, "Failed to load vehicles relations view", 500, err);
  }
};

export const cargoRelations = async (req, res) => {
  try {
    const data = await viewModel.getCargoRelationsView(req.query.limit);
    return sendSuccess(res, data);
  } catch (err) {
    return sendError(res, "Failed to load cargo relations view", 500, err);
  }
};

export const seatsRelations = async (req, res) => {
  try {
    const data = await viewModel.getSeatsRelationsView(req.query.limit);
    return sendSuccess(res, data);
  } catch (err) {
    return sendError(res, "Failed to load seats relations view", 500, err);
  }
};

export const relationsOverview = async (req, res) => {
  try {
    const data = await viewModel.getRelationsOverviewView(req.query.limit);
    return sendSuccess(res, data);
  } catch (err) {
    return sendError(res, "Failed to load relations overview", 500, err);
  }
};
