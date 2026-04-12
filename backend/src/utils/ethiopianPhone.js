/**
 * Normalize Ethiopian mobiles to E.164 (+251…) for SMS gateways.
 * Accepts the same shapes as the client: 09XXXXXXXX, 9XXXXXXXX, 251…, +251…
 * @param {string} value
 * @returns {string | null} E.164 or null if not a plausible ET mobile
 */
export function toE164Ethiopian(value) {
  const raw = String(value ?? "")
    .trim()
    .replace(/[\s\-()]/g, "");
  if (!raw) return null;
  if (/^\+2519\d{8}$/.test(raw)) return raw;
  if (/^2519\d{8}$/.test(raw)) return `+${raw}`;
  if (/^09\d{8}$/.test(raw)) return `+251${raw.slice(1)}`;
  if (/^9\d{8}$/.test(raw)) return `+251${raw}`;
  if (raw.startsWith("+") && raw.length >= 10) return raw;
  return null;
}

/** Last 4 digits for UI hints (masked destination). */
export function phoneLastFourDigits(value) {
  const d = String(value ?? "").replace(/\D/g, "");
  return d.length >= 4 ? d.slice(-4) : null;
}
