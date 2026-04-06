# Menahariya Smart Project

This repository contains a Node.js/Express backend and a React/Vite frontend for a transport management system. The API covers authentication, role-based access control, trips, tickets, cargo, payments, notifications, reports, and joined admin dashboard views.

## Project Structure

```text
.
|-- backend/    # Express + MySQL API
`-- clientes/   # React + Vite frontend
```

## Backend Stack

- Node.js with ES modules
- Express
- MySQL (`mysql2`)
- JWT authentication
- bcrypt password hashing
- QR code generation for tickets

## Main Backend Features

- Auth: register, login, profile
- RBAC: admin, driver, passenger/user/customer/client aliases
- CRUD modules for users, roles, permissions, routes, vehicles, seats, trips, tickets, payments, cargo, cargo receipts, notifications, and reports
- Admin-only relation views and dashboard endpoints
- Cargo fee calculation with optional admin override
- Postman collection included for API testing

## Backend Setup

1. Install dependencies:

```bash
cd backend
npm install
```

2. Create a `.env` file in `backend/` with at least:

```env
PORT=3000
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1d
CARGO_FEE_BASE=0
CARGO_FEE_PER_KG=15
```

3. Create a MySQL database named `menahariya_smart`.



- Most protected routes require a Bearer token in the `Authorization` header.
- Role checks are enforced in middleware after JWT verification.
- Cargo fees default to `base + weight * rate`, with defaults of `0` base and `15` per kg unless overridden by environment variables.
- The backend currently connects to MySQL using hardcoded connection settings rather than environment-based DB config.
