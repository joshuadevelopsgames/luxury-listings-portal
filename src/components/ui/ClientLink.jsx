/**
 * ClientLink - Universal clickable client name that shows a profile popover
 * 
 * Use this component everywhere a client name is displayed to provide
 * consistent, interactive client information across the app.
 */

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Building2, 
  Mail, 
  Phone, 
  Globe, 
  Instagram, 
  Package, 
  X,
  ExternalLink,
  Copy,
  Check,
  Pencil,
  Save,
  Loader2,
  User,
  FileText
} from 'lucide-react';
import { usePermissions } from '../../contexts/PermissionsContext';
import { firestoreService } from '../../services/firestoreService';
import { toast } from 'react-hot-toast';
import PlatformIcons from '../PlatformIcons';

const ClientLink = ({ 
  client, 
  className = '',
  showId = false,
  onViewDetails = null,
  onClientUpdate = null,
  children
}) => {
  const { isSystemAdmin, hasPermission } = usePermissions();
  const canEdit = isSystemAdmin || hasPermission('clients');
  
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [copied, setCopied] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [localClient, setLocalClient] = useState(client);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);

  useEffect(() => {
    setLocalClient(client);
  }, [client]);

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const popoverWidth = 340;
      const popoverHeight = isEditing ? 520 : 420;
      
      let left = rect.left + (rect.width / 2) - (popoverWidth / 2);
      let top = rect.bottom + 8;
      
      if (left + popoverWidth > window.innerWidth - 16) {
        left = window.innerWidth - popoverWidth - 16;
      }
      if (left < 16) {
        left = 16;
      }
      if (top + popoverHeight > window.innerHeight - 16) {
        top = rect.top - popoverHeight - 8;
      }
      
      setPosition({ top, left });
    }
  }, [isOpen, isEditing]);

  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (e) => {
      if (
        popoverRef.current && 
        !popoverRef.current.contains(e.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target)
      ) {
        setIsOpen(false);
        setIsEditing(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setIsEditing(false);
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleCopyEmail = () => {
    if (localClient.clientEmail) {
      navigator.clipboard.writeText(localClient.clientEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const startEditing = () => {
    setEditForm({
      clientName: localClient.clientName || '',
      clientEmail: localClient.clientEmail || '',
      phone: localClient.phone || '',
      website: localClient.website || '',
      instagramHandle: localClient.instagramHandle || '',
      packageType: localClient.packageType || 'Standard',
      packageSize: localClient.packageSize || 10,
      postsRemaining: localClient.postsRemaining || 0,
      notes: localClient.notes || ''
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!editForm.clientName?.trim()) {
      toast.error('Client name is required');
      return;
    }

    setSaving(true);
    try {
      await firestoreService.updateClient(localClient.id, editForm);
      
      const updatedClient = { ...localClient, ...editForm };
      setLocalClient(updatedClient);
      
      if (onClientUpdate) {
        onClientUpdate(updatedClient);
      }
      
      toast.success('Client updated');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating client:', error);
      toast.error('Failed to update client');
    } finally {
      setSaving(false);
    }
  };

  if (!client) return null;

  const displayName = localClient.clientName || localClient.name || 'Unknown Client';
  const clientNumber = localClient.clientNumber || localClient.clientId || null;

  return (
    <>
      {/* Trigger */}
      <button
        ref={triggerRef}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`inline-flex items-center gap-1.5 text-[#0071e3] hover:text-[#0077ed] hover:underline font-medium transition-colors cursor-pointer ${className}`}
      >
        {children || displayName}
        {showId && clientNumber && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-[#86868b] font-mono">
            {clientNumber}
          </span>
        )}
      </button>

      {/* Popover */}
      {isOpen && createPortal(
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-[99] bg-black/20 dark:bg-black/40 backdrop-blur-sm"
            onClick={() => { setIsOpen(false); setIsEditing(false); }}
          />
          
          {/* Card */}
          <div 
            ref={popoverRef}
            className="fixed z-[100] w-[340px] rounded-2xl bg-white/95 dark:bg-[#1d1d1f]/95 backdrop-blur-xl border border-black/5 dark:border-white/10 shadow-xl overflow-hidden"
            style={{ top: position.top, left: position.left }}
          >
            {/* Header */}
            <div className="px-5 pt-5 pb-4 border-b border-black/5 dark:border-white/5">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gradient-to-br from-[#0071e3] to-[#5856d6] flex items-center justify-center flex-shrink-0 shadow-lg">
                  {localClient.profilePhoto || localClient.logo || localClient.profilePic || localClient.image ? (
                    <img 
                      src={localClient.profilePhoto || localClient.logo || localClient.profilePic || localClient.image} 
                      alt={displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-semibold text-xl">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                
                {/* Name & ID */}
                <div className="flex-1 min-w-0 pt-1">
                  <h3 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white truncate">
                    {displayName}
                  </h3>
                  {clientNumber && (
                    <span className="inline-flex items-center gap-1 text-[12px] text-[#86868b] font-mono mt-0.5">
                      <User className="w-3 h-3" />
                      {clientNumber}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 -mr-1 -mt-1">
                  {canEdit && !isEditing && (
                    <button
                      onClick={(e) => { e.stopPropagation(); startEditing(); }}
                      className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors"
                      title="Edit client"
                    >
                      <Pencil className="w-4 h-4 text-[#86868b]" />
                    </button>
                  )}
                  <button
                    onClick={() => { setIsOpen(false); setIsEditing(false); }}
                    className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors"
                  >
                    <X className="w-4 h-4 text-[#86868b]" />
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-5 py-4 max-h-[320px] overflow-y-auto">
              {isEditing ? (
                /* Edit Mode */
                <div className="space-y-4">
                  <div>
                    <label className="text-[11px] text-[#86868b] uppercase tracking-wide font-medium mb-1.5 block">Name *</label>
                    <input
                      type="text"
                      value={editForm.clientName}
                      onChange={(e) => setEditForm({ ...editForm, clientName: e.target.value })}
                      className="w-full h-10 px-3 text-[14px] rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50 focus:border-[#0071e3]"
                      placeholder="Client name"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#86868b] uppercase tracking-wide font-medium mb-1.5 block">Email</label>
                    <input
                      type="email"
                      value={editForm.clientEmail}
                      onChange={(e) => setEditForm({ ...editForm, clientEmail: e.target.value })}
                      className="w-full h-10 px-3 text-[14px] rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50 focus:border-[#0071e3]"
                      placeholder="client@example.com"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#86868b] uppercase tracking-wide font-medium mb-1.5 block">Phone</label>
                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="w-full h-10 px-3 text-[14px] rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50 focus:border-[#0071e3]"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-[#86868b] uppercase tracking-wide font-medium mb-1.5 block">Package</label>
                      <select
                        value={editForm.packageType}
                        onChange={(e) => setEditForm({ ...editForm, packageType: e.target.value })}
                        className="w-full h-10 px-3 text-[14px] rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50 focus:border-[#0071e3]"
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
                    <div>
                      <label className="text-[11px] text-[#86868b] uppercase tracking-wide font-medium mb-1.5 block">Posts Left</label>
                      <input
                        type="number"
                        min="0"
                        value={editForm.postsRemaining}
                        onChange={(e) => setEditForm({ ...editForm, postsRemaining: parseInt(e.target.value) || 0 })}
                        className="w-full h-10 px-3 text-[14px] rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50 focus:border-[#0071e3]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-[#86868b] uppercase tracking-wide font-medium mb-1.5 block">Notes</label>
                    <textarea
                      value={editForm.notes}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2.5 text-[14px] rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50 focus:border-[#0071e3] resize-none"
                      placeholder="Internal notes..."
                    />
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div className="space-y-4">
                  {/* Contact Section */}
                  {(localClient.clientEmail || localClient.phone) && (
                    <div className="space-y-2.5">
                      {localClient.clientEmail && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02]">
                          <div className="w-8 h-8 rounded-lg bg-[#0071e3]/10 flex items-center justify-center flex-shrink-0">
                            <Mail className="w-4 h-4 text-[#0071e3]" />
                          </div>
                          <a 
                            href={`mailto:${localClient.clientEmail}`}
                            className="flex-1 text-[14px] text-[#1d1d1f] dark:text-white hover:text-[#0071e3] truncate"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {localClient.clientEmail}
                          </a>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleCopyEmail(); }}
                            className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors"
                            title="Copy email"
                          >
                            {copied ? (
                              <Check className="w-4 h-4 text-[#34c759]" />
                            ) : (
                              <Copy className="w-4 h-4 text-[#86868b]" />
                            )}
                          </button>
                        </div>
                      )}

                      {localClient.phone && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02]">
                          <div className="w-8 h-8 rounded-lg bg-[#34c759]/10 flex items-center justify-center flex-shrink-0">
                            <Phone className="w-4 h-4 text-[#34c759]" />
                          </div>
                          <a 
                            href={`tel:${localClient.phone}`}
                            className="flex-1 text-[14px] text-[#1d1d1f] dark:text-white hover:text-[#0071e3]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {localClient.phone}
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Links Section */}
                  {(localClient.website || localClient.instagramHandle) && (
                    <div className="flex flex-wrap gap-2">
                      {localClient.website && (
                        <a 
                          href={localClient.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/[0.02] dark:bg-white/[0.02] text-[13px] text-[#1d1d1f] dark:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Globe className="w-3.5 h-3.5 text-[#86868b]" />
                          Website
                          <ExternalLink className="w-3 h-3 text-[#86868b]" />
                        </a>
                      )}
                      {localClient.instagramHandle && (
                        <a 
                          href={`https://instagram.com/${localClient.instagramHandle}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E1306C]/5 text-[13px] text-[#E1306C] hover:bg-[#E1306C]/10 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Instagram className="w-3.5 h-3.5" />
                          @{localClient.instagramHandle}
                        </a>
                      )}
                    </div>
                  )}

                  {/* Package Info */}
                  {(localClient.packageType || localClient.packageSize) && (
                    <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02]">
                      <div className="flex items-center gap-2 mb-2.5">
                        <Package className="w-4 h-4 text-[#86868b]" />
                        <span className="text-[12px] text-[#86868b] uppercase tracking-wide font-medium">Package</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {localClient.packageType && (
                          <span className="text-[13px] px-2.5 py-1 rounded-lg bg-[#0071e3]/10 text-[#0071e3] font-medium">
                            {localClient.packageType}
                          </span>
                        )}
                        {localClient.packageSize && (
                          <span className="text-[13px] px-2.5 py-1 rounded-lg bg-[#34c759]/10 text-[#34c759] font-medium">
                            {localClient.packageSize} posts
                          </span>
                        )}
                        {(localClient.postsRemaining !== undefined && localClient.postsRemaining !== null) && (
                          <span className="text-[13px] px-2.5 py-1 rounded-lg bg-[#ff9500]/10 text-[#ff9500] font-medium">
                            {localClient.postsRemaining} remaining
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Platforms */}
                  {localClient.platforms && Object.values(localClient.platforms).some(v => v) && (
                    <div>
                      <div className="text-[12px] text-[#86868b] uppercase tracking-wide font-medium mb-2">Platforms</div>
                      <PlatformIcons platforms={localClient.platforms} size="sm" />
                    </div>
                  )}

                  {/* Notes (for admins) */}
                  {canEdit && localClient.notes && (
                    <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02]">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-[#86868b]" />
                        <span className="text-[12px] text-[#86868b] uppercase tracking-wide font-medium">Notes</span>
                      </div>
                      <p className="text-[13px] text-[#1d1d1f] dark:text-white/80 line-clamp-3">{localClient.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-black/5 dark:border-white/5 bg-black/[0.01] dark:bg-white/[0.01]">
              {isEditing ? (
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex-1 h-10 rounded-xl border border-black/10 dark:border-white/10 text-[14px] font-medium text-[#1d1d1f] dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 h-10 flex items-center justify-center gap-2 rounded-xl bg-[#0071e3] text-white text-[14px] font-medium hover:bg-[#0077ed] transition-colors disabled:opacity-50"
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
              ) : onViewDetails ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                    onViewDetails(localClient);
                  }}
                  className="w-full h-10 flex items-center justify-center gap-2 rounded-xl bg-[#0071e3] text-white text-[14px] font-medium hover:bg-[#0077ed] transition-colors"
                >
                  View Full Profile
                </button>
              ) : canEdit ? (
                <button
                  onClick={(e) => { e.stopPropagation(); startEditing(); }}
                  className="w-full h-10 flex items-center justify-center gap-2 rounded-xl border border-black/10 dark:border-white/10 text-[14px] font-medium text-[#1d1d1f] dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  Edit Client
                </button>
              ) : null}
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
};

export default ClientLink;
