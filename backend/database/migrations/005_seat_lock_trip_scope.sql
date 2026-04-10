-- Scope seat holds to a specific trip so the same vehicle seat can be used on different trips.
-- Requires MySQL 8+ / InnoDB.

ALTER TABLE seats
  ADD COLUMN lock_trip_id INT NULL COMMENT 'Trip this temporary lock applies to' AFTER locked_at,
  ADD KEY idx_seats_lock_trip (lock_trip_id),
  ADD CONSTRAINT fk_seats_lock_trip FOREIGN KEY (lock_trip_id) REFERENCES trips (id) ON DELETE SET NULL;

ALTER TABLE seat_locks
  ADD COLUMN trip_id INT NULL AFTER vehicle_id,
  ADD KEY idx_seat_locks_trip (trip_id),
  ADD CONSTRAINT fk_seat_locks_trip FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE SET NULL;
