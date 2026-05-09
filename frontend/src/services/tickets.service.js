import { api } from "./api.client.js";
import { API_BASE } from "@/utils/constants.js";

/** Deduplicate concurrent validate calls for the same token (e.g. React Strict Mode double mount). */
const validateQrInflight = new Map();

/** Backend: /api/tickets — admin sees all (see ticketController). */
export const ticketsService = {
  list: () => api.get("/api/tickets"),
  get: (id) => api.get(`/api/tickets/${id}`),
  create: (body) => api.post("/api/tickets", body),
  update: (id, body) => api.put(`/api/tickets/${id}`, body),
  remove: (id) => api.delete(`/api/tickets/${id}`),
  // QR Code endpoints — one successful scan invalidates the token server-side
  validateQr: (token) => {
    if (!token) {
      return Promise.reject(new Error("QR token is required"));
    }
    const pending = validateQrInflight.get(token);
    if (pending) return pending;
    const p = api
      .post("/api/tickets/validate-qr", { token })
      .finally(() => validateQrInflight.delete(token));
    validateQrInflight.set(token, p);
    return p;
  },
  validateQrCode: (token) => ticketsService.validateQr(token),
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
