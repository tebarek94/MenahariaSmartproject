import { api } from "./api.client.js";

/** Backend: /api/login-history — admin only */
export const loginHistoryService = {
  list: () => api.get("/api/login-history"),
  get: (id) => api.get(`/api/login-history/${id}`),
  create: (body) => api.post("/api/login-history", body),
  update: (id, body) => api.put(`/api/login-history/${id}`, body),
  remove: (id) => api.delete(`/api/login-history/${id}`),
};
