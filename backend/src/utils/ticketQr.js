import QRCode from "qrcode";

export function buildTicketQrPayload(row) {
  return {
    ticket_id: row.id,
    ticket_code: row.ticket_code ?? null,
    passenger_name: row.passenger_name ?? null,
    driver_name: row.driver_name ?? null,
    plate_number: row.plate_number ?? null,
    origin: row.origin ?? null,
    destination: row.destination ?? null,
  };
}

export async function ticketToQrDataUrl(row) {
  const payload = buildTicketQrPayload(row);
  const text = JSON.stringify(payload);
  return QRCode.toDataURL(text, {
    width: 280,
    margin: 2,
    errorCorrectionLevel: "M",
  });
}

export async function attachTicketQr(row, { includeImage = true } = {}) {
  if (!row) return null;
  const qr_payload = buildTicketQrPayload(row);
  const out = { ...row, qr_payload };
  if (includeImage) {
    out.qr_data_url = await ticketToQrDataUrl(row);
  }
  return out;
}
