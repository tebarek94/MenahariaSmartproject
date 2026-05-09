import { api } from "./api.client.js";

/**
 * Backend: /api/vehicles — GET any authenticated user; POST/PUT/DELETE admin
 * (requireAdminForMutations). Create: capacity required; plate_number optional → auto plate.
 */
export const vehiclesService = {
  list: () => api.get("/api/vehicles"),
  get: (id) => api.get(`/api/vehicles/${id}`),
  create: (body) => api.post("/api/vehicles", body),
  update: (id, body) => api.put(`/api/vehicles/${id}`, body),
  remove: (id) => api.delete(`/api/vehicles/${id}`),
};
