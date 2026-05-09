export function apiNotFoundHandler(req, res, next) {
  const url = req.originalUrl.split("?")[0] || "";
  if (url.startsWith("/socket.io")) {
    return next();
  }
  if (!url.startsWith("/api")) {
    return next();
  }

  return res.status(404).json({
    ok: false,
    message: "The requested API endpoint was not found.",
    code: "NOT_FOUND",
    path: req.originalUrl,
    method: req.method,
  });
}
