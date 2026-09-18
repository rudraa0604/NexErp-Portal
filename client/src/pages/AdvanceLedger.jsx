import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Check, 
  X,
  AlertCircle
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function AdvanceLedger() {
  const [advances, setAdvances] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalBalance, setTotalBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  
  // Grant Advance Modal
  const [showModal, setShowModal] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [grantForm, setGrantForm] = useState({
    employee_id: '',
    amount: 15000,
    monthly_deduction: 3000,
    date_given: new Date().toISOString().split('T')[0],
    reason: 'Personal Assistance'
  });
  const [grantLoading, setGrantLoading] = useState(false);
  const [grantError, setGrantError] = useState(null);

  const { isAdmin } = useAuth();

  const fetchAdvances = async () => {
    try {
      setLoading(true);
      const res = await api.get('/advances', {
        params: { status: statusFilter }
      });
      if (res.data?.success) {
        setAdvances(res.data.advances);
        setTotalAmount(res.data.totalAmount || 0);
        setTotalBalance(res.data.totalBalance || 0);
      }
    } catch (err) {
      console.error('Failed to fetch advances:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeesList = async () => {
    if (!isAdmin) return;
    try {
      const res = await api.get('/employees');
      if (res.data?.success) {
        setEmployees(res.data.employees);
        if (res.data.employees.length > 0) {
          setGrantForm(prev => ({ ...prev, employee_id: res.data.employees[0].id }));
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchAdvances();
  }, [statusFilter]);

  useEffect(() => {
    fetchEmployeesList();
  }, [isAdmin]);

  const handleGrantAdvance = async (e) => {
    e.preventDefault();
    try {
      setGrantLoading(true);
      setGrantError(null);
      const res = await api.post('/advances', grantForm);
      if (res.data?.success) {
        setShowModal(false);
        fetchAdvances();
      }
    } catch (err) {
      setGrantError(err.response?.data?.message || 'Failed to issue advance.');
    } finally {
      setGrantLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Staff Advances & Loans Ledger</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {isAdmin 
              ? 'Sanction, track and automatically recover staff loans via monthly payroll deductions' 
              : 'View your loan installments and remaining repayment balance'}
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-600/30 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Grant New Advance</span>
          </button>
        )}
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel rounded-2xl p-5 border-l-4 border-l-brand-500">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Sanctioned</p>
          <p className="text-2xl font-extrabold text-white mt-1 font-mono">₹{totalAmount.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-slate-400 mt-2">Cumulative company loans</p>
        </div>

        <div className="glass-panel rounded-2xl p-5 border-l-4 border-l-rose-500">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Outstanding Balance</p>
          <p className="text-2xl font-extrabold text-rose-400 mt-1 font-mono">₹{totalBalance.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-slate-400 mt-2">To be deducted from upcoming payrolls</p>
        </div>

        <div className="glass-panel rounded-2xl p-5 border-l-4 border-l-emerald-500">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Recovered to Date</p>
          <p className="text-2xl font-extrabold text-emerald-400 mt-1 font-mono">₹{(totalAmount - totalBalance).toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-emerald-400/80 mt-2">Deducted from previous salary runs</p>
        </div>
      </div>

      {/* Advance List Table */}
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-white text-base">Advance Records</h3>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300"
          >
            <option value="">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="closed">Closed Only</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase">
                <th className="pb-3 pr-4">Employee</th>
                <th className="pb-3 px-3">Date Sanctioned</th>
                <th className="pb-3 px-3">Sanctioned Amount</th>
                <th className="pb-3 px-3">Monthly Deduction</th>
                <th className="pb-3 px-3">Balance Remaining</th>
                <th className="pb-3 px-3">Reason</th>
                <th className="pb-3 pl-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {advances.map((adv) => (
                <tr key={adv.id} className="hover:bg-slate-800/30">
                  <td className="py-3.5 pr-4">
                    <p className="font-bold text-white">{adv.employee_name || 'Staff'}</p>
                    <p className="text-[11px] text-slate-400">{adv.emp_code} • {adv.department}</p>
                  </td>
                  <td className="py-3.5 px-3 font-mono text-slate-300">{adv.date_given}</td>
                  <td className="py-3.5 px-3 font-mono font-bold text-white">₹{Number(adv.amount).toLocaleString('en-IN')}</td>
                  <td className="py-3.5 px-3 font-mono text-amber-400">₹{Number(adv.monthly_deduction).toLocaleString('en-IN')}/mo</td>
                  <td className="py-3.5 px-3 font-mono font-bold text-rose-400">₹{Number(adv.balance_remaining).toLocaleString('en-IN')}</td>
                  <td className="py-3.5 px-3 text-slate-300">{adv.reason}</td>
                  <td className="py-3.5 pl-3 text-right">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${
                      adv.status === 'active' 
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}>
                      {adv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {advances.length === 0 && !loading && (
            <div className="text-center py-12 text-slate-500 text-xs">
              No advance records found.
            </div>
          )}
        </div>
      </div>

      {/* Grant Advance Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-850">
              <h3 className="font-bold text-white text-base">Issue Staff Advance / Loan</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGrantAdvance} className="p-6 space-y-4 text-xs">
              {grantError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{grantError}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Select Employee *</label>
                <select
                  required
                  value={grantForm.employee_id}
                  onChange={(e) => setGrantForm({ ...grantForm, employee_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.emp_code} - {emp.department})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Advance Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    value={grantForm.amount}
                    onChange={(e) => setGrantForm({ ...grantForm, amount: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Monthly Deduction (₹) *</label>
                  <input
                    type="number"
                    required
                    value={grantForm.monthly_deduction}
                    onChange={(e) => setGrantForm({ ...grantForm, monthly_deduction: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Date of Disbursement *</label>
                <input
                  type="date"
                  required
                  value={grantForm.date_given}
                  onChange={(e) => setGrantForm({ ...grantForm, date_given: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Purpose / Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Medical emergency assistance, Festival advance"
                  value={grantForm.reason}
                  onChange={(e) => setGrantForm({ ...grantForm, reason: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-400 font-semibold">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={grantLoading}
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-500 font-bold text-white rounded-xl shadow-lg shadow-brand-600/30"
                >
                  {grantLoading ? 'Granting...' : 'Approve & Sanction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
