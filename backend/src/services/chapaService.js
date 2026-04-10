import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

class ChapaService {
  constructor() {
    this.secretKey = process.env.CHAPA_SECRET_KEY;
    this.baseUrl = process.env.CHAPA_BASE_URL || 'https://api.chapa.co';
    this.webhookSecret = process.env.CHAPA_WEBHOOK_SECRET;
    this.isTestMode = process.env.CHAPA_TEST_MODE === 'true';
    
    if (!this.secretKey) {
      console.warn('CHAPA_SECRET_KEY not configured in environment variables');
    }
  }

  /**
   * Initialize a Chapa transaction
   * @param {Object} paymentData - Payment information
   * @returns {Promise<Object>} Chapa response
   */
  async initializeTransaction(paymentData) {
    try {
      const {
        amount,
        email,
        firstName,
        lastName,
        phoneNumber,
        ticketId,
        userId,
        callbackUrl,
        returnUrl
      } = paymentData;

      // Generate unique transaction reference
      const txRef = this.generateTxRef(ticketId, userId);

      const payload = {
        amount: amount.toString(),
        currency: 'ETB',
        email: email,
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber,
        tx_ref: txRef,
        callback_url: callbackUrl || `${process.env.API_BASE_URL}/api/payments/chapa/callback`,
        return_url: returnUrl || `${process.env.FRONTEND_URL}/payment/success`,
        customization: {
          title: 'Menahariya Ticket Payment',
          description: `Payment for ticket #${ticketId}`
        },
        meta: {
          ticket_id: ticketId?.toString(),
          user_id: userId?.toString(),
          platform: 'menahariya_smart'
        }
      };

      const response = await axios.post(
        `${this.baseUrl}/v1/transaction/initialize`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        data: response.data,
        txRef: txRef
      };

    } catch (error) {
      console.error('Chapa initialization error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Verify a Chapa transaction
   * @param {string} txRef - Transaction reference
   * @returns {Promise<Object>} Verification result
   */
  async verifyTransaction(txRef) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/v1/transaction/verify/${txRef}`,
        {
          headers: {
            'Authorization': `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        data: response.data
      };

    } catch (error) {
      console.error('Chapa verification error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Generate unique transaction reference
   * @param {number} ticketId - Ticket ID
   * @param {number} userId - User ID
   * @returns {string} Unique transaction reference
   */
  generateTxRef(ticketId, userId) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `menahariya_${ticketId}_${userId}_${timestamp}_${random}`;
  }

  /**
   * Validate webhook signature
   * @param {string} payload - Raw webhook payload
   * @param {string} signature - Chapa signature header
   * @returns {boolean} Valid signature
   */
  validateWebhookSignature(payload, signature) {
    if (!this.webhookSecret) {
      console.warn('CHAPA_WEBHOOK_SECRET not configured');
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex');

    return signature === expectedSignature;
  }

  /**
   * Process webhook payload
   * @param {Object} webhookData - Webhook data
   * @returns {Object} Processed webhook data
   */
  processWebhook(webhookData) {
    const { tx_ref, status, ref_id, amount, currency } = webhookData;

    return {
      txRef: tx_ref,
      status: status,
      refId: ref_id,
      amount: parseFloat(amount),
      currency: currency,
      processedAt: new Date().toISOString()
    };
  }

  /**
   * Get payment methods supported by Chapa
   * @returns {Array} Supported payment methods
   */
  getSupportedPaymentMethods() {
    return [
      'telebirr',
      'cbe-birr',
      'boa-mobile',
      'awash-bank',
      'dashen-bank',
      'coop-bank',
      'berhan-bank',
      'zemen-bank',
      'card-payment'
    ];
  }

  /**
   * Format phone number for Chapa
   * @param {string} phone - Phone number
   * @returns {string} Formatted phone number
   */
  formatPhoneNumber(phone) {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Ensure it starts with 09 or 07 and is 10 digits
    if (cleaned.length === 10 && (cleaned.startsWith('09') || cleaned.startsWith('07'))) {
      return cleaned;
    }
    
    // If it's 9 digits starting with 9 or 7, add 0
    if (cleaned.length === 9 && (cleaned.startsWith('9') || cleaned.startsWith('7'))) {
      return '0' + cleaned;
    }
    
    return null; // Invalid format
  }

  /**
   * Get Chapa configuration status
   * @returns {Object} Configuration status
   */
  getConfigStatus() {
    return {
      hasSecretKey: !!this.secretKey,
      hasWebhookSecret: !!this.webhookSecret,
      baseUrl: this.baseUrl,
      isTestMode: this.isTestMode,
      isConfigured: !!(this.secretKey && this.baseUrl)
    };
  }
}

export default new ChapaService();
