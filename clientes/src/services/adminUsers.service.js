import { api } from "./api.client.js";

/** Backend: POST/GET/DELETE /api/users — admin-only mutations (see userController). */
export const adminUsersService = {
  list: () => api.get("/api/users"),
  create: (body) => api.post("/api/users", body),
  update: (id, body) => api.put(`/api/users/${id}`, body),
  remove: (id) => api.delete(`/api/users/${id}`),
};
