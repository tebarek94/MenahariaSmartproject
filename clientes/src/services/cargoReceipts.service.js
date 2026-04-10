import { api } from "./api.client.js";

/** Backend: /api/cargo-receipts — admin CRUD; passengers use listMine */
export const cargoReceiptsService = {
  /** Passenger: receipts for your cargo only */
  listMine: () => api.get("/api/cargo-receipts/my"),
  list: () => api.get("/api/cargo-receipts"),
  get: (id) => api.get(`/api/cargo-receipts/${id}`),
  create: (body) => api.post("/api/cargo-receipts", body),
  update: (id, body) => api.put(`/api/cargo-receipts/${id}`, body),
  remove: (id) => api.delete(`/api/cargo-receipts/${id}`),
};
