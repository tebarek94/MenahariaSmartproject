import { api } from "./api.client.js";

/** Backend: /api/cargo — admin list is full table (see cargoController). */
export const cargoService = {
  list: () => api.get("/api/cargo"),
  get: (id) => api.get(`/api/cargo/${id}`),
  create: (body) => api.post("/api/cargo", body),
  update: (id, body) => api.put(`/api/cargo/${id}`, body),
  remove: (id) => api.delete(`/api/cargo/${id}`),
};
