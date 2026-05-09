import { api } from "./api.client.js";

/** Backend: /api/role-permissions — requireAdmin */
export const rolePermissionsService = {
  list: () => api.get("/api/role-permissions"),
  listByRole: (roleId) => api.get(`/api/role-permissions/role/${roleId}`),
  assign: (body) => api.post("/api/role-permissions", body),
  remove: (roleId, permissionId) =>
    api.delete(`/api/role-permissions/${roleId}/${permissionId}`),
};
