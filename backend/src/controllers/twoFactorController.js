import bcrypt from "bcrypt";
import { queryAsync } from "../config/db.js";
import { sendTwoFactorOtpEmail } from "../utils/emailOtp.js";
import {
  TWO_FA_OTP_PURPOSE,
  accountEmailFor2fa,
  clearEmailOtp,
  generateSixDigitOtp,
  saveEmailOtp,
  verifyAndConsumeEmailOtp,
} from "../utils/userTwoFactorEmailOtp.js";

function missingOtpTableMessage(err) {
  const code = err?.code;
  if (code === "ER_NO_SUCH_TABLE" || code === "ER_BAD_FIELD_ERROR") {
    return "Database migration missing: run backend/database/008_user_two_factor_email_otp.sql";
  }
  return null;
}

function mapVerifyError(reason) {
  if (reason === "expired") return "That code has expired. Request a new one.";
  if (reason === "locked") return "Too many failed attempts. Request a new code.";
  if (reason === "no_pending") return "No pending code. Start again from the beginning.";
  return "Invalid code.";
}

export async function twoFactorRequestEnable(req, res) {
  try {
    const { password } = req.body;
    const userId = Number(req.user.id);
    const rows = await queryAsync("SELECT * FROM users WHERE id = ?", [userId]);
    if (!rows.length) return res.status(404).json({ message: "User not found" });
    const user = rows[0];
    if (Number(user.two_factor_enabled) === 1) {
      return res.status(400).json({ message: "Two-step verification is already on." });
    }

    const passwordHash = user.password_hash ?? user.password ?? null;
    if (
      !password ||
      !passwordHash ||
      !(await bcrypt.compare(String(password), passwordHash))
    ) {
      return res.status(401).json({ message: "Incorrect password." });
    }

    const email = accountEmailFor2fa(user);
    if (!email) {
      return res.status(400).json({
        message:
          "Add a valid email address to your profile before turning on two-step verification.",
      });
    }

    const otp = generateSixDigitOtp();
    await saveEmailOtp(userId, TWO_FA_OTP_PURPOSE.ENABLE, otp);

    let mailMeta = {};
    try {
      mailMeta = await sendTwoFactorOtpEmail(email, otp, "enable");
    } catch (mailErr) {
      console.error("sendTwoFactorOtpEmail enable:", mailErr);
      await clearEmailOtp(userId, TWO_FA_OTP_PURPOSE.ENABLE);
      if (mailErr?.code === "EAUTH") {
        return res.status(502).json({
          message:
            "Could not send email (SMTP login failed). Check server mail settings.",
        });
      }
      return res.status(502).json({
        message: "Could not send the verification email. Try again later.",
      });
    }

    res.json({
      message: `We sent a 6-digit code to ${email}. Enter it below to finish.`,
      ...(mailMeta.devLog ? { hint: mailMeta.devLog } : {}),
    });
  } catch (err) {
    console.error("twoFactorRequestEnable:", err);
    const m = missingOtpTableMessage(err);
    if (m) return res.status(503).json({ message: m });
    res.status(500).json({ message: "Could not start two-step setup." });
  }
}

export async function twoFactorEnable(req, res) {
  try {
    const { code } = req.body;
    const userId = Number(req.user.id);
    const digits = String(code ?? "").replace(/\s/g, "");
    if (digits.length !== 6) {
      return res.status(400).json({ message: "Enter the 6-digit code from your email." });
    }

    const rows = await queryAsync(
      "SELECT two_factor_enabled FROM users WHERE id = ?",
      [userId]
    );
    if (!rows.length) return res.status(404).json({ message: "User not found" });
    if (Number(rows[0].two_factor_enabled) === 1) {
      return res.status(400).json({ message: "Two-step verification is already on." });
    }

    const result = await verifyAndConsumeEmailOtp(
      userId,
      TWO_FA_OTP_PURPOSE.ENABLE,
      digits
    );
    if (!result.ok) {
      return res.status(400).json({ message: mapVerifyError(result.reason) });
    }

    await queryAsync(
      `UPDATE users SET two_factor_enabled = 1, two_factor_secret = NULL WHERE id = ?`,
      [userId]
    );

    res.json({ message: "Two-step verification is now on.", two_factor_enabled: true });
  } catch (err) {
    console.error("twoFactorEnable:", err);
    const m = missingOtpTableMessage(err);
    if (m) return res.status(503).json({ message: m });
    res.status(500).json({ message: "Could not enable two-step verification." });
  }
}

export async function twoFactorRequestDisable(req, res) {
  try {
    const { password } = req.body;
    const userId = Number(req.user.id);
    const rows = await queryAsync("SELECT * FROM users WHERE id = ?", [userId]);
    if (!rows.length) return res.status(404).json({ message: "User not found" });
    const user = rows[0];
    if (Number(user.two_factor_enabled) !== 1) {
      return res.status(400).json({ message: "Two-step verification is not enabled." });
    }

    const passwordHash = user.password_hash ?? user.password ?? null;
    if (
      !password ||
      !passwordHash ||
      !(await bcrypt.compare(String(password), passwordHash))
    ) {
      return res.status(401).json({ message: "Incorrect password." });
    }

    const email = accountEmailFor2fa(user);
    if (!email) {
      return res.status(400).json({
        message: "Your account has no email on file. Contact support to turn off two-step verification.",
      });
    }

    const otp = generateSixDigitOtp();
    await saveEmailOtp(userId, TWO_FA_OTP_PURPOSE.DISABLE, otp);

    let mailMeta = {};
    try {
      mailMeta = await sendTwoFactorOtpEmail(email, otp, "disable");
    } catch (mailErr) {
      console.error("sendTwoFactorOtpEmail disable:", mailErr);
      await clearEmailOtp(userId, TWO_FA_OTP_PURPOSE.DISABLE);
      if (mailErr?.code === "EAUTH") {
        return res.status(502).json({
          message:
            "Could not send email (SMTP login failed). Check server mail settings.",
        });
      }
      return res.status(502).json({
        message: "Could not send the verification email. Try again later.",
      });
    }

    res.json({
      message: `We sent a 6-digit code to ${email}. Enter it below to turn off two-step verification.`,
      ...(mailMeta.devLog ? { hint: mailMeta.devLog } : {}),
    });
  } catch (err) {
    console.error("twoFactorRequestDisable:", err);
    const m = missingOtpTableMessage(err);
    if (m) return res.status(503).json({ message: m });
    res.status(500).json({ message: "Could not send disable code." });
  }
}

export async function twoFactorDisable(req, res) {
  try {
    const { code } = req.body;
    const userId = Number(req.user.id);
    const digits = String(code ?? "").replace(/\s/g, "");
    if (digits.length !== 6) {
      return res.status(400).json({ message: "Enter the 6-digit code from your email." });
    }

    const rows = await queryAsync(
      "SELECT two_factor_enabled FROM users WHERE id = ?",
      [userId]
    );
    if (!rows.length) return res.status(404).json({ message: "User not found" });
    if (Number(rows[0].two_factor_enabled) !== 1) {
      return res.status(400).json({ message: "Two-step verification is not enabled." });
    }

    const result = await verifyAndConsumeEmailOtp(
      userId,
      TWO_FA_OTP_PURPOSE.DISABLE,
      digits
    );
    if (!result.ok) {
      return res.status(400).json({ message: mapVerifyError(result.reason) });
    }

    await queryAsync(
      `UPDATE users SET two_factor_enabled = 0, two_factor_secret = NULL WHERE id = ?`,
      [userId]
    );

    res.json({ message: "Two-step verification is off.", two_factor_enabled: false });
  } catch (err) {
    console.error("twoFactorDisable:", err);
    const m = missingOtpTableMessage(err);
    if (m) return res.status(503).json({ message: m });
    res.status(500).json({ message: "Could not disable two-step verification." });
  }
}
