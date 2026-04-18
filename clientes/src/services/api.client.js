import { API_BASE, STORAGE_KEYS } from "@/utils/constants.js";
import { clearClientSession } from "@/services/authSession.js";
import { normalizeEthiopianPhone } from "@/utils/ethiopianPhone.js";

/** API may return `message` as a string or validation object; never pass objects to React. */
function messageFromResponseBody(data) {
  if (data == null) return null;
  if (typeof data === "string") return data;
  const m = data.message;
  if (typeof m === "string" && m.trim()) return m;
  if (m && typeof m === "object") {
    return Object.entries(m)
      .map(([k, v]) => {
        const part = Array.isArray(v) ? v.join(" ") : String(v);
        return `${k}: ${part}`;
      })
      .join("; ");
  }
  return null;
}

function isPublicAuthRequest(path) {
  const p = path.replace(/^\//, "").toLowerCase();
  return (
    p === "api/login" ||
    p === "api/login/2fa" ||
    p === "api/register" ||
    p === "api/passenger/register/start" ||
    p === "api/passenger/register/verify"
  );
}

const PHONE_KEYS = new Set(["phone", "phone_number", "customer_phone"]);

function normalizePhoneFields(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizePhoneFields(item));
  }
  if (!value || typeof value !== "object") return value;
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (PHONE_KEYS.has(k) && typeof v === "string") {
      const normalized = normalizeEthiopianPhone(v);
      out[k] = normalized || v.trim();
    } else if (v && typeof v === "object") {
      out[k] = normalizePhoneFields(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Low-level HTTP client aligned with Express API (Bearer JWT).
 */
async function request(path, { method = "GET", body, headers = {} } = {}) {
  const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;

  const init = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  };

  if (body != null && method !== "GET" && method !== "HEAD") {
    init.body = JSON.stringify(normalizePhoneFields(body));
  }

  const res = await fetch(url, init);
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    if (
      res.status === 401 &&
      token &&
      !isPublicAuthRequest(path)
    ) {
      clearClientSession();
    }
    const normalizedMsg =
      messageFromResponseBody(data) || res.statusText || "Request failed";
    const err = new Error(normalizedMsg);
    err.status = res.status;
    err.data =
      data && typeof data === "object"
        ? { ...data, message: normalizedMsg }
        : data;
    throw err;
  }

  return data;
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: "GET" }),
  post: (path, body, opts) => request(path, { ...opts, method: "POST", body }),
  put: (path, body, opts) => request(path, { ...opts, method: "PUT", body }),
  patch: (path, body, opts) => request(path, { ...opts, method: "PATCH", body }),
  delete: (path, opts) => request(path, { ...opts, method: "DELETE" }),
};
