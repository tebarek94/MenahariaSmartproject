-- Passenger self-registration: pending row until email OTP is verified.
-- Run after base schema: mysql -u root -p menahariya_smart < 006_passenger_registration_otp.sql

CREATE TABLE IF NOT EXISTS passenger_registration_pending (
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
