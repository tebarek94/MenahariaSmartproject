/** Aligns with backend `normalizeRoleName` — admin portal checks. */
export function normalizeRoleName(name) {
  return String(name ?? "")
    .trim()
    .toLowerCase();
}

export function isAdminRole(roleName) {
  return normalizeRoleName(roleName) === "admin";
}

export function isDriverRole(roleName) {
  return normalizeRoleName(roleName) === "driver";
}

export function isStaffRole(roleName) {
  const v = normalizeRoleName(roleName);
  return (
    v === "staff" ||
    v === "cargo staff" ||
    v === "cargo_staff" ||
    v === "station staff"
  );
}

export function isPassengerRole(roleName) {
  const passengerAliases = ["passenger", "user", "customer", "client"];
  return passengerAliases.includes(normalizeRoleName(roleName));
}
