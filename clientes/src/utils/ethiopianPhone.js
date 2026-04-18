/**
 * Ethiopian mobile phone format accepted:
 * - 09XXXXXXXX / 07XXXXXXXX
 * - 9XXXXXXXX / 7XXXXXXXX
 * - 2519XXXXXXXX / 2517XXXXXXXX
 * - +2519XXXXXXXX / +2517XXXXXXXX
 */
export function normalizeEthiopianPhone(value) {
  const raw = String(value ?? "")
    .trim()
    .replace(/[\s\-()]/g, "");
  if (!raw) return "";
  if (/^\+251[79]\d{8}$/.test(raw)) return raw;
  if (/^251[79]\d{8}$/.test(raw)) return `+${raw}`;
  if (/^0[79]\d{8}$/.test(raw)) return `+251${raw.slice(1)}`;
  if (/^[79]\d{8}$/.test(raw)) return `+251${raw}`;
  return raw;
}

export function isValidEthiopianPhone(value) {
  const phone = normalizeEthiopianPhone(value);
  if (!phone) return false;
  return /^\+251[79]\d{8}$/.test(phone);
}

export function formatEthiopianPhoneForInput(value) {
  const normalized = normalizeEthiopianPhone(value);
  if (!normalized || !isValidEthiopianPhone(normalized)) {
    return String(value ?? "").replace(/[^\d+]/g, "");
  }
  return `0${normalized.slice(4)}`;
}

export const ETHIOPIAN_PHONE_ERROR =
  "Enter a valid Ethiopian phone number (e.g. 0912345678 or +251912345678).";

