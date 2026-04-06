import { sendError } from "../utils/apiResponse.js";

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  const status = err.statusCode || 500;
  return sendError(res, err.message || "Internal server error", status, err);
}
