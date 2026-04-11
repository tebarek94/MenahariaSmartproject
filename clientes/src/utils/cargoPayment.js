/** Cargo row `payment_status` from API (after migration 007). */
export function isCargoFeePaid(paymentStatus) {
  const s = String(paymentStatus ?? "").toLowerCase();
  return s === "paid" || s === "completed" || s === "successful";
}

/**
 * Parse `cargo.fee` for Chapa initialize (backend compares with 0.01 ETB tolerance).
 */
export function parseCargoFeeForChapa(fee) {
  if (fee == null || fee === "") return NaN;
  const n =
    typeof fee === "number"
      ? fee
      : parseFloat(String(fee).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Decide how to handle GET /api/payments/chapa/verify/:tx_ref for cargo checkout return.
 * Clears stale session keys on terminal outcomes so the UI does not loop on every load.
 *
 * @param {Record<string, unknown>|null} data — JSON body on 2xx
 * @param {{ status?: number, message?: string, data?: unknown }|null} httpError — thrown client error
 */
export function interpretCargoChapaVerify(data, httpError) {
  if (httpError != null) {
    const code = httpError.status;
    if (code === 404) {
      return {
        clearPending: true,
        success: false,
        userMessage:
          "This payment session was not found. If money left your account, contact support with your Chapa receipt.",
      };
    }
    return {
      clearPending: false,
      success: false,
      userMessage:
        typeof httpError.message === "string" && httpError.message.trim()
          ? httpError.message
          : "Payment verification failed. Try again in a moment.",
    };
  }

  const st = String(data?.status ?? "").toLowerCase();
  if (st === "success") {
    return { clearPending: true, success: true, userMessage: null };
  }
  if (st === "pending") {
    return {
      clearPending: false,
      success: false,
      userMessage:
        "Payment is still being confirmed. Wait a few seconds and refresh this page.",
    };
  }

  return {
    clearPending: true,
    success: false,
    userMessage:
      (typeof data?.message === "string" && data.message.trim()) ||
      "Payment was not completed. You can start checkout again from your dashboard.",
  };
}
