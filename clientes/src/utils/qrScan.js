/**
 * Normalize scanned / pasted QR content into the secret token sent to POST /validate-qr.
 * Supports: full app URL (/qr-scan/TOKEN), legacy JSON payloads, or raw 64-char hex.
 */
export function extractQrTokenFromScan(raw) {
  if (raw == null) return "";
  let s = String(raw).trim();
  if (!s) return "";

  for (let i = 0; i < 2; i++) {
    try {
      const next = decodeURIComponent(s.replace(/\+/g, " "));
      if (next === s) break;
      s = next;
    } catch {
      break;
    }
  }

  const pathMatch = s.match(/\/qr-scan\/([^/?#]+)/i);
  if (pathMatch) {
    let seg = pathMatch[1];
    try {
      seg = decodeURIComponent(seg);
    } catch {
      /* keep */
    }
    return seg.trim();
  }

  if (s.startsWith("{")) {
    try {
      const j = JSON.parse(s);
      if (j && typeof j.token === "string" && j.token.trim()) {
        return j.token.trim();
      }
    } catch {
      return "";
    }
    return "";
  }

  if (/^[a-f0-9]{64}$/i.test(s)) return s;

  return s.trim();
}
