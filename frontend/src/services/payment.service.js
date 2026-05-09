import { api } from "./api.client.js";

export const paymentService = {
  // Get all payments (for admin)
  list: () => api.get("/api/payments"),
  
  // Get payment by ID (for admin details view)
  getById: (id) => api.get(`/api/payments/${id}`),
  
  // Get payments for current user (for passenger)
  getUserPayments: (userId) => api.get(`/api/users/${userId}/payments`),
  
  // Create new payment (for passenger)
  create: (paymentData) => api.post("/api/payments", paymentData),
  
  // Update payment status (for admin)
  updateStatus: (id, status) => api.put(`/api/payments/${id}/status`, { status }),
  
  // Process payment (simulate payment processing)
  processPayment: (paymentData) => api.post("/api/payments/process", paymentData),
  
  // Get payment statistics (for admin dashboard)
  getStats: () => api.get("/api/payments/stats"),
  
  // Refund payment (for admin)
  refund: (id, refundData) => api.post(`/api/payments/${id}/refund`, refundData),
  
  // Get payment receipt
  getReceipt: (id) => api.get(`/api/payments/${id}/receipt`),

  /** Chapa: start checkout ({ ticket_id, amount } or { cargo_id, amount }, return_url optional). */
  chapaInitialize: (body) =>
    api.post("/api/payments/chapa/initialize", body),

  /** Chapa: verify after redirect to passenger tickets. */
  chapaVerify: (txRef) =>
    api.get(`/api/payments/chapa/verify/${encodeURIComponent(txRef)}`),
};
