import nodemailer from "nodemailer";

function smtpConfigured() {
  return (
    Boolean(String(process.env.SMTP_HOST || "").trim()) &&
    Boolean(String(process.env.SMTP_USER || "").trim()) &&
    Boolean(String(process.env.SMTP_PASS || "").trim())
  );
}

/**
 * When true, OTPs are printed to the server console instead of SMTP.
 * - PASSENGER_OTP_LOG_ONLY=1 or EMAIL_LOG_ONLY=1: always log (overrides real send).
 * - Missing SMTP_HOST / SMTP_USER / SMTP_PASS: log in console (safe fallback).
 * - Otherwise: send real email in all environments, including development.
 */
function logOnlyMode() {
  if (String(process.env.PASSENGER_OTP_LOG_ONLY || "").trim() === "1") return true;
  if (String(process.env.EMAIL_LOG_ONLY || "").trim() === "1") return true;
  return !smtpConfigured();
}

function forceSmtpSend() {
  return String(process.env.SMTP_FORCE_SEND || "").trim() === "1";
}

function logOnlyHint() {
  if (
    String(process.env.PASSENGER_OTP_LOG_ONLY || "").trim() === "1" ||
    String(process.env.EMAIL_LOG_ONLY || "").trim() === "1"
  ) {
    return "OTP printed to server console because PASSENGER_OTP_LOG_ONLY / EMAIL_LOG_ONLY is enabled.";
  }
  return "OTP printed to server console because SMTP credentials are incomplete. Set SMTP_HOST, SMTP_USER, and SMTP_PASS to send real email.";
}

function smtpFailureHint(mailErr) {
  const code = String(mailErr?.code || "").trim() || "UNKNOWN";
  return `OTP printed to server console because SMTP send failed (${code}). Fix SMTP settings or set SMTP_FORCE_SEND=1 to fail hard instead of fallback.`;
}

async function sendViaSmtpOrFallback({ to, subject, text, from, logPrefix }) {
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = String(process.env.SMTP_SECURE || "").trim() === "1";
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from,
      to,
      subject,
      text,
    });
    return { ok: true };
  } catch (mailErr) {
    if (forceSmtpSend()) throw mailErr;
    console.error(`${logPrefix} SMTP send failed; falling back to console OTP log.`, mailErr);
    console.log(
      `${logPrefix} [dev SMTP fallback]\n`,
      `To: ${to}\nSubject: ${subject}\n\n${text}\n`
    );
    return {
      ok: true,
      devLog: smtpFailureHint(mailErr),
    };
  }
}

/**
 * Sends a plain-text email, or logs body when SMTP is not configured (dev).
 * @returns {{ ok: boolean, devLog?: string }}
 */
export async function sendPassengerOtpEmail(to, otpPlain) {
  const from =
    String(process.env.MAIL_FROM || "").trim() ||
    String(process.env.SMTP_USER || "").trim() ||
    "noreply@localhost";

  const subject =
    String(process.env.MAIL_OTP_SUBJECT || "").trim() ||
    "Your Menahariya Smart verification code";

  const text = `Your verification code is: ${otpPlain}\n\nIt expires in 15 minutes. If you did not request this, you can ignore this email.`;

  if (logOnlyMode()) {
    console.log(
      "[passenger OTP email — dev / log-only]\n",
      `To: ${to}\nSubject: ${subject}\n\n${text}\n`
    );
    return {
      ok: true,
      devLog: logOnlyHint(),
    };
  }
  return sendViaSmtpOrFallback({
    to,
    subject,
    text,
    from,
    logPrefix: "[passenger OTP email]",
  });
}

/**
 * Email for account two-step flows (enable / disable / sign-in).
 * @param {'enable'|'disable'|'login'} kind
 */
export async function sendTwoFactorOtpEmail(to, otpPlain, kind = "login") {
  const from =
    String(process.env.MAIL_FROM || "").trim() ||
    String(process.env.SMTP_USER || "").trim() ||
    "noreply@localhost";

  const subject =
    kind === "disable"
      ? "Code to turn off two-step verification — Menahariya Smart"
      : kind === "enable"
        ? "Your code to turn on two-step verification — Menahariya Smart"
        : "Your Menahariya Smart sign-in code";

  const intro =
    kind === "disable"
      ? "Use this code to turn off two-step verification on your account:"
      : kind === "enable"
        ? "Use this code to confirm turning on two-step verification:"
        : "Use this code to finish signing in:";

  const text = `${intro} ${otpPlain}\n\nIt expires in 15 minutes. If you did not request this, you can ignore this email.`;

  if (logOnlyMode()) {
    console.log(
      `[2FA email OTP — ${kind} — dev / log-only]\n`,
      `To: ${to}\nSubject: ${subject}\n\n${text}\n`
    );
    return {
      ok: true,
      devLog: logOnlyHint(),
    };
  }
  return sendViaSmtpOrFallback({
    to,
    subject,
    text,
    from,
    logPrefix: `[2FA email OTP — ${kind}]`,
  });
}

/**
 * Login notification email for accounts that have two-step enabled.
 * This is informational (not an OTP).
 */
export async function sendTwoFactorLoginNoticeEmail(
  to,
  { fullName, loginTime, ipAddress, device } = {}
) {
  const from =
    String(process.env.MAIL_FROM || "").trim() ||
    String(process.env.SMTP_USER || "").trim() ||
    "noreply@localhost";

  const subject = "New login to your Menahariya Smart account";
  const whenText = loginTime || new Date().toISOString();
  const nameText = String(fullName || "").trim() || "User";
  const ipText = String(ipAddress || "").trim() || "Unknown IP";
  const deviceText = String(device || "").trim() || "Unknown device";

  const text =
    `Hello ${nameText},\n\n` +
    `Your account was just signed in.\n\n` +
    `Time: ${whenText}\n` +
    `IP address: ${ipText}\n` +
    `Device: ${deviceText}\n\n` +
    `If this wasn't you, change your password immediately and contact support.\n`;

  if (logOnlyMode()) {
    console.log(
      "[2FA login notice email — dev / log-only]\n",
      `To: ${to}\nSubject: ${subject}\n\n${text}\n`
    );
    return {
      ok: true,
      devLog: logOnlyHint(),
    };
  }

  return sendViaSmtpOrFallback({
    to,
    subject,
    text,
    from,
    logPrefix: "[2FA login notice email]",
  });
}
