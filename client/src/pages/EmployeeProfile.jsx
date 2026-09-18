import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  User, 
  Calendar, 
  IndianRupee, 
  CreditCard, 
  FileText, 
  Download, 
  ArrowLeft,
  Building,
  Mail,
  Phone,
  MapPin,
  Shield,
  Upload,
  Check,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function EmployeeProfile() {
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  // If viewing own profile without ID in param, use user's employee_id
  const targetEmployeeId = id || user?.employee_id;

  const [activeTab, setActiveTab] = useState('overview');
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Attendance Tab State
  const [attendMonth, setAttendMonth] = useState(new Date().getMonth() + 1);
  const [attendYear, setAttendYear] = useState(new Date().getFullYear());
  const [attendanceData, setAttendanceData] = useState(null);
  const [attendLoading, setAttendLoading] = useState(false);

  // Upload Doc State
  const [docType, setDocType] = useState('Offer Letter');
  const [docName, setDocName] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const fetchProfile = async () => {
    if (!targetEmployeeId) return;
    try {
      setLoading(true);
      const res = await api.get(`/employees/${targetEmployeeId}`);
      if (res.data?.success) {
        setProfileData(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceMonth = async () => {
    if (!targetEmployeeId) return;
    try {
      setAttendLoading(true);
      const res = await api.get(`/attendance/calendar/${targetEmployeeId}`, {
        params: { month: attendMonth, year: attendYear }
      });
      if (res.data?.success) {
        setAttendanceData(res.data);
      }
    } catch (err) {
      console.error('Failed to load attendance calendar:', err);
    } finally {
      setAttendLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [targetEmployeeId]);

  useEffect(() => {
    if (activeTab === 'attendance') {
      fetchAttendanceMonth();
    }
  }, [activeTab, attendMonth, attendYear]);

  const handleDownloadSlip = async (detailId, month, year) => {
    try {
      const response = await api.get(`/payroll/slip/${detailId}/download`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `SalarySlip_${profileData?.employee?.emp_code}_${month}_${year}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to download salary slip');
    }
  };

  const handleAddDocument = async (e) => {
    e.preventDefault();
    if (!docName || !docUrl) return;
    try {
      setUploadingDoc(true);
      await api.post(`/employees/${targetEmployeeId}/documents`, {
        doc_type: docType,
        file_name: docName,
        file_url: docUrl
      });
      setDocName('');
      setDocUrl('');
      fetchProfile();
    } catch (err) {
      alert('Failed to attach document');
    } finally {
      setUploadingDoc(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400 text-xs">Loading employee profile...</div>;
  }

  if (error || !profileData) {
    return (
      <div className="p-8 text-center">
        <p className="text-rose-400 text-sm mb-4">{error || 'Employee not found'}</p>
        <button onClick={() => navigate('/employees')} className="px-4 py-2 bg-slate-800 rounded-xl text-xs text-white">
          Back to Employees
        </button>
      </div>
    );
  }

  const { employee, salaryStructure, documents, advances, payrollHistory } = profileData;

  const tabs = [
    { id: 'overview', label: 'Overview & Bank Details', icon: User },
    { id: 'attendance', label: 'Attendance Calendar', icon: Calendar },
    { id: 'salary', label: 'Salary & Payslips', icon: IndianRupee },
    { id: 'advances', label: 'Advance Ledger', icon: CreditCard },
    { id: 'documents', label: 'Documents', icon: FileText },
  ];

  return (
    <div className="space-y-6">
      {/* Back Button (if Admin) */}
      {isAdmin && (
        <button
          onClick={() => navigate('/employees')}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Employee Directory</span>
        </button>
      )}

      {/* Hero Profile Banner */}
      <div className="glass-panel rounded-3xl p-5 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 border border-slate-800">
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-slate-800 border-2 border-brand-500/40 overflow-hidden flex items-center justify-center shrink-0 shadow-xl">
            {employee.avatar_url ? (
              <img src={employee.avatar_url} alt={employee.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl sm:text-2xl font-bold text-brand-400">{employee.name.charAt(0)}</span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-2xl font-extrabold text-white tracking-tight">{employee.name}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                employee.status === 'Active' 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : 'bg-slate-700/40 text-slate-400 border-slate-700'
              }`}>
                {employee.status}
              </span>
            </div>
            <p className="text-xs text-brand-400 font-semibold mt-0.5">{employee.designation} • {employee.department}</p>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-1 flex items-center gap-3 flex-wrap">
              <span>Emp Code: <strong className="text-white font-mono">{employee.emp_code}</strong></span>
              <span>Joined: <strong className="text-slate-300">{employee.doj}</strong></span>
            </p>
          </div>
        </div>

        {/* Quick Gross CTC badge */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 w-full sm:w-auto text-left sm:text-right min-w-[160px]">
          <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Gross Monthly CTC</p>
          <p className="text-xl font-extrabold text-emerald-400 font-mono mt-0.5">
            ₹{((salaryStructure?.basic || 0) + (salaryStructure?.hra || 0) + (salaryStructure?.other_allowance || 0)).toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">₹{(((salaryStructure?.basic || 0) + (salaryStructure?.hra || 0) + (salaryStructure?.other_allowance || 0)) * 12).toLocaleString('en-IN')} Annual</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto no-scrollbar scroll-smooth -mx-2 px-2 sm:mx-0 sm:px-0">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                activeTab === t.id
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview & Bank Details */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Info */}
          <div className="glass-panel rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-white text-sm uppercase tracking-wider text-brand-400">
              Personal & Contact Information
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-slate-400 font-medium">Date of Birth</p>
                <p className="text-white font-semibold mt-0.5">{employee.dob || '—'}</p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Gender</p>
                <p className="text-white font-semibold mt-0.5">{employee.gender || '—'}</p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Contact Phone</p>
                <p className="text-white font-semibold mt-0.5">{employee.contact || '—'}</p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Emergency Contact</p>
                <p className="text-white font-semibold mt-0.5">{employee.emergency_contact || '—'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-slate-400 font-medium">Residential Address</p>
                <p className="text-white font-semibold mt-0.5">{employee.address || '—'}</p>
              </div>
            </div>
          </div>

          {/* Bank & Payment Info */}
          <div className="glass-panel rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-white text-sm uppercase tracking-wider text-brand-400">
              Bank Details (For Salary Transfer)
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-slate-400 font-medium">Bank Name</p>
                <p className="text-white font-semibold mt-0.5">{employee.bank_name || '—'}</p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Account Number</p>
                <p className="text-white font-mono font-semibold mt-0.5">{employee.bank_account_no || '—'}</p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">IFSC Code</p>
                <p className="text-white font-mono font-semibold mt-0.5">{employee.ifsc || '—'}</p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Employment Type</p>
                <p className="text-white font-semibold mt-0.5">{employee.employment_type || 'Full-time'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Attendance Calendar */}
      {activeTab === 'attendance' && (
        <div className="glass-panel rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-white text-base tracking-tight">Monthly Attendance Record</h3>
              <p className="text-xs text-slate-400">Day-by-day punch log and working hours</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={attendMonth}
                onChange={(e) => setAttendMonth(Number(e.target.value))}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                {[
                  'January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'
                ].map((m, idx) => <option key={m} value={idx + 1}>{m}</option>)}
              </select>
              <select
                value={attendYear}
                onChange={(e) => setAttendYear(Number(e.target.value))}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* Monthly Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <p className="text-[11px] text-slate-400 uppercase font-semibold">Present Days</p>
              <p className="text-xl font-bold text-emerald-400 mt-1">{attendanceData?.summary?.presentDays || 0}</p>
            </div>
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <p className="text-[11px] text-slate-400 uppercase font-semibold">Half Days</p>
              <p className="text-xl font-bold text-amber-400 mt-1">{attendanceData?.summary?.halfDays || 0}</p>
            </div>
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <p className="text-[11px] text-slate-400 uppercase font-semibold">Absent Days</p>
              <p className="text-xl font-bold text-rose-400 mt-1">{attendanceData?.summary?.absentDays || 0}</p>
            </div>
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <p className="text-[11px] text-slate-400 uppercase font-semibold">Payable Days (Effective)</p>
              <p className="text-xl font-bold text-brand-400 mt-1">{attendanceData?.summary?.effectivePresent || 0}</p>
            </div>
          </div>

          {/* Attendance Log Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase">
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 px-3">Punch In</th>
                  <th className="pb-3 px-3">Punch Out</th>
                  <th className="pb-3 px-3">Total Worked</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 pl-3">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {attendanceData?.logs?.map((log, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30">
                    <td className="py-3 pr-4 font-mono text-white font-semibold">{log.date}</td>
                    <td className="py-3 px-3 font-mono text-slate-300">{log.punch_in_time || '—'}</td>
                    <td className="py-3 px-3 font-mono text-slate-300">{log.punch_out_time || '—'}</td>
                    <td className="py-3 px-3 font-mono text-slate-300">{log.total_hours ? `${log.total_hours}h` : '—'}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        log.status === 'Present'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : log.status === 'Half Day'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3 pl-3 text-slate-400 italic">{log.remarks || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!attendanceData?.logs || attendanceData.logs.length === 0) && (
              <p className="text-center py-8 text-slate-500 text-xs">No attendance logs found for this period.</p>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Salary & Payslips */}
      {activeTab === 'salary' && (
        <div className="space-y-6">
          {/* Salary Breakdown Cards */}
          <div className="glass-panel rounded-2xl p-6">
            <h3 className="font-bold text-white text-base tracking-tight mb-4">Current Salary Structure</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <p className="text-slate-400 font-semibold">Basic Pay</p>
                <p className="text-lg font-bold text-white font-mono mt-1">₹{Number(salaryStructure?.basic || 0).toLocaleString('en-IN')}</p>
                <p className="text-[10px] text-slate-500 mt-1">50% of monthly CTC base</p>
              </div>
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <p className="text-slate-400 font-semibold">House Rent Allowance (HRA)</p>
                <p className="text-lg font-bold text-white font-mono mt-1">₹{Number(salaryStructure?.hra || 0).toLocaleString('en-IN')}</p>
                <p className="text-[10px] text-slate-500 mt-1">Tax exempt accommodation allowance</p>
              </div>
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <p className="text-slate-400 font-semibold">Special & Other Allowances</p>
                <p className="text-lg font-bold text-white font-mono mt-1">₹{Number(salaryStructure?.other_allowance || 0).toLocaleString('en-IN')}</p>
                <p className="text-[10px] text-slate-500 mt-1">Flexible compensation benefit</p>
              </div>
            </div>
          </div>

          {/* Salary Slips History Table */}
          <div className="glass-panel rounded-2xl p-6">
            <h3 className="font-bold text-white text-base tracking-tight mb-4">Salary History & Slips</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase">
                    <th className="pb-3 pr-4">Month & Year</th>
                    <th className="pb-3 px-3">Working Days</th>
                    <th className="pb-3 px-3">Gross Earned</th>
                    <th className="pb-3 px-3">Total Deductions</th>
                    <th className="pb-3 px-3">Net Pay</th>
                    <th className="pb-3 px-3">Status</th>
                    <th className="pb-3 pl-3 text-right">Download PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {payrollHistory?.map((item) => {
                    const totalDeds = (item.pf_deduction || 0) + (item.esi_deduction || 0) + (item.tax_deduction || 0) + (item.advance_deduction || 0) + (item.other_deductions || 0);
                    return (
                      <tr key={item.id} className="hover:bg-slate-800/30">
                        <td className="py-3.5 pr-4 font-bold text-white">
                          Month {item.month} / {item.year}
                        </td>
                        <td className="py-3.5 px-3 font-mono text-slate-300">{item.working_days} Days</td>
                        <td className="py-3.5 px-3 font-mono text-slate-200">₹{Number(item.earned_salary).toLocaleString('en-IN')}</td>
                        <td className="py-3.5 px-3 font-mono text-rose-400">₹{Number(totalDeds).toLocaleString('en-IN')}</td>
                        <td className="py-3.5 px-3 font-mono font-bold text-emerald-400">₹{Number(item.net_pay).toLocaleString('en-IN')}</td>
                        <td className="py-3.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            item.payment_status === 'Paid'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            {item.payment_status || 'Pending'}
                          </span>
                        </td>
                        <td className="py-3.5 pl-3 text-right">
                          <button
                            onClick={() => handleDownloadSlip(item.id, item.month, item.year)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/30 transition-all"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Payslip PDF</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {(!payrollHistory || payrollHistory.length === 0) && (
                <p className="text-center py-8 text-slate-500 text-xs">No payroll history recorded yet for this employee.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Advance Ledger */}
      {activeTab === 'advances' && (
        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-base tracking-tight">Staff Advances & Loan Ledger</h3>
              <p className="text-xs text-slate-400">Track company loans, monthly EMI deductions, and balance remaining</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase">
                  <th className="pb-3 pr-4">Date Given</th>
                  <th className="pb-3 px-3">Sanctioned Amount</th>
                  <th className="pb-3 px-3">Monthly Deduction</th>
                  <th className="pb-3 px-3">Remaining Balance</th>
                  <th className="pb-3 px-3">Reason</th>
                  <th className="pb-3 px-3">Approved By</th>
                  <th className="pb-3 pl-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {advances?.map((adv) => (
                  <tr key={adv.id} className="hover:bg-slate-800/30">
                    <td className="py-3.5 pr-4 font-mono text-white">{adv.date_given}</td>
                    <td className="py-3.5 px-3 font-mono font-bold text-white">₹{Number(adv.amount).toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-3 font-mono text-amber-400">₹{Number(adv.monthly_deduction).toLocaleString('en-IN')}/mo</td>
                    <td className="py-3.5 px-3 font-mono font-bold text-rose-400">₹{Number(adv.balance_remaining).toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-3 text-slate-300">{adv.reason || 'Staff Advance'}</td>
                    <td className="py-3.5 px-3 text-slate-400">{adv.approved_by || 'Admin'}</td>
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
            {(!advances || advances.length === 0) && (
              <p className="text-center py-8 text-slate-500 text-xs">No advance or loan records on file.</p>
            )}
          </div>
        </div>
      )}

      {/* Tab 5: Documents */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          {/* Document list */}
          <div className="glass-panel rounded-2xl p-6">
            <h3 className="font-bold text-white text-base tracking-tight mb-4">Attached Verification Documents</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {documents?.map((doc) => (
                <div key={doc.id} className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-6 h-6 text-brand-400" />
                    <div>
                      <p className="text-xs font-bold text-white">{doc.doc_type}</p>
                      <p className="text-[11px] text-slate-400 truncate max-w-[150px]">{doc.file_name}</p>
                    </div>
                  </div>
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                  >
                    View
                  </a>
                </div>
              ))}
              {(!documents || documents.length === 0) && (
                <div className="col-span-full text-center py-8 text-slate-500 text-xs">
                  No documents attached yet.
                </div>
              )}
            </div>
          </div>

          {/* Upload New Document Form (Admin only) */}
          {isAdmin && (
            <div className="glass-panel rounded-2xl p-6">
              <h3 className="font-bold text-white text-base tracking-tight mb-4">Upload / Attach Document</h3>
              <form onSubmit={handleAddDocument} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Document Category</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="Offer Letter">Offer Letter</option>
                    <option value="Aadhaar / National ID">Aadhaar / National ID</option>
                    <option value="PAN Card">PAN Card</option>
                    <option value="Resume / CV">Resume / CV</option>
                    <option value="Educational Certificate">Educational Certificate</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Document Name / Title</label>
                  <input
                    type="text"
                    required
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    placeholder="e.g. Aadhaar_Verified.pdf"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">File URL / Storage Link</label>
                  <input
                    type="text"
                    required
                    value={docUrl}
                    onChange={(e) => setDocUrl(e.target.value)}
                    placeholder="https://... or /uploads/doc.pdf"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div className="sm:col-span-3 flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={uploadingDoc}
                    className="px-5 py-2 bg-brand-600 hover:bg-brand-500 rounded-xl font-bold text-white flex items-center gap-2"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingDoc ? 'Attaching...' : 'Attach Document'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
