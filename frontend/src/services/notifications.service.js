import { api } from "./api.client.js";

/** Backend: /api/notifications */
export const notificationsService = {
  list: () => api.get("/api/notifications"),
  get: (id) => api.get(`/api/notifications/${id}`),
  create: (body) => api.post("/api/notifications", body),
  update: (id, body) => api.put(`/api/notifications/${id}`, body),
  remove: (id) => api.delete(`/api/notifications/${id}`),
};
