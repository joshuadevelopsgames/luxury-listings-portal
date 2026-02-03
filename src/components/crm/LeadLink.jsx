/**
 * LeadLink - Clickable lead name that opens the lead profile modal
 * 
 * Use this component for CRM leads (Warm, Contacted, Cold) to provide
 * consistent profile access like ClientLink does for clients.
 */

import React, { useState } from 'react';
import LeadDetailModal from './LeadDetailModal';

const LeadLink = ({ 
  lead, 
  className = '',
  onEdit = null,
  onDelete = null,
  onLeadUpdate = null,
  canEdit = true,
  children
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!lead) return null;

  const displayName = lead.contactName || lead.name || 'Unknown Lead';

  return (
    <>
      {/* Trigger */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(true);
        }}
        className={`inline-flex items-center gap-1.5 text-[#ff9500] hover:text-[#e68600] hover:underline font-medium transition-colors cursor-pointer ${className}`}
      >
        {children || displayName}
      </button>

      {/* Lead Detail Modal */}
      {isOpen && (
        <LeadDetailModal
          lead={lead}
          onClose={() => setIsOpen(false)}
          onEdit={onEdit}
          onDelete={onDelete}
          onLeadUpdate={onLeadUpdate}
          canEdit={canEdit}
        />
      )}
    </>
  );
};

export default LeadLink;
