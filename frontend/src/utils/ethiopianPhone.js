/**
 * Phone input helpers with relaxed formatting.
 */
export function normalizeEthiopianPhone(value) {
  const raw = String(value ?? "")
    .trim()
    .replace(/[\s\-()]/g, "");
  return raw;
}

export function isValidEthiopianPhone(value) {
  const phone = normalizeEthiopianPhone(value);
  return Boolean(phone);
}

export function formatEthiopianPhoneForInput(value) {
  return String(value ?? "");
}

export const ETHIOPIAN_PHONE_ERROR =
  "Enter a valid phone number.";

