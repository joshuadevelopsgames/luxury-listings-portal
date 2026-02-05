/**
 * EmployeeLink - Clickable team member name that opens Employee Details modal.
 * Use wherever you list team/approved users so admins can open details from any page.
 */

import React, { useState } from 'react';
import EmployeeDetailsModal from '../EmployeeDetailsModal';

const EmployeeLink = ({ user, showId = true, className = '', onEmployeeUpdate = null, children }) => {
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const displayName = user.name || user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email?.split('@')[0] || 'Unknown';
  const idLabel = (user.uid || user.id || user.email)
    ? `USR-${String(user.uid || user.id || user.email).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0).toString().slice(-4).padStart(4, '0')}`
    : null;

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        className={`inline-flex items-center gap-1.5 text-[#5856d6] hover:text-[#6e6ce8] hover:underline font-medium transition-colors cursor-pointer ${className}`}
      >
        {children ?? displayName}
        {showId && idLabel && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#5856d6]/10 text-[#5856d6] font-mono">{idLabel}</span>
        )}
      </button>
      {open && (
        <EmployeeDetailsModal
          user={user}
          onClose={() => setOpen(false)}
          onEmployeeUpdate={onEmployeeUpdate}
        />
      )}
    </>
  );
};

export default EmployeeLink;
