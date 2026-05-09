import { api } from "./api.client.js";

/** Backend: /api/seats */
export const seatsService = {
  list: () => api.get("/api/seats"),
  get: (id) => api.get(`/api/seats/${id}`),
  byVehicle: (vehicleId) => api.get(`/api/seats/vehicle/${vehicleId}`),
  /** tripId required: availability is per trip (same seat can be used on another trip). */
  availableByVehicle: (vehicleId, tripId) =>
    api.get(
      `/api/seats/vehicle/${vehicleId}/available?trip_id=${encodeURIComponent(tripId)}`
    ),
  lockedByVehicle: (vehicleId) =>
    api.get(`/api/seats/vehicle/${vehicleId}/locked`),
  getLockStatus: (vehicleId, seatNumber, tripId) =>
    api.get(
      `/api/seats/vehicle/${vehicleId}/seat-number/${seatNumber}/lock-status${
        tripId != null && tripId !== ""
          ? `?trip_id=${encodeURIComponent(tripId)}`
          : ""
      }`
    ),
  lock: (body) => api.post("/api/seats/lock", body),
  unlock: (body) => api.post("/api/seats/unlock", body),
  create: (body) => api.post("/api/seats", body),
  update: (id, body) => api.put(`/api/seats/${id}`, body),
  remove: (id) => api.delete(`/api/seats/${id}`),
};
