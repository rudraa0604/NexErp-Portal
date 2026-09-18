import db from '../db/connection.js';

// Get list of all advances (Admin) or filtered by employee
export const getAdvances = (req, res) => {
  try {
    const { employee_id, status } = req.query;

    let query = `
      SELECT a.*, e.emp_code, e.name as employee_name, e.department, e.designation
      FROM advances a
      JOIN employees e ON a.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];

    // Role check: If employee, force own employee_id
    if (req.user.role !== 'admin') {
      query += ` AND a.employee_id = ?`;
      params.push(req.user.employee_id);
    } else if (employee_id) {
      query += ` AND a.employee_id = ?`;
      params.push(employee_id);
    }

    if (status) {
      query += ` AND a.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY a.id DESC`;

    const advances = db.all(query, params);

    // Calculate totals
    const totalAmount = advances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
    const totalBalance = advances.reduce((sum, a) => sum + (Number(a.balance_remaining) || 0), 0);

    return res.json({
      success: true,
      count: advances.length,
      totalAmount,
      totalBalance,
      advances
    });
  } catch (error) {
    console.error('Get advances error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch advances.' });
  }
};

// Create a new advance loan entry
export const createAdvance = (req, res) => {
  try {
    const {
      employee_id,
      amount,
      reason,
      date_given,
      monthly_deduction
    } = req.body;

    if (!employee_id || !amount || !date_given || !monthly_deduction) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID, amount, date given, and monthly deduction are required.'
      });
    }

    const employee = db.get('SELECT name FROM employees WHERE id = ?', [employee_id]);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    const numAmount = Number(amount);
    const numDeduction = Number(monthly_deduction);

    const result = db.run(`
      INSERT INTO advances (
        employee_id, amount, reason, date_given, approved_by,
        monthly_deduction, balance_remaining, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
    `, [
      employee_id,
      numAmount,
      reason || 'Staff Personal Advance',
      date_given,
      req.user.name || 'Admin',
      numDeduction,
      numAmount
    ]);

    return res.status(201).json({
      success: true,
      message: `Advance of ₹${numAmount.toLocaleString()} granted to ${employee.name}.`,
      advanceId: result.lastInsertRowid
    });
  } catch (error) {
    console.error('Create advance error:', error);
    return res.status(500).json({ success: false, message: 'Failed to issue advance loan.' });
  }
};

// Manually update or close an advance
export const updateAdvance = (req, res) => {
  try {
    const advanceId = req.params.id;
    const { balance_remaining, monthly_deduction, status, reason } = req.body;

    const existing = db.get('SELECT * FROM advances WHERE id = ?', [advanceId]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Advance record not found.' });
    }

    let newBalance = balance_remaining !== undefined ? Number(balance_remaining) : existing.balance_remaining;
    let newStatus = status || (newBalance <= 0 ? 'closed' : existing.status);

    db.run(`
      UPDATE advances SET
        balance_remaining = ?,
        monthly_deduction = COALESCE(?, monthly_deduction),
        status = ?,
        reason = COALESCE(?, reason)
      WHERE id = ?
    `, [
      newBalance,
      monthly_deduction !== undefined ? Number(monthly_deduction) : null,
      newStatus,
      reason,
      advanceId
    ]);

    return res.json({ success: true, message: 'Advance record updated.' });
  } catch (error) {
    console.error('Update advance error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update advance.' });
  }
};
