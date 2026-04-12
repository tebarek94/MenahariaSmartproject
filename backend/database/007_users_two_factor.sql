-- TOTP two-step verification for users (admin / driver / passenger).
-- mysql -u root -p menahariya_smart < 007_users_two_factor.sql

ALTER TABLE users
  ADD COLUMN two_factor_secret VARCHAR(64) NULL DEFAULT NULL
    AFTER password_hash,
  ADD COLUMN two_factor_enabled TINYINT(1) NOT NULL DEFAULT 0
    AFTER two_factor_secret;
