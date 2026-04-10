import * as reportModel from "../models/reportModel.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";

export const create = async (req, res) => {
  try {
    const { type, date_range, file_path, source, status, summary } = req.body;
    const result = await reportModel.createReport({
      type,
      date_range,
      file_path,
      source: source ?? "manual",
      status: status ?? "active",
      summary,
    });
    return sendSuccess(res, { message: "Report created", id: result.insertId }, 201);
  } catch (err) {
    return sendError(res, "Failed to create report", 500, err);
  }
};

export const getAll = async (req, res) => {
  try {
    const { status, source } = req.query;
    const rows = await reportModel.getAllReports({
      status:
        status != null && String(status).trim() !== ""
          ? String(status).trim()
          : undefined,
      source:
        source != null && String(source).trim() !== ""
          ? String(source).trim()
          : undefined,
    });
    return sendSuccess(res, rows);
  } catch (err) {
    return sendError(res, "Failed to list reports", 500, err);
  }
};

export const getById = async (req, res) => {
  try {
    const rows = await reportModel.getReportById(req.params.id);
    if (!rows.length) return sendError(res, "Report not found", 404);
    return sendSuccess(res, rows[0]);
  } catch (err) {
    return sendError(res, "Failed to get report", 500, err);
  }
};

export const update = async (req, res) => {
  try {
    const { type, date_range, file_path, source, status, summary } = req.body;
    await reportModel.updateReport(req.params.id, {
      type,
      date_range,
      file_path,
      source: source ?? "manual",
      status: status ?? "active",
      summary,
    });
    return sendSuccess(res, { message: "Report updated" });
  } catch (err) {
    return sendError(res, "Failed to update report", 500, err);
  }
};

export const remove = async (req, res) => {
  try {
    await reportModel.deleteReport(req.params.id);
    return sendSuccess(res, { message: "Report deleted" });
  } catch (err) {
    return sendError(res, "Failed to delete report", 500, err);
  }
};
