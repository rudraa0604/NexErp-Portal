import db from './connection.js';

export function initSchema() {
  const schemaSql = `
    -- Users table for authentication and RBAC
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT CHECK(role IN ('admin', 'employee')) NOT NULL DEFAULT 'employee',
      employee_id INTEGER,
      status TEXT CHECK(status IN ('active', 'inactive')) NOT NULL DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL
    );

    -- Employees master record
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE,
      emp_code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      dob TEXT,
      gender TEXT CHECK(gender IN ('Male', 'Female', 'Other')),
      contact TEXT,
      email TEXT UNIQUE NOT NULL,
      address TEXT,
      emergency_contact TEXT,
      department TEXT NOT NULL,
      designation TEXT NOT NULL,
      doj TEXT NOT NULL,
      employment_type TEXT CHECK(employment_type IN ('Full-time', 'Part-time', 'Contract')) DEFAULT 'Full-time',
      reporting_manager_id INTEGER,
      bank_account_no TEXT,
      ifsc TEXT,
      bank_name TEXT,
      avatar_url TEXT,
      status TEXT CHECK(status IN ('Active', 'Inactive')) DEFAULT 'Active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (reporting_manager_id) REFERENCES employees(id) ON DELETE SET NULL
    );

    -- Employee uploaded documents (Aadhaar, Offer Letter, Resume, etc.)
    CREATE TABLE IF NOT EXISTS employee_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      doc_type TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_url TEXT NOT NULL,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );

    -- Salary structure per employee
    CREATE TABLE IF NOT EXISTS salary_structure (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER UNIQUE NOT NULL,
      basic REAL NOT NULL DEFAULT 0,
      hra REAL NOT NULL DEFAULT 0,
      other_allowance REAL NOT NULL DEFAULT 0,
      pf_applicable INTEGER DEFAULT 1,
      esi_applicable INTEGER DEFAULT 1,
      effective_from TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );

    -- Advances and loans ledger
    CREATE TABLE IF NOT EXISTS advances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      reason TEXT,
      date_given TEXT NOT NULL,
      approved_by TEXT,
      monthly_deduction REAL NOT NULL DEFAULT 0,
      balance_remaining REAL NOT NULL,
      status TEXT CHECK(status IN ('active', 'closed')) DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );

    -- Daily attendance logs
    CREATE TABLE IF NOT EXISTS attendance_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      punch_in_time TEXT,
      punch_out_time TEXT,
      total_hours REAL DEFAULT 0,
      status TEXT CHECK(status IN ('Present', 'Absent', 'Half Day')) DEFAULT 'Absent',
      punch_in_lat REAL,
      punch_in_lng REAL,
      punch_in_photo TEXT,
      remarks TEXT,
      marked_by TEXT CHECK(marked_by IN ('system', 'admin')) DEFAULT 'system',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(employee_id, date),
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );

    -- Attendance global rules & thresholds
    CREATE TABLE IF NOT EXISTS attendance_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_day_hours REAL DEFAULT 8.0,
      half_day_hours REAL DEFAULT 4.0,
      cutoff_time TEXT DEFAULT '09:30',
      late_mark_after TEXT DEFAULT '10:00',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Payroll batch runs
    CREATE TABLE IF NOT EXISTS payroll_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      total_gross REAL DEFAULT 0,
      total_deductions REAL DEFAULT 0,
      total_net REAL DEFAULT 0,
      status TEXT CHECK(status IN ('draft', 'finalized', 'paid')) DEFAULT 'draft',
      created_by TEXT DEFAULT 'Admin',
      finalized_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(month, year)
    );

    -- Itemized payroll calculation per employee
    CREATE TABLE IF NOT EXISTS payroll_details (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payroll_run_id INTEGER NOT NULL,
      employee_id INTEGER NOT NULL,
      working_days INTEGER NOT NULL DEFAULT 30,
      present_days REAL NOT NULL DEFAULT 0,
      half_days REAL NOT NULL DEFAULT 0,
      basic_earned REAL NOT NULL DEFAULT 0,
      hra_earned REAL NOT NULL DEFAULT 0,
      allowance_earned REAL NOT NULL DEFAULT 0,
      earned_salary REAL NOT NULL DEFAULT 0,
      pf_deduction REAL NOT NULL DEFAULT 0,
      esi_deduction REAL NOT NULL DEFAULT 0,
      tax_deduction REAL NOT NULL DEFAULT 0,
      other_deductions REAL NOT NULL DEFAULT 0,
      advance_deduction REAL NOT NULL DEFAULT 0,
      net_pay REAL NOT NULL DEFAULT 0,
      payment_status TEXT CHECK(payment_status IN ('Pending', 'Paid')) DEFAULT 'Pending',
      payment_date TEXT,
      payment_mode TEXT CHECK(payment_mode IN ('Bank Transfer', 'Cash', 'Cheque')),
      reference_no TEXT,
      remarks TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(payroll_run_id, employee_id),
      FOREIGN KEY (payroll_run_id) REFERENCES payroll_runs(id) ON DELETE CASCADE,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );

    -- Global statutory payroll settings
    CREATE TABLE IF NOT EXISTS payroll_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pf_percent REAL DEFAULT 12.0,
      esi_percent REAL DEFAULT 0.75,
      professional_tax_slab REAL DEFAULT 200.0,
      late_penalty_per_day REAL DEFAULT 100.0,
      company_name TEXT DEFAULT 'Acme Technologies Pvt Ltd',
      company_address TEXT DEFAULT 'Tech Park, Floor 4, Silicon Valley, Bengaluru, Karnataka 560100',
      company_phone TEXT DEFAULT '+91 80 1234 5678',
      company_email TEXT DEFAULT 'hr@acmetech.com',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;

  db.exec(schemaSql);
  console.log('✅ SQLite Schema initialized successfully.');
}
