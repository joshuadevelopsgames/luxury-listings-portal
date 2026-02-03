/**
 * ClientLink - Universal clickable client name that shows a profile popover
 * 
 * Use this component everywhere a client name is displayed to provide
 * consistent, interactive client information across the app.
 * 
 * @param {Object} client - Client data object (must have at least id and clientName)
 * @param {string} className - Additional CSS classes for the link
 * @param {boolean} showId - Whether to show the client ID badge
 * @param {function} onViewDetails - Optional callback for "View Details" action
 * @param {function} onClientUpdate - Callback when client is updated (for refreshing parent data)
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
  ChevronRight,
  Pencil,
  Save,
  Loader2
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

  // Update local client when prop changes
  useEffect(() => {
    setLocalClient(client);
  }, [client]);

  // Calculate popover position
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const popoverWidth = 320;
      const popoverHeight = isEditing ? 500 : 400;
      
      // Position below and centered, but adjust if near edges
      let left = rect.left + (rect.width / 2) - (popoverWidth / 2);
      let top = rect.bottom + 8;
      
      // Adjust for right edge
      if (left + popoverWidth > window.innerWidth - 16) {
        left = window.innerWidth - popoverWidth - 16;
      }
      // Adjust for left edge
      if (left < 16) {
        left = 16;
      }
      // Adjust for bottom edge - show above if needed
      if (top + popoverHeight > window.innerHeight - 16) {
        top = rect.top - popoverHeight - 8;
      }
      
      setPosition({ top, left });
    }
  }, [isOpen, isEditing]);

  // Close on outside click
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

  // Close on escape
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
      
      // Update local state
      const updatedClient = { ...localClient, ...editForm };
      setLocalClient(updatedClient);
      
      // Notify parent if callback provided
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
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0071e3]/10 text-[#0071e3] font-mono">
            {clientNumber}
          </span>
        )}
      </button>

      {/* Popover */}
      {isOpen && createPortal(
        <div 
          ref={popoverRef}
          className="fixed z-[100] w-80 bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          style={{ top: position.top, left: position.left }}
        >
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-[#0071e3] to-[#5856d6] text-white">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl overflow-hidden bg-white/20 flex items-center justify-center flex-shrink-0">
                  {localClient.logo || localClient.profilePic || localClient.image ? (
                    <img 
                      src={localClient.logo || localClient.profilePic || localClient.image} 
                      alt={displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Building2 className="w-5 h-5 text-white" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-[15px] truncate">{displayName}</h3>
                  {clientNumber && (
                    <span className="text-[11px] text-white/70 font-mono">{clientNumber}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 -mr-1 -mt-1">
                {canEdit && !isEditing && (
                  <button
                    onClick={(e) => { e.stopPropagation(); startEditing(); }}
                    className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                    title="Edit client"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => { setIsOpen(false); setIsEditing(false); }}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-3 max-h-[350px] overflow-y-auto">
            {isEditing ? (
              /* Edit Mode */
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] text-[#86868b] uppercase tracking-wide font-medium mb-1 block">Name *</label>
                  <input
                    type="text"
                    value={editForm.clientName}
                    onChange={(e) => setEditForm({ ...editForm, clientName: e.target.value })}
                    className="w-full px-3 py-2 text-[13px] rounded-lg border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    placeholder="Client name"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#86868b] uppercase tracking-wide font-medium mb-1 block">Email</label>
                  <input
                    type="email"
                    value={editForm.clientEmail}
                    onChange={(e) => setEditForm({ ...editForm, clientEmail: e.target.value })}
                    className="w-full px-3 py-2 text-[13px] rounded-lg border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    placeholder="client@example.com"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#86868b] uppercase tracking-wide font-medium mb-1 block">Phone</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 text-[13px] rounded-lg border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#86868b] uppercase tracking-wide font-medium mb-1 block">Website</label>
                  <input
                    type="url"
                    value={editForm.website}
                    onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                    className="w-full px-3 py-2 text-[13px] rounded-lg border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    placeholder="https://example.com"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#86868b] uppercase tracking-wide font-medium mb-1 block">Instagram</label>
                  <input
                    type="text"
                    value={editForm.instagramHandle}
                    onChange={(e) => setEditForm({ ...editForm, instagramHandle: e.target.value.replace('@', '') })}
                    className="w-full px-3 py-2 text-[13px] rounded-lg border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    placeholder="username"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-[#86868b] uppercase tracking-wide font-medium mb-1 block">Package</label>
                    <select
                      value={editForm.packageType}
                      onChange={(e) => setEditForm({ ...editForm, packageType: e.target.value })}
                      className="w-full px-3 py-2 text-[13px] rounded-lg border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
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
                    <label className="text-[11px] text-[#86868b] uppercase tracking-wide font-medium mb-1 block">Posts Left</label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.postsRemaining}
                      onChange={(e) => setEditForm({ ...editForm, postsRemaining: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 text-[13px] rounded-lg border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-[#86868b] uppercase tracking-wide font-medium mb-1 block">Notes</label>
                  <textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 text-[13px] rounded-lg border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none"
                    placeholder="Internal notes..."
                  />
                </div>
              </div>
            ) : (
              /* View Mode */
              <>
                {/* Contact Info */}
                {localClient.clientEmail && (
                  <div className="flex items-center gap-2 text-[13px]">
                    <Mail className="w-4 h-4 text-[#86868b] flex-shrink-0" />
                    <a 
                      href={`mailto:${localClient.clientEmail}`}
                      className="text-[#1d1d1f] dark:text-white hover:text-[#0071e3] truncate flex-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {localClient.clientEmail}
                    </a>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCopyEmail(); }}
                      className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors"
                      title="Copy email"
                    >
                      {copied ? (
                        <Check className="w-3.5 h-3.5 text-[#34c759]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-[#86868b]" />
                      )}
                    </button>
                  </div>
                )}

                {localClient.phone && (
                  <div className="flex items-center gap-2 text-[13px]">
                    <Phone className="w-4 h-4 text-[#86868b] flex-shrink-0" />
                    <a 
                      href={`tel:${localClient.phone}`}
                      className="text-[#1d1d1f] dark:text-white hover:text-[#0071e3]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {localClient.phone}
                    </a>
                  </div>
                )}

                {localClient.website && (
                  <div className="flex items-center gap-2 text-[13px]">
                    <Globe className="w-4 h-4 text-[#86868b] flex-shrink-0" />
                    <a 
                      href={localClient.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0071e3] hover:underline truncate flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {localClient.website.replace(/^https?:\/\//, '')}
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  </div>
                )}

                {localClient.instagramHandle && (
                  <div className="flex items-center gap-2 text-[13px]">
                    <Instagram className="w-4 h-4 text-[#E1306C] flex-shrink-0" />
                    <a 
                      href={`https://instagram.com/${localClient.instagramHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#E1306C] hover:underline flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      @{localClient.instagramHandle}
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  </div>
                )}

                {/* Package Info */}
                {(localClient.packageType || localClient.packageSize) && (
                  <div className="pt-2 mt-2 border-t border-black/5 dark:border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-4 h-4 text-[#86868b]" />
                      <span className="text-[12px] text-[#86868b] uppercase tracking-wide font-medium">Package</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {localClient.packageType && (
                        <span className="text-[12px] px-2 py-1 rounded-lg bg-[#0071e3]/10 text-[#0071e3] font-medium">
                          {localClient.packageType}
                        </span>
                      )}
                      {localClient.packageSize && (
                        <span className="text-[12px] px-2 py-1 rounded-lg bg-[#34c759]/10 text-[#34c759] font-medium">
                          {localClient.packageSize} posts
                        </span>
                      )}
                      {(localClient.postsRemaining !== undefined && localClient.postsRemaining !== null) && (
                        <span className="text-[12px] px-2 py-1 rounded-lg bg-[#ff9500]/10 text-[#ff9500] font-medium">
                          {localClient.postsRemaining} remaining
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Platforms */}
                {localClient.platforms && Object.values(localClient.platforms).some(v => v) && (
                  <div className="pt-2 mt-2 border-t border-black/5 dark:border-white/10">
                    <div className="text-[12px] text-[#86868b] uppercase tracking-wide font-medium mb-2">Platforms</div>
                    <PlatformIcons platforms={localClient.platforms} size="sm" />
                  </div>
                )}

                {/* Notes (for admins) */}
                {canEdit && localClient.notes && (
                  <div className="pt-2 mt-2 border-t border-black/5 dark:border-white/10">
                    <div className="text-[12px] text-[#86868b] uppercase tracking-wide font-medium mb-1">Notes</div>
                    <p className="text-[12px] text-[#1d1d1f] dark:text-white/80 line-clamp-3">{localClient.notes}</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-black/5 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
            {isEditing ? (
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 px-4 py-2 rounded-xl border border-black/10 dark:border-white/10 text-[13px] font-medium text-[#1d1d1f] dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#34c759] text-white text-[13px] font-medium hover:bg-[#2db24b] transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save
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
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#0071e3] text-white text-[13px] font-medium hover:bg-[#0077ed] transition-colors"
              >
                View Full Profile
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default ClientLink;
