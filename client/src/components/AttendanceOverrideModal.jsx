import React, { useState } from 'react';
import { X, Check, AlertCircle } from 'lucide-react';
import api from '../services/api';

export default function AttendanceOverrideModal({ employee, date, onClose, onSave }) {
  const [status, setStatus] = useState(employee?.status || 'Present');
  const [remarks, setRemarks] = useState(employee?.remarks || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const res = await api.post('/attendance/override', {
        employee_id: employee.id,
        date: date || new Date().toISOString().split('T')[0],
        status,
        remarks: remarks.trim() || 'Admin manual override'
      });

      if (res.data?.success) {
        onSave();
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update attendance.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-850">
          <div>
            <h3 className="font-bold text-white text-base">Override Attendance Status</h3>
            <p className="text-xs text-slate-400 mt-0.5">{employee?.name} ({employee?.emp_code})</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Mark Status
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['Present', 'Half Day', 'Absent'].map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    status === s
                      ? s === 'Present'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : s === 'Half Day'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-rose-500/20 border-rose-500 text-rose-300'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Reason / Remark <span className="text-rose-400">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Approved client site visit, On-duty outdoor assignment"
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-600/20 flex items-center gap-1.5 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? 'Saving...' : 'Save Override'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
