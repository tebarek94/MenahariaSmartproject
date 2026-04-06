/**
 * Fee = CARGO_FEE_BASE + (weight_kg × CARGO_FEE_PER_KG)
 * Defaults: base 0, 15 per kg. Override via environment variables.
 */

function getRates() {
  const perKg = parseFloat(process.env.CARGO_FEE_PER_KG);
  const base = parseFloat(process.env.CARGO_FEE_BASE);
  return {
    perKg: Number.isFinite(perKg) && perKg >= 0 ? perKg : 15,
    base: Number.isFinite(base) && base >= 0 ? base : 0,
  };
}

export function calculateCargoFee(weightKg) {
  const w = Number(weightKg);
  if (!Number.isFinite(w) || w <= 0) return null;
  const { perKg, base } = getRates();
  return Math.round((base + w * perKg) * 100) / 100;
}

export function getCargoFeeBreakdown(weightKg) {
  const w = Number(weightKg);
  if (!Number.isFinite(w) || w <= 0) return null;
  const { perKg, base } = getRates();
  const fee = Math.round((base + w * perKg) * 100) / 100;
  return {
    fee,
    base_fee: base,
    rate_per_kg: perKg,
    weight_kg: w,
  };
}

/**
 * @param {number} weight - kg
 * @param {{ fee?: unknown, fee_override?: boolean }} body
 * @param {{ isAdmin: boolean }} opts
 */
export function resolveCargoFee(weight, body, { isAdmin }) {
  const w = Number(weight);
  if (!Number.isFinite(w) || w <= 0) {
    return { error: "weight must be a positive number" };
  }
  const override =
    isAdmin &&
    body?.fee_override === true &&
    body?.fee != null &&
    body.fee !== "";
  if (override) {
    const custom = Number(body.fee);
    if (!Number.isFinite(custom) || custom < 0) {
      return { error: "fee override must be a non-negative number" };
    }
    return {
      fee: Math.round(custom * 100) / 100,
      overridden: true,
      breakdown: null,
    };
  }
  const breakdown = getCargoFeeBreakdown(w);
  return {
    fee: breakdown.fee,
    overridden: false,
    breakdown,
  };
}
