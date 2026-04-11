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
- **Chapa payment gateway integration** (Ethiopian payment methods)

## Main Backend Features

- Auth: register, login, profile
- RBAC: admin, driver, passenger/user/customer/client aliases
- CRUD modules for users, roles, permissions, routes, vehicles, seats, trips, tickets, payments, cargo, cargo receipts, notifications, and reports
- **Chapa payment integration** with Ethiopian payment methods (Telebirr, CBE Birr, etc.)
- Secure payment processing with webhook handling
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

# Chapa Payment Configuration
CHAPA_SECRET_KEY=CHASECK_TEST-your-secret-key-here
CHAPA_WEBHOOK_SECRET=your-webhook-secret-here
CHAPA_BASE_URL=https://api.chapa.co
CHAPA_TEST_MODE=true

# Application URLs
API_BASE_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173
```

3. Create a MySQL database named `menahariya_smart` (or rely on the script below to create it).

4. Import the full schema (tables, Chapa columns, QR/download/seat-lock extras, views, and role seed):

```bash
mysql -u root -p < backend/database/menahariya_smart_full_schema.sql
```

For an **existing** database missing columns or tables, compare your schema to `backend/database/menahariya_smart_full_schema.sql` and apply the needed `ALTER TABLE` / `CREATE TABLE` statements (or reimport on a non-production copy after backup).

5. Review the database connection in `backend/src/config/db.js` and update it for your local MySQL credentials.

6. Configure Chapa payment gateway:

   - Sign up at [dashboard.chapa.co](https://dashboard.chapa.co/)
   - Get your API keys from Settings > API tab
   - Set webhook URL to: `http://localhost:3000/api/payments/chapa/webhook`
   - Update `.env` file with your Chapa credentials

7. Start the backend:

```bash
npm run dev
```

For production:

```bash
npm start
```

The API root will be available at `http://localhost:3000/` unless `PORT` is changed.

## Chapa Payment API

The system supports Chapa payment integration with endpoints such as:

- `POST /api/payments/chapa/initialize` - Initialize payment
- `GET /api/payments/chapa/verify/:tx_ref` - Verify payment
- `POST /api/payments/chapa/webhook` - Handle Chapa webhooks
- `GET /api/payments/chapa/config` - Get configuration status

See `backend/docs/CHAPA_PAYMENT_INTEGRATION.md` for detailed documentation.

## Frontend Setup

1. Install dependencies:

```bash
cd clientes
npm install
```

2. Start the frontend:

```bash
npm run dev
```

3. If needed, set `VITE_API_URL` to your backend base URL. If it is not set, the frontend uses the current origin.

Example:

```env
VITE_API_URL=http://localhost:3000
VITE_ADMIN_ROLE_ID=1
```

## API Base Path

All backend endpoints are mounted under `/api` except the root health check.

- `GET /` - health/info
- `POST /api/register`
- `POST /api/login`
- `GET /api/profile`

## API Modules

- `/api/users`
- `/api/roles`
- `/api/permissions`
- `/api/role-permissions`
- `/api/login-history`
- `/api/routes`
- `/api/vehicles`
- `/api/seats`
- `/api/trips`
- `/api/tickets`
- `/api/payments`
- `/api/cargo`
- `/api/cargo-receipts`
- `/api/notifications`
- `/api/reports`
- `/api/views`

## Views Endpoints

The joined/admin view routes currently include:

- `/api/views/admin-dashboard`
- `/api/views/driver-dashboard`
- `/api/views/passenger-dashboard`
- `/api/views/tickets-relations`
- `/api/views/vehicles-relations`
- `/api/views/cargo-relations`
- `/api/views/seats-relations`
- `/api/views/relations-overview`

## Useful Repo Files

- `backend/postman/Menahariya-Smart-API.postman_collection.json` - ready-to-use Postman collection
- `backend/database/menahariya_smart_full_schema.sql` - full database schema (includes admin relation views)
- `backend/index.js` - backend entry point

## Notes

- Most protected routes require a Bearer token in the `Authorization` header.
- Role checks are enforced in middleware after JWT verification.
- Cargo fees default to `base + weight * rate`, with defaults of `0` base and `15` per kg unless overridden by environment variables.
- The backend currently connects to MySQL using hardcoded connection settings rather than environment-based DB config.
