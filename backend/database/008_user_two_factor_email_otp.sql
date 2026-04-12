-- Email OTP for two-step verification (enable / disable / login second step).
-- mysql -u root -p menahariya_smart < 008_user_two_factor_email_otp.sql

CREATE TABLE IF NOT EXISTS user_two_factor_email_otp (
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
