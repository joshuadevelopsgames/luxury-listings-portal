import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { firestoreService } from '../services/firestoreService';

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
    console.log('🔄 Setting up pending users real-time listener...');
    console.log('🔍 DEBUG: PendingUsersContext useEffect triggered');
    console.log('🔍 DEBUG: Current pendingUsers count:', pendingUsers.length);
    console.log('🔍 DEBUG: Current loading state:', loading);
    console.log('🔍 DEBUG: Stack trace:', new Error().stack);
    
    // TEMPORARILY DISABLED: Use manual refresh only to prevent infinite loops
    console.log('⚠️ Real-time listener temporarily disabled to prevent infinite loops');
    
    // Load initial data manually
    const loadInitialData = async () => {
      try {
        console.log('🔍 DEBUG: Starting loadInitialData...');
        const users = await firestoreService.getPendingUsers();
        console.log('📡 Initial pending users loaded:', users);
        console.log('🔍 DEBUG: Setting pendingUsers state with', users.length, 'users');
        console.log('🔍 DEBUG: Users to set:', users.map(u => ({ id: u.id, email: u.email })));
        setPendingUsers(users);
        setLoading(false);
        console.log('🔍 DEBUG: State updated, loading set to false');
      } catch (error) {
        console.error('❌ Error loading initial pending users:', error);
        console.error('🔍 DEBUG: Error stack:', error.stack);
        console.warn('⚠️ Firestore connection failed, using empty pending users list');
        // Set empty array instead of failing
        setPendingUsers([]);
        setLoading(false);
      }
    };
    
    loadInitialData();
    
    // Return empty cleanup function since listener is disabled
    return () => {
      console.log('🔄 Real-time listener cleanup (disabled)');
      console.log('🔍 DEBUG: PendingUsersContext useEffect cleanup');
    };
    
    /* DISABLED REAL-TIME LISTENER CODE:
    // Generate a unique listener ID to prevent multiple listeners
    const listenerId = `pending-users-${Date.now()}-${Math.random()}`;
    listenerIdRef.current = listenerId;
    
    const unsubscribe = firestoreService.onPendingUsersChange((users) => {
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

  // Manual refresh function
  const refreshPendingUsers = async () => {
    try {
      console.log('🔄 Manually refreshing pending users...');
      const users = await firestoreService.getPendingUsers();
      console.log('📡 Manual refresh - pending users:', users);
      setPendingUsers(users);
      setLoading(false);
    } catch (error) {
      console.error('❌ Error manually refreshing pending users:', error);
    }
  };

  // Function to add a new pending user
  const addPendingUser = async (user) => {
    try {
      console.log('➕ Adding pending user:', user);
      await firestoreService.addPendingUser(user);
    } catch (error) {
      console.error('❌ Error adding pending user:', error);
      throw error;
    }
  };

  // Function to remove a pending user (when approved or rejected)
  const removePendingUser = async (userId) => {
    try {
      console.log('🗑️ Removing pending user:', userId);
      
      // Remove from Firestore
      console.log('🗑️ Removing from Firestore:', userId);
      await firestoreService.removePendingUser(userId);
      console.log('✅ Successfully removed from Firestore:', userId);
      
      // Update local state since real-time listener is disabled
      console.log('🔍 DEBUG: Updating local state after removal');
      setPendingUsers(prevUsers => {
        const updatedUsers = prevUsers.filter(user => user.id !== userId);
        console.log('🔍 DEBUG: Local state updated. Previous count:', prevUsers.length, 'New count:', updatedUsers.length);
        return updatedUsers;
      });
      
    } catch (error) {
      console.error('❌ Error removing pending user:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      throw error;
    }
  };

  // Function to update a pending user's role
  const updatePendingUserRole = async (userId, newRole) => {
    try {
      console.log('✏️ Updating pending user role:', userId, newRole);
      const user = pendingUsers.find(u => u.id === userId);
      if (user) {
        await firestoreService.updatePendingUser(userId, { requestedRole: newRole });
      }
    } catch (error) {
      console.error('❌ Error updating pending user role:', error);
      throw error;
    }
  };

  // Function to approve a user (remove from pending and add to approved)
  const approveUser = async (userId, approvedUserData) => {
    try {
      console.log('✅ Approving user:', userId);
      
      // Approve in Firestore
      await firestoreService.approveUser(userId, approvedUserData);
      
      // Update local state since real-time listener is disabled
      console.log('🔍 DEBUG: Updating local state after approval');
      setPendingUsers(prevUsers => {
        const updatedUsers = prevUsers.filter(user => user.id !== userId);
        console.log('🔍 DEBUG: Local state updated after approval. Previous count:', prevUsers.length, 'New count:', updatedUsers.length);
        return updatedUsers;
      });
      
    } catch (error) {
      console.error('❌ Error approving user:', error);
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
