import { api } from "./api.client.js";

/** Backend: /api/seats */
export const seatsService = {
  list: () => api.get("/api/seats"),
  get: (id) => api.get(`/api/seats/${id}`),
  byVehicle: (vehicleId) => api.get(`/api/seats/vehicle/${vehicleId}`),
  create: (body) => api.post("/api/seats", body),
  update: (id, body) => api.put(`/api/seats/${id}`, body),
  remove: (id) => api.delete(`/api/seats/${id}`),
};
