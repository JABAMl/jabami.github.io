import React, { useState, useEffect } from 'react';
import {
  Play,
  Square,
  Coffee,
  CheckCircle2,
  Clock,
  MapPin,
  FileText,
  AlertCircle,
  Calendar,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Employee, AttendanceRecord } from '../types';
import {
  clockIn,
  clockOut,
  startBreak,
  endBreak,
  calculateWorkHours,
} from '../services/attendanceService';
import { formatHours, formatDateTime } from '../utils/exportUtils';

interface PunchClockProps {
  currentUser: Employee;
  activeShift: AttendanceRecord | null;
  todayRecords: AttendanceRecord[];
  onRefresh: () => Promise<void>;
  onViewTimesheet: () => void;
}

export const PunchClock: React.FC<PunchClockProps> = ({
  currentUser,
  activeShift,
  todayRecords,
  onRefresh,
  onViewTimesheet,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [location, setLocation] = useState<string>('HQ Office - Main Floor');
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [breakElapsedSeconds, setBreakElapsedSeconds] = useState<number>(0);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // Live timer tick for active shift
  useEffect(() => {
    if (!activeShift) {
      setElapsedSeconds(0);
      setBreakElapsedSeconds(0);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const inTime = new Date(activeShift.clockInTime).getTime();
      const totalSec = Math.max(0, Math.floor((now - inTime) / 1000));
      setElapsedSeconds(totalSec);

      if (activeShift.status === 'on_break' && activeShift.breakStartTime) {
        const breakStart = new Date(activeShift.breakStartTime).getTime();
        const breakSec = Math.max(0, Math.floor((now - breakStart) / 1000));
        setBreakElapsedSeconds(breakSec);
      } else {
        setBreakElapsedSeconds(0);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeShift]);

  const showToast = (msg: string, isError = false) => {
    if (isError) {
      setErrorToast(msg);
      setTimeout(() => setErrorToast(null), 5000);
    } else {
      setSuccessToast(msg);
      setTimeout(() => setSuccessToast(null), 4000);
    }
  };

  const handleClockIn = async () => {
    try {
      setLoading(true);
      await clockIn(
        currentUser.employeeId,
        currentUser.name,
        currentUser.department,
        notes,
        location
      );
      setNotes('');
      showToast(`Successfully Clocked In at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}! Have a productive shift!`);
      await onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to clock in', true);
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!activeShift) return;
    try {
      setLoading(true);
      await clockOut(activeShift.id, notes);
      setNotes('');
      showToast(`Shift completed! Clocked Out at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`);
      await onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to clock out', true);
    } finally {
      setLoading(false);
    }
  };

  const handleStartBreak = async () => {
    if (!activeShift) return;
    try {
      setLoading(true);
      await startBreak(activeShift.id);
      showToast('Break started. Enjoy your break!');
      await onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to start break', true);
    } finally {
      setLoading(false);
    }
  };

  const handleEndBreak = async () => {
    if (!activeShift) return;
    try {
      setLoading(true);
      await endBreak(activeShift.id, activeShift.breakDurationMinutes, activeShift.breakStartTime);
      showToast('Welcome back! Break ended.');
      await onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to end break', true);
    } finally {
      setLoading(false);
    }
  };

  // Format digital stopwatch (HH:MM:SS)
  const formatTimer = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const totalHoursToday = todayRecords.reduce((acc, cur) => acc + (cur.totalHours || 0), 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Toast Alert */}
      {successToast && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-2xl flex items-center space-x-3 shadow-lg shadow-emerald-500/10 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-sm font-medium">{successToast}</p>
        </div>
      )}

      {errorToast && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 px-4 py-3 rounded-2xl flex items-center space-x-3 shadow-lg shadow-rose-500/10">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <p className="text-sm font-medium">{errorToast}</p>
        </div>
      )}

      {/* Main Punch Clock Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div
          className={`absolute -right-20 -top-20 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none transition-colors duration-700 ${
            activeShift?.status === 'active'
              ? 'bg-emerald-500'
              : activeShift?.status === 'on_break'
              ? 'bg-amber-500'
              : 'bg-indigo-600'
          }`}
        />

        {/* Top Badges & Employee Ident */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold tracking-wider px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {currentUser.employeeId}
              </span>
              <span className="text-slate-400 text-xs font-semibold">• Dept: WALT</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              {currentUser.name}
            </h1>
          </div>

          <div className="flex items-center space-x-3">
            {activeShift?.status === 'active' ? (
              <span className="px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Clocked In (Active)
              </span>
            ) : activeShift?.status === 'on_break' ? (
              <span className="px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-bounce"></span>
                On Break ({formatTimer(breakElapsedSeconds)})
              </span>
            ) : (
              <span className="px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
                Clocked Out
              </span>
            )}
          </div>
        </div>

        {/* Center: Live Digital Clock Display */}
        <div className="my-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            {activeShift ? 'Elapsed Shift Duration' : 'Ready For Clock-In'}
          </p>

          <div className="font-mono text-5xl sm:text-7xl font-extrabold tracking-tight mt-2 text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-400">
            {activeShift ? formatTimer(elapsedSeconds) : '00:00:00'}
          </div>

          {activeShift && (
            <p className="text-xs text-slate-400 mt-2 flex items-center justify-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              Clocked in today at {formatDateTime(activeShift.clockInTime)}
              {activeShift.breakDurationMinutes > 0 && (
                <span className="text-amber-400">
                  • Total Break: {activeShift.breakDurationMinutes} mins
                </span>
              )}
            </p>
          )}
        </div>

        {/* Action Controls */}
        <div className="space-y-4">
          {!activeShift ? (
            /* CLOCKED OUT STATE: Clock In Controls */
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" /> Work Location
                  </label>
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="HQ Office - Main Floor">HQ Office - Main Floor</option>
                    <option value="HQ Office - Level 3 Tech">HQ Office - Level 3 Tech</option>
                    <option value="Remote Workstation">Remote Workstation (Home)</option>
                    <option value="Client On-Site">Client On-Site</option>
                    <option value="Mobile / Field Service">Mobile / Field Service</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-slate-400" /> Shift Focus / Notes (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Core sprint dev, customer onboarding..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-600"
                  />
                </div>
              </div>

              <button
                onClick={handleClockIn}
                disabled={loading}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-base shadow-xl shadow-emerald-500/25 flex items-center justify-center space-x-2.5 transition-all transform active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>{loading ? 'Recording Clock-In...' : 'CLOCK IN NOW'}</span>
              </button>
            </div>
          ) : (
            /* CLOCKED IN STATE: Break & Clock Out Controls */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-slate-400" /> Shift Output / Handoff Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Completed module QA, passing shift to night team"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeShift.status === 'active' ? (
                  <button
                    onClick={handleStartBreak}
                    disabled={loading}
                    className="py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-semibold text-sm flex items-center justify-center space-x-2 transition-all cursor-pointer"
                  >
                    <Coffee className="w-4 h-4 text-amber-400" />
                    <span>Start Break / Lunch</span>
                  </button>
                ) : (
                  <button
                    onClick={handleEndBreak}
                    disabled={loading}
                    className="py-3.5 px-4 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-semibold text-sm flex items-center justify-center space-x-2 transition-all cursor-pointer"
                  >
                    <Play className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span>Resume Shift (End Break)</span>
                  </button>
                )}

                <button
                  onClick={handleClockOut}
                  disabled={loading}
                  className="py-3.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-sm shadow-lg shadow-rose-500/20 flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Square className="w-4 h-4 fill-white" />
                  <span>{loading ? 'Clocking Out...' : 'CLOCK OUT & FINISH'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Today's Summary & Quick Link to Monthly Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1 */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Today's Recorded Hours</p>
            <p className="text-xl font-bold text-white mt-0.5">{totalHoursToday.toFixed(2)} hrs</p>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Today's Punches</p>
            <p className="text-xl font-bold text-white mt-0.5">
              {todayRecords.length} {todayRecords.length === 1 ? 'Shift' : 'Shifts'}
            </p>
          </div>
        </div>

        {/* Metric 3: CTA to Personal Dashboard */}
        <button
          onClick={onViewTimesheet}
          className="bg-gradient-to-br from-indigo-950/60 to-slate-900 border border-indigo-500/30 hover:border-indigo-500/60 rounded-2xl p-4 flex items-center justify-between text-left transition-all group cursor-pointer"
        >
          <div>
            <p className="text-xs text-indigo-300 font-semibold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Personal Dashboard
            </p>
            <p className="text-sm font-bold text-white mt-0.5">View Monthly Timesheet</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-300 group-hover:translate-x-1 transition-transform">
            <ArrowRight className="w-4 h-4" />
          </div>
        </button>
      </div>

      {/* Today's Logged Shifts List */}
      {todayRecords.length > 0 && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Today's Attendance Timeline
          </h3>
          <div className="space-y-2.5">
            {todayRecords.map((r) => (
              <div
                key={r.id}
                className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="flex items-center space-x-3">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      r.status === 'active'
                        ? 'bg-emerald-400 animate-pulse'
                        : r.status === 'on_break'
                        ? 'bg-amber-400'
                        : 'bg-indigo-400'
                    }`}
                  />
                  <div>
                    <div className="text-xs font-semibold text-slate-200">
                      In: {formatDateTime(r.clockInTime)} → Out:{' '}
                      {r.clockOutTime ? formatDateTime(r.clockOutTime) : 'Current'}
                    </div>
                    {r.notes && <p className="text-[11px] text-slate-400 italic mt-0.5">{r.notes}</p>}
                  </div>
                </div>

                <div className="flex items-center space-x-3 self-end sm:self-auto text-xs">
                  {r.breakDurationMinutes > 0 && (
                    <span className="text-slate-400">Break: {r.breakDurationMinutes}m</span>
                  )}
                  <span className="font-bold text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20">
                    {r.totalHours ? r.totalHours.toFixed(2) : '0.00'} hrs
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
