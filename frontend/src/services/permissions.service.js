import { api } from "./api.client.js";

/** Backend: /api/permissions — requireAdmin */
export const permissionsService = {
  list: () => api.get("/api/permissions"),
  create: (body) => api.post("/api/permissions", body),
  update: (id, body) => api.put(`/api/permissions/${id}`, body),
  remove: (id) => api.delete(`/api/permissions/${id}`),
};
