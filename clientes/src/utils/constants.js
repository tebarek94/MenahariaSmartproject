/**
 * API base URL. Production: set `VITE_API_URL`. Dev: defaults to backend on :5000 so
 * Socket.IO hits the server directly (avoids flaky Vite `/socket.io` ws proxy / ECONNABORTED noise).
 */
const envApiBase = import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "";
export const API_BASE =
  envApiBase ||
  (import.meta.env.DEV ? "http://localhost:5000" : "");

export const STORAGE_KEYS = {
  TOKEN: "menahariya_token",
  USER: "menahariya_user",
  /** After Chapa checkout redirect, verify with this tx_ref once. */
  CHAPA_PENDING_TX_REF: "menahariya_chapa_pending_tx_ref",
  /** Same as above, for cargo fee checkout return. */
  CHAPA_PENDING_CARGO_TX_REF: "menahariya_chapa_pending_cargo_tx_ref",
};

/** Same-tab refresh after updating localStorage (storage event only fires across tabs). */
export const AUTH_LOCAL_SYNC_EVENT = "menahariya_auth_local_sync";

/** `CustomEvent` on `window` when Socket.IO pushes data (see `RealtimeBridge`). */
export const REALTIME_DISPATCH_EVENT = "menahariya:realtime";

/** Server → client: new in-app notification for this user. */
export const REALTIME_NOTIFICATION_NEW = "notification:new";

/** Server → client: passenger ↔ admin support chat line item. */
export const REALTIME_SUPPORT_THREAD_MESSAGE = "support:thread_message";

/** Server → client: new ticket refund request (admins). */
export const REALTIME_REFUND_REQUEST_NEW = "refund_request:new";

/** Server → client: refund request approved/rejected (admins) or resolution ping (passenger). */
export const REALTIME_REFUND_REQUEST_UPDATED = "refund_request:updated";

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
  ADMIN_PROFILE: "/admin/profile",
  DASHBOARD: "/dashboard",
  DRIVER_DASHBOARD: "/driver/dashboard",
  DRIVER_TRIPS: "/driver/trips",
  DRIVER_PASSENGERS: "/driver/passengers",
  DRIVER_CARGO: "/driver/cargo",
  DRIVER_NOTIFICATIONS: "/driver/notifications",
  DRIVER_PROFILE: "/driver/profile",
  DRIVER_LOGIN: "/driver/login",
  /** Passenger app */
  PASSENGER_DASHBOARD: "/passenger/dashboard",
  PASSENGER_BOOK: "/passenger/book",
  PASSENGER_TICKETS: "/passenger/tickets",
  /** Refund / cancellation request status (linked from sidebar). */
  PASSENGER_REFUNDS: "/passenger/refunds",
  PASSENGER_PROFILE: "/passenger/profile",
  PASSENGER_CARGO_TRACK: "/passenger/cargo/track",
  PASSENGER_SUPPORT: "/passenger/support",
  PASSENGER_REGISTER: "/register",
  MY_TICKETS: "/my-tickets",
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
  ADMIN_REFUND_REQUESTS: "/admin/refund-requests",
  ADMIN_SUPPORT_CHAT: "/admin/support-chat",
  ADMIN_REPORTS: "/admin/reports",
  /** Read-only joined views */
  ADMIN_RELATIONS: "/admin/relations",
  };
