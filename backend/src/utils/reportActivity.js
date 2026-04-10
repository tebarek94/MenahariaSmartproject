import * as reportModel from "../models/reportModel.js";

/**
 * Fire-and-forget activity row for admin Reports (source=auto).
 * Swallows errors so business flows are not blocked if reports table lags schema.
 */
export async function logAutoReportTask({
  type,
  summary,
  date_range = null,
  file_path = null,
}) {
  try {
    await reportModel.createReport({
      type: type ?? "task",
      date_range,
      file_path,
      source: "auto",
      status: "active",
      summary: summary ?? null,
    });
  } catch (e) {
    console.error("logAutoReportTask:", e?.message || e);
  }
}
