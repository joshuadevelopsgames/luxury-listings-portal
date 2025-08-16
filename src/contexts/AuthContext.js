import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider 
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { USER_ROLES, getUserByRole, getRolePermissions } from '../entities/UserRoles';

// Flag to disable Google authentication
const GOOGLE_AUTH_DISABLED = true;

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentRole, setCurrentRole] = useState(() => {
    // Try to get role from localStorage first, fallback to default
    const savedRole = localStorage.getItem('luxury-listings-role');
    return savedRole && Object.values(USER_ROLES).includes(savedRole) 
      ? savedRole 
      : USER_ROLES.ADMIN;
  });
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [chatbotResetTrigger, setChatbotResetTrigger] = useState(0);

  function signInWithGoogle() {
    if (GOOGLE_AUTH_DISABLED) {
      // Bypass authentication for development
      console.log('Google authentication is currently disabled');
      return Promise.resolve();
    }
    return signInWithPopup(auth, googleProvider);
  }

  function logout() {
    if (GOOGLE_AUTH_DISABLED) {
      // Bypass logout for development
      console.log('Logout bypassed - Google authentication is disabled');
      return Promise.resolve();
    }
    return signOut(auth);
  }

  function switchRole(newRole) {
    console.log('🔍 switchRole called with:', newRole);
    console.log('🔍 Available roles:', Object.values(USER_ROLES));
    
    if (Object.values(USER_ROLES).includes(newRole)) {
      console.log('✅ Role is valid, switching to:', newRole);
      setCurrentRole(newRole);
      // Save role to localStorage for persistence
      localStorage.setItem('luxury-listings-role', newRole);
      
      const userData = getUserByRole(newRole);
      console.log('🔍 User data for role:', userData);
      
      setCurrentUser({
        ...currentUser,
        ...userData,
        role: newRole
      });
      
      // Trigger chatbot reset
      setChatbotResetTrigger(prev => prev + 1);
      
      // Navigate to dashboard
      if (window.location.pathname !== '/dashboard') {
        window.location.href = '/dashboard';
      }
      
      console.log(`✅ Successfully switched to role: ${newRole}`);
    } else {
      console.error('❌ Invalid role:', newRole);
    }
  }

  function getCurrentRolePermissions() {
    console.log('🔍 getCurrentRolePermissions called with currentRole:', currentRole);
    const permissions = getRolePermissions(currentRole);
    console.log('🔍 Retrieved permissions:', permissions);
    return permissions;
  }

  function hasPermission(permission) {
    const permissions = getCurrentRolePermissions();
    return permissions.permissions[permission] || false;
  }

  useEffect(() => {
    if (GOOGLE_AUTH_DISABLED && !isInitialized) {
      // Only initialize once
      setIsInitialized(true);
      
      // Get the current role (either from localStorage or default)
      const userData = getUserByRole(currentRole);
      const mockUser = {
        uid: userData.uid,
        email: userData.email,
        displayName: userData.displayName,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        department: userData.department,
        startDate: userData.startDate,
        avatar: userData.avatar,
        bio: userData.bio,
        skills: userData.skills,
        stats: userData.stats
      };
      setCurrentUser(mockUser);
      setLoading(false);
      return;
    }

    if (!GOOGLE_AUTH_DISABLED) {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setCurrentUser(user);
        setLoading(false);
      });

      return unsubscribe;
    }
  }, [currentRole, isInitialized]);

  const value = {
    currentUser,
    currentRole,
    switchRole,
    getCurrentRolePermissions,
    hasPermission,
    signInWithGoogle,
    logout,
    isGoogleAuthDisabled: GOOGLE_AUTH_DISABLED,
    chatbotResetTrigger
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

