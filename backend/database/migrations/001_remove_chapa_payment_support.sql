-- ========================================
-- Chapa Payment Integration Rollback Script
-- ========================================
-- This script removes Chapa payment support from the database
-- Use this if you need to rollback the Chapa integration

-- Disable foreign key checks
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Drop payment_attempts table
DROP TABLE IF EXISTS payment_attempts;

-- 2. Drop payment_webhooks table
DROP TABLE IF EXISTS payment_webhooks;

-- 3. Drop payment_summary view
DROP VIEW IF EXISTS payment_summary;

-- 4. Remove Chapa-specific columns from payments table
ALTER TABLE payments 
DROP COLUMN IF EXISTS chapa_tx_ref,
DROP COLUMN IF EXISTS chapa_checkout_url,
DROP COLUMN IF EXISTS chapa_ref_id,
DROP COLUMN IF EXISTS payment_method_type,
DROP COLUMN IF EXISTS currency,
DROP COLUMN IF EXISTS customer_email,
DROP COLUMN IF EXISTS customer_phone,
DROP COLUMN IF EXISTS callback_url,
DROP COLUMN IF EXISTS return_url,
DROP COLUMN IF EXISTS payment_verified,
DROP COLUMN IF EXISTS payment_verified_at,
DROP COLUMN IF EXISTS chapa_response,
DROP COLUMN IF EXISTS verification_attempts;

-- 5. Drop triggers
DROP TRIGGER IF EXISTS payment_attempts_before_update;

-- 6. Drop indexes
ALTER TABLE payments 
DROP INDEX IF EXISTS idx_chapa_tx_ref,
DROP INDEX IF EXISTS idx_payment_method_type,
DROP INDEX IF EXISTS idx_payment_verified;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- ========================================
-- Rollback Complete
-- ========================================
-- Chapa payment support has been removed from the database
-- The original payment functionality remains intact
