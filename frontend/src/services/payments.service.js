import { api } from "./api.client.js";

/** Backend: /api/payments — admin full list + mutations */
export const paymentsService = {
  list: () => api.get("/api/payments"),
  get: (id) => api.get(`/api/payments/${id}`),
  create: (body) => api.post("/api/payments", body),
  update: (id, body) => api.put(`/api/payments/${id}`, body),
  remove: (id) => api.delete(`/api/payments/${id}`),
};
