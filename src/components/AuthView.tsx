import React, { useState } from 'react';
import {
  Clock,
  KeyRound,
  User,
  ArrowRight,
  AlertCircle,
  Building2,
} from 'lucide-react';
import { Employee } from '../types';
import { getEmployeeByEmployeeId } from '../services/attendanceService';

interface AuthViewProps {
  employees: Employee[];
  onLoginSuccess: (employee: Employee) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ employees, onLoginSuccess }) => {
  const [employeeIdInput, setEmployeeIdInput] = useState<string>('');
  const [pinInput, setPinInput] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeIdInput.trim()) {
      setErrorMessage('Please enter your unique Employee ID.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const normalizedId = employeeIdInput.trim().toUpperCase();
      let emp = employees.find((e) => e.employeeId === normalizedId);

      if (!emp) {
        emp = (await getEmployeeByEmployeeId(normalizedId)) || undefined;
      }

      if (!emp) {
        setErrorMessage(`No account found for Employee ID "${normalizedId}". Please check with your supervisor or administrator.`);
        setLoading(false);
        return;
      }

      if (!emp.isActive) {
        setErrorMessage(`Account "${normalizedId}" is currently deactivated. Please contact your administrator.`);
        setLoading(false);
        return;
      }

      // Check PIN
      if (emp.pin && pinInput.trim() !== emp.pin.trim()) {
        setErrorMessage(`Invalid PIN for Employee ID ${normalizedId}. Please try again.`);
        setLoading(false);
        return;
      }

      // Successfully authenticated
      onLoginSuccess(emp);
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 mx-auto shadow-xl shadow-indigo-500/25 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Clock className="w-7 h-7 text-indigo-400 animate-pulse" />
            </div>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">CHRONOS</h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Cloud Attendance & Timesheet Tracker • Department: WALT
          </p>
        </div>

        {/* Main Login Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-7 shadow-2xl space-y-5 backdrop-blur-xl relative overflow-hidden">
          {/* Subtle glow */}
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Attendance Login</h2>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                Dept: WALT
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Enter your unique Employee ID and PIN to clock in, clock out, or access your timesheet.
            </p>
          </div>

          {errorMessage && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3 rounded-xl text-xs flex items-start space-x-2.5 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            {/* Employee ID */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                <span>Unique Employee ID</span>
              </label>
              <input
                type="text"
                placeholder="e.g. EMP-1001 or EMP-ADMIN"
                value={employeeIdInput}
                onChange={(e) => setEmployeeIdInput(e.target.value.toUpperCase())}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-3 text-sm text-white font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500/30 placeholder-slate-600 transition-all"
                required
                autoFocus
              />
            </div>

            {/* PIN */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                <span>Security PIN</span>
              </label>
              <input
                type="password"
                maxLength={6}
                placeholder="Enter your 4-digit PIN"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-3 text-sm text-white font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500/30 placeholder-slate-600 transition-all"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-sm shadow-lg shadow-indigo-600/25 flex items-center justify-center space-x-2 transition-all transform active:scale-[0.99] cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? 'Verifying Credentials...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Feature badges */}
        <div className="grid grid-cols-3 gap-2 text-center text-[11px] text-slate-400">
          <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl py-2 px-1">
            <span className="font-bold text-slate-200 block">Unique ID</span>
            Secure Punch
          </div>
          <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl py-2 px-1">
            <span className="font-bold text-slate-200 block">CSV & PDF</span>
            Timesheet Exports
          </div>
          <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl py-2 px-1">
            <span className="font-bold text-slate-200 block">Role-Based</span>
            Admin Audits
          </div>
        </div>
      </div>
    </div>
  );
};
