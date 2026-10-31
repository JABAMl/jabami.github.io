import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Employee, AttendanceRecord, MonthlySummary, ShiftStatus } from '../types';

const EMPLOYEES_COLLECTION = 'employees';
const ATTENDANCE_COLLECTION = 'attendance';

/**
 * Calculates decimal work hours between clock-in and clock-out subtracting break duration.
 */
export function calculateWorkHours(
  clockInIso: string,
  clockOutIso: string | null | undefined,
  breakMinutes: number = 0
): number {
  if (!clockInIso) return 0;
  const start = new Date(clockInIso).getTime();
  const end = clockOutIso ? new Date(clockOutIso).getTime() : Date.now();
  if (isNaN(start) || isNaN(end) || end <= start) return 0;

  const totalMilliseconds = end - start;
  const netMilliseconds = Math.max(0, totalMilliseconds - breakMinutes * 60 * 1000);
  const netHours = netMilliseconds / (1000 * 60 * 60);
  return Number(netHours.toFixed(2));
}

// ==============================
// EMPLOYEES REPOSITORY
// ==============================

export async function getEmployees(): Promise<Employee[]> {
  try {
    const snap = await getDocs(collection(db, EMPLOYEES_COLLECTION));
    return snap.docs.map((d) => ({
      ...(d.data() as Omit<Employee, 'id'>),
      id: d.id,
      department: 'WALT',
    }));
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, EMPLOYEES_COLLECTION);
    return [];
  }
}

export async function getEmployeeByEmployeeId(empId: string): Promise<Employee | null> {
  try {
    const q = query(collection(db, EMPLOYEES_COLLECTION), where('employeeId', '==', empId.trim().toUpperCase()));
    const snap = await getDocs(q);
    if (snap.empty) {
      const qCaseExact = query(collection(db, EMPLOYEES_COLLECTION), where('employeeId', '==', empId.trim()));
      const snapExact = await getDocs(qCaseExact);
      if (snapExact.empty) return null;
      const d = snapExact.docs[0];
      return { ...(d.data() as Omit<Employee, 'id'>), id: d.id, department: 'WALT' };
    }
    const d = snap.docs[0];
    return { ...(d.data() as Omit<Employee, 'id'>), id: d.id, department: 'WALT' };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, EMPLOYEES_COLLECTION);
    return null;
  }
}

export async function createEmployee(emp: Omit<Employee, 'id' | 'createdAt'>): Promise<Employee> {
  try {
    const normalizedEmpId = emp.employeeId.trim().toUpperCase();
    const docId = `emp_${normalizedEmpId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    const newDoc: Employee = {
      ...emp,
      id: docId,
      employeeId: normalizedEmpId,
      department: 'WALT', // Department is strictly WALT
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, EMPLOYEES_COLLECTION, docId), newDoc);
    return newDoc;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, EMPLOYEES_COLLECTION);
    throw err;
  }
}

export async function updateEmployee(id: string, updates: Partial<Employee>): Promise<void> {
  try {
    // Ensure department is always WALT and no hourlyRate
    const cleanUpdates = {
      ...updates,
      department: 'WALT',
    };
    await updateDoc(doc(db, EMPLOYEES_COLLECTION, id), cleanUpdates);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${EMPLOYEES_COLLECTION}/${id}`);
    throw err;
  }
}

export async function deleteEmployee(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, EMPLOYEES_COLLECTION, id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${EMPLOYEES_COLLECTION}/${id}`);
    throw err;
  }
}

// ==============================
// ATTENDANCE REPOSITORY
// ==============================

export async function getAllAttendanceRecords(): Promise<AttendanceRecord[]> {
  try {
    const snap = await getDocs(collection(db, ATTENDANCE_COLLECTION));
    const records = snap.docs.map((d) => ({
      ...(d.data() as Omit<AttendanceRecord, 'id'>),
      id: d.id,
      department: 'WALT',
    }));
    return records.sort((a, b) => new Date(b.clockInTime).getTime() - new Date(a.clockInTime).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, ATTENDANCE_COLLECTION);
    return [];
  }
}

export async function getAttendanceByEmployee(employeeId: string): Promise<AttendanceRecord[]> {
  try {
    const q = query(
      collection(db, ATTENDANCE_COLLECTION),
      where('employeeId', '==', employeeId.trim().toUpperCase())
    );
    const snap = await getDocs(q);
    const records = snap.docs.map((d) => ({
      ...(d.data() as Omit<AttendanceRecord, 'id'>),
      id: d.id,
      department: 'WALT',
    }));
    return records.sort((a, b) => new Date(b.clockInTime).getTime() - new Date(a.clockInTime).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, ATTENDANCE_COLLECTION);
    return [];
  }
}

export async function getActiveShift(employeeId: string): Promise<AttendanceRecord | null> {
  try {
    const records = await getAttendanceByEmployee(employeeId);
    return records.find((r) => r.status === 'active' || r.status === 'on_break') || null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, ATTENDANCE_COLLECTION);
    return null;
  }
}

export async function clockIn(
  employeeId: string,
  employeeName: string,
  department: string = 'WALT',
  notes?: string,
  location?: string
): Promise<AttendanceRecord> {
  try {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const docId = `att_${employeeId}_${Date.now()}`;

    const record: AttendanceRecord = {
      id: docId,
      employeeId: employeeId.trim().toUpperCase(),
      employeeName,
      department: 'WALT',
      date: dateStr,
      clockInTime: now.toISOString(),
      clockOutTime: null,
      breakDurationMinutes: 0,
      totalHours: 0,
      status: 'active',
      notes: notes || '',
      location: location || 'HQ Office',
      updatedAt: now.toISOString(),
    };

    await setDoc(doc(db, ATTENDANCE_COLLECTION, docId), record);
    return record;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, ATTENDANCE_COLLECTION);
    throw err;
  }
}

export async function startBreak(recordId: string): Promise<void> {
  try {
    const now = new Date().toISOString();
    await updateDoc(doc(db, ATTENDANCE_COLLECTION, recordId), {
      status: 'on_break',
      breakStartTime: now,
      updatedAt: now,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${ATTENDANCE_COLLECTION}/${recordId}`);
    throw err;
  }
}

export async function endBreak(recordId: string, currentBreakDurationMinutes = 0, breakStartTime?: string | null): Promise<void> {
  try {
    const now = new Date();
    let addedMinutes = 0;
    if (breakStartTime) {
      const diff = now.getTime() - new Date(breakStartTime).getTime();
      if (diff > 0) {
        addedMinutes = Math.round(diff / (1000 * 60));
      }
    }

    const totalBreakMinutes = (currentBreakDurationMinutes || 0) + addedMinutes;
    await updateDoc(doc(db, ATTENDANCE_COLLECTION, recordId), {
      status: 'active',
      breakStartTime: null,
      breakDurationMinutes: totalBreakMinutes,
      updatedAt: now.toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${ATTENDANCE_COLLECTION}/${recordId}`);
    throw err;
  }
}

export async function clockOut(recordId: string, notes?: string): Promise<void> {
  try {
    const docRef = doc(db, ATTENDANCE_COLLECTION, recordId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Shift record not found');
    const data = snap.data() as AttendanceRecord;

    const now = new Date();
    let breakDuration = data.breakDurationMinutes || 0;
    if (data.status === 'on_break' && data.breakStartTime) {
      const diff = now.getTime() - new Date(data.breakStartTime).getTime();
      if (diff > 0) {
        breakDuration += Math.round(diff / (1000 * 60));
      }
    }

    const totalHours = calculateWorkHours(data.clockInTime, now.toISOString(), breakDuration);

    const updates: Partial<AttendanceRecord> = {
      clockOutTime: now.toISOString(),
      breakStartTime: null,
      breakDurationMinutes: breakDuration,
      totalHours,
      status: 'completed',
      updatedAt: now.toISOString(),
    };
    if (notes) {
      updates.notes = data.notes ? `${data.notes} | ${notes}` : notes;
    }

    await updateDoc(docRef, updates);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${ATTENDANCE_COLLECTION}/${recordId}`);
    throw err;
  }
}

export async function adjustTimesheetRecord(
  recordId: string,
  updates: {
    clockInTime: string;
    clockOutTime: string | null;
    breakDurationMinutes: number;
    adjustmentReason: string;
    adjustedBy: string;
    notes?: string;
  }
): Promise<void> {
  try {
    const docRef = doc(db, ATTENDANCE_COLLECTION, recordId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Attendance record does not exist');
    const existing = snap.data() as AttendanceRecord;

    const totalHours = calculateWorkHours(
      updates.clockInTime,
      updates.clockOutTime,
      updates.breakDurationMinutes
    );

    const payload: Partial<AttendanceRecord> = {
      clockInTime: updates.clockInTime,
      clockOutTime: updates.clockOutTime,
      breakDurationMinutes: updates.breakDurationMinutes,
      totalHours,
      department: 'WALT',
      status: 'adjusted',
      isAdjusted: true,
      adjustmentReason: updates.adjustmentReason,
      adjustedBy: updates.adjustedBy,
      originalClockInTime: existing.originalClockInTime || existing.clockInTime,
      originalClockOutTime: existing.originalClockOutTime !== undefined ? existing.originalClockOutTime : existing.clockOutTime,
      updatedAt: new Date().toISOString(),
    };
    if (updates.notes !== undefined) {
      payload.notes = updates.notes;
    }

    await updateDoc(docRef, payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${ATTENDANCE_COLLECTION}/${recordId}`);
    throw err;
  }
}

export async function addManualAttendance(
  record: Omit<AttendanceRecord, 'id' | 'updatedAt' | 'status' | 'totalHours'> & {
    adjustedBy: string;
    adjustmentReason: string;
  }
): Promise<AttendanceRecord> {
  try {
    const docId = `att_manual_${record.employeeId}_${Date.now()}`;
    const totalHours = calculateWorkHours(
      record.clockInTime,
      record.clockOutTime,
      record.breakDurationMinutes
    );

    const newRecord: AttendanceRecord = {
      ...record,
      id: docId,
      department: 'WALT',
      status: 'adjusted',
      isAdjusted: true,
      totalHours,
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, ATTENDANCE_COLLECTION, docId), newRecord);
    return newRecord;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, ATTENDANCE_COLLECTION);
    throw err;
  }
}

export async function deleteAttendanceRecord(recordId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, ATTENDANCE_COLLECTION, recordId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${ATTENDANCE_COLLECTION}/${recordId}`);
    throw err;
  }
}

// ==============================
// METRICS & SUMMARIES
// ==============================

export function calculateMonthlySummary(
  records: AttendanceRecord[],
  targetMonthYear: string // YYYY-MM
): MonthlySummary {
  const monthRecords = records.filter((r) => r.date.startsWith(targetMonthYear));
  let totalHours = 0;
  let regularHours = 0;
  let overtimeHours = 0;
  const daysSet = new Set<string>();
  let activeCount = 0;

  monthRecords.forEach((r) => {
    const hours = r.totalHours || 0;
    totalHours += hours;
    daysSet.add(r.date);
    if (r.status === 'active' || r.status === 'on_break') {
      activeCount++;
    }

    if (hours > 8) {
      regularHours += 8;
      overtimeHours += hours - 8;
    } else {
      regularHours += hours;
    }
  });

  const daysWorked = daysSet.size;
  const averageHoursPerDay = daysWorked > 0 ? Number((totalHours / daysWorked).toFixed(1)) : 0;

  return {
    month: targetMonthYear,
    totalHours: Number(totalHours.toFixed(2)),
    regularHours: Number(regularHours.toFixed(2)),
    overtimeHours: Number(overtimeHours.toFixed(2)),
    daysWorked,
    averageHoursPerDay,
    activeShiftsCount: activeCount,
  };
}

// ==============================
// SEEDING DEFAULT DATA
// ==============================

export async function seedInitialDataIfEmpty(): Promise<boolean> {
  try {
    const existingEmployees = await getEmployees();
    if (existingEmployees.length > 0) {
      // Normalize existing employees to department WALT
      for (const emp of existingEmployees) {
        if (emp.department !== 'WALT') {
          await updateDoc(doc(db, EMPLOYEES_COLLECTION, emp.id), {
            department: 'WALT',
          });
        }
      }
      return false;
    }

    // 1. Seed Demo Employees with department WALT and no hourlyRate
    const seedEmployees: Omit<Employee, 'id' | 'createdAt'>[] = [
      {
        employeeId: 'EMP-ADMIN',
        name: 'HR Administrator',
        email: 'cmanansala@sts.partner.rellatrix.com',
        department: 'WALT',
        role: 'admin',
        pin: '1234',
        isActive: true,
      },
      {
        employeeId: 'EMP-1001',
        name: 'Sarah Jenkins',
        email: 'sarah.jenkins@company.com',
        department: 'WALT',
        role: 'employee',
        pin: '1001',
        isActive: true,
      },
      {
        employeeId: 'EMP-1002',
        name: 'Marcus Vance',
        email: 'marcus.vance@company.com',
        department: 'WALT',
        role: 'employee',
        pin: '1002',
        isActive: true,
      },
      {
        employeeId: 'EMP-1003',
        name: 'Elena Rostova',
        email: 'elena.rostova@company.com',
        department: 'WALT',
        role: 'employee',
        pin: '1003',
        isActive: true,
      },
      {
        employeeId: 'EMP-1004',
        name: 'David Chen',
        email: 'david.chen@company.com',
        department: 'WALT',
        role: 'employee',
        pin: '1004',
        isActive: true,
      },
    ];

    for (const emp of seedEmployees) {
      await createEmployee(emp);
    }

    const baseDate = new Date();
    const currentYear = baseDate.getFullYear();
    const currentMonth = baseDate.getMonth();
    const todayDay = baseDate.getDate();

    const sampleDates = [
      Math.max(1, todayDay - 10),
      Math.max(1, todayDay - 8),
      Math.max(1, todayDay - 7),
      Math.max(1, todayDay - 6),
      Math.max(1, todayDay - 5),
      Math.max(1, todayDay - 4),
      Math.max(1, todayDay - 3),
      Math.max(1, todayDay - 2),
      Math.max(1, todayDay - 1),
    ];

    const attendanceRecordsToSeed: AttendanceRecord[] = [];

    sampleDates.forEach((day, idx) => {
      const d = new Date(currentYear, currentMonth, day);
      const dateStr = d.toISOString().slice(0, 10);
      const inTime = new Date(currentYear, currentMonth, day, 8, 55 + (idx % 10)).toISOString();
      const outTime = new Date(currentYear, currentMonth, day, 17, 30 + (idx % 25)).toISOString();
      const breakMins = 45;
      const hours = calculateWorkHours(inTime, outTime, breakMins);

      attendanceRecordsToSeed.push({
        id: `att_EMP-1001_${d.getTime()}`,
        employeeId: 'EMP-1001',
        employeeName: 'Sarah Jenkins',
        department: 'WALT',
        date: dateStr,
        clockInTime: inTime,
        clockOutTime: outTime,
        breakDurationMinutes: breakMins,
        totalHours: hours,
        status: 'completed',
        notes: idx === 2 ? 'Sprint planning & core database deployment' : 'Standard dev shift',
        location: 'HQ Building A',
        updatedAt: outTime,
      });
    });

    sampleDates.slice(2).forEach((day, idx) => {
      const d = new Date(currentYear, currentMonth, day);
      const dateStr = d.toISOString().slice(0, 10);
      const isDiscrepancy = idx === 1;

      const inTime = new Date(currentYear, currentMonth, day, 9, 15).toISOString();
      const outTime = new Date(currentYear, currentMonth, day, 18, 0).toISOString();
      const breakMins = 60;
      const hours = calculateWorkHours(inTime, outTime, breakMins);

      attendanceRecordsToSeed.push({
        id: `att_EMP-1002_${d.getTime()}`,
        employeeId: 'EMP-1002',
        employeeName: 'Marcus Vance',
        department: 'WALT',
        date: dateStr,
        clockInTime: inTime,
        clockOutTime: outTime,
        breakDurationMinutes: breakMins,
        totalHours: hours,
        status: isDiscrepancy ? 'adjusted' : 'completed',
        isAdjusted: isDiscrepancy,
        adjustedBy: isDiscrepancy ? 'EMP-ADMIN (HR)' : undefined,
        adjustmentReason: isDiscrepancy ? 'Forgot badge at entrance; clock-in adjusted by supervisor.' : undefined,
        originalClockInTime: isDiscrepancy ? new Date(currentYear, currentMonth, day, 10, 45).toISOString() : undefined,
        notes: isDiscrepancy ? 'Discrepancy verified via security gate logs.' : 'UX prototype reviews',
        location: 'Remote Workstation',
        updatedAt: outTime,
      });
    });

    sampleDates.slice(3).forEach((day) => {
      const d = new Date(currentYear, currentMonth, day);
      const dateStr = d.toISOString().slice(0, 10);
      const inTime = new Date(currentYear, currentMonth, day, 8, 30).toISOString();
      const outTime = new Date(currentYear, currentMonth, day, 17, 0).toISOString();
      const breakMins = 30;
      const hours = calculateWorkHours(inTime, outTime, breakMins);

      attendanceRecordsToSeed.push({
        id: `att_EMP-1003_${d.getTime()}`,
        employeeId: 'EMP-1003',
        employeeName: 'Elena Rostova',
        department: 'WALT',
        date: dateStr,
        clockInTime: inTime,
        clockOutTime: outTime,
        breakDurationMinutes: breakMins,
        totalHours: hours,
        status: 'completed',
        notes: 'Enterprise client onboarding',
        location: 'HQ Floor 3',
        updatedAt: outTime,
      });
    });

    const todayDateStr = baseDate.toISOString().slice(0, 10);
    const activeInTime = new Date(baseDate.getTime() - 2.5 * 3600 * 1000).toISOString();
    attendanceRecordsToSeed.push({
      id: `att_EMP-1003_today_active`,
      employeeId: 'EMP-1003',
      employeeName: 'Elena Rostova',
      department: 'WALT',
      date: todayDateStr,
      clockInTime: activeInTime,
      clockOutTime: null,
      breakDurationMinutes: 0,
      totalHours: calculateWorkHours(activeInTime, null, 0),
      status: 'active',
      notes: 'Morning shift',
      location: 'HQ Floor 3',
      updatedAt: activeInTime,
    });

    for (const rec of attendanceRecordsToSeed) {
      await setDoc(doc(db, ATTENDANCE_COLLECTION, rec.id), rec);
    }

    return true;
  } catch (err) {
    console.error('Error seeding data:', err);
    return false;
  }
}
