import { API_BASE, STORAGE_KEYS } from "@/utils/constants.js";

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
    const err = new Error(data?.message || res.statusText || "Request failed");
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: "GET" }),
  post: (path, body, opts) => request(path, { ...opts, method: "POST", body }),
  put: (path, body, opts) => request(path, { ...opts, method: "PUT", body }),
  delete: (path, opts) => request(path, { ...opts, method: "DELETE" }),
};
