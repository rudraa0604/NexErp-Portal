git# ERP Portal Development — Full Prompt (Step by Step)

Ye ek complete, ready-to-use prompt/specification hai jise aap kisi developer ko de sakte hain, ya kisi AI coding tool (Claude Code, Cursor, v0, etc.) ko copy-paste karke pura ERP system banwa sakte hain.

---

## 🎯 PROJECT OVERVIEW (Copy this as your main prompt)

```
Build a full-stack HR & Payroll ERP Web Portal with TWO login types:
1. ADMIN LOGIN — full access to all modules
2. EMPLOYEE LOGIN — limited access (own attendance, own salary slip, own profile)

Tech Stack:
- Frontend: React.js (with Tailwind CSS)
- Backend: Node.js + Express.js
- Database: MySQL / PostgreSQL (relational, since payroll needs strong data integrity)
- Auth: JWT-based authentication with role-based access control (RBAC)
- Optional: Deploy on a VPS or platforms like Render/Railway + Vercel

Build it module by module, starting with authentication, then Home Dashboard,
then Employees module, then Payroll module. Each module must have working
CRUD APIs, proper validation, and a functional UI — not just static design.
```

---

## STEP 1 — Authentication & Roles

**Prompt to give:**
```
Create a login system with:
- Single login page, but backend detects role (admin/employee) from database
- JWT token generation on login, stored in httpOnly cookie or localStorage
- Middleware to protect routes based on role (isAdmin, isEmployee)
- Password hashing using bcrypt
- Forgot password / reset password flow (email OTP or link)
- On login success:
   - Admin → redirected to Admin Dashboard (all modules)
   - Employee → redirected to Employee Dashboard (limited: Home, own Attendance, own Salary slip, own Profile)

Database table: users
- id, name, email, password_hash, role (admin/employee), employee_id (FK, nullable for admin), status (active/inactive), created_at
```

---

## STEP 2 — HOME Module (Dashboard)

**Prompt to give:**
```
Build a Home Dashboard with three widgets:

1. Today's Attendance Summary (Admin view)
   - Total employees
   - Present count / Absent count / Half-day count (auto-calculated from today's punches)
   - Show as cards + a small pie/bar chart

2. Present / Absent / Half Day status
   - Table listing all employees with today's status
   - Status auto-marked based on punch-in/punch-out time:
     - Present: punched in before cutoff time AND worked >= full_day_hours
     - Half Day: worked >= half_day_hours but < full_day_hours
     - Absent: no punch recorded at all
   - Admin can manually override status (with a reason/remark field, logged for audit)

3. Quick Punch In / Punch Out (Employee side, also usable by Admin for self)
   - One button toggles between "Punch In" and "Punch Out" based on current state
   - Capture: timestamp, (optional) geolocation, (optional) selfie/photo
   - Store in attendance_logs table
   - Show live "Working since HH:MM" timer once punched in

Database tables:
- attendance_logs: id, employee_id, date, punch_in_time, punch_out_time, total_hours, status (Present/Absent/Half Day), remarks, marked_by (system/admin)
- attendance_settings: full_day_hours, half_day_hours, cutoff_time, late_mark_after
```

---

## STEP 3 — EMPLOYEES Module

**Prompt to give:**
```
Build an Employees module (Admin-only access, employees can view only their own profile):

1. Employee List
   - Table: Photo, Name, Employee ID, Department, Designation, Contact, Status (Active/Inactive)
   - Search bar + filters (department, designation, status)
   - "Add New Employee" button opens a form
   - Actions: View, Edit, Deactivate/Activate, Delete (soft delete)

2. Employee Profile
   - Personal Info: Name, DOB, Gender, Contact, Address, Emergency Contact
   - Employment Info: Employee ID, Department, Designation, Date of Joining, Employment Type (Full-time/Part-time/Contract), Reporting Manager
   - Documents: Aadhar/ID proof, resume, offer letter upload (file storage)
   - Bank Details: Account number, IFSC, bank name (for salary transfer)
   - Salary Structure: Basic, HRA, Allowances, PF/ESI applicable or not

3. Attendance Tab (inside profile)
   - Calendar view showing Present/Absent/Half Day/Leave per day for selected month
   - Monthly attendance summary: total present days, absent days, half days, leaves taken

4. Salary Tab (inside profile)
   - Current salary structure breakdown
   - Salary history (month-wise paid amount with status: Paid/Pending)
   - Download salary slip (PDF) for any past month

5. Advance Ledger Tab (inside profile)
   - List of all advances/loans given to employee: date, amount, reason, approved_by
   - Repayment tracking: installment amount, months, balance remaining
   - Auto-link to Payroll so advance deduction reflects in monthly salary automatically

Database tables:
- employees: id, user_id (FK), emp_code, name, dob, gender, contact, address, department, designation, doj, employment_type, reporting_manager_id, bank_account_no, ifsc, bank_name, status
- employee_documents: id, employee_id, doc_type, file_url, uploaded_at
- salary_structure: id, employee_id, basic, hra, other_allowance, pf_applicable, esi_applicable, effective_from
- advances: id, employee_id, amount, reason, date_given, approved_by, monthly_deduction, balance_remaining, status (active/closed)
```

---

## STEP 4 — PAYROLL Module

**Prompt to give:**
```
Build a Payroll module (Admin-only):

1. Monthly Salary (Salary Processing Screen)
   - Select month/year → system auto-generates draft salary for all active employees using:
     - Salary structure (Basic + HRA + Allowances)
     - Attendance data (per-day rate x present/half days = earned salary)
     - Formula: Per Day Salary = (Basic+HRA+Allowances) / Days in Month
                Earned Salary = Per Day Salary x (Present Days + 0.5 x Half Days)
   - Editable table before finalizing (admin can adjust manually with remark)

2. Deductions
   - Auto deductions: PF, ESI, Professional Tax (based on applicable slabs, configurable in settings)
   - Manual deductions: Late marks penalty, other penalties (with reason field)
   - Deductions summary shown per employee before final pay

3. Advance
   - Auto-pull pending advance installment from Advance Ledger for that employee
   - Show as a deduction line item in that month's payroll
   - On payroll finalization, auto-update advance balance_remaining

4. Final Pay (Calculation)
   Final Pay = Earned Salary - (PF + ESI + Prof Tax + Other Deductions + Advance Installment)
   - Show full breakdown per employee: Earnings, Deductions, Net Pay
   - "Approve & Lock" button — once locked, that month's payroll can't be edited (only admin with special permission can reopen)

5. Salary Paid
   - Mark as Paid (manually, or integrate with bank transfer / payment gateway API later)
   - Record: payment_date, payment_mode (Bank Transfer/Cash/Cheque), UTR/reference number
   - Auto-generate downloadable Salary Slip PDF for each employee (also visible to employee in their login)
   - Send email/SMS notification to employee when salary is marked Paid

6. Reports
   - Monthly Payroll Summary Report (total payout, total deductions, department-wise cost)
   - Employee-wise Annual Salary Report
   - PF/ESI/Tax statutory reports (for compliance filing)
   - Advance/Loan outstanding report
   - Export all reports as Excel/PDF
   - Filters: date range, department, employee

Database tables:
- payroll_runs: id, month, year, status (draft/finalized/paid), created_by, finalized_at
- payroll_details: id, payroll_run_id, employee_id, earned_salary, pf_deduction, esi_deduction, tax_deduction, other_deductions, advance_deduction, net_pay, payment_status, payment_date, payment_mode, reference_no
- payroll_settings: pf_percent, esi_percent, professional_tax_slab, late_penalty_rule
```

---

## STEP 5 — Role-based Access Rules (important, mention explicitly)

```
Enforce these access rules on both frontend (hide UI) AND backend (protect API routes):

ADMIN can access:
- Everything: Home (all employees), Employees module (all), Payroll module (all), Reports

EMPLOYEE can access:
- Home: only their own Quick Punch In/Out + their own today's status
- Employees: only their own Profile, Attendance, Salary tabs (read-only, no edit)
   - Cannot see other employees' data
   - Cannot see Advance Ledger unless you want to expose only "their own" advance list (read-only)
- Payroll: only their own Salary Slip / Salary Paid history (read-only)
   - No access to Monthly Salary processing, Deductions config, Reports
```

---

## STEP 6 — Suggested Build Order (give this sequence to your developer/AI tool)

1. Database schema design + migrations (all tables above)
2. Auth system (login, JWT, role middleware)
3. Employee CRUD + Profile page
4. Attendance (Punch In/Out + auto status calculation) 
5. Home Dashboard (aggregating attendance data)
6. Salary Structure setup per employee
7. Advance Ledger CRUD
8. Payroll processing engine (Monthly Salary → Deductions → Advance → Final Pay)
9. Salary Paid + PDF slip generation
10. Reports module (Excel/PDF export)
11. Role-based access testing (login as admin vs employee, check restrictions)
12. UI polish + deployment

---

## 💡 Tips
- Har module ko pehle **isolated** test karo (Postman se API check), phir frontend se connect karo.
- Attendance aur Payroll ka logic sabse critical hai — pehle isko sahi se design karo, formulas ko settings table mein rakho (hardcode mat karo), taaki future mein PF%/ESI% change ho to code change na karna pade.
- Salary slip PDF ke liye `pdfkit` ya `puppeteer` (Node) use kar sakte ho.
- Agar aap khud code nahi likhna chahte, to ye pura document copy karke **Claude Code**, **Cursor**, ya kisi bhi AI dev tool ko de sakte ho — ye step-by-step isi order mein build karega.
