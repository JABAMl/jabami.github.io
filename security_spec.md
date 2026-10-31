# Security Specification

## Data Invariants
1. An Attendance Record cannot exist without a valid, non-empty `employeeId` and `date`.
2. A clock-out time, if present, cannot chronologically precede the clock-in time.
3. Only administrative users can adjust existing completed records or delete attendance records.
4. Employees can only write their own clock-in / clock-out punches.
5. All employee records require a unique `employeeId` adhering to `^[a-zA-Z0-9_\-]+$`.

## The "Dirty Dozen" Payloads (Negative Tests)
1. Injecting 2MB payload into employee name or notes to trigger wallet denial.
2. Clock-out with timestamp earlier than clock-in.
3. Employee altering another user's timesheet hours.
4. Employee granting themselves admin role in employees collection.
5. Deleting attendance records without admin authorization.
6. Submitting ghost fields (e.g. `isSuperAdminOverride: true`).
7. Clocking in with an invalid/spoofed employee ID.
8. Updating a locked/finalized timesheet without admin credentials.
9. Invalid document ID paths containing script tags or path traversals.
10. Unauthenticated read of sensitive employee payroll/PIN data.
11. Setting negative break minutes or negative work hours.
12. Tampering with adjustment audit trails.
