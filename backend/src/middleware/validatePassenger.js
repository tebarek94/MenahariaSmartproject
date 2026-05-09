import {
  isValidEmail,
  isValidEthiopianPhone,
  isValidFullName,
} from "../utils/validators.js";

export const validatePassenger = (req, res, next) => {
  const { phone, email, full_name } = req.body;

  if (!isValidFullName(full_name)) {
    return res.status(400).json({ message: "Invalid full name" });
  }

  if (!isValidEthiopianPhone(phone)) {
    return res.status(400).json({ message: "Invalid Ethiopian phone number" });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  next();
};
