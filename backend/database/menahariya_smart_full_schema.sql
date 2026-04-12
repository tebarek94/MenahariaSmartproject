-- =============================================================================
-- Menahariya Smart — full MySQL schema (fresh install)
-- =============================================================================
-- Target: MySQL 8.0+ (utf8mb4, JSON columns).
-- Usage: mysql -u root -p < database/menahariya_smart_full_schema.sql
--
-- Single source of truth for a fresh DB. Includes: Chapa payments, QR/download,
-- seat locks (trip-scoped), reports (source/status/summary), support chat,
-- cargo payment_status + payment/cargo links, refund requests, analytics views.
-- Upgrading an old DB: add missing columns/tables by comparing to this file or dump + reimport on a copy.
-- =============================================================================

CREATE DATABASE IF NOT EXISTS menahariya_smart
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE menahariya_smart;

SET FOREIGN_KEY_CHECKS = 0;

-- Drop child-first (views first — depend on tables)
DROP VIEW IF EXISTS vw_seat_vehicle_ticket;
DROP VIEW IF EXISTS vw_cargo_relations;
DROP VIEW IF EXISTS vw_ticket_relations;
DROP VIEW IF EXISTS download_analytics;
DROP VIEW IF EXISTS qr_code_analytics;
DROP VIEW IF EXISTS payment_summary;

DROP TABLE IF EXISTS seat_locks;
DROP TABLE IF EXISTS download_logs;
DROP TABLE IF EXISTS qr_code_usage_logs;
DROP TABLE IF EXISTS payment_webhooks;
DROP TABLE IF EXISTS payment_attempts;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS ticket_refund_requests;
DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS cargo_receipts;
DROP TABLE IF EXISTS cargo;
DROP TABLE IF EXISTS login_history;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS trips;
DROP TABLE IF EXISTS seats;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS support_chat_messages;
DROP TABLE IF EXISTS user_two_factor_email_otp;
DROP TABLE IF EXISTS passenger_registration_pending;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS vehicles;
DROP TABLE IF EXISTS routes;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS roles;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------------
-- RBAC
-- ---------------------------------------------------------------------------
CREATE TABLE roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_roles_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_permissions_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE role_permissions (
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE,
  CONSTRAINT fk_rp_permission FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  email VARCHAR(255) NULL,
  password_hash VARCHAR(255) NOT NULL,
  two_factor_secret VARCHAR(64) NULL DEFAULT NULL,
  two_factor_enabled TINYINT(1) NOT NULL DEFAULT 0,
  role_id INT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_users_phone (phone),
  KEY idx_users_role (role_id),
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_two_factor_email_otp (
  user_id INT NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  purpose VARCHAR(24) NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, purpose),
  KEY idx_user_2fa_email_otp_expires (expires_at),
  CONSTRAINT fk_user_2fa_email_otp_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE passenger_registration_pending (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role_id INT NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  otp_attempts INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_passenger_pending_email (email),
  UNIQUE KEY uk_passenger_pending_phone (phone),
  KEY idx_passenger_pending_expires (expires_at),
  CONSTRAINT fk_passenger_pending_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Routes & fleet
-- ---------------------------------------------------------------------------
CREATE TABLE routes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  origin VARCHAR(255) NOT NULL,
  destination VARCHAR(255) NOT NULL,
  distance_km DECIMAL(10, 2) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE vehicles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plate_number VARCHAR(32) NOT NULL,
  model VARCHAR(120) NULL,
  capacity INT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_vehicles_plate (plate_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Trips & seats
-- ---------------------------------------------------------------------------
CREATE TABLE trips (
  id INT AUTO_INCREMENT PRIMARY KEY,
  route_id INT NOT NULL,
  vehicle_id INT NOT NULL,
  driver_id INT NULL,
  departure_time DATETIME NOT NULL,
  arrival_time DATETIME NULL,
  price DECIMAL(12, 2) NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT 'scheduled',
  KEY idx_trips_route (route_id),
  KEY idx_trips_vehicle (vehicle_id),
  KEY idx_trips_driver (driver_id),
  KEY idx_trips_departure (departure_time),
  CONSTRAINT fk_trips_route FOREIGN KEY (route_id) REFERENCES routes (id) ON DELETE RESTRICT,
  CONSTRAINT fk_trips_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles (id) ON DELETE RESTRICT,
  CONSTRAINT fk_trips_driver FOREIGN KEY (driver_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE seats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vehicle_id INT NOT NULL,
  seat_number INT NOT NULL,
  lock_token VARCHAR(64) NULL,
  lock_expires_at DATETIME NULL,
  locked_by INT NULL,
  locked_at DATETIME NULL,
  lock_trip_id INT NULL COMMENT 'Trip this temporary lock applies to',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_seats_vehicle_number (vehicle_id, seat_number),
  KEY idx_seats_vehicle_seat (vehicle_id, seat_number),
  KEY idx_seats_lock_token (lock_token),
  KEY idx_seats_lock_expires_at (lock_expires_at),
  KEY idx_seats_lock_trip (lock_trip_id),
  CONSTRAINT fk_seats_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles (id) ON DELETE CASCADE,
  CONSTRAINT fk_seats_lock_trip FOREIGN KEY (lock_trip_id) REFERENCES trips (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Tickets (core + QR + download from migrations 002–003)
-- ---------------------------------------------------------------------------
CREATE TABLE tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  trip_id INT NOT NULL,
  seat_id INT NOT NULL,
  ticket_code VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'reserved',
  payment_status VARCHAR(32) NOT NULL DEFAULT 'pending',
  issued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  qr_code_token VARCHAR(255) NULL COMMENT 'Unique token for one-time QR code access',
  qr_code_used TINYINT(1) NOT NULL DEFAULT 0,
  qr_code_used_at TIMESTAMP NULL,
  qr_code_expires_at TIMESTAMP NULL,
  qr_code_ip VARCHAR(45) NULL,
  qr_code_user_agent TEXT NULL,
  download_token VARCHAR(255) NULL COMMENT 'Unique token for one-time ticket download',
  download_used TINYINT(1) NOT NULL DEFAULT 0,
  download_used_at TIMESTAMP NULL,
  download_expires_at TIMESTAMP NULL,
  download_ip VARCHAR(45) NULL,
  download_user_agent TEXT NULL,
  UNIQUE KEY uk_tickets_code (ticket_code),
  KEY idx_tickets_user (user_id),
  KEY idx_tickets_trip (trip_id),
  KEY idx_tickets_seat (seat_id),
  KEY idx_qr_token (qr_code_token),
  KEY idx_qr_used (qr_code_used),
  KEY idx_qr_expires (qr_code_expires_at),
  KEY idx_download_token (download_token),
  KEY idx_download_used (download_used),
  KEY idx_download_expires (download_expires_at),
  CONSTRAINT fk_tickets_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_tickets_trip FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE RESTRICT,
  CONSTRAINT fk_tickets_seat FOREIGN KEY (seat_id) REFERENCES seats (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Refund / cancellation requests (migration 008)
-- ---------------------------------------------------------------------------
CREATE TABLE ticket_refund_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT NOT NULL,
  passenger_user_id INT NOT NULL,
  message VARCHAR(1500) NULL COMMENT 'Optional note from passenger',
  status VARCHAR(24) NOT NULL DEFAULT 'pending' COMMENT 'pending, approved, rejected',
  admin_note VARCHAR(2000) NULL,
  resolved_by_user_id INT NULL,
  resolved_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_refund_ticket_status (ticket_id, status),
  KEY idx_refund_passenger (passenger_user_id),
  KEY idx_refund_status (status),
  KEY idx_refund_created (created_at),
  CONSTRAINT fk_refund_ticket FOREIGN KEY (ticket_id) REFERENCES tickets (id) ON DELETE CASCADE,
  CONSTRAINT fk_refund_passenger FOREIGN KEY (passenger_user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_refund_resolver FOREIGN KEY (resolved_by_user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Payments (base + Chapa from migration 001)
-- ---------------------------------------------------------------------------
CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT NULL,
  cargo_id INT NULL COMMENT 'Cargo fee payment when ticket_id is null',
  amount DECIMAL(10, 2) NOT NULL,
  method VARCHAR(64) NULL,
  transaction_ref VARCHAR(255) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMP NULL,
  chapa_tx_ref VARCHAR(100) NULL COMMENT 'Chapa transaction reference',
  chapa_checkout_url VARCHAR(500) NULL,
  chapa_ref_id VARCHAR(100) NULL,
  payment_method_type ENUM('chapa', 'cash', 'bank_transfer', 'mobile_money') NOT NULL DEFAULT 'chapa',
  currency VARCHAR(3) NOT NULL DEFAULT 'ETB',
  customer_email VARCHAR(255) NULL,
  customer_phone VARCHAR(20) NULL,
  callback_url VARCHAR(500) NULL,
  return_url VARCHAR(500) NULL,
  payment_verified TINYINT(1) NOT NULL DEFAULT 0,
  payment_verified_at TIMESTAMP NULL,
  chapa_response JSON NULL,
  verification_attempts INT NOT NULL DEFAULT 0,
  KEY idx_payments_ticket (ticket_id),
  KEY idx_payments_cargo (cargo_id),
  KEY idx_chapa_tx_ref (chapa_tx_ref),
  KEY idx_payment_method_type (payment_method_type),
  KEY idx_payment_verified (payment_verified),
  CONSTRAINT fk_payments_ticket FOREIGN KEY (ticket_id) REFERENCES tickets (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payment_attempts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  payment_id INT NULL,
  ticket_id INT NULL,
  cargo_id INT NULL,
  user_id INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'ETB',
  chapa_tx_ref VARCHAR(100) NOT NULL,
  status ENUM('pending', 'processing', 'success', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
  checkout_url VARCHAR(500) NULL,
  chapa_response JSON NULL,
  verification_response JSON NULL,
  error_message TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_payment_attempts_chapa_tx (chapa_tx_ref),
  KEY idx_payment_id (payment_id),
  KEY idx_ticket_id (ticket_id),
  KEY idx_pa_cargo (cargo_id),
  KEY idx_user_id (user_id),
  KEY idx_status (status),
  CONSTRAINT fk_pa_payment FOREIGN KEY (payment_id) REFERENCES payments (id) ON DELETE SET NULL,
  CONSTRAINT fk_pa_ticket FOREIGN KEY (ticket_id) REFERENCES tickets (id) ON DELETE SET NULL,
  CONSTRAINT fk_pa_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payment_webhooks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  chapa_tx_ref VARCHAR(100) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  payload JSON NOT NULL,
  processed TINYINT(1) NOT NULL DEFAULT 0,
  processed_at TIMESTAMP NULL,
  error_message TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_chapa_tx_ref (chapa_tx_ref),
  KEY idx_event_type (event_type),
  KEY idx_processed (processed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Cargo
-- ---------------------------------------------------------------------------
CREATE TABLE cargo (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_id INT NOT NULL,
  trip_id INT NOT NULL,
  weight DECIMAL(10, 2) NOT NULL,
  content TEXT NULL,
  fee DECIMAL(12, 2) NOT NULL DEFAULT 0,
  tracking_code VARCHAR(64) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  payment_status VARCHAR(32) NOT NULL DEFAULT 'pending' COMMENT 'Chapa cargo fee: pending, paid',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_cargo_owner (owner_id),
  KEY idx_cargo_trip (trip_id),
  CONSTRAINT fk_cargo_owner FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_cargo_trip FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cargo_receipts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cargo_id INT NULL,
  amount DECIMAL(12, 2) NULL,
  issued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_cargo_receipts_cargo (cargo_id),
  CONSTRAINT fk_cargo_receipts_cargo FOREIGN KEY (cargo_id) REFERENCES cargo (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Deferred FKs: payments / payment_attempts reference cargo (migration 007)
ALTER TABLE payments
  ADD CONSTRAINT fk_payments_cargo FOREIGN KEY (cargo_id) REFERENCES cargo (id) ON DELETE SET NULL;

ALTER TABLE payment_attempts
  ADD CONSTRAINT fk_pa_cargo FOREIGN KEY (cargo_id) REFERENCES cargo (id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- Notifications, reports, login history
-- ---------------------------------------------------------------------------
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  message TEXT NOT NULL,
  channel VARCHAR(32) NOT NULL DEFAULT 'sms',
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_notifications_user (user_id),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(100) NULL,
  date_range VARCHAR(255) NULL,
  file_path VARCHAR(500) NULL,
  source VARCHAR(32) NOT NULL DEFAULT 'manual',
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  summary TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE login_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  device_info VARCHAR(500) NULL,
  ip_address VARCHAR(45) NULL,
  login_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_login_history_user (user_id),
  KEY idx_login_history_time (login_time),
  CONSTRAINT fk_login_history_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Support chat (migration 006)
-- ---------------------------------------------------------------------------
CREATE TABLE support_chat_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  passenger_user_id INT NOT NULL,
  from_user_id INT NOT NULL,
  body VARCHAR(2000) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_support_thread (passenger_user_id, created_at),
  CONSTRAINT fk_support_passenger FOREIGN KEY (passenger_user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_support_from FOREIGN KEY (from_user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Audit / locking aux tables (migrations 002–004)
-- ---------------------------------------------------------------------------
CREATE TABLE qr_code_usage_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT NOT NULL,
  qr_token VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  used_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  success TINYINT(1) NOT NULL DEFAULT 1,
  error_message TEXT NULL,
  KEY idx_ticket_id (ticket_id),
  KEY idx_qr_token (qr_token),
  KEY idx_used_at (used_at),
  CONSTRAINT fk_qr_logs_ticket FOREIGN KEY (ticket_id) REFERENCES tickets (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE download_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT NOT NULL,
  download_token VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  downloaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  success TINYINT(1) NOT NULL DEFAULT 1,
  error_message TEXT NULL,
  KEY idx_dl_ticket (ticket_id),
  KEY idx_dl_token (download_token),
  KEY idx_dl_at (downloaded_at),
  CONSTRAINT fk_dl_ticket FOREIGN KEY (ticket_id) REFERENCES tickets (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE seat_locks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  seat_id INT NOT NULL,
  vehicle_id INT NOT NULL,
  trip_id INT NULL,
  user_id INT NOT NULL,
  lock_token VARCHAR(64) NOT NULL,
  lock_expires_at DATETIME NOT NULL,
  locked_at DATETIME NOT NULL,
  unlocked_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_seat_locks_token (lock_token),
  KEY idx_seat_locks_seat (seat_id),
  KEY idx_seat_locks_vehicle (vehicle_id),
  KEY idx_seat_locks_trip (trip_id),
  KEY idx_seat_locks_user (user_id),
  KEY idx_seat_locks_expires (lock_expires_at),
  CONSTRAINT fk_seat_locks_seat FOREIGN KEY (seat_id) REFERENCES seats (id) ON DELETE CASCADE,
  CONSTRAINT fk_seat_locks_trip FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Views (analytics + optional BI joins)
-- ---------------------------------------------------------------------------
CREATE VIEW payment_summary AS
SELECT
  p.id,
  p.ticket_id,
  p.amount,
  p.currency,
  p.status AS payment_status,
  p.payment_method_type,
  p.chapa_tx_ref,
  p.payment_verified,
  p.paid_at,
  t.user_id AS ticket_user_id,
  u.full_name AS customer_name,
  u.email AS customer_email,
  tr.price AS trip_price,
  r.origin,
  r.destination,
  v.plate_number
FROM payments p
LEFT JOIN tickets t ON t.id = p.ticket_id
LEFT JOIN users u ON u.id = t.user_id
LEFT JOIN trips tr ON tr.id = t.trip_id
LEFT JOIN routes r ON r.id = tr.route_id
LEFT JOIN vehicles v ON v.id = tr.vehicle_id;

CREATE VIEW qr_code_analytics AS
SELECT
  t.id AS ticket_id,
  t.ticket_code,
  t.qr_code_used,
  t.qr_code_used_at,
  t.qr_code_expires_at,
  t.qr_code_ip,
  CASE
    WHEN t.qr_code_expires_at IS NULL THEN 'No expiration'
    WHEN t.qr_code_expires_at < NOW() THEN 'Expired'
    WHEN t.qr_code_used = TRUE THEN 'Used'
    ELSE 'Valid'
  END AS qr_status,
  u.full_name AS passenger_name,
  tr.departure_time,
  r.origin,
  r.destination,
  v.plate_number
FROM tickets t
LEFT JOIN users u ON u.id = t.user_id
LEFT JOIN trips tr ON tr.id = t.trip_id
LEFT JOIN routes r ON r.id = tr.route_id
LEFT JOIN vehicles v ON v.id = tr.vehicle_id;

CREATE VIEW download_analytics AS
SELECT
  t.id AS ticket_id,
  t.ticket_code,
  t.download_used,
  t.download_used_at,
  t.download_expires_at,
  t.download_ip,
  CASE
    WHEN t.download_expires_at IS NULL THEN 'No expiration'
    WHEN t.download_expires_at < NOW() THEN 'Expired'
    WHEN t.download_used = TRUE THEN 'Used'
    ELSE 'Valid'
  END AS download_status,
  u.full_name AS passenger_name,
  tr.departure_time,
  r.origin,
  r.destination,
  v.plate_number
FROM tickets t
LEFT JOIN users u ON u.id = t.user_id
LEFT JOIN trips tr ON tr.id = t.trip_id
LEFT JOIN routes r ON r.id = tr.route_id
LEFT JOIN vehicles v ON v.id = tr.vehicle_id;

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
  pay.status AS pay_status
FROM tickets tk
INNER JOIN users u ON u.id = tk.user_id
INNER JOIN seats s ON s.id = tk.seat_id
INNER JOIN trips t ON t.id = tk.trip_id
INNER JOIN routes r ON r.id = t.route_id
INNER JOIN vehicles v ON v.id = t.vehicle_id
LEFT JOIN users d ON d.id = t.driver_id
LEFT JOIN payments pay ON pay.ticket_id = tk.id;

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

-- ---------------------------------------------------------------------------
-- Seed: roles (aligns with VITE_ADMIN_ROLE_ID default 1 = admin)
-- ---------------------------------------------------------------------------
INSERT INTO roles (id, name) VALUES
  (1, 'admin'),
  (2, 'driver'),
  (3, 'passenger')
ON DUPLICATE KEY UPDATE name = VALUES(name);

ALTER TABLE roles AUTO_INCREMENT = 4;

-- Optional: sample permissions (uncomment to load)
-- INSERT INTO permissions (name) VALUES
--   ('users.read'), ('users.write'),
--   ('trips.read'), ('trips.write');

-- =============================================================================
-- End of schema
-- =============================================================================
