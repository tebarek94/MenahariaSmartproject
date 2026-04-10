import { api } from "./api.client.js";

/** Backend: /api/reports — admin only */
export const reportsService = {
  list: (query = {}) => {
    const q = new URLSearchParams();
    if (query.status) q.set("status", query.status);
    if (query.source) q.set("source", query.source);
    const s = q.toString();
    return api.get(s ? `/api/reports?${s}` : "/api/reports");
  },
  get: (id) => api.get(`/api/reports/${id}`),
  create: (body) => api.post("/api/reports", body),
  update: (id, body) => api.put(`/api/reports/${id}`, body),
  remove: (id) => api.delete(`/api/reports/${id}`),
};
