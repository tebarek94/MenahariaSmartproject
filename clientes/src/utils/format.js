export function formatMoney(value, currency = "ETB") {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return `${Number(value).toFixed(2)} ${currency}`;
}

export function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

/** For `<input type="datetime-local" />` from API datetime string */
export function toDatetimeLocalValue(mysqlOrIso) {
  if (!mysqlOrIso) return "";
  const s = String(mysqlOrIso).trim().replace(" ", "T");
  return s.length >= 16 ? s.slice(0, 16) : s;
}

/** From datetime-local value to `YYYY-MM-DD HH:mm:ss` for MySQL */
export function localInputToSqlDatetime(localVal) {
  if (!localVal) return null;
  const d = new Date(localVal);
  if (Number.isNaN(d.getTime())) return localVal;
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function formatTableCell(value) {
  if (value == null || value === "") return "—";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}[T\s]/.test(value)
  ) {
    return formatDate(value);
  }
  return String(value);
}
