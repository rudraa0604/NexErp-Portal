import db from '../db/connection.js';
import { generateSalarySlipPdf } from '../services/pdfService.js';

// Helper to get number of days in month
function getDaysInMonth(month, year) {
  return new Date(year, month, 0).getDate();
}

// 1. Get all payroll runs
export const getPayrollRuns = (req, res) => {
  try {
    const runs = db.all(`
      SELECT pr.*, 
             COUNT(pd.id) as employee_count,
             SUM(pd.earned_salary) as total_gross_calculated,
             SUM(pd.net_pay) as total_net_calculated
      FROM payroll_runs pr
      LEFT JOIN payroll_details pd ON pr.id = pd.payroll_run_id
      GROUP BY pr.id
      ORDER BY pr.year DESC, pr.month DESC
    `);
    return res.json({ success: true, runs });
  } catch (error) {
    console.error('Get payroll runs error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch payroll runs.' });
  }
};

// 2. Get specific payroll run details
export const getPayrollRunDetails = (req, res) => {
  try {
    const runId = req.params.id;
    const run = db.get('SELECT * FROM payroll_runs WHERE id = ?', [runId]);
    if (!run) {
      return res.status(404).json({ success: false, message: 'Payroll run not found.' });
    }

    const details = db.all(`
      SELECT pd.*, e.emp_code, e.name as employee_name, e.department, e.designation, e.bank_account_no, e.ifsc, e.bank_name
      FROM payroll_details pd
      JOIN employees e ON pd.employee_id = e.id
      WHERE pd.payroll_run_id = ?
      ORDER BY e.emp_code ASC
    `, [runId]);

    return res.json({
      success: true,
      run,
      details
    });
  } catch (error) {
    console.error('Get payroll run details error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch payroll details.' });
  }
};

// 3. Generate Draft Payroll for Month & Year
export const generateDraftPayroll = (req, res) => {
  try {
    const { month, year } = req.body;
    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'Month and Year are required.' });
    }

    const numMonth = Number(month);
    const numYear = Number(year);
    const daysInMonth = getDaysInMonth(numMonth, numYear);

    // Check if run exists
    let run = db.get('SELECT * FROM payroll_runs WHERE month = ? AND year = ?', [numMonth, numYear]);
    if (run && run.status === 'finalized') {
      return res.status(400).json({
        success: false,
        message: `Payroll for ${numMonth}/${numYear} is already finalized and locked.`
      });
    }

    // Get settings
    const pSettings = db.get('SELECT * FROM payroll_settings ORDER BY id DESC LIMIT 1') || {
      pf_percent: 12.0,
      esi_percent: 0.75,
      professional_tax_slab: 200.0,
      late_penalty_per_day: 100.0
    };

    if (!run) {
      const runRes = db.run(`
        INSERT INTO payroll_runs (month, year, status, created_by)
        VALUES (?, ?, 'draft', ?)
      `, [numMonth, numYear, req.user.name || 'Admin']);
      run = db.get('SELECT * FROM payroll_runs WHERE id = ?', [runRes.lastInsertRowid]);
    }

    // Fetch active employees with salary structure
    const employees = db.all(`
      SELECT e.id, e.emp_code, e.name, e.department, e.designation,
             ss.basic, ss.hra, ss.other_allowance, ss.pf_applicable, ss.esi_applicable
      FROM employees e
      LEFT JOIN salary_structure ss ON e.id = ss.employee_id
      WHERE e.status = 'Active'
    `);

    const monthStr = String(numMonth).padStart(2, '0');
    const datePattern = `${numYear}-${monthStr}-%`;

    let totalRunGross = 0;
    let totalRunDeductions = 0;
    let totalRunNet = 0;

    for (const emp of employees) {
      const basic = Number(emp.basic) || 0;
      const hra = Number(emp.hra) || 0;
      const allowance = Number(emp.other_allowance) || 0;

      // Calculate attendance
      const logs = db.all(`
        SELECT status FROM attendance_logs
        WHERE employee_id = ? AND date LIKE ?
      `, [emp.id, datePattern]);

      let presentDays = 0;
      let halfDays = 0;

      logs.forEach(l => {
        if (l.status === 'Present') presentDays++;
        else if (l.status === 'Half Day') halfDays++;
      });

      // If no logs recorded yet in demo, assume full attendance or proportional
      if (logs.length === 0) {
        presentDays = Math.min(daysInMonth, 26);
      }

      const effectiveDays = presentDays + (halfDays * 0.5);
      const dayFactor = daysInMonth > 0 ? (effectiveDays / daysInMonth) : 1;

      const basicEarned = Number((basic * dayFactor).toFixed(2));
      const hraEarned = Number((hra * dayFactor).toFixed(2));
      const allowanceEarned = Number((allowance * dayFactor).toFixed(2));
      const earnedSalary = Number((basicEarned + hraEarned + allowanceEarned).toFixed(2));

      // Deductions
      let pfDeduction = 0;
      if (emp.pf_applicable) {
        pfDeduction = Number(((basicEarned * (pSettings.pf_percent || 12.0)) / 100).toFixed(2));
      }

      let esiDeduction = 0;
      if (emp.esi_applicable && earnedSalary <= 21000) {
        esiDeduction = Number(((earnedSalary * (pSettings.esi_percent || 0.75)) / 100).toFixed(2));
      }

      const taxDeduction = Number(pSettings.professional_tax_slab || 200.0);

      // Advance deduction lookup
      const activeAdvance = db.get(`
        SELECT id, monthly_deduction, balance_remaining 
        FROM advances 
        WHERE employee_id = ? AND status = 'active' AND balance_remaining > 0
        ORDER BY id ASC LIMIT 1
      `, [emp.id]);

      let advanceDeduction = 0;
      if (activeAdvance) {
        advanceDeduction = Math.min(activeAdvance.monthly_deduction, activeAdvance.balance_remaining);
      }

      const otherDeductions = 0;
      const totalDeductions = pfDeduction + esiDeduction + taxDeduction + advanceDeduction + otherDeductions;
      const netPay = Math.max(0, Number((earnedSalary - totalDeductions).toFixed(2)));

      totalRunGross += earnedSalary;
      totalRunDeductions += totalDeductions;
      totalRunNet += netPay;

      // Upsert detail
      const existingDetail = db.get(`
        SELECT id FROM payroll_details 
        WHERE payroll_run_id = ? AND employee_id = ?
      `, [run.id, emp.id]);

      if (existingDetail) {
        db.run(`
          UPDATE payroll_details SET
            working_days = ?, present_days = ?, half_days = ?,
            basic_earned = ?, hra_earned = ?, allowance_earned = ?, earned_salary = ?,
            pf_deduction = ?, esi_deduction = ?, tax_deduction = ?, advance_deduction = ?,
            other_deductions = ?, net_pay = ?
          WHERE id = ?
        `, [
          daysInMonth, presentDays, halfDays,
          basicEarned, hraEarned, allowanceEarned, earnedSalary,
          pfDeduction, esiDeduction, taxDeduction, advanceDeduction,
          otherDeductions, netPay, existingDetail.id
        ]);
      } else {
        db.run(`
          INSERT INTO payroll_details (
            payroll_run_id, employee_id, working_days, present_days, half_days,
            basic_earned, hra_earned, allowance_earned, earned_salary,
            pf_deduction, esi_deduction, tax_deduction, advance_deduction,
            other_deductions, net_pay, payment_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')
        `, [
          run.id, emp.id, daysInMonth, presentDays, halfDays,
          basicEarned, hraEarned, allowanceEarned, earnedSalary,
          pfDeduction, esiDeduction, taxDeduction, advanceDeduction,
          otherDeductions, netPay
        ]);
      }
    }

    db.run(`
      UPDATE payroll_runs SET
        total_gross = ?, total_deductions = ?, total_net = ?
      WHERE id = ?
    `, [totalRunGross, totalRunDeductions, totalRunNet, run.id]);

    return res.json({
      success: true,
      message: `Draft payroll for ${numMonth}/${numYear} generated successfully.`,
      payrollRunId: run.id
    });
  } catch (error) {
    console.error('Generate draft error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate draft payroll.' });
  }
};

// 4. Update/Adjust Payroll Item
export const adjustPayrollDetail = (req, res) => {
  try {
    const detailId = req.params.detailId;
    const {
      earned_salary,
      pf_deduction,
      esi_deduction,
      tax_deduction,
      advance_deduction,
      other_deductions,
      remarks
    } = req.body;

    const detail = db.get('SELECT * FROM payroll_details WHERE id = ?', [detailId]);
    if (!detail) {
      return res.status(404).json({ success: false, message: 'Payroll detail not found.' });
    }

    const run = db.get('SELECT status FROM payroll_runs WHERE id = ?', [detail.payroll_run_id]);
    if (run?.status === 'finalized') {
      return res.status(400).json({ success: false, message: 'Cannot adjust finalized payroll.' });
    }

    const newGross = earned_salary !== undefined ? Number(earned_salary) : detail.earned_salary;
    const newPf = pf_deduction !== undefined ? Number(pf_deduction) : detail.pf_deduction;
    const newEsi = esi_deduction !== undefined ? Number(esi_deduction) : detail.esi_deduction;
    const newTax = tax_deduction !== undefined ? Number(tax_deduction) : detail.tax_deduction;
    const newAdv = advance_deduction !== undefined ? Number(advance_deduction) : detail.advance_deduction;
    const newOther = other_deductions !== undefined ? Number(other_deductions) : detail.other_deductions;
    const newRemarks = remarks !== undefined ? remarks : detail.remarks;

    const newTotalDeductions = newPf + newEsi + newTax + newAdv + newOther;
    const newNet = Math.max(0, Number((newGross - newTotalDeductions).toFixed(2)));

    db.run(`
      UPDATE payroll_details SET
        earned_salary = ?, pf_deduction = ?, esi_deduction = ?,
        tax_deduction = ?, advance_deduction = ?, other_deductions = ?,
        net_pay = ?, remarks = ?
      WHERE id = ?
    `, [
      newGross, newPf, newEsi, newTax, newAdv, newOther, newNet, newRemarks, detailId
    ]);

    // Recalculate run totals
    const totals = db.get(`
      SELECT SUM(earned_salary) as gross, SUM(net_pay) as net,
             SUM(pf_deduction + esi_deduction + tax_deduction + advance_deduction + other_deductions) as deductions
      FROM payroll_details WHERE payroll_run_id = ?
    `, [detail.payroll_run_id]);

    db.run(`
      UPDATE payroll_runs SET
        total_gross = ?, total_deductions = ?, total_net = ?
      WHERE id = ?
    `, [totals.gross || 0, totals.deductions || 0, totals.net || 0, detail.payroll_run_id]);

    return res.json({ success: true, message: 'Payroll detail updated.' });
  } catch (error) {
    console.error('Adjust detail error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update payroll item.' });
  }
};

// 5. Finalize & Lock Payroll Run + Update Advances
export const finalizePayrollRun = (req, res) => {
  try {
    const runId = req.params.id;
    const run = db.get('SELECT * FROM payroll_runs WHERE id = ?', [runId]);
    if (!run) {
      return res.status(404).json({ success: false, message: 'Payroll run not found.' });
    }

    if (run.status === 'finalized' || run.status === 'paid') {
      return res.status(400).json({ success: false, message: 'Payroll run is already finalized.' });
    }

    // Get all details with advance deductions
    const details = db.all(`
      SELECT employee_id, advance_deduction FROM payroll_details
      WHERE payroll_run_id = ? AND advance_deduction > 0
    `, [runId]);

    // Deduct from advances balance
    for (const d of details) {
      const activeAdvance = db.get(`
        SELECT id, balance_remaining FROM advances
        WHERE employee_id = ? AND status = 'active' AND balance_remaining > 0
        ORDER BY id ASC LIMIT 1
      `, [d.employee_id]);

      if (activeAdvance) {
        const remaining = Math.max(0, activeAdvance.balance_remaining - d.advance_deduction);
        const status = remaining <= 0 ? 'closed' : 'active';
        db.run('UPDATE advances SET balance_remaining = ?, status = ? WHERE id = ?', [remaining, status, activeAdvance.id]);
      }
    }

    db.run(`
      UPDATE payroll_runs SET
        status = 'finalized',
        finalized_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [runId]);

    return res.json({ success: true, message: 'Payroll run approved and locked successfully.' });
  } catch (error) {
    console.error('Finalize payroll error:', error);
    return res.status(500).json({ success: false, message: 'Failed to finalize payroll run.' });
  }
};

// 6. Mark Payroll as Paid
export const markPayrollAsPaid = (req, res) => {
  try {
    const runId = req.params.id;
    const { payment_date, payment_mode = 'Bank Transfer', reference_no } = req.body;

    const run = db.get('SELECT * FROM payroll_runs WHERE id = ?', [runId]);
    if (!run) {
      return res.status(404).json({ success: false, message: 'Payroll run not found.' });
    }

    const payDate = payment_date || new Date().toISOString().split('T')[0];
    const refNo = reference_no || `TXN-ERP-${run.year}${String(run.month).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

    db.run(`
      UPDATE payroll_details SET
        payment_status = 'Paid',
        payment_date = ?,
        payment_mode = ?,
        reference_no = ?
      WHERE payroll_run_id = ?
    `, [payDate, payment_mode, refNo, runId]);

    db.run(`UPDATE payroll_runs SET status = 'paid' WHERE id = ?`, [runId]);

    return res.json({
      success: true,
      message: 'All salaries marked as Paid and slips released for download.',
      reference_no: refNo
    });
  } catch (error) {
    console.error('Mark paid error:', error);
    return res.status(500).json({ success: false, message: 'Failed to mark payroll as paid.' });
  }
};

// 7. Download PDF Salary Slip
export const downloadSalarySlip = (req, res) => {
  try {
    const detailId = req.params.detailId;

    const detail = db.get('SELECT * FROM payroll_details WHERE id = ?', [detailId]);
    if (!detail) {
      return res.status(404).json({ success: false, message: 'Payslip record not found.' });
    }

    // Role check: Employee can only download their own payslip
    if (req.user.role !== 'admin' && Number(detail.employee_id) !== Number(req.user.employee_id)) {
      return res.status(403).json({ success: false, message: 'Forbidden. You can only download your own payslip.' });
    }

    const employee = db.get('SELECT * FROM employees WHERE id = ?', [detail.employee_id]);
    const run = db.get('SELECT * FROM payroll_runs WHERE id = ?', [detail.payroll_run_id]);
    const settings = db.get('SELECT * FROM payroll_settings ORDER BY id DESC LIMIT 1') || {
      company_name: 'NexTech Innovations Pvt Ltd',
      company_address: 'Prestige Tech Cloud, Phase 2, Bangalore, Karnataka 560066',
      company_phone: '+91 80 4455 6677',
      company_email: 'hr@nextech.in'
    };

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=SalarySlip_${employee.emp_code}_${run.month}_${run.year}.pdf`);

    generateSalarySlipPdf({ employee, detail, run, settings }, res);
  } catch (error) {
    console.error('Download slip error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate salary slip.' });
  }
};

// 8. Employee self-service get all my payslips
export const getMySalarySlips = (req, res) => {
  try {
    const employeeId = req.user.employee_id;
    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'No employee linked with current user.' });
    }

    const slips = db.all(`
      SELECT pd.*, pr.month, pr.year, pr.status as run_status
      FROM payroll_details pd
      JOIN payroll_runs pr ON pd.payroll_run_id = pr.id
      WHERE pd.employee_id = ?
      ORDER BY pr.year DESC, pr.month DESC
    `, [employeeId]);

    return res.json({ success: true, slips });
  } catch (error) {
    console.error('Get my slips error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch payslips.' });
  }
};
