import { API_BASE, STORAGE_KEYS } from "@/utils/constants.js";
import { clearClientSession } from "@/services/authSession.js";

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
  return p === "api/login" || p === "api/register";
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
    init.body = JSON.stringify(body);
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
