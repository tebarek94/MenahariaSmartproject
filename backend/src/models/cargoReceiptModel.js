import { queryAsync } from "../config/db.js";

const receiptBriefSelect = `
  cr.id,
  cr.amount,
  cr.issued_at,
  c.id AS cargo_id,
  c.tracking_code,
  c.weight AS cargo_weight_kg,
  c.fee AS cargo_fee,
  c.status AS cargo_status,
  c.payment_status AS cargo_payment_status,
  c.content AS cargo_content_brief,
  o.full_name AS owner_name,
  o.phone AS owner_phone,
  o.email AS owner_email,
  CONCAT(IFNULL(r.origin,''), ' → ', IFNULL(r.destination,'')) AS route_summary,
  v.plate_number AS vehicle_plate,
  DATE_FORMAT(t.departure_time, '%Y-%m-%d %H:%i') AS trip_departure
`;

export const createCargoReceipt = (cargoId, amount) =>
  queryAsync(
    "INSERT INTO cargo_receipts (cargo_id, amount) VALUES (?, ?)",
    [cargoId ?? null, amount ?? null]
  );

/** Full table rows (legacy). */
export const getAllCargoReceipts = () =>
  queryAsync("SELECT * FROM cargo_receipts ORDER BY issued_at DESC");

/** List with brief related context for admin UI. */
export const getAllCargoReceiptsBrief = () =>
  queryAsync(
    `SELECT ${receiptBriefSelect}
     FROM cargo_receipts cr
     LEFT JOIN cargo c ON c.id = cr.cargo_id
     LEFT JOIN users o ON o.id = c.owner_id
     LEFT JOIN trips t ON t.id = c.trip_id
     LEFT JOIN routes r ON r.id = t.route_id
     LEFT JOIN vehicles v ON v.id = t.vehicle_id
     ORDER BY cr.issued_at DESC`
  );

/** Receipts for cargo owned by this user (passenger dashboard). */
export const getCargoReceiptsBriefForOwner = (ownerUserId) =>
  queryAsync(
    `SELECT ${receiptBriefSelect}
     FROM cargo_receipts cr
     INNER JOIN cargo c ON c.id = cr.cargo_id AND c.owner_id = ?
     LEFT JOIN users o ON o.id = c.owner_id
     LEFT JOIN trips t ON t.id = c.trip_id
     LEFT JOIN routes r ON r.id = t.route_id
     LEFT JOIN vehicles v ON v.id = t.vehicle_id
     ORDER BY cr.issued_at DESC`,
    [ownerUserId]
  );

export const getCargoReceiptById = (id) =>
  queryAsync("SELECT * FROM cargo_receipts WHERE id = ?", [id]);

export const getCargoReceiptBriefById = (id) =>
  queryAsync(
    `SELECT ${receiptBriefSelect}
     FROM cargo_receipts cr
     LEFT JOIN cargo c ON c.id = cr.cargo_id
     LEFT JOIN users o ON o.id = c.owner_id
     LEFT JOIN trips t ON t.id = c.trip_id
     LEFT JOIN routes r ON r.id = t.route_id
     LEFT JOIN vehicles v ON v.id = t.vehicle_id
     WHERE cr.id = ?`,
    [id]
  );

export const getCargoOwnerIdForReceipt = (receiptId) =>
  queryAsync(
    `SELECT c.owner_id
     FROM cargo_receipts cr
     LEFT JOIN cargo c ON c.id = cr.cargo_id
     WHERE cr.id = ?`,
    [receiptId]
  );

export const updateCargoReceipt = (id, cargoId, amount) =>
  queryAsync(
    "UPDATE cargo_receipts SET cargo_id = ?, amount = ? WHERE id = ?",
    [cargoId ?? null, amount ?? null, id]
  );

export const deleteCargoReceipt = (id) =>
  queryAsync("DELETE FROM cargo_receipts WHERE id = ?", [id]);
