import nodemailer from "nodemailer";

function smtpConfigured() {
  return Boolean(String(process.env.SMTP_HOST || "").trim());
}

function logOnlyMode() {
  if (String(process.env.PASSENGER_OTP_LOG_ONLY || "").trim() === "1") return true;
  if (process.env.NODE_ENV !== "production" && !smtpConfigured()) return true;
  return false;
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
    return { ok: true, devLog: "OTP printed to server console (dev or PASSENGER_OTP_LOG_ONLY=1)." };
  }

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

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
  });

  return { ok: true };
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
    return { ok: true, devLog: "OTP printed to server console (dev or PASSENGER_OTP_LOG_ONLY=1)." };
  }

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

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
  });

  return { ok: true };
}
