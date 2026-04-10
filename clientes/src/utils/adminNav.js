import { ROUTES } from "./constants.js";

/**
 * Sidebar: CRUD resources first (aligned with backend /api/*), then views.
 * `end: true` where a path is a prefix of another (e.g. /admin/roles vs role-permissions).
 */
export const ADMIN_NAV_SECTIONS = [
  {
    title: "CRUD",
    items: [
      { to: ROUTES.DASHBOARD, label: "Overview", end: true },
      { to: ROUTES.ADMIN_USERS, label: "Users", end: true },
      { to: ROUTES.ADMIN_ROLES, label: "Roles", end: true },
      { to: ROUTES.ADMIN_PERMISSIONS, label: "Permissions", end: true },
      { to: ROUTES.ADMIN_ROLE_PERMISSIONS, label: "Role permissions", end: true },
      { to: ROUTES.ADMIN_ROUTES, label: "Routes", end: true },
      { to: ROUTES.ADMIN_VEHICLES, label: "Vehicles", end: true },
      { to: ROUTES.ADMIN_TRIPS, label: "Trips", end: true },
      { to: ROUTES.ADMIN_SEATS, label: "Seats", end: true },
      { to: ROUTES.ADMIN_TICKETS, label: "Tickets", end: true },
      { to: ROUTES.ADMIN_PAYMENTS, label: "Payments", end: true },
      { to: ROUTES.ADMIN_CARGO, label: "Cargo", end: true },
      { to: ROUTES.ADMIN_CARGO_RECEIPTS, label: "Cargo receipts", end: true },
      { to: ROUTES.ADMIN_LOGIN_HISTORY, label: "Login history", end: true },
      { to: ROUTES.ADMIN_NOTIFICATIONS, label: "Notifications", end: true },
      { to: ROUTES.ADMIN_REPORTS, label: "Reports", end: true },
    ],
  },
  {
    title: "Account",
    items: [
      { to: ROUTES.ADMIN_PROFILE, label: "Profile", end: true },
    ],
  },
  {
    title: "Views",
    items: [
      { to: ROUTES.ADMIN_RELATIONS, label: "All relations", end: true },
    ],
  },
];

/** Flat list (e.g. tests or legacy imports) */
export const ADMIN_NAV = ADMIN_NAV_SECTIONS.flatMap((s) => s.items);

export const ADMIN_PAGE_TITLES = {
  [ROUTES.DASHBOARD]: "Overview",
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
  [ROUTES.ADMIN_PAYMENTS]: "Payments",
  [ROUTES.ADMIN_CARGO]: "Cargo",
  [ROUTES.ADMIN_CARGO_RECEIPTS]: "Cargo receipts",
  [ROUTES.ADMIN_LOGIN_HISTORY]: "Login history",
  [ROUTES.ADMIN_NOTIFICATIONS]: "Notifications",
  [ROUTES.ADMIN_REPORTS]: "Reports",
  [ROUTES.ADMIN_RELATIONS]: "Relations overview",
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
