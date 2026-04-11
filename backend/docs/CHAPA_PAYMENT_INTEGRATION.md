# Chapa Payment Integration Documentation

## Overview

This document explains the Chapa payment gateway integration for the Menahariya Smart transport management system. Chapa is an Ethiopian payment processing platform that supports local payment methods like Telebirr, CBE Birr, and international card payments.

## Features

- **Secure Payment Processing**: Integration with Chapa's secure payment API
- **Multiple Payment Methods**: Support for Telebirr, CBE Birr, BOA Mobile, and more
- **Webhook Handling**: Automatic payment status updates via webhooks
- **Transaction Tracking**: Complete payment attempt logging and verification
- **Backward Compatibility**: Existing payment functionality remains intact

## Architecture

### Components

1. **ChapaService** (`src/services/chapaService.js`)
   - Handles Chapa API communication
   - Transaction initialization and verification
   - Webhook signature validation
   - Phone number formatting for Ethiopian numbers

2. **Enhanced Payment Model** (`src/models/chapaPaymentModel.js`)
   - Extended payment tables with Chapa-specific fields
   - Payment attempts tracking
   - Webhook logging
   - Analytics functions

3. **Payment Controller** (`src/controllers/chapaPaymentController.js`)
   - Chapa payment initialization
   - Payment verification
   - Webhook processing
   - Configuration management

4. **Enhanced Routes** (`src/routes/chapaPaymentRoutes.js`)
   - New Chapa-specific endpoints
   - Webhook endpoint (no authentication required)
   - Backward compatible payment endpoints

## Database Schema

### Enhanced Payments Table

```sql
ALTER TABLE payments ADD COLUMN (
  chapa_tx_ref VARCHAR(100),
  chapa_checkout_url VARCHAR(500),
  chapa_ref_id VARCHAR(100),
  payment_method_type ENUM('chapa', 'cash', 'bank_transfer', 'mobile_money'),
  currency VARCHAR(3) DEFAULT 'ETB',
  customer_email VARCHAR(255),
  customer_phone VARCHAR(20),
  callback_url VARCHAR(500),
  return_url VARCHAR(500),
  payment_verified BOOLEAN DEFAULT FALSE,
  payment_verified_at TIMESTAMP NULL,
  chapa_response JSON NULL,
  verification_attempts INT DEFAULT 0
);
```

### Payment Attempts Table

Tracks individual payment attempts with Chapa:

```sql
CREATE TABLE payment_attempts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  payment_id INT NULL,
  ticket_id INT NULL,
  user_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'ETB',
  chapa_tx_ref VARCHAR(100) NOT NULL UNIQUE,
  status ENUM('pending', 'processing', 'success', 'failed', 'cancelled'),
  checkout_url VARCHAR(500) NULL,
  chapa_response JSON NULL,
  verification_response JSON NULL,
  error_message TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Payment Webhooks Table

Logs all Chapa webhook events:

```sql
CREATE TABLE payment_webhooks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  chapa_tx_ref VARCHAR(100) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  payload JSON NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP NULL,
  error_message TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

### Chapa Payment Endpoints

#### Initialize Payment
```
POST /api/payments/chapa/initialize
```

**Request Body:**
```json
{
  "ticket_id": 123,
  "amount": 100.00,
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "phone_number": "0912345678"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Payment initialized successfully",
    "payment_id": 456,
    "tx_ref": "menahariya_123_45_1234567890_abc123",
    "checkout_url": "https://checkout.chapa.co/xyz789",
    "amount": 100.00,
    "currency": "ETB"
  }
}
```

#### Verify Payment
```
GET /api/payments/chapa/verify/:tx_ref
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Payment verified successfully",
    "status": "success",
    "amount": 100.00,
    "currency": "ETB",
    "paid_at": "2024-01-15T10:30:00Z"
  }
}
```

#### Webhook Handler
```
POST /api/payments/chapa/webhook
```

**Headers:**
- `chapa-signature`: Webhook signature for validation

**Request Body:** (varies based on Chapa webhook format)

#### Configuration Status
```
GET /api/payments/chapa/config
```

**Response:**
```json
{
  "success": true,
  "data": {
    "config": {
      "hasSecretKey": true,
      "hasWebhookSecret": true,
      "baseUrl": "https://api.chapa.co",
      "isTestMode": true,
      "isConfigured": true
    },
    "supported_methods": [
      "telebirr", "cbe-birr", "boa-mobile", "awash-bank",
      "dashen-bank", "coop-bank", "berhan-bank", "zemen-bank", "card-payment"
    ]
  }
}
```

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# Chapa Payment Configuration
CHAPA_SECRET_KEY=CHASECK_TEST-your-secret-key-here
CHAPA_WEBHOOK_SECRET=your-webhook-secret-here
CHAPA_BASE_URL=https://api.chapa.co
CHAPA_TEST_MODE=true

# Application URLs
API_BASE_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173
```

### Getting Chapa Credentials

1. **Sign up** at [dashboard.chapa.co](https://dashboard.chapa.co/)
2. **Get API Keys**: Go to Settings > API tab
3. **Configure Webhook**: Set webhook URL to `{API_BASE_URL}/api/payments/chapa/webhook`
4. **Test Mode**: Enable test mode for development

## Payment Flow

### 1. Initialization
```
Client -> Server: Request payment initialization
Server -> Chapa: Create transaction
Chapa -> Server: Return checkout URL
Server -> Client: Return checkout URL
Client -> User: Redirect to Chapa checkout
```

### 2. Payment Processing
```
User -> Chapa: Complete payment
Chapa -> Server: Send webhook notification
Chapa -> Client: Redirect to return URL
```

### 3. Verification
```
Client -> Server: Request payment verification
Server -> Chapa: Verify transaction status
Chapa -> Server: Return transaction details
Server -> Client: Return verification result
```

## Security Features

### Webhook Signature Validation
- HMAC-SHA256 signature validation
- Prevents unauthorized webhook calls
- Configurable webhook secret

### Transaction Reference Generation
- Unique transaction references
- Format: `menahariya_{ticketId}_{userId}_{timestamp}_{random}`
- Prevents duplicate transactions

### Phone Number Validation
- Ethiopian phone number format validation
- Supports 09xxxxxxxx and 07xxxxxxxx formats
- Automatic formatting for Chapa requirements

## Error Handling

### Common Error Scenarios

1. **Invalid Amount**: Amount doesn't match ticket price
2. **Ticket Ownership**: User doesn't own the ticket
3. **Chapa API Errors**: Network issues or API errors
4. **Invalid Webhook**: Signature validation failures
5. **Payment Verification**: Transaction not found or failed

### Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information"
}
```

## Testing

### Test Mode Configuration
Set `CHAPA_TEST_MODE=true` in your environment variables.

### Test Payment Flow
1. Use test credentials from Chapa dashboard
2. Initialize payment with test data
3. Use Chapa's test payment methods
4. Verify webhook processing

### Sample Test Data
```json
{
  "ticket_id": 1,
  "amount": 100.00,
  "email": "test@example.com",
  "first_name": "Test",
  "last_name": "User",
  "phone_number": "0912345678"
}
```

## Monitoring and Analytics

### Payment Statistics
```sql
SELECT 
  COUNT(*) as total_payments,
  SUM(amount) as total_amount,
  COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_payments,
  COUNT(CASE WHEN payment_method_type = 'chapa' THEN 1 END) as chapa_payments
FROM payments;
```

### Failed Payment Analysis
```sql
SELECT 
  error_message,
  COUNT(*) as failure_count,
  created_at
FROM payment_attempts 
WHERE status = 'failed' 
GROUP BY error_message, DATE(created_at);
```

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check CHAPA_SECRET_KEY configuration
2. **Invalid Webhook**: Verify CHAPA_WEBHOOK_SECRET and webhook URL
3. **Payment Not Found**: Check transaction reference format
4. **Database Errors**: Ensure migration scripts were executed

### Debug Mode
Enable debug logging by setting `NODE_ENV=development`.

## Database

Chapa-related tables and columns are included in the full schema:

```bash
mysql -u root -p < database/menahariya_smart_full_schema.sql
```

To remove Chapa-only artifacts from an existing DB, drop or alter the relevant columns/tables manually (there is no bundled rollback script).

### Data Migration
Existing payment records remain compatible. New Chapa-specific fields are NULL for old records.

## Support

For Chapa-specific issues:
- Chapa Documentation: https://developer.chapa.co
- Chapa Support: info@chapa.co

For integration issues:
- Check the application logs
- Verify environment configuration
- Test with Chapa's sandbox environment

## Future Enhancements

1. **Split Payments**: Support for multiple recipients
2. **Subscription Payments**: Recurring payment support
3. **Refund Management**: Automated refund processing
4. **Advanced Analytics**: Payment trend analysis
5. **Mobile SDK Integration**: Direct mobile app payments
