import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
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

export default function EditProfileModal({ isOpen, onClose, user, isAdmin, onSave }) {
  const { hasPermission, currentUser } = useAuth();
  const [saving, setSaving] = useState(false);
  
  // Check specific permissions
  const canEditAnyName = hasPermission(PERMISSIONS.EDIT_ANY_NAME) || isAdmin;
  const canEditOwnName = hasPermission(PERMISSIONS.EDIT_OWN_NAME);
  const canEditAnyProfile = hasPermission(PERMISSIONS.EDIT_ANY_PROFILE) || isAdmin;
  
  // Debug logging
  console.log('🔐 EditProfileModal permissions check:', {
    canEditAnyName,
    canEditOwnName,
    canEditAnyProfile,
    isAdmin,
    customPermissions: currentUser?.customPermissions
  });
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    displayName: '',
    department: '',
    startDate: '',
    phone: '',
    location: '',
    avatar: ''
  });

  useEffect(() => {
    if (user && isOpen) {
      setForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        displayName: user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        department: user.department || '',
        startDate: user.startDate || '',
        phone: user.phone || '',
        location: user.location || '',
        avatar: user.avatar || ''
      });
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('🚀 SAVE BUTTON CLICKED!');
    console.log('📝 EditProfileModal - Form submitted');
    console.log('📝 Current form data:', form);
    
    setSaving(true);
    
    try {
      // Build updates based on user-specific permissions
      const updates = {};
      
      // Check name editing permissions
      if (canEditAnyName || canEditOwnName) {
        updates.firstName = form.firstName;
        updates.lastName = form.lastName;
      }
      
      // Check department editing permissions
      if (isAdmin || canEditAnyProfile) {
        updates.department = form.department;
        updates.startDate = form.startDate;
      }
      
      // Everyone can edit these fields
      // Handle displayName - use null if empty, otherwise use trimmed value
      updates.displayName = form.displayName?.trim() || null;
      updates.phone = form.phone?.trim() || null;
      updates.location = form.location?.trim() || null;
      updates.avatar = form.avatar?.trim() || null;
      
      console.log('📝 Sending updates to onSave (based on permissions):', updates);
      console.log('🔐 Permissions check:', {
        canEditAnyName,
        canEditOwnName,
        canEditAnyProfile,
        isAdmin
      });
      await onSave(updates);
      console.log('✅ onSave completed successfully');
    } catch (error) {
      console.error('❌ Error in handleSubmit:', error);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Edit Profile</h3>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  First Name {!canEditAnyName && !canEditOwnName ? '(HR managed)' : ''}
                </label>
                <input 
                  name="firstName" 
                  value={form.firstName} 
                  onChange={handleChange} 
                  className="w-full border rounded-md px-3 py-2 disabled:bg-gray-100 disabled:text-gray-500" 
                  disabled={!canEditAnyName && !canEditOwnName}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Last Name {!canEditAnyName && !canEditOwnName ? '(HR managed)' : ''}
                </label>
                <input 
                  name="lastName" 
                  value={form.lastName} 
                  onChange={handleChange} 
                  className="w-full border rounded-md px-3 py-2 disabled:bg-gray-100 disabled:text-gray-500" 
                  disabled={!canEditAnyName && !canEditOwnName}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Display Name</label>
              <input name="displayName" value={form.displayName} onChange={handleChange} className="w-full border rounded-md px-3 py-2" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Department {isAdmin ? '' : '(admin managed)'}</label>
                <select 
                  name="department" 
                  value={form.department} 
                  onChange={handleChange} 
                  className="w-full border rounded-md px-3 py-2 disabled:bg-gray-100" 
                  disabled={!isAdmin}
                >
                  <option value="">Select department...</option>
                  {DEPARTMENTS.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Start Date {isAdmin ? '' : '(admin managed)'}</label>
                <input type="date" name="startDate" value={form.startDate} onChange={handleChange} className="w-full border rounded-md px-3 py-2 disabled:bg-gray-100" disabled={!isAdmin} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Phone</label>
                <input name="phone" value={form.phone} onChange={handleChange} className="w-full border rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Location</label>
                <input name="location" value={form.location} onChange={handleChange} className="w-full border rounded-md px-3 py-2" />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Avatar URL</label>
              <input name="avatar" value={form.avatar} onChange={handleChange} className="w-full border rounded-md px-3 py-2" />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 p-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}




