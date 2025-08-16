import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider 
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { USER_ROLES, getUserByRole, getRolePermissions } from '../entities/UserRoles';
import { getUserRoleMapping, canUserSwitchToRole, getAllowedRolesForUser, DEFAULT_ROLE } from '../entities/UserRoleMapping';

// Flag to disable Google authentication
const GOOGLE_AUTH_DISABLED = false;

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
      : USER_ROLES.CONTENT_DIRECTOR; // Default to content director for new users
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
    
    if (!currentUser || !currentUser.email) {
      console.error('❌ No user logged in');
      return;
    }
    
    // Check if user can switch to this role
    if (!canUserSwitchToRole(currentUser.email, newRole)) {
      console.error('❌ User not authorized to switch to role:', newRole);
      alert('You are not authorized to switch to this role. Please contact your administrator.');
      return;
    }
    
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
        if (user) {
          // User is signed in - get their role mapping
          const roleMapping = getUserRoleMapping(user.email);
          
          if (roleMapping) {
            // User has a role mapping - set their assigned role
            const assignedRole = roleMapping.role;
            setCurrentRole(assignedRole);
            localStorage.setItem('luxury-listings-role', assignedRole);
            
            // Get user data for the assigned role
            const userData = getUserByRole(assignedRole);
            
            // Merge Firebase user data with role data
            const mergedUser = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || userData.displayName,
              firstName: userData.firstName,
              lastName: userData.lastName,
              role: assignedRole,
              department: userData.department,
              startDate: userData.startDate,
              avatar: user.photoURL || userData.avatar,
              bio: userData.bio,
              skills: userData.skills,
              stats: userData.stats
            };
            
            setCurrentUser(mergedUser);
          } else {
            // New user - assign default role
            setCurrentRole(DEFAULT_ROLE);
            localStorage.setItem('luxury-listings-role', DEFAULT_ROLE);
            
            const userData = getUserByRole(DEFAULT_ROLE);
            const defaultUser = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || userData.displayName,
              firstName: userData.firstName,
              lastName: userData.lastName,
              role: DEFAULT_ROLE,
              department: userData.department,
              startDate: userData.startDate,
              avatar: user.photoURL || userData.avatar,
              bio: userData.bio,
              skills: userData.skills,
              stats: userData.stats
            };
            
            setCurrentUser(defaultUser);
          }
        } else {
          // User is signed out
          setCurrentUser(null);
          setCurrentRole(DEFAULT_ROLE);
        }
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

