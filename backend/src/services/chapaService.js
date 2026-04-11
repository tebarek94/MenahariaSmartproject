import axios from "axios";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

/** Chapa server API requires the Secret Key (CHASECK_…), never the Public Key (CHAPUBK_…). */
function resolveSecretKey() {
  return String(
    process.env.CHAPA_SECRET_KEY ?? process.env.CHASECK_SECRET_KEY ?? ""
  ).trim();
}

function resolveWebhookSecret() {
  return String(process.env.CHAPA_WEBHOOK_SECRET ?? "").trim();
}

/**
 * Normalize Chapa initialize() JSON: checkout URL can be at data.checkout_url or nested.
 */
export function extractCheckoutFromInitializeResponse(apiBody) {
  if (!apiBody || typeof apiBody !== "object") return { checkout_url: null, message: null };
  const inner = apiBody.data != null && typeof apiBody.data === "object" ? apiBody.data : apiBody;
  const checkout_url =
    inner.checkout_url ??
    inner.checkoutUrl ??
    apiBody.checkout_url ??
    null;
  const message = apiBody.message ?? inner.message ?? null;
  return { checkout_url, message };
}

/**
 * Normalize Chapa verify() JSON.
 */
export function extractVerifyFromResponse(apiBody) {
  if (!apiBody || typeof apiBody !== "object") {
    return { status: null, amount: null, currency: null, id: null, raw: apiBody };
  }
  const data = apiBody.data != null && typeof apiBody.data === "object" ? apiBody.data : apiBody;
  const status = data.status ?? apiBody.status ?? null;
  const amount = data.amount ?? apiBody.amount ?? null;
  const currency = data.currency ?? apiBody.currency ?? null;
  const id = data.id ?? data.reference ?? apiBody.reference ?? null;
  return {
    status: status != null ? String(status).toLowerCase() : null,
    amount: amount != null ? parseFloat(amount) : null,
    currency: currency != null ? String(currency) : null,
    id: id != null ? String(id) : null,
    raw: data,
  };
}

/**
 * Chapa returns `message` as a string or as a keyed validation object.
 * Clients expect a single string (JSON + React).
 */
export function flattenChapaApiMessage(message) {
  if (message == null) return "";
  if (typeof message === "string") return message.trim() || "";
  if (typeof message === "object") {
    const parts = [];
    for (const [k, v] of Object.entries(message)) {
      const s = Array.isArray(v) ? v.join(" ") : String(v);
      parts.push(`${k}: ${s}`);
    }
    return parts.join("; ");
  }
  return String(message);
}

/** Chapa: title max 16 chars; description only letters, numbers, - _ space . */
function chapaSafeCustomization(hasCargo, id) {
  const sid = String(id ?? "").replace(/\s+/g, " ").trim() || "0";
  const descRaw = hasCargo ? `Cargo id ${sid}` : `Ticket id ${sid}`;
  const description = descRaw.replace(/[^a-zA-Z0-9\s._-]/g, " ").replace(/\s+/g, " ").trim();
  return {
    title: hasCargo ? "Cargo payment" : "Ticket payment",
    description: description.slice(0, 200),
  };
}

function isChapaLiveSecretKey(key) {
  const u = String(key ?? "").toUpperCase();
  return u.startsWith("CHASECK_LIVE") || u.startsWith("CHASECK-LIVE");
}

function isChapaTestSecretKey(key) {
  const u = String(key ?? "").toUpperCase();
  return u.startsWith("CHASECK_TEST") || u.startsWith("CHASECK-TEST");
}

class ChapaService {
  constructor() {
    this.secretKey = resolveSecretKey();
    this.baseUrl = String(process.env.CHAPA_BASE_URL || "https://api.chapa.co").replace(
      /\/$/,
      ""
    );
    this.webhookSecret = resolveWebhookSecret();
    /** Intended for coursework / local dev: Chapa sandbox only unless you opt in to live keys. */
    this.allowLiveChapaKeys = process.env.CHAPA_ALLOW_LIVE_KEYS === "true";
    /** When true (default), treat integration as test/sandbox. Set CHAPA_TEST_MODE=false for production. */
    this.isTestMode = process.env.CHAPA_TEST_MODE !== "false";

    if (!this.secretKey) {
      console.warn(
        "[Chapa] CHAPA_SECRET_KEY (or CHASECK_SECRET_KEY) is not set — payments cannot initialize."
      );
    } else if (this.secretKey.toUpperCase().startsWith("CHAPUBK")) {
      console.error(
        "[Chapa] You configured a Public Key (CHAPUBK_). Use the Secret Key (CHASECK_…) from Chapa Dashboard → API for server requests."
      );
    } else if (isChapaLiveSecretKey(this.secretKey) && !this.allowLiveChapaKeys) {
      console.warn(
        "[Chapa] Live secret key in .env but CHAPA_ALLOW_LIVE_KEYS is not true — Chapa calls are blocked (school/dev default)."
      );
    } else if (isChapaTestSecretKey(this.secretKey)) {
      console.log(
        "[Chapa] Test (CHASECK_TEST) mode — sandbox only, no real money. Suitable for coursework."
      );
    }

    if (!this.allowLiveChapaKeys) {
      console.log(
        "[Chapa] Live keys (CHASECK_LIVE) are disabled. Set CHAPA_ALLOW_LIVE_KEYS=true only for real production."
      );
    }
  }

  /** Human-readable reason when payments are disabled (for API 503 body). */
  getChapaDisabledReason() {
    if (!this.secretKey) {
      return null;
    }
    if (this.secretKey.toUpperCase().startsWith("CHAPUBK")) {
      return "Server needs the Chapa Secret Key (CHASECK_TEST…), not the public key (CHAPUBK…).";
    }
    if (isChapaLiveSecretKey(this.secretKey) && !this.allowLiveChapaKeys) {
      return (
        "This build is locked to Chapa developer/test mode (school project). " +
        "Use a CHASECK_TEST… key from the Chapa dashboard, or set CHAPA_ALLOW_LIVE_KEYS=true only if you intentionally deploy live payments."
      );
    }
    return null;
  }

  /** True if the key can be used for Bearer API calls (must be secret key, not public). */
  isApiKeyValid() {
    if (!this.secretKey) return false;
    if (this.secretKey.toUpperCase().startsWith("CHAPUBK")) return false;
    if (isChapaLiveSecretKey(this.secretKey) && !this.allowLiveChapaKeys) {
      return false;
    }
    return true;
  }

  /**
   * Verify webhook using Chapa docs: HMAC-SHA256 of payload with webhook secret.
   * Tries raw body string and JSON.stringify(parsed) (dashboard may use either).
   */
  validateWebhookSignature(rawBodyUtf8, headers) {
    const secret = this.webhookSecret;
    if (!secret) {
      console.warn("[Chapa] CHAPA_WEBHOOK_SECRET not set — rejecting webhook");
      return false;
    }

    const h = headers || {};
    const sig = String(
      h["x-chapa-signature"] ?? h["chapa-signature"] ?? h["X-Chapa-Signature"] ?? ""
    ).trim();
    if (!sig) return false;

    const tryMatch = (material) => {
      const hash = crypto.createHmac("sha256", secret).update(material).digest("hex");
      return hash === sig || hash.toLowerCase() === sig.toLowerCase();
    };

    const raw = String(rawBodyUtf8 ?? "");
    if (tryMatch(raw)) return true;

    try {
      const parsed = JSON.parse(raw);
      const compact = JSON.stringify(parsed);
      if (tryMatch(compact)) return true;
    } catch {
      /* ignore */
    }

    return false;
  }

  processWebhook(webhookData) {
    const d = webhookData && typeof webhookData === "object" ? webhookData : {};
    const tx_ref = d.tx_ref ?? d.trx_ref ?? d.trxRef ?? null;
    const statusRaw = d.status ?? null;
    const ref_id =
      d.reference ?? d.ref_id ?? d.chapa_reference ?? d.refId ?? null;
    const amount = d.amount != null ? parseFloat(String(d.amount)) : null;
    const currency = d.currency != null ? String(d.currency) : null;

    return {
      txRef: tx_ref,
      status: statusRaw != null ? String(statusRaw).toLowerCase() : null,
      refId: ref_id != null ? String(ref_id) : null,
      amount,
      currency,
      processedAt: new Date().toISOString(),
    };
  }

  async initializeTransaction(paymentData) {
    if (!this.isApiKeyValid()) {
      return {
        success: false,
        error: {
          message:
            "Chapa Secret Key missing or invalid. Use CHASECK_… from Chapa Dashboard (not CHAPUBK_).",
        },
      };
    }

    try {
      const {
        amount,
        email,
        firstName,
        lastName,
        phoneNumber,
        ticketId,
        cargoId,
        userId,
        callbackUrl,
        returnUrl,
      } = paymentData;

      const hasTicket = ticketId != null && ticketId !== "";
      const hasCargo = cargoId != null && cargoId !== "";
      if (!hasTicket && !hasCargo) {
        return {
          success: false,
          error: { message: "Either ticketId or cargoId is required" },
        };
      }

      const txRef = this.generateTxRef({
        ticketId: hasTicket ? ticketId : null,
        cargoId: hasCargo ? cargoId : null,
        userId,
      });

      const apiBase = (process.env.API_BASE_URL || "http://localhost:5000").replace(/\/$/, "");
      const defaultCallback = `${apiBase}/api/payments/chapa/callback`;
      const fe = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
      const defaultReturn = hasCargo
        ? `${fe}/passenger/cargo/track`
        : `${fe}/passenger/tickets`;

      const payload = {
        amount: String(amount),
        currency: "ETB",
        email,
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber,
        tx_ref: txRef,
        callback_url:
          callbackUrl ||
          process.env.CHAPA_CALLBACK_URL ||
          defaultCallback,
        return_url: returnUrl || defaultReturn,
        customization: chapaSafeCustomization(hasCargo, hasCargo ? cargoId : ticketId),
        meta: {
          ticket_id: hasTicket ? String(ticketId) : undefined,
          cargo_id: hasCargo ? String(cargoId) : undefined,
          user_id: String(userId),
          platform: "menahariya_smart",
        },
      };

      const response = await axios.post(
        `${this.baseUrl}/v1/transaction/initialize`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            "Content-Type": "application/json",
          },
          validateStatus: () => true,
        }
      );

      const body = response.data;
      if (response.status >= 400) {
        console.error("Chapa initialize HTTP error:", response.status, body);
        const flat = flattenChapaApiMessage(body?.message);
        return {
          success: false,
          error: {
            message: flat || `HTTP ${response.status}`,
            raw: body,
          },
        };
      }

      const { checkout_url, message } = extractCheckoutFromInitializeResponse(body);
      if (!checkout_url) {
        console.error("Chapa initialize missing checkout_url:", body);
        const flat = flattenChapaApiMessage(message) || "No checkout_url in Chapa response";
        return {
          success: false,
          error: { message: flat, raw: body },
        };
      }

      return {
        success: true,
        data: body,
        txRef,
        checkout_url,
      };
    } catch (error) {
      const data = error.response?.data;
      console.error("Chapa initialization error:", data || error.message);
      const flat =
        flattenChapaApiMessage(data?.message) ||
        error.message ||
        "Chapa request failed";
      return {
        success: false,
        error: { message: flat, raw: data },
      };
    }
  }

  async verifyTransaction(txRef) {
    if (!this.isApiKeyValid()) {
      return {
        success: false,
        error: { message: "Chapa Secret Key not configured" },
      };
    }

    try {
      const enc = encodeURIComponent(String(txRef));
      const response = await axios.get(
        `${this.baseUrl}/v1/transaction/verify/${enc}`,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            "Content-Type": "application/json",
          },
          validateStatus: () => true,
        }
      );

      const body = response.data;
      if (response.status >= 400) {
        console.error("Chapa verify HTTP error:", response.status, body);
        const flat = flattenChapaApiMessage(body?.message);
        return {
          success: false,
          error: {
            message: flat || `HTTP ${response.status}`,
            raw: body,
          },
        };
      }

      const normalized = extractVerifyFromResponse(body);
      return {
        success: true,
        data: body,
        normalized,
      };
    } catch (error) {
      const data = error.response?.data;
      console.error("Chapa verification error:", data || error.message);
      const flat =
        flattenChapaApiMessage(data?.message) ||
        error.message ||
        "Chapa verify failed";
      return {
        success: false,
        error: { message: flat, raw: data },
      };
    }
  }

  generateTxRef({ ticketId, cargoId, userId }) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const key =
      ticketId != null && ticketId !== ""
        ? `t${ticketId}`
        : `c${cargoId}`;
    return `menahariya_${key}_u${userId}_${timestamp}_${random}`;
  }

  getSupportedPaymentMethods() {
    return [
      "telebirr",
      "cbe-birr",
      "boa-mobile",
      "awash-bank",
      "dashen-bank",
      "coop-bank",
      "berhan-bank",
      "zemen-bank",
      "card-payment",
    ];
  }

  formatPhoneNumber(phone) {
    const cleaned = String(phone).replace(/\D/g, "");
    if (cleaned.length === 10 && (cleaned.startsWith("09") || cleaned.startsWith("07"))) {
      return cleaned;
    }
    if (cleaned.length === 9 && (cleaned.startsWith("9") || cleaned.startsWith("7"))) {
      return `0${cleaned}`;
    }
    return null;
  }

  getConfigStatus() {
    const key = this.secretKey;
    const looksPublic = key ? key.toUpperCase().startsWith("CHAPUBK") : false;
    let keyKind = "unknown";
    if (looksPublic) keyKind = "public";
    else if (key && isChapaTestSecretKey(key)) keyKind = "test";
    else if (key && isChapaLiveSecretKey(key)) keyKind = "live";

    return {
      hasSecretKey: Boolean(key),
      secretKeyUsableForApi: this.isApiKeyValid(),
      looksLikePublicKeyOnly: looksPublic,
      keyKind,
      /** School / coursework default: live keys rejected unless CHAPA_ALLOW_LIVE_KEYS=true */
      developerModeOnly: !this.allowLiveChapaKeys,
      allowLiveChapaKeys: this.allowLiveChapaKeys,
      hasWebhookSecret: Boolean(this.webhookSecret),
      baseUrl: this.baseUrl,
      isTestMode: this.isTestMode,
      isConfigured: this.isApiKeyValid() && Boolean(this.baseUrl),
      disabledReason: this.getChapaDisabledReason(),
    };
  }
}

export default new ChapaService();
