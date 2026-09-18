import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Building2, 
  CreditCard,
  UserPlus,
  X,
  Check,
  AlertCircle
} from 'lucide-react';
import api from '../services/api';

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState(null);

  const navigate = useNavigate();

  // New Employee Form State
  const [formData, setFormData] = useState({
    emp_code: '',
    name: '',
    email: '',
    dob: '',
    gender: 'Male',
    contact: '',
    address: '',
    emergency_contact: '',
    department: 'Engineering',
    designation: '',
    doj: new Date().toISOString().split('T')[0],
    employment_type: 'Full-time',
    bank_account_no: '',
    ifsc: '',
    bank_name: '',
    basic: 35000,
    hra: 17500,
    other_allowance: 7500,
    pf_applicable: 1,
    esi_applicable: 1,
    password: 'Password@123'
  });

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await api.get('/employees', {
        params: { search, department, status }
      });
      if (res.data?.success) {
        setEmployees(res.data.employees);
      }
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [search, department, status]);

  const handleToggleStatus = async (id, e) => {
    e.stopPropagation();
    try {
      await api.patch(`/employees/${id}/toggle-status`);
      fetchEmployees();
    } catch (err) {
      alert('Failed to update employee status');
    }
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    try {
      setAddLoading(true);
      setAddError(null);
      const res = await api.post('/employees', formData);
      if (res.data?.success) {
        setShowAddModal(false);
        fetchEmployees();
        // Reset form
        setFormData({
          emp_code: '',
          name: '',
          email: '',
          dob: '',
          gender: 'Male',
          contact: '',
          address: '',
          emergency_contact: '',
          department: 'Engineering',
          designation: '',
          doj: new Date().toISOString().split('T')[0],
          employment_type: 'Full-time',
          bank_account_no: '',
          ifsc: '',
          bank_name: '',
          basic: 35000,
          hra: 17500,
          other_allowance: 7500,
          pf_applicable: 1,
          esi_applicable: 1,
          password: 'Password@123'
        });
      }
    } catch (err) {
      setAddError(err.response?.data?.message || 'Failed to create employee.');
    } finally {
      setAddLoading(false);
    }
  };

  const departments = ['Engineering', 'Human Resources', 'Operations', 'Design & UI/UX', 'Finance & Accounts', 'Sales & Marketing'];

  return (
    <div className="space-y-6">
      {/* Top Title & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Staff & Employee Directory</h1>
          <p className="text-xs text-slate-400 mt-0.5">Manage employee lifecycle, salary structures, profiles, and portal credentials</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-600/30 transition-all active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Employee</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, ID, email..."
            className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-brand-500 transition-colors flex-1 md:flex-none"
          >
            <option value="">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-brand-500 transition-colors"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active Only</option>
            <option value="Inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Employees Table */}
      <div className="glass-panel rounded-2xl p-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3 pr-4">Employee</th>
                <th className="pb-3 px-3">Department & Role</th>
                <th className="pb-3 px-3">Contact</th>
                <th className="pb-3 px-3">Joining Date</th>
                <th className="pb-3 px-3">Base CTC (Monthly)</th>
                <th className="pb-3 px-3">Status</th>
                <th className="pb-3 pl-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {employees.map((emp) => (
                <tr 
                  key={emp.id} 
                  onClick={() => navigate(`/employees/${emp.id}`)}
                  className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                >
                  <td className="py-4 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                        {emp.avatar_url ? (
                          <img src={emp.avatar_url} alt={emp.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-bold text-brand-400 text-xs">{emp.name.charAt(0)}</span>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-white">{emp.name}</p>
                        <p className="text-[11px] text-slate-400">{emp.emp_code} • {emp.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-3">
                    <p className="text-slate-200 font-medium">{emp.department}</p>
                    <p className="text-[11px] text-slate-400">{emp.designation}</p>
                  </td>
                  <td className="py-4 px-3 text-slate-300">
                    {emp.contact || '—'}
                  </td>
                  <td className="py-4 px-3 font-mono text-slate-300">
                    {emp.doj}
                  </td>
                  <td className="py-4 px-3 font-mono font-bold text-emerald-400">
                    ₹{Number(emp.gross_salary || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="py-4 px-3">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                      emp.status === 'Active'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-slate-700/40 text-slate-400 border-slate-700'
                    }`}>
                      {emp.status}
                    </span>
                  </td>
                  <td className="py-4 pl-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/employees/${emp.id}`);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-brand-400 hover:bg-slate-800 transition-colors"
                        title="View Full Profile"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleToggleStatus(emp.id, e)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          emp.status === 'Active' 
                            ? 'text-rose-400 hover:bg-rose-500/10' 
                            : 'text-emerald-400 hover:bg-emerald-500/10'
                        }`}
                        title={emp.status === 'Active' ? 'Deactivate Employee' : 'Activate Employee'}
                      >
                        {emp.status === 'Active' ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {employees.length === 0 && !loading && (
            <div className="text-center py-12 text-slate-500 text-xs">
              No employees matched your criteria.
            </div>
          )}
        </div>
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-850">
              <div className="flex items-center gap-2.5">
                <UserPlus className="w-5 h-5 text-brand-400" />
                <h3 className="font-bold text-white text-base">Add New Employee</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {addError && (
                <div className="p-3 rounded-xl text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{addError}</span>
                </div>
              )}

              {/* 1. Basic & Employment Info */}
              <div>
                <h4 className="text-xs font-bold text-brand-400 uppercase tracking-wider mb-3">
                  1. Personal & Employment Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Employee Code *</label>
                    <input
                      type="text"
                      required
                      value={formData.emp_code}
                      onChange={(e) => setFormData({ ...formData, emp_code: e.target.value })}
                      placeholder="e.g. EMP005"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Vikram Malhotra"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Work Email (Login ID) *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="vikram@erp.local"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Portal Initial Password *</label>
                    <input
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Department *</label>
                    <select
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                    >
                      {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Designation *</label>
                    <input
                      type="text"
                      required
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      placeholder="e.g. Lead Backend Engineer"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Date of Joining *</label>
                    <input
                      type="date"
                      required
                      value={formData.doj}
                      onChange={(e) => setFormData({ ...formData, doj: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Contact Phone</label>
                    <input
                      type="text"
                      value={formData.contact}
                      onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                      placeholder="+91 98765 00000"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Bank Details */}
              <div className="pt-2 border-t border-slate-800">
                <h4 className="text-xs font-bold text-brand-400 uppercase tracking-wider mb-3">
                  2. Bank Information for Salary Payout
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={formData.bank_name}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                      placeholder="HDFC Bank"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Account Number</label>
                    <input
                      type="text"
                      value={formData.bank_account_no}
                      onChange={(e) => setFormData({ ...formData, bank_account_no: e.target.value })}
                      placeholder="501002345678"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">IFSC Code</label>
                    <input
                      type="text"
                      value={formData.ifsc}
                      onChange={(e) => setFormData({ ...formData, ifsc: e.target.value })}
                      placeholder="HDFC0001234"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Salary Structure */}
              <div className="pt-2 border-t border-slate-800">
                <h4 className="text-xs font-bold text-brand-400 uppercase tracking-wider mb-3">
                  3. Monthly Salary Structure (CTC Breakdown)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Basic Salary (₹)</label>
                    <input
                      type="number"
                      required
                      value={formData.basic}
                      onChange={(e) => setFormData({ ...formData, basic: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">House Rent Allowance - HRA (₹)</label>
                    <input
                      type="number"
                      required
                      value={formData.hra}
                      onChange={(e) => setFormData({ ...formData, hra: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Other Allowances (₹)</label>
                    <input
                      type="number"
                      required
                      value={formData.other_allowance}
                      onChange={(e) => setFormData({ ...formData, other_allowance: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500 font-mono"
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-6 text-xs text-slate-300">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.pf_applicable)}
                      onChange={(e) => setFormData({ ...formData, pf_applicable: e.target.checked ? 1 : 0 })}
                      className="rounded text-brand-500 focus:ring-0"
                    />
                    <span>Deduct EPF (12%)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.esi_applicable)}
                      onChange={(e) => setFormData({ ...formData, esi_applicable: e.target.checked ? 1 : 0 })}
                      className="rounded text-brand-500 focus:ring-0"
                    />
                    <span>Deduct ESI (0.75%)</span>
                  </label>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-600/30 flex items-center gap-2 transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>{addLoading ? 'Creating Record...' : 'Create Employee'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
