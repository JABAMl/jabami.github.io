import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  FileText,
  Edit3,
  Trash2,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  UserCheck,
  Calendar,
  X,
  History,
} from 'lucide-react';
import { Employee, AttendanceRecord } from '../types';
import {
  adjustTimesheetRecord,
  addManualAttendance,
  deleteAttendanceRecord,
  calculateWorkHours,
} from '../services/attendanceService';
import { exportToCSV, exportToPDF, formatDateTime, formatDate } from '../utils/exportUtils';

interface AdminTimesheetsProps {
  currentAdmin: Employee;
  employees: Employee[];
  allRecords: AttendanceRecord[];
  onRefresh: () => Promise<void>;
}

export const AdminTimesheets: React.FC<AdminTimesheetsProps> = ({
  currentAdmin,
  employees,
  allRecords,
  onRefresh,
}) => {
  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Modal States
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);

  // Form States for Adjustment
  const [adjClockIn, setAdjClockIn] = useState<string>('');
  const [adjClockOut, setAdjClockOut] = useState<string>('');
  const [adjBreakMinutes, setAdjBreakMinutes] = useState<number>(0);
  const [adjReason, setAdjReason] = useState<string>('');
  const [adjNotes, setAdjNotes] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  // Form States for Manual Add
  const [manualEmpId, setManualEmpId] = useState<string>(employees[0]?.employeeId || '');
  const [manualDate, setManualDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [manualClockIn, setManualClockIn] = useState<string>('');
  const [manualClockOut, setManualClockOut] = useState<string>('');
  const [manualBreak, setManualBreak] = useState<number>(30);
  const [manualReason, setManualReason] = useState<string>('Missed punch created by administrator');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Distinct departments
  const departments = useMemo(() => {
    const set = new Set(employees.map((e) => e.department).filter(Boolean));
    return Array.from(set);
  }, [employees]);

  // Filter records
  const filteredRecords = useMemo(() => {
    return allRecords.filter((rec) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchEmp = rec.employeeName.toLowerCase().includes(q) || rec.employeeId.toLowerCase().includes(q);
        const matchNotes = (rec.notes || '').toLowerCase().includes(q);
        if (!matchEmp && !matchNotes) return false;
      }
      // Employee
      if (selectedEmployeeId !== 'all' && rec.employeeId !== selectedEmployeeId) {
        return false;
      }
      // Department
      if (selectedDepartment !== 'all' && rec.department !== selectedDepartment) {
        return false;
      }
      // Status
      if (statusFilter !== 'all') {
        if (statusFilter === 'adjusted' && !rec.isAdjusted) return false;
        if (statusFilter !== 'adjusted' && rec.status !== statusFilter) return false;
      }
      // Date range
      if (startDate && rec.date < startDate) return false;
      if (endDate && rec.date > endDate) return false;

      return true;
    });
  }, [allRecords, searchQuery, selectedEmployeeId, selectedDepartment, statusFilter, startDate, endDate]);

  // Total summary metrics for filtered records
  const totalFilteredHours = useMemo(() => {
    return filteredRecords.reduce((acc, cur) => acc + (cur.totalHours || 0), 0);
  }, [filteredRecords]);

  // Handle open adjustment modal
  const handleOpenAdjust = (rec: AttendanceRecord) => {
    setEditingRecord(rec);
    // Format to YYYY-MM-DDTHH:mm for datetime-local input
    const toInputFormat = (isoStr: string | null | undefined) => {
      if (!isoStr) return '';
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return '';
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    setAdjClockIn(toInputFormat(rec.clockInTime));
    setAdjClockOut(toInputFormat(rec.clockOutTime));
    setAdjBreakMinutes(rec.breakDurationMinutes || 0);
    setAdjReason(rec.adjustmentReason || '');
    setAdjNotes(rec.notes || '');
  };

  // Preview hours during adjustment
  const previewAdjustedHours = useMemo(() => {
    if (!adjClockIn) return 0;
    const inIso = new Date(adjClockIn).toISOString();
    const outIso = adjClockOut ? new Date(adjClockOut).toISOString() : null;
    return calculateWorkHours(inIso, outIso, adjBreakMinutes);
  }, [adjClockIn, adjClockOut, adjBreakMinutes]);

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    if (!adjReason.trim()) {
      alert('Please specify the reason for this discrepancy adjustment for the audit log.');
      return;
    }

    try {
      setSaving(true);
      const inIso = new Date(adjClockIn).toISOString();
      const outIso = adjClockOut ? new Date(adjClockOut).toISOString() : null;

      await adjustTimesheetRecord(editingRecord.id, {
        clockInTime: inIso,
        clockOutTime: outIso,
        breakDurationMinutes: Number(adjBreakMinutes) || 0,
        adjustmentReason: adjReason.trim(),
        adjustedBy: `${currentAdmin.name} (${currentAdmin.employeeId})`,
        notes: adjNotes,
      });

      setEditingRecord(null);
      showToast(`Record for ${editingRecord.employeeName} on ${editingRecord.date} was successfully adjusted.`);
      await onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to adjust record');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateManualShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmp = employees.find((e) => e.employeeId === manualEmpId);
    if (!targetEmp) return;

    try {
      setSaving(true);
      const inIso = new Date(`${manualDate}T${manualClockIn}:00`).toISOString();
      const outIso = manualClockOut ? new Date(`${manualDate}T${manualClockOut}:00`).toISOString() : null;

      await addManualAttendance({
        employeeId: targetEmp.employeeId,
        employeeName: targetEmp.name,
        department: targetEmp.department,
        date: manualDate,
        clockInTime: inIso,
        clockOutTime: outIso,
        breakDurationMinutes: Number(manualBreak) || 0,
        adjustedBy: `${currentAdmin.name} (${currentAdmin.employeeId})`,
        adjustmentReason: manualReason.trim() || 'Manual punch added by Administrator',
        notes: 'Manually logged by HR/Admin',
      });

      setShowAddModal(false);
      showToast(`Manual shift created for ${targetEmp.name}.`);
      await onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to create shift');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    try {
      await deleteAttendanceRecord(recordId);
      setDeletingRecordId(null);
      showToast('Attendance record deleted.');
      await onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete record');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-2xl flex items-center space-x-3 shadow-lg shadow-emerald-500/10">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-sm font-medium">{toastMessage}</p>
        </div>
      )}

      {/* Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-3xl p-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
              Admin Portal
            </span>
            <span className="text-xs text-slate-400">Company-wide Attendance Control</span>
          </div>
          <h1 className="text-2xl font-black text-white mt-1">Timesheets & Discrepancy Manager</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Missed Shift</span>
          </button>

          <button
            onClick={() => exportToCSV(filteredRecords, `timesheets_export_${new Date().toISOString().slice(0, 10)}.csv`)}
            disabled={filteredRecords.length === 0}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-xl border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => exportToPDF(filteredRecords, 'All Employee Timesheets Report', `Generated by ${currentAdmin.name} • ${filteredRecords.length} records`)}
            disabled={filteredRecords.length === 0}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-xl border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by name, ID or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-slate-600"
            />
          </div>

          {/* Employee Filter */}
          <div>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">All Employees ({employees.length})</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.employeeId}>
                  {emp.employeeId} - {emp.name}
                </option>
              ))}
            </select>
          </div>

          {/* Department: WALT */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-300 flex items-center justify-between">
            <span className="text-slate-500 text-[11px]">Dept:</span>
            <span className="font-bold text-indigo-300 font-mono">WALT</span>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active (Clocked In)</option>
              <option value="completed">Completed</option>
              <option value="adjusted">Adjusted / Discrepancy</option>
            </select>
          </div>

          {/* Date Range Start & End */}
          <div className="flex items-center space-x-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Start"
              className="w-1/2 bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 text-[11px]"
              title="Start Date"
            />
            <span className="text-slate-600">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="End"
              className="w-1/2 bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 text-[11px]"
              title="End Date"
            />
          </div>
        </div>

        {/* Filter Summary & Quick Clear */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs text-slate-400">
          <div>
            Showing <span className="font-bold text-white">{filteredRecords.length}</span> records • Total Filtered Work: <span className="font-bold text-amber-300 font-mono">{totalFilteredHours.toFixed(2)} hrs</span>
          </div>

          {(searchQuery || selectedEmployeeId !== 'all' || selectedDepartment !== 'all' || statusFilter !== 'all' || startDate || endDate) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedEmployeeId('all');
                setSelectedDepartment('all');
                setStatusFilter('all');
                setStartDate('');
                setEndDate('');
              }}
              className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Timesheets Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                <th className="py-3.5 px-6">Employee</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Clock In</th>
                <th className="py-3.5 px-4">Clock Out</th>
                <th className="py-3.5 px-4">Break</th>
                <th className="py-3.5 px-4">Hours</th>
                <th className="py-3.5 px-4">Status & Audit</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No attendance records match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Employee */}
                    <td className="py-3.5 px-6 whitespace-nowrap">
                      <div className="font-bold text-white">{rec.employeeName}</div>
                      <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                        <span>{rec.employeeId}</span>
                        <span>•</span>
                        <span>WALT</span>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 font-semibold text-slate-300 whitespace-nowrap">
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
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                          In Progress
                        </span>
                      )}
                    </td>

                    {/* Break */}
                    <td className="py-3.5 px-4 text-slate-400">
                      {rec.breakDurationMinutes > 0 ? `${rec.breakDurationMinutes}m` : '0m'}
                    </td>

                    {/* Hours */}
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-white font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {rec.totalHours ? rec.totalHours.toFixed(2) : '0.00'}h
                      </span>
                    </td>

                    {/* Status & Audit Note */}
                    <td className="py-3.5 px-4 max-w-xs">
                      {rec.isAdjusted ? (
                        <div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-400" />
                            Adjusted
                          </span>
                          <p className="text-[10px] text-slate-400 italic mt-0.5 truncate" title={rec.adjustmentReason}>
                            "{rec.adjustmentReason}"
                          </p>
                        </div>
                      ) : rec.status === 'active' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400">
                          Completed
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-6 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleOpenAdjust(rec)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-slate-700 hover:border-amber-500/30 transition-colors cursor-pointer"
                          title="Adjust Discrepancy"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setDeletingRecordId(rec.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/30 transition-colors cursor-pointer"
                          title="Delete Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Timesheet Discrepancy Adjustment Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Adjust Timesheet Discrepancy</h3>
                  <p className="text-xs text-slate-400">
                    {editingRecord.employeeName} ({editingRecord.employeeId}) • {editingRecord.date}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingRecord(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Clock In Time</label>
                  <input
                    type="datetime-local"
                    value={adjClockIn}
                    onChange={(e) => setAdjClockIn(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Clock Out Time</label>
                  <input
                    type="datetime-local"
                    value={adjClockOut}
                    onChange={(e) => setAdjClockOut(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Break Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  max="480"
                  value={adjBreakMinutes}
                  onChange={(e) => setAdjBreakMinutes(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Live Preview Box */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                <span className="text-slate-400">Recalculated Net Work Hours:</span>
                <span className="text-base font-bold font-mono text-amber-300">
                  {previewAdjustedHours.toFixed(2)} hrs
                </span>
              </div>

              {/* Mandatory Reason */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Audit Reason for Discrepancy Adjustment *
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Employee badge failed at entry; door log confirms 08:30 AM arrival."
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-slate-600"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Internal Shift Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Overtime approved by team lead"
                  value={adjNotes}
                  onChange={(e) => setAdjNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-slate-600"
                />
              </div>

              <div className="flex items-center space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="w-1/2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-1/2 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-lg shadow-amber-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Saving Adjustment...' : 'Apply Discrepancy Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Missed Shift Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Add Missed Shift Record</h3>
                  <p className="text-xs text-slate-400">Manually insert an unpunched attendance shift</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManualShift} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Select Employee *</label>
                <select
                  value={manualEmpId}
                  onChange={(e) => setManualEmpId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.employeeId}>
                      {emp.employeeId} - {emp.name} ({emp.department})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Shift Date *</label>
                <input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Clock In (HH:MM) *</label>
                  <input
                    type="time"
                    value={manualClockIn}
                    onChange={(e) => setManualClockIn(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Clock Out (HH:MM)</label>
                  <input
                    type="time"
                    value={manualClockOut}
                    onChange={(e) => setManualClockOut(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Break Duration (Minutes)</label>
                <input
                  type="number"
                  min="0"
                  value={manualBreak}
                  onChange={(e) => setManualBreak(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Audit Reason / Justification</label>
                <input
                  type="text"
                  placeholder="e.g. Employee offsite training; timesheet manually recorded"
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-1/2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Creating Shift...' : 'Add Attendance Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingRecordId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Delete Attendance Record?</h3>
              <p className="text-xs text-slate-400 mt-1">
                This action is permanent and will remove this shift from timesheets and export reports.
              </p>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <button
                onClick={() => setDeletingRecordId(null)}
                className="w-1/2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteRecord(deletingRecordId)}
                className="w-1/2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
