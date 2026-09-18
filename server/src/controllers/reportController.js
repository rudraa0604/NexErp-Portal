import ExcelJS from 'exceljs';
import db from '../db/connection.js';

// 1. Monthly Payroll Summary & Department Cost Breakdown
export const getMonthlyPayrollSummary = (req, res) => {
  try {
    const { month, year } = req.query;

    let query = `
      SELECT pr.id, pr.month, pr.year, pr.status,
             SUM(pd.earned_salary) as total_gross,
             SUM(pd.pf_deduction) as total_pf,
             SUM(pd.esi_deduction) as total_esi,
             SUM(pd.tax_deduction) as total_tax,
             SUM(pd.advance_deduction) as total_advance_deductions,
             SUM(pd.other_deductions) as total_other_deductions,
             SUM(pd.net_pay) as total_net_payout,
             COUNT(pd.id) as headcount
      FROM payroll_runs pr
      LEFT JOIN payroll_details pd ON pr.id = pd.payroll_run_id
      WHERE 1=1
    `;
    const params = [];
    if (month) {
      query += ` AND pr.month = ?`;
      params.push(Number(month));
    }
    if (year) {
      query += ` AND pr.year = ?`;
      params.push(Number(year));
    }
    query += ` GROUP BY pr.id ORDER BY pr.year DESC, pr.month DESC`;

    const runs = db.all(query, params);

    // Department cost distribution
    const deptCosts = db.all(`
      SELECT e.department, 
             SUM(pd.earned_salary) as dept_gross,
             SUM(pd.net_pay) as dept_net,
             COUNT(DISTINCT e.id) as emp_count
      FROM payroll_details pd
      JOIN employees e ON pd.employee_id = e.id
      JOIN payroll_runs pr ON pd.payroll_run_id = pr.id
      WHERE 1=1 ${year ? 'AND pr.year = ' + Number(year) : ''} ${month ? 'AND pr.month = ' + Number(month) : ''}
      GROUP BY e.department
    `);

    return res.json({
      success: true,
      summary: runs,
      deptCosts
    });
  } catch (error) {
    console.error('Payroll summary report error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate report.' });
  }
};

// 2. Statutory Compliance Report (PF, ESI, Professional Tax)
export const getStatutoryReport = (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    const complianceData = db.all(`
      SELECT pr.month, pr.year,
             COUNT(pd.id) as total_employees,
             SUM(pd.basic_earned) as total_basic_wages,
             SUM(pd.pf_deduction) as employee_pf,
             SUM(pd.pf_deduction) as employer_pf,
             (SUM(pd.pf_deduction) * 2) as total_pf_deposit,
             SUM(pd.esi_deduction) as employee_esi,
             (SUM(pd.esi_deduction) * 4.33) as employer_esi,
             SUM(pd.tax_deduction) as professional_tax
      FROM payroll_runs pr
      JOIN payroll_details pd ON pr.id = pd.payroll_run_id
      WHERE pr.year = ?
      GROUP BY pr.month, pr.year
      ORDER BY pr.month ASC
    `, [Number(year)]);

    return res.json({
      success: true,
      year: Number(year),
      complianceData
    });
  } catch (error) {
    console.error('Statutory report error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate statutory report.' });
  }
};

// 3. Advance / Loan Outstanding Report
export const getAdvanceReport = (req, res) => {
  try {
    const advances = db.all(`
      SELECT a.*, e.emp_code, e.name as employee_name, e.department, e.designation
      FROM advances a
      JOIN employees e ON a.employee_id = e.id
      ORDER BY a.status ASC, a.balance_remaining DESC
    `);

    const totalIssued = advances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
    const totalOutstanding = advances.reduce((sum, a) => sum + (Number(a.balance_remaining) || 0), 0);
    const totalRecovered = totalIssued - totalOutstanding;

    return res.json({
      success: true,
      totalIssued,
      totalOutstanding,
      totalRecovered,
      advances
    });
  } catch (error) {
    console.error('Advance report error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load advances report.' });
  }
};

// 4. Export Monthly Payroll to Excel
export const exportPayrollExcel = async (req, res) => {
  try {
    const runId = req.params.runId;
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

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ERP Portal HR Engine';
    const worksheet = workbook.addWorksheet(`Payroll ${run.month}-${run.year}`);

    // Headers
    worksheet.columns = [
      { header: 'Emp Code', key: 'emp_code', width: 12 },
      { header: 'Employee Name', key: 'name', width: 22 },
      { header: 'Department', key: 'department', width: 18 },
      { header: 'Designation', key: 'designation', width: 20 },
      { header: 'Days', key: 'working_days', width: 10 },
      { header: 'Present', key: 'present_days', width: 10 },
      { header: 'Half Days', key: 'half_days', width: 10 },
      { header: 'Gross Earned (₹)', key: 'earned_salary', width: 16 },
      { header: 'PF (₹)', key: 'pf_deduction', width: 12 },
      { header: 'ESI (₹)', key: 'esi_deduction', width: 12 },
      { header: 'PT (₹)', key: 'tax_deduction', width: 12 },
      { header: 'Advance (₹)', key: 'advance_deduction', width: 14 },
      { header: 'Other (₹)', key: 'other_deductions', width: 12 },
      { header: 'Net Pay (₹)', key: 'net_pay', width: 16 },
      { header: 'Bank Name', key: 'bank_name', width: 18 },
      { header: 'A/C Number', key: 'bank_account_no', width: 18 },
      { header: 'IFSC', key: 'ifsc', width: 14 },
      { header: 'Status', key: 'payment_status', width: 12 },
      { header: 'UTR / Ref No', key: 'reference_no', width: 20 }
    ];

    // Style Header Row
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' }
    };

    details.forEach(d => {
      worksheet.addRow({
        emp_code: d.emp_code,
        name: d.employee_name,
        department: d.department,
        designation: d.designation,
        working_days: d.working_days,
        present_days: d.present_days,
        half_days: d.half_days,
        earned_salary: d.earned_salary,
        pf_deduction: d.pf_deduction,
        esi_deduction: d.esi_deduction,
        tax_deduction: d.tax_deduction,
        advance_deduction: d.advance_deduction,
        other_deductions: d.other_deductions,
        net_pay: d.net_pay,
        bank_name: d.bank_name || '-',
        bank_account_no: d.bank_account_no || '-',
        ifsc: d.ifsc || '-',
        payment_status: d.payment_status,
        reference_no: d.reference_no || '-'
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Payroll_Export_${run.month}_${run.year}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export excel error:', error);
    return res.status(500).json({ success: false, message: 'Failed to export excel spreadsheet.' });
  }
};
