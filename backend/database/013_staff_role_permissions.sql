-- Add staff role and staff-specific role-permissions

INSERT INTO roles (id, name) VALUES
  (4, 'staff')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO permissions (name) VALUES
  ('tickets.create'),
  ('tickets.read'),
  ('tickets.update'),
  ('tickets.validate'),
  ('boarding.manage'),
  ('cargo.create'),
  ('cargo.read'),
  ('cargo.update'),
  ('cargo.receipt.generate')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO role_permissions (role_id, permission_id)
SELECT 4 AS role_id, p.id
FROM permissions p
WHERE p.name IN (
  'tickets.create',
  'tickets.read',
  'tickets.update',
  'tickets.validate',
  'boarding.manage',
  'cargo.create',
  'cargo.read',
  'cargo.update',
  'cargo.receipt.generate'
)
ON DUPLICATE KEY UPDATE permission_id = VALUES(permission_id);
