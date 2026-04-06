import { api } from "./api.client.js";

/** Backend: /api/routes — admin CRUD */
export const routesService = {
  list: () => api.get("/api/routes"),
  get: (id) => api.get(`/api/routes/${id}`),
  create: (body) => api.post("/api/routes", body),
  update: (id, body) => api.put(`/api/routes/${id}`, body),
  remove: (id) => api.delete(`/api/routes/${id}`),
};
