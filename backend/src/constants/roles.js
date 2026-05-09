export function normalizeRoleName(name) {
  return String(name ?? "")
    .trim()
    .toLowerCase();
}

/** DB `roles.name` values treated as passenger / end-user (lowercased). */
export const PASSENGER_ROLE_NAMES = [
  "passenger",
  "user",
  "customer",
  "client",
];

const PASSENGER_ALIASES = new Set(PASSENGER_ROLE_NAMES);

export function isAdmin(roleName) {
  return normalizeRoleName(roleName) === "admin";
}

export function isDriver(roleName) {
  return normalizeRoleName(roleName) === "driver";
}

export function isStaff(roleName) {
  const v = normalizeRoleName(roleName);
  return (
    v === "staff" ||
    v === "cargo staff" ||
    v === "cargo_staff" ||
    v === "station staff"
  );
}

export function isPassenger(roleName) {
  return PASSENGER_ALIASES.has(normalizeRoleName(roleName));
}

export function isAdminOrDriver(roleName) {
  return isAdmin(roleName) || isDriver(roleName);
}
