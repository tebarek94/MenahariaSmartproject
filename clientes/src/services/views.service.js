import { api } from "./api.client.js";

/** Admin / driver / passenger dashboard & relation views */
export const viewsService = {
  adminDashboard: () => api.get("/api/views/admin-dashboard"),
  driverDashboard: () => api.get("/api/views/driver-dashboard"),
  passengerDashboard: () => api.get("/api/views/passenger-dashboard"),
  ticketsRelations: (limit = 50) =>
    api.get(`/api/views/tickets-relations?limit=${limit}`),
  vehiclesRelations: (limit = 30) =>
    api.get(`/api/views/vehicles-relations?limit=${limit}`),
  cargoRelations: (limit = 50) =>
    api.get(`/api/views/cargo-relations?limit=${limit}`),
  seatsRelations: (limit = 100) =>
    api.get(`/api/views/seats-relations?limit=${limit}`),
  relationsOverview: (limit = 40) =>
    api.get(`/api/views/relations-overview?limit=${limit}`),
};
