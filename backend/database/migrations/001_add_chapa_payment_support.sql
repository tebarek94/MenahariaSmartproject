-- ========================================
-- Chapa Payment Integration Migration Script
-- ========================================
-- This script adds Chapa payment support to the existing Menahariya Smart database
-- Run this script after creating the basic database structure

-- Enable foreign key checks
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Add Chapa-specific columns to existing payments table
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS chapa_tx_ref VARCHAR(100) NULL COMMENT 'Chapa transaction reference',
ADD COLUMN IF NOT EXISTS chapa_checkout_url VARCHAR(500) NULL COMMENT 'Chapa checkout URL',
ADD COLUMN IF NOT EXISTS chapa_ref_id VARCHAR(100) NULL COMMENT 'Chapa reference ID after payment',
ADD COLUMN IF NOT EXISTS payment_method_type ENUM('chapa', 'cash', 'bank_transfer', 'mobile_money') DEFAULT 'chapa' COMMENT 'Payment method type',
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'ETB' COMMENT 'Currency code',
ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255) NULL COMMENT 'Customer email for Chapa',
ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20) NULL COMMENT 'Customer phone for Chapa',
ADD COLUMN IF NOT EXISTS callback_url VARCHAR(500) NULL COMMENT 'Chapa callback URL',
ADD COLUMN IF NOT EXISTS return_url VARCHAR(500) NULL COMMENT 'Chapa return URL',
ADD COLUMN IF NOT EXISTS payment_verified BOOLEAN DEFAULT FALSE COMMENT 'Whether payment is verified with Chapa',
ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMP NULL COMMENT 'Payment verification timestamp',
ADD COLUMN IF NOT EXISTS chapa_response JSON NULL COMMENT 'Raw Chapa API response',
ADD COLUMN IF NOT EXISTS verification_attempts INT DEFAULT 0 COMMENT 'Number of verification attempts';

-- 2. Create payment_attempts table for tracking Chapa transaction attempts
CREATE TABLE IF NOT EXISTS payment_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payment_id INT NULL COMMENT 'Link to payments table',
    ticket_id INT NULL COMMENT 'Link to tickets table',
    user_id INT NOT NULL COMMENT 'User who initiated payment',
    amount DECIMAL(10,2) NOT NULL COMMENT 'Payment amount',
    currency VARCHAR(3) DEFAULT 'ETB',
    chapa_tx_ref VARCHAR(100) NOT NULL UNIQUE COMMENT 'Chapa transaction reference',
    status ENUM('pending', 'processing', 'success', 'failed', 'cancelled') DEFAULT 'pending',
    checkout_url VARCHAR(500) NULL COMMENT 'Chapa checkout URL',
    chapa_response JSON NULL COMMENT 'Raw Chapa initialize response',
    verification_response JSON NULL COMMENT 'Raw Chapa verification response',
    error_message TEXT NULL COMMENT 'Error message if failed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_payment_id (payment_id),
    INDEX idx_ticket_id (ticket_id),
    INDEX idx_user_id (user_id),
    INDEX idx_chapa_tx_ref (chapa_tx_ref),
    INDEX idx_status (status),
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Payment attempts for Chapa transactions';

-- 3. Create payment_webhooks table to log Chapa webhooks
CREATE TABLE IF NOT EXISTS payment_webhooks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    chapa_tx_ref VARCHAR(100) NOT NULL COMMENT 'Chapa transaction reference',
    event_type VARCHAR(50) NOT NULL COMMENT 'Webhook event type',
    payload JSON NOT NULL COMMENT 'Webhook payload',
    processed BOOLEAN DEFAULT FALSE COMMENT 'Whether webhook was processed',
    processed_at TIMESTAMP NULL COMMENT 'Processing timestamp',
    error_message TEXT NULL COMMENT 'Error if processing failed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_chapa_tx_ref (chapa_tx_ref),
    INDEX idx_event_type (event_type),
    INDEX idx_processed (processed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Chapa webhook logs';

-- 4. Add indexes for better performance
ALTER TABLE payments 
ADD INDEX IF NOT EXISTS idx_chapa_tx_ref (chapa_tx_ref),
ADD INDEX IF NOT EXISTS idx_payment_method_type (payment_method_type),
ADD INDEX IF NOT EXISTS idx_payment_verified (payment_verified);

-- 5. Create view for payment analytics (drop if exists first)
DROP VIEW IF EXISTS payment_summary;
CREATE VIEW payment_summary AS
SELECT 
    p.id,
    p.ticket_id,
    p.amount,
    p.currency,
    p.status as payment_status,
    p.payment_method_type,
    p.chapa_tx_ref,
    p.payment_verified,
    p.paid_at,
    t.user_id as ticket_user_id,
    u.full_name as customer_name,
    u.email as customer_email,
    tr.price as trip_price,
    r.origin,
    r.destination,
    v.plate_number
FROM payments p
LEFT JOIN tickets t ON t.id = p.ticket_id
LEFT JOIN users u ON u.id = t.user_id
LEFT JOIN trips tr ON tr.id = t.trip_id
LEFT JOIN routes r ON r.id = tr.route_id
LEFT JOIN vehicles v ON v.id = tr.vehicle_id;

-- 6. Insert sample payment method types (if enum doesn't support new values)
-- This is handled by the ALTER TABLE statements above

-- 7. Create triggers for automatic timestamp updates
DELIMITER //

-- Trigger for payment_attempts updated_at
CREATE TRIGGER IF NOT EXISTS payment_attempts_before_update 
BEFORE UPDATE ON payment_attempts
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END//

DELIMITER ;

-- 8. Add sample data for testing (optional - uncomment for testing)
-- INSERT INTO payments (ticket_id, amount, method, transaction_ref, status, payment_method_type, currency) 
-- VALUES (1, 100.00, 'chapa', 'test_tx_123', 'pending', 'chapa', 'ETB');

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- ========================================
-- Migration Complete
-- ========================================
-- The database is now ready for Chapa payment integration
-- 
-- Next steps:
-- 1. Configure environment variables with Chapa credentials
-- 2. Test the payment initialization endpoint
-- 3. Set up webhook endpoints in Chapa dashboard
-- 4. Verify payment flow works end-to-end
