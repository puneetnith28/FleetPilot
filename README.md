# 🚛 FleetPilot

<div align="center">
  <strong>A full-stack fleet management platform built for real-time vehicle tracking, trip dispatch workflows, driver management, and operational analytics.</strong>
</div>

<br/>

## 📖 Table of Contents
- [Quick Start (Docker)](#-quick-start-docker)
- [Demo Login Credentials](#-demo-login-credentials)
- [Demo Script (Judges Checklist)](#-demo-script-judges-checklist)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Business Rules Enforced (Server-Side)](#-business-rules-enforced-server-side)
- [Assumptions](#-assumptions)
- [Local Dev (without Docker)](#-local-dev-without-docker)
- [API Reference](#-api-reference)

---

## 🚀 Quick Start (Docker)

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

### 1. Clone & Configure
```bash
git clone <repo-url>
cd FleetPilot
cp .env.example .env  # No changes needed for Docker
```

### 2. Start Everything
```bash
docker compose up --build
```
*This command will:*
1. Start **PostgreSQL** on port `5432`
2. Run **Prisma migrations** automatically
3. Seed the database with demo data
4. Start the **Backend API** on `http://localhost:3001`
5. Serve the **Frontend** on `http://localhost:5173`

### 3. Open the App
👉 **[http://localhost:5173](http://localhost:5173)**

---

## 🔐 Demo Login Credentials

| Role | Email | Password |
|------|-------|----------|
| 🔵 **Fleet Manager** | `fleet@fleetpilot.com` | `fleet123` |
| 🟢 **Driver** | `driver@fleetpilot.com` | `fleet123` |
| 🟡 **Safety Officer** | `safety@fleetpilot.com` | `fleet123` |
| 🟣 **Financial Analyst** | `finance@fleetpilot.com` | `fleet123` |

---

## ✅ Demo Script (Judges Checklist)

1. **Log in** as Fleet Manager.
2. **Register vehicle** "Van-05" — `VAN-05`, type VAN, max capacity 500 kg, status Available.
3. **Register driver** "Alex" — any valid future license date.
4. **Log in** as Driver (or stay as Fleet Manager) → **Create Trip**: cargo 450 kg → ✅ Succeeds.
5. **Create Trip**: cargo 600 kg → ❌ Rejected "exceeds max load capacity (500 kg)".
6. **Dispatch the trip** → Van-05 and Alex both flip to "On Trip", disappear from dropdowns.
7. **Complete the trip** → Enter odometer + fuel consumed → both flip to "Available".
8. **Create Maintenance Log** for Van-05 → vehicle flips to "In Shop", disappears from vehicle dropdown.
9. **Close the maintenance log** → vehicle flips back to "Available".
10. **Reports page** → Fuel efficiency and cost charts reflect the trip and fuel log just created.
11. **Dashboard** → KPI cards updated live throughout.

---

## 💻 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS, shadcn/ui (Radix), TanStack Query, Recharts |
| **Backend** | Node.js, Express, TypeScript, Zod validation |
| **Database** | PostgreSQL 15 via Prisma ORM |
| **Auth** | JWT (localStorage), bcrypt password hashing |
| **Infra** | Docker Compose |

---

## 🏗 Architecture

```text
FleetPilot/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # Data model
│   │   └── seed.ts            # Demo data
│   └── src/
│       ├── index.ts           # Express app
│       ├── middleware/auth.ts # JWT + RBAC
│       ├── validators/        # Zod schemas
│       └── routes/            # API endpoints
├── frontend/
│   └── src/
│       ├── pages/             # All pages
│       ├── components/        # UI + layout
│       ├── contexts/          # Auth context
│       └── lib/               # API client, utils
└── docker-compose.yml
```

---

## 🛡 Business Rules Enforced (Server-Side)

1. **Unique registration** — Duplicate vehicle reg numbers rejected with clear error.
2. **Retired/In Shop vehicles** — Never appear in dispatch selection.
3. **Expired license / Suspended drivers** — Cannot be assigned to trips.
4. **On Trip vehicle or driver** — Cannot be assigned to another trip (race condition safe).
5. **Cargo weight ≤ vehicle max load capacity** — Validated on create and on dispatch.
6. **Dispatch** → Vehicle + driver both flip to `ON_TRIP` (atomic transaction).
7. **Complete** → Vehicle + driver flip to `AVAILABLE`, odometer updated, fuel log auto-created.
8. **Cancel (from DISPATCHED)** → Vehicle + driver restored to `AVAILABLE`.

---

## 📌 Assumptions

1. **Revenue** is a manual field on `Trip` (optional). Summed per vehicle for ROI calculation.
2. **Operational Cost** = `FuelLog.cost` + `MaintenanceLog.cost` + `Expense.amount` per vehicle.
3. **Auth** uses `localStorage` JWT for hackathon speed (`httpOnly` cookies in production).
4. **CSV export** is client-side from the current reports table data — no backend export service.
5. **Fuel cost on trip completion** is estimated at the fuel log level; actual cost can be edited via the Fuel page.
6. **Fleet Utilization** = `(ON_TRIP + IN_SHOP) / (all non-RETIRED vehicles) × 100%`.
7. **Signup endpoint** exists at `POST /api/auth/signup` — seeded demo accounts are the primary demo flow.

---

## 🛠 Local Dev (without Docker)

*Requires Node.js 20+ and a running PostgreSQL instance.*

```bash
# Backend
cd backend
cp ../.env.example .env
# Edit DATABASE_URL in .env to point to your Postgres
npm install
npx prisma migrate dev --name init
npm run seed
npm run dev

# Frontend (separate terminal)
cd frontend
npm install
# Create frontend/.env.local: VITE_API_URL=http://localhost:3001
npm run dev
```

---

## 🌐 API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | `POST` | Login |
| `/api/auth/signup` | `POST` | Create account |
| `/api/auth/me` | `GET` | Current user |
| `/api/vehicles` | `GET`/`POST` | List / Create vehicles |
| `/api/vehicles/:id` | `GET`/`PUT`/`DELETE` | Single vehicle |
| `/api/drivers` | `GET`/`POST` | List / Create drivers |
| `/api/drivers/:id` | `GET`/`PUT`/`DELETE` | Single driver |
| `/api/trips` | `GET`/`POST` | List / Create trips |
| `/api/trips/:id/dispatch` | `POST` | Dispatch trip |
| `/api/trips/:id/complete` | `POST` | Complete trip |
| `/api/trips/:id/cancel` | `POST` | Cancel trip |
| `/api/maintenance` | `GET`/`POST` | Maintenance logs |
| `/api/maintenance/:id/close` | `POST` | Close log |
| `/api/fuel` | `GET`/`POST` | Fuel logs |
| `/api/expenses` | `GET`/`POST` | Expense logs |
| `/api/dashboard` | `GET` | Live KPIs |
| `/api/reports` | `GET` | Analytics report |
