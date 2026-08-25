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
  Facebook,
  Linkedin,
  Youtube,
  ExternalLink,
  Upload,
  Camera,
  Pause,
  Play,
  MapPin,
  UserCircle} from 'lucide-react';
import { uploadFile } from '../../services/storageService';
import { LocationSelect } from '../crm/LocationSelect';
import { openGmailWithComposeTo } from '../../utils/gmailCompose';
import { format } from 'date-fns';
import { supabaseService } from '../../services/supabaseService';
import { CLIENT_TYPE, CLIENT_TYPE_OPTIONS, getContactTypes, normalizeLocation } from '../../services/crmService';
import { toast } from 'react-hot-toast';
import PlatformIcons from '../PlatformIcons';
import { getPostsRemaining, getPostsUsed, getEnabledPlatforms } from '../../utils/clientPostsUtils';

const PLATFORM_LABELS = { instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn', youtube: 'YouTube', tiktok: 'TikTok', x: 'X' };

const emailRegex = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/;

/* ── Presentational helpers for the read-only view ──────────────────────
   Kept local to this modal: a heading + hairline rule, and a label/value
   row. Using rows rather than filled tiles is what lets the panel show a
   dozen fields without turning into a grid of identical grey rectangles. */

const InfoRow = ({ icon: Icon, children }) => (
  <div className="flex items-center gap-2.5 py-1.5 min-w-0">
    <Icon className="w-3.5 h-3.5 text-ink-subtle shrink-0" />
    <div className="text-[13px] text-ink min-w-0 truncate">{children}</div>
  </div>
);

const PILL_TONES = {
  positive: 'bg-positive-soft text-positive',
  warning: 'bg-warning-soft text-warning',
  neutral: 'bg-surface-3 text-ink-muted',
};

const StatusPill = ({ tone = 'neutral', label }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11.5px] font-medium ${PILL_TONES[tone] || PILL_TONES.neutral}`}>
    {label}
  </span>
);

const ClientDetailModal = ({
  client,
  onClose,
  onClientUpdate = null,
  onDelete = null,
  onPause = null,
  employees = [], // For manager assignment
  showManagerAssignment = false
}) => {
  const { currentUser } = useAuth();
  const canManageEmployeeProfiles = true;
  const canEdit = true;
  const canAssignManagers = true;
  
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
      platforms: localClient.platforms || { instagram: false, facebook: false, linkedin: false, youtube: false, tiktok: false, x: false },
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
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `client-photos/${localClient.id}/profile_${Date.now()}.${ext}`;
      const url = await uploadFile(path, file);
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
    const loc = normalizeLocation(editForm.location || '') || null;
    const pc = editForm.primaryContact && (editForm.primaryContact.name || editForm.primaryContact.email || editForm.primaryContact.phone || editForm.primaryContact.role)
      ? { name: editForm.primaryContact.name || '', email: editForm.primaryContact.email || '', phone: editForm.primaryContact.phone || '', role: editForm.primaryContact.role || '' }
      : null;
    if (editForm.clientEmail && !emailRegex.test(editForm.clientEmail)) {
      toast.error("Invalid client email address.");
      return;
    }
    const payload = { ...editForm, clientTypes, clientType: clientTypes[0], location: loc, primaryContact: pc };
    if (payload.postsRemainingByPlatform && Object.keys(payload.postsRemainingByPlatform).length > 0) {
      payload.postsRemaining = Object.values(payload.postsRemainingByPlatform).reduce((s, n) => s + (Number(n) || 0), 0);
    }

    setSaving(true);
    try {
      await supabaseService.updateClient(localClient.id, payload);
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
      await supabaseService.updateClient(localClient.id, { assignedManager: managerEmail || null });
      if (managerEmail && !emailRegex.test(managerEmail)) {
        toast.error("Invalid manager email address.");
        setAssigningManager(false);
        return;
      }
      await supabaseService.logClientReassignment(localClient.id, localClient.clientName || localClient.name, previousManager, managerEmail || null, currentUser?.email);
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
        className={`bg-surface rounded-xl w-full max-h-[88vh] overflow-hidden border border-hairline-strong shadow-lg flex flex-col ${isEditing ? 'max-w-2xl' : 'max-w-sm'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-surface px-6 py-4 border-b border-hairline z-10 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 shadow-lg">
                {localClient.profilePhoto ? (
                  <img src={localClient.profilePhoto} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-brand to-brand flex items-center justify-center">
                    <span className="text-white font-semibold text-xl">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-[20px] font-semibold text-ink mb-0.5">
                  {displayName}
                </h2>
                <div className="flex items-center gap-2">
                  {clientNumber && (
                    <span className="text-[12px] px-2 py-0.5 rounded-md bg-surface-3 text-ink-muted font-mono">
                      {clientNumber}
                    </span>
                  )}
                  <span className="text-[12px] px-2 py-0.5 rounded-md bg-brand/10 text-brand font-medium">
                    {localClient.packageType || 'Standard'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canEdit && !isEditing && (
                <button
                  onClick={startEditing}
                  className="p-2 rounded-xl bg-brand/10 hover:bg-brand/20 transition-colors"
                  title="Edit client"
                >
                  <Pencil className="w-4 h-4 text-brand" />
                </button>
              )}
              {onPause && !isEditing && (
                <button
                  onClick={async () => {
                    try {
                      await onPause(localClient);
                      const wasPaused = (localClient.approvalStatus || '').toLowerCase() === 'paused' || (localClient.approvalStatus || '').toLowerCase() === 'pending';
                      setLocalClient(prev => ({ ...prev, approvalStatus: wasPaused ? 'Approved' : 'Paused' }));
                    } catch (e) {
                      toast.error(e?.message || 'Failed to update client');
                    }
                  }}
                  className="p-2 rounded-xl hover:bg-[#ff9f0a]/10 transition-colors"
                  title={((localClient.approvalStatus || '').toLowerCase() === 'paused' || (localClient.approvalStatus || '').toLowerCase() === 'pending') ? 'Resume client' : 'Pause client'}
                >
                  {((localClient.approvalStatus || '').toLowerCase() === 'paused' || (localClient.approvalStatus || '').toLowerCase() === 'pending')
                    ? <Play className="w-4 h-4 text-positive" />
                    : <Pause className="w-4 h-4 text-[#ff9f0a]" />}
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
                  className="p-2 rounded-xl hover:bg-danger/10 text-danger dark:text-red-400 transition-colors"
                  title="Delete client"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-surface-3 transition-colors"
              >
                <X className="w-5 h-5 text-ink-muted" />
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
                  <label className="text-[11px] text-ink-muted uppercase tracking-wide font-medium mb-1.5 block">Name *</label>
                  <input
                    type="text"
                    value={editForm.clientName}
                    onChange={(e) => setEditForm({ ...editForm, clientName: e.target.value })}
                    className="w-full h-11 px-4 text-[14px] rounded-xl border border-hairline-strong bg-black/[0.02] dark:bg-white/[0.02] text-ink focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-ink-muted uppercase tracking-wide font-medium mb-1.5 block">Email</label>
                  <input
                    type="email"
                    value={editForm.clientEmail}
                    onChange={(e) => setEditForm({ ...editForm, clientEmail: e.target.value })}
                    className="w-full h-11 px-4 text-[14px] rounded-xl border border-hairline-strong bg-black/[0.02] dark:bg-white/[0.02] text-ink focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-ink-muted uppercase tracking-wide font-medium mb-1.5 block">Service type(s)</label>
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
                          className="w-4 h-4 rounded border-black/20 text-brand focus:ring-brand"
                        />
                        <span className="text-[13px] text-ink">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-ink-muted uppercase tracking-wide font-medium mb-1.5 block">Location</label>
                  <LocationSelect
                    value={editForm.location || ''}
                    onChange={(loc) => setEditForm({ ...editForm, location: loc || '' })}
                    placeholder="Search or select location"
                    className="w-full h-11 px-4 text-[14px] rounded-xl border border-hairline-strong bg-black/[0.02] dark:bg-white/[0.02] text-ink focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand"
                    allowLegacy={true}
                  />
                </div>
                <div className="col-span-full border-t border-hairline pt-4">
                  <label className="text-[11px] text-ink-muted uppercase tracking-wide font-medium mb-2 block">Primary contact (optional)</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input type="text" value={editForm.primaryContact?.name || ''} onChange={(e) => setEditForm({ ...editForm, primaryContact: { ...(editForm.primaryContact || {}), name: e.target.value } })} placeholder="Name" className="w-full h-10 px-3 text-[14px] rounded-xl border border-hairline-strong bg-black/[0.02] dark:bg-white/[0.02]" />
                    <input type="email" value={editForm.primaryContact?.email || ''} onChange={(e) => setEditForm({ ...editForm, primaryContact: { ...(editForm.primaryContact || {}), email: e.target.value } })} placeholder="Email" className="w-full h-10 px-3 text-[14px] rounded-xl border border-hairline-strong bg-black/[0.02] dark:bg-white/[0.02]" />
                    <input type="tel" value={editForm.primaryContact?.phone || ''} onChange={(e) => setEditForm({ ...editForm, primaryContact: { ...(editForm.primaryContact || {}), phone: e.target.value } })} placeholder="Phone" className="w-full h-10 px-3 text-[14px] rounded-xl border border-hairline-strong bg-black/[0.02] dark:bg-white/[0.02]" />
                    <input type="text" value={editForm.primaryContact?.role || ''} onChange={(e) => setEditForm({ ...editForm, primaryContact: { ...(editForm.primaryContact || {}), role: e.target.value } })} placeholder="Role" className="w-full h-10 px-3 text-[14px] rounded-xl border border-hairline-strong bg-black/[0.02] dark:bg-white/[0.02]" />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-ink-muted uppercase tracking-wide font-medium mb-1.5 block">Phone</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full h-11 px-4 text-[14px] rounded-xl border border-hairline-strong bg-black/[0.02] dark:bg-white/[0.02] text-ink focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-ink-muted uppercase tracking-wide font-medium mb-1.5 block">Website</label>
                  <input
                    type="url"
                    value={editForm.website}
                    onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                    className="w-full h-11 px-4 text-[14px] rounded-xl border border-hairline-strong bg-black/[0.02] dark:bg-white/[0.02] text-ink focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-ink-muted uppercase tracking-wide font-medium mb-1.5 block">Package Type</label>
                  <select
                    value={editForm.packageType}
                    onChange={(e) => setEditForm({ ...editForm, packageType: e.target.value })}
                    className="w-full h-11 px-4 text-[14px] rounded-xl border border-hairline-strong bg-black/[0.02] dark:bg-white/[0.02] text-ink focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand"
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
                {/* Social Media Platforms */}
                <div className="col-span-full">
                  <label className="text-[11px] text-ink-muted uppercase tracking-wide font-medium mb-2 block">Social Media Platforms</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'instagram', label: 'Instagram', icon: Instagram },
                      { key: 'facebook', label: 'Facebook', icon: Facebook },
                      { key: 'linkedin', label: 'LinkedIn', icon: Linkedin },
                      { key: 'youtube', label: 'YouTube', icon: Youtube },
                      { key: 'tiktok', label: 'TikTok', icon: null },
                      { key: 'x', label: 'X', icon: null }
                    ].map(({ key, label, icon: Icon }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setEditForm({
                          ...editForm,
                          platforms: {
                            ...(editForm.platforms || {}),
                            [key]: !(editForm.platforms || {})[key]
                          }
                        })}
                        className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[12px] font-medium transition-colors ${
                          (editForm.platforms || {})[key]
                            ? 'bg-brand text-white'
                            : 'bg-surface-3 text-ink-muted hover:text-ink dark:hover:text-white'
                        }`}
                      >
                        {Icon && <Icon className="w-3.5 h-3.5" />}
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                {editForm.postsRemainingByPlatform && Object.keys(editForm.postsRemainingByPlatform).length > 0 ? (
                  <div className="col-span-full space-y-2">
                    <label className="text-[11px] text-ink-muted uppercase tracking-wide font-medium mb-1.5 block">Posts Remaining by Platform</label>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(editForm.postsRemainingByPlatform).map(([platformKey, value]) => (
                        <div key={platformKey}>
                          <label className="text-[10px] text-ink-muted block mb-1">{PLATFORM_LABELS[platformKey] || platformKey}</label>
                          <input
                            type="number"
                            min="0"
                            value={value}
                            onChange={(e) => {
                              const next = { ...editForm.postsRemainingByPlatform, [platformKey]: parseInt(e.target.value) || 0 };
                              setEditForm({ ...editForm, postsRemainingByPlatform: next });
                            }}
                            className="w-full h-11 px-4 text-[14px] rounded-xl border border-hairline-strong bg-black/[0.02] dark:bg-white/[0.02] text-ink focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand"
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-[12px] text-ink-muted">
                      Total: {Object.values(editForm.postsRemainingByPlatform).reduce((s, n) => s + (Number(n) || 0), 0)} posts
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="text-[11px] text-ink-muted uppercase tracking-wide font-medium mb-1.5 block">Posts Remaining</label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.postsRemaining}
                      onChange={(e) => setEditForm({ ...editForm, postsRemaining: parseInt(e.target.value) || 0 })}
                      className="w-full h-11 px-4 text-[14px] rounded-xl border border-hairline-strong bg-black/[0.02] dark:bg-white/[0.02] text-ink focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand"
                    />
                  </div>
                )}
                <div>
                  <label className="text-[11px] text-ink-muted uppercase tracking-wide font-medium mb-1.5 block">Payment Status</label>
                  <select
                    value={editForm.paymentStatus}
                    onChange={(e) => setEditForm({ ...editForm, paymentStatus: e.target.value })}
                    className="w-full h-11 px-4 text-[14px] rounded-xl border border-hairline-strong bg-black/[0.02] dark:bg-white/[0.02] text-ink focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-ink-muted uppercase tracking-wide font-medium mb-1.5 block">Instagram</label>
                  <input
                    type="text"
                    value={editForm.instagramHandle}
                    onChange={(e) => setEditForm({ ...editForm, instagramHandle: e.target.value.replace('@', '') })}
                    className="w-full h-11 px-4 text-[14px] rounded-xl border border-hairline-strong bg-black/[0.02] dark:bg-white/[0.02] text-ink focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand"
                    placeholder="username"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-ink-muted uppercase tracking-wide font-medium mb-1.5 block">Profile Photo</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-surface-3 border border-hairline-strong flex-shrink-0">
                    {editForm.profilePhoto ? (
                      <img src={editForm.profilePhoto} alt="Profile" className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-ink-muted">
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
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-brand/10 text-brand text-[13px] font-medium hover:bg-brand/20 transition-colors disabled:opacity-50"
                    >
                      {uploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {uploadingPhoto ? 'Uploading...' : 'Upload photo'}
                    </button>
                    {editForm.profilePhoto && (
                      <button
                        type="button"
                        onClick={() => setEditForm(prev => ({ ...prev, profilePhoto: '' }))}
                        className="block text-[12px] text-ink-muted hover:text-danger"
                      >
                        Remove photo
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-ink-muted mt-2">Or paste URL:</p>
                <input
                  type="text"
                  value={editForm.profilePhoto}
                  onChange={(e) => setEditForm({ ...editForm, profilePhoto: e.target.value })}
                  className="mt-1 w-full h-9 px-3 text-[13px] rounded-lg border border-hairline-strong bg-black/[0.02] dark:bg-white/[0.02] text-ink focus:outline-none focus:ring-2 focus:ring-brand/50"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="text-[11px] text-ink-muted uppercase tracking-wide font-medium mb-1.5 block">Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 text-[14px] rounded-xl border border-hairline-strong bg-black/[0.02] dark:bg-white/[0.02] text-ink focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand resize-none"
                />
              </div>
            </div>
          ) : (
            /* View Mode */
            <div className="space-y-4">
              {/* Package meter — the one number worth showing as a shape.
                  used + remaining gives the package size, so the bar says
                  "how much of this package is left" at a glance. */}
              {(() => {
                const remaining = getPostsRemaining(localClient);
                const used = getPostsUsed(localClient);
                const size = used + remaining;
                if (!size) return null;
                const pct = Math.round((remaining / size) * 100);
                return (
                  <div>
                    <div className="flex items-baseline justify-between mb-1.5">
                      <span className="text-[12px] text-ink-muted">Posts remaining</span>
                      <span className="text-[13px] text-ink">
                        <strong className="text-[17px] font-semibold tabular-nums">{remaining}</strong>
                        <span className="text-ink-muted"> of {size}</span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${pct <= 20 ? 'bg-danger-light' : pct <= 50 ? 'bg-warning-light' : 'bg-positive'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Status at a glance */}
              <div className="flex flex-wrap gap-1.5">
                <StatusPill
                  tone={localClient.approvalStatus === 'Approved' ? 'positive' : 'warning'}
                  label={localClient.approvalStatus || localClient.status || 'Active'}
                />
                <StatusPill
                  tone={localClient.paymentStatus === 'Paid' ? 'positive' : 'warning'}
                  label={localClient.paymentStatus || 'Payment unknown'}
                />
                {getContactTypes(localClient)
                  .filter(t => t !== CLIENT_TYPE.NA)
                  .map(t => CLIENT_TYPE_OPTIONS.find(o => o.value === t)?.label ?? t)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map(label => <StatusPill key={label} tone="neutral" label={label} />)}
              </div>

              {/* Facts — icon carries the label, so there is no label column */}
              <div className="border-t border-hairline pt-3 space-y-0.5">
                <InfoRow icon={Mail}>
                  {localClient.clientEmail ? (
                    <button
                      type="button"
                      onClick={() => openGmailWithComposeTo(localClient.clientEmail)}
                      className="hover:text-brand truncate block max-w-full text-left"
                    >
                      {localClient.clientEmail}
                    </button>
                  ) : <span className="text-ink-subtle">No email</span>}
                </InfoRow>
                {localClient.phone && <InfoRow icon={Phone}>{localClient.phone}</InfoRow>}
                <InfoRow icon={User}>
                  {localClient.assignedManager
                    ? (manager ? (manager.displayName || manager.email) : localClient.assignedManager)
                    : <span className="text-warning">Unassigned</span>}
                </InfoRow>
                {localClient.location && <InfoRow icon={MapPin}>{localClient.location}</InfoRow>}
                {localClient.startDate && (
                  <InfoRow icon={Calendar}>
                    Since {format(new Date(localClient.startDate), 'MMM yyyy')}
                  </InfoRow>
                )}
                {localClient.primaryContact?.name && (
                  <InfoRow icon={UserCircle}>
                    {localClient.primaryContact.name}
                    {localClient.primaryContact.role && (
                      <span className="text-ink-muted"> · {localClient.primaryContact.role}</span>
                    )}
                  </InfoRow>
                )}
              </div>

              {/* Platforms + links, both icon-led */}
              {((localClient.platforms && Object.values(localClient.platforms).some(v => v))
                || localClient.website || localClient.instagramHandle) && (
                <div className="border-t border-hairline pt-3 flex flex-wrap items-center gap-2">
                  {localClient.platforms && Object.values(localClient.platforms).some(v => v) && (
                    <PlatformIcons platforms={localClient.platforms} size="sm" />
                  )}
                  {localClient.website && (
                    <a
                      href={localClient.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Website"
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-hairline-strong text-[12px] text-ink-muted hover:text-ink hover:bg-surface-3 transition-colors"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {localClient.instagramHandle && (
                    <a
                      href={`https://instagram.com/${(localClient.instagramHandle || '').replace(/^@+/, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`@${(localClient.instagramHandle || '').replace(/^@+/, '')}`}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-hairline-strong text-[12px] text-ink-muted hover:text-ink hover:bg-surface-3 transition-colors"
                    >
                      <Instagram className="w-3.5 h-3.5" />
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}

              {/* Screenshots as thumbnails */}
              {(localClient.signupScreenshotUrl
                || (localClient.additionalScreenshots && localClient.additionalScreenshots.length > 0)) && (
                <div className="border-t border-hairline pt-3 flex flex-wrap gap-1.5">
                  {localClient.signupScreenshotUrl && (
                    <a
                      href={localClient.signupScreenshotUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Day one"
                      className="rounded-md overflow-hidden border border-hairline-strong w-14 h-14 flex-shrink-0"
                    >
                      <img src={localClient.signupScreenshotUrl} alt="Day one" className="w-full h-full object-cover" />
                    </a>
                  )}
                  {(localClient.additionalScreenshots || []).map((shot, i) => (
                    <a
                      key={i}
                      href={shot.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-md overflow-hidden border border-hairline-strong w-14 h-14 flex-shrink-0"
                    >
                      <img src={shot.url} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              )}

              {localClient.notes && (
                <p className="border-t border-hairline pt-3 text-[12.5px] leading-relaxed text-ink-muted whitespace-pre-wrap">
                  {localClient.notes}
                </p>
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
                className="flex-1 h-11 rounded-xl border border-hairline-strong text-[14px] font-medium text-ink hover:bg-surface-3 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 h-10 flex items-center justify-center gap-2 rounded-xl bg-brand text-white text-[14px] font-medium hover:bg-brand-hover transition-colors disabled:opacity-50"
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
                  className="flex-1 min-w-[140px] h-11 flex items-center justify-center gap-2 rounded-xl bg-surface-3 text-ink text-[14px] font-medium hover:bg-hairline-strong transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  {manager ? 'Reassign' : 'Assign Manager'}
                </button>
              )}
              {localClient.clientEmail && (
                <button
                  type="button"
                  onClick={() => openGmailWithComposeTo(localClient.clientEmail)}
                  className="flex-1 min-w-[140px] h-11 flex items-center justify-center gap-2 rounded-xl bg-brand text-white text-[14px] font-medium hover:bg-brand-hover transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  Send Email
                </button>
              )}
              <button
                onClick={onClose}
                className="flex-1 min-w-[140px] h-10 rounded-xl border border-hairline-strong text-[14px] font-medium text-ink hover:bg-surface-3 transition-colors"
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
            className="bg-surface rounded-xl max-w-md w-full border border-hairline-strong shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-hairline flex items-center justify-between">
              <h2 className="text-[17px] font-semibold text-ink">Assign Manager</h2>
              <button
                onClick={() => setShowManagerModal(false)}
                className="p-2 rounded-lg hover:bg-surface-3 transition-colors"
              >
                <X className="w-5 h-5 text-ink-muted" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-[14px] text-ink-muted mb-4">
                Select a social media manager for <span className="font-medium text-ink">{displayName}</span>
              </p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                <button
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                    !manager ? 'bg-brand text-white' : 'bg-surface-3 text-ink hover:bg-hairline-strong'
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
                      manager?.email === emp.email ? 'bg-brand text-white' : 'bg-surface-3 text-ink hover:bg-hairline-strong'
                    }`}
                    onClick={() => handleAssignManager(emp.email)}
                    disabled={assigningManager}
                  >
                    <User className="w-4 h-4" />
                    <div>
                      <div className="text-[13px] font-medium">{emp.displayName || emp.email}</div>
                      {emp.displayName && (
                        <div className={`text-[11px] ${manager?.email === emp.email ? 'text-white/70' : 'text-ink-muted'}`}>
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
