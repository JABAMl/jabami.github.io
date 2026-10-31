import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Trash2,
  Edit2,
  ShieldCheck,
  User,
  Search,
  Key,
  CheckCircle,
  Eye,
  EyeOff,
  AlertTriangle,
  X,
  Sparkles,
  Building2,
} from 'lucide-react';
import { Employee, UserRole } from '../types';
import { createEmployee, updateEmployee, deleteEmployee } from '../services/attendanceService';

interface EmployeeDirectoryProps {
  currentAdmin: Employee;
  employees: Employee[];
  onRefresh: () => Promise<void>;
}

export const EmployeeDirectory: React.FC<EmployeeDirectoryProps> = ({
  currentAdmin,
  employees,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states for Add Employee (NO hourly rate, department is strictly WALT)
  const [name, setName] = useState<string>('');
  const [employeeId, setEmployeeId] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [role, setRole] = useState<UserRole>('employee');
  const [pin, setPin] = useState<string>('1234');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const togglePinReveal = (id: string) => {
    setRevealedPins((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Auto-generate next Employee ID
  const handleAutoGenerateId = () => {
    const existingIds = employees
      .map((e) => {
        const match = e.employeeId.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
      })
      .filter((n) => !isNaN(n));
    const maxNum = existingIds.length > 0 ? Math.max(...existingIds) : 1000;
    setEmployeeId(`EMP-${maxNum + 1}`);
  };

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          emp.name.toLowerCase().includes(q) ||
          emp.employeeId.toLowerCase().includes(q) ||
          emp.email.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (roleFilter !== 'all' && emp.role !== roleFilter) {
        return false;
      }
      return true;
    });
  }, [employees, searchQuery, roleFilter]);

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !employeeId.trim() || !pin.trim()) {
      alert('Please fill out all required fields.');
      return;
    }

    const normalized = employeeId.trim().toUpperCase();
    if (employees.some((e) => e.employeeId === normalized)) {
      alert(`Employee ID ${normalized} is already assigned to another team member.`);
      return;
    }

    try {
      setSaving(true);
      await createEmployee({
        name: name.trim(),
        employeeId: normalized,
        email: email.trim() || `${normalized.toLowerCase()}@company.com`,
        department: 'WALT', // Strictly WALT
        role,
        pin: pin.trim(),
        isActive: true,
      });

      setShowAddModal(false);
      setName('');
      setEmployeeId('');
      setEmail('');
      setPin('1234');
      showToast(`Employee ${name} (${normalized}) was added to department WALT successfully.`);
      await onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to create employee');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    try {
      setSaving(true);
      await updateEmployee(editingEmployee.id, {
        name: editingEmployee.name,
        department: 'WALT',
        email: editingEmployee.email,
        role: editingEmployee.role,
        pin: editingEmployee.pin,
        isActive: editingEmployee.isActive,
      });

      setEditingEmployee(null);
      showToast(`Updated details for ${editingEmployee.name}.`);
      await onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update employee');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEmployee = async () => {
    if (!deletingEmployee) return;
    if (deletingEmployee.employeeId === currentAdmin.employeeId) {
      alert('You cannot delete your own currently active administrator account.');
      setDeletingEmployee(null);
      return;
    }

    try {
      setSaving(true);
      await deleteEmployee(deletingEmployee.id);
      showToast(`Employee ${deletingEmployee.name} was removed from the system.`);
      setDeletingEmployee(null);
      await onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete employee');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-2xl flex items-center space-x-3 shadow-lg shadow-emerald-500/10">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-sm font-medium">{toastMessage}</p>
        </div>
      )}

      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-3xl p-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
              Admin Control
            </span>
            <span className="text-xs text-slate-400">Department: WALT • Team Directory</span>
          </div>
          <h1 className="text-2xl font-black text-white mt-1">Employee Directory</h1>
        </div>

        <button
          onClick={() => {
            handleAutoGenerateId();
            setShowAddModal(true);
          }}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Team Member</span>
        </button>
      </div>

      {/* Search and Role Filter */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by name, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-600"
          />
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Department: <strong className="text-white">WALT</strong></span>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400 text-xs">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
            >
              <option value="all">All Roles ({employees.length})</option>
              <option value="employee">Employees</option>
              <option value="admin">Administrators</option>
            </select>
          </div>
        </div>
      </div>

      {/* Employee Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEmployees.map((emp) => {
          const isMe = emp.employeeId === currentAdmin.employeeId;
          const isPinRevealed = revealedPins[emp.id];

          return (
            <div
              key={emp.id}
              className="bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 rounded-3xl p-5 space-y-4 transition-all shadow-md relative"
            >
              {/* Header: Role and Status */}
              <div className="flex items-center justify-between">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                    emp.role === 'admin'
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      : 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                  }`}
                >
                  {emp.role === 'admin' ? (
                    <>
                      <ShieldCheck className="w-3 h-3 text-amber-400" /> Administrator
                    </>
                  ) : (
                    <>
                      <User className="w-3 h-3 text-indigo-400" /> Employee
                    </>
                  )}
                </span>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    emp.isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {emp.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Name & ID */}
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                  {emp.name}
                  {isMe && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-normal">
                      You
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                  <span>{emp.employeeId}</span>
                  <span>•</span>
                  <span className="text-indigo-400 font-semibold">Dept: WALT</span>
                </p>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">{emp.email}</p>
              </div>

              {/* Details: Department & PIN (NO hourly rate) */}
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] block font-medium">Department</span>
                  <span className="text-indigo-300 font-bold font-mono">
                    WALT
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 text-[10px] block font-medium">Login PIN</span>
                  <div className="flex items-center space-x-1.5 mt-0.5">
                    <span className="font-mono text-slate-300 font-bold">
                      {isPinRevealed ? emp.pin : '••••'}
                    </span>
                    <button
                      onClick={() => togglePinReveal(emp.id)}
                      className="text-slate-500 hover:text-slate-300 cursor-pointer"
                      title={isPinRevealed ? 'Hide PIN' : 'Reveal PIN'}
                    >
                      {isPinRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800/60">
                <button
                  onClick={() => setEditingEmployee({ ...emp })}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Edit</span>
                </button>

                {!isMe && (
                  <button
                    onClick={() => setDeletingEmployee(emp)}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/30 transition-colors cursor-pointer"
                    title="Remove Employee"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Employee Modal (NO HOURLY RATE, DEPARTMENT IS WALT) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Add New Team Member</h3>
                  <p className="text-xs text-slate-400">Department: WALT • Assign unique Employee ID & PIN</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Full Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Rachel Adams"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-400 font-semibold">Unique Employee ID *</label>
                    <button
                      type="button"
                      onClick={handleAutoGenerateId}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-0.5 cursor-pointer"
                    >
                      <Sparkles className="w-2.5 h-2.5" /> Auto-gen
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. EMP-1005"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="rachel.adams@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Department</label>
                  <div className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2 text-indigo-300 font-bold font-mono flex items-center justify-between">
                    <span>WALT</span>
                    <span className="text-[10px] text-slate-500 uppercase font-normal">Single Dept</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="employee">Employee</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">4-Digit PIN *</label>
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="1234"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
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
                  {saving ? 'Creating...' : 'Add Team Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal (NO HOURLY RATE, DEPARTMENT IS WALT) */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Edit Team Member</h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {editingEmployee.employeeId} • {editingEmployee.name}
                  </p>
                </div>
              </div>
              <button onClick={() => setEditingEmployee(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateEmployee} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Full Name</label>
                  <input
                    type="text"
                    value={editingEmployee.name}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Department</label>
                  <div className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2 text-indigo-300 font-bold font-mono">
                    WALT
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    value={editingEmployee.email}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Reset 4-Digit PIN</label>
                  <input
                    type="text"
                    value={editingEmployee.pin}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, pin: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Role</label>
                  <select
                    value={editingEmployee.role}
                    onChange={(e) =>
                      setEditingEmployee({ ...editingEmployee, role: e.target.value as UserRole })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="employee">Employee</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Status</label>
                  <select
                    value={editingEmployee.isActive ? 'active' : 'inactive'}
                    onChange={(e) =>
                      setEditingEmployee({
                        ...editingEmployee,
                        isActive: e.target.value === 'active',
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="w-1/2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-1/2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Remove Employee?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Are you sure you want to remove <span className="font-bold text-white">{deletingEmployee.name}</span> ({deletingEmployee.employeeId}) from department WALT?
              </p>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <button
                onClick={() => setDeletingEmployee(null)}
                className="w-1/2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteEmployee}
                disabled={saving}
                className="w-1/2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer"
              >
                {saving ? 'Removing...' : 'Yes, Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
