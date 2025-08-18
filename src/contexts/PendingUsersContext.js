import React, { createContext, useContext, useState, useEffect } from 'react';
import { firestoreService } from '../services/firestoreService';

const PendingUsersContext = createContext();

export function usePendingUsers() {
  return useContext(PendingUsersContext);
}

export function PendingUsersProvider({ children }) {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Subscribe to real-time pending users changes
  useEffect(() => {
    console.log('🔄 Setting up pending users real-time listener...');
    
    const unsubscribe = firestoreService.onPendingUsersChange((users) => {
      console.log('📡 Pending users updated:', users);
      console.log('📡 Previous pending users count:', pendingUsers.length);
      console.log('📡 New pending users count:', users.length);
      setPendingUsers(users);
      setLoading(false);
    });

    return () => {
      console.log('🔄 Cleaning up pending users listener...');
      unsubscribe();
    };
  }, []);

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
      
      // Immediately remove from local state for instant UI feedback
      setPendingUsers(prevUsers => {
        const updatedUsers = prevUsers.filter(user => user.id !== userId);
        console.log('📡 Immediately removed user from UI. New count:', updatedUsers.length);
        return updatedUsers;
      });
      
      // Then remove from Firestore
      console.log('🗑️ Removing from Firestore:', userId);
      await firestoreService.removePendingUser(userId);
      console.log('✅ Successfully removed from Firestore:', userId);
      
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
      
      // Immediately remove from local state for instant UI feedback
      setPendingUsers(prevUsers => {
        const updatedUsers = prevUsers.filter(user => user.id !== userId);
        console.log('📡 Immediately removed approved user from UI. New count:', updatedUsers.length);
        return updatedUsers;
      });
      
      // Then approve in Firestore
      await firestoreService.approveUser(userId, approvedUserData);
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
