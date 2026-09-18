import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Lock, 
  CheckCircle2, 
  Download, 
  FileSpreadsheet, 
  Edit2, 
  ArrowRight, 
  ShieldAlert,
  Play,
  X,
  Check,
  Building,
  CreditCard,
  AlertCircle
} from 'lucide-react';
import api from '../services/api';

export default function Payroll() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState(null);
  const [runDetails, setRunDetails] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Generate Draft Modal
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [draftMonth, setDraftMonth] = useState(new Date().getMonth() + 1);
  const [draftYear, setDraftYear] = useState(new Date().getFullYear());
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(null);

  // Edit Adjustment Modal
  const [editingDetail, setEditingDetail] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  // Mark as Paid Modal
  const [showPaidModal, setShowPaidModal] = useState(false);
  const [paymentMode, setPaymentMode] = useState('Bank Transfer');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [referenceNo, setReferenceNo] = useState('');
  const [payingLoading, setPayingLoading] = useState(false);

  const fetchRuns = async () => {
    try {
      setLoading(true);
      const res = await api.get('/payroll/runs');
      if (res.data?.success) {
        setRuns(res.data.runs);
      }
    } catch (err) {
      console.error('Failed to fetch payroll runs:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRunDetails = async (runId) => {
    try {
      setDetailsLoading(true);
      const res = await api.get(`/payroll/runs/${runId}`);
      if (res.data?.success) {
        setSelectedRun(res.data.run);
        setRunDetails(res.data.details);
      }
    } catch (err) {
      console.error('Failed to fetch run details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const handleGenerateDraft = async (e) => {
    e.preventDefault();
    try {
      setGenerating(true);
      setGenError(null);
      const res = await api.post('/payroll/generate-draft', {
        month: draftMonth,
        year: draftYear
      });
      if (res.data?.success) {
        setShowDraftModal(false);
        await fetchRuns();
        if (res.data.payrollRunId) {
          fetchRunDetails(res.data.payrollRunId);
        }
      }
    } catch (err) {
      setGenError(err.response?.data?.message || 'Failed to generate payroll draft.');
    } finally {
      setGenerating(false);
    }
  };

  const handleOpenEdit = (detail) => {
    setEditingDetail(detail);
    setEditFormData({
      earned_salary: detail.earned_salary,
      pf_deduction: detail.pf_deduction,
      esi_deduction: detail.esi_deduction,
      tax_deduction: detail.tax_deduction,
      advance_deduction: detail.advance_deduction,
      other_deductions: detail.other_deductions,
      remarks: detail.remarks || ''
    });
  };

  const handleSaveAdjustment = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/payroll/adjust/${editingDetail.id}`, editFormData);
      setEditingDetail(null);
      fetchRunDetails(selectedRun.id);
      fetchRuns();
    } catch (err) {
      alert('Failed to update payroll item');
    }
  };

  const handleFinalizeRun = async () => {
    if (!window.confirm('Are you sure you want to approve and lock this payroll? This will automatically deduct installments from staff advance balances and lock the numbers.')) return;
    try {
      const res = await api.post(`/payroll/finalize/${selectedRun.id}`);
      if (res.data?.success) {
        fetchRunDetails(selectedRun.id);
        fetchRuns();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to lock payroll');
    }
  };

  const handleMarkPaid = async (e) => {
    e.preventDefault();
    try {
      setPayingLoading(true);
      const res = await api.post(`/payroll/mark-paid/${selectedRun.id}`, {
        payment_date: paymentDate,
        payment_mode: paymentMode,
        reference_no: referenceNo
      });
      if (res.data?.success) {
        setShowPaidModal(false);
        fetchRunDetails(selectedRun.id);
        fetchRuns();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to mark payroll as paid');
    } finally {
      setPayingLoading(false);
    }
  };

  const handleDownloadSlip = async (detailId, empCode) => {
    try {
      const response = await api.get(`/payroll/slip/${detailId}/download`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `SalarySlip_${empCode}_${selectedRun.month}_${selectedRun.year}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to download salary slip');
    }
  };

  const handleExportExcel = () => {
    if (!selectedRun) return;
    window.open(`/api/reports/export/payroll/${selectedRun.id}`, '_blank');
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="space-y-6">
      {/* Title & Generate Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Payroll Processing Engine</h1>
          <p className="text-xs text-slate-400 mt-0.5">Automated gross salary calculations, attendance proration, statutory deductions & payslip generator</p>
        </div>

        <button
          onClick={() => setShowDraftModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-600/30 transition-all active:scale-95"
        >
          <Play className="w-4 h-4 fill-white" />
          <span>Generate Monthly Payroll</span>
        </button>
      </div>

      {/* Payroll Runs History Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {runs.map((run) => (
          <div
            key={run.id}
            onClick={() => fetchRunDetails(run.id)}
            className={`glass-panel rounded-2xl p-5 cursor-pointer transition-all border ${
              selectedRun?.id === run.id
                ? 'border-brand-500 shadow-xl shadow-brand-500/10 bg-slate-850'
                : 'border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                {monthNames[run.month - 1]} {run.year}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                run.status === 'paid'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : run.status === 'finalized'
                  ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}>
                {run.status}
              </span>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Total Net Payout:</span>
                <span className="font-bold text-white font-mono">₹{Number(run.total_net || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Headcount:</span>
                <span className="text-slate-300">{run.employee_count || 0} Staff</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Selected Payroll Details Screen */}
      {selectedRun && (
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-slate-800">
          {/* Run Header Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-white">
                  Payroll Processing: {monthNames[selectedRun.month - 1]} {selectedRun.year}
                </h2>
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase border ${
                  selectedRun.status === 'paid'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : selectedRun.status === 'finalized'
                    ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}>
                  Status: {selectedRun.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Formula: Earned = (Basic+HRA+Allowances)/Days * (Present + 0.5*Half) | Net = Earned - (PF + ESI + PT + Advance + Penalties)
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition-all"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Excel</span>
              </button>

              {selectedRun.status === 'draft' && (
                <button
                  onClick={handleFinalizeRun}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all"
                >
                  <Lock className="w-4 h-4" />
                  <span>Approve & Lock Run</span>
                </button>
              )}

              {selectedRun.status === 'finalized' && (
                <button
                  onClick={() => setShowPaidModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Mark All Paid & Release Slips</span>
                </button>
              )}
            </div>
          </div>

          {/* Payroll Run Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase">
                  <th className="pb-3 pr-3">Employee</th>
                  <th className="pb-3 px-2">Days / Attd</th>
                  <th className="pb-3 px-2">Gross Earned</th>
                  <th className="pb-3 px-2">EPF (12%)</th>
                  <th className="pb-3 px-2">ESI</th>
                  <th className="pb-3 px-2">Prof Tax</th>
                  <th className="pb-3 px-2">Advance EMI</th>
                  <th className="pb-3 px-2">Net Payout</th>
                  <th className="pb-3 px-2">Status</th>
                  <th className="pb-3 pl-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {runDetails.map((detail) => (
                  <tr key={detail.id} className="hover:bg-slate-800/30">
                    <td className="py-3.5 pr-3">
                      <p className="font-bold text-white">{detail.employee_name}</p>
                      <p className="text-[11px] text-slate-400">{detail.emp_code} • {detail.department}</p>
                    </td>
                    <td className="py-3.5 px-2 font-mono text-slate-300">
                      {detail.present_days + detail.half_days * 0.5} / {detail.working_days}d
                    </td>
                    <td className="py-3.5 px-2 font-mono font-semibold text-white">
                      ₹{Number(detail.earned_salary).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-2 font-mono text-rose-400">
                      ₹{Number(detail.pf_deduction).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-2 font-mono text-rose-400">
                      ₹{Number(detail.esi_deduction).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-2 font-mono text-rose-400">
                      ₹{Number(detail.tax_deduction).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-2 font-mono text-amber-400">
                      ₹{Number(detail.advance_deduction).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-2 font-mono font-extrabold text-emerald-400">
                      ₹{Number(detail.net_pay).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        detail.payment_status === 'Paid'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {detail.payment_status}
                      </span>
                    </td>
                    <td className="py-3.5 pl-2 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {selectedRun.status === 'draft' && (
                          <button
                            onClick={() => handleOpenEdit(detail)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-400 hover:bg-slate-800"
                            title="Adjust Numbers"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDownloadSlip(detail.id, detail.emp_code)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800"
                          title="Download Payslip PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 1. Generate Draft Modal */}
      {showDraftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-850">
              <h3 className="font-bold text-white text-base">Generate Monthly Payroll Run</h3>
              <button onClick={() => setShowDraftModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGenerateDraft} className="p-6 space-y-4">
              {genError && (
                <div className="p-3 rounded-xl text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{genError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Select Month</label>
                  <select
                    value={draftMonth}
                    onChange={(e) => setDraftMonth(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    {monthNames.map((m, idx) => (
                      <option key={m} value={idx + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Select Year</label>
                  <select
                    value={draftYear}
                    onChange={(e) => setDraftYear(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    {[2025, 2026, 2027].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <p>⚡ Auto-pulls attendance logs to compute earned gross.</p>
                <p>⚡ Deducts 12% PF, 0.75% ESI, ₹200 PT, and active advance EMIs.</p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDraftModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating}
                  className="px-5 py-2 text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white rounded-xl shadow-lg shadow-brand-600/30"
                >
                  {generating ? 'Processing Engine...' : 'Run Calculations'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Adjust Item Modal */}
      {editingDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-850">
              <h3 className="font-bold text-white text-base">Adjust Payroll: {editingDetail.employee_name}</h3>
              <button onClick={() => setEditingDetail(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Earned Gross Salary (₹)</label>
                  <input
                    type="number"
                    value={editFormData.earned_salary}
                    onChange={(e) => setEditFormData({ ...editFormData, earned_salary: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">EPF Deduction (₹)</label>
                  <input
                    type="number"
                    value={editFormData.pf_deduction}
                    onChange={(e) => setEditFormData({ ...editFormData, pf_deduction: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">ESI Deduction (₹)</label>
                  <input
                    type="number"
                    value={editFormData.esi_deduction}
                    onChange={(e) => setEditFormData({ ...editFormData, esi_deduction: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Professional Tax (₹)</label>
                  <input
                    type="number"
                    value={editFormData.tax_deduction}
                    onChange={(e) => setEditFormData({ ...editFormData, tax_deduction: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Advance EMI Deduction (₹)</label>
                  <input
                    type="number"
                    value={editFormData.advance_deduction}
                    onChange={(e) => setEditFormData({ ...editFormData, advance_deduction: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Other Penalties / Arrears (₹)</label>
                  <input
                    type="number"
                    value={editFormData.other_deductions}
                    onChange={(e) => setEditFormData({ ...editFormData, other_deductions: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Adjustment Remark / Reason</label>
                <textarea
                  rows={2}
                  value={editFormData.remarks}
                  onChange={(e) => setEditFormData({ ...editFormData, remarks: e.target.value })}
                  placeholder="e.g. Added performance incentive or manual penalty adjustment"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditingDetail(null)} className="px-4 py-2 text-slate-400 font-semibold">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl">
                  Update Numbers
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Mark as Paid Modal */}
      {showPaidModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-850">
              <h3 className="font-bold text-white text-base">Release Salary Payment</h3>
              <button onClick={() => setShowPaidModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleMarkPaid} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  <option value="Bank Transfer">Direct Bank Transfer (NEFT/RTGS/IMPS)</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Disbursement Date</label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Bank Reference / UTR Number</label>
                <input
                  type="text"
                  placeholder="e.g. UTR-HDFC-9918237492"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowPaidModal(false)} className="px-4 py-2 text-slate-400">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={payingLoading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 font-bold text-white rounded-xl"
                >
                  {payingLoading ? 'Releasing...' : 'Confirm & Release'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
