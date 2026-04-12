import bcrypt from "bcrypt";
import crypto from "crypto";
import { queryAsync } from "../config/db.js";

export const TWO_FA_OTP_PURPOSE = {
  ENABLE: "enable",
  DISABLE: "disable",
  LOGIN: "login",
};

const TTL_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

export function generateSixDigitOtp() {
  return String(crypto.randomInt(100_000, 1_000_000));
}

export async function saveEmailOtp(userId, purpose, otpPlain) {
  const otpHash = await bcrypt.hash(String(otpPlain), 10);
  const expiresAt = new Date(Date.now() + TTL_MS);
  await queryAsync(
    `INSERT INTO user_two_factor_email_otp (user_id, otp_hash, expires_at, purpose, attempts)
     VALUES (?, ?, ?, ?, 0)
     ON DUPLICATE KEY UPDATE otp_hash = VALUES(otp_hash), expires_at = VALUES(expires_at), attempts = 0`,
    [userId, otpHash, expiresAt, purpose]
  );
}

/**
 * @returns {Promise<{ ok: true } | { ok: false, reason: 'no_pending' | 'expired' | 'locked' | 'bad_code' }>}
 */
export async function verifyAndConsumeEmailOtp(userId, purpose, codeInput) {
  const code = String(codeInput ?? "").replace(/\s/g, "");
  const rows = await queryAsync(
    `SELECT * FROM user_two_factor_email_otp WHERE user_id = ? AND purpose = ?`,
    [userId, purpose]
  );
  if (!rows.length) return { ok: false, reason: "no_pending" };

  const row = rows[0];
  if (new Date(row.expires_at) < new Date()) {
    await queryAsync(
      `DELETE FROM user_two_factor_email_otp WHERE user_id = ? AND purpose = ?`,
      [userId, purpose]
    );
    return { ok: false, reason: "expired" };
  }

  if (Number(row.attempts) >= MAX_ATTEMPTS) {
    await queryAsync(
      `DELETE FROM user_two_factor_email_otp WHERE user_id = ? AND purpose = ?`,
      [userId, purpose]
    );
    return { ok: false, reason: "locked" };
  }

  const match = await bcrypt.compare(code, row.otp_hash);
  if (!match) {
    await queryAsync(
      `UPDATE user_two_factor_email_otp SET attempts = attempts + 1 WHERE user_id = ? AND purpose = ?`,
      [userId, purpose]
    );
    return { ok: false, reason: "bad_code" };
  }

  await queryAsync(
    `DELETE FROM user_two_factor_email_otp WHERE user_id = ? AND purpose = ?`,
    [userId, purpose]
  );
  return { ok: true };
}

export async function clearEmailOtp(userId, purpose) {
  await queryAsync(
    `DELETE FROM user_two_factor_email_otp WHERE user_id = ? AND purpose = ?`,
    [userId, purpose]
  );
}

/** Normalized email if the account can receive 2FA codes; otherwise null. */
export function accountEmailFor2fa(user) {
  const e = String(user?.email ?? "")
    .trim()
    .toLowerCase();
  if (e.length < 5 || e.length > 254) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return null;
  return e;
}
