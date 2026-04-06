-- Optional MySQL views mirroring API relation joins (reporting / BI tools).
-- Run: mysql -u root -p menahariya_smart < database/admin_relations_views.sql

USE menahariya_smart;

DROP VIEW IF EXISTS vw_ticket_relations;
CREATE VIEW vw_ticket_relations AS
SELECT
  tk.id AS ticket_id,
  tk.ticket_code,
  tk.status AS ticket_status,
  tk.payment_status,
  tk.issued_at,
  u.id AS passenger_id,
  u.full_name AS passenger_name,
  u.phone AS passenger_phone,
  s.id AS seat_id,
  s.seat_number,
  t.id AS trip_id,
  t.departure_time,
  t.arrival_time,
  t.price AS trip_price,
  t.status AS trip_status,
  r.origin,
  r.destination,
  r.distance_km,
  v.id AS vehicle_id,
  v.plate_number,
  v.model AS vehicle_model,
  d.full_name AS driver_name,
  pay.amount AS payment_amount,
  pay.status AS payment_status
FROM tickets tk
INNER JOIN users u ON u.id = tk.user_id
INNER JOIN seats s ON s.id = tk.seat_id
INNER JOIN trips t ON t.id = tk.trip_id
INNER JOIN routes r ON r.id = t.route_id
INNER JOIN vehicles v ON v.id = t.vehicle_id
LEFT JOIN users d ON d.id = t.driver_id
LEFT JOIN payments pay ON pay.ticket_id = tk.id;

DROP VIEW IF EXISTS vw_cargo_relations;
CREATE VIEW vw_cargo_relations AS
SELECT
  c.id AS cargo_id,
  c.weight,
  c.fee,
  c.status AS cargo_status,
  c.created_at,
  o.full_name AS owner_name,
  o.phone AS owner_phone,
  t.departure_time,
  r.origin,
  r.destination,
  v.plate_number,
  d.full_name AS driver_name
FROM cargo c
INNER JOIN users o ON o.id = c.owner_id
INNER JOIN trips t ON t.id = c.trip_id
INNER JOIN routes r ON r.id = t.route_id
INNER JOIN vehicles v ON v.id = t.vehicle_id
LEFT JOIN users d ON d.id = t.driver_id;

DROP VIEW IF EXISTS vw_seat_vehicle_ticket;
CREATE VIEW vw_seat_vehicle_ticket AS
SELECT
  s.id AS seat_id,
  s.seat_number,
  v.plate_number,
  v.model AS vehicle_model,
  tk.id AS ticket_id,
  tk.ticket_code,
  u.full_name AS passenger_name,
  tr.departure_time AS trip_departure,
  r.origin,
  r.destination
FROM seats s
INNER JOIN vehicles v ON v.id = s.vehicle_id
LEFT JOIN tickets tk ON tk.seat_id = s.id
LEFT JOIN users u ON u.id = tk.user_id
LEFT JOIN trips tr ON tr.id = tk.trip_id
LEFT JOIN routes r ON r.id = tr.route_id;
