/** Minimum length for admin (and other privileged) accounts. */
export const ADMIN_PASSWORD_MIN_LENGTH = 10;

/**
 * @returns {{ checks: { length: boolean, lower: boolean, upper: boolean, digit: boolean, special: boolean }, strong: boolean }}
 */
export function evaluateAdminPassword(password) {
  const p = String(password ?? "");
  const checks = {
    length: p.length >= ADMIN_PASSWORD_MIN_LENGTH,
    lower: /[a-z]/.test(p),
    upper: /[A-Z]/.test(p),
    digit: /\d/.test(p),
    special: /[^A-Za-z0-9]/.test(p),
  };
  const strong = Object.values(checks).every(Boolean);
  return { checks, strong };
}

/** User-facing sentence when submit validation fails. */
export function getAdminPasswordRequirementError(password) {
  const { checks } = evaluateAdminPassword(password);
  const missing = [];
  if (!checks.length) {
    missing.push(`at least ${ADMIN_PASSWORD_MIN_LENGTH} characters`);
  }
  if (!checks.lower) missing.push("one lowercase letter");
  if (!checks.upper) missing.push("one uppercase letter");
  if (!checks.digit) missing.push("one number");
  if (!checks.special) missing.push("one symbol (e.g. !@#$%)");
  if (missing.length === 0) return "";
  return `Password must include ${missing.join(", ")}.`;
}
