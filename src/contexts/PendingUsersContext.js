import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabaseService } from '../services/supabaseService';

const PendingUsersContext = createContext();

export function usePendingUsers() {
  return useContext(PendingUsersContext);
}

export function PendingUsersProvider({ children }) {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const lastUpdateRef = useRef(0);
  const debounceTimeoutRef = useRef(null);
  const listenerIdRef = useRef(null);

  // Subscribe to real-time pending users changes with debouncing
  useEffect(() => {
    // Skip loading on public pages (login, client-login, etc.) for faster initial load
    const publicPaths = ['/login', '/client-login', '/client-password-reset', '/waiting-for-approval', '/client-waiting-for-approval'];
    const isPublicPage = publicPaths.some(path => window.location.pathname.startsWith(path));
    
    if (isPublicPage) {
      setLoading(false);
      return;
    }
    
    // Pending users disabled: no longer fetch or show pending users in the app
    setPendingUsers([]);
    setLoading(false);
    return () => {};
    
    /* DISABLED REAL-TIME LISTENER CODE:
    // Generate a unique listener ID to prevent multiple listeners
    const listenerId = `pending-users-${Date.now()}-${Math.random()}`;
    listenerIdRef.current = listenerId;
    
    const unsubscribe = supabaseService.onPendingUsersChange((users) => {
      // Only process updates from this listener instance
      if (listenerIdRef.current !== listenerId) {
        console.log('📡 Ignoring update from old listener instance');
        return;
      }
      
      console.log('📡 Pending users updated:', users);
      console.log('📡 Previous pending users count:', pendingUsers.length);
      console.log('📡 New pending users count:', users.length);
      
      // Debounce updates to prevent excessive re-renders
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      debounceTimeoutRef.current = setTimeout(() => {
        const now = Date.now();
        // Only update if it's been more than 100ms since last update
        if (now - lastUpdateRef.current > 100) {
          console.log('📡 Applying debounced update to pending users');
          setPendingUsers(users);
          setLoading(false);
          lastUpdateRef.current = now;
        } else {
          console.log('📡 Skipping update due to debounce');
        }
      }, 100);
    });

    return () => {
      console.log('🔄 Cleaning up pending users listener...');
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      // Clear the listener ID to prevent processing updates from this listener
      if (listenerIdRef.current === listenerId) {
        listenerIdRef.current = null;
      }
      unsubscribe();
    };
    */
  }, []); // Empty dependency array - only run once

  // Manual refresh (pending users disabled; no-op)
  const refreshPendingUsers = async () => {
    try {
      setPendingUsers([]);
      setLoading(false);
    } catch (error) {
      // Silent fail
    }
  };

  // Function to add a new pending user
  const addPendingUser = async (user) => {
    try {
      await supabaseService.addPendingUser(user);
    } catch (error) {
      throw error;
    }
  };

  // Function to remove a pending user (when approved or rejected)
  const removePendingUser = async (userId) => {
    try {
      await supabaseService.removePendingUser(userId);
      // Update local state since real-time listener is disabled
      setPendingUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
    } catch (error) {
      throw error;
    }
  };

  // Function to update a pending user's role
  const updatePendingUserRole = async (userId, newRole) => {
    try {
      const user = pendingUsers.find(u => u.id === userId);
      if (user) {
        await supabaseService.updatePendingUser(userId, { requestedRole: newRole });
      }
    } catch (error) {
      throw error;
    }
  };

  // Function to approve a user (remove from pending and add to approved)
  const approveUser = async (userId, approvedUserData) => {
    try {
      await supabaseService.approveUser(userId, approvedUserData);
      // Update local state since real-time listener is disabled
      setPendingUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
    } catch (error) {
      throw error;
    }
  };

  // Function to get all pending users
  const getPendingUsers = () => {
    return pendingUsers;
  };

  const value = {
    pendingUsers,
    addPendingUser,
    removePendingUser,
    approveUser,
    updatePendingUserRole,
    getPendingUsers,
    refreshPendingUsers,
    loading
  };

  return (
    <PendingUsersContext.Provider value={value}>
      {children}
    </PendingUsersContext.Provider>
  );
}
