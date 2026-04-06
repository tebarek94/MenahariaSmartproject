import { api } from "./api.client.js";

/** Backend: /api/trips — admin full CRUD */
export const tripsService = {
  list: () => api.get("/api/trips"),
  get: (id) => api.get(`/api/trips/${id}`),
  create: (body) => api.post("/api/trips", body),
  update: (id, body) => api.put(`/api/trips/${id}`, body),
  remove: (id) => api.delete(`/api/trips/${id}`),
};
