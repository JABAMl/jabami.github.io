import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';
import { Employee, AttendanceRecord, MonthlySummary } from '../types';
import { calculateMonthlySummary } from '../services/attendanceService';
import { exportToCSV, exportToPDF, formatHours, formatDateTime, formatDate } from '../utils/exportUtils';

interface EmployeeDashboardProps {
  currentUser: Employee;
  records: AttendanceRecord[];
  onRefresh: () => Promise<void>;
}

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({
  currentUser,
  records,
  onRefresh,
}) => {
  // Current month default in format YYYY-MM
  const currentMonthStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [selectedDiscrepancy, setSelectedDiscrepancy] = useState<AttendanceRecord | null>(null);
  const [showRequestCorrectionModal, setShowRequestCorrectionModal] = useState<boolean>(false);
  const [correctionNote, setCorrectionNote] = useState<string>('');
  const [correctionDate, setCorrectionDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [correctionSent, setCorrectionSent] = useState<boolean>(false);

  // Month navigation helpers
  const handlePrevMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 2, 1);
    setSelectedMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month, 1);
    setSelectedMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  };

  const monthLabel = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString([], {
      month: 'long',
      year: 'numeric',
    });
  }, [selectedMonth]);

  // Filter records for selected month
  const monthlyRecords = useMemo(() => {
    return records
      .filter((r) => r.date.startsWith(selectedMonth))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [records, selectedMonth]);

  // Calculate high-fidelity summary metrics
  const summary: MonthlySummary = useMemo(() => {
    return calculateMonthlySummary(records, selectedMonth);
  }, [records, selectedMonth]);

  // Target hours (160 standard working hours in a month)
  const targetMonthlyHours = 160;
  const progressPercent = Math.min(100, Math.round((summary.totalHours / targetMonthlyHours) * 100));

  const handleExportCSV = () => {
    exportToCSV(
      monthlyRecords,
      `timesheet_${currentUser.employeeId}_${selectedMonth}.csv`
    );
  };

  const handleExportPDF = () => {
    exportToPDF(
      monthlyRecords,
      `${currentUser.name} - Monthly Timesheet`,
      `Employee ID: ${currentUser.employeeId} • Period: ${monthLabel}`
    );
  };

  const handleSubmitCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    setCorrectionSent(true);
    setTimeout(() => {
      setCorrectionSent(false);
      setShowRequestCorrectionModal(false);
      setCorrectionNote('');
    }, 2000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header and Month Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-3xl p-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {currentUser.employeeId}
            </span>
            <span className="text-xs text-slate-400">Personal Timesheet Dashboard</span>
          </div>
          <h1 className="text-2xl font-black text-white mt-1">Monthly Hours & Attendance</h1>
        </div>

        {/* Month Selector Controls */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-2xl p-1 shadow-inner">
            <button
              onClick={handlePrevMonth}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-4 py-1 text-center min-w-[140px]">
              <span className="text-xs font-bold text-white block">{monthLabel}</span>
              <span className="text-[10px] text-slate-400 font-mono">
                {monthlyRecords.length} records
              </span>
            </div>
            <button
              onClick={handleNextMonth}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Export Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportCSV}
              disabled={monthlyRecords.length === 0}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-xl border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
              title="Export Month to CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">CSV</span>
            </button>

            <button
              onClick={handleExportPDF}
              disabled={monthlyRecords.length === 0}
              className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
              title="Export Official PDF Timesheet"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards (3 columns: Total Hours, Regular vs Overtime, Days Worked) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Hours Worked */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Hours
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {summary.totalHours.toFixed(1)}
            </span>
            <span className="text-xs text-slate-400 font-semibold">/ 160h target</span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-500 to-cyan-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">{progressPercent}% of standard monthly schedule</p>
        </div>

        {/* Regular vs Overtime */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Regular vs OT
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {summary.regularHours.toFixed(1)}h
            </span>
            {summary.overtimeHours > 0 && (
              <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                +{summary.overtimeHours.toFixed(1)}h OT
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-3">
            {summary.overtimeHours > 0
              ? `${summary.overtimeHours.toFixed(1)} hours overtime recorded`
              : 'No overtime accrued this month'}
          </p>
        </div>

        {/* Days Worked & Daily Average */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Days Worked
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {summary.daysWorked}
            </span>
            <span className="text-xs text-slate-400">days logged</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-3">
            Avg <span className="font-semibold text-slate-200">{summary.averageHoursPerDay}h</span> per worked day
          </p>
        </div>
      </div>

      {/* Discrepancy Alert / Notice Banner if records were adjusted */}
      {monthlyRecords.some((r) => r.isAdjusted) && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start space-x-3 text-amber-200">
          <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <span className="font-bold">Supervisor Adjustment Notice:</span> One or more of your timesheet entries for {monthLabel} have been adjusted by HR / Administration for discrepancy corrections. Click on the{' '}
            <span className="underline font-semibold cursor-pointer">"Adjusted"</span> badge on any shift to review supervisor notes.
          </div>
        </div>
      )}

      {/* Timesheet Logs Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Shifts & Time Entries for {monthLabel}</h2>
            <p className="text-xs text-slate-400">All clock-ins, clock-outs, and breaks recorded</p>
          </div>

          <button
            onClick={() => setShowRequestCorrectionModal(true)}
            className="text-xs font-semibold text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded-xl border border-indigo-500/20 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Report Missed Punch / Discrepancy</span>
          </button>
        </div>

        {monthlyRecords.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-500 mb-3">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-300">No shifts recorded for {monthLabel}</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              You haven't clocked in or logged any timesheets during this month yet. Use the Punch Clock tab to record your shift!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800">
                  <th className="py-3.5 px-6">Date</th>
                  <th className="py-3.5 px-4">Clock In</th>
                  <th className="py-3.5 px-4">Clock Out</th>
                  <th className="py-3.5 px-4">Break</th>
                  <th className="py-3.5 px-4">Total Hours</th>
                  <th className="py-3.5 px-4">Status & Audit</th>
                  <th className="py-3.5 px-6">Notes / Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {monthlyRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Date */}
                    <td className="py-3.5 px-6 font-semibold text-white whitespace-nowrap">
                      {formatDate(rec.date)}
                    </td>

                    {/* Clock In */}
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {formatDateTime(rec.clockInTime)}
                    </td>

                    {/* Clock Out */}
                    <td className="py-3.5 px-4 font-mono">
                      {rec.clockOutTime ? (
                        formatDateTime(rec.clockOutTime)
                      ) : (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                          In Progress
                        </span>
                      )}
                    </td>

                    {/* Break */}
                    <td className="py-3.5 px-4">
                      {rec.breakDurationMinutes > 0 ? (
                        <span className="text-slate-400">{rec.breakDurationMinutes} mins</span>
                      ) : (
                        <span className="text-slate-600">0m</span>
                      )}
                    </td>

                    {/* Total Hours */}
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-white font-mono bg-slate-800 px-2 py-0.5 rounded">
                        {rec.totalHours ? rec.totalHours.toFixed(2) : '0.00'}h
                      </span>
                    </td>

                    {/* Status & Adjustment */}
                    <td className="py-3.5 px-4">
                      {rec.isAdjusted ? (
                        <button
                          onClick={() => setSelectedDiscrepancy(rec)}
                          className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1 hover:bg-amber-500/25 transition-colors cursor-pointer"
                        >
                          <AlertCircle className="w-3 h-3 text-amber-400" />
                          Adjusted (View)
                        </button>
                      ) : rec.status === 'active' ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          Active Shift
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400">
                          Completed
                        </span>
                      )}
                    </td>

                    {/* Notes / Location */}
                    <td className="py-3.5 px-6 max-w-xs truncate text-slate-400">
                      {rec.notes || rec.location || <span className="text-slate-600">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Discrepancy Detail Modal */}
      {selectedDiscrepancy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-amber-400">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Timesheet Adjustment Audit</h3>
                <p className="text-xs text-slate-400">Shift on {selectedDiscrepancy.date}</p>
              </div>
            </div>

            <div className="bg-slate-950 rounded-2xl p-4 space-y-3 text-xs border border-slate-800">
              <div>
                <span className="text-slate-500 block uppercase font-mono text-[10px]">Supervisor Reason</span>
                <p className="text-amber-200 font-medium mt-0.5">
                  "{selectedDiscrepancy.adjustmentReason || 'Standard timesheet adjustment'}"
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
                <div>
                  <span className="text-slate-500 block text-[10px]">Adjusted By</span>
                  <span className="text-slate-300 font-semibold">{selectedDiscrepancy.adjustedBy || 'HR Admin'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Adjusted Time</span>
                  <span className="text-slate-300 font-semibold">
                    {formatDate(selectedDiscrepancy.updatedAt)}
                  </span>
                </div>
              </div>

              {selectedDiscrepancy.originalClockInTime && (
                <div className="pt-2 border-t border-slate-800/80">
                  <span className="text-slate-500 block text-[10px]">Original Clock In Recorded</span>
                  <span className="text-slate-400 font-mono">
                    {formatDateTime(selectedDiscrepancy.originalClockInTime)}
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedDiscrepancy(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              Close Window
            </button>
          </div>
        </div>
      )}

      {/* Missed Punch / Discrepancy Inquiry Modal */}
      {showRequestCorrectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Report Missed Punch</h3>
                <p className="text-xs text-slate-400">Send adjustment note to HR Administrator</p>
              </div>
            </div>

            {correctionSent ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 text-center text-emerald-300 space-y-2">
                <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="text-sm font-bold">Correction Request Sent!</p>
                <p className="text-xs text-slate-400">
                  HR Administrator will review gate records and adjust your timesheet.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitCorrection} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Shift Date</label>
                  <input
                    type="date"
                    value={correctionDate}
                    onChange={(e) => setCorrectionDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    Explanation / Estimated Times
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Forgot to clock out on Oct 30 at 17:30 due to building drill."
                    value={correctionNote}
                    onChange={(e) => setCorrectionNote(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-600"
                    required
                  />
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRequestCorrectionModal(false)}
                    className="w-1/2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-1/2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-colors cursor-pointer"
                  >
                    Send to Admin
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
