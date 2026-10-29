# 💰 Savings Group (Chit Fund) Manager

A modern, full-stack financial web application designed for managing **Savings Groups, Chit Funds, ROSCAs (Rotating Savings and Credit Associations), and Community Credit Circles**.

Built with **React.js, Vite, Tailwind CSS, Node.js, Express.js, and SQLite**.

---

## ⚡ Quick Demo Credentials

Upon first launch, the SQLite database is automatically seeded with realistic demo data (members, active savings groups, installments, and payout vouchers).

- **Email:** `admin@chitfund.com`
- **Password:** `admin123`
*(There is also a convenient 1-click **"Fill Demo Credentials"** button on the Login screen!)*

---

## 🚀 How to Run in Visual Studio Code

### Prerequisites
- **Node.js** (v18.0.0 or higher recommended, tested up to v24.x)
- **npm** (comes with Node.js)

### Step 1: Open the Project in VS Code
1. Launch **Visual Studio Code**.
2. Click **File** &rarr; **Open Folder...** and select:
   ```
   C:\Users\asus\Downloads\Savings Group (Chit Fund) Manager
   ```
3. Open the integrated terminal in VS Code using the shortcut `Ctrl + \`` (or **Terminal** &rarr; **New Terminal**).

---

### Step 2: Run Both Frontend and Backend Concurrently

You can run both servers simultaneously with a single command from the project root:

```bash
npm run dev
```

This starts:
- 📡 **Backend API Server**: `http://localhost:5000`
- 💻 **Frontend Web App**: `http://localhost:5173`

---

### Alternatively: Run in Separate Terminals

If you prefer separate terminal windows:

#### Terminal 1 (Backend):
```bash
cd backend
npm run dev
```

#### Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

Then open your browser and navigate to:
👉 **[http://localhost:5173](http://localhost:5173)**

---

## 🧱 Technology Stack

| Layer | Technology | Details |
|---|---|---|
| **Frontend** | React 19, Vite, Tailwind CSS v4, Lucide React, Axios, React Router v7 | Fast Single Page App with financial dashboard UI |
| **Backend** | Node.js, Express.js | Modular RESTful API with route validation |
| **Database** | SQLite (`better-sqlite3`) | High-performance, zero-config relational database with WAL mode and foreign keys |
| **Authentication** | JWT (JSON Web Tokens), bcryptjs | Secure password hashing, protected management routes |
| **Reports** | CSV Exporter | Real-time CSV generation and direct download |

---

## 🌟 Key Application Features

### 1. Financial Dashboard
- **Total Savings Collected:** Aggregated total of all verified contributions.
- **Total Amount Distributed:** Aggregated sum of all disbursed prize pool payouts.
- **Available Net Pool Balance:** Real-time vault liquidity (`Total Collected - Total Payouts`).
- **Pending Dues:** Real-time count and amount of overdue installments across active circles.
- **Active Savings Groups:** Quick cards with collection progress percentage and remaining pool.
- **Recent Transactions Ledger:** Unified credit and debit audit list with instant receipt/voucher viewing.

### 2. Member Management
- Full CRUD operations: **Add, Edit, View Profile, and Delete** members.
- Records: Full name, phone number, email, residential address, KYC notes, and join date.
- **Individual Member Ledger:** View every member's payment history, groups enrolled in, prize payouts won, and net savings position.
- Safe deletion safeguards: Prevents accidental deletion of members with financial records to preserve ledger integrity.

### 3. Savings Group (Chit Fund) Management
- **Create Savings Groups:** Name, seat capacity, monthly contribution, duration (in months), start date, and monthly collection day.
- **Member Roster & Seat Assignment:** Enroll members into groups up to capacity with unique seat numbers.
- **Interactive Installment Tracker:**
  - Cycle-by-cycle selector (Month #1, Month #2, ...).
  - Displays each enrolled member's payment status (**Paid** vs **Pending**).
  - 1-click **"Record Payment"** button directly next to pending members.
  - 1-click **"View Receipt"** for members who already paid.
  - Cycle payout status showing who received the prize pot.

### 4. Payment Management & Receipts
- Record member contributions with group, member, cycle number, amount, date, and payment method (Cash, UPI, Bank Transfer, Cheque, Online).
- **Duplicate Entry Prevention:** Strict database-level unique constraint `UNIQUE(group_id, member_id, installment_no)` and backend validation prevent duplicate payments for the same member and installment.
- **Printable Official Receipts:** Beautiful, printable modal format with receipt number, breakdown, and manager signature line (`window.print()` ready).

### 5. Payout Management & Manager Confirmation
- Disburse monthly prize pools / lump-sums to winning members.
- **Real-Time Group Liquidity Check:** Inspects available group balance before allowing payout.
- **One Payout Per Member Rule:** Ensures each member only receives one payout per savings group lifecycle.
- **Manager Confirmation Gate:** Requires explicit authorization check before debiting group funds.
- **Printable Disbursement Vouchers:** Certified official payment vouchers.

### 6. Reports & CSV Export
- **Monthly Collection Report:** Group collections grouped by month and circle.
- **Pending Payments Report:** Overdue installments with overdue days counter.
- **Member-wise Savings Report:** Overview of member balances, total contributed, and payouts won.
- **Transaction Audit Ledger:** Unified journal of all credit and debit entries.
- **One-Click CSV Export:** Download any report directly to `.csv` for Excel or Google Sheets.

---

## 🗄️ Database Architecture & Integrity

The application uses an SQLite database located at `backend/data/savings_group.db`:

```
┌────────────────┐          ┌────────────────┐
│     users      │          │    members     │
│  (Auth/Admin)  │          │   (Savers)     │
└───────┬────────┘          └───────┬────────┘
        │                           │
        │                           │ (1:N)
        │                           ▼
        │                   ┌────────────────┐
        │                   │ group_members  │◄─────────┐
        │                   └────────────────┘          │
        │                                               │ (N:1)
        ▼                                               │
┌────────────────┐                              ┌───────┴────────┐
│    payments    │─────────────────────────────►│ savings_groups │
│ (Collections)  │                              │ (Chit Circles) │
└────────────────┘                              └───────┬────────┘
        ▲                                               │
        │                                               │ (1:N)
        │           ┌────────────────┐                  │
        └───────────│    payouts     │◄─────────────────┘
                    │ (Prize Pools)  │
                    └────────────────┘
```

- **Parameterized Queries:** All SQL statements use `?` parameter binding to prevent SQL injection.
- **Database Transactions:** Financial operations use atomic SQLite transactions (`BEGIN TRANSACTION ... COMMIT`) to ensure consistency.
- **Integrity Constraints:** Foreign keys (`ON DELETE RESTRICT` for financial tables) and unique compound keys ensure no orphan or duplicate records exist.

---

## 📂 Project Structure

```
Savings Group (Chit Fund) Manager/
├── backend/
│   ├── data/
│   │   └── savings_group.db         # SQLite database file
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                # SQLite setup, tables, seed data
│   │   ├── middleware/
│   │   │   └── auth.js              # JWT verification middleware
│   │   ├── routes/
│   │   │   ├── auth.js              # Login, Register, Profile APIs
│   │   │   ├── dashboard.js         # Stats & recent transactions APIs
│   │   │   ├── members.js           # Member CRUD & ledger APIs
│   │   │   ├── groups.js            # Savings group & cycle tracker APIs
│   │   │   ├── payments.js          # Contribution & receipt APIs
│   │   │   ├── payouts.js           # Disbursement & voucher APIs
│   │   │   └── reports.js           # Financial reports & CSV export APIs
│   │   └── server.js                # Express app entry point
│   ├── .env                         # Server environment variables
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ConfirmModal.jsx     # Reusable confirmation dialog
│   │   │   ├── Navbar.jsx           # Top header navigation
│   │   │   ├── PayoutVoucherModal.jsx # Printable payout voucher
│   │   │   ├── ProtectedRoute.jsx   # Route guard for auth
│   │   │   ├── ReceiptModal.jsx     # Printable contribution receipt
│   │   │   ├── Sidebar.jsx          # Responsive financial sidebar
│   │   │   └── StatCard.jsx         # Metric summary card
│   │   ├── context/
│   │   │   ├── AuthContext.jsx      # Authentication state
│   │   │   └── ToastContext.jsx     # Floating notifications
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx        # Main dashboard
│   │   │   ├── GroupDetail.jsx      # Installment tracker & member roster
│   │   │   ├── Groups.jsx           # Savings groups management
│   │   │   ├── Login.jsx            # Admin login
│   │   │   ├── MemberDetail.jsx     # Member profile & payment history
│   │   │   ├── Members.jsx          # Member management
│   │   │   ├── Payments.jsx         # Contribution ledger & receipts
│   │   │   ├── Payouts.jsx          # Payout disbursements & balance check
│   │   │   ├── Register.jsx         # New admin registration
│   │   │   └── Reports.jsx          # 4 reports & CSV exporter
│   │   ├── services/
│   │   │   └── api.js               # Axios instance with interceptors
│   │   ├── App.jsx                  # Main routing component
│   │   ├── index.css                # Tailwind styling & print rules
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js               # Vite config with API proxy
│   └── package.json
├── package.json                     # Root orchestrator scripts
└── README.md
```

---

## 🛠️ REST API Summary

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/login` | Authenticate admin, returns JWT | No |
| `POST` | `/api/auth/register` | Register new manager | No |
| `GET` | `/api/auth/me` | Fetch logged-in admin profile | Yes |
| `GET` | `/api/dashboard/stats` | Retrieve financial summary & transactions | Yes |
| `GET` | `/api/members` | List members with search and status filter | Yes |
| `POST` | `/api/members` | Create new member | Yes |
| `GET` | `/api/members/:id` | Member profile, group list, payment history | Yes |
| `PUT` | `/api/members/:id` | Update member details | Yes |
| `DELETE` | `/api/members/:id` | Delete member (if no financial history) | Yes |
| `GET` | `/api/groups` | List savings groups with balance & progress | Yes |
| `POST` | `/api/groups` | Create new savings group | Yes |
| `GET` | `/api/groups/:id` | Group financial summary, roster, cycles | Yes |
| `GET` | `/api/groups/:id/installments/:cycle` | Installment cycle member payment status | Yes |
| `POST` | `/api/groups/:id/members` | Enroll member into group | Yes |
| `GET` | `/api/payments` | List payments with filters | Yes |
| `POST` | `/api/payments` | Record payment & generate receipt | Yes |
| `DELETE` | `/api/payments/:id` | Void a payment record | Yes |
| `GET` | `/api/payouts` | List payout vouchers | Yes |
| `GET` | `/api/payouts/group-balance/:groupId`| Check available pool balance & eligibility | Yes |
| `POST` | `/api/payouts` | Authorize payout with manager confirmation | Yes |
| `GET` | `/api/reports/collections` | Monthly collection report | Yes |
| `GET` | `/api/reports/pending` | Overdue pending payments report | Yes |
| `GET` | `/api/reports/members-summary`| Member-wise total savings & balance | Yes |
| `GET` | `/api/reports/transactions` | Combined credit/debit audit ledger | Yes |
| `GET` | `/api/reports/export-csv` | Stream report directly as CSV file | Yes |

---

## 📜 License
MIT License. Built for community microfinance and savings group management.
