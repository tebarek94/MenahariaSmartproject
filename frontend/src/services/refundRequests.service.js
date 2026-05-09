import { api } from "./api.client.js";

export const refundRequestsService = {
  /** Passenger: submit refund/cancellation request (≥10 min before departure). */
  create: (body) => api.post("/api/refund-requests", body),
  /** Passenger: own requests */
  listMine: () => api.get("/api/refund-requests/mine"),
  /** Admin: all requests with ticket/trip context */
  listAll: () => api.get("/api/refund-requests"),
  /** Admin: approve or reject pending request */
  updateStatus: (id, body) => api.patch(`/api/refund-requests/${id}`, body),
};
