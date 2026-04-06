/** Escape text for embedding in HTML receipt downloads */
function esc(s) {
  if (s == null || s === "") return "—";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function money(v) {
  if (v == null || v === "") return "—";
  const n = Number(v);
  return Number.isFinite(n) ? `${n.toFixed(2)} ETB` : esc(v);
}

/**
 * Printable / downloadable HTML for a cargo payment receipt (admin list row shape).
 * @param {Record<string, unknown>} row — from GET /api/cargo-receipts (brief join)
 */
export function buildPaidReceiptHtml(row) {
  const id = row.id ?? "";
  const issued = row.issued_at != null ? esc(row.issued_at) : "—";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Cargo receipt #${esc(id)}</title>
  <style>
    body { font-family: system-ui, Segoe UI, Roboto, sans-serif; max-width: 40rem; margin: 2rem auto; padding: 1.5rem; color: #111; }
    h1 { font-size: 1.25rem; margin: 0 0 0.25rem; }
    .sub { color: #555; font-size: 0.9rem; margin-bottom: 1.5rem; }
    .amount { font-size: 1.75rem; font-weight: 700; margin: 1rem 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
    th, td { text-align: left; padding: 0.5rem 0.35rem; border-bottom: 1px solid #ddd; vertical-align: top; }
    th { width: 38%; color: #444; font-weight: 600; font-size: 0.85rem; }
    .footer { margin-top: 2rem; font-size: 0.8rem; color: #666; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>Menahariya Smart</h1>
  <p class="sub">Cargo — payment receipt</p>
  <p class="amount">Amount paid: ${money(row.amount)}</p>
  <table>
    <tbody>
      <tr><th>Receipt no.</th><td>${esc(id)}</td></tr>
      <tr><th>Issued</th><td>${issued}</td></tr>
      <tr><th>Cargo ID</th><td>${esc(row.cargo_id)}</td></tr>
      <tr><th>Tracking code</th><td>${esc(row.tracking_code)}</td></tr>
      <tr><th>Cargo status</th><td>${esc(row.cargo_status)}</td></tr>
      <tr><th>Weight (kg)</th><td>${esc(row.cargo_weight_kg)}</td></tr>
      <tr><th>Cargo fee</th><td>${money(row.cargo_fee)}</td></tr>
      <tr><th>Content</th><td>${esc(row.cargo_content_brief)}</td></tr>
      <tr><th>Owner</th><td>${esc(row.owner_name)}</td></tr>
      <tr><th>Owner phone</th><td>${esc(row.owner_phone)}</td></tr>
      <tr><th>Route</th><td>${esc(row.route_summary)}</td></tr>
      <tr><th>Vehicle</th><td>${esc(row.vehicle_plate)}</td></tr>
      <tr><th>Trip departure</th><td>${esc(row.trip_departure)}</td></tr>
    </tbody>
  </table>
  <p class="footer">This document confirms payment recorded in the system. Keep for your records.</p>
</body>
</html>`;
}

/** Trigger browser download of receipt as HTML (open or print to PDF from the file). */
export function downloadCargoReceiptHtml(row) {
  const html = buildPaidReceiptHtml(row);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cargo-receipt-${row.id ?? "unknown"}.html`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
