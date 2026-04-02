# 🚀 Sales Management System (SMS)

A full-stack Sales Management System with Role-Based Access Control (RBAC), real-time notifications, print templates, and comprehensive reporting.

---

## 📋 Table of Contents
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Setup](#environment-setup)
- [Database Setup](#database-setup)
- [Running the Project](#running-the-project)
- [Login Credentials](#login-credentials)
- [Project Structure](#project-structure)
- [API Overview](#api-overview)
- [Features](#features)

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────┐
│              React Frontend (Vite)          │
│         TailwindCSS + Chart.js              │
│              Port: 5173                     │
└──────────────────┬──────────────────────────┘
                   │ HTTP / WebSocket
┌──────────────────▼──────────────────────────┐
│          Node.js + Express Backend          │
│     JWT Auth + RBAC + Socket.IO             │
│              Port: 5000                     │
└──────────────────┬──────────────────────────┘
                   │ Prisma ORM
┌──────────────────▼──────────────────────────┐
│           PostgreSQL Database               │
│         17 Tables + Soft Deletes            │
└─────────────────────────────────────────────┘
```

### Roles
| Role | Access |
|------|--------|
| **SuperAdmin** | Full system control, user management, module permissions |
| **Admin** | Module-specific access (configured by SuperAdmin) |
| **Salesperson** | Own orders, expenses, payments, announcements |

---

## 📦 Prerequisites

- **Node.js** v18+ → https://nodejs.org
- **PostgreSQL** v13+ → https://postgresql.org
- **npm** v8+

---

## 🛠 Installation

### Step 1: Clone / Extract project

```bash
cd sales-management-system
```

### Step 2: Install Backend Dependencies

```bash
cd backend
npm install
```

### Step 3: Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

---

## ⚙️ Environment Setup

### Backend `.env`

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
# Database - UPDATE THIS
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/sales_management_db"

# JWT Secret - CHANGE THIS to a random 32+ char string
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production-abc123"

JWT_EXPIRES_IN="8h"
PORT=5000
NODE_ENV=development
FRONTEND_URL="http://localhost:5173"

BCRYPT_SALT_ROUNDS=10
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_ATTEMPTS=5
ACCOUNT_LOCK_DURATION_MINUTES=30
```

---

## 🗄 Database Setup

### Step 1: Create PostgreSQL Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE sales_management_db;
\q
```

### Step 2: Run Prisma Migrations

```bash
cd backend

# Generate Prisma client
npx prisma generate

# Run migration (creates all tables)
npx prisma migrate dev --name init

# Alternative: push schema directly (faster for dev)
npx prisma db push
```

### Step 3: Seed Sample Data

```bash
node scripts/seed.js
```

This creates all sample data including users, parties, inventory, orders, payments, expenses, and announcements.

---

## 🚀 Running the Project

### Start Backend (Terminal 1)

```bash
cd backend
npm run dev
```

Backend runs at: **http://localhost:5000**

### Start Frontend (Terminal 2)

```bash
cd frontend
npm run dev
```

Frontend runs at: **http://localhost:5173**

---

## 🔑 Login Credentials

| Role | Login Field | Credential | Password |
|------|------------|------------|----------|
| Super Admin | Email | superadmin@sms.com | Admin1234 |
| Admin (Full Access) | Email | admin1@sms.com | Admin1234 |
| Admin (Limited) | Email | admin2@sms.com | Admin1234 |
| Salesperson 1 | Employee ID | EMP00001 | Pass1234 |
| Salesperson 2 | Employee ID | EMP00002 | Pass1234 |
| Salesperson 3 | Employee ID | EMP00003 | Pass1234 |

---

## 📁 Project Structure

```
sales-management-system/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma          # Database schema (17 tables)
│   ├── scripts/
│   │   └── seed.js                # Sample data seeder
│   ├── src/
│   │   ├── app.js                 # Express app + Socket.IO setup
│   │   ├── config/
│   │   │   └── database.js        # Prisma client
│   │   ├── controllers/           # Business logic
│   │   │   ├── auth.controller.js
│   │   │   ├── superAdmin.controller.js
│   │   │   ├── salesperson.controller.js
│   │   │   ├── party.controller.js
│   │   │   ├── inventory.controller.js
│   │   │   ├── order.controller.js
│   │   │   ├── expense.controller.js
│   │   │   ├── payment.controller.js
│   │   │   ├── announcement.controller.js
│   │   │   ├── report.controller.js
│   │   │   ├── dashboard.controller.js
│   │   │   └── print.controller.js
│   │   ├── middleware/
│   │   │   ├── auth.js            # JWT + RBAC middleware
│   │   │   ├── errorHandler.js    # Global error handler
│   │   │   ├── rateLimiter.js     # Rate limiting
│   │   │   ├── upload.js          # Multer file upload
│   │   │   └── validation.js      # Input validation + XSS
│   │   ├── routes/                # Express routers
│   │   ├── sockets/
│   │   │   └── socket.js          # Socket.IO real-time
│   │   └── utils/
│   │       ├── audit.js           # Audit logging
│   │       ├── jwt.js             # JWT helpers
│   │       ├── logger.js          # Winston logger
│   │       ├── numberToWords.js   # Amount in words
│   │       └── response.js        # Response helpers
│   ├── uploads/                   # File uploads (auto-created)
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx                # Routes + App setup
│   │   ├── main.jsx               # React entry point
│   │   ├── components/
│   │   │   ├── index.jsx          # Shared UI components
│   │   │   ├── LoadingSpinner.jsx
│   │   │   ├── OrderPrintTemplate.jsx
│   │   │   ├── ExpensePrintTemplate.jsx
│   │   │   └── PaymentPrintTemplate.jsx
│   │   ├── contexts/
│   │   │   ├── AuthContext.jsx    # Auth state + login/logout
│   │   │   └── SocketContext.jsx  # WebSocket + notifications
│   │   ├── layouts/
│   │   │   └── MainLayout.jsx     # Sidebar + header layout
│   │   ├── pages/                 # All page components
│   │   │   ├── LoginPage.jsx
│   │   │   ├── SuperAdminDashboard.jsx
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── SalespersonDashboard.jsx
│   │   │   ├── AdminsPage.jsx
│   │   │   ├── PermissionsPage.jsx
│   │   │   ├── SalespersonsPage.jsx
│   │   │   ├── PartiesPage.jsx
│   │   │   ├── InventoryPage.jsx
│   │   │   ├── OrdersPage.jsx
│   │   │   ├── ExpensesPage.jsx
│   │   │   ├── PaymentsPage.jsx
│   │   │   ├── AnnouncementsPage.jsx
│   │   │   ├── ReportsPage.jsx
│   │   │   ├── AuditLogsPage.jsx
│   │   │   ├── SystemConfigPage.jsx
│   │   │   └── PrintTemplatePage.jsx
│   │   ├── services/
│   │   │   └── api.js             # Axios instance
│   │   ├── styles/
│   │   │   └── index.css          # Tailwind + custom CSS
│   │   └── utils/
│   │       └── numberToWords.js   # Amount in words
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
└── database/
    └── migration.sql              # Raw SQL migration (reference)
```

---

## 🔌 API Overview

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/super-admin/login` | Super Admin login |
| POST | `/api/auth/admin/login` | Admin login |
| POST | `/api/auth/salesperson/login` | Salesperson login |
| POST | `/api/auth/logout` | Logout |
| GET  | `/api/auth/me` | Get current user |

### Super Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/super-admin/admins` | List all admins |
| POST | `/api/super-admin/admins` | Create admin |
| PUT | `/api/super-admin/admins/:id/permissions` | Update permissions |
| GET/PUT | `/api/super-admin/configs` | System config |

### Core Modules (all require auth)
| Resource | Base Path | Operations |
|----------|-----------|-----------|
| Salespersons | `/api/salespersons` | CRUD + toggle status + reset password |
| Parties | `/api/parties` | CRUD + toggle status |
| Inventory | `/api/inventory` | CRUD + stock adjustment |
| Orders | `/api/orders` | CRUD + approve/dispatch/deliver/cancel |
| Expenses | `/api/expenses` | CRUD + approve/reject + types |
| Payments | `/api/payments` | CRUD + verify/reject |
| Announcements | `/api/announcements` | CRUD + send + inbox + mark-read |
| Reports | `/api/reports` | 5 report types + export |
| Dashboard | `/api/dashboard` | admin/salesperson/super-admin |

---

## ✨ Features

### Security
- ✅ JWT authentication (8h expiry)
- ✅ bcrypt password hashing (rounds: 10)
- ✅ Rate limiting on login (5 attempts / 15 min)
- ✅ Account lockout after 5 failed attempts (30 min)
- ✅ Role-Based Access Control (SuperAdmin/Admin/Salesperson)
- ✅ Module-level permissions (NoAccess/ViewOnly/ViewEdit/FullAccess)
- ✅ XSS protection on all inputs
- ✅ SQL injection prevention (Prisma parameterized queries)
- ✅ CORS protection
- ✅ Helmet security headers
- ✅ File upload validation (5MB max, image/PDF only)

### Real-time (Socket.IO)
- ✅ New announcement delivery
- ✅ Order status updates
- ✅ Expense approval/rejection notifications
- ✅ Payment verification notifications
- ✅ Low stock alerts
- ✅ New order notifications for admins

### Reports
- ✅ Order vs Payment reconciliation
- ✅ Expense vs Budget
- ✅ Payment Collection
- ✅ Salesperson Performance (with rankings)
- ✅ Inventory Valuation
- ✅ Export to Excel / CSV

### Print Templates
- ✅ Order print (with amount in words, signatures)
- ✅ Payment receipt (verified stamp)
- ✅ Expense report
- ✅ Company logo upload
- ✅ Print-optimized CSS

### Audit Trail
- ✅ All CRUD operations logged
- ✅ Login attempts tracked
- ✅ Permission changes logged with before/after
- ✅ Super Admin actions specially flagged

---

## 🔧 VS Code Setup

### Recommended Extensions
```json
{
  "recommendations": [
    "prisma.prisma",
    "bradlc.vscode-tailwindcss",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

### Debug Configuration (`.vscode/launch.json`)
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "program": "${workspaceFolder}/backend/src/app.js",
      "envFile": "${workspaceFolder}/backend/.env",
      "console": "integratedTerminal"
    }
  ]
}
```

---

## 🩺 Troubleshooting

### "Cannot connect to database"
- Ensure PostgreSQL is running: `sudo service postgresql start`
- Verify DATABASE_URL in `.env`
- Check database exists: `psql -U postgres -l`

### "Prisma client not generated"
```bash
cd backend && npx prisma generate
```

### "Module not found"
```bash
cd backend && npm install
cd ../frontend && npm install
```

### Port already in use
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9
```

---

## 📊 Database ER Diagram (Summary)

```
SuperAdmin ──< AuditLog
Admin ──< ModulePermission
Admin ──< Announcement ──< AnnouncementRecipient >── Salesperson
Admin ──< Expense (approvedBy)                  ──< AnnouncementRead
Admin ──< Payment (verifiedBy)
Salesperson ──< Order ──< OrderItem >── InventoryItem
Salesperson ──< Expense >── ExpenseType
Salesperson ──< Payment
Order >── Party
Payment >── Party
```

---

*Built with Node.js, Express, Prisma, PostgreSQL, React, Vite, TailwindCSS, Socket.IO*
