/**
 * Ethiopian mobile phone format accepted:
 * - 09XXXXXXXX
 * - 9XXXXXXXX
 * - 2519XXXXXXXX
 * - +2519XXXXXXXX
 */
export function normalizeEthiopianPhone(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  return raw.replace(/[\s\-()]/g, "");
}

export function isValidEthiopianPhone(value) {
  const phone = normalizeEthiopianPhone(value);
  if (!phone) return false;
  return /^(?:\+251|251|0)?9\d{8}$/.test(phone);
}

export const ETHIOPIAN_PHONE_ERROR =
  "Enter a valid Ethiopian phone number (e.g. 0912345678 or +251912345678).";

