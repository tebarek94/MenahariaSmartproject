import { queryAsync } from "../config/db.js";

export const createReport = ({
  type,
  date_range: dateRange,
  file_path: filePath,
  source = "manual",
  status = "active",
  summary = null,
} = {}) =>
  queryAsync(
    `INSERT INTO reports (type, date_range, file_path, source, status, summary)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      type ?? null,
      dateRange ?? null,
      filePath ?? null,
      source ?? "manual",
      status ?? "active",
      summary ?? null,
    ]
  );

export const getAllReports = ({ status, source } = {}) => {
  let sql = "SELECT * FROM reports WHERE 1=1";
  const params = [];
  if (status != null && String(status).trim() !== "") {
    sql += " AND LOWER(TRIM(COALESCE(status,''))) = ?";
    params.push(String(status).trim().toLowerCase());
  }
  if (source != null && String(source).trim() !== "") {
    sql += " AND LOWER(TRIM(COALESCE(source,''))) = ?";
    params.push(String(source).trim().toLowerCase());
  }
  sql += " ORDER BY created_at DESC";
  return queryAsync(sql, params);
};

export const getReportById = (id) =>
  queryAsync("SELECT * FROM reports WHERE id = ?", [id]);

export const updateReport = (
  id,
  {
    type,
    date_range: dateRange,
    file_path: filePath,
    source = "manual",
    status = "active",
    summary = null,
  }
) =>
  queryAsync(
    `UPDATE reports SET type = ?, date_range = ?, file_path = ?, source = ?, status = ?, summary = ? WHERE id = ?`,
    [
      type ?? null,
      dateRange ?? null,
      filePath ?? null,
      source ?? "manual",
      status ?? "active",
      summary ?? null,
      id,
    ]
  );

export const deleteReport = (id) =>
  queryAsync("DELETE FROM reports WHERE id = ?", [id]);
