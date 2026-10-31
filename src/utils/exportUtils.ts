import { jsPDF } from 'jspdf';
import { AttendanceRecord } from '../types';

export function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
}

export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return '--:--';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Exports attendance records to clean CSV file
 */
export function exportToCSV(records: AttendanceRecord[], filename = 'attendance_records.csv') {
  const headers = [
    'Record ID',
    'Date',
    'Employee ID',
    'Employee Name',
    'Clock In',
    'Clock Out',
    'Break (Minutes)',
    'Total Hours',
    'Status',
    'Adjusted',
    'Adjustment Reason',
    'Adjusted By',
    'Notes',
  ];

  const rows = records.map((r) => [
    `"${r.id}"`,
    `"${r.date}"`,
    `"${r.employeeId}"`,
    `"${r.employeeName.replace(/"/g, '""')}"`,
    `"${r.clockInTime ? new Date(r.clockInTime).toLocaleString() : ''}"`,
    `"${r.clockOutTime ? new Date(r.clockOutTime).toLocaleString() : 'Active / Pending'}"`,
    r.breakDurationMinutes || 0,
    r.totalHours ? r.totalHours.toFixed(2) : '0.00',
    `"${r.status}"`,
    r.isAdjusted ? 'YES' : 'NO',
    `"${(r.adjustmentReason || '').replace(/"/g, '""')}"`,
    `"${(r.adjustedBy || '').replace(/"/g, '""')}"`,
    `"${(r.notes || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exports formatted official payroll timesheet PDF
 */
export function exportToPDF(
  records: AttendanceRecord[],
  title = 'Employee Attendance & Timesheet Report',
  subtitle = 'Payroll Period Summary'
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 40;

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 80, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('CHRONOS ATTENDANCE SYSTEM', 40, 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Official Time & Attendance Records • Exported: ${new Date().toLocaleString()}`, 40, 56);

  currentY = 110;

  // Title & Metadata
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(title, 40, currentY);

  currentY += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(subtitle, 40, currentY);

  currentY += 24;

  // Summary Metrics Box
  const totalHoursWorked = records.reduce((acc, cur) => acc + (cur.totalHours || 0), 0);
  const totalAdjusted = records.filter((r) => r.isAdjusted).length;
  const distinctEmployees = new Set(records.map((r) => r.employeeId)).size;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(40, currentY, pageWidth - 80, 50, 6, 6, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('TOTAL EMPLOYEES', 60, currentY + 20);
  doc.text('TOTAL LOGS', 200, currentY + 20);
  doc.text('TOTAL HOURS WORKED', 340, currentY + 20);
  doc.text('ADJUSTED SHIFTS', 470, currentY + 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(`${distinctEmployees}`, 60, currentY + 38);
  doc.text(`${records.length}`, 200, currentY + 38);
  doc.text(`${totalHoursWorked.toFixed(2)} hrs`, 340, currentY + 38);
  doc.text(`${totalAdjusted}`, 470, currentY + 38);

  currentY += 75;

  // Table Columns
  // Date | Employee | In | Out | Break | Total | Status
  const cols = [
    { header: 'Date', x: 40, width: 65 },
    { header: 'Emp ID & Name', x: 105, width: 140 },
    { header: 'Clock In', x: 245, width: 65 },
    { header: 'Clock Out', x: 310, width: 65 },
    { header: 'Break', x: 375, width: 45 },
    { header: 'Hours', x: 420, width: 50 },
    { header: 'Status / Audit', x: 470, width: 85 },
  ];

  // Header Row
  doc.setFillColor(241, 245, 249);
  doc.rect(40, currentY - 12, pageWidth - 80, 20, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);

  cols.forEach((col) => {
    doc.text(col.header, col.x, currentY);
  });

  currentY += 16;
  doc.setDrawColor(203, 213, 225);
  doc.line(40, currentY - 6, pageWidth - 40, currentY - 6);

  // Table Content
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  records.forEach((rec) => {
    // Check if new page needed
    if (currentY > 780) {
      doc.addPage();
      currentY = 40;
      // Repeat header
      doc.setFillColor(241, 245, 249);
      doc.rect(40, currentY - 12, pageWidth - 80, 20, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      cols.forEach((col) => doc.text(col.header, col.x, currentY));
      currentY += 16;
      doc.line(40, currentY - 6, pageWidth - 40, currentY - 6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
    }

    doc.setTextColor(51, 65, 85);

    // Date
    doc.text(rec.date, cols[0].x, currentY);

    // Emp ID & Name
    const nameStr = `${rec.employeeId} - ${rec.employeeName}`;
    const truncatedName = nameStr.length > 24 ? nameStr.substring(0, 23) + '…' : nameStr;
    doc.text(truncatedName, cols[1].x, currentY);

    // Clock In
    const inTime = rec.clockInTime ? new Date(rec.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--';
    doc.text(inTime, cols[2].x, currentY);

    // Clock Out
    const outTime = rec.clockOutTime ? new Date(rec.clockOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending';
    doc.text(outTime, cols[3].x, currentY);

    // Break
    doc.text(`${rec.breakDurationMinutes || 0}m`, cols[4].x, currentY);

    // Hours
    doc.setFont('helvetica', 'bold');
    doc.text(`${(rec.totalHours || 0).toFixed(2)}h`, cols[5].x, currentY);
    doc.setFont('helvetica', 'normal');

    // Status & Adjustment note
    let statusLabel = rec.status.toUpperCase();
    if (rec.isAdjusted) {
      statusLabel += ' (ADJ)';
      doc.setTextColor(180, 83, 9); // amber
    } else if (rec.status === 'active') {
      doc.setTextColor(16, 185, 129); // green
    } else {
      doc.setTextColor(71, 85, 105);
    }
    doc.text(statusLabel, cols[6].x, currentY);

    currentY += 18;
  });

  // Footer Signature Block on last page
  currentY = Math.max(currentY + 30, 720);
  if (currentY > 770) {
    doc.addPage();
    currentY = 100;
  }

  doc.setDrawColor(148, 163, 184);
  doc.line(50, currentY + 30, 220, currentY + 30);
  doc.line(pageWidth - 220, currentY + 30, pageWidth - 50, currentY + 30);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Employee Signature', 50, currentY + 44);
  doc.text('Supervisor / HR Signature', pageWidth - 220, currentY + 44);

  doc.save(`${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
