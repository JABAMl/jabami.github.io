import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { PunchClock } from './components/PunchClock';
import { EmployeeDashboard } from './components/EmployeeDashboard';
import { AdminTimesheets } from './components/AdminTimesheets';
import { EmployeeDirectory } from './components/EmployeeDirectory';
import { AuthView } from './components/AuthView';
import { Employee, AttendanceRecord } from './types';
import {
  getEmployees,
  getAllAttendanceRecords,
  getActiveShift,
  seedInitialDataIfEmpty,
} from './services/attendanceService';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);
  const [activeTab, setActiveTab] = useState<string>('clock');
  const [initialLoading, setInitialLoading] = useState<boolean>(true);

  // Load database state & seed default records if first boot
  const loadData = useCallback(async () => {
    try {
      await seedInitialDataIfEmpty();
      const [empList, recList] = await Promise.all([
        getEmployees(),
        getAllAttendanceRecords(),
      ]);
      setEmployees(empList);
      setAllRecords(recList);
      // User must explicitly log in via Employee ID & PIN
    } catch (err) {
      console.error('Failed to load application data:', err);
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Sync current user active shift and records
  const currentUserRecords = useMemo(() => {
    if (!currentUser) return [];
    return allRecords.filter((r) => r.employeeId === currentUser.employeeId);
  }, [allRecords, currentUser]);

  const activeShift = useMemo(() => {
    return currentUserRecords.find((r) => r.status === 'active' || r.status === 'on_break') || null;
  }, [currentUserRecords]);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const todayRecords = useMemo(() => {
    return currentUserRecords.filter((r) => r.date === todayStr);
  }, [currentUserRecords, todayStr]);

  const activeShiftsCount = useMemo(() => {
    return allRecords.filter((r) => r.status === 'active' || r.status === 'on_break').length;
  }, [allRecords]);

  const handleLoginSuccess = (emp: Employee) => {
    setCurrentUser(emp);
    if (emp.role === 'admin') {
      setActiveTab('admin_records');
    } else {
      setActiveTab('clock');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 space-y-4">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        <p className="text-sm font-medium tracking-wide">Initializing Chronos Cloud Timesheet...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Navigation Bar */}
      <Navbar
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        activeShiftsCount={activeShiftsCount}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!currentUser ? (
          /* Authentication & Kiosk Login Screen */
          <AuthView employees={employees} onLoginSuccess={handleLoginSuccess} />
        ) : (
          /* Authenticated Views */
          <div>
            {activeTab === 'clock' && (
              <PunchClock
                currentUser={currentUser}
                activeShift={activeShift}
                todayRecords={todayRecords}
                onRefresh={loadData}
                onViewTimesheet={() => setActiveTab('my_timesheet')}
              />
            )}

            {activeTab === 'my_timesheet' && (
              <EmployeeDashboard
                currentUser={currentUser}
                records={currentUserRecords}
                onRefresh={loadData}
              />
            )}

            {currentUser.role === 'admin' && activeTab === 'admin_records' && (
              <AdminTimesheets
                currentAdmin={currentUser}
                employees={employees}
                allRecords={allRecords}
                onRefresh={loadData}
              />
            )}

            {currentUser.role === 'admin' && activeTab === 'admin_employees' && (
              <EmployeeDirectory
                currentAdmin={currentUser}
                employees={employees}
                onRefresh={loadData}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 Chronos Attendance Systems • Cloud Timesheets with RBAC</p>
          <div className="flex items-center space-x-3 text-[11px]">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Firestore Cloud Connected
            </span>
            <span>•</span>
            <span>Zero-Trust Role Security</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
