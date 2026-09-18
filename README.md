# 🌐 NexERP Pro — Enterprise HR, Attendance & Automated Payroll Portal

[![React](https://img.shields.io/badge/Frontend-React_18_%2B_Vite_6-blue?logo=react)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_CSS_v3-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Express.js](https://img.shields.io/badge/Backend-Express_4-000000?logo=express)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/Database-SQLite_%2F_sql.js-003B57?logo=sqlite)](https://sqlite.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

NexERP Pro is a full-stack, enterprise-grade **Human Resource Management & Automated Payroll ERP System**. Built with modern technologies, rich glassmorphism dark-theme aesthetics, and mobile/tablet touch responsiveness, it offers an end-to-end solution for workforce attendance tracking, salary structure management, automatic statutory compliance, loan recovery ledgers, and dynamic PDF payslip generation.

---

## ✨ Key Features

### 1. 🕒 Attendance & Punch Tracking System
- **Real-Time Live Punch In / Punch Out**: Interactive punch card with live session timer and GPS geolocation logging.
- **Half Day Management**: One-click half day application with predefined reason selectors and audit remarks.
- **Admin Workforce Status**: Real-time ratio breakdown (Present, Half Day, Absent) and instant override controls.
- **Interactive Employee Attendance Modal**: Click any employee name or row on the dashboard to view their complete monthly attendance metrics, total hours, and day-by-day logs.

### 2. 👥 Employee Directory & 360° Profile
- **Employee Lifecycle Management**: Add new staff, toggle active/inactive status, and configure credentials.
- **Interactive Tabs**: Overview & Bank Details, Attendance Calendar, Salary & Payslips, Advance Ledger, and Digital Document Repository (Aadhaar, Offer Letter, Resume, etc.).
- **Indian Rupee (₹) Financials**: Formatted CTC breakdowns (Basic, HRA, Other Allowances) with annual projections.

### 3. 💸 Automated Payroll Processing Engine
- **One-Click Monthly Payroll Generation**: Computes payable days, earned salary, statutory deductions, and net payouts.
- **Indian Statutory Compliance**:
  - **EPF (Employee Provident Fund)**: 12% on Basic (capped at standard limits).
  - **ESI (Employee State Insurance)**: 0.75% of Gross for eligible salary slabs.
  - **Professional Tax (PT)**: State slab calculations (₹200).
- **Loan EMI Recovery**: Automatic deduction of monthly installments from staff advance balances.
- **Payroll Adjustments & Approvals**: Review draft payrolls, adjust deductions, finalize (lock), and mark as paid.
- **Excel Export**: Download complete monthly payroll reports in `.xlsx` format.

### 4. 📄 PDF Payslip Generation & Download
- **Automated PDFKit Engine**: Generates professional, branded salary slips with company header, earnings vs deductions tables, and net pay in words.
- **Direct Employee Self-Service**: Staff can view salary history and download PDF payslips directly from their portal.

### 5. 💳 Staff Advances & Loans Ledger
- Sanction company loans with fixed monthly deduction installments.
- Live balance tracking with automatic recovery during monthly payroll runs.

### 6. 📱 Responsive & Mobile-Optimized
- Fully optimized for desktop, tablet (iPad/Android tabs), and mobile phones (iOS/Android).
- Touch-friendly drawer navigation, safe-area insets, and smooth horizontal scrolling tabs.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite 6, Tailwind CSS, Lucide Icons, Recharts, React Router v7, Axios
- **Backend**: Node.js, Express.js (ES Modules)
- **Database**: SQLite / sql.js (file-backed `erp.db` persistence)
- **Security**: JWT (JSON Web Tokens), bcryptjs password hashing, RBAC middleware
- **Document & File Generation**: PDFKit (Payslip generator), ExcelJS (Payroll sheets), Multer (File uploads)

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18 or higher recommended)
- npm

### 1. Clone the Repository
```bash
git clone https://github.com/rudraa0604/NexErp-Portal.git
cd NexErp-Portal
```

### 2. Install Dependencies
```bash
# Install root, backend, and frontend dependencies
npm install --prefix server
npm install --prefix client
```

### 3. Setup Environment Variables
Create a `.env` file in the `server` directory (already included with defaults):
```env
PORT=5000
JWT_SECRET=erp_super_secret_jwt_key_2026_secure!
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

### 4. Run Development Servers
From the root project directory:
```bash
npm run dev
# OR
npm start
```
- **Frontend App**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000`
- **Mobile/Network Test**: `http://<your-local-ip>:5173`

---

## 🔐 Demo Credentials

| Role | Email | Password |
| :--- | :--- | :--- |
| **System Administrator** | `admin@erp.local` | `Admin@123` |
| **Employee (Demo)** | `rahul.sharma@erp.local` | `Emp@123` |

*(Quick-login demo buttons are also available on the Login screen for instant access)*

---

## 🌐 Production Deployment (Render / VPS)

NexERP Pro is configured for **Unified Full-Stack Deployment** (Express serves compiled React frontend):

1. **Service Type**: Web Service (Node)
2. **Build Command**: `npm run build`
3. **Start Command**: `npm start`
4. **Environment Variables**:
   - `NODE_ENV` = `production`
   - `JWT_SECRET` = `<your-secure-random-key>`
   - `PORT` = `5000`

---

## 📂 Project Structure

```
NexErp-Portal/
├── client/                     # Frontend Vite + React SPA
│   ├── src/
│   │   ├── components/         # Reusable UI (Sidebar, Navbar, Modals, Widgets)
│   │   ├── context/            # AuthContext & State management
│   │   ├── pages/              # Dashboard, Employees, Profile, Payroll, etc.
│   │   ├── services/           # Axios API service
│   │   └── App.jsx             # Router and Protected Routes
│   ├── package.json
│   └── vite.config.js
├── server/                     # Backend Express API
│   ├── data/                   # SQLite database storage (erp.db)
│   ├── src/
│   │   ├── controllers/        # Attendance, Employee, Payroll, Report, Auth
│   │   ├── db/                 # Database connection, schema, and seed data
│   │   ├── middleware/         # JWT Auth & RBAC guards
│   │   ├── routes/             # Express API endpoints
│   │   ├── services/           # PDFKit Payslip & Excel generator
│   │   └── server.js           # Server entry point & static file hosting
│   └── package.json
├── package.json                # Root automation scripts
├── BRAIN.md                    # Architecture, algorithms & data design
└── README.md                   # Project documentation
```

---

## 📜 License
This project is licensed under the MIT License.
