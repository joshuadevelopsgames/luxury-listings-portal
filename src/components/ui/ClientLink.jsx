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
  ChevronRight
} from 'lucide-react';
import PlatformIcons from '../PlatformIcons';

const ClientLink = ({ 
  client, 
  className = '',
  showId = false,
  onViewDetails = null,
  children
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [copied, setCopied] = useState(false);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);

  // Calculate popover position
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const popoverWidth = 320;
      const popoverHeight = 400;
      
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
  }, [isOpen]);

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
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleCopyEmail = () => {
    if (client.clientEmail) {
      navigator.clipboard.writeText(client.clientEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!client) return null;

  const displayName = client.clientName || client.name || 'Unknown Client';
  const clientNumber = client.clientNumber || client.clientId || null;

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
                  {client.logo || client.profilePic || client.image ? (
                    <img 
                      src={client.logo || client.profilePic || client.image} 
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
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors -mr-1 -mt-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-3 max-h-[300px] overflow-y-auto">
            {/* Contact Info */}
            {client.clientEmail && (
              <div className="flex items-center gap-2 text-[13px]">
                <Mail className="w-4 h-4 text-[#86868b] flex-shrink-0" />
                <a 
                  href={`mailto:${client.clientEmail}`}
                  className="text-[#1d1d1f] dark:text-white hover:text-[#0071e3] truncate flex-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  {client.clientEmail}
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

            {client.phone && (
              <div className="flex items-center gap-2 text-[13px]">
                <Phone className="w-4 h-4 text-[#86868b] flex-shrink-0" />
                <a 
                  href={`tel:${client.phone}`}
                  className="text-[#1d1d1f] dark:text-white hover:text-[#0071e3]"
                  onClick={(e) => e.stopPropagation()}
                >
                  {client.phone}
                </a>
              </div>
            )}

            {client.website && (
              <div className="flex items-center gap-2 text-[13px]">
                <Globe className="w-4 h-4 text-[#86868b] flex-shrink-0" />
                <a 
                  href={client.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0071e3] hover:underline truncate flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  {client.website.replace(/^https?:\/\//, '')}
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              </div>
            )}

            {client.instagramHandle && (
              <div className="flex items-center gap-2 text-[13px]">
                <Instagram className="w-4 h-4 text-[#E1306C] flex-shrink-0" />
                <a 
                  href={`https://instagram.com/${client.instagramHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#E1306C] hover:underline flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  @{client.instagramHandle}
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              </div>
            )}

            {/* Package Info */}
            {(client.packageType || client.packageSize) && (
              <div className="pt-2 mt-2 border-t border-black/5 dark:border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-4 h-4 text-[#86868b]" />
                  <span className="text-[12px] text-[#86868b] uppercase tracking-wide font-medium">Package</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {client.packageType && (
                    <span className="text-[12px] px-2 py-1 rounded-lg bg-[#0071e3]/10 text-[#0071e3] font-medium">
                      {client.packageType}
                    </span>
                  )}
                  {client.packageSize && (
                    <span className="text-[12px] px-2 py-1 rounded-lg bg-[#34c759]/10 text-[#34c759] font-medium">
                      {client.packageSize} posts
                    </span>
                  )}
                  {(client.postsRemaining !== undefined && client.postsRemaining !== null) && (
                    <span className="text-[12px] px-2 py-1 rounded-lg bg-[#ff9500]/10 text-[#ff9500] font-medium">
                      {client.postsRemaining} remaining
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Platforms */}
            {client.platforms && Object.values(client.platforms).some(v => v) && (
              <div className="pt-2 mt-2 border-t border-black/5 dark:border-white/10">
                <div className="text-[12px] text-[#86868b] uppercase tracking-wide font-medium mb-2">Platforms</div>
                <PlatformIcons platforms={client.platforms} size="sm" />
              </div>
            )}
          </div>

          {/* Footer */}
          {onViewDetails && (
            <div className="p-3 border-t border-black/5 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  onViewDetails(client);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#0071e3] text-white text-[13px] font-medium hover:bg-[#0077ed] transition-colors"
              >
                View Full Profile
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
};

export default ClientLink;
