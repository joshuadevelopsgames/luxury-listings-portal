/**
 * LeadDetailModal - CRM lead profile modal
 * 
 * Displays lead details in the same style as ClientDetailModal.
 * Used for CRM leads (Warm, Contacted, Cold) from Google Sheets.
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Mail,
  Phone,
  Globe,
  Instagram,
  Building,
  Calendar,
  Clock,
  AlertCircle,
  Pencil,
  Save,
  Loader2,
  ExternalLink,
  MessageSquare,
  FileText,
  Trash2,
  UserCheck,
  MapPin
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { openGmailWithComposeTo } from '../../utils/gmailCompose';
import { CLIENT_TYPE_OPTIONS, getContactTypes } from '../../services/crmService';

const LeadDetailModal = ({
  lead,
  onClose,
  onEdit = null,
  onDelete = null,
  onGraduate = null,
  onLeadUpdate = null,
  canEdit = true
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({});

  // Close on escape
  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const startEditing = () => {
    setEditForm({
      contactName: lead.contactName || '',
      email: lead.email || '',
      types: lead.types && lead.types.length ? [...lead.types] : (lead.type ? [lead.type] : []),
      phone: lead.phone || '',
      instagram: lead.instagram || '',
      organization: lead.organization || '',
      website: lead.website || '',
      notes: lead.notes || '',
      status: lead.status || 'warm',
      location: lead.location || '',
      primaryContact: lead.primaryContact ? { name: lead.primaryContact.name || '', email: lead.primaryContact.email || '', phone: lead.primaryContact.phone || '', role: lead.primaryContact.role || '' } : { name: '', email: '', phone: '', role: '' }
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!editForm.contactName?.trim()) {
      toast.error('Contact name is required');
      return;
    }

    setSaving(true);
    try {
      const types = editForm.types && editForm.types.length ? editForm.types : ['N/A'];
      const loc = (editForm.location || '').trim() || null;
      const pc = editForm.primaryContact && (editForm.primaryContact.name || editForm.primaryContact.email || editForm.primaryContact.phone || editForm.primaryContact.role)
        ? { name: editForm.primaryContact.name || '', email: editForm.primaryContact.email || '', phone: editForm.primaryContact.phone || '', role: editForm.primaryContact.role || '' }
        : null;
      const payload = { ...lead, ...editForm, types, type: types[0], location: loc, primaryContact: pc };
      if (onEdit) {
        await onEdit(payload);
      }
      if (onLeadUpdate) {
        onLeadUpdate(payload);
      }
      toast.success('Lead updated');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating lead:', error);
      toast.error('Failed to update lead');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(lead);
    }
  };

  if (!lead) return null;

  const displayName = lead.contactName || lead.name || 'Unknown Lead';

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'warm': return 'bg-[#ff9500]/10 text-[#ff9500]';
      case 'contacted': return 'bg-[#0071e3]/10 text-[#0071e3]';
      case 'cold': return 'bg-[#86868b]/10 text-[#86868b]';
      case 'converted': return 'bg-[#34c759]/10 text-[#34c759]';
      default: return 'bg-[#86868b]/10 text-[#86868b]';
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-[#1d1d1f] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-black/10 dark:border-white/10 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-[#1d1d1f] px-6 py-4 border-b border-black/5 dark:border-white/10 z-10 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 shadow-lg bg-gradient-to-br from-[#ff9500] to-[#ff3b30] flex items-center justify-center">
                <span className="text-white font-semibold text-xl">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="text-[20px] font-semibold text-[#1d1d1f] dark:text-white mb-0.5">
                  {displayName}
                </h2>
                <div className="flex items-center gap-2">
                  <span className={`text-[12px] px-2 py-0.5 rounded-md font-medium ${getStatusColor(lead.status)}`}>
                    {lead.status ? lead.status.charAt(0).toUpperCase() + lead.status.slice(1) : 'Lead'}
                  </span>
                  {lead.organization && (
                    <span className="text-[12px] text-[#86868b]">
                      {lead.organization}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canEdit && onGraduate && !isEditing && (
                <button
                  onClick={() => onGraduate(lead)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#34c759] hover:bg-[#30b350] text-white text-[13px] font-medium transition-colors shadow-sm"
                  title="Add this lead as a client; you'll be asked to upload a day-one screenshot"
                >
                  <UserCheck className="w-4 h-4" />
                  Promote to Client
                </button>
              )}
              {canEdit && !isEditing && (
                <button
                  onClick={startEditing}
                  className="p-2 rounded-xl bg-[#0071e3]/10 hover:bg-[#0071e3]/20 transition-colors"
                  title="Edit lead"
                >
                  <Pencil className="w-4 h-4 text-[#0071e3]" />
                </button>
              )}
              {canEdit && onDelete && !isEditing && (
                <button
                  onClick={handleDelete}
                  className="p-2 rounded-xl hover:bg-[#ff3b30]/10 transition-colors"
                  title="Delete lead"
                >
                  <Trash2 className="w-4 h-4 text-[#ff3b30]" />
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
                  <label className="text-[11px] text-[#86868b] uppercase tracking-wide font-medium mb-1.5 block">Contact Name *</label>
                  <input
                    type="text"
                    value={editForm.contactName}
                    onChange={(e) => setEditForm({ ...editForm, contactName: e.target.value })}
                    className="w-full h-11 px-4 text-[14px] rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50 focus:border-[#0071e3]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#86868b] uppercase tracking-wide font-medium mb-1.5 block">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
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
                          checked={(editForm.types || []).includes(value)}
                          onChange={(e) => {
                            const prev = editForm.types || [];
                            setEditForm({
                              ...editForm,
                              types: e.target.checked ? [...prev, value] : prev.filter(t => t !== value)
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
                  <label className="text-[11px] text-[#86868b] uppercase tracking-wide font-medium mb-1.5 block">Phone</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full h-11 px-4 text-[14px] rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50 focus:border-[#0071e3]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#86868b] uppercase tracking-wide font-medium mb-1.5 block">Location</label>
                  <input
                    type="text"
                    value={editForm.location || ''}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    placeholder="City, region, or country"
                    className="w-full h-11 px-4 text-[14px] rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50 focus:border-[#0071e3]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#86868b] uppercase tracking-wide font-medium mb-1.5 block">Organization</label>
                  <input
                    type="text"
                    value={editForm.organization}
                    onChange={(e) => setEditForm({ ...editForm, organization: e.target.value })}
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
                  <label className="text-[11px] text-[#86868b] uppercase tracking-wide font-medium mb-1.5 block">Instagram</label>
                  <input
                    type="text"
                    value={editForm.instagram}
                    onChange={(e) => setEditForm({ ...editForm, instagram: e.target.value.replace('@', '') })}
                    className="w-full h-11 px-4 text-[14px] rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50 focus:border-[#0071e3]"
                    placeholder="username"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#86868b] uppercase tracking-wide font-medium mb-1.5 block">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full h-11 px-4 text-[14px] rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50 focus:border-[#0071e3]"
                  >
                    <option value="warm">Warm Lead</option>
                    <option value="contacted">Contacted</option>
                    <option value="cold">Cold Lead</option>
                    <option value="converted">Converted</option>
                  </select>
                </div>
                <div className="md:col-span-2 border-t border-black/5 dark:border-white/10 pt-4">
                  <label className="text-[11px] text-[#86868b] uppercase tracking-wide font-medium mb-2 block">Primary contact (optional)</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input type="text" value={editForm.primaryContact?.name || ''} onChange={(e) => setEditForm({ ...editForm, primaryContact: { ...(editForm.primaryContact || {}), name: e.target.value } })} placeholder="Name" className="w-full h-10 px-3 text-[14px] rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]" />
                    <input type="email" value={editForm.primaryContact?.email || ''} onChange={(e) => setEditForm({ ...editForm, primaryContact: { ...(editForm.primaryContact || {}), email: e.target.value } })} placeholder="Email" className="w-full h-10 px-3 text-[14px] rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]" />
                    <input type="tel" value={editForm.primaryContact?.phone || ''} onChange={(e) => setEditForm({ ...editForm, primaryContact: { ...(editForm.primaryContact || {}), phone: e.target.value } })} placeholder="Phone" className="w-full h-10 px-3 text-[14px] rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]" />
                    <input type="text" value={editForm.primaryContact?.role || ''} onChange={(e) => setEditForm({ ...editForm, primaryContact: { ...(editForm.primaryContact || {}), role: e.target.value } })} placeholder="Role" className="w-full h-10 px-3 text-[14px] rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]" />
                  </div>
                </div>
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
              {/* Promote to Client – prominent CTA */}
              {canEdit && onGraduate && (
                <div className="rounded-xl border-2 border-[#34c759]/30 bg-[#34c759]/5 dark:bg-[#34c759]/10 p-4">
                  <p className="text-[13px] text-[#1d1d1f] dark:text-white font-medium mb-1">Add this lead as a client</p>
                  <p className="text-[12px] text-[#86868b] mb-3">
                    Promote to Client creates a client record in the system. You&apos;ll then be asked to upload a day-one social screenshot (required).
                  </p>
                  <button
                    onClick={() => onGraduate(lead)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#34c759] hover:bg-[#30b350] text-white text-[13px] font-medium transition-colors"
                  >
                    <UserCheck className="w-4 h-4" />
                    Promote to Client
                  </button>
                </div>
              )}

              {/* Contact Info */}
              <div>
                <h3 className="text-[12px] font-semibold text-[#86868b] mb-3 uppercase tracking-wide">Contact Information</h3>
                <div className="space-y-3">
                  {lead.location && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02]">
                      <div className="w-9 h-9 rounded-lg bg-[#34c759]/10 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-4 h-4 text-[#34c759]" />
                      </div>
                      <div>
                        <p className="text-[11px] text-[#86868b]">Location</p>
                        <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">{lead.location}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02]">
                    <div className="w-9 h-9 rounded-lg bg-[#5856d6]/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-[#5856d6]" />
                    </div>
                    <div>
                      <p className="text-[11px] text-[#86868b]">Service type</p>
                      <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">
                        {getContactTypes(lead).map(t => CLIENT_TYPE_OPTIONS.find(o => o.value === t)?.label ?? t).join(', ') || 'N/A'}
                      </p>
                    </div>
                  </div>
                  {lead.primaryContact && (lead.primaryContact.name || lead.primaryContact.email) && (
                    <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02]">
                      <p className="text-[11px] text-[#86868b] mb-1">Primary contact</p>
                      <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">{lead.primaryContact.name || '—'}{lead.primaryContact.role ? ` · ${lead.primaryContact.role}` : ''}</p>
                      {lead.primaryContact.email && <p className="text-[12px] text-[#86868b]">{lead.primaryContact.email}</p>}
                      {lead.primaryContact.phone && <p className="text-[12px] text-[#86868b]">{lead.primaryContact.phone}</p>}
                    </div>
                  )}
                  {lead.email && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02]">
                      <div className="w-9 h-9 rounded-lg bg-[#0071e3]/10 flex items-center justify-center flex-shrink-0">
                        <Mail className="w-4 h-4 text-[#0071e3]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] text-[#86868b]">Email</p>
                        <button
                          type="button"
                          onClick={() => openGmailWithComposeTo(lead.email)}
                          className="text-[13px] font-medium text-[#1d1d1f] dark:text-white hover:text-[#0071e3] truncate block text-left"
                        >
                          {lead.email}
                        </button>
                      </div>
                    </div>
                  )}
                  {lead.phone && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02]">
                      <div className="w-9 h-9 rounded-lg bg-[#34c759]/10 flex items-center justify-center flex-shrink-0">
                        <Phone className="w-4 h-4 text-[#34c759]" />
                      </div>
                      <div>
                        <p className="text-[11px] text-[#86868b]">Phone</p>
                        <a 
                          href={`tel:${lead.phone}`}
                          className="text-[13px] font-medium text-[#1d1d1f] dark:text-white hover:text-[#0071e3]"
                        >
                          {lead.phone}
                        </a>
                      </div>
                    </div>
                  )}
                  {lead.organization && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02]">
                      <div className="w-9 h-9 rounded-lg bg-[#5856d6]/10 flex items-center justify-center flex-shrink-0">
                        <Building className="w-4 h-4 text-[#5856d6]" />
                      </div>
                      <div>
                        <p className="text-[11px] text-[#86868b]">Organization</p>
                        <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">{lead.organization}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Links */}
              {(lead.website || lead.instagram) && (
                <div className="flex flex-wrap gap-2">
                  {lead.website && (
                    <a 
                      href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] text-[13px] text-[#1d1d1f] dark:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-colors"
                    >
                      <Globe className="w-4 h-4 text-[#86868b]" />
                      Website
                      <ExternalLink className="w-3.5 h-3.5 text-[#86868b]" />
                    </a>
                  )}
                  {lead.instagram && (
                    <a 
                      href={`https://instagram.com/${lead.instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E1306C]/5 text-[13px] text-[#E1306C] hover:bg-[#E1306C]/10 transition-colors"
                    >
                      <Instagram className="w-4 h-4" />
                      @{lead.instagram.replace('@', '')}
                    </a>
                  )}
                </div>
              )}

              {/* Activity Info */}
              <div className="border-t border-black/5 dark:border-white/5 pt-6">
                <h3 className="text-[12px] font-semibold text-[#86868b] mb-4 uppercase tracking-wide">Activity</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {lead.lastContact && lead.lastContact !== '—' && (
                    <div className="p-3 bg-black/[0.02] dark:bg-white/[0.02] rounded-xl">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-3.5 h-3.5 text-[#86868b]" />
                        <p className="text-[11px] text-[#86868b]">Last Contact</p>
                      </div>
                      <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">{lead.lastContact}</p>
                    </div>
                  )}
                  {lead.followUpDate && (
                    <div className="p-3 bg-black/[0.02] dark:bg-white/[0.02] rounded-xl">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="w-3.5 h-3.5 text-[#86868b]" />
                        <p className="text-[11px] text-[#86868b]">Follow Up</p>
                      </div>
                      <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">{lead.followUpDate}</p>
                    </div>
                  )}
                  {lead.nextOutreach && (
                    <div className="p-3 bg-[#ff9500]/5 rounded-xl">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertCircle className="w-3.5 h-3.5 text-[#ff9500]" />
                        <p className="text-[11px] text-[#ff9500]">Next Outreach</p>
                      </div>
                      <p className="text-[13px] font-medium text-[#ff9500]">{lead.nextOutreach}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {lead.notes && lead.notes !== 'No additional information' && (
                <div className="border-t border-black/5 dark:border-white/5 pt-6">
                  <h3 className="text-[12px] font-semibold text-[#86868b] mb-3 uppercase tracking-wide">Notes</h3>
                  <div className="p-4 bg-black/[0.02] dark:bg-white/[0.02] rounded-xl">
                    <p className="text-[13px] text-[#1d1d1f] dark:text-white whitespace-pre-wrap">{lead.notes}</p>
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
              {lead.phone && (
                <a
                  href={`tel:${lead.phone}`}
                  className="flex-1 min-w-[120px] h-11 flex items-center justify-center gap-2 rounded-xl bg-[#34c759] text-white text-[14px] font-medium hover:bg-[#2db24b] transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  Call
                </a>
              )}
              {lead.email && (
                <button
                  type="button"
                  onClick={() => openGmailWithComposeTo(lead.email)}
                  className="flex-1 min-w-[120px] h-11 flex items-center justify-center gap-2 rounded-xl bg-[#0071e3] text-white text-[14px] font-medium hover:bg-[#0077ed] transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  Email
                </button>
              )}
              <button
                onClick={onClose}
                className="flex-1 min-w-[120px] h-11 rounded-xl border border-black/10 dark:border-white/10 text-[14px] font-medium text-[#1d1d1f] dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default LeadDetailModal;
