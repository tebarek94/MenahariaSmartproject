import * as cargoReceiptModel from "../models/cargoReceiptModel.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { isAdmin, isPassenger } from "../constants/roles.js";

export const create = async (req, res) => {
  try {
    const { cargo_id, amount } = req.body;
    const result = await cargoReceiptModel.createCargoReceipt(
      cargo_id != null ? Number(cargo_id) : null,
      amount != null ? Number(amount) : null
    );
    return sendSuccess(
      res,
      { message: "Cargo receipt created", id: result.insertId },
      201
    );
  } catch (err) {
    return sendError(res, "Failed to create cargo receipt", 500, err);
  }
};

/** Passenger: receipts linked to their cargo only. */
export const getMine = async (req, res) => {
  try {
    if (!isPassenger(req.roleName)) {
      return sendError(res, "Forbidden", 403);
    }
    const rows = await cargoReceiptModel.getCargoReceiptsBriefForOwner(
      req.user.id
    );
    const withSummary = rows.map((row) => ({
      ...row,
      brief_description: buildReceiptBrief(row),
    }));
    return sendSuccess(res, withSummary);
  } catch (err) {
    return sendError(res, "Failed to list your cargo receipts", 500, err);
  }
};

export const getAll = async (req, res) => {
  try {
    const rows = await cargoReceiptModel.getAllCargoReceiptsBrief();
    const withSummary = rows.map((row) => ({
      ...row,
      brief_description: buildReceiptBrief(row),
    }));
    return sendSuccess(res, withSummary);
  } catch (err) {
    return sendError(res, "Failed to list cargo receipts", 500, err);
  }
};

function buildReceiptBrief(row) {
  const parts = [];
  if (row.amount != null) parts.push(`${row.amount} ETB`);
  const rs = (row.route_summary || "").trim();
  if (rs && rs !== "→") parts.push(rs);
  if (row.vehicle_plate) parts.push(row.vehicle_plate);
  if (row.owner_name) parts.push(row.owner_name);
  if (row.tracking_code) parts.push(row.tracking_code);
  return parts.length ? parts.join(" · ") : `Receipt #${row.id}`;
}

export const getById = async (req, res) => {
  try {
    const rows = await cargoReceiptModel.getCargoReceiptBriefById(req.params.id);
    if (!rows.length) return sendError(res, "Receipt not found", 404);
    const row = rows[0];

    if (!isAdmin(req.roleName)) {
      if (!isPassenger(req.roleName)) {
        return sendError(res, "Forbidden", 403);
      }
      const oc = await cargoReceiptModel.getCargoOwnerIdForReceipt(
        req.params.id
      );
      const ownerId = oc[0]?.owner_id;
      if (ownerId == null || Number(ownerId) !== Number(req.user.id)) {
        return sendError(res, "Forbidden", 403);
      }
    }

    return sendSuccess(res, {
      ...row,
      brief_description: buildReceiptBrief(row),
    });
  } catch (err) {
    return sendError(res, "Failed to get cargo receipt", 500, err);
  }
};

export const update = async (req, res) => {
  try {
    const { cargo_id, amount } = req.body;
    await cargoReceiptModel.updateCargoReceipt(
      req.params.id,
      cargo_id != null ? Number(cargo_id) : null,
      amount != null ? Number(amount) : null
    );
    return sendSuccess(res, { message: "Cargo receipt updated" });
  } catch (err) {
    return sendError(res, "Failed to update cargo receipt", 500, err);
  }
};

export const remove = async (req, res) => {
  try {
    await cargoReceiptModel.deleteCargoReceipt(req.params.id);
    return sendSuccess(res, { message: "Cargo receipt deleted" });
  } catch (err) {
    return sendError(res, "Failed to delete cargo receipt", 500, err);
  }
};
