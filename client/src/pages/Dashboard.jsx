import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Clock, 
  Activity, 
  SlidersHorizontal,
  RefreshCw,
  Edit3,
  Eye,
  Calendar
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import PunchWidget from '../components/PunchWidget';
import AttendanceChart from '../components/AttendanceChart';
import AttendanceOverrideModal from '../components/AttendanceOverrideModal';
import EmployeeAttendanceModal from '../components/EmployeeAttendanceModal';

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const [summary, setSummary] = useState(null);
  const [todayEmployees, setTodayEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [overrideModalData, setOverrideModalData] = useState(null);
  const [selectedEmployeeForAttendance, setSelectedEmployeeForAttendance] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      if (isAdmin) {
        const [sumRes, listRes] = await Promise.all([
          api.get('/attendance/today-summary'),
          api.get('/attendance/today-list')
        ]);
        if (sumRes.data?.success) setSummary(sumRes.data.summary);
        if (listRes.data?.success) setTodayEmployees(listRes.data.employees);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [isAdmin]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Welcome back, {user?.name} 👋
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {isAdmin 
              ? "Here is today's real-time attendance & workforce overview" 
              : "Manage your daily work log and check monthly attendance records"}
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </button>
        )}
      </div>

      {/* Widget 3: Quick Punch In / Out Card (Visible to all users) */}
      <PunchWidget onPunchComplete={fetchDashboardData} />

      {/* Admin Attendance Overview Section */}
      {isAdmin && (
        <>
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-panel rounded-2xl p-5 border-l-4 border-l-brand-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Staff</p>
                  <p className="text-2xl font-extrabold text-white mt-1">{summary?.totalEmployees || 0}</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">Active full-time & contract staff</p>
            </div>

            <div className="glass-panel rounded-2xl p-5 border-l-4 border-l-emerald-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Present Today</p>
                  <p className="text-2xl font-extrabold text-emerald-400 mt-1">{summary?.presentCount || 0}</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[11px] text-emerald-400/80 mt-2">{summary?.punchRate || 0}% attendance rate</p>
            </div>

            <div className="glass-panel rounded-2xl p-5 border-l-4 border-l-amber-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Half Day</p>
                  <p className="text-2xl font-extrabold text-amber-400 mt-1">{summary?.halfDayCount || 0}</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">&gt;= 4 hrs logged session</p>
            </div>

            <div className="glass-panel rounded-2xl p-5 border-l-4 border-l-rose-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Absent / Unmarked</p>
                  <p className="text-2xl font-extrabold text-rose-400 mt-1">{summary?.absentCount || 0}</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                  <UserX className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[11px] text-rose-400/80 mt-2">No punch recorded today</p>
            </div>
          </div>

          {/* Widget 1 & Widget 2 Section: Visual Chart + Attendance Live Table */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart Widget */}
            <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-white text-base tracking-tight mb-1">Attendance Ratio</h3>
                <p className="text-xs text-slate-400">Today's workforce presence breakdown</p>
              </div>
              <AttendanceChart summary={summary} />
              <div className="mt-2 pt-3 border-t border-slate-800 text-center text-xs text-slate-400">
                Auto-calculated against 09:30 AM cutoff rule
              </div>
            </div>

            {/* Widget 2: Status Table with Quick Override */}
            <div className="lg:col-span-2 glass-panel rounded-2xl p-6 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-white text-base tracking-tight">Today's Employee Status</h3>
                  <p className="text-xs text-slate-400">Live punches and status calculations</p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
                  {todayEmployees.length} Active Staff
                </span>
              </div>

              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="pb-3 pr-4">Employee (Click to view)</th>
                      <th className="pb-3 px-3">Department</th>
                      <th className="pb-3 px-3">Punch In</th>
                      <th className="pb-3 px-3">Punch Out</th>
                      <th className="pb-3 px-3">Hours</th>
                      <th className="pb-3 px-3">Status</th>
                      <th className="pb-3 pl-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {todayEmployees.map((emp) => (
                      <tr 
                        key={emp.id} 
                        className="hover:bg-slate-800/50 transition-colors group cursor-pointer"
                        onClick={() => setSelectedEmployeeForAttendance(emp)}
                      >
                        <td className="py-3.5 pr-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 group-hover:border-brand-500 overflow-hidden flex items-center justify-center shrink-0 transition-all shadow-sm">
                              {emp.avatar_url ? (
                                <img src={emp.avatar_url} alt={emp.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="font-bold text-brand-400 text-xs">{emp.name.charAt(0)}</span>
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-white group-hover:text-brand-400 transition-colors flex items-center gap-1.5">
                                <span>{emp.name}</span>
                                <span className="text-[10px] text-brand-400 opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
                              </p>
                              <p className="text-[11px] text-slate-400">{emp.emp_code}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-slate-300">{emp.department}</td>
                        <td className="py-3.5 px-3 font-mono text-slate-300">{emp.punch_in_time || '—'}</td>
                        <td className="py-3.5 px-3 font-mono text-slate-300">{emp.punch_out_time || '—'}</td>
                        <td className="py-3.5 px-3 font-mono text-slate-300">
                          {emp.total_hours ? `${emp.total_hours}h` : '—'}
                        </td>
                        <td className="py-3.5 px-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            emp.status === 'Present'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : emp.status === 'Half Day'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}>
                            {emp.status}
                          </span>
                        </td>
                        <td className="py-3.5 pl-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setSelectedEmployeeForAttendance(emp)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
                              title="View individual monthly attendance"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setOverrideModalData(emp)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-brand-400 hover:bg-slate-800 transition-colors"
                              title="Override attendance status"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Individual Employee Attendance Detail Modal */}
      {selectedEmployeeForAttendance && (
        <EmployeeAttendanceModal
          employee={selectedEmployeeForAttendance}
          onClose={() => setSelectedEmployeeForAttendance(null)}
          onOpenOverride={(emp) => setOverrideModalData(emp)}
        />
      )}

      {/* Override Modal */}
      {overrideModalData && (
        <AttendanceOverrideModal
          employee={overrideModalData}
          onClose={() => setOverrideModalData(null)}
          onSave={fetchDashboardData}
        />
      )}
    </div>
  );
}
