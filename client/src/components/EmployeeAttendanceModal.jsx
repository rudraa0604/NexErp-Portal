import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  UserCheck, 
  UserX, 
  ExternalLink, 
  Edit3,
  Coffee,
  Info
} from 'lucide-react';
import api from '../services/api';

export default function EmployeeAttendanceModal({ employee, onClose, onOpenOverride }) {
  const navigate = useNavigate();
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const fetchAttendance = async () => {
    if (!employee?.id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/attendance/calendar/${employee.id}`, {
        params: { month: selectedMonth, year: selectedYear }
      });
      if (res.data?.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load employee attendance:', err);
      setError(err.response?.data?.message || 'Failed to fetch attendance history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [employee?.id, selectedMonth, selectedYear]);

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(y => y - 1);
    } else {
      setSelectedMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(y => y + 1);
    } else {
      setSelectedMonth(m => m + 1);
    }
  };

  const summary = data?.summary || {
    presentDays: 0,
    halfDays: 0,
    absentDays: 0,
    effectivePresent: 0,
    totalHours: 0,
    daysInMonth: 30
  };

  const logs = data?.logs || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scaleUp">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-850/90 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full bg-slate-800 border-2 border-brand-500/50 overflow-hidden flex items-center justify-center shrink-0 shadow-md">
              {employee?.avatar_url ? (
                <img src={employee.avatar_url} alt={employee.name} className="w-full h-full object-cover" />
              ) : (
                <span className="font-extrabold text-brand-400 text-sm">{employee?.name?.charAt(0) || 'E'}</span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base tracking-tight">{employee?.name}</h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                  {employee?.emp_code}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {employee?.designation} • <span className="text-slate-300">{employee?.department}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                navigate(`/profile/${employee.id}`);
              }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 border border-brand-500/30 transition-all"
              title="Open full employee profile"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Full Profile</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Month Navigation Toolbar */}
        <div className="px-6 py-3.5 border-b border-slate-800/80 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-white text-sm min-w-[140px] text-center font-mono">
              {monthNames[selectedMonth - 1]} {selectedYear}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {onOpenOverride && (
              <button
                onClick={() => {
                  onClose();
                  onOpenOverride(employee);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Override Status</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Present</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              </div>
              <p className="text-xl font-extrabold text-emerald-400">{summary.presentDays} <span className="text-xs text-slate-400 font-normal">Days</span></p>
              <p className="text-[10px] text-slate-400 mt-0.5">Full day sessions</p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Half Day</span>
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              </div>
              <p className="text-xl font-extrabold text-amber-400">{summary.halfDays} <span className="text-xs text-slate-400 font-normal">Days</span></p>
              <p className="text-[10px] text-slate-400 mt-0.5">0.5 credit each</p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Absent</span>
                <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              </div>
              <p className="text-xl font-extrabold text-rose-400">{summary.absentDays} <span className="text-xs text-slate-400 font-normal">Days</span></p>
              <p className="text-[10px] text-slate-400 mt-0.5">Unmarked / leaves</p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Hours</span>
                <span className="w-2 h-2 rounded-full bg-brand-400"></span>
              </div>
              <p className="text-xl font-extrabold text-brand-300 font-mono">{summary.totalHours} <span className="text-xs text-slate-400 font-normal">hrs</span></p>
              <p className="text-[10px] text-emerald-400 font-semibold mt-0.5">Effective: {summary.effectivePresent} Days</p>
            </div>
          </div>

          {/* Daily Records Table */}
          <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/40">
            <div className="px-4 py-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-brand-400" />
                <span>Attendance Log Details ({monthNames[selectedMonth - 1]} {selectedYear})</span>
              </h4>
              <span className="text-[11px] text-slate-400 font-medium">
                {logs.length} Recorded Entries
              </span>
            </div>

            <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <div className="inline-block w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                  <p>Loading attendance records...</p>
                </div>
              ) : logs.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No attendance entries logged for {monthNames[selectedMonth - 1]} {selectedYear}.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-3">Punch In</th>
                      <th className="py-2.5 px-3">Punch Out</th>
                      <th className="py-2.5 px-3">Logged Hours</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-4">Remarks / Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {logs.map((log, idx) => {
                      const dateObj = new Date(log.date + 'T00:00:00');
                      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                      const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

                      return (
                        <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-semibold text-white">{formattedDate}</span>
                            <span className="text-[10px] text-slate-400 ml-1.5 font-medium">({dayName})</span>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-300">
                            {log.punch_in_time || '—'}
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-300">
                            {log.punch_out_time || '—'}
                          </td>
                          <td className="py-3 px-3 font-mono font-semibold text-slate-200">
                            {log.total_hours ? `${log.total_hours}h` : '—'}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              log.status === 'Present'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : log.status === 'Half Day'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-400 max-w-xs truncate text-[11px]">
                            {log.remarks ? (
                              <span className="text-amber-300/90 font-medium" title={log.remarks}>
                                {log.remarks}
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-850/80 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-brand-400" />
            <span>Clicking any employee in dashboard shows their full attendance history</span>
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-all active:scale-95"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
