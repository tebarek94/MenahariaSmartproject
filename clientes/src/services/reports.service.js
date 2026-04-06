import { api } from "./api.client.js";

/** Backend: /api/reports — admin only */
export const reportsService = {
  list: () => api.get("/api/reports"),
  get: (id) => api.get(`/api/reports/${id}`),
  create: (body) => api.post("/api/reports", body),
  update: (id, body) => api.put(`/api/reports/${id}`, body),
  remove: (id) => api.delete(`/api/reports/${id}`),
};
