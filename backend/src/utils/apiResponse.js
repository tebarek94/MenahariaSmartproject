export function sendSuccess(res, data, status = 200) {
  return res.status(status).json(data);
}

export function sendError(res, message, status = 500, err = null) {
  const body = { message };
  if (err && process.env.NODE_ENV !== "production") {
    body.error = err.message || String(err);
  }
  return res.status(status).json(body);
}
