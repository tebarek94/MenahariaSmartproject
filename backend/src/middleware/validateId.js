export function validateId(req, res, next) {
  const id = req.params.id;
  if (id === undefined || id === null || !/^\d+$/.test(String(id))) {
    return res.status(400).json({ message: "Invalid or missing id" });
  }
  next();
}

export function validateNumericParam(paramName) {
  return (req, res, next) => {
    const v = req.params[paramName];
    if (v === undefined || v === null || !/^\d+$/.test(String(v))) {
      return res.status(400).json({ message: `Invalid or missing ${paramName}` });
    }
    next();
  };
}
