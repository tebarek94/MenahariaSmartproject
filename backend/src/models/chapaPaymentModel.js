import { queryAsync } from "../config/db.js";

// Enhanced payment functions with Chapa support
export const createPaymentWithChapa = async (
  ticketId,
  amount,
  method,
  transactionRef,
  status,
  paidAt,
  chapaData = {}
) => {
  const {
    chapaTxRef,
    checkoutUrl,
    customerEmail,
    customerPhone,
    callbackUrl,
    returnUrl,
    currency = "ETB",
    cargoId,
  } = chapaData;

  return queryAsync(
    `INSERT INTO payments 
     (ticket_id, cargo_id, amount, method, transaction_ref, status, paid_at, 
      chapa_tx_ref, chapa_checkout_url, customer_email, customer_phone, 
      callback_url, return_url, currency, payment_method_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      ticketId ?? null,
      cargoId ?? null,
      amount,
      method,
      transactionRef ?? null,
      status ?? "pending",
      paidAt ?? null,
      chapaTxRef ?? null,
      checkoutUrl ?? null,
      customerEmail ?? null,
      customerPhone ?? null,
      callbackUrl ?? null,
      returnUrl ?? null,
      currency,
      "chapa",
    ]
  );
};

// Original createPayment function for backward compatibility
export const createPayment = (
  ticketId,
  amount,
  method,
  transactionRef,
  status,
  paidAt
) =>
  queryAsync(
    `INSERT INTO payments (ticket_id, amount, method, transaction_ref, status, paid_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      ticketId ?? null,
      amount,
      method,
      transactionRef ?? null,
      status ?? "pending",
      paidAt ?? null,
    ]
  );

export const getAllPayments = () =>
  queryAsync("SELECT * FROM payments ORDER BY id DESC");

export const getPaymentById = (id) =>
  queryAsync("SELECT * FROM payments WHERE id = ?", [id]);

export const getPaymentByChapaTxRef = (txRef) =>
  queryAsync("SELECT * FROM payments WHERE chapa_tx_ref = ?", [txRef]);

export const getPaymentByIdWithTicketUser = (id) =>
  queryAsync(
    `SELECT p.*, t.user_id AS ticket_user_id, c.owner_id AS cargo_owner_id
     FROM payments p
     LEFT JOIN tickets t ON t.id = p.ticket_id
     LEFT JOIN cargo c ON c.id = p.cargo_id
     WHERE p.id = ?`,
    [id]
  );

export const updatePayment = (
  id,
  ticketId,
  amount,
  method,
  transactionRef,
  status,
  paidAt
) =>
  queryAsync(
    `UPDATE payments SET ticket_id = ?, amount = ?, method = ?, transaction_ref = ?,
     status = ?, paid_at = ? WHERE id = ?`,
    [
      ticketId ?? null,
      amount,
      method,
      transactionRef ?? null,
      status,
      paidAt ?? null,
      id,
    ]
  );

export const updatePaymentWithChapa = async (
  id,
  updates = {}
) => {
  const {
    status,
    paidAt,
    chapaRefId,
    paymentVerified,
    paymentVerifiedAt,
    chapaResponse,
    verificationAttempts
  } = updates;

  const fields = [];
  const values = [];

  if (status !== undefined) {
    fields.push('status = ?');
    values.push(status);
  }
  if (paidAt !== undefined) {
    fields.push('paid_at = ?');
    values.push(paidAt);
  }
  if (chapaRefId !== undefined) {
    fields.push('chapa_ref_id = ?');
    values.push(chapaRefId);
  }
  if (paymentVerified !== undefined) {
    fields.push('payment_verified = ?');
    values.push(paymentVerified);
  }
  if (paymentVerifiedAt !== undefined) {
    fields.push('payment_verified_at = ?');
    values.push(paymentVerifiedAt);
  }
  if (chapaResponse !== undefined) {
    fields.push('chapa_response = ?');
    values.push(JSON.stringify(chapaResponse));
  }
  if (verificationAttempts !== undefined) {
    fields.push('verification_attempts = ?');
    values.push(verificationAttempts);
  }

  if (fields.length === 0) return null;

  values.push(id);
  
  return queryAsync(
    `UPDATE payments SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
};

export const deletePayment = (id) =>
  queryAsync("DELETE FROM payments WHERE id = ?", [id]);

export const getPaymentsForPassenger = (userId) =>
  queryAsync(
    `SELECT p.* FROM payments p
     LEFT JOIN tickets t ON t.id = p.ticket_id
     LEFT JOIN cargo c ON c.id = p.cargo_id
     WHERE t.user_id = ? OR c.owner_id = ?
     ORDER BY p.id DESC`,
    [userId, userId]
  );

// Payment attempts functions
export const createPaymentAttempt = async (
  paymentId,
  ticketId,
  userId,
  amount,
  chapaTxRef,
  status = "pending",
  checkoutUrl = null,
  chapaResponse = null,
  cargoId = null
) => {
  return queryAsync(
    `INSERT INTO payment_attempts 
     (payment_id, ticket_id, cargo_id, user_id, amount, chapa_tx_ref, status, checkout_url, chapa_response)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      paymentId,
      ticketId ?? null,
      cargoId ?? null,
      userId,
      amount,
      chapaTxRef,
      status,
      checkoutUrl,
      chapaResponse ? JSON.stringify(chapaResponse) : null,
    ]
  );
};

export const getPaymentAttemptByTxRef = (txRef) =>
  queryAsync("SELECT * FROM payment_attempts WHERE chapa_tx_ref = ?", [txRef]);

export const updatePaymentAttempt = async (txRef, updates = {}) => {
  const {
    status,
    verificationResponse,
    errorMessage
  } = updates;

  const fields = [];
  const values = [];

  if (status !== undefined) {
    fields.push('status = ?');
    values.push(status);
  }
  if (verificationResponse !== undefined) {
    fields.push('verification_response = ?');
    values.push(JSON.stringify(verificationResponse));
  }
  if (errorMessage !== undefined) {
    fields.push('error_message = ?');
    values.push(errorMessage);
  }

  if (fields.length === 0) return null;

  values.push(txRef);
  
  return queryAsync(
    `UPDATE payment_attempts SET ${fields.join(', ')} WHERE chapa_tx_ref = ?`,
    values
  );
};

// Webhook functions
export const createWebhookLog = async (
  chapaTxRef,
  eventType,
  payload
) => {
  return queryAsync(
    `INSERT INTO payment_webhooks (chapa_tx_ref, event_type, payload)
     VALUES (?, ?, ?)`,
    [chapaTxRef, eventType, JSON.stringify(payload)]
  );
};

export const getUnprocessedWebhooks = () =>
  queryAsync(
    "SELECT * FROM payment_webhooks WHERE processed = FALSE ORDER BY created_at ASC"
  );

export const markWebhookAsProcessed = (id) =>
  queryAsync(
    "UPDATE payment_webhooks SET processed = TRUE, processed_at = NOW() WHERE id = ?",
    [id]
  );

// Analytics functions
export const getPaymentStats = () =>
  queryAsync(
    `SELECT 
       COUNT(*) as total_payments,
       SUM(amount) as total_amount,
       AVG(amount) as avg_amount,
       COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_payments,
       COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_payments,
       COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_payments,
       COUNT(CASE WHEN payment_method_type = 'chapa' THEN 1 END) as chapa_payments
     FROM payments`
  );

export const getPaymentStatsByDate = (startDate, endDate) =>
  queryAsync(
    `SELECT 
       DATE(paid_at) as date,
       COUNT(*) as payments_count,
       SUM(amount) as total_amount
     FROM payments 
     WHERE paid_at BETWEEN ? AND ?
     GROUP BY DATE(paid_at)
     ORDER BY date DESC`,
    [startDate, endDate]
  );

const paymentModel = {
  createPayment,
  createPaymentWithChapa,
  getAllPayments,
  getPaymentById,
  getPaymentByChapaTxRef,
  getPaymentByIdWithTicketUser,
  updatePayment,
  updatePaymentWithChapa,
  deletePayment,
  getPaymentsForPassenger,
  createPaymentAttempt,
  getPaymentAttemptByTxRef,
  updatePaymentAttempt,
  createWebhookLog,
  getUnprocessedWebhooks,
  markWebhookAsProcessed,
  getPaymentStats,
  getPaymentStatsByDate
};

export default paymentModel;
