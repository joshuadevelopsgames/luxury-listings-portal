/**
 * ClientLink - Universal clickable client name that opens the client profile modal
 * 
 * Use this component everywhere a client name is displayed to provide
 * consistent, interactive client information across the app.
 */

import React, { useState, useEffect } from 'react';
import { firestoreService } from '../../services/firestoreService';
import ClientDetailModal from '../client/ClientDetailModal';

const ClientLink = ({ 
  client, 
  className = '',
  showId = false,
  onClientUpdate = null,
  children
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localClient, setLocalClient] = useState(client);
  const [employees, setEmployees] = useState([]);

  // Update local client when prop changes
  useEffect(() => {
    setLocalClient(client);
  }, [client]);

  // Load employees for manager assignment when modal opens
  useEffect(() => {
    if (isOpen && employees.length === 0) {
      firestoreService.getApprovedUsers().then(users => {
        setEmployees(users);
      }).catch(console.error);
    }
  }, [isOpen]);

  const handleClientUpdate = (updatedClient) => {
    setLocalClient(updatedClient);
    if (onClientUpdate) {
      onClientUpdate(updatedClient);
    }
  };

  if (!client) return null;

  const displayName = localClient.clientName || localClient.name || 'Unknown Client';
  const clientNumber = localClient.clientNumber || localClient.clientId || null;

  return (
    <>
      {/* Trigger */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(true);
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

      {/* Client Detail Modal */}
      {isOpen && (
        <ClientDetailModal
          client={localClient}
          onClose={() => setIsOpen(false)}
          onClientUpdate={handleClientUpdate}
          employees={employees}
          showManagerAssignment={true}
        />
      )}
    </>
  );
};

export default ClientLink;
