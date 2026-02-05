/**
 * EmployeeDetailsModal - Reusable employee details popup (PersonCard, performance, leave, edit).
 * Use from Team Management or via EmployeeLink from any page that lists team members.
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/PermissionsContext';
import PersonCard from './PersonCard';
import { firestoreService } from '../services/firestoreService';
import {
  Users,
  Edit,
  XCircle,
  Calendar,
  BarChart3,
  GraduationCap,
  Award
} from 'lucide-react';
import { toast } from 'react-hot-toast';

function normalizeToEmployee(user) {
  if (!user) return null;
  const name = user.name || user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
  return {
    ...user,
    name,
    email: user.email || user.id,
    id: user.id || user.email,
    performance: user.performance || { rating: 0, projectsCompleted: 0, onTimeDelivery: 0, clientSatisfaction: 0 },
    skills: user.skills || [],
    certifications: user.certifications || [],
    leaveBalance: user.leaveBalance || null,
    department: user.department || 'General',
    position: user.position || user.role || 'Team Member',
    startDate: user.startDate || (user.createdAt?.toDate?.()?.toISOString?.()?.split('T')[0] || ''),
    manager: user.manager || '',
    employeeId: user.employeeId || '',
    address: user.address || 'Not provided',
    phone: user.phone || ''
  };
}

const EmployeeDetailsModal = ({ user: userProp, onClose, onEmployeeUpdate }) => {
  const { currentRole } = useAuth();
  const { isSystemAdmin } = usePermissions();
  const isHRManager = currentRole === 'hr_manager';
  const canEditLeave = isHRManager || isSystemAdmin;

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editLeaveForm, setEditLeaveForm] = useState({
    vacation: { total: 15, used: 0 },
    sick: { total: 3, used: 0 }
  });
  const [savingLeave, setSavingLeave] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const base = normalizeToEmployee(userProp);
      if (!base?.email) {
        setEmployee(base);
        setLoading(false);
        return;
      }
      if (!base.leaveBalance) {
        try {
          const leaveBalance = await firestoreService.getUserLeaveBalances(base.email);
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
  }, [userProp?.id, userProp?.email]);

  const openEditModal = () => {
    if (!employee) return;
    setEditLeaveForm({
      vacation: {
        total: employee.leaveBalance?.vacation?.total ?? 15,
        used: employee.leaveBalance?.vacation?.used ?? 0
      },
      sick: {
        total: employee.leaveBalance?.sick?.total ?? 3,
        used: employee.leaveBalance?.sick?.used ?? 0
      }
    });
    setShowEditModal(true);
  };

  const saveLeaveBalances = async () => {
    if (!employee?.email) return;
    setSavingLeave(true);
    try {
      await firestoreService.updateUserLeaveBalances(employee.email, editLeaveForm);
      const nextLeave = {
        vacation: { ...editLeaveForm.vacation, remaining: editLeaveForm.vacation.total - editLeaveForm.vacation.used },
        sick: { ...editLeaveForm.sick, remaining: editLeaveForm.sick.total - editLeaveForm.sick.used }
      };
      setEmployee((prev) => (prev ? { ...prev, leaveBalance: nextLeave } : null));
      onEmployeeUpdate?.({ ...employee, leaveBalance: nextLeave });
      toast.success(`Updated leave balances for ${employee.name}`);
      setShowEditModal(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to save leave balances');
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
              {canEditLeave && employee && (
                <button
                  type="button"
                  onClick={openEditModal}
                  className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  title="Edit leave balances and details"
                >
                  <Edit className="w-5 h-5 text-[#86868b]" strokeWidth={1.5} />
                </button>
              )}
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
        ) : (
          <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-80px)]">
            <PersonCard
              person={{
                firstName: employee.name.split(' ')[0],
                lastName: employee.name.split(' ').slice(1).join(' '),
                email: employee.email,
                phone: employee.phone,
                address: employee.address || 'Not provided',
                department: employee.department,
                position: employee.position,
                manager: employee.manager,
                startDate: employee.startDate,
                employeeId: employee.employeeId
              }}
              editable={isHRManager}
              isHRView={isHRManager}
              onSave={async (updatedData) => {
                try {
                  const emp = await firestoreService.getEmployeeByEmail(employee.email);
                  if (emp) await firestoreService.updateEmployee(emp.id, updatedData);
                  else await firestoreService.addEmployee({ firstName: updatedData.firstName || employee.name.split(' ')[0], lastName: updatedData.lastName || employee.name.split(' ').slice(1).join(' '), email: employee.email, ...updatedData });
                  onEmployeeUpdate?.({ ...employee, ...updatedData });
                } catch (e) {
                  console.error(e);
                  throw e;
                }
              }}
              showAvatar
              employeeId={null}
            />

            <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-black/5 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#34c759] to-[#30d158] flex items-center justify-center shadow-lg shadow-[#34c759]/20">
                    <BarChart3 className="w-4 h-4 text-white" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-semibold text-[17px] text-[#1d1d1f] dark:text-white">Performance Metrics</h3>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-[#0071e3]/5 dark:bg-[#0071e3]/10 rounded-xl">
                    <p className="text-[28px] font-semibold text-[#0071e3]">{employee.performance.rating}</p>
                    <p className="text-[13px] text-[#0071e3]/80">Overall Rating</p>
                  </div>
                  <div className="text-center p-4 bg-[#34c759]/5 dark:bg-[#34c759]/10 rounded-xl">
                    <p className="text-[28px] font-semibold text-[#34c759]">{employee.performance.projectsCompleted}</p>
                    <p className="text-[13px] text-[#34c759]/80">Projects Completed</p>
                  </div>
                  <div className="text-center p-4 bg-[#ff9500]/5 dark:bg-[#ff9500]/10 rounded-xl">
                    <p className="text-[28px] font-semibold text-[#ff9500]">{employee.performance.onTimeDelivery}%</p>
                    <p className="text-[13px] text-[#ff9500]/80">On-Time Delivery</p>
                  </div>
                  <div className="text-center p-4 bg-[#af52de]/5 dark:bg-[#af52de]/10 rounded-xl">
                    <p className="text-[28px] font-semibold text-[#af52de]">{employee.performance.clientSatisfaction}</p>
                    <p className="text-[13px] text-[#af52de]/80">Client Satisfaction</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden">
                <div className="px-6 py-4 border-b border-black/5 dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#5856d6] to-[#af52de] flex items-center justify-center shadow-lg shadow-[#5856d6]/20">
                      <GraduationCap className="w-4 h-4 text-white" strokeWidth={1.5} />
                    </div>
                    <h3 className="font-semibold text-[17px] text-[#1d1d1f] dark:text-white">Skills</h3>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex flex-wrap gap-2">
                    {(employee.skills?.length > 0) ? employee.skills.map((skill, i) => (
                      <span key={i} className="px-3 py-1.5 text-[13px] font-medium text-[#5856d6] bg-[#5856d6]/10 rounded-full">{skill}</span>
                    )) : <p className="text-[13px] text-[#86868b]">No skills added yet</p>}
                  </div>
                </div>
              </div>
              <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden">
                <div className="px-6 py-4 border-b border-black/5 dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#ff9500] to-[#ff3b30] flex items-center justify-center shadow-lg shadow-[#ff9500]/20">
                      <Award className="w-4 h-4 text-white" strokeWidth={1.5} />
                    </div>
                    <h3 className="font-semibold text-[17px] text-[#1d1d1f] dark:text-white">Certifications</h3>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex flex-wrap gap-2">
                    {(employee.certifications?.length > 0) ? employee.certifications.map((cert, i) => (
                      <span key={i} className="px-3 py-1.5 text-[13px] font-medium text-[#ff9500] bg-[#ff9500]/10 rounded-full">{cert}</span>
                    )) : <p className="text-[13px] text-[#86868b]">No certifications added yet</p>}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-black/5 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0071e3] to-[#5ac8fa] flex items-center justify-center shadow-lg shadow-[#0071e3]/20">
                    <Calendar className="w-4 h-4 text-white" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-semibold text-[17px] text-[#1d1d1f] dark:text-white">Leave Balance</h3>
                </div>
              </div>
              <div className="p-6">
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
                </div>
              </div>
            </div>
          </div>
        )}

        {showEditModal && employee && createPortal(
          <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-[#f5f5f7] dark:bg-[#1c1c1e] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-black/5 dark:border-white/10">
              <div className="bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl border-b border-black/5 dark:border-white/10 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0071e3] to-[#5856d6] flex items-center justify-center shadow-lg shadow-[#0071e3]/20">
                      <Calendar className="w-5 h-5 text-white" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">Edit Leave Balances</h2>
                      <p className="text-[13px] text-[#86868b]">{employee.name}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setShowEditModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                    <XCircle className="w-5 h-5 text-[#86868b]" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-6">
                <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-black/5 dark:border-white/10">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 rounded-full bg-[#0071e3]" />
                    <h3 className="text-[14px] font-medium text-[#1d1d1f] dark:text-white">Vacation Days</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[12px] font-medium text-[#86868b] mb-1">Total Allotted</label>
                      <input type="number" min="0" value={editLeaveForm.vacation.total} onChange={(e) => setEditLeaveForm((p) => ({ ...p, vacation: { ...p.vacation, total: parseInt(e.target.value, 10) || 0 } }))} className="w-full h-10 px-3 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]" />
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-[#86868b] mb-1">Days Used</label>
                      <input type="number" min="0" max={editLeaveForm.vacation.total} value={editLeaveForm.vacation.used} onChange={(e) => setEditLeaveForm((p) => ({ ...p, vacation: { ...p.vacation, used: parseInt(e.target.value, 10) || 0 } }))} className="w-full h-10 px-3 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]" />
                    </div>
                  </div>
                  <p className="text-[11px] text-[#86868b] mt-2">Remaining: {editLeaveForm.vacation.total - editLeaveForm.vacation.used} days</p>
                </div>
                <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-black/5 dark:border-white/10">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 rounded-full bg-[#ff3b30]" />
                    <h3 className="text-[14px] font-medium text-[#1d1d1f] dark:text-white">Sick Days</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[12px] font-medium text-[#86868b] mb-1">Total Allotted</label>
                      <input type="number" min="0" value={editLeaveForm.sick.total} onChange={(e) => setEditLeaveForm((p) => ({ ...p, sick: { ...p.sick, total: parseInt(e.target.value, 10) || 0 } }))} className="w-full h-10 px-3 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]" />
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-[#86868b] mb-1">Days Used</label>
                      <input type="number" min="0" max={editLeaveForm.sick.total} value={editLeaveForm.sick.used} onChange={(e) => setEditLeaveForm((p) => ({ ...p, sick: { ...p.sick, used: parseInt(e.target.value, 10) || 0 } }))} className="w-full h-10 px-3 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]" />
                    </div>
                  </div>
                  <p className="text-[11px] text-[#86868b] mt-2">Remaining: {editLeaveForm.sick.total - editLeaveForm.sick.used} days</p>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowEditModal(false)} disabled={savingLeave} className="px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[14px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors disabled:opacity-50">Cancel</button>
                  <button type="button" onClick={saveLeaveBalances} disabled={savingLeave} className="px-4 py-2.5 rounded-xl bg-[#0071e3] text-white text-[14px] font-medium hover:bg-[#0077ed] transition-colors disabled:opacity-50 flex items-center gap-2">
                    {savingLeave ? (<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</>) : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>,
    document.body
  );
};

export default EmployeeDetailsModal;
