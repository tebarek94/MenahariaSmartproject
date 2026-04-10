import * as paymentModel from "../models/chapaPaymentModel.js";
import * as ticketModel from "../models/ticketModel.js";
import * as userModel from "../models/userModel.js";
import { queryAsync } from "../config/db.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { isAdmin, isPassenger } from "../constants/roles.js";
import chapaService from "../services/chapaService.js";

async function ticketOwnedBy(ticketId, userId) {
  if (ticketId == null) return false;
  const rows = await queryAsync(
    "SELECT user_id FROM tickets WHERE id = ?",
    [ticketId]
  );
  return rows.length && Number(rows[0].user_id) === Number(userId);
}

async function getTicketPrice(ticketId) {
  const ticket = await ticketModel.getTicketById(ticketId);
  if (!ticket.length) return null;
  
  const trip = await queryAsync("SELECT price FROM trips WHERE id = ?", [ticket[0].trip_id]);
  return trip.length ? trip[0].price : null;
}

// Initialize Chapa payment
export const initializeChapaPayment = async (req, res) => {
  try {
    let {
      ticket_id,
      amount,
      email,
      first_name,
      last_name,
      phone_number,
      return_url: returnUrlBody,
    } = req.body;

    if (!ticket_id || amount == null || amount === "") {
      return sendError(res, "ticket_id and amount are required", 400);
    }

    if (!isAdmin(req.roleName)) {
      if (!isPassenger(req.roleName)) {
        return sendError(res, "Forbidden", 403);
      }
      const ok = await ticketOwnedBy(ticket_id, req.user.id);
      if (!ok) return sendError(res, "Ticket not found or not yours", 403);
    }

    const ticketPrice = await getTicketPrice(ticket_id);
    if (ticketPrice == null) {
      return sendError(res, "Ticket not found", 404);
    }

    const priceNum = Number(ticketPrice);
    const amtNum = Number(amount);
    if (
      !Number.isFinite(priceNum) ||
      !Number.isFinite(amtNum) ||
      Math.abs(priceNum - amtNum) > 0.009
    ) {
      return sendError(
        res,
        `Amount must be ${priceNum.toFixed(2)} ETB (trip fare)`,
        400
      );
    }

    const userRows = await userModel.getUserByIdAsync(req.user.id);
    const user = userRows[0];
    if (user) {
      const parts = String(user.full_name || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      first_name =
        (first_name && String(first_name).trim()) || parts[0] || "Passenger";
      last_name =
        (last_name && String(last_name).trim()) ||
        parts.slice(1).join(" ") ||
        "Customer";
      const em = email && String(email).trim();
      email =
        (em && em.includes("@") && em) ||
        (user.email && String(user.email).trim()) ||
        `passenger${user.id}@ticket.menahariya.et`;
      phone_number =
        (phone_number && String(phone_number).trim()) || user.phone || "";
    }

    if (!first_name || !last_name) {
      return sendError(
        res,
        "first_name and last_name are required (update your profile if empty)",
        400
      );
    }
    if (!email || !String(email).includes("@")) {
      return sendError(res, "A valid email is required for Chapa checkout", 400);
    }

    let formattedPhone = null;
    if (phone_number) {
      formattedPhone = chapaService.formatPhoneNumber(String(phone_number));
      if (!formattedPhone) {
        return sendError(
          res,
          "Invalid phone number format. Use 09xxxxxxxx or 07xxxxxxxx",
          400
        );
      }
    }

    const frontendBase = (process.env.FRONTEND_URL || "http://localhost:5173").replace(
      /\/$/,
      ""
    );
    const defaultReturn = `${frontendBase}/passenger/tickets`;
    const returnUrlFinal =
      returnUrlBody && /^https?:\/\//i.test(String(returnUrlBody))
        ? String(returnUrlBody).slice(0, 500)
        : defaultReturn;

    const chapaResult = await chapaService.initializeTransaction({
      amount: amtNum,
      email,
      firstName: first_name,
      lastName: last_name,
      phoneNumber: formattedPhone || undefined,
      ticketId: ticket_id,
      userId: req.user.id,
      returnUrl: returnUrlFinal,
    });

    if (!chapaResult.success) {
      return sendError(res, "Failed to initialize payment", 500, chapaResult.error);
    }

    // Create payment record
    const paymentResult = await paymentModel.createPaymentWithChapa(
      ticket_id,
      amtNum,
      "chapa",
      chapaResult.txRef,
      "pending",
      null,
      {
        chapaTxRef: chapaResult.txRef,
        checkoutUrl: chapaResult.data.data.checkout_url,
        customerEmail: email,
        customerPhone: formattedPhone,
        returnUrl: returnUrlFinal,
      }
    );

    // Create payment attempt record
    await paymentModel.createPaymentAttempt(
      paymentResult.insertId,
      ticket_id,
      req.user.id,
      amtNum,
      chapaResult.txRef,
      "pending",
      chapaResult.data.data.checkout_url,
      chapaResult.data
    );

    return sendSuccess(
      res,
      {
        message: "Payment initialized successfully",
        payment_id: paymentResult.insertId,
        tx_ref: chapaResult.txRef,
        checkout_url: chapaResult.data.data.checkout_url,
        amount: amtNum,
        currency: "ETB",
      },
      201
    );

  } catch (err) {
    console.error('Chapa payment initialization error:', err);
    return sendError(res, "Failed to initialize payment", 500, err);
  }
};

// Verify Chapa payment
export const verifyChapaPayment = async (req, res) => {
  try {
    const { tx_ref } = req.params;
    
    if (!tx_ref) {
      return sendError(res, "Transaction reference is required", 400);
    }

    // Get payment attempt
    const paymentAttempts = await paymentModel.getPaymentAttemptByTxRef(tx_ref);
    if (!paymentAttempts.length) {
      return sendError(res, "Payment attempt not found", 404);
    }

    const attempt = paymentAttempts[0];

    // Check authorization
    if (!isAdmin(req.roleName) && attempt.user_id !== req.user.id) {
      return sendError(res, "Forbidden", 403);
    }

    // Verify with Chapa
    const verificationResult = await chapaService.verifyTransaction(tx_ref);
    
    if (!verificationResult.success) {
      // Update attempt with error
      await paymentModel.updatePaymentAttempt(tx_ref, {
        status: 'failed',
        errorMessage: JSON.stringify(verificationResult.error)
      });
      return sendError(res, "Payment verification failed", 500, verificationResult.error);
    }

    const chapaData = verificationResult.data.data;
    const isSuccessful = chapaData.status === 'success';

    // Update payment attempt
    await paymentModel.updatePaymentAttempt(tx_ref, {
      status: isSuccessful ? 'success' : 'failed',
      verificationResponse: chapaData
    });

    // Update payment record if successful
    if (isSuccessful) {
      await paymentModel.updatePaymentWithChapa(attempt.payment_id, {
        status: 'success',
        paidAt: new Date(),
        chapaRefId: chapaData.id,
        paymentVerified: true,
        paymentVerifiedAt: new Date(),
        chapaResponse: chapaData,
        verificationAttempts: (attempt.verification_attempts || 0) + 1
      });

      // Update ticket payment status
      await queryAsync(
        "UPDATE tickets SET payment_status = 'paid' WHERE id = ?",
        [attempt.ticket_id]
      );
    } else {
      await paymentModel.updatePaymentWithChapa(attempt.payment_id, {
        status: 'failed',
        verificationAttempts: (attempt.verification_attempts || 0) + 1
      });
    }

    return sendSuccess(res, {
      message: `Payment ${isSuccessful ? 'verified successfully' : 'verification failed'}`,
      status: chapaData.status,
      amount: parseFloat(chapaData.amount),
      currency: chapaData.currency,
      paid_at: chapaData.created_at
    });

  } catch (err) {
    console.error('Chapa payment verification error:', err);
    return sendError(res, "Failed to verify payment", 500, err);
  }
};

// Chapa webhook handler
export const handleChapaWebhook = async (req, res) => {
  try {
    const signature = req.headers['chapa-signature'];
    const payload = JSON.stringify(req.body);

    // Validate webhook signature
    if (!chapaService.validateWebhookSignature(payload, signature)) {
      return sendError(res, "Invalid webhook signature", 401);
    }

    const webhookData = req.body;
    const processedData = chapaService.processWebhook(webhookData);

    // Log webhook
    await paymentModel.createWebhookLog(
      processedData.txRef,
      webhookData.event || 'payment_update',
      webhookData
    );

    // Find payment attempt
    const paymentAttempts = await paymentModel.getPaymentAttemptByTxRef(processedData.txRef);
    if (!paymentAttempts.length) {
      return sendError(res, "Payment attempt not found", 404);
    }

    const attempt = paymentAttempts[0];
    const isSuccessful = processedData.status === 'success';

    // Update payment attempt
    await paymentModel.updatePaymentAttempt(processedData.txRef, {
      status: isSuccessful ? 'success' : 'failed',
      verificationResponse: webhookData
    });

    // Update payment record
    if (isSuccessful) {
      await paymentModel.updatePaymentWithChapa(attempt.payment_id, {
        status: 'success',
        paidAt: new Date(),
        chapaRefId: processedData.refId,
        paymentVerified: true,
        paymentVerifiedAt: new Date(),
        chapaResponse: webhookData
      });

      // Update ticket payment status
      await queryAsync(
        "UPDATE tickets SET payment_status = 'paid' WHERE id = ?",
        [attempt.ticket_id]
      );
    } else {
      await paymentModel.updatePaymentWithChapa(attempt.payment_id, {
        status: 'failed'
      });
    }

    return sendSuccess(res, { message: "Webhook processed successfully" });

  } catch (err) {
    console.error('Chapa webhook error:', err);
    return sendError(res, "Failed to process webhook", 500, err);
  }
};

// Get Chapa configuration status
export const getChapaConfig = async (req, res) => {
  try {
    if (!isAdmin(req.roleName)) {
      return sendError(res, "Admin access required", 403);
    }

    const config = chapaService.getConfigStatus();
    const supportedMethods = chapaService.getSupportedPaymentMethods();

    return sendSuccess(res, {
      config,
      supported_methods: supportedMethods
    });

  } catch (err) {
    return sendError(res, "Failed to get configuration", 500, err);
  }
};

// Original payment functions (backward compatibility)
export const create = async (req, res) => {
  try {
    const { ticket_id, amount, method, transaction_ref, status, paid_at } =
      req.body;
    if (amount == null || !method) {
      return sendError(res, "amount and method are required", 400);
    }
    if (!isAdmin(req.roleName)) {
      if (!isPassenger(req.roleName)) {
        return sendError(res, "Forbidden", 403);
      }
      const ok = await ticketOwnedBy(
        ticket_id != null ? Number(ticket_id) : null,
        req.user.id
      );
      if (!ok) return sendError(res, "Ticket not found or not yours", 403);
    }
    const result = await paymentModel.createPayment(
      ticket_id != null ? Number(ticket_id) : null,
      Number(amount),
      method,
      transaction_ref,
      status,
      paid_at ?? null
    );
    return sendSuccess(res, { message: "Payment created", id: result.insertId }, 201);
  } catch (err) {
    return sendError(res, "Failed to create payment", 500, err);
  }
};

export const getAll = async (req, res) => {
  try {
    if (isAdmin(req.roleName)) {
      const rows = await paymentModel.getAllPayments();
      return sendSuccess(res, rows);
    }
    if (isPassenger(req.roleName)) {
      const rows = await paymentModel.getPaymentsForPassenger(req.user.id);
      return sendSuccess(res, rows);
    }
    return sendError(res, "Forbidden", 403);
  } catch (err) {
    return sendError(res, "Failed to list payments", 500, err);
  }
};

export const getById = async (req, res) => {
  try {
    const rows = await paymentModel.getPaymentByIdWithTicketUser(req.params.id);
    if (!rows.length) return sendError(res, "Payment not found", 404);
    if (isAdmin(req.roleName)) {
      return sendSuccess(res, rows[0]);
    }
    if (
      isPassenger(req.roleName) &&
      rows[0].ticket_user_id != null &&
      Number(rows[0].ticket_user_id) === Number(req.user.id)
    ) {
      return sendSuccess(res, rows[0]);
    }
    return sendError(res, "Forbidden", 403);
  } catch (err) {
    return sendError(res, "Failed to get payment", 500, err);
  }
};

export const update = async (req, res) => {
  try {
    if (!isAdmin(req.roleName)) {
      return sendError(res, "Admin access required", 403);
    }
    const { ticket_id, amount, method, transaction_ref, status, paid_at } =
      req.body;
    if (amount == null || !method || !status) {
      return sendError(res, "amount, method, and status are required", 400);
    }
    await paymentModel.updatePayment(
      req.params.id,
      ticket_id != null ? Number(ticket_id) : null,
      Number(amount),
      method,
      transaction_ref,
      status,
      paid_at ?? null
    );
    return sendSuccess(res, { message: "Payment updated" });
  } catch (err) {
    return sendError(res, "Failed to update payment", 500, err);
  }
};

export const remove = async (req, res) => {
  try {
    if (!isAdmin(req.roleName)) {
      return sendError(res, "Admin access required", 403);
    }
    await paymentModel.deletePayment(req.params.id);
    return sendSuccess(res, { message: "Payment deleted" });
  } catch (err) {
    return sendError(res, "Failed to delete payment", 500, err);
  }
};

const paymentController = {
  // Chapa-specific functions
  initializeChapaPayment,
  verifyChapaPayment,
  handleChapaWebhook,
  getChapaConfig,
  
  // Original functions (backward compatibility)
  create,
  getAll,
  getById,
  update,
  remove
};

export default paymentController;
