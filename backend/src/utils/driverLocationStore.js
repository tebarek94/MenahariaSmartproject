/** In-memory last-known positions for live GPS (cleared on restart). */

const MAX_AGE_MS = 45 * 60 * 1000;

/** @type {Map<number, object>} */
const store = new Map();

export function upsertDriverLocation(driverId, data) {
  const id = Number(driverId);
  if (!Number.isInteger(id) || id <= 0) return;
  const prev = store.get(id) || {};
  store.set(id, {
    ...prev,
    ...data,
    driverId: id,
    recordedAt: Date.now(),
  });
}

export function removeDriverLocation(driverId) {
  const id = Number(driverId);
  store.delete(id);
}

/** Latest row for one driver, or null if missing or stale. */
export function getDriverLocation(driverId) {
  const id = Number(driverId);
  if (!Number.isInteger(id) || id <= 0) return null;
  const row = store.get(id);
  if (!row) return null;
  const now = Date.now();
  if (now - row.recordedAt > MAX_AGE_MS) {
    store.delete(id);
    return null;
  }
  return { ...row, driverId: id };
}

/** Drop stale entries and return active rows for admin snapshot. */
export function listActiveDriverLocations() {
  const now = Date.now();
  const out = [];
  for (const [id, row] of store) {
    if (now - row.recordedAt > MAX_AGE_MS) {
      store.delete(id);
      continue;
    }
    out.push({ ...row, driverId: id });
  }
  return out;
}
