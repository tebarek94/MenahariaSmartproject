import { api } from "./api.client.js";

/** Backend: /api/roles — requireAdmin */
export const rolesService = {
  list: () => api.get("/api/roles"),
  create: (body) => api.post("/api/roles", body),
  update: (id, body) => api.put(`/api/roles/${id}`, body),
  remove: (id) => api.delete(`/api/roles/${id}`),
};
