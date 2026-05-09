import { api } from "./api.client.js";
import { unwrapApiArray } from "@/utils/apiArray.js";

/** Backend: POST/GET/DELETE /api/users — admin-only mutations (see userController). */
export const adminUsersService = {
  list: async () => unwrapApiArray(await api.get("/api/users")),
  /** Active users with a passenger-type role only (for tickets). */
  listPassengers: async () =>
    unwrapApiArray(await api.get("/api/users/passengers")),
  listDriverAssignments: async () =>
    unwrapApiArray(await api.get("/api/users/driver-assignments")),
  assignPassengerToDriver: (passenger_user_id, driver_user_id) =>
    api.post("/api/users/driver-assignments", {
      passenger_user_id,
      driver_user_id,
    }),
  unassignPassengerFromDriver: (passengerUserId) =>
    api.delete(`/api/users/driver-assignments/${passengerUserId}`),
  create: (body) => api.post("/api/users", body),
  update: (id, body) => api.put(`/api/users/${id}`, body),
  remove: (id) => api.delete(`/api/users/${id}`),
};
