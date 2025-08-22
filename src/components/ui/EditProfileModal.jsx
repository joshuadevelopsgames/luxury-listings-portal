import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { X } from 'lucide-react';

export default function EditProfileModal({ isOpen, onClose, user, isAdmin, onSave }) {
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
    // Enforce editable fields based on role
    const commonUpdates = {
      firstName: form.firstName,
      lastName: form.lastName,
      displayName: form.displayName,
      phone: form.phone,
      location: form.location,
      avatar: form.avatar
    };
    const adminOnly = isAdmin ? { department: form.department, startDate: form.startDate } : {};
    await onSave({ ...commonUpdates, ...adminOnly });
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
                <label className="block text-sm text-gray-600 mb-1">First Name</label>
                <input name="firstName" value={form.firstName} onChange={handleChange} className="w-full border rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Last Name</label>
                <input name="lastName" value={form.lastName} onChange={handleChange} className="w-full border rounded-md px-3 py-2" />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Display Name</label>
              <input name="displayName" value={form.displayName} onChange={handleChange} className="w-full border rounded-md px-3 py-2" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Department {isAdmin ? '' : '(admin managed)'}</label>
                <input name="department" value={form.department} onChange={handleChange} className="w-full border rounded-md px-3 py-2 disabled:bg-gray-100" disabled={!isAdmin} />
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
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </div>
    </div>
  );
}




