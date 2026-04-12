# Menahariya Smart Transport System

Full-stack web application for scheduled bus transport: passengers book seats and cargo, staff manage routes and vehicles, drivers run trips, and payments integrate with **Chapa** (Ethiopia). The UI is a single React client with separate experiences for **admin**, **driver**, and **passenger** roles.

> **Security:** Never commit `.env`, database passwords, API keys, or webhook secrets. Copy `backend/.env.example` to `backend/.env` locally and keep secrets out of version control.

---

## Table of contents

- [Overview](#overview)
- [Repository layout](#repository-layout)
- [Architecture](#architecture)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Local setup](#local-setup)
- [Database](#database)
- [Configuration](#configuration)
- [Running the application](#running-the-application)
- [Production deployment](#production-deployment)
- [API surface](#api-surface)
- [Realtime](#realtime)
- [Maps and GPS](#maps-and-gps)
- [Testing and tooling](#testing-and-tooling)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Overview

Menahariya Smart connects **routes**, **vehicles**, **seats**, and **trips** with **tickets**, **payments**, and **cargo**. Passengers use a public landing page, registration with email verification, a dashboard for tickets and shipments, and cargo tracking. Admins and drivers use dedicated portals with RBAC-enforced APIs.

---

## Repository layout

```text
.
├── backend/                 # Express API (Node.js, ESM)
│   ├── index.js             # HTTP server entry
│   ├── src/                 # Routes, controllers, models, middleware, realtime
│   ├── database/            # SQL schema and incremental migrations
│   ├── postman/             # Optional Postman collection
│   └── .env.example         # Environment template (no secrets)
│
└── clientes/                # React SPA (Vite + Tailwind)
    ├── src/
    │   ├── pages/           # Admin, driver, passenger, auth
    │   ├── components/
    │   ├── services/        # REST + Socket.IO client
    │   └── ...
    └── dist/                # Production build output (generated)
```

---

## Architecture

- **REST API** under `/api/*` with JWT bearer authentication for protected routes.
- **MySQL** as the system of record (users, RBAC, trips, tickets, cargo, payments, etc.).
- **Socket.IO** on the same HTTP server for realtime features (e.g. support chat, refund notifications, live GPS fan-out).
- **React Router** for role-based layouts; the client talks to the API using a configurable base URL (`VITE_API_URL`).

---

## Features

| Area | Description |
|------|-------------|
| **Authentication** | Register/login, JWT sessions, role-aware redirects. |
| **Passenger signup** | Email one-time code (OTP) before account creation (SMTP configurable; dev may log OTP to console). |
| **Two-step sign-in** | Optional email-based second factor and profile controls (database migrations required). |
| **RBAC** | Admin, driver, and passenger (and passenger aliases such as user/customer in DB). |
| **Trips & booking** | Public trip browse; authenticated seat booking and ticket lifecycle. |
| **Tickets** | Status, payment state, QR-oriented flows for verification. |
| **Payments** | Chapa initialize/verify/webhook; ticket and cargo payment flows. |
| **Cargo** | Passenger requests, fees, receipts, tracking UI; driver/admin cargo views. |
| **Live GPS** | Drivers may share browser geolocation; admins see fleet map; passengers see drivers for **their** active cargo when allowed (OpenStreetMap + Leaflet; no commercial map API key). |
| **Support** | Support chat threads over Socket.IO (where enabled). |
| **Admin views** | Joined dashboards and relation endpoints for operations. |
| **Landing** | Marketing-style home with trip list, feature highlights, and CTAs. |

---

## Tech stack

**Backend**

- Node.js (ES modules), Express 5, `mysql2`, `jsonwebtoken`, `bcrypt` / `bcryptjs`, `cors`, `helmet`, `express-rate-limit`, `axios`, `nodemailer`, `qrcode`, `socket.io`

**Frontend**

- React 18, Vite 5, React Router 6, Tailwind CSS 3, Socket.IO client, Leaflet + react-leaflet

**Infrastructure (typical)**

- MySQL 8.x (or compatible), HTTPS in production, process manager or container orchestration as you prefer

---

## Prerequisites

- Node.js **18+** (LTS recommended)
- **MySQL** server and a database user with DDL/DML access
- **npm** (or compatible package manager)
- For payments: **Chapa** dashboard account (test keys for development)
- For outbound email (OTP / 2FA): **SMTP** provider credentials (optional in development)

---

## Local setup

1. **Clone the repository** (do not commit local `.env` files).

2. **Backend dependencies**

   ```bash
   cd backend
   npm install
   ```

3. **Frontend dependencies**

   ```bash
   cd ../clientes
   npm install
   ```

4. **Environment file**

   ```bash
   cd ../backend
   cp .env.example .env
   ```

   Edit `.env` and set at least `JWT_SECRET`, database variables, and URLs that match your machine. See [Configuration](#configuration).

---

## Database

1. Create an empty database (name should match `DB_NAME` in `.env`, default `menahariya_smart`).

2. Import the **full schema** (creates tables, seeds, and views as defined in the project):

   ```bash
   mysql -u YOUR_USER -p YOUR_DATABASE < backend/database/menahariya_smart_full_schema.sql
   ```

3. If you maintain an older database, apply incremental scripts under `backend/database/` in order (e.g. passenger registration OTP, two-factor columns, email OTP table) only if those objects are not already present in your schema.

Connection settings are read from environment variables in `backend/src/config/db.js` (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`).

---

## Configuration

All configurable values belong in **`backend/.env`**. The authoritative template is **`backend/.env.example`** (placeholders only — rotate any value that was ever exposed).

Typical groups:

| Group | Purpose |
|-------|---------|
| `PORT`, `NODE_ENV` | Server process |
| `CORS_ORIGIN` | Allowed browser origins (comma-separated in production) |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Access tokens |
| `DB_*` | MySQL connection |
| `CHAPA_*` | Payment gateway (secret key, webhook secret, base URL, test mode flags) |
| `API_BASE_URL`, `FRONTEND_URL` | Absolute URLs for callbacks and links |
| `SMTP_*`, `MAIL_FROM` | Email for OTP and two-step codes |
| `CARGO_FEE_BASE`, `CARGO_FEE_PER_KG` | Default cargo pricing inputs |
| Rate limit vars | Documented in `.env.example` |

**Frontend:** optional `clientes/.env` (or `.env.local`):

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | Backend origin (e.g. `http://localhost:5000`). If unset, the app uses the current browser origin. |

Do **not** put secrets in `VITE_*` variables (they are exposed to the browser).

---

## Running the application

**Terminal 1 — API**

```bash
cd backend
npm run dev
```

**Terminal 2 — Client**

```bash
cd clientes
npm run dev
```

Open the URL Vite prints (commonly `http://localhost:5173`). Ensure CORS and `VITE_API_URL` align with your API port.

**Production build (frontend only)**

```bash
cd clientes
npm run build
```

Serve `clientes/dist` with any static host or reverse proxy, and proxy `/api` and `/socket.io` to the Node server as needed.

**Production API**

```bash
cd backend
npm start
```

Use a process manager, set `NODE_ENV=production`, enforce HTTPS, and restrict `CORS_ORIGIN` to your real frontend origin(s).

---

## Production deployment

- Provision **MySQL**, run migrations / full schema, and back up regularly.
- Set strong **`JWT_SECRET`** and rotate if compromised.
- Use **Chapa live** keys only when `CHAPA_TEST_MODE` and related flags match your intended environment; configure the **webhook URL** in the Chapa dashboard to your public API path.
- Configure **SMTP** for reliable OTP and two-step email delivery.
- Terminate TLS at a reverse proxy (e.g. nginx, Caddy, cloud load balancer).
- Do not expose MySQL ports publicly; keep DB on a private network.

---

## API surface

Protected routes expect:

```http
Authorization: Bearer <access_token>
```

Representative route families (all under `/api` unless noted):

- Auth, profile, role-specific login flows
- Users, roles, permissions, role-permissions, login history
- Routes (linehaul definitions), vehicles, seats, trips
- Tickets, payments (including Chapa), cargo, cargo receipts
- Notifications, reports
- Views: admin/driver/passenger dashboards and relation endpoints

**Health:** `GET /` at the API root for a simple liveness check.

Exact paths and payloads are defined in route files under `backend/src/` and optional **Postman** assets under `backend/postman/`.

---

## Realtime

Socket.IO shares the same origin as the API (`/socket.io`). Clients authenticate with the same JWT used for REST (see client `RealtimeBridge` / `realtimeSocket`).

Events support features such as support messaging, refund request broadcasts, and GPS distribution. Reconnect and token refresh behavior should be validated in your deployment.

---

## Maps and GPS

- Map tiles use **OpenStreetMap** (no API key).
- Driver positions are **ephemeral** (in-memory on the API server) unless you extend the design; they are intended for operational visibility, not long-term audit logs.
- Passenger map access is **scoped** by the server to cargo ownership and trip assignment.

---

## Testing and tooling

- **Postman:** `backend/postman/Menahariya-Smart-API.postman_collection.json` (import and set environment variables for your host and token).
- **Chapa:** use dashboard test mode and test keys during development; see Chapa’s official documentation for webhook signing and IP allowlists.

---

## Troubleshooting

| Issue | Suggestion |
|-------|------------|
| DB connection errors | Confirm MySQL is running, database exists, and `DB_*` in `.env` match. |
| CORS errors | Set `CORS_ORIGIN` to your frontend origin; avoid `*` in production with credentials. |
| Chapa webhook failures | Verify public HTTPS URL, raw body handling if applicable, and `CHAPA_WEBHOOK_SECRET`. |
| Email not sent | Check SMTP vars; in dev, OTP may print to the server console when SMTP is not configured. |
| Socket disconnects | Check JWT expiry, proxy timeouts, and that `/socket.io` is not stripped by the reverse proxy. |

---

## Contributing

1. Fork and branch from the default branch.
2. Keep secrets in `.env` only; never commit them.
3. Run backend and client linters/builds before opening a pull request.
4. Describe schema changes with SQL migrations or updates to the full schema file, as appropriate for your workflow.

---

## License

Specify your license in a `LICENSE` file at the repository root (e.g. MIT). If no license is added, default copyright applies and others should not assume permission to reuse the code.

---

## Acknowledgements

- [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors for map tiles  
- [Chapa](https://chapa.co/) for payment integration  
- Stack choices as listed in each package’s `package.json`
