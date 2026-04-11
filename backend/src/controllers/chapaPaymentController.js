import * as paymentModel from "../models/chapaPaymentModel.js";
import * as ticketModel from "../models/ticketModel.js";
import * as userModel from "../models/userModel.js";
import { queryAsync } from "../config/db.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { isAdmin, isPassenger } from "../constants/roles.js";
import chapaService, { flattenChapaApiMessage } from "../services/chapaService.js";

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

  const trip = await queryAsync("SELECT price FROM trips WHERE id = ?", [
    ticket[0].trip_id,
  ]);
  return trip.length ? trip[0].price : null;
}

async function cargoOwnedBy(cargoId, userId) {
  if (cargoId == null) return false;
  const rows = await queryAsync("SELECT owner_id FROM cargo WHERE id = ?", [
    cargoId,
  ]);
  return rows.length && Number(rows[0].owner_id) === Number(userId);
}

async function getCargoFeeRow(cargoId) {
  const rows = await queryAsync(
    "SELECT fee, payment_status FROM cargo WHERE id = ?",
    [cargoId]
  );
  return rows.length ? rows[0] : null;
}

/** Initialize Chapa for a ticket **or** a cargo shipment (exactly one id in body). */
export const initializeChapaPayment = async (req, res) => {
  try {
    let {
      ticket_id,
      cargo_id,
      amount,
      email,
      first_name,
      last_name,
      phone_number,
      return_url: returnUrlBody,
    } = req.body;

    const hasTicket = ticket_id != null && ticket_id !== "";
    const hasCargo = cargo_id != null && cargo_id !== "";
    if (hasTicket === hasCargo) {
      return sendError(
        res,
        "Send exactly one of ticket_id or cargo_id together with amount",
        400
      );
    }
    if (amount == null || amount === "") {
      return sendError(res, "amount is required", 400);
    }

    if (!isAdmin(req.roleName)) {
      if (!isPassenger(req.roleName)) {
        return sendError(res, "Forbidden", 403);
      }
      if (hasTicket) {
        const ok = await ticketOwnedBy(ticket_id, req.user.id);
        if (!ok) return sendError(res, "Ticket not found or not yours", 403);
      } else {
        const ok = await cargoOwnedBy(cargo_id, req.user.id);
        if (!ok) return sendError(res, "Cargo not found or not yours", 403);
      }
    }

    const amtNum = Number(amount);
    if (!Number.isFinite(amtNum) || amtNum <= 0) {
      return sendError(res, "Invalid amount", 400);
    }

    let expectedPrice = null;
    let ticketIdNum = null;
    let cargoIdNum = null;

    if (hasTicket) {
      ticketIdNum = Number(ticket_id);
      expectedPrice = await getTicketPrice(ticketIdNum);
      if (expectedPrice == null) {
        return sendError(res, "Ticket not found", 404);
      }
    } else {
      cargoIdNum = Number(cargo_id);
      const cargoRow = await getCargoFeeRow(cargoIdNum);
      if (!cargoRow) {
        return sendError(res, "Cargo not found", 404);
      }
      const ps = String(cargoRow.payment_status || "pending").toLowerCase();
      if (ps === "paid" || ps === "completed") {
        return sendError(res, "Cargo fee is already paid", 400);
      }
      expectedPrice = cargoRow.fee;
    }

    const priceNum = Number(expectedPrice);
    if (
      !Number.isFinite(priceNum) ||
      Math.abs(priceNum - amtNum) > 0.009
    ) {
      return sendError(
        res,
        `Amount must be ${priceNum.toFixed(2)} ETB (${hasCargo ? "cargo fee" : "trip fare"})`,
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
    const defaultReturn = hasCargo
      ? `${frontendBase}/passenger/cargo/track`
      : `${frontendBase}/passenger/tickets`;
    const returnUrlFinal =
      returnUrlBody && /^https?:\/\//i.test(String(returnUrlBody))
        ? String(returnUrlBody).slice(0, 500)
        : defaultReturn;

    if (!chapaService.isApiKeyValid()) {
      const specific = chapaService.getChapaDisabledReason();
      return sendError(
        res,
        specific ||
          "Chapa is not configured correctly. Set CHAPA_SECRET_KEY to your Chapa Secret Key (CHASECK_TEST… for coursework). Do not use the Public Key (CHAPUBK_) on the server.",
        503
      );
    }

    const chapaResult = await chapaService.initializeTransaction({
      amount: amtNum,
      email,
      firstName: first_name,
      lastName: last_name,
      phoneNumber: formattedPhone || undefined,
      ticketId: hasTicket ? ticketIdNum : null,
      cargoId: hasCargo ? cargoIdNum : null,
      userId: req.user.id,
      returnUrl: returnUrlFinal,
    });

    if (!chapaResult.success) {
      const raw = chapaResult.error?.message;
      const msg =
        typeof raw === "string" && raw.trim()
          ? raw.trim()
          : typeof raw === "object" && raw
            ? flattenChapaApiMessage(raw)
            : typeof chapaResult.error === "string"
              ? chapaResult.error
              : "Failed to initialize payment";
      return sendError(res, msg, 502, chapaResult.error);
    }

    const checkoutUrl = chapaResult.checkout_url;
    const cbUrl =
      process.env.CHAPA_CALLBACK_URL ||
      `${(process.env.API_BASE_URL || "http://localhost:5000").replace(/\/$/, "")}/api/payments/chapa/callback`;

    const paymentResult = await paymentModel.createPaymentWithChapa(
      hasTicket ? ticketIdNum : null,
      amtNum,
      "chapa",
      chapaResult.txRef,
      "pending",
      null,
      {
        chapaTxRef: chapaResult.txRef,
        checkoutUrl,
        customerEmail: email,
        customerPhone: formattedPhone,
        callbackUrl: cbUrl,
        returnUrl: returnUrlFinal,
        cargoId: hasCargo ? cargoIdNum : null,
      }
    );

    await paymentModel.createPaymentAttempt(
      paymentResult.insertId,
      hasTicket ? ticketIdNum : null,
      req.user.id,
      amtNum,
      chapaResult.txRef,
      "pending",
      checkoutUrl,
      chapaResult.data,
      hasCargo ? cargoIdNum : null
    );

    return sendSuccess(
      res,
      {
        message: "Payment initialized successfully",
        payment_id: paymentResult.insertId,
        tx_ref: chapaResult.txRef,
        checkout_url: checkoutUrl,
        amount: amtNum,
        currency: "ETB",
        payment_for: hasCargo ? "cargo" : "ticket",
      },
      201
    );
  } catch (err) {
    console.error("Chapa payment initialization error:", err);
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
      await paymentModel.updatePaymentAttempt(tx_ref, {
        status: "failed",
        errorMessage: JSON.stringify(verificationResult.error),
      });
      return sendError(
        res,
        "Payment verification failed",
        500,
        verificationResult.error
      );
    }

    const norm = verificationResult.normalized;
    const isSuccessful = norm.status === "success";
    const raw = norm.raw || {};

    await paymentModel.updatePaymentAttempt(tx_ref, {
      status: isSuccessful ? "success" : "failed",
      verificationResponse: verificationResult.data,
    });

    if (isSuccessful) {
      await paymentModel.updatePaymentWithChapa(attempt.payment_id, {
        status: "success",
        paidAt: new Date(),
        chapaRefId: norm.id,
        paymentVerified: true,
        paymentVerifiedAt: new Date(),
        chapaResponse: raw,
        verificationAttempts: (attempt.verification_attempts || 0) + 1,
      });

      if (attempt.ticket_id != null) {
        await queryAsync(
          "UPDATE tickets SET payment_status = 'paid' WHERE id = ?",
          [attempt.ticket_id]
        );
      }
      if (attempt.cargo_id != null) {
        await queryAsync(
          "UPDATE cargo SET payment_status = 'paid' WHERE id = ?",
          [attempt.cargo_id]
        );
      }
    } else {
      await paymentModel.updatePaymentWithChapa(attempt.payment_id, {
        status: "failed",
        verificationAttempts: (attempt.verification_attempts || 0) + 1,
      });
    }

    return sendSuccess(res, {
      message: `Payment ${isSuccessful ? "verified successfully" : "verification failed"}`,
      status: norm.status,
      amount: norm.amount ?? parseFloat(raw.amount),
      currency: norm.currency ?? raw.currency,
      paid_at: raw.created_at ?? raw.updated_at,
    });

  } catch (err) {
    console.error('Chapa payment verification error:', err);
    return sendError(res, "Failed to verify payment", 500, err);
  }
};

// Chapa webhook handler (mounted in index.js with raw body → req.chapaRawBody)
export const handleChapaWebhook = async (req, res) => {
  try {
    const rawUtf8 = Buffer.isBuffer(req.chapaRawBody)
      ? req.chapaRawBody.toString("utf8")
      : JSON.stringify(req.body ?? {});

    if (!chapaService.validateWebhookSignature(rawUtf8, req.headers)) {
      return res.status(401).json({ message: "Invalid webhook signature" });
    }

    const webhookData = req.body;
    const processedData = chapaService.processWebhook(webhookData);

    try {
      await paymentModel.createWebhookLog(
        processedData.txRef || "unknown",
        webhookData.event || "payment_update",
        webhookData
      );
    } catch (logErr) {
      console.error("Chapa webhook log:", logErr);
    }

    if (!processedData.txRef) {
      return res.status(200).json({ ok: true, message: "No tx_ref in payload" });
    }

    const paymentAttempts = await paymentModel.getPaymentAttemptByTxRef(
      processedData.txRef
    );
    if (!paymentAttempts.length) {
      return res.status(200).json({ ok: true, message: "Unknown tx_ref (ignored)" });
    }

    const attempt = paymentAttempts[0];
    const webhookSaysSuccess = processedData.status === "success";

    if (webhookSaysSuccess) {
      const vr = await chapaService.verifyTransaction(processedData.txRef);
      if (!vr.success || vr.normalized?.status !== "success") {
        await paymentModel.updatePaymentAttempt(processedData.txRef, {
          status: "pending",
          verificationResponse: { webhook: webhookData, verify: vr },
        });
        return res.status(200).json({
          ok: true,
          message: "Webhook received; awaiting verification",
        });
      }

      const norm = vr.normalized;
      const raw = norm.raw || {};

      await paymentModel.updatePaymentAttempt(processedData.txRef, {
        status: "success",
        verificationResponse: { webhook: webhookData, verify: vr.data },
      });

      await paymentModel.updatePaymentWithChapa(attempt.payment_id, {
        status: "success",
        paidAt: new Date(),
        chapaRefId: norm.id,
        paymentVerified: true,
        paymentVerifiedAt: new Date(),
        chapaResponse: { webhook: webhookData, verified: raw },
      });

      if (attempt.ticket_id != null) {
        await queryAsync(
          "UPDATE tickets SET payment_status = 'paid' WHERE id = ?",
          [attempt.ticket_id]
        );
      }
      if (attempt.cargo_id != null) {
        await queryAsync(
          "UPDATE cargo SET payment_status = 'paid' WHERE id = ?",
          [attempt.cargo_id]
        );
      }
    } else if (
      processedData.status === "failed" ||
      processedData.status === "cancelled"
    ) {
      await paymentModel.updatePaymentAttempt(processedData.txRef, {
        status: "failed",
        verificationResponse: webhookData,
      });
      await paymentModel.updatePaymentWithChapa(attempt.payment_id, {
        status: "failed",
      });
    } else {
      await paymentModel.updatePaymentAttempt(processedData.txRef, {
        status: "pending",
        verificationResponse: webhookData,
      });
    }

    return res.status(200).json({ ok: true, message: "Webhook processed" });
  } catch (err) {
    console.error("Chapa webhook error:", err);
    return res.status(500).json({ message: "Failed to process webhook" });
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
    if (isPassenger(req.roleName)) {
      const tid = rows[0].ticket_user_id;
      if (tid != null && Number(tid) === Number(req.user.id)) {
        return sendSuccess(res, rows[0]);
      }
      const cid = rows[0].cargo_owner_id;
      if (cid != null && Number(cid) === Number(req.user.id)) {
        return sendSuccess(res, rows[0]);
      }
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
