/**
 * Normalize list responses whether the API returns a bare array or a wrapped object.
 */
export function unwrapApiArray(payload) {
  if (payload == null) return [];
  if (Array.isArray(payload)) return payload;
  if (typeof payload === "object") {
    for (const k of ["data", "rows", "items", "result", "records"]) {
      const v = payload[k];
      if (Array.isArray(v)) return v;
    }
  }
  return [];
}
