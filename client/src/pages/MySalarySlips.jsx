import React, { useState, useEffect } from 'react';
import { Download, FileText, Calendar, ShieldCheck } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function MySalarySlips() {
  const [slips, setSlips] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchSlips = async () => {
    try {
      setLoading(true);
      const res = await api.get('/payroll/my-slips');
      if (res.data?.success) {
        setSlips(res.data.slips);
      }
    } catch (err) {
      console.error('Failed to fetch slips:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlips();
  }, []);

  const handleDownloadSlip = async (detailId, month, year) => {
    try {
      const response = await api.get(`/payroll/slip/${detailId}/download`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `SalarySlip_${month}_${year}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to download payslip.');
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">My Salary Slips</h1>
        <p className="text-xs text-slate-400 mt-0.5">View and download your monthly compensation statements and tax breakdowns</p>
      </div>

      <div className="glass-panel rounded-2xl p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase">
                <th className="pb-3 pr-4">Salary Period</th>
                <th className="pb-3 px-3">Working Days</th>
                <th className="pb-3 px-3">Earned Gross</th>
                <th className="pb-3 px-3">EPF / ESI / Tax</th>
                <th className="pb-3 px-3">Net Salary Credited</th>
                <th className="pb-3 px-3">Payment Date</th>
                <th className="pb-3 pl-3 text-right">Download Payslip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {slips.map((slip) => {
                const statutoryDeds = (slip.pf_deduction || 0) + (slip.esi_deduction || 0) + (slip.tax_deduction || 0);
                return (
                  <tr key={slip.id} className="hover:bg-slate-800/30">
                    <td className="py-4 pr-4">
                      <p className="font-bold text-white text-sm">{monthNames[slip.month - 1]} {slip.year}</p>
                      <span className="text-[10px] text-emerald-400 font-semibold">Payment Status: {slip.payment_status}</span>
                    </td>
                    <td className="py-4 px-3 font-mono text-slate-300">
                      {slip.present_days + slip.half_days * 0.5} / {slip.working_days} Days
                    </td>
                    <td className="py-4 px-3 font-mono font-semibold text-slate-200">
                      ₹{Number(slip.earned_salary).toLocaleString('en-IN')}
                    </td>
                    <td className="py-4 px-3 font-mono text-rose-400">
                      -₹{Number(statutoryDeds).toLocaleString('en-IN')}
                    </td>
                    <td className="py-4 px-3 font-mono font-extrabold text-emerald-400 text-sm">
                      ₹{Number(slip.net_pay).toLocaleString('en-IN')}
                    </td>
                    <td className="py-4 px-3 font-mono text-slate-400">
                      {slip.payment_date || 'Processed'}
                    </td>
                    <td className="py-4 pl-3 text-right">
                      <button
                        onClick={() => handleDownloadSlip(slip.id, slip.month, slip.year)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-600/20 transition-all active:scale-95"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download PDF</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {slips.length === 0 && !loading && (
            <div className="text-center py-12 text-slate-500 text-xs">
              No salary slips issued yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
