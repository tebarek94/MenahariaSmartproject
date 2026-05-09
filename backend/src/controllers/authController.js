import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import userModel, { createUserAsync } from "../models/userModel.js";
import { getRoleById } from "../models/roleModel.js";
import * as loginHistoryModel from "../models/loginHistoryModel.js";
import { queryAsync } from "../config/db.js";
import { isPassenger, normalizeRoleName } from "../constants/roles.js";
import {
  sendPassengerOtpEmail,
  sendTwoFactorLoginNoticeEmail,
  sendTwoFactorOtpEmail,
} from "../utils/emailOtp.js";
import {
  TWO_FA_OTP_PURPOSE,
  accountEmailFor2fa,
  clearEmailOtp,
  generateSixDigitOtp,
  saveEmailOtp,
  verifyAndConsumeEmailOtp,
} from "../utils/userTwoFactorEmailOtp.js";
import { logAutoReportTask } from "../utils/reportActivity.js";
import {
  ethiopianPhoneVariants,
  isValidEthiopianPhone,
  normalizeEthiopianPhone,
} from "../utils/ethiopianPhone.js";
import dotenv from "dotenv";

dotenv.config();

const SECRET = process.env.JWT_SECRET || process.env.SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1d";

const OTP_TTL_MS = 15 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 8;

function normalizeEmail(email) {
  return String(email ?? "")
    .trim()
    .toLowerCase();
}

function isValidEmailShape(email) {
  const s = String(email ?? "").trim();
  if (s.length < 5 || s.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function resolveJwtSecret() {
  const secret = String(SECRET ?? "").trim();
  return secret || null;
}

function stripUser(user) {
  if (!user) return user;
  const safe = { ...user };
  delete safe.password_hash;
  delete safe.two_factor_secret;
  delete safe.telegram_chat_id;
  safe.two_factor_enabled = Boolean(Number(safe.two_factor_enabled ?? 0));
  return safe;
}

async function resolveRoleName(user) {
  const roleRows = await getRoleById(user.role_id);
  return normalizeRoleName(
    roleRows[0]?.name ?? roleRows[0]?.role_name ?? "user"
  );
}

async function authenticateByPhonePassword(phone, password) {
  const phoneCandidates = ethiopianPhoneVariants(phone);
  if (!phoneCandidates.length) {
    return {
      ok: false,
      status: 400,
      body: { message: "Phone number is required." },
    };
  }
  const placeholders = phoneCandidates.map(() => "?").join(", ");
  const results = await queryAsync(
    `SELECT * FROM users WHERE phone IN (${placeholders}) ORDER BY id ASC LIMIT 1`,
    phoneCandidates
  );
  if (results.length === 0) {
    return { ok: false, status: 404, body: { message: "User not found" } };
  }
  const user = results[0];
  const passwordHash = user.password_hash ?? user.password ?? null;
  if (!passwordHash) {
    return {
      ok: false,
      status: 500,
      body: { message: "Login failed: account password hash is missing" },
    };
  }
  const isMatch = await bcrypt.compare(password, passwordHash);
  if (!isMatch) {
    return { ok: false, status: 401, body: { message: "Invalid credentials" } };
  }
  const role_name = await resolveRoleName(user);
  return { ok: true, user, role_name };
}

async function sendLoginSuccess(req, res, user, role_name) {
  const jwtSecret = resolveJwtSecret();
  if (!jwtSecret) {
    return res.status(500).json({ message: "Login failed: JWT secret is not configured" });
  }

  const token = jwt.sign(
    { id: user.id, role_id: user.role_id, role_name },
    jwtSecret,
    { expiresIn: JWT_EXPIRES_IN }
  );

  try {
    const ip =
      req.ip ||
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      null;
    const device = String(req.get("User-Agent") || "").slice(0, 500) || null;
    await loginHistoryModel.createLoginHistory(user.id, device, ip);

    // If 2FA is enabled, send a non-blocking "new login" email notice.
    if (Number(user?.two_factor_enabled) === 1) {
      const email = accountEmailFor2fa(user);
      if (email) {
        void sendTwoFactorLoginNoticeEmail(email, {
          fullName: user?.full_name,
          loginTime: new Date().toISOString(),
          ipAddress: ip,
          device,
        }).catch((mailErr) => {
          console.error("2FA login notice email:", mailErr);
        });
      }
    }
  } catch (logErr) {
    console.error("login_history:", logErr);
  }

  res.json({
    message: "Login successful",
    token,
    role_name,
    user: stripUser(user),
  });
}

// ================= REGISTER =================
export const register = async (req, res) => {
  const { full_name, phone, email, password, role_id } = req.body;

  try {
    const normalizedPhone = normalizeEthiopianPhone(phone);
    if (!normalizedPhone) {
      return res.status(400).json({
        message: "Phone number is required.",
      });
    }
    const emailNorm = normalizeEmail(email);
    const phoneCandidates = ethiopianPhoneVariants(normalizedPhone);
    const placeholders = phoneCandidates.map(() => "?").join(", ");
    const taken = await queryAsync(
      `SELECT id FROM users
       WHERE phone IN (${placeholders})
          OR (email IS NOT NULL AND TRIM(email) <> '' AND LOWER(TRIM(email)) = ?)
       LIMIT 1`,
      [...phoneCandidates, emailNorm]
    );
    if (taken.length > 0) {
      return res.status(409).json({
        message: "An account already exists with this phone or email.",
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    const data = [full_name, normalizedPhone, emailNorm || null, hashedPassword, role_id];

    userModel.createUser(data, (err, result) => {
      if (err) return res.status(500).json(err);

      void logAutoReportTask({
        type: "user_register",
        summary: `Self-registration: ${full_name} (${normalizedPhone})`,
        date_range: result?.insertId ? `user_id:${result.insertId}` : null,
      });
      res.json({ message: "User registered successfully" });
    });
  } catch (err) {
    res.status(500).json(err);
  }
};

// ================= PASSENGER REGISTER (EMAIL OTP) =================
export const registerPassengerStart = async (req, res) => {
  try {
    const { full_name, phone, email, password, role_id } = req.body;
    const name = String(full_name ?? "").trim();
    const phoneNorm = normalizeEthiopianPhone(phone);
    const emailNorm = normalizeEmail(email);

    if (!name || !phoneNorm) {
      return res.status(400).json({ message: "Full name and phone are required." });
    }
    if (!isValidEthiopianPhone(phoneNorm)) {
      return res.status(400).json({
        message: "Phone number is required.",
      });
    }
    if (!isValidEmailShape(emailNorm)) {
      return res.status(400).json({ message: "A valid email is required to verify your account." });
    }
    if (!password || String(password).length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }
    const rid = Number(role_id);
    if (!Number.isInteger(rid) || rid <= 0) {
      return res.status(400).json({ message: "Invalid role." });
    }

    const roleRows = await getRoleById(rid);
    const roleRow = roleRows[0];
    const roleName = normalizeRoleName(
      roleRow?.name ?? roleRow?.role_name ?? ""
    );
    if (!roleRow || !isPassenger(roleName)) {
      return res.status(403).json({ message: "This sign-up flow is only for passenger accounts." });
    }

    const phoneCandidates = ethiopianPhoneVariants(phoneNorm);
    const placeholders = phoneCandidates.map(() => "?").join(", ");
    const taken = await queryAsync(
      `SELECT id FROM users
       WHERE phone IN (${placeholders})
          OR (email IS NOT NULL AND TRIM(email) <> '' AND LOWER(TRIM(email)) = ?)
       LIMIT 1`,
      [...phoneCandidates, emailNorm]
    );
    if (taken.length > 0) {
      return res.status(409).json({
        message: "An account already exists with this phone or email.",
      });
    }

    const otpPlain = String(crypto.randomInt(100_000, 1_000_000));
    const otpHash = await bcrypt.hash(otpPlain, 10);
    const hashedPassword = await bcrypt.hash(password, 10);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    await queryAsync(
      "DELETE FROM passenger_registration_pending WHERE email = ? OR phone = ?",
      [emailNorm, phoneNorm]
    );
    await queryAsync(
      `INSERT INTO passenger_registration_pending
       (email, phone, full_name, password_hash, role_id, otp_hash, expires_at, otp_attempts)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
      [emailNorm, phoneNorm, name, hashedPassword, rid, otpHash, expiresAt]
    );

    let mailMeta = {};
    try {
      mailMeta = await sendPassengerOtpEmail(emailNorm, otpPlain);
    } catch (mailErr) {
      console.error("sendPassengerOtpEmail:", mailErr);
      await queryAsync("DELETE FROM passenger_registration_pending WHERE email = ?", [
        emailNorm,
      ]);
      if (mailErr?.code === "EAUTH") {
        const isGmail = /gmail\.com/i.test(String(process.env.SMTP_HOST || ""));
        return res.status(503).json({
          message: isGmail
            ? "Gmail rejected the SMTP password. Use an App Password (not your normal Gmail password): enable 2-Step Verification, then create one at https://myaccount.google.com/apppasswords and set SMTP_PASS to that 16-character value. SMTP_USER must be your full Gmail address."
            : "SMTP username or password was rejected. Check SMTP_USER and SMTP_PASS for your provider.",
        });
      }
      return res.status(503).json({
        message:
          "Could not send the verification email. Check SMTP settings or try again later.",
      });
    }

    res.json({
      message: "We sent a verification code to your email.",
      ...(mailMeta.devLog ? { hint: mailMeta.devLog } : {}),
    });
  } catch (err) {
    console.error("registerPassengerStart:", err);
    const code = err?.code;
    if (code === "ER_NO_SUCH_TABLE") {
      return res.status(503).json({
        message:
          "Database schema missing/outdated: run backend/database/menahariya_smart_full_schema.sql",
      });
    }
    if (code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "Registration is already in progress for this email or phone.",
      });
    }
    res.status(500).json({ message: "Registration failed", error: String(err?.message || err) });
  }
};

export const registerPassengerVerify = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const emailNorm = normalizeEmail(email);
    const otpStr = String(otp ?? "").replace(/\D/g, "");

    if (!isValidEmailShape(emailNorm)) {
      return res.status(400).json({ message: "Valid email is required." });
    }
    if (otpStr.length !== 6) {
      return res.status(400).json({ message: "Enter the 6-digit code from your email." });
    }

    await queryAsync("START TRANSACTION");
    let rows;
    try {
      rows = await queryAsync(
        "SELECT * FROM passenger_registration_pending WHERE email = ? FOR UPDATE",
        [emailNorm]
      );
    } catch (e) {
      await queryAsync("ROLLBACK").catch(() => {});
      throw e;
    }

    if (rows.length === 0) {
      await queryAsync("ROLLBACK").catch(() => {});
      return res.status(400).json({
        message: "No pending registration for this email. Start again from the sign-up form.",
      });
    }

    const row = rows[0];
    if (new Date(row.expires_at) < new Date()) {
      await queryAsync("DELETE FROM passenger_registration_pending WHERE id = ?", [row.id]);
      await queryAsync("COMMIT");
      return res.status(400).json({
        message: "That code has expired. Request a new code from the sign-up form.",
      });
    }

    if (Number(row.otp_attempts) >= MAX_OTP_ATTEMPTS) {
      await queryAsync("DELETE FROM passenger_registration_pending WHERE id = ?", [row.id]);
      await queryAsync("COMMIT");
      return res.status(429).json({
        message: "Too many incorrect attempts. Please start registration again.",
      });
    }

    const match = await bcrypt.compare(otpStr, row.otp_hash);
    if (!match) {
      await queryAsync(
        "UPDATE passenger_registration_pending SET otp_attempts = otp_attempts + 1 WHERE id = ?",
        [row.id]
      );
      await queryAsync("COMMIT");
      return res.status(401).json({ message: "Invalid verification code." });
    }

    const verifiedPhone = normalizeEthiopianPhone(row.phone);
    if (!verifiedPhone) {
      await queryAsync("DELETE FROM passenger_registration_pending WHERE id = ?", [row.id]);
      await queryAsync("COMMIT");
      return res.status(400).json({
        message: "Stored registration phone is invalid. Please start registration again.",
      });
    }
    const phoneCandidates = ethiopianPhoneVariants(verifiedPhone);
    const placeholders = phoneCandidates.map(() => "?").join(", ");
    const taken = await queryAsync(
      `SELECT id FROM users
       WHERE phone IN (${placeholders})
          OR (email IS NOT NULL AND TRIM(email) <> '' AND LOWER(TRIM(email)) = ?)
       LIMIT 1`,
      [...phoneCandidates, emailNorm]
    );
    if (taken.length > 0) {
      await queryAsync("DELETE FROM passenger_registration_pending WHERE id = ?", [row.id]);
      await queryAsync("COMMIT");
      return res.status(409).json({
        message: "An account already exists with this phone or email.",
      });
    }

    const insertResult = await createUserAsync(
      row.full_name,
      verifiedPhone,
      row.email,
      row.password_hash,
      row.role_id,
      "active"
    );

    await queryAsync("DELETE FROM passenger_registration_pending WHERE id = ?", [row.id]);
    await queryAsync("COMMIT");

    void logAutoReportTask({
      type: "user_register",
      summary: `Passenger verified email: ${row.full_name} (${verifiedPhone})`,
      date_range: insertResult?.insertId ? `user_id:${insertResult.insertId}` : null,
    });

    res.json({ message: "Account verified and created. You can sign in now." });
  } catch (err) {
    await queryAsync("ROLLBACK").catch(() => {});
    console.error("registerPassengerVerify:", err);
    const code = err?.code;
    if (code === "ER_NO_SUCH_TABLE") {
      return res.status(503).json({
        message:
          "Database schema missing/outdated: run backend/database/menahariya_smart_full_schema.sql",
      });
    }
    res.status(500).json({ message: "Verification failed", error: String(err?.message || err) });
  }
};

// ================= LOGIN =================
export const login = async (req, res) => {
  try {
    const { phone, password } = req.body;
    const auth = await authenticateByPhonePassword(phone, password);
    if (!auth.ok) return res.status(auth.status).json(auth.body);

    const u = auth.user;
    const has2fa = Number(u.two_factor_enabled) === 1;

    if (has2fa) {
      const email = accountEmailFor2fa(u);
      if (!email) {
        return res.status(403).json({
          message:
            "Two-step verification is on but this account has no email. Add an email in your profile or contact support.",
        });
      }

      const otp = generateSixDigitOtp();
      try {
        await saveEmailOtp(u.id, TWO_FA_OTP_PURPOSE.LOGIN, otp);
        await sendTwoFactorOtpEmail(email, otp, "login");
      } catch (sendErr) {
        console.error("login 2FA email:", sendErr);
        await clearEmailOtp(u.id, TWO_FA_OTP_PURPOSE.LOGIN).catch(() => {});
        if (sendErr?.code === "ER_NO_SUCH_TABLE") {
          return res.status(503).json({
            message:
              "Database schema missing/outdated: run backend/database/menahariya_smart_full_schema.sql",
          });
        }
        if (sendErr?.code === "EAUTH") {
          return res.status(503).json({
            message:
              "Could not send sign-in code (SMTP failed). Check server mail settings, or in development rely on console OTP unless SMTP_FORCE_SEND=1.",
          });
        }
        return res.status(503).json({
          message:
            "Could not send sign-in code to your email. Try again later. In development, OTPs are usually logged to the server console.",
        });
      }

      const jwtSecret = resolveJwtSecret();
      if (!jwtSecret) {
        await clearEmailOtp(u.id, TWO_FA_OTP_PURPOSE.LOGIN).catch(() => {});
        return res
          .status(500)
          .json({ message: "Login failed: JWT secret is not configured" });
      }
      const two_factor_token = jwt.sign(
        { purpose: "2fa_login", sub: u.id },
        jwtSecret,
        { expiresIn: "5m" }
      );
      return res.json({
        message: "We sent a sign-in code to your email.",
        two_factor_required: true,
        two_factor_token,
      });
    }

    return sendLoginSuccess(req, res, u, auth.role_name);
  } catch (err) {
    res.status(500).json({ message: "Login failed", error: String(err) });
  }
};

export const loginTwoFactor = async (req, res) => {
  try {
    const { two_factor_token, code } = req.body;
    const jwtSecret = resolveJwtSecret();
    if (!jwtSecret) {
      return res.status(500).json({ message: "Server misconfiguration" });
    }

    let payload;
    try {
      payload = jwt.verify(String(two_factor_token || ""), jwtSecret);
    } catch {
      return res.status(401).json({
        message: "Invalid or expired verification. Sign in again with your password.",
      });
    }

    if (payload.purpose !== "2fa_login" || payload.sub == null) {
      return res.status(401).json({ message: "Invalid verification token." });
    }

    const userId = Number(payload.sub);
    const rows = await queryAsync(
      `SELECT * FROM users WHERE id = ? AND two_factor_enabled = 1`,
      [userId]
    );
    if (!rows.length) {
      return res.status(400).json({
        message: "Two-step verification is not active for this account.",
      });
    }

    const user = rows[0];
    const tokenStr = String(code ?? "").replace(/\s/g, "");
    const check = await verifyAndConsumeEmailOtp(
      userId,
      TWO_FA_OTP_PURPOSE.LOGIN,
      tokenStr
    );
    if (!check.ok) {
      if (check.reason === "expired") {
        return res.status(401).json({
          message: "That code has expired. Sign in again with your password.",
        });
      }
      if (check.reason === "locked") {
        return res.status(429).json({
          message: "Too many incorrect codes. Sign in again with your password.",
        });
      }
      if (check.reason === "no_pending") {
        return res.status(401).json({
          message: "No pending code. Sign in again with your password.",
        });
      }
      return res.status(401).json({ message: "Invalid code from your email." });
    }

    const role_name = await resolveRoleName(user);
    return sendLoginSuccess(req, res, user, role_name);
  } catch (err) {
    console.error("loginTwoFactor:", err);
    if (err?.code === "ER_NO_SUCH_TABLE") {
      return res.status(503).json({
        message:
          "Database schema missing/outdated: run backend/database/menahariya_smart_full_schema.sql",
      });
    }
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
  registerPassengerStart,
  registerPassengerVerify,
  login,
  loginTwoFactor,
  getProfile,
};

export default authController;
