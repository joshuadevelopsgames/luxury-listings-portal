/**
 * ClientsContext - Global client data provider
 * 
 * Provides client data throughout the app for:
 * - AutoLinkClients component (auto-detecting client names)
 * - ClientLink component (displaying client popovers)
 * - Any component needing client lookup
 */

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { firestoreService } from '../services/firestoreService';

const ClientsContext = createContext(null);

export const useClients = () => {
  const context = useContext(ClientsContext);
  if (!context) {
    throw new Error('useClients must be used within a ClientsProvider');
  }
  return context;
};

export const ClientsProvider = ({ children }) => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load clients and subscribe to changes
  useEffect(() => {
    const unsubscribe = firestoreService.onClientsChange((clientsList) => {
      setClients(clientsList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Create lookup maps for fast client matching
  const { clientsByName, clientsById } = useMemo(() => {
    const byName = {};
    const byId = {};

    clients.forEach(client => {
      // Store by ID
      byId[client.id] = client;
      
      // Store by name (lowercase for case-insensitive matching)
      const name = client.clientName || client.name;
      if (name) {
        byName[name.toLowerCase()] = client;
        
        // Also store common variations/aliases
        // e.g., "The Agency" could also be matched as "Agency"
        const withoutThe = name.replace(/^The\s+/i, '');
        if (withoutThe !== name) {
          byName[withoutThe.toLowerCase()] = client;
        }
        
        // Store by client number if exists
        if (client.clientNumber) {
          byName[client.clientNumber.toLowerCase()] = client;
        }
      }
    });

    return { clientsByName: byName, clientsById: byId };
  }, [clients]);

  // Get client by ID
  const getClientById = useCallback((id) => {
    return clientsById[id] || null;
  }, [clientsById]);

  // Get client by name (case-insensitive)
  const getClientByName = useCallback((name) => {
    if (!name) return null;
    return clientsByName[name.toLowerCase()] || null;
  }, [clientsByName]);

  // Update a client in local state (after Firestore update)
  const updateLocalClient = useCallback((updatedClient) => {
    setClients(prev => prev.map(c => 
      c.id === updatedClient.id ? { ...c, ...updatedClient } : c
    ));
  }, []);

  // Search clients by partial name match
  const searchClients = useCallback((query) => {
    if (!query || query.length < 2) return [];
    const lowerQuery = query.toLowerCase();
    return clients.filter(client => {
      const name = (client.clientName || client.name || '').toLowerCase();
      return name.includes(lowerQuery);
    });
  }, [clients]);

  const value = {
    clients,
    loading,
    clientsByName,
    clientsById,
    getClientById,
    getClientByName,
    updateLocalClient,
    searchClients
  };

  return (
    <ClientsContext.Provider value={value}>
      {children}
    </ClientsContext.Provider>
  );
};

export default ClientsContext;
