import bcrypt from 'bcryptjs';
import db from '../db/connection.js';

// Get list of employees with search and filters
export const getEmployees = (req, res) => {
  try {
    const { search = '', department = '', status = '' } = req.query;

    let query = `
      SELECT e.*, u.email as user_email, u.role as user_role,
             ss.basic, ss.hra, ss.other_allowance,
             (ss.basic + ss.hra + ss.other_allowance) as gross_salary
      FROM employees e
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN salary_structure ss ON e.id = ss.employee_id
      WHERE 1=1
    `;
    const params = [];

    if (search.trim()) {
      query += ` AND (e.name LIKE ? OR e.emp_code LIKE ? OR e.email LIKE ? OR e.designation LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    if (department.trim()) {
      query += ` AND e.department = ?`;
      params.push(department.trim());
    }

    if (status.trim()) {
      query += ` AND e.status = ?`;
      params.push(status.trim());
    }

    query += ` ORDER BY e.id DESC`;

    const employees = db.all(query, params);
    return res.json({ success: true, count: employees.length, employees });
  } catch (error) {
    console.error('Get employees error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch employees.' });
  }
};

// Get Single Employee Profile (Admin can get any, Employee can only get their own)
export const getEmployeeProfile = (req, res) => {
  try {
    const employeeId = req.params.id;

    if (req.user.role !== 'admin' && Number(employeeId) !== Number(req.user.employee_id)) {
      return res.status(403).json({ success: false, message: 'Forbidden. Access restricted to own profile.' });
    }

    const employee = db.get('SELECT * FROM employees WHERE id = ?', [employeeId]);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    // Salary Structure
    const salaryStructure = db.get('SELECT * FROM salary_structure WHERE employee_id = ?', [employeeId]) || {
      basic: 0,
      hra: 0,
      other_allowance: 0,
      pf_applicable: 1,
      esi_applicable: 1,
      effective_from: employee.doj
    };

    // Documents
    const documents = db.all('SELECT * FROM employee_documents WHERE employee_id = ? ORDER BY uploaded_at DESC', [employeeId]);

    // Advances Ledger
    const advances = db.all('SELECT * FROM advances WHERE employee_id = ? ORDER BY id DESC', [employeeId]);

    // Past Salary Slips / Payroll history
    const payrollHistory = db.all(`
      SELECT pd.*, pr.month, pr.year, pr.status as run_status
      FROM payroll_details pd
      JOIN payroll_runs pr ON pd.payroll_run_id = pr.id
      WHERE pd.employee_id = ?
      ORDER BY pr.year DESC, pr.month DESC
    `, [employeeId]);

    return res.json({
      success: true,
      employee,
      salaryStructure,
      documents,
      advances,
      payrollHistory
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch employee profile.' });
  }
};

// Add New Employee + User Credentials + Salary Structure
export const createEmployee = (req, res) => {
  try {
    const {
      emp_code,
      name,
      email,
      dob,
      gender,
      contact,
      address,
      emergency_contact,
      department,
      designation,
      doj,
      employment_type = 'Full-time',
      bank_account_no,
      ifsc,
      bank_name,
      avatar_url,
      basic = 0,
      hra = 0,
      other_allowance = 0,
      pf_applicable = 1,
      esi_applicable = 1,
      password = 'Password@123'
    } = req.body;

    if (!emp_code || !name || !email || !department || !designation || !doj) {
      return res.status(400).json({ success: false, message: 'Code, Name, Email, Department, Designation, and DOJ are required.' });
    }

    // Check unique emp_code and email
    const existingCode = db.get('SELECT id FROM employees WHERE emp_code = ?', [emp_code.trim()]);
    if (existingCode) {
      return res.status(400).json({ success: false, message: 'Employee Code already exists.' });
    }

    const existingEmail = db.get('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existingEmail) {
      return res.status(400).json({ success: false, message: 'Email address is already in use.' });
    }

    // Insert Employee
    const empResult = db.run(`
      INSERT INTO employees (
        emp_code, name, email, dob, gender, contact, address, emergency_contact,
        department, designation, doj, employment_type, bank_account_no, ifsc, bank_name, avatar_url, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')
    `, [
      emp_code.trim(), name.trim(), email.toLowerCase().trim(), dob || null, gender || 'Other',
      contact || null, address || null, emergency_contact || null, department.trim(),
      designation.trim(), doj, employment_type, bank_account_no || null, ifsc || null,
      bank_name || null, avatar_url || null
    ]);

    const employeeId = empResult.lastInsertRowid;

    // Create User Login
    const passwordHash = bcrypt.hashSync(password, 10);
    const userResult = db.run(`
      INSERT INTO users (name, email, password_hash, role, employee_id, status)
      VALUES (?, ?, ?, 'employee', ?, 'active')
    `, [name.trim(), email.toLowerCase().trim(), passwordHash, employeeId]);

    db.run('UPDATE employees SET user_id = ? WHERE id = ?', [userResult.lastInsertRowid, employeeId]);

    // Insert Salary Structure
    db.run(`
      INSERT INTO salary_structure (employee_id, basic, hra, other_allowance, pf_applicable, esi_applicable, effective_from)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [employeeId, Number(basic) || 0, Number(hra) || 0, Number(other_allowance) || 0, pf_applicable ? 1 : 0, esi_applicable ? 1 : 0, doj]);

    return res.status(201).json({
      success: true,
      message: 'Employee created successfully with portal login credentials.',
      employeeId
    });
  } catch (error) {
    console.error('Create employee error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create employee.' });
  }
};

// Update Employee Details & Salary Structure
export const updateEmployee = (req, res) => {
  try {
    const employeeId = req.params.id;
    const {
      name,
      dob,
      gender,
      contact,
      address,
      emergency_contact,
      department,
      designation,
      doj,
      employment_type,
      bank_account_no,
      ifsc,
      bank_name,
      avatar_url,
      status,
      basic,
      hra,
      other_allowance,
      pf_applicable,
      esi_applicable
    } = req.body;

    const employee = db.get('SELECT * FROM employees WHERE id = ?', [employeeId]);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    db.run(`
      UPDATE employees SET
        name = COALESCE(?, name),
        dob = COALESCE(?, dob),
        gender = COALESCE(?, gender),
        contact = COALESCE(?, contact),
        address = COALESCE(?, address),
        emergency_contact = COALESCE(?, emergency_contact),
        department = COALESCE(?, department),
        designation = COALESCE(?, designation),
        doj = COALESCE(?, doj),
        employment_type = COALESCE(?, employment_type),
        bank_account_no = COALESCE(?, bank_account_no),
        ifsc = COALESCE(?, ifsc),
        bank_name = COALESCE(?, bank_name),
        avatar_url = COALESCE(?, avatar_url),
        status = COALESCE(?, status)
      WHERE id = ?
    `, [
      name, dob, gender, contact, address, emergency_contact,
      department, designation, doj, employment_type, bank_account_no,
      ifsc, bank_name, avatar_url, status, employeeId
    ]);

    // Update Salary Structure if provided
    if (basic !== undefined || hra !== undefined || other_allowance !== undefined) {
      const existingSS = db.get('SELECT id FROM salary_structure WHERE employee_id = ?', [employeeId]);
      if (existingSS) {
        db.run(`
          UPDATE salary_structure SET
            basic = COALESCE(?, basic),
            hra = COALESCE(?, hra),
            other_allowance = COALESCE(?, other_allowance),
            pf_applicable = COALESCE(?, pf_applicable),
            esi_applicable = COALESCE(?, esi_applicable),
            updated_at = CURRENT_TIMESTAMP
          WHERE employee_id = ?
        `, [
          basic !== undefined ? Number(basic) : null,
          hra !== undefined ? Number(hra) : null,
          other_allowance !== undefined ? Number(other_allowance) : null,
          pf_applicable !== undefined ? (pf_applicable ? 1 : 0) : null,
          esi_applicable !== undefined ? (esi_applicable ? 1 : 0) : null,
          employeeId
        ]);
      } else {
        db.run(`
          INSERT INTO salary_structure (employee_id, basic, hra, other_allowance, pf_applicable, esi_applicable, effective_from)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [employeeId, Number(basic) || 0, Number(hra) || 0, Number(other_allowance) || 0, pf_applicable ? 1 : 0, esi_applicable ? 1 : 0, employee.doj]);
      }
    }

    return res.json({ success: true, message: 'Employee details updated successfully.' });
  } catch (error) {
    console.error('Update employee error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update employee.' });
  }
};

// Toggle status (Active / Inactive) or Soft Delete
export const toggleEmployeeStatus = (req, res) => {
  try {
    const employeeId = req.params.id;
    const employee = db.get('SELECT status, user_id FROM employees WHERE id = ?', [employeeId]);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    const newStatus = employee.status === 'Active' ? 'Inactive' : 'Active';
    const userStatus = newStatus === 'Active' ? 'active' : 'inactive';

    db.run('UPDATE employees SET status = ? WHERE id = ?', [newStatus, employeeId]);
    if (employee.user_id) {
      db.run('UPDATE users SET status = ? WHERE id = ?', [userStatus, employee.user_id]);
    }

    return res.json({ success: true, message: `Employee marked as ${newStatus}.`, newStatus });
  } catch (error) {
    console.error('Toggle status error:', error);
    return res.status(500).json({ success: false, message: 'Failed to toggle employee status.' });
  }
};

// Upload Document Record
export const uploadDocument = (req, res) => {
  try {
    const employeeId = req.params.id;
    const { doc_type, file_name, file_url } = req.body;

    if (!doc_type || !file_name || !file_url) {
      return res.status(400).json({ success: false, message: 'doc_type, file_name, and file_url are required.' });
    }

    db.run(`
      INSERT INTO employee_documents (employee_id, doc_type, file_name, file_url)
      VALUES (?, ?, ?, ?)
    `, [employeeId, doc_type, file_name, file_url]);

    return res.json({ success: true, message: 'Document uploaded and attached successfully.' });
  } catch (error) {
    console.error('Upload document error:', error);
    return res.status(500).json({ success: false, message: 'Failed to record document.' });
  }
};
