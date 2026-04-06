/** API base: Vite proxy uses same origin in dev; override for production build */
export const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

export const STORAGE_KEYS = {
  TOKEN: "menahariya_token",
  USER: "menahariya_user",
};

/** DB `roles.id` for admin row (override if your seed differs). */
export const ADMIN_ROLE_ID =
  Number(import.meta.env.VITE_ADMIN_ROLE_ID) || 1;

export const ROUTES = {
  /** Opens app here: admins → dashboard, others → admin login */
  ROOT: "/",
  /** Legacy alias: old home/welcome now points to admin login */
  HOME: "/admin/login",
  /** @deprecated Use ADMIN_LOGIN; kept so old links redirect */
  LOGIN: "/login",
  ADMIN_LOGIN: "/admin/login",
  ADMIN_REGISTER: "/admin/register",
  DASHBOARD: "/dashboard",
  /** RBAC (backend: /api/users, /roles, /permissions, /role-permissions) */
  ADMIN_USERS: "/admin/users",
  ADMIN_ROLES: "/admin/roles",
  ADMIN_PERMISSIONS: "/admin/permissions",
  ADMIN_ROLE_PERMISSIONS: "/admin/role-permissions",
  /** Domain CRUD (backend /api/routes, trips, seats, …) */
  ADMIN_ROUTES: "/admin/routes",
  ADMIN_VEHICLES: "/admin/vehicles",
  ADMIN_TRIPS: "/admin/trips",
  ADMIN_SEATS: "/admin/seats",
  ADMIN_TICKETS: "/admin/tickets",
  ADMIN_PAYMENTS: "/admin/payments",
  ADMIN_CARGO: "/admin/cargo",
  ADMIN_CARGO_RECEIPTS: "/admin/cargo-receipts",
  ADMIN_LOGIN_HISTORY: "/admin/login-history",
  ADMIN_NOTIFICATIONS: "/admin/notifications",
  ADMIN_REPORTS: "/admin/reports",
  /** Read-only joined views */
  ADMIN_RELATIONS: "/admin/relations",
};
