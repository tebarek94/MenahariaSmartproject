import { queryAsync } from "../config/db.js";

/** MySQL ER_BAD_FIELD_ERROR — schema before migration 005/009 */
function isReportsExtendedColumnsMissing(err) {
  if (err?.code !== "ER_BAD_FIELD_ERROR") return false;
  const m = String(err?.sqlMessage || "");
  return /\b(source|status|summary)\b/i.test(m);
}

export const createReport = async ({
  type,
  date_range: dateRange,
  file_path: filePath,
  source = "manual",
  status = "active",
  summary = null,
} = {}) => {
  const base = [type ?? null, dateRange ?? null, filePath ?? null];
  const full = [
    ...base,
    source ?? "manual",
    status ?? "active",
    summary ?? null,
  ];
  try {
    return await queryAsync(
      `INSERT INTO reports (type, date_range, file_path, source, status, summary)
       VALUES (?, ?, ?, ?, ?, ?)`,
      full
    );
  } catch (e) {
    if (isReportsExtendedColumnsMissing(e)) {
      return queryAsync(
        `INSERT INTO reports (type, date_range, file_path) VALUES (?, ?, ?)`,
        base
      );
    }
    throw e;
  }
};

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

export const updateReport = async (
  id,
  {
    type,
    date_range: dateRange,
    file_path: filePath,
    source = "manual",
    status = "active",
    summary = null,
  }
) => {
  const base = [type ?? null, dateRange ?? null, filePath ?? null];
  const full = [
    ...base,
    source ?? "manual",
    status ?? "active",
    summary ?? null,
    id,
  ];
  try {
    return await queryAsync(
      `UPDATE reports SET type = ?, date_range = ?, file_path = ?, source = ?, status = ?, summary = ? WHERE id = ?`,
      full
    );
  } catch (e) {
    if (isReportsExtendedColumnsMissing(e)) {
      return queryAsync(
        `UPDATE reports SET type = ?, date_range = ?, file_path = ? WHERE id = ?`,
        [...base, id]
      );
    }
    throw e;
  }
};

export const deleteReport = (id) =>
  queryAsync("DELETE FROM reports WHERE id = ?", [id]);
