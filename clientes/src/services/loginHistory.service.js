import { api } from "./api.client.js";
import { unwrapApiArray } from "@/utils/apiArray.js";
import { normalizeLoginHistoryRow } from "@/utils/loginHistoryRow.js";

/** Backend: /api/login-history — admin only */
export const loginHistoryService = {
  list: async () => {
    const raw = await api.get("/api/login-history");
    return unwrapApiArray(raw).map(normalizeLoginHistoryRow);
  },
  get: (id) => api.get(`/api/login-history/${id}`),
  create: (body) => api.post("/api/login-history", body),
  update: (id, body) => api.put(`/api/login-history/${id}`, body),
  remove: (id) => api.delete(`/api/login-history/${id}`),
};
