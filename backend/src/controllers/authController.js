import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import userModel from "../models/userModel.js";
import { getRoleById } from "../models/roleModel.js";
import { queryAsync } from "../config/db.js";
import { normalizeRoleName } from "../constants/roles.js";
import dotenv from "dotenv";

dotenv.config();

const SECRET = process.env.JWT_SECRET || process.env.SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1d";

function resolveJwtSecret() {
  const secret = String(SECRET ?? "").trim();
  return secret || null;
}

function stripUser(user) {
  if (!user) return user;
  const { password_hash, ...safe } = user;
  return safe;
}

// ================= REGISTER =================
export const register = async (req, res) => {
  const { full_name, phone, email, password, role_id } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const data = [full_name, phone, email, hashedPassword, role_id];

    userModel.createUser(data, (err, result) => {
      if (err) return res.status(500).json(err);

      res.json({ message: "User registered successfully" });
    });
  } catch (err) {
    res.status(500).json(err);
  }
};

// ================= LOGIN =================
export const login = async (req, res) => {
  try {
    const { phone, password } = req.body;
    const results = await queryAsync("SELECT * FROM users WHERE phone = ?", [
      phone,
    ]);

    if (results.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = results[0];
    const passwordHash = user.password_hash ?? user.password ?? null;
    if (!passwordHash) {
      return res.status(500).json({ message: "Login failed: account password hash is missing" });
    }
    const isMatch = await bcrypt.compare(password, passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const roleRows = await getRoleById(user.role_id);
    const role_name = normalizeRoleName(
      roleRows[0]?.name ?? roleRows[0]?.role_name ?? "user"
    );

    const jwtSecret = resolveJwtSecret();
    if (!jwtSecret) {
      return res.status(500).json({ message: "Login failed: JWT secret is not configured" });
    }

    const token = jwt.sign(
      { id: user.id, role_id: user.role_id, role_name },
      jwtSecret,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      message: "Login successful",
      token,
      role_name,
      user: stripUser(user),
    });
  } catch (err) {
    res.status(500).json({ message: "Login failed", error: String(err) });
  }
};

// ================= GET PROFILE =================
export const getProfile = (req, res) => {
  userModel.findById(req.user.id, (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(stripUser(results[0]));
  });
};

const authController = {
  register,
  login,
  getProfile,
};

export default authController;
