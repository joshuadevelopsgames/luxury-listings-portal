/**
 * EmployeeDetailsModal - Reusable employee details popup (PersonCard, leave, edit).
 * Use from Team Management or via EmployeeLink from any page that lists team members.
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import PersonCard from './PersonCard';
import { supabaseService } from '../services/supabaseService';
import {
  Users,
  Edit,
  XCircle,
  Calendar
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const DEPARTMENTS = ['Executive', 'Content Team', 'Design Team', 'Sales', 'Marketing', 'Operations', 'HR', 'IT', 'Finance', 'General'];

/** Always return complete vacation/sick/remote buckets (avoids crash when state is partial). */
function normalizeLeaveEditForm(form) {
  const f = form && typeof form === 'object' ? form : {};
  const num = (v, fallback) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };
  return {
    vacation: { total: num(f.vacation?.total, 15), used: num(f.vacation?.used, 0) },
    sick: { total: num(f.sick?.total, 3), used: num(f.sick?.used, 0) },
    remote: { total: num(f.remote?.total, 10), used: num(f.remote?.used, 0) },
  };
}

function normalizeToEmployee(user) {
  if (!user) return null;
  const name = user.name || user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
  return {
    ...user,
    name,
    firstName: user.firstName ?? name.split(' ')[0] ?? '',
    lastName: user.lastName ?? name.split(' ').slice(1).join(' ') ?? '',
    email: user.email || user.id,
    id: user.id || user.email,
    leaveBalance: user.leaveBalance || null,
    department: user.department || 'General',
    position: user.position || user.role || 'Team Member',
    startDate: user.startDate || (user.createdAt?.toDate?.()?.toISOString?.()?.split('T')[0] || ''),
    manager: user.manager || '',
    employeeId: user.employeeId || '',
    address: user.address || user.location || 'Not provided',
    location: user.location ?? user.address ?? '',
    phone: user.phone || ''
  };
}

const emailRegex = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/;

const EmployeeDetailsModal = ({ user: userProp, onClose, onEmployeeUpdate, startInEditMode = false }) => {
  const { currentRole } = useAuth();
  const canManageEmployeeProfiles = true;
  const isHRManager = currentRole === 'hr_manager';
  const canEdit = isHRManager || canManageEmployeeProfiles;
  const canEditLeave = canEdit;
  const canViewLeaveBalance = canEdit;

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(startInEditMode);
  const [editProfileForm, setEditProfileForm] = useState({ firstName: '', lastName: '', department: '', phone: '', location: '', position: '', manager: '', startDate: '' });
  const [editLeaveForm, setEditLeaveForm] = useState({
    vacation: { total: 15, used: 0 },
    sick: { total: 3, used: 0 },
    remote: { total: 10, used: 0 }
  });
  const [saving, setSaving] = useState(false);
  const [isEditingLeave, setIsEditingLeave] = useState(false);
  const [savingLeave, setSavingLeave] = useState(false);
  const leaveEdit = normalizeLeaveEditForm(editLeaveForm);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const base = normalizeToEmployee(userProp);
      if (!base?.email) {
        setEmployee(base);
        setLoading(false);
        return;
      }
      if (!base.leaveBalance && canViewLeaveBalance) {
        try {
          const leaveBalance = await supabaseService.getUserLeaveBalances(base.email);
          if (!cancelled) setEmployee({ ...base, leaveBalance });
        } catch (e) {
          if (!cancelled) setEmployee({ ...base, leaveBalance: { vacation: { total: 15, used: 0, remaining: 15 }, sick: { total: 3, used: 0, remaining: 3 } } });
        }
      } else {
        setEmployee(base);
      }
      if (!cancelled) setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [userProp?.id, userProp?.email, canViewLeaveBalance]);

  useEffect(() => {
    if (!employee || !isEditMode) return;
    setEditProfileForm({
      firstName: employee.firstName ?? employee.name?.split(' ')[0] ?? '',
      lastName: employee.lastName ?? employee.name?.split(' ').slice(1).join(' ') ?? '',
      department: employee.department ?? '',
      phone: employee.phone ?? '',
      location: employee.location ?? employee.address ?? '',
      position: employee.position ?? '',
      manager: employee.manager ?? '',
      startDate: employee.startDate ?? ''
    });
    setEditLeaveForm(
      normalizeLeaveEditForm({
        vacation: employee.leaveBalance?.vacation,
        sick: employee.leaveBalance?.sick,
        remote: employee.leaveBalance?.remote,
      })
    );
  }, [employee?.email, isEditMode]);

  const openEditMode = () => {
    if (!employee) return;
    setEditProfileForm({
      firstName: employee.firstName ?? employee.name?.split(' ')[0] ?? '',
      lastName: employee.lastName ?? employee.name?.split(' ').slice(1).join(' ') ?? '',
      department: employee.department ?? '',
      phone: employee.phone ?? '',
      location: employee.location ?? employee.address ?? '',
      position: employee.position ?? '',
      manager: employee.manager ?? '',
      startDate: employee.startDate ?? ''
    });
    setEditLeaveForm(
      normalizeLeaveEditForm({
        vacation: employee.leaveBalance?.vacation,
        sick: employee.leaveBalance?.sick,
        remote: employee.leaveBalance?.remote,
      })
    );
    setIsEditMode(true);
  };

  const saveAll = async () => {
    if (!employee?.email || !emailRegex.test(employee.email)) {
      toast.error("Invalid employee email. Cannot save changes.");
      setSaving(false);
      return;
    }
    setSaving(true);
    try {
      const displayName = `${editProfileForm.firstName} ${editProfileForm.lastName}`.trim();
      await supabaseService.updateApprovedUser(employee.email, {
        firstName: editProfileForm.firstName,
        lastName: editProfileForm.lastName,
        displayName: displayName || employee.name,
        department: editProfileForm.department,
        phone: editProfileForm.phone,
        location: editProfileForm.location,
        position: editProfileForm.position,
        manager: editProfileForm.manager,
        startDate: editProfileForm.startDate
      });
      const bal = normalizeLeaveEditForm(editLeaveForm);
      await supabaseService.updateUserLeaveBalances(employee.email, bal);
      const nextLeave = {
        vacation: { ...bal.vacation, remaining: bal.vacation.total - bal.vacation.used },
        sick: { ...bal.sick, remaining: bal.sick.total - bal.sick.used },
        remote: { ...bal.remote, remaining: bal.remote.total - bal.remote.used }
      };
      const updated = {
        ...employee,
        firstName: editProfileForm.firstName,
        lastName: editProfileForm.lastName,
        name: displayName || employee.name,
        displayName: displayName || employee.name,
        department: editProfileForm.department,
        phone: editProfileForm.phone,
        location: editProfileForm.location,
        address: editProfileForm.location,
        position: editProfileForm.position,
        manager: editProfileForm.manager,
        startDate: editProfileForm.startDate,
        leaveBalance: nextLeave
      };
      setEmployee(updated);
      onEmployeeUpdate?.(updated);
      toast.success(`Updated profile and leave for ${updated.name}`);
      setIsEditMode(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const saveLeaveOnly = async () => {
    if (!employee?.email) return;
    setSavingLeave(true);
    try {
      const bal = normalizeLeaveEditForm(editLeaveForm);
      await supabaseService.updateUserLeaveBalances(employee.email, bal);
      const nextLeave = {
        vacation: { ...bal.vacation, remaining: bal.vacation.total - bal.vacation.used },
        sick: { ...bal.sick, remaining: bal.sick.total - bal.sick.used },
        remote: { ...bal.remote, remaining: bal.remote.total - bal.remote.used }
      };
      setEmployee((prev) => ({ ...prev, leaveBalance: nextLeave }));
      onEmployeeUpdate?.({ ...employee, leaveBalance: nextLeave });
      toast.success('Leave balance updated');
      setIsEditingLeave(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update leave balance');
    } finally {
      setSavingLeave(false);
    }
  };

  if (!userProp) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-[#f5f5f7] dark:bg-[#1c1c1e] rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-black/5 dark:border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl border-b border-black/5 dark:border-white/10 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0071e3] to-[#5856d6] flex items-center justify-center shadow-lg shadow-[#0071e3]/20">
                <Users className="w-5 h-5 text-white" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">Employee Details</h2>
                {loading ? (
                  <p className="text-[13px] text-[#86868b]">Loading...</p>
                ) : employee ? (
                  <p className="text-[13px] text-[#86868b] flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-[#1d1d1f] dark:text-white">{employee.name}</span>
                    {(employee.uid || employee.id || employee.email) && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#5856d6]/10 text-[#5856d6] font-mono">
                        USR-{String(employee.uid || employee.id || employee.email).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0).toString().slice(-4).padStart(4, '0')}
                      </span>
                    )}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {isEditMode && employee ? (
                <>
                  <button type="button" onClick={() => setIsEditMode(false)} disabled={saving} className="px-3 py-1.5 rounded-lg text-[14px] font-medium text-[#86868b] hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-50">Cancel</button>
                  <button type="button" onClick={saveAll} disabled={saving} className="px-3 py-1.5 rounded-lg bg-[#0071e3] text-white text-[14px] font-medium hover:bg-[#0077ed] transition-colors disabled:opacity-50 flex items-center gap-2">
                    {saving ? (<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</>) : 'Save'}
                  </button>
                </>
              ) : canEdit && employee ? (
                <button type="button" onClick={openEditMode} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors" title="Edit profile and leave">
                  <Edit className="w-5 h-5 text-[#86868b]" strokeWidth={1.5} />
                </button>
              ) : null}
              <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                <XCircle className="w-5 h-5 text-[#86868b]" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-[#86868b]">Loading...</div>
        ) : !employee ? (
          <div className="p-8 text-center text-[#86868b]">Could not load employee.</div>
        ) : isEditMode ? (
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
            <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-black/5 dark:border-white/10 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0071e3] to-[#5856d6] flex items-center justify-center shadow-lg shadow-[#0071e3]/20">
                  <Edit className="w-4 h-4 text-white" strokeWidth={1.5} />
                </div>
                <h3 className="font-semibold text-[17px] text-[#1d1d1f] dark:text-white">Edit Employee</h3>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-medium text-[#86868b] mb-1.5">First Name</label>
                    <input type="text" value={editProfileForm.firstName} onChange={(e) => setEditProfileForm((p) => ({ ...p, firstName: e.target.value }))} placeholder="First name" className="w-full h-10 px-3 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]" />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-[#86868b] mb-1.5">Last Name</label>
                    <input type="text" value={editProfileForm.lastName} onChange={(e) => setEditProfileForm((p) => ({ ...p, lastName: e.target.value }))} placeholder="Last name" className="w-full h-10 px-3 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]" />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-[#86868b] mb-1.5">Email</label>
                    <div className="h-10 px-3 flex items-center text-[14px] rounded-xl bg-black/[0.04] dark:bg-white/5 text-[#86868b]">{employee.email}</div>
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-[#86868b] mb-1.5">Phone</label>
                    <input type="tel" value={editProfileForm.phone} onChange={(e) => setEditProfileForm((p) => ({ ...p, phone: e.target.value }))} placeholder="Phone" className="w-full h-10 px-3 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]" />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-[#86868b] mb-1.5">Department</label>
                    <select value={editProfileForm.department} onChange={(e) => setEditProfileForm((p) => ({ ...p, department: e.target.value }))} className="w-full h-10 px-3 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]">
                      <option value="">Select department...</option>
                      {DEPARTMENTS.map((d) => (<option key={d} value={d}>{d}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-[#86868b] mb-1.5">Position</label>
                    <input type="text" value={editProfileForm.position} onChange={(e) => setEditProfileForm((p) => ({ ...p, position: e.target.value }))} placeholder="e.g. social_media_manager" className="w-full h-10 px-3 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]" />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-[#86868b] mb-1.5">Employee ID</label>
                    <div className="h-10 px-3 flex items-center text-[14px] rounded-xl bg-black/[0.04] dark:bg-white/5 text-[#86868b]">{employee.employeeId || 'Not assigned'}</div>
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-[#86868b] mb-1.5">Manager</label>
                    <input type="text" value={editProfileForm.manager} onChange={(e) => setEditProfileForm((p) => ({ ...p, manager: e.target.value }))} placeholder="Manager name or email" className="w-full h-10 px-3 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]" />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-[#86868b] mb-1.5">Start Date</label>
                    <input type="date" value={editProfileForm.startDate} onChange={(e) => setEditProfileForm((p) => ({ ...p, startDate: e.target.value }))} className="w-full h-10 px-3 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]" />
                  </div>
                </div>
                {canViewLeaveBalance && (
                <div className="border-t border-black/5 dark:border-white/10 pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="w-4 h-4 text-[#0071e3]" strokeWidth={1.5} />
                    <h4 className="text-[14px] font-semibold text-[#1d1d1f] dark:text-white">Leave Balance</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-black/5 dark:bg-white/5 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-3 h-3 rounded-full bg-[#0071e3]" />
                        <span className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">Vacation</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[12px] font-medium text-[#86868b] mb-1">Total</label>
                          <input type="number" min="0" value={editLeaveForm.vacation.total} onChange={(e) => setEditLeaveForm((p) => ({ ...p, vacation: { ...p.vacation, total: parseInt(e.target.value, 10) || 0 } }))} className="w-full h-10 px-3 text-[14px] rounded-xl bg-white dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]" />
                        </div>
                        <div>
                          <label className="block text-[12px] font-medium text-[#86868b] mb-1">Used</label>
                          <input type="number" min="0" value={editLeaveForm.vacation.used} onChange={(e) => setEditLeaveForm((p) => ({ ...p, vacation: { ...p.vacation, used: parseInt(e.target.value, 10) || 0 } }))} className="w-full h-10 px-3 text-[14px] rounded-xl bg-white dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]" />
                        </div>
                      </div>
                      <p className="text-[11px] text-[#86868b] mt-2">Remaining: {editLeaveForm.vacation.total - editLeaveForm.vacation.used} days</p>
                    </div>
                    <div className="bg-black/5 dark:bg-white/5 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-3 h-3 rounded-full bg-[#ff3b30]" />
                        <span className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">Sick</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[12px] font-medium text-[#86868b] mb-1">Total</label>
                          <input type="number" min="0" value={editLeaveForm.sick.total} onChange={(e) => setEditLeaveForm((p) => ({ ...p, sick: { ...p.sick, total: parseInt(e.target.value, 10) || 0 } }))} className="w-full h-10 px-3 text-[14px] rounded-xl bg-white dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]" />
                        </div>
                        <div>
                          <label className="block text-[12px] font-medium text-[#86868b] mb-1">Used</label>
                          <input type="number" min="0" value={editLeaveForm.sick.used} onChange={(e) => setEditLeaveForm((p) => ({ ...p, sick: { ...p.sick, used: parseInt(e.target.value, 10) || 0 } }))} className="w-full h-10 px-3 text-[14px] rounded-xl bg-white dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]" />
                        </div>
                      </div>
                      <p className="text-[11px] text-[#86868b] mt-2">Remaining: {editLeaveForm.sick.total - editLeaveForm.sick.used} days</p>
                    </div>
                    <div className="bg-black/5 dark:bg-white/5 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-3 h-3 rounded-full bg-[#5856d6]" />
                        <span className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">Remote</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[12px] font-medium text-[#86868b] mb-1">Total</label>
                          <input type="number" min="0" value={editLeaveForm.remote.total} onChange={(e) => setEditLeaveForm((p) => ({ ...p, remote: { ...p.remote, total: parseInt(e.target.value, 10) || 0 } }))} className="w-full h-10 px-3 text-[14px] rounded-xl bg-white dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5856d6]" />
                        </div>
                        <div>
                          <label className="block text-[12px] font-medium text-[#86868b] mb-1">Used</label>
                          <input type="number" min="0" value={editLeaveForm.remote.used} onChange={(e) => setEditLeaveForm((p) => ({ ...p, remote: { ...p.remote, used: parseInt(e.target.value, 10) || 0 } }))} className="w-full h-10 px-3 text-[14px] rounded-xl bg-white dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5856d6]" />
                        </div>
                      </div>
                      <p className="text-[11px] text-[#86868b] mt-2">Remaining: {editLeaveForm.remote.total - editLeaveForm.remote.used} days</p>
                    </div>
                  </div>
                </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-80px)]">
            <PersonCard
              person={{
                firstName: employee.firstName ?? employee.name.split(' ')[0],
                lastName: employee.lastName ?? employee.name.split(' ').slice(1).join(' '),
                email: employee.email,
                phone: employee.phone,
                address: employee.address || employee.location || 'Not provided',
                department: employee.department,
                position: employee.position,
                manager: employee.manager,
                startDate: employee.startDate,
                employeeId: employee.employeeId
              }}
              editable={false}
              isHRView={canEdit}
              onSave={async (updatedData) => {
                try {
                   if (!employee.email || !emailRegex.test(employee.email)) {
                     toast.error("Invalid employee email. Cannot save changes.");
                     throw new Error("Invalid employee email");
                   }
                   await supabaseService.updateApprovedUser(employee.email, { ...updatedData, displayName: `${updatedData.firstName || ''} ${updatedData.lastName || ''}`.trim(), location: updatedData.address ?? updatedData.location });
                  const emp = await supabaseService.getEmployeeByEmail(employee.email);
                  if (emp) await supabaseService.updateEmployee(emp.id, updatedData);
                  else await supabaseService.addEmployee({ firstName: updatedData.firstName, lastName: updatedData.lastName, email: employee.email, ...updatedData });
                  onEmployeeUpdate?.({ ...employee, ...updatedData });
                } catch (e) {
                  console.error(e);
                  throw e;
                }
              }}
              showAvatar
              employeeId={null}
            />

            {canViewLeaveBalance && (
            <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-black/5 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0071e3] to-[#5ac8fa] flex items-center justify-center shadow-lg shadow-[#0071e3]/20">
                      <Calendar className="w-4 h-4 text-white" strokeWidth={1.5} />
                    </div>
                    <h3 className="font-semibold text-[17px] text-[#1d1d1f] dark:text-white">Leave Balance</h3>
                  </div>
                  {canEditLeave && (
                    isEditingLeave ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setIsEditingLeave(false)}
                          disabled={savingLeave}
                          className="px-3 py-1.5 rounded-lg text-[13px] font-medium text-[#86868b] hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={saveLeaveOnly}
                          disabled={savingLeave}
                          className="px-3 py-1.5 rounded-lg bg-[#0071e3] text-white text-[13px] font-medium hover:bg-[#0077ed] transition-colors disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {savingLeave ? (
                            <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</>
                          ) : 'Save'}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditLeaveForm(
                            normalizeLeaveEditForm({
                              vacation: employee.leaveBalance?.vacation,
                              sick: employee.leaveBalance?.sick,
                              remote: employee.leaveBalance?.remote,
                            })
                          );
                          setIsEditingLeave(true);
                        }}
                        className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                        title="Edit leave balance"
                      >
                        <Edit className="w-4 h-4 text-[#86868b]" strokeWidth={1.5} />
                      </button>
                    )
                  )}
                </div>
              </div>
              <div className="p-6">
                {isEditingLeave ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-[#0071e3]/5 dark:bg-[#0071e3]/10 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-3 h-3 rounded-full bg-[#0071e3]" />
                        <span className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">Vacation</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[12px] font-medium text-[#86868b] mb-1">Total Days</label>
                          <input
                            type="number" min="0"
                            value={leaveEdit.vacation.total}
                            onChange={(e) => setEditLeaveForm((p) => { const n = normalizeLeaveEditForm(p); return { ...n, vacation: { ...n.vacation, total: parseInt(e.target.value, 10) || 0 } }; })}
                            className="w-full h-10 px-3 text-[14px] rounded-xl bg-white dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                          />
                        </div>
                        <div>
                          <label className="block text-[12px] font-medium text-[#86868b] mb-1">Used</label>
                          <input
                            type="number" min="0"
                            value={leaveEdit.vacation.used}
                            onChange={(e) => setEditLeaveForm((p) => { const n = normalizeLeaveEditForm(p); return { ...n, vacation: { ...n.vacation, used: parseInt(e.target.value, 10) || 0 } }; })}
                            className="w-full h-10 px-3 text-[14px] rounded-xl bg-white dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                          />
                        </div>
                      </div>
                      <p className="text-[11px] text-[#86868b] mt-2">
                        Remaining: <span className="font-semibold text-[#0071e3]">{leaveEdit.vacation.total - leaveEdit.vacation.used}</span> days
                      </p>
                    </div>
                    <div className="bg-[#ff3b30]/5 dark:bg-[#ff3b30]/10 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-3 h-3 rounded-full bg-[#ff3b30]" />
                        <span className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">Sick</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[12px] font-medium text-[#86868b] mb-1">Total Days</label>
                          <input
                            type="number" min="0"
                            value={leaveEdit.sick.total}
                            onChange={(e) => setEditLeaveForm((p) => { const n = normalizeLeaveEditForm(p); return { ...n, sick: { ...n.sick, total: parseInt(e.target.value, 10) || 0 } }; })}
                            className="w-full h-10 px-3 text-[14px] rounded-xl bg-white dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                          />
                        </div>
                        <div>
                          <label className="block text-[12px] font-medium text-[#86868b] mb-1">Used</label>
                          <input
                            type="number" min="0"
                            value={leaveEdit.sick.used}
                            onChange={(e) => setEditLeaveForm((p) => { const n = normalizeLeaveEditForm(p); return { ...n, sick: { ...n.sick, used: parseInt(e.target.value, 10) || 0 } }; })}
                            className="w-full h-10 px-3 text-[14px] rounded-xl bg-white dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                          />
                        </div>
                      </div>
                      <p className="text-[11px] text-[#86868b] mt-2">
                        Remaining: <span className="font-semibold text-[#ff3b30]">{leaveEdit.sick.total - leaveEdit.sick.used}</span> days
                      </p>
                    </div>
                    <div className="bg-[#5856d6]/5 dark:bg-[#5856d6]/10 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-3 h-3 rounded-full bg-[#5856d6]" />
                        <span className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">Remote</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[12px] font-medium text-[#86868b] mb-1">Total Days</label>
                          <input
                            type="number" min="0"
                            value={leaveEdit.remote.total}
                            onChange={(e) => setEditLeaveForm((p) => { const n = normalizeLeaveEditForm(p); return { ...n, remote: { ...n.remote, total: parseInt(e.target.value, 10) || 0 } }; })}
                            className="w-full h-10 px-3 text-[14px] rounded-xl bg-white dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5856d6]"
                          />
                        </div>
                        <div>
                          <label className="block text-[12px] font-medium text-[#86868b] mb-1">Used</label>
                          <input
                            type="number" min="0"
                            value={leaveEdit.remote.used}
                            onChange={(e) => setEditLeaveForm((p) => { const n = normalizeLeaveEditForm(p); return { ...n, remote: { ...n.remote, used: parseInt(e.target.value, 10) || 0 } }; })}
                            className="w-full h-10 px-3 text-[14px] rounded-xl bg-white dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5856d6]"
                          />
                        </div>
                      </div>
                      <p className="text-[11px] text-[#86868b] mt-2">
                        Remaining: <span className="font-semibold text-[#5856d6]">{leaveEdit.remote.total - leaveEdit.remote.used}</span> days
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-5 bg-[#0071e3]/5 dark:bg-[#0071e3]/10 rounded-xl">
                      <p className="text-[32px] font-semibold text-[#0071e3]">{employee.leaveBalance?.vacation?.remaining ?? 0}</p>
                      <p className="text-[15px] font-medium text-[#1d1d1f] dark:text-white mt-1">Vacation Days</p>
                      <p className="text-[13px] text-[#86868b] mt-1">Used: {employee.leaveBalance?.vacation?.used ?? 0} of {employee.leaveBalance?.vacation?.total ?? 15}</p>
                      <div className="mt-3 h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-[#0071e3] rounded-full transition-all" style={{ width: `${((employee.leaveBalance?.vacation?.remaining ?? 0) / (employee.leaveBalance?.vacation?.total || 1)) * 100}%` }} />
                      </div>
                    </div>
                    <div className="text-center p-5 bg-[#ff3b30]/5 dark:bg-[#ff3b30]/10 rounded-xl">
                      <p className="text-[32px] font-semibold text-[#ff3b30]">{employee.leaveBalance?.sick?.remaining ?? 0}</p>
                      <p className="text-[15px] font-medium text-[#1d1d1f] dark:text-white mt-1">Sick Days</p>
                      <p className="text-[13px] text-[#86868b] mt-1">Used: {employee.leaveBalance?.sick?.used ?? 0} of {employee.leaveBalance?.sick?.total ?? 3}</p>
                      <div className="mt-3 h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-[#ff3b30] rounded-full transition-all" style={{ width: `${((employee.leaveBalance?.sick?.remaining ?? 0) / (employee.leaveBalance?.sick?.total || 1)) * 100}%` }} />
                      </div>
                    </div>
                    <div className="text-center p-5 bg-[#5856d6]/5 dark:bg-[#5856d6]/10 rounded-xl">
                      <p className="text-[32px] font-semibold text-[#5856d6]">{employee.leaveBalance?.remote?.remaining ?? 0}</p>
                      <p className="text-[15px] font-medium text-[#1d1d1f] dark:text-white mt-1">Remote Days</p>
                      <p className="text-[13px] text-[#86868b] mt-1">Used: {employee.leaveBalance?.remote?.used ?? 0} of {employee.leaveBalance?.remote?.total ?? 10}</p>
                      <div className="mt-3 h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-[#5856d6] rounded-full transition-all" style={{ width: `${((employee.leaveBalance?.remote?.remaining ?? 0) / (employee.leaveBalance?.remote?.total || 1)) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}
          </div>
        )}

      </div>
    </div>,
    document.body
  );
};

export default EmployeeDetailsModal;
