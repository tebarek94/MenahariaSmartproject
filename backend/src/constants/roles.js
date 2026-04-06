export function normalizeRoleName(name) {
  return String(name ?? "")
    .trim()
    .toLowerCase();
}

/** Treat these as the passenger / end-user role in the database. */
const PASSENGER_ALIASES = new Set([
  "passenger",
  "user",
  "customer",
  "client",
]);

export function isAdmin(roleName) {
  return normalizeRoleName(roleName) === "admin";
}

export function isDriver(roleName) {
  return normalizeRoleName(roleName) === "driver";
}

export function isPassenger(roleName) {
  return PASSENGER_ALIASES.has(normalizeRoleName(roleName));
}

export function isAdminOrDriver(roleName) {
  return isAdmin(roleName) || isDriver(roleName);
}
