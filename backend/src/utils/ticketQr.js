import QRCode from "qrcode";
import crypto from "crypto";

/** Public app URL for QR (camera opens browser here). Same env as Chapa return_url. */
function resolveFrontendBase() {
  return String(process.env.FRONTEND_URL || "http://localhost:5173").replace(
    /\/$/,
    ""
  );
}

/**
 * QR must encode this URL so scanners open the validation page, not raw JSON.
 * Path: /qr-scan/:token (token = 64-char hex secret).
 */
export function buildTicketQrScanUrl(secretToken) {
  const t = String(secretToken ?? "").trim();
  if (!t) return "";
  const base = resolveFrontendBase();
  return `${base}/qr-scan/${encodeURIComponent(t)}`;
}

/**
 * Accept raw URL, legacy JSON, or hex token from POST body (defense in depth).
 */
export function normalizeValidateQrTokenInput(input) {
  let s = String(input ?? "").trim();
  if (!s) return "";
  try {
    s = decodeURIComponent(s.replace(/\+/g, " "));
  } catch {
    /* keep */
  }
  const m = s.match(/\/qr-scan\/([^/?#]+)/i);
  if (m) {
    try {
      return decodeURIComponent(m[1]).trim();
    } catch {
      return m[1].trim();
    }
  }
  if (s.startsWith("{")) {
    try {
      const j = JSON.parse(s);
      if (j && typeof j.token === "string") return j.token.trim();
    } catch {
      return "";
    }
    return "";
  }
  return s.trim();
}

export function buildTicketQrPayload(row) {
  return {
    ticket_id: row.id,
    ticket_code: row.ticket_code ?? null,
    passenger_name: row.passenger_name ?? null,
    driver_name: row.driver_name ?? null,
    plate_number: row.plate_number ?? null,
    origin: row.origin ?? null,
    destination: row.destination ?? null,
    departure_time: row.departure_time ?? null,
    arrival_time: row.arrival_time ?? null,
    issued_at: row.issued_at ?? null,
    qr_token: row.qr_code_token ?? null,
    expires_at: row.qr_code_expires_at ?? null,
    used: row.qr_code_used ?? false,
  };
}

export function generateQrToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function generateQrExpirationTime(hours = 24) {
  const expiration = new Date();
  expiration.setHours(expiration.getHours() + hours);
  return expiration;
}

// Generate QR code with one-time use token
export async function generateOneTimeTicketQr(row, expirationHours = 24) {
  const token = generateQrToken();
  const expiresAt = generateQrExpirationTime(expirationHours);
  
  const scanUrl = buildTicketQrScanUrl(token);
  const qrDataUrl = await QRCode.toDataURL(scanUrl, {
    width: 280,
    margin: 2,
    errorCorrectionLevel: "M",
  });
  
  return {
    token,
    expiresAt,
    qrDataUrl,
  };
}

// Legacy function for backward compatibility
export async function ticketToQrDataUrl(row) {
  if (row?.qr_code_token) {
    return QRCode.toDataURL(buildTicketQrScanUrl(row.qr_code_token), {
      width: 280,
      margin: 2,
      errorCorrectionLevel: "M",
    });
  }
  const payload = buildTicketQrPayload(row);
  return QRCode.toDataURL(JSON.stringify(payload), {
    width: 280,
    margin: 2,
    errorCorrectionLevel: "M",
  });
}

export async function attachTicketQr(row, { includeImage = true, generateNewToken = false } = {}) {
  if (!row) return null;
  const qr_payload = buildTicketQrPayload(row);
  const out = { ...row, qr_payload };
  
  if (includeImage) {
    // If QR code is used or expired, show expired QR
    if (row.qr_code_used || (row.qr_code_expires_at && new Date(row.qr_code_expires_at) < new Date())) {
      out.qr_data_url = await QRCode.toDataURL(JSON.stringify({
        status: 'expired',
        message: row.qr_code_used ? 'QR code already used' : 'QR code expired',
        ticket_id: row.id
      }), {
        width: 280,
        margin: 2,
        errorCorrectionLevel: "M",
      });
    } else if (row.qr_code_token) {
      const scanUrl = buildTicketQrScanUrl(row.qr_code_token);
      out.qr_data_url = await QRCode.toDataURL(scanUrl, {
        width: 280,
        margin: 2,
        errorCorrectionLevel: "M",
      });
    } else {
      // Generate new token and QR
      const qrData = await generateOneTimeTicketQr(row);
      out.qr_data_url = qrData.qrDataUrl;
      out.qr_code_token = qrData.token;
      out.qr_code_expires_at = qrData.expiresAt;
    }
  }
  
  return out;
}
