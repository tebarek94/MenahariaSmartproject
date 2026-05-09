/**
 * Phone normalization and matching helpers.
 *
 * Formatting rules are intentionally relaxed: we keep the value as entered
 * (except trimming and removing visual separators).
 */
function cleanPhone(value) {
  return String(value ?? "")
    .trim()
    .replace(/[\s\-()]/g, "");
}

export function normalizeEthiopianPhone(value) {
  const raw = cleanPhone(value);
  return raw || null;
}

export function isValidEthiopianPhone(value) {
  return normalizeEthiopianPhone(value) !== null;
}

export function ethiopianPhoneVariants(value) {
  const normalized = normalizeEthiopianPhone(value);
  if (!normalized) return [];
  return [normalized];
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
