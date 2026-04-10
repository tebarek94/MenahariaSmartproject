import { api } from "./api.client.js";
import { API_BASE } from "@/utils/constants.js";

/** Backend: /api/tickets — admin sees all (see ticketController). */
export const ticketsService = {
  list: () => api.get("/api/tickets"),
  get: (id) => api.get(`/api/tickets/${id}`),
  create: (body) => api.post("/api/tickets", body),
  update: (id, body) => api.put(`/api/tickets/${id}`, body),
  remove: (id) => api.delete(`/api/tickets/${id}`),
  // QR Code endpoints
  validateQr: (token) => api.post("/api/tickets/validate-qr", { token }),
  validateQrCode: (token) => api.post("/api/tickets/validate-qr", { token }),
  regenerateQr: (id) => api.post(`/api/tickets/${id}/regenerate-qr`),
  getQrStatus: (id) => api.get(`/api/tickets/${id}/qr-status`),
  getQrCodeStatus: (id) => api.get(`/api/tickets/${id}/qr-status`),
  // Download ticket endpoints
  generateDownloadToken: (id) => api.post(`/api/tickets/${id}/generate-download`),
  downloadTicket: (token) => api.get(`/api/tickets/download/${token}`),
  getDownloadStatus: (id) => api.get(`/api/tickets/${id}/download-status`),
  getDownloadUrl: (token) =>
    `${API_BASE}/api/tickets/download/${encodeURIComponent(token)}`,
};
