import { api } from "./api.client.js";

/** Backend: /api/tickets — admin sees all (see ticketController). */
export const ticketsService = {
  list: () => api.get("/api/tickets"),
  get: (id) => api.get(`/api/tickets/${id}`),
  create: (body) => api.post("/api/tickets", body),
  update: (id, body) => api.put(`/api/tickets/${id}`, body),
  remove: (id) => api.delete(`/api/tickets/${id}`),
};
