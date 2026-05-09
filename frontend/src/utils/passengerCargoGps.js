import { isCargoFeePaid } from "@/utils/cargoPayment.js";

/**
 * Driver user ids the passenger may watch live (cargo fee paid, staff accepted shipment, trip has driver).
 * @param {Array<Record<string, unknown>>} cargoList
 * @returns {number[]}
 */
export function trackableDriverIdsFromCargo(cargoList) {
  const set = new Set();
  if (!Array.isArray(cargoList)) return [];
  for (const c of cargoList) {
    if (!isCargoFeePaid(c.payment_status)) continue;
    const did = Number(c.trip_driver_id);
    if (!Number.isFinite(did) || did <= 0) continue;
    const st = String(c.status ?? "").toLowerCase();
    if (st === "cancelled" || st === "pending") continue;
    set.add(did);
  }
  return [...set];
}
