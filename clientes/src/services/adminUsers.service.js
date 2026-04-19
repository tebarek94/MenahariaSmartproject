import { api } from "./api.client.js";
import { unwrapApiArray } from "@/utils/apiArray.js";

/** Backend: POST/GET/DELETE /api/users — admin-only mutations (see userController). */
export const adminUsersService = {
  list: async () => unwrapApiArray(await api.get("/api/users")),
  /** Active users with a passenger-type role only (for tickets). */
  listPassengers: async () =>
    unwrapApiArray(await api.get("/api/users/passengers")),
  create: (body) => api.post("/api/users", body),
  update: (id, body) => api.put(`/api/users/${id}`, body),
  remove: (id) => api.delete(`/api/users/${id}`),
};
