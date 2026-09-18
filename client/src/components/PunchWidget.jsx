import React, { useState, useEffect } from 'react';
import { 
  Fingerprint, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  MapPin, 
  Coffee, 
  X, 
  Check, 
  Calendar,
  FileText
} from 'lucide-react';
import api from '../services/api';

export default function PunchWidget({ onPunchComplete }) {
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);
  const [elapsedTime, setElapsedTime] = useState('00h 00m 00s');
  const [message, setMessage] = useState(null);

  // Half-Day Modal & Form State
  const [showHalfDayModal, setShowHalfDayModal] = useState(false);
  const [halfType, setHalfType] = useState('Second Half');
  const [halfReason, setHalfReason] = useState('');
  const [halfLoading, setHalfLoading] = useState(false);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await api.get('/attendance/my-status');
      if (res.data?.success) {
        setStatusData(res.data);
      }
    } catch (err) {
      console.error('Failed to load status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Live timer if punched in
  useEffect(() => {
    if (!statusData?.log?.punch_in_time || statusData?.log?.punch_out_time) {
      if (statusData?.log?.punch_out_time) {
        setElapsedTime(`${statusData.log.total_hours || 0} hrs (${statusData.log.status || 'Finished'})`);
      } else if (statusData?.log?.status === 'Half Day') {
        setElapsedTime(`4.0 hrs (Half Day)`);
      }
      return;
    }

    const calculateElapsed = () => {
      const punchInStr = statusData.log.punch_in_time;
      const [h, m, s] = punchInStr.split(':').map(Number);
      const now = new Date();
      const punchInDate = new Date();
      punchInDate.setHours(h, m, s || 0, 0);

      let diff = Math.max(0, Math.floor((now - punchInDate) / 1000));
      const hours = String(Math.floor(diff / 3600)).padStart(2, '0');
      diff %= 3600;
      const minutes = String(Math.floor(diff / 60)).padStart(2, '0');
      const seconds = String(diff % 60).padStart(2, '0');

      setElapsedTime(`${hours}h ${minutes}m ${seconds}s`);
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 1000);
    return () => clearInterval(interval);
  }, [statusData]);

  const handlePunch = async () => {
    try {
      setPunching(true);
      setMessage(null);

      let coords = { lat: null, lng: null };
      if (navigator.geolocation) {
        try {
          const pos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
          });
          coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        } catch (e) {
          // Geolocation optional fallback
        }
      }

      const res = await api.post('/attendance/punch', coords);
      if (res.data?.success) {
        setMessage({ type: 'success', text: res.data.message });
        await fetchStatus();
        if (onPunchComplete) onPunchComplete();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to process punch.' });
    } finally {
      setPunching(false);
    }
  };

  const handleApplyHalfDay = async (e) => {
    e.preventDefault();
    if (!halfReason.trim()) {
      setMessage({ type: 'error', text: 'Please enter a valid reason for taking Half Day.' });
      return;
    }

    try {
      setHalfLoading(true);
      const res = await api.post('/attendance/half-day', {
        half_type: halfType,
        reason: halfReason.trim()
      });

      if (res.data?.success) {
        setMessage({ type: 'success', text: res.data.message });
        setShowHalfDayModal(false);
        setHalfReason('');
        await fetchStatus();
        if (onPunchComplete) onPunchComplete();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to submit Half Day.' });
    } finally {
      setHalfLoading(false);
    }
  };

  const isHalfDay = statusData?.log?.status === 'Half Day';
  const isPunchedIn = Boolean(statusData?.log?.punch_in_time && !statusData?.log?.punch_out_time && !isHalfDay);
  const isFinished = Boolean(statusData?.log?.punch_in_time && statusData?.log?.punch_out_time) || isHalfDay;

  return (
    <>
      {/* Punch Widget Card */}
      <div className="glass-panel rounded-2xl p-6 relative overflow-hidden">
        {/* Background subtle glow */}
        <div className={`absolute -top-12 -right-12 w-36 h-36 rounded-full blur-3xl opacity-20 ${
          isHalfDay ? 'bg-amber-500' : isPunchedIn ? 'bg-emerald-500' : isFinished ? 'bg-indigo-500' : 'bg-brand-500'
        }`} />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={`w-2.5 h-2.5 rounded-full ${
                isHalfDay 
                  ? 'bg-amber-400'
                  : isPunchedIn 
                  ? 'bg-emerald-400 animate-pulse' 
                  : isFinished 
                  ? 'bg-indigo-400' 
                  : 'bg-slate-400'
              }`} />
              <h3 className="font-bold text-white text-base tracking-tight">Today's Attendance Punch</h3>
              
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                isHalfDay
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  : isPunchedIn 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : isFinished
                  ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                  : 'bg-slate-700/40 text-slate-300 border-slate-700'
              }`}>
                {isHalfDay ? 'HALF DAY APPLIED' : isPunchedIn ? 'ACTIVE SESSION' : isFinished ? 'COMPLETED' : 'NOT PUNCHED'}
              </span>
            </div>

            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-brand-400" />
              <span>Shift hours: 09:30 AM - 06:00 PM (8.0 hrs standard • 4.0 hrs half day)</span>
            </p>

            {/* If remarks exist, show them */}
            {statusData?.log?.remarks && (
              <p className="text-[11px] text-amber-300/90 font-medium mt-1.5 flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg w-fit">
                <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Note: {statusData.log.remarks}</span>
              </p>
            )}
          </div>

          {/* Action Controls & Live Timer */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-2.5 flex items-center gap-3 flex-wrap sm:flex-nowrap">
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
                {isHalfDay ? 'Session Type' : isPunchedIn ? 'Working Since ' + statusData.log.punch_in_time : isFinished ? 'Total Duration' : 'Status'}
              </p>
              <p className="text-sm font-bold text-white font-mono tracking-tight">{elapsedTime}</p>
            </div>

            <div className="flex items-center gap-2">
              {/* Standard Punch Button */}
              <button
                onClick={handlePunch}
                disabled={punching || (isFinished && !isPunchedIn) || !statusData?.hasEmployeeRecord}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 ${
                  isFinished && !isPunchedIn
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    : isPunchedIn
                    ? 'bg-gradient-to-r from-rose-500 to-amber-600 hover:from-rose-600 hover:to-amber-700 text-white shadow-rose-500/20 active:scale-95'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-emerald-500/20 active:scale-95'
                }`}
              >
                <Fingerprint className={`w-4 h-4 ${punching ? 'animate-spin' : ''}`} />
                <span>
                  {punching ? 'Recording...' : isFinished && !isPunchedIn ? 'Punched Out' : isPunchedIn ? 'Punch Out' : 'Punch In Now'}
                </span>
              </button>

              {/* Take Half Day Button */}
              {!isHalfDay && (
                <button
                  type="button"
                  onClick={() => setShowHalfDayModal(true)}
                  disabled={halfLoading || !statusData?.hasEmployeeRecord}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
                  title="Mark Half Day with Reason"
                >
                  <Coffee className="w-3.5 h-3.5" />
                  <span>Take Half Day</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {message && (
          <div className={`mt-3 p-2.5 rounded-lg text-xs flex items-center gap-2 border ${
            message.type === 'success' 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}
      </div>

      {/* Full-Screen Centered Half Day Request Modal */}
      {showHalfDayModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-850">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <Coffee className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Apply for Half Day</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Record 0.5 payable attendance with mandatory reason</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHalfDayModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleApplyHalfDay} className="p-6 space-y-5">
              {/* Slot selector */}
              <div>
                <label className="block text-slate-300 font-semibold mb-2 uppercase tracking-wider text-xs">
                  1. Select Half Day Slot
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'First Half', label: 'First Half (Morning)', desc: 'Leave during 09:30 AM - 01:30 PM' },
                    { id: 'Second Half', label: 'Second Half (Afternoon)', desc: 'Leave during 02:00 PM - 06:00 PM' }
                  ].map((slot) => (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => setHalfType(slot.id)}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${
                        halfType === slot.id
                          ? 'bg-amber-500/15 border-amber-500 text-amber-300 shadow-md shadow-amber-500/10'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <p className="font-bold text-white text-xs">{slot.label}</p>
                      <p className="text-[11px] text-slate-400 mt-1">{slot.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason box (Full width and comfortable height) */}
              <div>
                <label className="block text-slate-300 font-semibold mb-2 uppercase tracking-wider text-xs">
                  2. Reason for Half Day <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={halfReason}
                  onChange={(e) => setHalfReason(e.target.value)}
                  placeholder="Please describe why you are taking a half day (e.g. Doctor appointment scheduled at 2:30 PM, Urgent personal bank errand, Family function, Feeling unwell)"
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl p-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all resize-y min-h-[90px]"
                />
              </div>

              {/* Quick Preset Reason Tags */}
              <div>
                <p className="text-xs text-slate-400 mb-2 font-medium">Quick reason suggestions (click to auto-fill):</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Doctor / Medical Appointment',
                    'Personal Bank Errand',
                    'Family Function / Event',
                    'Not Feeling Well / Health Issue',
                    'Emergency Household Repair',
                    'Travel / Commute Issue'
                  ].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setHalfReason(tag)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-amber-500/20 hover:text-amber-300 hover:border-amber-500/40 text-slate-300 text-[11px] border border-slate-700/70 transition-all"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowHalfDayModal(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={halfLoading || !halfReason.trim()}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all disabled:opacity-50 active:scale-95"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{halfLoading ? 'Submitting...' : 'Confirm & Apply Half Day'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
