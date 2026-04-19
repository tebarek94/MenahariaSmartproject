import { ROUTES } from "./constants.js";

/**
 * Sidebar order: overview → team & access → network → bookings & money → cargo → comms → insights → account.
 * `end: true` where a path is a prefix of another (e.g. /admin/roles vs role-permissions).
 */
export const ADMIN_NAV_SECTIONS = [
  {
    title: "Overview",
    items: [
      { to: ROUTES.DASHBOARD, label: "Overview", end: true },
      { to: ROUTES.ADMIN_LIVE_GPS, label: "Live GPS", end: true },
    ],
  },
  {
    title: "Team & access",
    items: [
      { to: ROUTES.ADMIN_USERS, label: "Users", end: true },
      { to: ROUTES.ADMIN_ROLES, label: "Roles", end: true },
      { to: ROUTES.ADMIN_PERMISSIONS, label: "Permissions", end: true },
      { to: ROUTES.ADMIN_ROLE_PERMISSIONS, label: "Role permissions", end: true },
      { to: ROUTES.ADMIN_LOGIN_HISTORY, label: "Login history", end: true },
      { to: ROUTES.ADMIN_AUDIT_LOG, label: "Audit log", end: true },
    ],
  },
  {
    title: "Network & fleet",
    items: [
      { to: ROUTES.ADMIN_ROUTES, label: "Routes", end: true },
      { to: ROUTES.ADMIN_VEHICLES, label: "Vehicles", end: true },
      { to: ROUTES.ADMIN_TRIPS, label: "Trips", end: true },
      { to: ROUTES.ADMIN_SEATS, label: "Seats", end: true },
    ],
  },
  {
    title: "Bookings & payments",
    items: [
      { to: ROUTES.ADMIN_TICKETS, label: "Tickets", end: true },
      { to: ROUTES.ADMIN_REFUND_REQUESTS, label: "Refund requests", end: true },
      { to: ROUTES.ADMIN_PAYMENTS, label: "Payments", end: true },
    ],
  },
  {
    title: "Cargo",
    items: [{ to: ROUTES.ADMIN_CARGO, label: "Cargo", end: true }],
  },
  {
    title: "Communication",
    items: [
      { to: ROUTES.ADMIN_NOTIFICATIONS, label: "Notifications", end: true },
      { to: ROUTES.ADMIN_SUPPORT_CHAT, label: "Support chat", end: true },
    ],
  },
  {
    title: "Reports",
    items: [{ to: ROUTES.ADMIN_REPORTS, label: "Reports", end: true }],
  },
  {
    title: "Account",
    items: [{ to: ROUTES.ADMIN_PROFILE, label: "Profile", end: true }],
  },
];

/** Flat list (e.g. tests or legacy imports) — follows sidebar order */
export const ADMIN_NAV = ADMIN_NAV_SECTIONS.flatMap((s) => s.items);

export const ADMIN_PAGE_TITLES = {
  [ROUTES.DASHBOARD]: "Operations overview",
  [ROUTES.ADMIN_LIVE_GPS]: "Live GPS",
  [ROUTES.ADMIN_PROFILE]: "Profile",
  [ROUTES.ADMIN_USERS]: "Users",
  [ROUTES.ADMIN_ROLES]: "Roles",
  [ROUTES.ADMIN_PERMISSIONS]: "Permissions",
  [ROUTES.ADMIN_ROLE_PERMISSIONS]: "Role permissions",
  [ROUTES.ADMIN_ROUTES]: "Routes",
  [ROUTES.ADMIN_VEHICLES]: "Vehicles",
  [ROUTES.ADMIN_TRIPS]: "Trips",
  [ROUTES.ADMIN_SEATS]: "Seats",
  [ROUTES.ADMIN_TICKETS]: "Tickets",
  [ROUTES.ADMIN_REFUND_REQUESTS]: "Refund requests",
  [ROUTES.ADMIN_PAYMENTS]: "Payments",
  [ROUTES.ADMIN_CARGO]: "Cargo",
  [ROUTES.ADMIN_LOGIN_HISTORY]: "Login history",
  [ROUTES.ADMIN_AUDIT_LOG]: "Audit log",
  [ROUTES.ADMIN_NOTIFICATIONS]: "Notifications",
  [ROUTES.ADMIN_SUPPORT_CHAT]: "Support chat",
  [ROUTES.ADMIN_REPORTS]: "Reports",
};

export function adminTitleForPath(pathname) {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (ADMIN_PAGE_TITLES[path]) return ADMIN_PAGE_TITLES[path];

  const entries = Object.entries(ADMIN_PAGE_TITLES).filter(([routeKey]) => {
    if (routeKey === ROUTES.DASHBOARD) return false;
    return path === routeKey || path.startsWith(`${routeKey}/`);
  });
  if (!entries.length) return "Admin";
  entries.sort((a, b) => b[0].length - a[0].length);
  return entries[0][1];
}
