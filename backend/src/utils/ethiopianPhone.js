/**
 * Ethiopian mobile normalization and matching helpers.
 *
 * Canonical format in this codebase is E.164: +2517XXXXXXXX or +2519XXXXXXXX.
 * We still accept legacy forms for compatibility:
 * - 07XXXXXXXX / 09XXXXXXXX
 * - 7XXXXXXXX / 9XXXXXXXX
 * - 2517XXXXXXXX / 2519XXXXXXXX
 * - +2517XXXXXXXX / +2519XXXXXXXX
 */
function cleanPhone(value) {
  return String(value ?? "")
    .trim()
    .replace(/[\s\-()]/g, "");
}

export function normalizeEthiopianPhone(value) {
  const raw = cleanPhone(value);
  if (!raw) return null;
  if (/^\+251[79]\d{8}$/.test(raw)) return raw;
  if (/^251[79]\d{8}$/.test(raw)) return `+${raw}`;
  if (/^0[79]\d{8}$/.test(raw)) return `+251${raw.slice(1)}`;
  if (/^[79]\d{8}$/.test(raw)) return `+251${raw}`;
  return null;
}

export function isValidEthiopianPhone(value) {
  return normalizeEthiopianPhone(value) !== null;
}

export function ethiopianPhoneVariants(value) {
  const normalized = normalizeEthiopianPhone(value);
  if (!normalized) return [];
  const nsn = normalized.slice(4); // 9 digits (7/9 + 8 digits)
  return [...new Set([normalized, normalized.slice(1), `0${nsn}`, nsn])];
}

/** Backward-compatible name used by SMS and OTP utilities. */
export function toE164Ethiopian(value) {
  return normalizeEthiopianPhone(value);
}

/** Last 4 digits for UI hints (masked destination). */
export function phoneLastFourDigits(value) {
  const d = String(value ?? "").replace(/\D/g, "");
  return d.length >= 4 ? d.slice(-4) : null;
}
