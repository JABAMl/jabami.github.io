export type UserRole = 'admin' | 'employee';

export interface Employee {
  id: string; // Firestore doc ID
  employeeId: string; // Unique identifier like EMP-1001
  name: string;
  email: string;
  department: string; // Always 'WALT'
  role: UserRole;
  pin: string; // 4-6 digit quick login PIN
  isActive: boolean;
  phone?: string;
  avatarUrl?: string;
  createdAt: string;
}

export type ShiftStatus = 'active' | 'on_break' | 'completed' | 'adjusted';

export interface AttendanceRecord {
  id: string; // Firestore doc ID
  employeeId: string;
  employeeName: string;
  department?: string;
  date: string; // YYYY-MM-DD
  clockInTime: string; // ISO String
  clockOutTime: string | null; // ISO String or null
  breakStartTime?: string | null; // ISO String if on break
  breakDurationMinutes: number; // accumulated break minutes
  totalHours: number; // calculated decimal hours (e.g. 7.50)
  status: ShiftStatus;
  notes?: string;
  location?: string;
  // Discrepancy & Adjustment audit tracking
  isAdjusted?: boolean;
  adjustedBy?: string;
  adjustmentReason?: string;
  originalClockInTime?: string;
  originalClockOutTime?: string | null;
  updatedAt: string;
}

export interface MonthlySummary {
  month: string; // YYYY-MM
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  daysWorked: number;
  averageHoursPerDay: number;
  activeShiftsCount: number;
}
