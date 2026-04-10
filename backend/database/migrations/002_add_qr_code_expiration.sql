-- ========================================
-- Add QR Code One-Time Use Functionality
-- ========================================

USE menahariya_smart;

-- Add QR code expiration and usage tracking fields to tickets table
ALTER TABLE tickets 
ADD COLUMN qr_code_token VARCHAR(255) NULL COMMENT 'Unique token for one-time QR code access',
ADD COLUMN qr_code_used BOOLEAN DEFAULT FALSE COMMENT 'Whether QR code has been used',
ADD COLUMN qr_code_used_at TIMESTAMP NULL COMMENT 'Timestamp when QR code was used',
ADD COLUMN qr_code_expires_at TIMESTAMP NULL COMMENT 'Expiration time for QR code',
ADD COLUMN qr_code_ip VARCHAR(45) NULL COMMENT 'IP address that used the QR code',
ADD COLUMN qr_code_user_agent TEXT NULL COMMENT 'User agent of device that used QR code',
ADD INDEX idx_qr_token (qr_code_token),
ADD INDEX idx_qr_used (qr_code_used),
ADD INDEX idx_qr_expires (qr_code_expires_at);

-- Create QR code usage logs table for audit trail
CREATE TABLE qr_code_usage_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL COMMENT 'Ticket ID',
    qr_token VARCHAR(255) NOT NULL COMMENT 'QR token that was used',
    ip_address VARCHAR(45) NULL COMMENT 'IP address of usage',
    user_agent TEXT NULL COMMENT 'User agent string',
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Usage timestamp',
    success BOOLEAN DEFAULT TRUE COMMENT 'Whether usage was successful',
    error_message TEXT NULL COMMENT 'Error message if usage failed',
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    INDEX idx_ticket_id (ticket_id),
    INDEX idx_qr_token (qr_token),
    INDEX idx_used_at (used_at)
) COMMENT='Audit log for QR code usage';

-- Create view for QR code analytics
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
