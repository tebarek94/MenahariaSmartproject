# Menahariya Smart Transport - Error Messages Guide

This document contains the correct error messages that should be used throughout the system for consistency and user experience.

## **General System Errors**

### Database Connection Errors
- **"Database connection failed. Please check MySQL server and credentials."**
  - Used when: MySQL connection cannot be established
  - Location: `config/db.js`

- **"Database connection is not established. Please check MySQL server."**
  - Used when: Database is not connected for queries
  - Location: `queryAsync` function

- **"Service temporarily unavailable. Please try again later."**
  - Used when: Database is temporarily down
  - Location: API responses

### Authentication Errors
- **"Invalid email or password. Please try again."**
  - Used when: Login credentials are incorrect
  - Location: `authController`

- **"Session expired. Please login again."**
  - Used when: User session has timed out
  - Location: Authentication middleware

- **"Access denied. You don't have permission for this action."**
  - Used when: User tries to access restricted resources
  - Location: Role-based access control

- **"Account not verified. Please check your email."**
  - Used when: User account is not verified
  - Location: User registration/login

## **Ticket Management Errors**

### Ticket Creation/Booking Errors
- **"No available seats for this trip."**
  - Used when: All seats are booked for a specific trip
  - Location: `ticketController` create function

- **"Selected seat is already booked."**
  - Used when: User tries to book an already occupied seat
  - Location: `seatModel` validation

- **"Seat number exceeds vehicle capacity."**
  - Used when: Seat number is invalid for the vehicle
  - Location: `seatModel` validation

- **"Invalid seat number. Please select a valid seat."**
  - Used when: Seat doesn't exist for the vehicle
  - Location: `seatModel` validation

- **"Ticket not found."**
  - Used when: Ticket ID doesn't exist
  - Location: `ticketController` get/update functions

- **"Ticket already cancelled."**
  - Used when: Trying to modify a cancelled ticket
  - Location: `ticketController` update function

- **"Cannot modify confirmed ticket."**
  - Used when: Trying to change a confirmed ticket
  - Location: `ticketController` update function

- **"Payment required for this ticket."**
  - Used when: Ticket needs payment but none provided
  - Location: `ticketController` create/update

## **Payment Processing Errors**

### Chapa Payment Errors
- **"Payment initialization failed. Please try again."**
  - Used when: Chapa payment cannot be initialized
  - Location: `chapaPaymentController`

- **"Payment verification failed. Please check payment details."**
  - Used when: Chapa payment verification fails
  - Location: `chapaPaymentController`

- **"Invalid payment amount. Please check ticket price."**
  - Used when: Payment amount doesn't match ticket price
  - Location: `chapaPaymentController`

- **"Payment processing failed. Please contact support."**
  - Used when: Payment processing encounters technical issues
  - Location: `chapaPaymentController`

- **"Transaction reference is required."**
  - Used when: Missing transaction reference
  - Location: `chapaPaymentController`

## **QR Code Errors**

### QR Code Generation/Validation Errors
- **"QR code generation failed. Please try again."**
  - Used when: QR code cannot be generated
  - Location: `ticketQr.js` generation

- **"Invalid QR code token."**
  - Used when: QR token is malformed or expired
  - Location: `ticketController` validation

- **"QR code already used."**
  - Used when: Trying to reuse a used QR code
  - Location: `ticketController` validation

- **"QR code expired."**
  - Used when: QR code has passed expiration time
  - Location: `ticketController` validation

## **Download Errors**

### Download Token Errors
- **"Download token generation failed. Please try again."**
  - Used when: Download token cannot be created
  - Location: `ticketController` generateDownloadToken

- **"Download token expired."**
  - Used when: Download token has expired
  - Location: `ticketController` download validation

- **"Download already used."**
  - Used when: Trying to reuse a used download token
  - Location: `ticketController` download validation

## **Vehicle Management Errors**

### Vehicle Management Errors
- **"Vehicle not found."**
  - Used when: Vehicle ID doesn't exist
  - Location: `vehicleController` get/update/delete

- **"Vehicle already assigned to active trip."**
  - Used when: Trying to modify vehicle on active trip
  - Location: `vehicleController` update

- **"Invalid vehicle capacity."**
  - Used when: Vehicle capacity is invalid
  - Location: `vehicleController` create/update

- **"License plate already exists."**
  - Used when: Vehicle plate number is already registered
  - Location: `vehicleController` create

## **User Management Errors**

### User Registration/Profile Errors
- **"Email already registered."**
  - Used when: Trying to register with existing email
  - Location: `userController` create

- **"Invalid email format."**
  - Used when: Email format is invalid
  - Location: `userController` create/update

- **"Phone number already registered."**
  - Used when: Phone number is already in use
  - Location: `userController` create

- **"Account verification required."**
  - Used when: User needs to verify account
  - Location: `userController` login/profile access

## **Route Management Errors**

### Route Management Errors
- **"Route not found."**
  - Used when: Route ID doesn't exist
  - Location: `routeController` get/update/delete

- **"Route already exists."**
  - Used when: Trying to create duplicate route
  - Location: `routeController` create

- **"Invalid route coordinates."**
  - Used when: Route coordinates are invalid
  - Location: `routeController` create/update

## **File Upload Errors**

### File Upload Errors
- **"File upload failed. Please try again."**
  - Used when: File cannot be uploaded
  - Location: File upload handlers

- **"Invalid file format. Only PDF, JPG, PNG allowed."**
  - Used when: File format is not supported
  - Location: File upload validation

- **"File size exceeds limit. Maximum size is 5MB."**
  - Used when: File is too large
  - Location: File upload validation

## **Success Messages**

### Success Messages (for consistency)
- **"Ticket booked successfully!"**
  - Used when: Ticket is successfully created/booked
  - Location: `ticketController` create

- **"Payment processed successfully!"**
  - Used when: Payment is completed successfully
  - Location: `chapaPaymentController`

- **"QR code generated successfully!"**
  - Used when: QR code is created successfully
  - Location: `ticketController` generate/regenerate

- **"Download started successfully!"**
  - Used when: Download is initiated successfully
  - Location: `ticketController` download

- **"Profile updated successfully!"**
  - Used when: User profile is updated
  - Location: `userController` update

- **"Vehicle added successfully!"**
  - Used when: Vehicle is created successfully
  - Location: `vehicleController` create

## **Usage Guidelines**

### Error Message Format
1. **Be specific and actionable**
   - Bad: "Error occurred"
   - Good: "No available seats for this trip"

2. **Use proper grammar and spelling**
   - Bad: "Seat are already booked"
   - Good: "Selected seat is already booked"

3. **Provide helpful guidance when possible**
   - Bad: "Failed"
   - Good: "Payment failed. Please check your card details and try again."

4. **Be consistent with terminology**
   - Use "ticket" consistently, not "booking" or "reservation"
   - Use "vehicle" consistently, not "bus" or "car"

5. **Include error codes for technical issues**
   - For development: Include error codes and stack traces
   - For production: User-friendly messages only

### Localization
- All error messages should be in English
- Consider Amharic translations for Ethiopian users
- Use simple, clear language

### Testing
- All error messages should be tested with actual scenarios
- Ensure error messages appear correctly in UI
- Test edge cases and boundary conditions
