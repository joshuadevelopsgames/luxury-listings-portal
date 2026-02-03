/**
 * UserDetailModal - Universal user profile modal with edit capability
 * 
 * Use this component to display and edit user details anywhere in the app.
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Mail,
  Phone,
  User,
  Calendar,
  MapPin,
  Briefcase,
  Pencil,
  Save,
  Loader2,
  Shield,
  Building
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../contexts/PermissionsContext';
import { firestoreService } from '../../services/firestoreService';
import { toast } from 'react-hot-toast';
import { PERMISSIONS } from '../../entities/Permissions';

// Department options - keep in sync with PermissionsManager.jsx
const DEPARTMENTS = [
  'Executive',
  'Content Team',
  'Design Team',
  'Sales',
  'Marketing',
  'Operations',
  'HR',
  'IT',
  'Finance',
  'General'
];

// Role display names
const ROLE_DISPLAY_NAMES = {
  system_admin: 'System Admin',
  content_director: 'Content Director',
  content_manager: 'Content Manager',
  hr_manager: 'HR Manager',
  graphic_designer: 'Graphic Designer',
  sales_rep: 'Sales Rep',
  client: 'Client',
  viewer: 'Viewer'
};

const UserDetailModal = ({
  user,
  onClose,
  onUserUpdate = null
}) => {
  const { currentUser, hasPermission } = useAuth();
  const { isSystemAdmin } = usePermissions();
  
  // Permission checks
  const canEditAnyName = hasPermission(PERMISSIONS.EDIT_ANY_NAME) || isSystemAdmin;
  const canEditOwnName = hasPermission(PERMISSIONS.EDIT_OWN_NAME);
  const canEditAnyProfile = hasPermission(PERMISSIONS.EDIT_ANY_PROFILE) || isSystemAdmin;
  const isOwnProfile = currentUser?.email?.toLowerCase() === user?.email?.toLowerCase();
  const canEdit = isSystemAdmin || canEditAnyProfile || isOwnProfile;
  
  const [localUser, setLocalUser] = useState(user);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    setLocalUser(user);
  }, [user]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (isEditing) {
          setIsEditing(false);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose, isEditing]);

  const startEditing = () => {
    setEditForm({
      firstName: localUser.firstName || '',
      lastName: localUser.lastName || '',
      displayName: localUser.displayName || `${localUser.firstName || ''} ${localUser.lastName || ''}`.trim(),
      department: localUser.department || '',
      startDate: localUser.startDate || '',
      phone: localUser.phone || '',
      location: localUser.location || '',
      avatar: localUser.avatar || '',
      bio: localUser.bio || ''
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Build updates based on permissions
      const updates = {};
      
      // Check name editing permissions
      if (canEditAnyName || (canEditOwnName && isOwnProfile)) {
        updates.firstName = editForm.firstName?.trim() || null;
        updates.lastName = editForm.lastName?.trim() || null;
      }
      
      // Check department editing permissions (admin only)
      if (isSystemAdmin) {
        updates.department = editForm.department || null;
        updates.startDate = editForm.startDate || null;
      }
      
      // Fields everyone can edit on their own profile
      updates.displayName = editForm.displayName?.trim() || null;
      updates.phone = editForm.phone?.trim() || null;
      updates.location = editForm.location?.trim() || null;
      updates.avatar = editForm.avatar?.trim() || null;
      updates.bio = editForm.bio?.trim() || null;

      // Update approved user
      await firestoreService.updateApprovedUser(localUser.email, updates);
      
      // Also try to update employee record if exists
      try {
        const employee = await firestoreService.getEmployeeByEmail(localUser.email);
        if (employee) {
          await firestoreService.updateEmployee(employee.id, updates);
        }
      } catch (empError) {
        console.log('No employee record to update');
      }
      
      const updatedUser = { ...localUser, ...updates };
      setLocalUser(updatedUser);
      if (onUserUpdate) onUserUpdate(updatedUser);
      toast.success('Profile updated');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  const displayName = localUser.displayName || `${localUser.firstName || ''} ${localUser.lastName || ''}`.trim() || localUser.email;
  const initials = (localUser.firstName?.charAt(0) || '') + (localUser.lastName?.charAt(0) || '') || localUser.email?.charAt(0).toUpperCase();
  const roleDisplay = ROLE_DISPLAY_NAMES[localUser.role] || localUser.role || 'User';

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-[#1d1d1f] rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden border border-black/10 dark:border-white/10 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-[#1d1d1f] px-6 py-4 border-b border-black/5 dark:border-white/10 z-10 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 shadow-lg">
                {localUser.avatar ? (
                  <img src={localUser.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#5856d6] to-[#af52de] flex items-center justify-center">
                    <span className="text-white font-semibold text-xl">
                      {initials}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[#1d1d1f] dark:text-white">
                  {displayName}
                </h2>
                <div className="flex items-center gap-2">
                  <p className="text-[13px] text-[#86868b]">{roleDisplay}</p>
                  {(localUser.uid || localUser.id || localUser.email) && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#5856d6]/10 text-[#5856d6] font-mono">
                      USR-{String(localUser.uid || localUser.id || localUser.email).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0).toString().slice(-4).padStart(4, '0')}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canEdit && !isEditing && (
                <button
                  onClick={startEditing}
                  className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  title="Edit profile"
                >
                  <Pencil className="w-5 h-5 text-[#86868b]" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-[#86868b]" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isEditing ? (
            /* Edit Mode */
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-medium text-[#86868b] mb-1.5">
                    First Name {!canEditAnyName && !(canEditOwnName && isOwnProfile) && '(HR managed)'}
                  </label>
                  <input
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-white text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50 disabled:opacity-50 disabled:bg-black/5 dark:disabled:bg-white/5"
                    disabled={!canEditAnyName && !(canEditOwnName && isOwnProfile)}
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#86868b] mb-1.5">
                    Last Name {!canEditAnyName && !(canEditOwnName && isOwnProfile) && '(HR managed)'}
                  </label>
                  <input
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-white text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50 disabled:opacity-50 disabled:bg-black/5 dark:disabled:bg-white/5"
                    disabled={!canEditAnyName && !(canEditOwnName && isOwnProfile)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#86868b] mb-1.5">Display Name</label>
                <input
                  value={editForm.displayName}
                  onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-white text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-medium text-[#86868b] mb-1.5">
                    Department {!isSystemAdmin && '(admin only)'}
                  </label>
                  <select
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-white text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50 disabled:opacity-50 disabled:bg-black/5 dark:disabled:bg-white/5"
                    disabled={!isSystemAdmin}
                  >
                    <option value="">Select department...</option>
                    {DEPARTMENTS.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#86868b] mb-1.5">
                    Start Date {!isSystemAdmin && '(admin only)'}
                  </label>
                  <input
                    type="date"
                    value={editForm.startDate}
                    onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-white text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50 disabled:opacity-50 disabled:bg-black/5 dark:disabled:bg-white/5"
                    disabled={!isSystemAdmin}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-medium text-[#86868b] mb-1.5">Phone</label>
                  <input
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-white text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#86868b] mb-1.5">Location</label>
                  <input
                    value={editForm.location}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-white text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#86868b] mb-1.5">Avatar URL</label>
                <input
                  value={editForm.avatar}
                  onChange={(e) => setEditForm({ ...editForm, avatar: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-white text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#86868b] mb-1.5">Bio</label>
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-white text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50 resize-none"
                  placeholder="A brief description..."
                />
              </div>
            </div>
          ) : (
            /* View Mode */
            <div className="space-y-5">
              {/* Contact Info */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#0071e3]/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-[#0071e3]" />
                  </div>
                  <div>
                    <p className="text-[11px] text-[#86868b] uppercase tracking-wide">Email</p>
                    <p className="text-[14px] text-[#1d1d1f] dark:text-white">{localUser.email}</p>
                  </div>
                </div>

                {localUser.phone && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#34c759]/10 flex items-center justify-center flex-shrink-0">
                      <Phone className="w-4 h-4 text-[#34c759]" />
                    </div>
                    <div>
                      <p className="text-[11px] text-[#86868b] uppercase tracking-wide">Phone</p>
                      <p className="text-[14px] text-[#1d1d1f] dark:text-white">{localUser.phone}</p>
                    </div>
                  </div>
                )}

                {localUser.location && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#ff9500]/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-4 h-4 text-[#ff9500]" />
                    </div>
                    <div>
                      <p className="text-[11px] text-[#86868b] uppercase tracking-wide">Location</p>
                      <p className="text-[14px] text-[#1d1d1f] dark:text-white">{localUser.location}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Work Info */}
              <div className="pt-4 border-t border-black/5 dark:border-white/10 space-y-3">
                {localUser.department && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#5856d6]/10 flex items-center justify-center flex-shrink-0">
                      <Building className="w-4 h-4 text-[#5856d6]" />
                    </div>
                    <div>
                      <p className="text-[11px] text-[#86868b] uppercase tracking-wide">Department</p>
                      <p className="text-[14px] text-[#1d1d1f] dark:text-white">{localUser.department}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#af52de]/10 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-4 h-4 text-[#af52de]" />
                  </div>
                  <div>
                    <p className="text-[11px] text-[#86868b] uppercase tracking-wide">Role</p>
                    <p className="text-[14px] text-[#1d1d1f] dark:text-white">{roleDisplay}</p>
                  </div>
                </div>

                {localUser.startDate && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#ff2d55]/10 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-4 h-4 text-[#ff2d55]" />
                    </div>
                    <div>
                      <p className="text-[11px] text-[#86868b] uppercase tracking-wide">Start Date</p>
                      <p className="text-[14px] text-[#1d1d1f] dark:text-white">
                        {format(new Date(localUser.startDate), 'MMMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Bio */}
              {localUser.bio && (
                <div className="pt-4 border-t border-black/5 dark:border-white/10">
                  <p className="text-[11px] text-[#86868b] uppercase tracking-wide mb-2">Bio</p>
                  <p className="text-[14px] text-[#1d1d1f] dark:text-white leading-relaxed">{localUser.bio}</p>
                </div>
              )}

              {/* Roles & Permissions */}
              {(localUser.roles?.length > 0 || localUser.customPermissions?.length > 0) && (
                <div className="pt-4 border-t border-black/5 dark:border-white/10">
                  {localUser.roles?.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[11px] text-[#86868b] uppercase tracking-wide mb-2">Roles</p>
                      <div className="flex flex-wrap gap-1.5">
                        {localUser.roles.map((role, i) => (
                          <span 
                            key={i}
                            className="px-2 py-1 rounded-md bg-[#5856d6]/10 text-[#5856d6] text-[12px] font-medium"
                          >
                            {ROLE_DISPLAY_NAMES[role] || role}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer (Edit Mode) */}
        {isEditing && (
          <div className="sticky bottom-0 bg-white dark:bg-[#1d1d1f] px-6 py-4 border-t border-black/5 dark:border-white/10 flex-shrink-0">
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setIsEditing(false)}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-[14px] font-medium text-[#1d1d1f] dark:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0071e3] text-white text-[14px] font-medium hover:bg-[#0077ed] transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default UserDetailModal;
