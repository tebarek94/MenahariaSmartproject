import { api } from "./api.client.js";

/** Backend: /api/trips — admin full CRUD */
export const tripsService = {
  /** Public: no auth — scheduled & ongoing trips for landing page */
  browsePublic: () => api.get("/api/trips/public/browse"),
  list: () => api.get("/api/trips"),
  get: (id) => api.get(`/api/trips/${id}`),
  create: (body) => api.post("/api/trips", body),
  update: (id, body) => api.put(`/api/trips/${id}`, body),
  remove: (id) => api.delete(`/api/trips/${id}`),
};

/** Passenger-facing trip services */
export const tripService = {
  getTripsForPassengerBrowse: async () => api.get("/api/trips"),

  getTripById: async (tripId) => api.get(`/api/trips/${tripId}`),

  searchTrips: async (filters) => {
    const params = new URLSearchParams(filters).toString();
    return api.get(`/api/trips/search?${params}`);
  },

  bookTrip: async (tripId, bookingData) =>
    api.post(`/api/bookings`, {
      trip_id: tripId,
      ...bookingData,
    }),
};
