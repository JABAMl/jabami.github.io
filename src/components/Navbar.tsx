import React, { useState, useEffect } from 'react';
import {
  Clock,
  ShieldCheck,
  User,
  LogOut,
  Users,
  Calendar,
  FileSpreadsheet,
} from 'lucide-react';
import { Employee } from '../types';

interface NavbarProps {
  currentUser: Employee | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  activeShiftsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  onLogout,
  activeShiftsCount,
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = currentTime.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const formattedDate = currentTime.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const isAdmin = currentUser?.role === 'admin';

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Clock className="w-5 h-5 text-indigo-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                  CHRONOS
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Cloud Timesheet
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Role-Based Attendance Management • Department WALT
              </p>
            </div>
          </div>

          {/* Real-time Clock pill */}
          <div className="hidden md:flex items-center space-x-3 bg-slate-950/70 border border-slate-800/80 rounded-xl px-3.5 py-1.5 shadow-inner">
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>{formattedDate}</span>
            </div>
            <div className="h-4 w-px bg-slate-800"></div>
            <div className="font-mono text-xs font-semibold text-indigo-300">
              {formattedTime}
            </div>
            {activeShiftsCount > 0 && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                {activeShiftsCount} Clocked In
              </span>
            )}
          </div>

          {/* User Profile Badge & Direct Sign Out */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {currentUser && (
              <div className="flex items-center space-x-2 sm:space-x-2.5">
                <div className="flex items-center space-x-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-1.5 text-sm">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                      isAdmin
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    }`}
                  >
                    {isAdmin ? <ShieldCheck className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>
                  <div className="text-left hidden sm:block">
                    <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      {currentUser.name}
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                          isAdmin
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {currentUser.employeeId}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 capitalize">
                      {currentUser.role} • WALT
                    </div>
                  </div>
                </div>

                <button
                  onClick={onLogout}
                  className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/30 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation for logged in users */}
        {currentUser && (
          <div className="flex space-x-1 sm:space-x-3 border-t border-slate-800/60 pt-2 pb-2 overflow-x-auto">
            {/* Employee Tabs */}
            <button
              onClick={() => setActiveTab('clock')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all whitespace-nowrap ${
                activeTab === 'clock'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Punch Clock</span>
            </button>

            <button
              onClick={() => setActiveTab('my_timesheet')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all whitespace-nowrap ${
                activeTab === 'my_timesheet'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>My Monthly Dashboard</span>
            </button>

            {/* Admin Specific Tabs */}
            {isAdmin && (
              <>
                <div className="h-6 w-px bg-slate-800 self-center mx-1"></div>

                <button
                  onClick={() => setActiveTab('admin_records')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all whitespace-nowrap ${
                    activeTab === 'admin_records'
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                      : 'text-amber-300/80 hover:text-amber-200 hover:bg-amber-500/10'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>All Timesheets & Adjustments</span>
                </button>

                <button
                  onClick={() => setActiveTab('admin_employees')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all whitespace-nowrap ${
                    activeTab === 'admin_employees'
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                      : 'text-amber-300/80 hover:text-amber-200 hover:bg-amber-500/10'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Employee Directory</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
