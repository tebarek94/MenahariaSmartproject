import { queryAsync } from "../config/db.js";

export const createReport = (type, dateRange, filePath) =>
  queryAsync(
    "INSERT INTO reports (type, date_range, file_path) VALUES (?, ?, ?)",
    [type ?? null, dateRange ?? null, filePath ?? null]
  );

export const getAllReports = () =>
  queryAsync("SELECT * FROM reports ORDER BY created_at DESC");

export const getReportById = (id) =>
  queryAsync("SELECT * FROM reports WHERE id = ?", [id]);

export const updateReport = (id, type, dateRange, filePath) =>
  queryAsync(
    "UPDATE reports SET type = ?, date_range = ?, file_path = ? WHERE id = ?",
    [type ?? null, dateRange ?? null, filePath ?? null, id]
  );

export const deleteReport = (id) =>
  queryAsync("DELETE FROM reports WHERE id = ?", [id]);
