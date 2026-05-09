-- Trip driver assignment lock: block reassigning the driver until driver_lock_expires_at.
-- Run: mysql -u root -p menahariya_smart < 012_trips_driver_lock.sql

ALTER TABLE trips
  ADD COLUMN driver_lock_expires_at DATETIME NULL
    COMMENT 'UTC: reassign/clear driver blocked until this time'
    AFTER driver_id;

ALTER TABLE trips
  ADD KEY idx_trips_driver_lock (driver_lock_expires_at);
