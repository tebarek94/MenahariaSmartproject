-- ========================================
-- Add One-Time Download Ticket Functionality
-- ========================================

USE menahariya_smart;

-- Add download token fields to tickets table
ALTER TABLE tickets 
ADD COLUMN download_token VARCHAR(255) NULL COMMENT 'Unique token for one-time ticket download',
ADD COLUMN download_used BOOLEAN DEFAULT FALSE COMMENT 'Whether download token has been used',
ADD COLUMN download_used_at TIMESTAMP NULL COMMENT 'Timestamp when download token was used',
ADD COLUMN download_expires_at TIMESTAMP NULL COMMENT 'Expiration time for download token',
ADD COLUMN download_ip VARCHAR(45) NULL COMMENT 'IP address that used the download token',
ADD COLUMN download_user_agent TEXT NULL COMMENT 'User agent of device that used download token',
ADD INDEX idx_download_token (download_token),
ADD INDEX idx_download_used (download_used),
ADD INDEX idx_download_expires (download_expires_at);

-- Create download logs table for audit trail
CREATE TABLE download_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL COMMENT 'Ticket ID',
    download_token VARCHAR(255) NOT NULL COMMENT 'Download token that was used',
    ip_address VARCHAR(45) NULL COMMENT 'IP address of download',
    user_agent TEXT NULL COMMENT 'User agent string',
    downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Download timestamp',
    success BOOLEAN DEFAULT TRUE COMMENT 'Whether download was successful',
    error_message TEXT NULL COMMENT 'Error message if download failed',
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    INDEX idx_ticket_id (ticket_id),
    INDEX idx_download_token (download_token),
    INDEX idx_downloaded_at (downloaded_at)
) COMMENT='Audit log for ticket downloads';

-- Create view for download analytics
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
