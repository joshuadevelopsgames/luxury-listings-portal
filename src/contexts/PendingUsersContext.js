import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const PendingUsersContext = createContext();

export function usePendingUsers() {
  return useContext(PendingUsersContext);
}

export function PendingUsersProvider({ children }) {
  const [pendingUsers, setPendingUsers] = useState([]);
  const { currentUser } = useAuth();

  // Load pending users from localStorage on mount
  useEffect(() => {
    const savedPendingUsers = localStorage.getItem('luxury-listings-pending-users');
    if (savedPendingUsers) {
      try {
        setPendingUsers(JSON.parse(savedPendingUsers));
      } catch (error) {
        console.error('Error loading pending users:', error);
      }
    }
  }, []);

  // Save pending users to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('luxury-listings-pending-users', JSON.stringify(pendingUsers));
  }, [pendingUsers]);

  // Function to add a new pending user
  const addPendingUser = (user) => {
    setPendingUsers(prev => {
      // Check if user already exists
      const exists = prev.find(u => u.email === user.email);
      if (exists) {
        return prev; // Don't add duplicate
      }
      return [...prev, user];
    });
  };

  // Function to remove a pending user (when approved or rejected)
  const removePendingUser = (userId) => {
    setPendingUsers(prev => prev.filter(user => user.id !== userId));
  };

  // Function to update a pending user's role
  const updatePendingUserRole = (userId, newRole) => {
    setPendingUsers(prev => prev.map(user => 
      user.id === userId 
        ? { ...user, requestedRole: newRole }
        : user
    ));
  };

  // Function to get all pending users
  const getPendingUsers = () => {
    return pendingUsers;
  };

  const value = {
    pendingUsers,
    addPendingUser,
    removePendingUser,
    updatePendingUserRole,
    getPendingUsers
  };

  return (
    <PendingUsersContext.Provider value={value}>
      {children}
    </PendingUsersContext.Provider>
  );
}
