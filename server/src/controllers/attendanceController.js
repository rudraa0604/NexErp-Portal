import db from '../db/connection.js';

// Helper to format Date to YYYY-MM-DD
const getTodayDateStr = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to format Time to HH:MM:SS
const getCurrentTimeStr = () => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

// Helper to get or auto-link employee ID for user (including admin)
export const getEffectiveEmployeeId = (user) => {
  if (!user) return null;
  if (user.employee_id) return user.employee_id;

  if (user.role === 'admin') {
    let adminEmp = db.get("SELECT id FROM employees WHERE email = ? OR emp_code = 'EMP000'", [user.email]);
    if (!adminEmp) {
      db.run(`
        INSERT INTO employees (user_id, emp_code, name, email, department, designation, doj, employment_type, status)
        VALUES (?, 'EMP000', ?, ?, 'Administration', 'System Administrator', '2023-01-01', 'Full-time', 'Active')
      `, [user.id, user.name || 'System Administrator', user.email]);
      adminEmp = db.get("SELECT id FROM employees WHERE emp_code = 'EMP000'");
      if (adminEmp) {
        db.run('UPDATE users SET employee_id = ? WHERE id = ?', [adminEmp.id, user.id]);
        try {
          db.run(`
            INSERT INTO salary_structure (employee_id, basic, hra, other_allowance, effective_from)
            VALUES (?, 60000, 30000, 30000, '2023-01-01')
          `, [adminEmp.id]);
        } catch (e) {}
      }
    } else {
      db.run('UPDATE users SET employee_id = ? WHERE id = ?', [adminEmp.id, user.id]);
    }
    return adminEmp ? adminEmp.id : null;
  }
  return null;
};

// Toggle Punch In / Punch Out
export const punchToggle = (req, res) => {
  try {
    const employeeId = getEffectiveEmployeeId(req.user);
    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'No employee record linked with this account.' });
    }

    const todayStr = getTodayDateStr();
    const timeStr = getCurrentTimeStr();
    const { lat, lng, photo } = req.body;

    const settings = db.get('SELECT * FROM attendance_settings ORDER BY id DESC LIMIT 1') || {
      full_day_hours: 8.0,
      half_day_hours: 4.0,
      cutoff_time: '09:30',
      late_mark_after: '10:00'
    };

    let log = db.get('SELECT * FROM attendance_logs WHERE employee_id = ? AND date = ?', [employeeId, todayStr]);

    if (!log) {
      // Punch In
      let initialStatus = 'Present';
      if (timeStr > settings.cutoff_time) {
        initialStatus = 'Present'; // marked as present initially
      }

      db.run(`
        INSERT INTO attendance_logs (employee_id, date, punch_in_time, punch_in_lat, punch_in_lng, punch_in_photo, status, marked_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [employeeId, todayStr, timeStr, lat || null, lng || null, photo || null, initialStatus, 'system']);

      return res.json({
        success: true,
        action: 'PUNCH_IN',
        message: `Punched in successfully at ${timeStr}`,
        punch_in_time: timeStr,
        status: initialStatus
      });
    } else if (log.punch_in_time && !log.punch_out_time) {
      // Punch Out & calculate hours
      const inParts = log.punch_in_time.split(':').map(Number);
      const outParts = timeStr.split(':').map(Number);

      const inTotalSeconds = inParts[0] * 3600 + inParts[1] * 60 + (inParts[2] || 0);
      const outTotalSeconds = outParts[0] * 3600 + outParts[1] * 60 + (outParts[2] || 0);
      const diffSeconds = Math.max(0, outTotalSeconds - inTotalSeconds);
      const totalHours = Number((diffSeconds / 3600).toFixed(2));

      let finalStatus = 'Absent';
      if (totalHours >= settings.full_day_hours) {
        finalStatus = 'Present';
      } else if (totalHours >= settings.half_day_hours) {
        finalStatus = 'Half Day';
      } else {
        finalStatus = 'Half Day'; // Minimum half day credit for logged punch session
      }

      db.run(`
        UPDATE attendance_logs 
        SET punch_out_time = ?, total_hours = ?, status = ?
        WHERE id = ?
      `, [timeStr, totalHours, finalStatus, log.id]);

      return res.json({
        success: true,
        action: 'PUNCH_OUT',
        message: `Punched out successfully at ${timeStr}. Total worked: ${totalHours} hrs.`,
        punch_out_time: timeStr,
        total_hours: totalHours,
        status: finalStatus
      });
    } else {
      return res.status(400).json({
        success: false,
        message: `Attendance already recorded for today (Punch In: ${log.punch_in_time}, Punch Out: ${log.punch_out_time}).`
      });
    }
  } catch (error) {
    console.error('Punch error:', error);
    return res.status(500).json({ success: false, message: 'Failed to process punch.' });
  }
};

// Employee Self-Mark / Apply Half Day with Reason
export const applyHalfDay = (req, res) => {
  try {
    const employeeId = getEffectiveEmployeeId(req.user);
    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'No employee record linked with this account.' });
    }

    const todayStr = getTodayDateStr();
    const timeStr = getCurrentTimeStr();
    const { reason, half_type = 'First Half' } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide a reason for taking Half Day.' });
    }

    const settings = db.get('SELECT * FROM attendance_settings ORDER BY id DESC LIMIT 1') || {
      half_day_hours: 4.0
    };

    let log = db.get('SELECT * FROM attendance_logs WHERE employee_id = ? AND date = ?', [employeeId, todayStr]);

    const remarkText = `Half Day (${half_type}) - ${reason.trim()}`;

    if (!log) {
      db.run(`
        INSERT INTO attendance_logs (employee_id, date, punch_in_time, punch_out_time, total_hours, status, remarks, marked_by)
        VALUES (?, ?, ?, ?, ?, 'Half Day', ?, 'system')
      `, [employeeId, todayStr, timeStr, timeStr, Number(settings.half_day_hours || 4.0), remarkText]);
    } else {
      db.run(`
        UPDATE attendance_logs 
        SET punch_out_time = COALESCE(punch_out_time, ?),
            total_hours = ?,
            status = 'Half Day',
            remarks = ?,
            marked_by = 'system'
        WHERE id = ?
      `, [timeStr, Number(settings.half_day_hours || 4.0), remarkText, log.id]);
    }

    return res.json({
      success: true,
      message: `Half Day recorded successfully (${half_type}).`,
      status: 'Half Day',
      remarks: remarkText
    });
  } catch (error) {
    console.error('Apply half day error:', error);
    return res.status(500).json({ success: false, message: 'Failed to record Half Day.' });
  }
};

// Today's attendance summary cards & chart for Dashboard
export const getTodaySummary = (req, res) => {
  try {
    const todayStr = getTodayDateStr();

    const totalEmployeesRow = db.get("SELECT COUNT(*) as count FROM employees WHERE status = 'Active'");
    const totalEmployees = totalEmployeesRow?.count || 0;

    const logs = db.all(`
      SELECT al.*, e.name, e.department, e.designation
      FROM attendance_logs al
      JOIN employees e ON al.employee_id = e.id
      WHERE al.date = ?
    `, [todayStr]);

    let presentCount = 0;
    let halfDayCount = 0;
    let absentCount = 0;

    logs.forEach(l => {
      if (l.status === 'Present') presentCount++;
      else if (l.status === 'Half Day') halfDayCount++;
      else absentCount++;
    });

    // Those without any punch today are considered absent
    const loggedEmployeeIds = new Set(logs.map(l => l.employee_id));
    const activeEmployees = db.all("SELECT id FROM employees WHERE status = 'Active'");
    const unpunchedCount = activeEmployees.filter(e => !loggedEmployeeIds.has(e.id)).length;
    absentCount += unpunchedCount;

    return res.json({
      success: true,
      today: todayStr,
      summary: {
        totalEmployees,
        presentCount,
        halfDayCount,
        absentCount,
        punchRate: totalEmployees > 0 ? Number(((presentCount + halfDayCount) / totalEmployees * 100).toFixed(1)) : 0
      }
    });
  } catch (error) {
    console.error('Today summary error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load today summary.' });
  }
};

// Today's employee table listing
export const getTodayList = (req, res) => {
  try {
    const todayStr = getTodayDateStr();

    const employees = db.all(`
      SELECT e.id, e.emp_code, e.name, e.department, e.designation, e.avatar_url,
             al.id as log_id, al.punch_in_time, al.punch_out_time, al.total_hours,
             COALESCE(al.status, 'Absent') as status,
             al.remarks, al.marked_by
      FROM employees e
      LEFT JOIN attendance_logs al ON e.id = al.employee_id AND al.date = ?
      WHERE e.status = 'Active'
      ORDER BY e.emp_code ASC
    `, [todayStr]);

    return res.json({
      success: true,
      today: todayStr,
      employees
    });
  } catch (error) {
    console.error('Today list error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load today list.' });
  }
};

// Employee own status for today
export const getMyStatus = (req, res) => {
  try {
    const employeeId = getEffectiveEmployeeId(req.user);
    if (!employeeId) {
      return res.json({
        success: true,
        hasEmployeeRecord: false,
        isPunchedIn: false,
        log: null
      });
    }

    const todayStr = getTodayDateStr();
    const log = db.get('SELECT * FROM attendance_logs WHERE employee_id = ? AND date = ?', [employeeId, todayStr]);

    const isPunchedIn = Boolean(log && log.punch_in_time && !log.punch_out_time);

    return res.json({
      success: true,
      hasEmployeeRecord: true,
      today: todayStr,
      isPunchedIn,
      log: log || null
    });
  } catch (error) {
    console.error('My status error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load personal attendance status.' });
  }
};

// Admin status override
export const overrideStatus = (req, res) => {
  try {
    const { employee_id, date, status, remarks } = req.body;
    if (!employee_id || !date || !status) {
      return res.status(400).json({ success: false, message: 'Employee, date, and status are required.' });
    }

    const existing = db.get('SELECT id FROM attendance_logs WHERE employee_id = ? AND date = ?', [employee_id, date]);

    if (existing) {
      db.run(`
        UPDATE attendance_logs 
        SET status = ?, remarks = ?, marked_by = 'admin'
        WHERE id = ?
      `, [status, remarks || 'Admin manual override', existing.id]);
    } else {
      db.run(`
        INSERT INTO attendance_logs (employee_id, date, status, remarks, marked_by)
        VALUES (?, ?, ?, ?, 'admin')
      `, [employee_id, date, status, remarks || 'Admin manual override']);
    }

    return res.json({ success: true, message: 'Attendance status updated successfully.' });
  } catch (error) {
    console.error('Override error:', error);
    return res.status(500).json({ success: false, message: 'Failed to override attendance status.' });
  }
};

// Monthly calendar view for employee profile / dashboard popup
export const getMonthCalendar = (req, res) => {
  try {
    let employeeId = req.params.employeeId || getEffectiveEmployeeId(req.user);
    if (req.user.role !== 'admin' && Number(employeeId) !== Number(req.user.employee_id)) {
      return res.status(403).json({ success: false, message: 'Forbidden. You can only view your own attendance.' });
    }

    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'Employee ID is required.' });
    }

    const employee = db.get('SELECT id, emp_code, name, department, designation, avatar_url FROM employees WHERE id = ?', [employeeId]);

    const month = parseInt(req.query.month) || (new Date().getMonth() + 1);
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const monthStr = String(month).padStart(2, '0');
    const pattern = `${year}-${monthStr}-%`;

    const logs = db.all(`
      SELECT date, punch_in_time, punch_out_time, total_hours, status, remarks, marked_by
      FROM attendance_logs
      WHERE employee_id = ? AND date LIKE ?
      ORDER BY date ASC
    `, [employeeId, pattern]);

    let presentDays = 0;
    let halfDays = 0;
    let absentDays = 0;
    let totalHours = 0;

    logs.forEach(l => {
      if (l.status === 'Present') presentDays++;
      else if (l.status === 'Half Day') halfDays++;
      else if (l.status === 'Absent') absentDays++;
      totalHours += Number(l.total_hours || 0);
    });

    const daysInMonth = new Date(year, month, 0).getDate();

    return res.json({
      success: true,
      employee,
      month,
      year,
      summary: {
        presentDays,
        halfDays,
        absentDays,
        effectivePresent: presentDays + halfDays * 0.5,
        totalHours: Number(totalHours.toFixed(1)),
        daysInMonth
      },
      logs
    });
  } catch (error) {
    console.error('Calendar error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch attendance calendar.' });
  }
};

// Attendance Global Settings
export const getSettings = (req, res) => {
  try {
    const settings = db.get('SELECT * FROM attendance_settings ORDER BY id DESC LIMIT 1') || {
      full_day_hours: 8.0,
      half_day_hours: 4.0,
      cutoff_time: '09:30',
      late_mark_after: '10:00'
    };
    return res.json({ success: true, settings });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch settings.' });
  }
};

export const updateSettings = (req, res) => {
  try {
    const { full_day_hours, half_day_hours, cutoff_time, late_mark_after } = req.body;
    db.run(`
      INSERT INTO attendance_settings (full_day_hours, half_day_hours, cutoff_time, late_mark_after)
      VALUES (?, ?, ?, ?)
    `, [full_day_hours || 8.0, half_day_hours || 4.0, cutoff_time || '09:30', late_mark_after || '10:00']);

    return res.json({ success: true, message: 'Attendance settings updated.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update settings.' });
  }
};
