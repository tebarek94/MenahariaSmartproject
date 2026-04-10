import { queryAsync } from "../config/db.js";
import * as ticketModel from "./ticketModel.js";
import * as tripModel from "./tripModel.js";
import * as cargoModel from "./cargoModel.js";
import * as notificationModel from "./notificationModel.js";

async function scalarCount(sql, key = "n") {
  const [row] = await queryAsync(sql);
  return Number(row?.[key] ?? 0);
}

/** Reports table shape varies until migration 005 (source, status, summary). */
function normalizeReportRow(r) {
  if (!r || typeof r !== "object") return r;
  return {
    id: r.id,
    type: r.type ?? null,
    date_range: r.date_range ?? null,
    file_path: r.file_path ?? null,
    source: r.source ?? "manual",
    status: r.status ?? "active",
    summary: r.summary ?? null,
    created_at: r.created_at ?? null,
  };
}

export async function getAdminDashboardView() {
  const [
    usersCount,
    rolesCount,
    vehiclesCount,
    routesCount,
    tripsCount,
    ticketsCount,
    cargoCount,
    paymentsCount,
    notificationsCount,
    reportsCount,
  ] = await Promise.all([
    scalarCount("SELECT COUNT(*) AS n FROM users", "n"),
    scalarCount("SELECT COUNT(*) AS n FROM roles", "n"),
    scalarCount("SELECT COUNT(*) AS n FROM vehicles", "n"),
    scalarCount("SELECT COUNT(*) AS n FROM routes", "n"),
    scalarCount("SELECT COUNT(*) AS n FROM trips", "n"),
    scalarCount("SELECT COUNT(*) AS n FROM tickets", "n"),
    scalarCount("SELECT COUNT(*) AS n FROM cargo", "n"),
    scalarCount("SELECT COUNT(*) AS n FROM payments", "n"),
    scalarCount("SELECT COUNT(*) AS n FROM notifications", "n"),
    scalarCount("SELECT COUNT(*) AS n FROM reports", "n"),
  ]);

  const [revenueRow] = await queryAsync(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE status = 'completed'`
  );

  const [
    ticketsByStatus,
    tripsByStatus,
    cargoByStatus,
    paymentsByStatus,
    usersWithRoles,
    routesCatalog,
    rolesWithPermissionCounts,
    vehiclesWithSeats,
    tripsWithRelations,
    ticketsWithRelations,
    cargoWithRelations,
    paymentsWithRelations,
    recentNotifications,
    recentReports,
    recentLoginHistory,
  ] = await Promise.all([
    queryAsync(
      `SELECT status, COUNT(*) AS count FROM tickets GROUP BY status ORDER BY status`
    ),
    queryAsync(
      `SELECT status, COUNT(*) AS count FROM trips GROUP BY status ORDER BY status`
    ),
    queryAsync(
      `SELECT status, COUNT(*) AS count FROM cargo GROUP BY status ORDER BY status`
    ),
    queryAsync(
      `SELECT status, COUNT(*) AS count FROM payments GROUP BY status ORDER BY status`
    ),
    queryAsync(
      `SELECT u.id, u.full_name, u.phone, u.email, u.status AS user_status, u.created_at,
              r.id AS role_id, r.name AS role_name
       FROM users u
       INNER JOIN roles r ON r.id = u.role_id
       ORDER BY u.id DESC
       LIMIT 40`
    ),
    queryAsync(
      `SELECT id, origin, destination, distance_km, created_at
       FROM routes
       ORDER BY id DESC
       LIMIT 50`
    ),
    queryAsync(
      `SELECT r.id, r.name AS role_name, r.created_at,
              COUNT(rp.permission_id) AS permission_count
       FROM roles r
       LEFT JOIN role_permissions rp ON rp.role_id = r.id
       GROUP BY r.id, r.name, r.created_at
       ORDER BY r.id`
    ),
    queryAsync(
      `SELECT v.id, v.plate_number, v.model, v.capacity, v.status AS vehicle_status, v.created_at,
              COUNT(s.id) AS seats_configured
       FROM vehicles v
       LEFT JOIN seats s ON s.vehicle_id = v.id
       GROUP BY v.id, v.plate_number, v.model, v.capacity, v.status, v.created_at
       ORDER BY v.id DESC
       LIMIT 30`
    ),
    queryAsync(
      `SELECT t.id AS trip_id,
              t.departure_time, t.arrival_time, t.price, t.status AS trip_status,
              r.id AS route_id, r.origin, r.destination, r.distance_km,
              v.id AS vehicle_id, v.plate_number, v.model AS vehicle_model,
              v.capacity AS vehicle_capacity, v.status AS vehicle_operational_status,
              d.id AS driver_user_id, d.full_name AS driver_name, d.phone AS driver_phone
       FROM trips t
       INNER JOIN routes r ON r.id = t.route_id
       INNER JOIN vehicles v ON v.id = t.vehicle_id
       LEFT JOIN users d ON d.id = t.driver_id
       ORDER BY t.departure_time DESC
       LIMIT 25`
    ),
    queryAsync(
      `SELECT tk.id AS ticket_id, tk.ticket_code, tk.status AS ticket_status,
              tk.payment_status, tk.issued_at,
              u.id AS passenger_id, u.full_name AS passenger_name, u.phone AS passenger_phone,
              s.seat_number,
              t.id AS trip_id, t.departure_time, t.price AS trip_price, t.status AS trip_status,
              r.origin, r.destination,
              v.plate_number
       FROM tickets tk
       INNER JOIN users u ON u.id = tk.user_id
       INNER JOIN seats s ON s.id = tk.seat_id
       INNER JOIN trips t ON t.id = tk.trip_id
       INNER JOIN routes r ON r.id = t.route_id
       INNER JOIN vehicles v ON v.id = t.vehicle_id
       ORDER BY tk.issued_at DESC
       LIMIT 25`
    ),
    queryAsync(
      `SELECT c.id AS cargo_id, c.weight, c.content, c.fee, c.tracking_code,
              c.status AS cargo_status, c.created_at,
              o.id AS owner_id, o.full_name AS owner_name, o.phone AS owner_phone,
              t.id AS trip_id, t.departure_time, t.status AS trip_status,
              r.origin, r.destination,
              v.plate_number
       FROM cargo c
       INNER JOIN users o ON o.id = c.owner_id
       INNER JOIN trips t ON t.id = c.trip_id
       INNER JOIN routes r ON r.id = t.route_id
       INNER JOIN vehicles v ON v.id = t.vehicle_id
       ORDER BY c.created_at DESC
       LIMIT 25`
    ),
    queryAsync(
      `SELECT p.id AS payment_id, p.ticket_id, p.amount, p.method, p.transaction_ref,
              p.status AS payment_status, p.paid_at,
              u.full_name AS passenger_name, u.phone AS passenger_phone,
              r.origin, r.destination, t.departure_time
       FROM payments p
       LEFT JOIN tickets tk ON tk.id = p.ticket_id
       LEFT JOIN users u ON u.id = tk.user_id
       LEFT JOIN trips t ON t.id = tk.trip_id
       LEFT JOIN routes r ON r.id = t.route_id
       ORDER BY p.id DESC
       LIMIT 25`
    ),
    queryAsync(
      `SELECT n.id, n.user_id, u.full_name AS user_name,
              n.message, n.channel, n.status, n.created_at
       FROM notifications n
       LEFT JOIN users u ON u.id = n.user_id
       ORDER BY n.created_at DESC
       LIMIT 15`
    ),
    queryAsync(
      `SELECT * FROM reports ORDER BY created_at DESC LIMIT 10`
    ).then((rows) => rows.map(normalizeReportRow)),
    queryAsync(
      `SELECT lh.id, lh.user_id, u.full_name AS user_name,
              lh.device_info, lh.ip_address, lh.login_time
       FROM login_history lh
       LEFT JOIN users u ON u.id = lh.user_id
       ORDER BY lh.login_time DESC
       LIMIT 20`
    ),
  ]);

  return {
    view: "admin",
    summary: {
      counts: {
        users: usersCount,
        roles: rolesCount,
        routes: routesCount,
        vehicles: vehiclesCount,
        trips: tripsCount,
        tickets: ticketsCount,
        cargo: cargoCount,
        payments: paymentsCount,
        notifications: notificationsCount,
        reports: reportsCount,
      },
      revenue_completed_total: Number(revenueRow?.total ?? 0),
      breakdowns: {
        tickets_by_status: ticketsByStatus,
        trips_by_status: tripsByStatus,
        cargo_by_status: cargoByStatus,
        payments_by_status: paymentsByStatus,
      },
    },
    users_with_roles: usersWithRoles,
    routes: routesCatalog,
    roles_with_permission_counts: rolesWithPermissionCounts,
    vehicles_with_seat_counts: vehiclesWithSeats,
    trips_linked: tripsWithRelations,
    tickets_linked: ticketsWithRelations,
    cargo_linked: cargoWithRelations,
    payments_linked: paymentsWithRelations,
    notifications_recent: recentNotifications,
    reports_recent: recentReports,
    login_history_recent: recentLoginHistory,
  };
}

export async function getDriverDashboardView(driverUserId) {
  const driverNotificationCountRows = await queryAsync(
    `SELECT COUNT(*) AS n FROM notifications
     WHERE user_id IS NULL OR user_id = ?`,
    [driverUserId]
  );

  const [
    tripsTotalRow,
    activeTripsRow,
    ticketsOnTripsRow,
    cargoOnTripsRow,
    paymentsOnTripsRow,
    routesDistinctRow,
    vehiclesDistinctRow,
    revenueRow,
    ticketsByStatus,
    tripsByStatus,
    cargoByStatus,
    paymentsByStatus,
    usersWithRoles,
    routesCatalog,
    rolesWithPermissionCounts,
    vehiclesWithSeats,
    tripsWithRelations,
    ticketsWithRelations,
    cargoWithRelations,
    paymentsWithRelations,
    recentNotifications,
    recentReports,
    recentLoginHistory,
  ] = await Promise.all([
    queryAsync(
      `SELECT COUNT(*) AS n FROM trips WHERE driver_id = ?`,
      [driverUserId]
    ),
    queryAsync(
      `SELECT COUNT(*) AS n FROM trips
       WHERE driver_id = ? AND status IN ('scheduled','ongoing')`,
      [driverUserId]
    ),
    queryAsync(
      `SELECT COUNT(*) AS n FROM tickets tk
       INNER JOIN trips t ON t.id = tk.trip_id
       WHERE t.driver_id = ?`,
      [driverUserId]
    ),
    queryAsync(
      `SELECT COUNT(*) AS n FROM cargo c
       INNER JOIN trips t ON t.id = c.trip_id
       WHERE t.driver_id = ?`,
      [driverUserId]
    ),
    queryAsync(
      `SELECT COUNT(*) AS n FROM payments p
       INNER JOIN tickets tk ON tk.id = p.ticket_id
       INNER JOIN trips t ON t.id = tk.trip_id
       WHERE t.driver_id = ?`,
      [driverUserId]
    ),
    queryAsync(
      `SELECT COUNT(DISTINCT t.route_id) AS n FROM trips t WHERE t.driver_id = ?`,
      [driverUserId]
    ),
    queryAsync(
      `SELECT COUNT(DISTINCT t.vehicle_id) AS n FROM trips t WHERE t.driver_id = ?`,
      [driverUserId]
    ),
    queryAsync(
      `SELECT COALESCE(SUM(p.amount), 0) AS total FROM payments p
       INNER JOIN tickets tk ON tk.id = p.ticket_id
       INNER JOIN trips t ON t.id = tk.trip_id
       WHERE t.driver_id = ? AND p.status = 'completed'`,
      [driverUserId]
    ),
    queryAsync(
      `SELECT tk.status, COUNT(*) AS count FROM tickets tk
       INNER JOIN trips t ON t.id = tk.trip_id
       WHERE t.driver_id = ?
       GROUP BY tk.status ORDER BY tk.status`,
      [driverUserId]
    ),
    queryAsync(
      `SELECT status, COUNT(*) AS count FROM trips
       WHERE driver_id = ?
       GROUP BY status ORDER BY status`,
      [driverUserId]
    ),
    queryAsync(
      `SELECT c.status, COUNT(*) AS count FROM cargo c
       INNER JOIN trips t ON t.id = c.trip_id
       WHERE t.driver_id = ?
       GROUP BY c.status ORDER BY c.status`,
      [driverUserId]
    ),
    queryAsync(
      `SELECT p.status, COUNT(*) AS count FROM payments p
       INNER JOIN tickets tk ON tk.id = p.ticket_id
       INNER JOIN trips t ON t.id = tk.trip_id
       WHERE t.driver_id = ?
       GROUP BY p.status ORDER BY p.status`,
      [driverUserId]
    ),
    Promise.resolve([]),
    queryAsync(
      `SELECT r.id, r.origin, r.destination, r.distance_km, r.created_at
       FROM routes r
       INNER JOIN trips t ON t.route_id = r.id AND t.driver_id = ?
       GROUP BY r.id, r.origin, r.destination, r.distance_km, r.created_at
       ORDER BY r.id DESC
       LIMIT 50`,
      [driverUserId]
    ),
    Promise.resolve([]),
    queryAsync(
      `SELECT v.id, v.plate_number, v.model, v.capacity, v.status AS vehicle_status, v.created_at,
              COUNT(s.id) AS seats_configured
       FROM vehicles v
       INNER JOIN trips tr ON tr.vehicle_id = v.id AND tr.driver_id = ?
       LEFT JOIN seats s ON s.vehicle_id = v.id
       GROUP BY v.id, v.plate_number, v.model, v.capacity, v.status, v.created_at
       ORDER BY v.id DESC
       LIMIT 30`,
      [driverUserId]
    ),
    queryAsync(
      `SELECT t.id AS trip_id,
              t.departure_time, t.arrival_time, t.price, t.status AS trip_status,
              r.id AS route_id, r.origin, r.destination, r.distance_km,
              v.id AS vehicle_id, v.plate_number, v.model AS vehicle_model,
              v.capacity AS vehicle_capacity, v.status AS vehicle_operational_status,
              d.id AS driver_user_id, d.full_name AS driver_name, d.phone AS driver_phone
       FROM trips t
       INNER JOIN routes r ON r.id = t.route_id
       INNER JOIN vehicles v ON v.id = t.vehicle_id
       LEFT JOIN users d ON d.id = t.driver_id
       WHERE t.driver_id = ?
       ORDER BY t.departure_time DESC
       LIMIT 25`,
      [driverUserId]
    ),
    queryAsync(
      `SELECT tk.id AS ticket_id, tk.ticket_code, tk.status AS ticket_status,
              tk.payment_status, tk.issued_at,
              u.id AS passenger_id, u.full_name AS passenger_name, u.phone AS passenger_phone,
              s.seat_number,
              t.id AS trip_id, t.departure_time, t.price AS trip_price, t.status AS trip_status,
              r.origin, r.destination,
              v.plate_number
       FROM tickets tk
       INNER JOIN users u ON u.id = tk.user_id
       INNER JOIN seats s ON s.id = tk.seat_id
       INNER JOIN trips t ON t.id = tk.trip_id
       INNER JOIN routes r ON r.id = t.route_id
       INNER JOIN vehicles v ON v.id = t.vehicle_id
       WHERE t.driver_id = ?
       ORDER BY tk.issued_at DESC
       LIMIT 25`,
      [driverUserId]
    ),
    queryAsync(
      `SELECT c.id AS cargo_id, c.weight, c.content, c.fee, c.tracking_code,
              c.status AS cargo_status, c.created_at,
              o.id AS owner_id, o.full_name AS owner_name, o.phone AS owner_phone,
              t.id AS trip_id, t.departure_time, t.status AS trip_status,
              r.origin, r.destination,
              v.plate_number
       FROM cargo c
       INNER JOIN users o ON o.id = c.owner_id
       INNER JOIN trips t ON t.id = c.trip_id
       INNER JOIN routes r ON r.id = t.route_id
       INNER JOIN vehicles v ON v.id = t.vehicle_id
       WHERE t.driver_id = ?
       ORDER BY c.created_at DESC
       LIMIT 25`,
      [driverUserId]
    ),
    queryAsync(
      `SELECT p.id AS payment_id, p.ticket_id, p.amount, p.method, p.transaction_ref,
              p.status AS payment_status, p.paid_at,
              u.full_name AS passenger_name, u.phone AS passenger_phone,
              r.origin, r.destination, t.departure_time
       FROM payments p
       INNER JOIN tickets tk ON tk.id = p.ticket_id
       INNER JOIN users u ON u.id = tk.user_id
       INNER JOIN trips t ON t.id = tk.trip_id
       INNER JOIN routes r ON r.id = t.route_id
       WHERE t.driver_id = ?
       ORDER BY p.id DESC
       LIMIT 25`,
      [driverUserId]
    ),
    queryAsync(
      `SELECT n.id, n.user_id, u.full_name AS user_name,
              n.message, n.channel, n.status, n.created_at
       FROM notifications n
       LEFT JOIN users u ON u.id = n.user_id
       WHERE n.user_id IS NULL OR n.user_id = ?
       ORDER BY n.created_at DESC
       LIMIT 15`,
      [driverUserId]
    ),
    Promise.resolve([]),
    Promise.resolve([]),
  ]);

  return {
    view: "driver",
    driver_user_id: driverUserId,
    summary: {
      counts: {
        trips: Number(tripsTotalRow?.[0]?.n ?? 0),
        active_trips: Number(activeTripsRow?.[0]?.n ?? 0),
        tickets: Number(ticketsOnTripsRow?.[0]?.n ?? 0),
        cargo: Number(cargoOnTripsRow?.[0]?.n ?? 0),
        payments: Number(paymentsOnTripsRow?.[0]?.n ?? 0),
        routes: Number(routesDistinctRow?.[0]?.n ?? 0),
        vehicles: Number(vehiclesDistinctRow?.[0]?.n ?? 0),
        users: 0,
        roles: 0,
        notifications: Number(driverNotificationCountRows?.[0]?.n ?? 0),
        reports: 0,
      },
      revenue_completed_total: Number(revenueRow?.[0]?.total ?? 0),
      breakdowns: {
        tickets_by_status: ticketsByStatus,
        trips_by_status: tripsByStatus,
        cargo_by_status: cargoByStatus,
        payments_by_status: paymentsByStatus,
      },
    },
    users_with_roles: usersWithRoles,
    routes: routesCatalog,
    roles_with_permission_counts: rolesWithPermissionCounts,
    vehicles_with_seat_counts: vehiclesWithSeats,
    trips_linked: tripsWithRelations,
    tickets_linked: ticketsWithRelations,
    cargo_linked: cargoWithRelations,
    payments_linked: paymentsWithRelations,
    notifications_recent: recentNotifications,
    reports_recent: recentReports,
    login_history_recent: recentLoginHistory,
  };
}

export async function getPassengerDashboardView(userId) {
  const tickets = await ticketModel.getTicketsWithDetailsForPassenger(userId);
  const cargo = await cargoModel.getCargoByOwnerId(userId);
  const notifications = await notificationModel.getNotificationsForUserId(userId);

  const [userRow] = await queryAsync(
    `SELECT id, full_name, phone, email, status, role_id, created_at FROM users WHERE id = ?`,
    [userId]
  );

  const browseTrips = await tripModel.getTripsForPassengerBrowse();

  return {
    view: "passenger",
    profile: userRow ?? null,
    my_tickets: tickets,
    my_cargo: cargo,
    notifications,
    trips_available_to_book: browseTrips,
  };
}

/** Clamp limit query param for relation views (default 50, max 200). */
export function parseViewLimit(raw) {
  const n = parseInt(String(raw ?? "50"), 10);
  if (!Number.isFinite(n)) return 50;
  return Math.min(Math.max(n, 1), 200);
}

/** Ticket → passenger user, seat, trip, route, vehicle, driver, payment. */
export async function getTicketsRelationsView(limit) {
  const lim = parseViewLimit(limit);
  const rows = await queryAsync(
    `SELECT
       tk.id AS ticket_id,
       tk.ticket_code,
       tk.status AS ticket_status,
       tk.payment_status,
       tk.issued_at,
       u.id AS passenger_id,
       u.full_name AS passenger_name,
       u.phone AS passenger_phone,
       u.email AS passenger_email,
       s.id AS seat_id,
       s.seat_number,
       t.id AS trip_id,
       t.departure_time,
       t.arrival_time,
       t.price AS trip_price,
       t.status AS trip_status,
       r.id AS route_id,
       r.origin,
       r.destination,
       r.distance_km,
       v.id AS vehicle_id,
       v.plate_number,
       v.model AS vehicle_model,
       v.capacity AS vehicle_capacity,
       d.id AS driver_id,
       d.full_name AS driver_name,
       d.phone AS driver_phone,
       pay.id AS payment_id,
       pay.amount AS payment_amount,
       pay.method AS payment_method,
       pay.status AS payment_record_status,
       pay.paid_at
     FROM tickets tk
     INNER JOIN users u ON u.id = tk.user_id
     INNER JOIN seats s ON s.id = tk.seat_id
     INNER JOIN trips t ON t.id = tk.trip_id
     INNER JOIN routes r ON r.id = t.route_id
     INNER JOIN vehicles v ON v.id = t.vehicle_id
     LEFT JOIN users d ON d.id = t.driver_id
     LEFT JOIN payments pay ON pay.ticket_id = tk.id
     ORDER BY tk.issued_at DESC
     LIMIT ?`,
    [lim]
  );
  return { view: "tickets_relations", limit: lim, rows };
}

/** Vehicle → seat counts, trip counts; recent trips sample per query. */
export async function getVehiclesRelationsView(limit) {
  const lim = parseViewLimit(limit);
  const fleet = await queryAsync(
    `SELECT
       v.id AS vehicle_id,
       v.plate_number,
       v.model,
       v.capacity,
       v.status AS vehicle_status,
       v.created_at,
       (SELECT COUNT(*) FROM seats WHERE vehicle_id = v.id) AS seats_configured,
       (SELECT COUNT(*) FROM trips WHERE vehicle_id = v.id) AS trips_total
     FROM vehicles v
     ORDER BY v.id DESC
     LIMIT ?`,
    [lim]
  );
  const recentTripsByVehicle = await queryAsync(
    `SELECT
       t.id AS trip_id,
       t.vehicle_id,
       t.departure_time,
       t.status AS trip_status,
       t.price,
       r.origin,
       r.destination,
       d.full_name AS driver_name
     FROM trips t
     INNER JOIN routes r ON r.id = t.route_id
     LEFT JOIN users d ON d.id = t.driver_id
     ORDER BY t.departure_time DESC
     LIMIT ?`,
    [Math.min(lim * 3, 200)]
  );
  return {
    view: "vehicles_relations",
    limit: lim,
    fleet_summary: fleet,
    recent_trips_sample: recentTripsByVehicle,
  };
}

/** Cargo → owner user, trip, route, vehicle, driver. */
export async function getCargoRelationsView(limit) {
  const lim = parseViewLimit(limit);
  const rows = await queryAsync(
    `SELECT
       c.id AS cargo_id,
       c.weight,
       c.content,
       c.fee,
       c.tracking_code,
       c.status AS cargo_status,
       c.created_at,
       o.id AS owner_id,
       o.full_name AS owner_name,
       o.phone AS owner_phone,
       t.id AS trip_id,
       t.departure_time,
       t.status AS trip_status,
       r.id AS route_id,
       r.origin,
       r.destination,
       v.id AS vehicle_id,
       v.plate_number,
       v.model AS vehicle_model,
       d.id AS driver_id,
       d.full_name AS driver_name,
       d.phone AS driver_phone
     FROM cargo c
     INNER JOIN users o ON o.id = c.owner_id
     INNER JOIN trips t ON t.id = c.trip_id
     INNER JOIN routes r ON r.id = t.route_id
     INNER JOIN vehicles v ON v.id = t.vehicle_id
     LEFT JOIN users d ON d.id = t.driver_id
     ORDER BY c.created_at DESC
     LIMIT ?`,
    [lim]
  );
  return { view: "cargo_relations", limit: lim, rows };
}

/** Seat → vehicle; optional ticket / passenger / trip / route (one row per ticket if history exists). */
export async function getSeatsRelationsView(limit) {
  const lim = parseViewLimit(limit);
  const rows = await queryAsync(
    `SELECT
       s.id AS seat_id,
       s.seat_number,
       s.created_at AS seat_created_at,
       v.id AS vehicle_id,
       v.plate_number,
       v.model AS vehicle_model,
       v.capacity AS vehicle_capacity,
       v.status AS vehicle_status,
       tk.id AS ticket_id,
       tk.ticket_code,
       tk.status AS ticket_status,
       tk.issued_at AS ticket_issued_at,
       u.id AS passenger_id,
       u.full_name AS passenger_name,
       u.phone AS passenger_phone,
       tr.id AS trip_id,
       tr.departure_time AS trip_departure,
       r.origin,
       r.destination
     FROM seats s
     INNER JOIN vehicles v ON v.id = s.vehicle_id
     LEFT JOIN tickets tk ON tk.seat_id = s.id
     LEFT JOIN users u ON u.id = tk.user_id
     LEFT JOIN trips tr ON tr.id = tk.trip_id
     LEFT JOIN routes r ON r.id = tr.route_id
     ORDER BY v.plate_number, s.seat_number, tk.issued_at DESC
     LIMIT ?`,
    [lim]
  );
  return { view: "seats_relations", limit: lim, rows };
}

/** All relation blocks in one response (admin analytics screen). */
export async function getRelationsOverviewView(limit) {
  const lim = parseViewLimit(limit);
  const [ticketsV, vehiclesV, cargoV, seatsV] = await Promise.all([
    getTicketsRelationsView(lim),
    getVehiclesRelationsView(lim),
    getCargoRelationsView(lim),
    getSeatsRelationsView(lim),
  ]);
  return {
    view: "relations_overview",
    limit: lim,
    tickets_relations: ticketsV,
    vehicles_relations: vehiclesV,
    cargo_relations: cargoV,
    seats_relations: seatsV,
  };
}
