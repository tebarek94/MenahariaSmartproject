/** Aligns with backend `normalizeRoleName` — admin portal checks. */
export function normalizeRoleName(name) {
  return String(name ?? "")
    .trim()
    .toLowerCase();
}

export function isAdminRole(roleName) {
  return normalizeRoleName(roleName) === "admin";
}
