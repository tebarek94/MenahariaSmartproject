# QR Code One-Time Use Functionality

## Overview

This document describes the implementation of one-time use QR codes for tickets in the Menahariya Smart system. QR codes are now generated with unique tokens that expire after first use or after a specified time period.

## Features

### One-Time Use
- Each QR code contains a unique token that can only be used once
- After successful validation, the QR code is marked as "used" and cannot be used again
- Used QR codes display an "expired" message when scanned

### Expiration Time
- QR codes automatically expire after 24 hours (configurable)
- Expired QR codes cannot be validated even if not used
- Admin can regenerate QR codes for tickets

### Audit Trail
- All QR code usage attempts are logged
- IP address and user agent are recorded for each validation attempt
- Success and failure attempts are tracked separately

## Database Schema

### New Fields in `tickets` table:
- `qr_code_token` - Unique token for QR code validation
- `qr_code_used` - Boolean flag indicating if QR code has been used
- `qr_code_used_at` - Timestamp when QR code was used
- `qr_code_expires_at` - Expiration timestamp for QR code
- `qr_code_ip` - IP address that used the QR code
- `qr_code_user_agent` - User agent of device that used QR code

### New Table: `qr_code_usage_logs`
- Tracks all QR code validation attempts
- Records ticket ID, token, IP, user agent, success/failure, and timestamps
- Provides audit trail for security and debugging

## API Endpoints

### QR Code Validation
```
POST /api/tickets/validate-qr
Body: { "token": "qr_token_here" }
```

### QR Code Regeneration
```
POST /api/tickets/:id/regenerate-qr
```

### QR Code Status
```
GET /api/tickets/:id/qr-status
```

## Frontend Features

### Admin Ticket Management
- QR code status indicators (Used/Expired/Valid)
- "View QR Status" button to see detailed information
- "Regenerate QR" button to create new QR codes
- Visual indicators in the ticket list

### QR Code Status Modal
Shows:
- Whether QR code exists
- Usage status
- Expiration time
- IP address of usage
- Timestamp of usage

## Security Features

### Token Generation
- Uses cryptographically secure random tokens (32 bytes)
- Tokens are unique for each QR code generation

### Validation Logic
- Checks if token exists
- Verifies token hasn't been used
- Validates expiration time
- Checks ticket status (must be 'confirmed' or 'reserved')

### Audit Logging
- All validation attempts are logged
- Failed attempts are recorded with error reasons
- IP addresses and user agents tracked for security

## Usage Flow

### 1. Ticket Creation
- When a ticket is created, a QR code token is automatically generated
- QR code expires after 24 hours
- QR code contains token and ticket information

### 2. QR Code Validation
- User scans QR code with mobile app or web scanner
- System validates token and checks usage/expiration
- If valid, marks QR code as used and updates ticket status
- Returns ticket information to validator

### 3. QR Code Regeneration
- Admin can regenerate QR codes if needed
- New token is generated with new expiration time
- Old token becomes invalid

## Error Handling

### Validation Errors
- "Token not found" - QR code doesn't exist
- "QR code already used" - QR code was previously validated
- "QR code expired" - QR code passed expiration time
- "Invalid ticket status" - Ticket is not in valid state

### Frontend Errors
- Network errors when calling QR endpoints
- Permission errors for unauthorized users
- Server errors during QR generation

## Configuration

### Expiration Time
- Default: 24 hours
- Configurable in `generateQrExpirationTime()` function
- Can be adjusted per requirements

### QR Code Size
- Default: 280x280 pixels
- Configurable in QR generation options
- Error correction level: "M" (medium)

## Migration

Run the database migration to add new fields:
```sql
-- Run migration file
mysql -u root -p menahariya_smart < database/migrations/002_add_qr_code_expiration.sql
```

## Testing

### Unit Tests
- Test token generation
- Test validation logic
- Test expiration handling

### Integration Tests
- Test QR code generation API
- Test validation API
- Test regeneration API

### Manual Testing
- Create ticket and verify QR code generation
- Validate QR code and verify one-time use
- Test expiration functionality
- Test regeneration from admin interface

## Troubleshooting

### Common Issues
1. **QR codes not showing**: Check if migration was run
2. **Validation failing**: Verify token exists and hasn't expired
3. **Permission errors**: Check user roles and permissions
4. **Database errors**: Verify all new fields exist

### Debug Information
- Check `qr_code_usage_logs` table for validation attempts
- Verify `qr_code_token` and `qr_code_expires_at` fields
- Check browser console for frontend errors
- Review server logs for API errors

## Future Enhancements

### Possible Improvements
- Customizable expiration times per ticket type
- QR code analytics and reporting
- Bulk QR code regeneration
- QR code template customization
- Integration with mobile scanning apps

### Security Enhancements
- Rate limiting for validation attempts
- Geographic restrictions for QR usage
- Device fingerprinting for additional security
- QR code watermarking for branding
