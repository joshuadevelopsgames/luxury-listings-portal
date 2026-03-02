/**
 * ClientDetailModal - Universal client profile modal
 * 
 * Use this component to display full client details anywhere in the app.
 * Consistent with the modal shown in ClientProfilesList.
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  X,
  Mail,
  Phone,
  User,
  Calendar,
  AlertCircle,
  Pencil,
  Trash2,
  UserPlus,
  MessageSquare,
  Save,
  Loader2,
  Globe,
  Instagram,
  ExternalLink,
  Upload,
  Camera
} from 'lucide-react';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { LocationSelect } from '../crm/LocationSelect';
import { openGmailWithComposeTo } from '../../utils/gmailCompose';
import { format } from 'date-fns';
import { usePermissions } from '../../contexts/PermissionsContext';
import { firestoreService } from '../../services/firestoreService';
import { CLIENT_TYPE, CLIENT_TYPE_OPTIONS, getContactTypes } from '../../services/crmService';
import { toast } from 'react-hot-toast';
import PlatformIcons from '../PlatformIcons';
import { getPostsRemaining, getEnabledPlatforms } from '../../utils/clientPostsUtils';

const PLATFORM_LABELS = { instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn', youtube: 'YouTube', tiktok: 'TikTok', x: 'X' };

const ClientDetailModal = ({
  client,
  onClose,
  onClientUpdate = null,
  onDelete = null,
  employees = [], // For manager assignment
  showManagerAssignment = false
}) => {
  const { currentUser } = useAuth();
  const { isSystemAdmin, hasPermission } = usePermissions();
  const canEdit = isSystemAdmin || hasPermission('clients');
  const canAssignManagers = isSystemAdmin || hasPermission('assign_managers');
  
  const [localClient, setLocalClient] = useState(client);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [assigningManager, setAssigningManager] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = React.useRef(null);

  useEffect(() => {
    setLocalClient(client);
  }, [client]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const getAssignedManager = () => {
    if (!localClient.assignedManager) return null;
    return employees.find(emp => 
      emp.email?.toLowerCase() === localClient.assignedManager?.toLowerCase()
    );
  };

  const startEditing = () => {
    const enabled = getEnabledPlatforms(localClient);
    const existingByPlatform = localClient.postsRemainingByPlatform || {};
    const postsRemainingByPlatform = enabled.length
      ? Object.fromEntries(enabled.map((key) => [key, existingByPlatform[key] ?? 0]))
      : null;
    setEditForm({
      clientName: localClient.clientName || '',
      clientEmail: localClient.clientEmail || '',
      clientTypes: localClient.clientTypes && localClient.clientTypes.length ? [...localClient.clientTypes] : (localClient.clientType || localClient.type ? [localClient.clientType || localClient.type] : [CLIENT_TYPE.NA]),
      location: localClient.location || '',
      primaryContact: localClient.primaryContact ? { name: localClient.primaryContact.name || '', email: localClient.primaryContact.email || '', phone: localClient.primaryContact.phone || '', role: localClient.primaryContact.role || '' } : { name: '', email: '', phone: '', role: '' },
      phone: localClient.phone || '',
      website: localClient.website || '',
      instagramHandle: localClient.instagramHandle || '',
      packageType: localClient.packageType || 'Standard',
      packageSize: localClient.packageSize || 12,
      postsRemaining: localClient.postsRemaining ?? 0,
      postsRemainingByPlatform,
      paymentStatus: localClient.paymentStatus || 'Pending',
      notes: localClient.notes || '',
      profilePhoto: localClient.profilePhoto || ''
    });
    setIsEditing(true);
  };

  const handleProfilePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !localClient?.id) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    setUploadingPhoto(true);
    try {
      const storage = getStorage();
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `client-photos/${localClient.id}/profile_${Date.now()}.${ext}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setEditForm(prev => ({ ...prev, profilePhoto: url }));
      toast.success('Photo uploaded');
    } catch (err) {
      console.error(err);
      toast.error('Upload failed');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    if (!editForm.clientName?.trim()) {
      toast.error('Client name is required');
      return;
    }

    const clientTypes = editForm.clientTypes && editForm.clientTypes.length ? editForm.clientTypes : [CLIENT_TYPE.NA];
    const loc = (editForm.location || '').trim() || null;
    const pc = editForm.primaryContact && (editForm.primaryContact.name || editForm.primaryContact.email || editForm.primaryContact.phone || editForm.primaryContact.role)
      ? { name: editForm.primaryContact.name || '', email: editForm.primaryContact.email || '', phone: editForm.primaryContact.phone || '', role: editForm.primaryContact.role || '' }
      : null;
    const payload = { ...editForm, clientTypes, clientType: clientTypes[0], location: loc, primaryContact: pc };
    if (payload.postsRemainingByPlatform && Object.keys(payload.postsRemainingByPlatform).length > 0) {
      payload.postsRemaining = Object.values(payload.postsRemainingByPlatform).reduce((s, n) => s + (Number(n) || 0), 0);
    }

    setSaving(true);
    try {
      await firestoreService.updateClient(localClient.id, payload);
      const updatedClient = { ...localClient, ...payload };
      setLocalClient(updatedClient);
      if (onClientUpdate) onClientUpdate(updatedClient);
      toast.success('Client updated');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating client:', error);
      toast.error('Failed to update client');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignManager = async (managerEmail) => {
    setAssigningManager(true);
    try {
      const previousManager = localClient.assignedManager || null;
      await firestoreService.updateClient(localClient.id, { assignedManager: managerEmail || null });
      await firestoreService.logClientReassignment(localClient.id, localClient.clientName || localClient.name, previousManager, managerEmail || null, currentUser?.email);
      const updatedClient = { ...localClient, assignedManager: managerEmail || null };
      setLocalClient(updatedClient);
      if (onClientUpdate) onClientUpdate(updatedClient);
      toast.success(managerEmail ? 'Manager assigned' : 'Manager unassigned');
      setShowManagerModal(false);
    } catch (error) {
      console.error('Error assigning manager:', error);
      toast.error('Failed to assign manager');
    } finally {
      setAssigningManager(false);
    }
  };

  if (!client) return null;

  const displayName = localClient.clientName || localClient.name || 'Unknown Client';
  const clientNumber = localClient.clientNumber || null;
  const manager = getAssignedManager();

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div 
        className="bg-white dark:bg-[#1d1d1f] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-black/10 dark:border-white/10 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-[#1d1d1f] px-6 py-4 border-b border-black/5 dark:border-white/10 z-10 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 shadow-lg">
                {localClient.profilePhoto ? (
                  <img src={localClient.profilePhoto} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#0071e3] to-[#5856d6] flex items-center justify-center">
                    <span className="text-white font-semibold text-xl">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-[20px] font-semibold text-[#1d1d1f] dark:text-white mb-0.5">
                  {displayName}
                </h2>
                <div className="flex items-center gap-2">
                  {clientNumber && (
                    <span className="text-[12px] px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-[#86868b] font-mono">
                      {clientNumber}
                    </span>
                  )}
                  <span className="text-[12px] px-2 py-0.5 rounded-md bg-[#0071e3]/10 text-[#0071e3] font-medium">
                    {localClient.packageType || 'Standard'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canEdit && !isEditing && (
                <button
                  onClick={startEditing}
                  className="p-2 rounded-xl bg-[#0071e3]/10 hover:bg-[#0071e3]/20 transition-colors"
                  title="Edit client"
                >
                  <Pencil className="w-4 h-4 text-[#0071e3]" />
                </button>
              )}
              {onDelete && !isEditing && (
                <button
                  onClick={async () => {
                    try {
                      await onDelete(localClient);
                      onClose();
                    } catch (e) {
                      toast.error(e?.message || 'Failed to delete client');
                    }
                  }}
                  className="p-2 rounded-xl hover:bg-red-500/10 text-red-600 dark:text-red-400 transition-colors"
                  title="Delete client"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] text-[#86868b] uppercase tracking-wide font-medium mb-1.5 block">Name *</label>
                  <input
                    type="text"
                    value={editForm.clientName}
                    onChange={(e) => setEditForm({ ...editForm, clientName: e.target.value })}
                    className="w-full h-11 px-4 text-[14px] rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50 focus:border-[#0071e3]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#86868b] uppercase tracking-wide font-medium mb-1.5 block">Email</label>
                  <input
                    type="email"
                    value={editForm.clientEmail}
                    onChange={(e) => setEditForm({ ...editForm, clientEmail: e.target.value })}
                    className="w-full h-11 px-4 text-[14px] rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50 focus:border-[#0071e3]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#86868b] uppercase tracking-wide font-medium mb-1.5 block">Service type(s)</label>
                  <div className="flex flex-wrap gap-3">
                    {CLIENT_TYPE_OPTIONS.map(({ value, label }) => (
                      <label key={value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(editForm.clientTypes || []).includes(value)}
                          onChange={(e) => {
                            const prev = editForm.clientTypes || [];
                            setEditForm({
                              ...editForm,
                              clientTypes: e.target.checked ? [...prev, value] : prev.filter(t => t !== value)
                            });
                          }}
                          className="w-4 h-4 rounded border-black/20 text-[#0071e3] focus:ring-[#0071e3]"
                        />
                        <span className="text-[13px] text-[#1d1d1f] dark:text-white">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-[#86868b] uppercase tracking-wide font-medium mb-1.5 block">Location</label>
                  <LocationSelect
                    value={editForm.location || ''}
                    onChange={(loc) => setEditForm({ ...editForm, location: loc || '' })}
                    placeholder="Search or select location"
                    className="w-full h-11 px-4 text-[14px] rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50 focus:border-[#0071e3]"
                    allowLegacy={true}
                  />
                </div>
                <div className="col-span-full border-t border-black/5 dark:border-white/10 pt-4">
                  <label className="text-[11px] text-[#86868b] uppercase tracking-wide font-medium mb-2 block">Primary contact (optional)</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input type="text" value={editForm.primaryContact?.name || ''} onChange={(e) => setEditForm({ ...editForm, primaryContact: { ...(editForm.primaryContact || {}), name: e.target.value } })} placeholder="Name" className="w-full h-10 px-3 text-[14px] rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]" />
                    <input type="email" value={editForm.primaryContact?.email || ''} onChange={(e) => setEditForm({ ...editForm, primaryContact: { ...(editForm.primaryContact || {}), email: e.target.value } })} placeholder="Email" className="w-full h-10 px-3 text-[14px] rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]" />
                    <input type="tel" value={editForm.primaryContact?.phone || ''} onChange={(e) => setEditForm({ ...editForm, primaryContact: { ...(editForm.primaryContact || {}), phone: e.target.value } })} placeholder="Phone" className="w-full h-10 px-3 text-[14px] rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]" />
                    <input type="text" value={editForm.primaryContact?.role || ''} onChange={(e) => setEditForm({ ...editForm, primaryContact: { ...(editForm.primaryContact || {}), role: e.target.value } })} placeholder="Role" className="w-full h-10 px-3 text-[14px] rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]" />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-[#86868b] uppercase tracking-wide font-medium mb-1.5 block">Phone</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full h-11 px-4 text-[14px] rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50 focus:border-[#0071e3]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#86868b] uppercase tracking-wide font-medium mb-1.5 block">Website</label>
                  <input
                    type="url"
                    value={editForm.website}
                    onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                    className="w-full h-11 px-4 text-[14px] rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50 focus:border-[#0071e3]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#86868b] uppercase tracking-wide font-medium mb-1.5 block">Package Type</label>
                  <select
                    value={editForm.packageType}
                    onChange={(e) => setEditForm({ ...editForm, packageType: e.target.value })}
                    className="w-full h-11 px-4 text-[14px] rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50 focus:border-[#0071e3]"
                  >
                    <option value="Standard">Standard</option>
                    <option value="Silver">Silver</option>
                    <option value="Gold">Gold</option>
                    <option value="Platinum">Platinum</option>
                    <option value="Seven">Seven</option>
                    <option value="Custom">Custom</option>
                    <option value="Monthly">Monthly</option>
                  </select>
                </div>
                {editForm.postsRemainingByPlatform && Object.keys(editForm.postsRemainingByPlatform).length > 0 ? (
                  <div className="col-span-full space-y-2">
                    <label className="text-[11px] text-[#86868b] uppercase tracking-wide font-medium mb-1.5 block">Posts Remaining by Platform</label>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(editForm.postsRemainingByPlatform).map(([platformKey, value]) => (
                        <div key={platformKey}>
                          <label className="text-[10px] text-[#86868b] block mb-1">{PLATFORM_LABELS[platformKey] || platformKey}</label>
                          <input
                            type="number"
                            min="0"
                            value={value}
                            onChange={(e) => {
                              const next = { ...editForm.postsRemainingByPlatform, [platformKey]: parseInt(e.target.value) || 0 };
                              setEditForm({ ...editForm, postsRemainingByPlatform: next });
                            }}
                            className="w-full h-11 px-4 text-[14px] rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50 focus:border-[#0071e3]"
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-[12px] text-[#86868b]">
                      Total: {Object.values(editForm.postsRemainingByPlatform).reduce((s, n) => s + (Number(n) || 0), 0)} posts
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="text-[11px] text-[#86868b] uppercase tracking-wide font-medium mb-1.5 block">Posts Remaining</label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.postsRemaining}
                      onChange={(e) => setEditForm({ ...editForm, postsRemaining: parseInt(e.target.value) || 0 })}
                      className="w-full h-11 px-4 text-[14px] rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50 focus:border-[#0071e3]"
                    />
                  </div>
                )}
                <div>
                  <label className="text-[11px] text-[#86868b] uppercase tracking-wide font-medium mb-1.5 block">Payment Status</label>
                  <select
                    value={editForm.paymentStatus}
                    onChange={(e) => setEditForm({ ...editForm, paymentStatus: e.target.value })}
                    className="w-full h-11 px-4 text-[14px] rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50 focus:border-[#0071e3]"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-[#86868b] uppercase tracking-wide font-medium mb-1.5 block">Instagram</label>
                  <input
                    type="text"
                    value={editForm.instagramHandle}
                    onChange={(e) => setEditForm({ ...editForm, instagramHandle: e.target.value.replace('@', '') })}
                    className="w-full h-11 px-4 text-[14px] rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50 focus:border-[#0071e3]"
                    placeholder="username"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-[#86868b] uppercase tracking-wide font-medium mb-1.5 block">Profile Photo</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex-shrink-0">
                    {editForm.profilePhoto ? (
                      <img src={editForm.profilePhoto} alt="Profile" className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#86868b]">
                        <Camera className="w-6 h-6" strokeWidth={1.5} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleProfilePhotoUpload}
                    />
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0071e3]/10 text-[#0071e3] text-[13px] font-medium hover:bg-[#0071e3]/20 transition-colors disabled:opacity-50"
                    >
                      {uploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {uploadingPhoto ? 'Uploading...' : 'Upload photo'}
                    </button>
                    {editForm.profilePhoto && (
                      <button
                        type="button"
                        onClick={() => setEditForm(prev => ({ ...prev, profilePhoto: '' }))}
                        className="block text-[12px] text-[#86868b] hover:text-[#ff3b30]"
                      >
                        Remove photo
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-[#86868b] mt-2">Or paste URL:</p>
                <input
                  type="text"
                  value={editForm.profilePhoto}
                  onChange={(e) => setEditForm({ ...editForm, profilePhoto: e.target.value })}
                  className="mt-1 w-full h-9 px-3 text-[13px] rounded-lg border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="text-[11px] text-[#86868b] uppercase tracking-wide font-medium mb-1.5 block">Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 text-[14px] rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50 focus:border-[#0071e3] resize-none"
                />
              </div>
            </div>
          ) : (
            /* View Mode */
            <div className="space-y-6">
              {/* Contact & Manager */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-[12px] font-semibold text-[#86868b] mb-3 uppercase tracking-wide">Contact Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02]">
                      <div className="w-9 h-9 rounded-lg bg-[#0071e3]/10 flex items-center justify-center flex-shrink-0">
                        <Mail className="w-4 h-4 text-[#0071e3]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] text-[#86868b]">Email</p>
                        <button
                          type="button"
                          onClick={() => localClient.clientEmail && openGmailWithComposeTo(localClient.clientEmail)}
                          className="text-[13px] font-medium text-[#1d1d1f] dark:text-white truncate block text-left hover:text-[#0071e3]"
                        >
                          {localClient.clientEmail || 'No email'}
                        </button>
                      </div>
                    </div>
                    {localClient.phone && (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02]">
                        <div className="w-9 h-9 rounded-lg bg-[#34c759]/10 flex items-center justify-center flex-shrink-0">
                          <Phone className="w-4 h-4 text-[#34c759]" />
                        </div>
                        <div>
                          <p className="text-[11px] text-[#86868b]">Phone</p>
                          <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">{localClient.phone}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-[12px] font-semibold text-[#86868b] mb-3 uppercase tracking-wide">Assigned Manager</h3>
                  {localClient.assignedManager ? (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02]">
                      <div className="w-9 h-9 rounded-lg bg-[#34c759]/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-[#34c759]" />
                      </div>
                      <div>
                        <p className="text-[11px] text-[#86868b]">Social Media Manager</p>
                        <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">
                          {manager ? (manager.displayName || manager.email) : localClient.assignedManager}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-[#ff9500]/5">
                      <div className="w-9 h-9 rounded-lg bg-[#ff9500]/10 flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="w-4 h-4 text-[#ff9500]" />
                      </div>
                      <p className="text-[13px] text-[#ff9500]">No manager assigned</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Links */}
              {(localClient.website || localClient.instagramHandle) && (
                <div className="flex flex-wrap gap-2">
                  {localClient.website && (
                    <a 
                      href={localClient.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] text-[13px] text-[#1d1d1f] dark:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-colors"
                    >
                      <Globe className="w-4 h-4 text-[#86868b]" />
                      Website
                      <ExternalLink className="w-3.5 h-3.5 text-[#86868b]" />
                    </a>
                  )}
                  {localClient.instagramHandle && (
                    <a 
                      href={`https://instagram.com/${localClient.instagramHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E1306C]/5 text-[13px] text-[#E1306C] hover:bg-[#E1306C]/10 transition-colors"
                    >
                      <Instagram className="w-4 h-4" />
                      @{localClient.instagramHandle}
                    </a>
                  )}
                </div>
              )}

              {/* Day-one & additional screenshots */}
              {(localClient.signupScreenshotUrl || (localClient.additionalScreenshots && localClient.additionalScreenshots.length > 0)) && (
                <div className="border-t border-black/5 dark:border-white/5 pt-6">
                  <h3 className="text-[12px] font-semibold text-[#86868b] mb-3 uppercase tracking-wide">Screenshots</h3>
                  <div className="space-y-3">
                    {localClient.signupScreenshotUrl && (
                      <div>
                        <p className="text-[11px] text-[#86868b] mb-1.5">Day-one (signup)</p>
                        <a
                          href={localClient.signupScreenshotUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block rounded-xl overflow-hidden border border-black/10 dark:border-white/10 max-w-xs"
                        >
                          <img
                            src={localClient.signupScreenshotUrl}
                            alt="Day-one screenshot"
                            className="w-full h-auto max-h-48 object-cover"
                          />
                        </a>
                        {localClient.signupScreenshotUploadedAt && (
                          <p className="text-[11px] text-[#86868b] mt-1">
                            Uploaded {format(new Date(localClient.signupScreenshotUploadedAt), 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>
                    )}
                    {localClient.additionalScreenshots && localClient.additionalScreenshots.length > 0 && (
                      <div>
                        <p className="text-[11px] text-[#86868b] mb-1.5">Additional screenshots</p>
                        <div className="flex flex-wrap gap-2">
                          {localClient.additionalScreenshots.map((s, i) => (
                            <a
                              key={i}
                              href={s.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg overflow-hidden border border-black/10 dark:border-white/10 w-24 h-24 flex-shrink-0"
                            >
                              <img src={s.url} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(localClient.location || (localClient.primaryContact && (localClient.primaryContact.name || localClient.primaryContact.email))) && (
              <div className="border-t border-black/5 dark:border-white/5 pt-6">
                <h3 className="text-[12px] font-semibold text-[#86868b] mb-4 uppercase tracking-wide">Location & primary contact</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {localClient.location && (
                    <div className="p-3 bg-black/[0.02] dark:bg-white/[0.02] rounded-xl">
                      <p className="text-[11px] text-[#86868b] mb-1">Location</p>
                      <p className="text-[14px] font-semibold text-[#1d1d1f] dark:text-white">{localClient.location}</p>
                    </div>
                  )}
                  {localClient.primaryContact && (localClient.primaryContact.name || localClient.primaryContact.email) && (
                    <div className="p-3 bg-black/[0.02] dark:bg-white/[0.02] rounded-xl md:col-span-2">
                      <p className="text-[11px] text-[#86868b] mb-1">Primary contact</p>
                      <p className="text-[14px] font-semibold text-[#1d1d1f] dark:text-white">{localClient.primaryContact.name || '—'}{localClient.primaryContact.role ? ` · ${localClient.primaryContact.role}` : ''}</p>
                      {localClient.primaryContact.email && <p className="text-[12px] text-[#86868b]">{localClient.primaryContact.email}</p>}
                      {localClient.primaryContact.phone && <p className="text-[12px] text-[#86868b]">{localClient.primaryContact.phone}</p>}
                    </div>
                  )}
                </div>
              </div>
              )}
              {/* Package Details */}
              <div className="border-t border-black/5 dark:border-white/5 pt-6">
                <h3 className="text-[12px] font-semibold text-[#86868b] mb-4 uppercase tracking-wide">Package Details</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-black/[0.02] dark:bg-white/[0.02] rounded-xl">
                    <p className="text-[11px] text-[#86868b] mb-1">Service type</p>
                    <p className="text-[14px] font-semibold text-[#1d1d1f] dark:text-white">
                      {getContactTypes(localClient).map(t => CLIENT_TYPE_OPTIONS.find(o => o.value === t)?.label ?? t).join(', ') || 'N/A'}
                    </p>
                  </div>
                  <div className="p-3 bg-black/[0.02] dark:bg-white/[0.02] rounded-xl">
                    <p className="text-[11px] text-[#86868b] mb-1">Package Type</p>
                    <p className="text-[14px] font-semibold text-[#1d1d1f] dark:text-white">{localClient.packageType || 'Standard'}</p>
                  </div>
                  <div className="p-3 bg-black/[0.02] dark:bg-white/[0.02] rounded-xl">
                    <p className="text-[11px] text-[#86868b] mb-1">Posts Remaining</p>
                    <p className="text-[14px] font-semibold text-[#1d1d1f] dark:text-white">{getPostsRemaining(localClient)}</p>
                    {localClient.postsRemainingByPlatform && Object.keys(localClient.postsRemainingByPlatform).length > 0 && (
                      <p className="text-[11px] text-[#86868b] mt-1">
                        {Object.entries(localClient.postsRemainingByPlatform).map(([k, v]) => `${PLATFORM_LABELS[k] || k}: ${v}`).join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="p-3 bg-black/[0.02] dark:bg-white/[0.02] rounded-xl">
                    <p className="text-[11px] text-[#86868b] mb-1">Payment Status</p>
                    <span className={`text-[12px] px-2 py-0.5 rounded-md font-medium ${
                      localClient.paymentStatus === 'Paid' ? 'bg-[#34c759]/10 text-[#34c759]' : 'bg-[#ff9500]/10 text-[#ff9500]'
                    }`}>
                      {localClient.paymentStatus || 'Unknown'}
                    </span>
                  </div>
                  <div className="p-3 bg-black/[0.02] dark:bg-white/[0.02] rounded-xl">
                    <p className="text-[11px] text-[#86868b] mb-1">Status</p>
                    <span className={`text-[12px] px-2 py-0.5 rounded-md font-medium ${
                      localClient.approvalStatus === 'Approved' ? 'bg-[#34c759]/10 text-[#34c759]' : 'bg-[#ff9500]/10 text-[#ff9500]'
                    }`}>
                      {localClient.approvalStatus || localClient.status || 'Active'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Platforms */}
              {localClient.platforms && Object.values(localClient.platforms).some(v => v) && (
                <div className="border-t border-black/5 dark:border-white/5 pt-6">
                  <h3 className="text-[12px] font-semibold text-[#86868b] mb-3 uppercase tracking-wide">Platforms</h3>
                  <PlatformIcons platforms={localClient.platforms} size="md" />
                </div>
              )}

              {/* Client Since */}
              {localClient.startDate && (
                <div className="border-t border-black/5 dark:border-white/5 pt-6">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02]">
                    <div className="w-9 h-9 rounded-lg bg-black/5 dark:bg-white/10 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-4 h-4 text-[#86868b]" />
                    </div>
                    <div>
                      <p className="text-[11px] text-[#86868b]">Client Since</p>
                      <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">
                        {format(new Date(localClient.startDate), 'MMMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {localClient.notes && (
                <div className="border-t border-black/5 dark:border-white/5 pt-6">
                  <h3 className="text-[12px] font-semibold text-[#86868b] mb-3 uppercase tracking-wide">Notes</h3>
                  <div className="p-4 bg-black/[0.02] dark:bg-white/[0.02] rounded-xl">
                    <p className="text-[13px] text-[#1d1d1f] dark:text-white whitespace-pre-wrap">{localClient.notes}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-black/5 dark:border-white/5 bg-black/[0.01] dark:bg-white/[0.01]">
          {isEditing ? (
            <div className="flex gap-3">
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 h-11 rounded-xl border border-black/10 dark:border-white/10 text-[14px] font-medium text-[#1d1d1f] dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-[#0071e3] text-white text-[14px] font-medium hover:bg-[#0077ed] transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {showManagerAssignment && canAssignManagers && employees.length > 0 && (
                <button
                  onClick={() => setShowManagerModal(true)}
                  className="flex-1 min-w-[140px] h-11 flex items-center justify-center gap-2 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[14px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  {manager ? 'Reassign' : 'Assign Manager'}
                </button>
              )}
              {localClient.clientEmail && (
                <button
                  type="button"
                  onClick={() => openGmailWithComposeTo(localClient.clientEmail)}
                  className="flex-1 min-w-[140px] h-11 flex items-center justify-center gap-2 rounded-xl bg-[#0071e3] text-white text-[14px] font-medium hover:bg-[#0077ed] transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  Send Email
                </button>
              )}
              <button
                onClick={onClose}
                className="flex-1 min-w-[140px] h-11 rounded-xl border border-black/10 dark:border-white/10 text-[14px] font-medium text-[#1d1d1f] dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Manager Assignment Modal */}
      {showManagerModal && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[101] p-4"
          onClick={() => setShowManagerModal(false)}
        >
          <div 
            className="bg-white dark:bg-[#1d1d1f] rounded-2xl max-w-md w-full border border-black/10 dark:border-white/10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
              <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">Assign Manager</h2>
              <button
                onClick={() => setShowManagerModal(false)}
                className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-[#86868b]" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-[14px] text-[#86868b] mb-4">
                Select a social media manager for <span className="font-medium text-[#1d1d1f] dark:text-white">{displayName}</span>
              </p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                <button
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                    !manager ? 'bg-[#0071e3] text-white' : 'bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15'
                  }`}
                  onClick={() => handleAssignManager(null)}
                  disabled={assigningManager}
                >
                  <X className="w-4 h-4" />
                  <span className="text-[13px] font-medium">Unassign Manager</span>
                </button>
                {employees.map(emp => (
                  <button
                    key={emp.email}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                      manager?.email === emp.email ? 'bg-[#0071e3] text-white' : 'bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15'
                    }`}
                    onClick={() => handleAssignManager(emp.email)}
                    disabled={assigningManager}
                  >
                    <User className="w-4 h-4" />
                    <div>
                      <div className="text-[13px] font-medium">{emp.displayName || emp.email}</div>
                      {emp.displayName && (
                        <div className={`text-[11px] ${manager?.email === emp.email ? 'text-white/70' : 'text-[#86868b]'}`}>
                          {emp.email}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};

export default ClientDetailModal;
