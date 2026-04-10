-- Migration 004: Add Seat Locking Functionality
-- Prevent temporary double-booking by allowing authenticated users
-- to place a short-lived lock on a seat before ticket creation.

USE menahariya_smart;

ALTER TABLE seats
ADD COLUMN lock_token VARCHAR(64) NULL,
ADD COLUMN lock_expires_at DATETIME NULL,
ADD COLUMN locked_by INT NULL,
ADD COLUMN locked_at DATETIME NULL;

CREATE INDEX idx_seats_vehicle_seat ON seats(vehicle_id, seat_number);
CREATE INDEX idx_seats_lock_token ON seats(lock_token);
CREATE INDEX idx_seats_lock_expires_at ON seats(lock_expires_at);

CREATE TABLE seat_locks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    seat_id INT NOT NULL,
    vehicle_id INT NOT NULL,
    user_id INT NOT NULL,
    lock_token VARCHAR(64) NOT NULL,
    lock_expires_at DATETIME NOT NULL,
    locked_at DATETIME NOT NULL,
    unlocked_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_seat_locks_token (lock_token),
    INDEX idx_seat_locks_seat (seat_id),
    INDEX idx_seat_locks_vehicle (vehicle_id),
    INDEX idx_seat_locks_user (user_id),
    INDEX idx_seat_locks_expires (lock_expires_at),
    CONSTRAINT fk_seat_locks_seat FOREIGN KEY (seat_id) REFERENCES seats(id) ON DELETE CASCADE
);
