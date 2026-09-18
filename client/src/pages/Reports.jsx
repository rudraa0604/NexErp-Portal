import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  ShieldCheck, 
  Download, 
  FileSpreadsheet, 
  Filter, 
  Building2, 
  PieChart as PieIcon
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import api from '../services/api';

export default function Reports() {
  const [activeReport, setActiveReport] = useState('payroll');
  const [payrollSummary, setPayrollSummary] = useState([]);
  const [deptCosts, setDeptCosts] = useState([]);
  const [statutoryData, setStatutoryData] = useState([]);
  const [advanceReport, setAdvanceReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const [pRes, sRes, aRes] = await Promise.all([
        api.get('/reports/payroll-summary'),
        api.get('/reports/statutory'),
        api.get('/reports/advances')
      ]);

      if (pRes.data?.success) {
        setPayrollSummary(pRes.data.summary);
        setDeptCosts(pRes.data.deptCosts);
      }
      if (sRes.data?.success) {
        setStatutoryData(sRes.data.complianceData);
      }
      if (aRes.data?.success) {
        setAdvanceReport(aRes.data);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Financial & Statutory Compliance Reports</h1>
        <p className="text-xs text-slate-400 mt-0.5">Audited cost summaries, EPF/ESI statutory registers, and departmental expenditure</p>
      </div>

      {/* Report Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto no-scrollbar scroll-smooth -mx-2 px-2 sm:mx-0 sm:px-0">
        <button
          onClick={() => setActiveReport('payroll')}
          className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
            activeReport === 'payroll'
              ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          Monthly Payroll Summary
        </button>
        <button
          onClick={() => setActiveReport('statutory')}
          className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
            activeReport === 'statutory'
              ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          Statutory Compliance (EPF & ESI)
        </button>
        <button
          onClick={() => setActiveReport('advances')}
          className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
            activeReport === 'advances'
              ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          Staff Loan Recovery Ledger
        </button>
      </div>

      {/* Report 1: Monthly Payroll Summary */}
      {activeReport === 'payroll' && (
        <div className="space-y-6">
          {/* Department Cost Chart */}
          <div className="glass-panel rounded-2xl p-6">
            <h3 className="font-bold text-white text-base tracking-tight mb-4">Department-wise CTC Cost Distribution</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptCosts}>
                  <XAxis dataKey="department" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(val) => `₹${val/1000}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(val) => `₹${Number(val).toLocaleString('en-IN')}`}
                  />
                  <Legend />
                  <Bar dataKey="dept_gross" fill="#0ea5e9" name="Gross Earned Cost" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="dept_net" fill="#10b981" name="Net Disbursed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table */}
          <div className="glass-panel rounded-2xl p-6">
            <h3 className="font-bold text-white text-base tracking-tight mb-4">Payroll Run Financial Summaries</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase">
                    <th className="pb-3 pr-4">Month / Year</th>
                    <th className="pb-3 px-3">Headcount</th>
                    <th className="pb-3 px-3">Total Gross</th>
                    <th className="pb-3 px-3">Total Deductions</th>
                    <th className="pb-3 px-3">Total Net Disbursed</th>
                    <th className="pb-3 pl-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {payrollSummary.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-800/30">
                      <td className="py-3.5 pr-4 font-bold text-white">
                        {monthNames[row.month - 1]} {row.year}
                      </td>
                      <td className="py-3.5 px-3 font-mono text-slate-300">{row.headcount} Staff</td>
                      <td className="py-3.5 px-3 font-mono text-slate-200">₹{Number(row.total_gross || 0).toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-3 font-mono text-rose-400">₹{Number(row.total_pf + row.total_esi + row.total_tax + row.total_advance_deductions).toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-3 font-mono font-bold text-emerald-400">₹{Number(row.total_net_payout || 0).toLocaleString('en-IN')}</td>
                      <td className="py-3.5 pl-3 text-right">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase bg-slate-800 text-slate-300 border-slate-700">
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Report 2: Statutory Compliance */}
      {activeReport === 'statutory' && (
        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-base tracking-tight">EPF & ESI Statutory Compliance Register</h3>
              <p className="text-xs text-slate-400">Standard 12% Employee + 12% Employer EPF and 0.75% + 3.25% ESI filing obligations</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase">
                  <th className="pb-3 pr-4">Month</th>
                  <th className="pb-3 px-3">Basic Wages Pool</th>
                  <th className="pb-3 px-3">Employee PF (12%)</th>
                  <th className="pb-3 px-3">Employer PF (12%)</th>
                  <th className="pb-3 px-3">Total PF Deposit</th>
                  <th className="pb-3 px-3">ESI Total</th>
                  <th className="pb-3 pl-3 text-right">Prof Tax (PT)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {statutoryData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30">
                    <td className="py-3.5 pr-4 font-bold text-white">{monthNames[row.month - 1]} {row.year}</td>
                    <td className="py-3.5 px-3 font-mono text-slate-300">₹{Number(row.total_basic_wages || 0).toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-3 font-mono text-amber-400">₹{Number(row.employee_pf || 0).toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-3 font-mono text-amber-400">₹{Number(row.employer_pf || 0).toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-3 font-mono font-bold text-brand-400">₹{Number(row.total_pf_deposit || 0).toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-3 font-mono text-rose-400">₹{Number(row.employee_esi + row.employer_esi).toLocaleString('en-IN')}</td>
                    <td className="py-3.5 pl-3 font-mono text-slate-200 text-right">₹{Number(row.professional_tax || 0).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {statutoryData.length === 0 && (
              <p className="text-center py-8 text-slate-500 text-xs">No finalized payroll runs found for statutory calculations.</p>
            )}
          </div>
        </div>
      )}

      {/* Report 3: Staff Loan Recovery */}
      {activeReport === 'advances' && (
        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-white text-base tracking-tight">Staff Advance Portfolio Summary</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <p className="text-xs text-slate-400 font-semibold">Total Loans Issued</p>
              <p className="text-xl font-bold text-white font-mono mt-1">₹{Number(advanceReport?.totalIssued || 0).toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <p className="text-xs text-slate-400 font-semibold">Total Recovered</p>
              <p className="text-xl font-bold text-emerald-400 font-mono mt-1">₹{Number(advanceReport?.totalRecovered || 0).toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <p className="text-xs text-slate-400 font-semibold">Total Outstanding</p>
              <p className="text-xl font-bold text-rose-400 font-mono mt-1">₹{Number(advanceReport?.totalOutstanding || 0).toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
