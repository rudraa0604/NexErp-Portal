import bcrypt from 'bcryptjs';
import db, { getDb } from './connection.js';
import { initSchema } from './schema.js';

export async function seedDatabase() {
  await getDb();
  initSchema();

  // Check if users already exist
  const existingUsers = db.all('SELECT id FROM users LIMIT 1');
  if (existingUsers.length > 0) {
    console.log('ℹ️ Database already contains data. Skipping seed.');
    return;
  }

  console.log('🌱 Seeding ERP database with initial demo data...');

  const adminPassHash = bcrypt.hashSync('Admin@123', 10);
  const empPassHash = bcrypt.hashSync('Emp@123', 10);

  // 1. Insert Attendance Settings
  db.run(`
    INSERT INTO attendance_settings (full_day_hours, half_day_hours, cutoff_time, late_mark_after)
    VALUES (?, ?, ?, ?)
  `, [8.0, 4.0, '09:30', '10:00']);

  // 2. Insert Payroll Settings
  db.run(`
    INSERT INTO payroll_settings (pf_percent, esi_percent, professional_tax_slab, late_penalty_per_day, company_name, company_address, company_phone, company_email)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    12.0,
    0.75,
    200.0,
    100.0,
    'NexTech Innovations Pvt Ltd',
    'Prestige Tech Cloud, Phase 2, Bangalore, Karnataka 560066',
    '+91 80 4455 6677',
    'hr@nextech.in'
  ]);

  // 3. Create Admin User
  db.run(`
    INSERT INTO users (name, email, password_hash, role, employee_id, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `, ['System Administrator', 'admin@erp.local', adminPassHash, 'admin', null, 'active']);

  // 4. Create Demo Employees
  const employeesData = [
    {
      emp_code: 'EMP001',
      name: 'Rahul Sharma',
      email: 'rahul.sharma@erp.local',
      dob: '1994-08-14',
      gender: 'Male',
      contact: '+91 98765 43210',
      address: 'A-402, Green Glen Heights, Bellandur, Bengaluru',
      emergency_contact: '+91 98765 43219 (Spouse)',
      department: 'Engineering',
      designation: 'Senior Full Stack Engineer',
      doj: '2023-03-01',
      employment_type: 'Full-time',
      bank_account_no: '918273645012',
      ifsc: 'HDFC0001234',
      bank_name: 'HDFC Bank',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      basic: 45000,
      hra: 22500,
      allowance: 12500,
      pf: 1,
      esi: 0,
      advance_amount: 30000,
      advance_deduction: 5000,
      advance_balance: 20000
    },
    {
      emp_code: 'EMP002',
      name: 'Priya Patel',
      email: 'priya.patel@erp.local',
      dob: '1996-11-22',
      gender: 'Female',
      contact: '+91 91234 56789',
      address: 'Flat 301, Palm Meadows, Whitefield, Bengaluru',
      emergency_contact: '+91 91234 56780 (Father)',
      department: 'Human Resources',
      designation: 'HR Lead & Talent Partner',
      doj: '2023-06-15',
      employment_type: 'Full-time',
      bank_account_no: '543210987654',
      ifsc: 'ICIC0000456',
      bank_name: 'ICICI Bank',
      avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      basic: 38000,
      hra: 19000,
      allowance: 8000,
      pf: 1,
      esi: 0,
      advance_amount: 0,
      advance_deduction: 0,
      advance_balance: 0
    },
    {
      emp_code: 'EMP003',
      name: 'Amit Verma',
      email: 'amit.verma@erp.local',
      dob: '1992-05-18',
      gender: 'Male',
      contact: '+91 99887 76655',
      address: '22, Sunshine Residency, Indiranagar, Bengaluru',
      emergency_contact: '+91 99887 76650 (Brother)',
      department: 'Operations',
      designation: 'Operations Manager',
      doj: '2022-09-10',
      employment_type: 'Full-time',
      bank_account_no: '112233445566',
      ifsc: 'SBIN0000888',
      bank_name: 'State Bank of India',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      basic: 35000,
      hra: 17500,
      allowance: 7500,
      pf: 1,
      esi: 1,
      advance_amount: 15000,
      advance_deduction: 3000,
      advance_balance: 6000
    },
    {
      emp_code: 'EMP004',
      name: 'Ananya Deshmukh',
      email: 'ananya.deshmukh@erp.local',
      dob: '1998-02-10',
      gender: 'Female',
      contact: '+91 97766 55443',
      address: '77, Koramangala 4th Block, Bengaluru',
      emergency_contact: '+91 97766 55440 (Mother)',
      department: 'Design & UI/UX',
      designation: 'Product Designer',
      doj: '2024-01-08',
      employment_type: 'Full-time',
      bank_account_no: '998877665544',
      ifsc: 'AXIS0000999',
      bank_name: 'Axis Bank',
      avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
      basic: 32000,
      hra: 16000,
      allowance: 7000,
      pf: 1,
      esi: 1,
      advance_amount: 0,
      advance_deduction: 0,
      advance_balance: 0
    }
  ];

  for (const emp of employeesData) {
    // Insert employee
    const empRes = db.run(`
      INSERT INTO employees (
        emp_code, name, dob, gender, contact, email, address, emergency_contact,
        department, designation, doj, employment_type, bank_account_no, ifsc, bank_name, avatar_url, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      emp.emp_code, emp.name, emp.dob, emp.gender, emp.contact, emp.email, emp.address, emp.emergency_contact,
      emp.department, emp.designation, emp.doj, emp.employment_type, emp.bank_account_no, emp.ifsc, emp.bank_name, emp.avatar_url, 'Active'
    ]);

    const employeeId = empRes.lastInsertRowid;

    // Create user login for employee
    const userRes = db.run(`
      INSERT INTO users (name, email, password_hash, role, employee_id, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [emp.name, emp.email, empPassHash, 'employee', employeeId, 'active']);

    // Update user_id in employee table
    db.run(`UPDATE employees SET user_id = ? WHERE id = ?`, [userRes.lastInsertRowid, employeeId]);

    // Insert Salary Structure
    db.run(`
      INSERT INTO salary_structure (employee_id, basic, hra, other_allowance, pf_applicable, esi_applicable, effective_from)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [employeeId, emp.basic, emp.hra, emp.allowance, emp.pf, emp.esi, emp.doj]);

    // Insert Advance if any
    if (emp.advance_amount > 0) {
      db.run(`
        INSERT INTO advances (employee_id, amount, reason, date_given, approved_by, monthly_deduction, balance_remaining, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [employeeId, emp.advance_amount, 'Personal Medical Assistance', '2026-07-10', 'Admin', emp.advance_deduction, emp.advance_balance, 'active']);
    }

    // Seed realistic attendance for recent days
    const today = new Date();
    for (let i = 1; i <= 20; i++) {
      const dateStr = new Date(today.getFullYear(), today.getMonth(), i).toISOString().split('T')[0];
      // Randomize realistic attendance (mostly present, some half-day, occasional absent)
      let status = 'Present';
      let inTime = '09:15:00';
      let outTime = '17:45:00';
      let hours = 8.5;

      if (i % 7 === 0) {
        continue; // Sunday skip
      } else if (i === 11 && emp.emp_code === 'EMP001') {
        status = 'Half Day';
        outTime = '13:30:00';
        hours = 4.25;
      } else if (i === 15 && emp.emp_code === 'EMP003') {
        status = 'Absent';
        inTime = null;
        outTime = null;
        hours = 0;
      }

      db.run(`
        INSERT OR REPLACE INTO attendance_logs (employee_id, date, punch_in_time, punch_out_time, total_hours, status, marked_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [employeeId, dateStr, inTime, outTime, hours, status, 'system']);
    }
  }

  console.log('✅ ERP demo data successfully seeded!');
}

if (process.argv[1]?.includes('seed.js')) {
  seedDatabase().then(() => process.exit(0));
}
