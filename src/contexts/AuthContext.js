import React, { createContext, useContext, useEffect, useState } from 'react';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { USER_ROLES, getUserByRole, getRolePermissions } from '../entities/UserRoles';
import { firestoreService } from '../services/firestoreService';
import { appNavigate } from '../utils/navigation';
import { usePendingUsers } from './PendingUsersContext';

// ============================================================================
// SYSTEM ADMINS - Full access to everything
// ============================================================================
const SYSTEM_ADMINS = ['jrsschroeder@gmail.com'];
const isSystemAdmin = (email) => SYSTEM_ADMINS.includes(email?.toLowerCase());

// ============================================================================
// LOCAL STORAGE - Persist auth state for faster page loads
// ============================================================================
const AUTH_STORAGE_KEY = 'luxury_listings_auth';

const saveAuthToStorage = (user) => {
  try {
    if (user) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch (e) { /* silent */ }
};

const loadAuthFromStorage = () => {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    return null;
  }
};

// Helper to get department for a role
const getDepartmentForRole = (role) => {
  const departments = {
    'admin': 'Administration',
    'content_director': 'Content & Creative',
    'social_media_manager': 'Marketing',
    'hr_manager': 'Human Resources',
    'sales_manager': 'Sales'
  };
  return departments[role] || 'General';
};

// ============================================================================
// AUTH CONTEXT
// ============================================================================
const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  // Initialize from localStorage for instant restore on refresh
  const storedAuth = loadAuthFromStorage();
  
  const [currentUser, setCurrentUser] = useState(storedAuth);
  const [userData, setUserData] = useState(storedAuth);
  const [currentRole, setCurrentRole] = useState(storedAuth?.role || USER_ROLES.CONTENT_DIRECTOR);
  const [loading, setLoading] = useState(!storedAuth); // No loading if we have cached auth
  const [chatbotResetTrigger, setChatbotResetTrigger] = useState(0);

  const { addPendingUser } = usePendingUsers();

  // ============================================================================
  // AUTH METHODS
  // ============================================================================
  
  function signInWithGoogle() {
    return signInWithPopup(auth, googleProvider);
  }

  function logout() {
    saveAuthToStorage(null);
    setCurrentUser(null);
    setUserData(null);
    setCurrentRole(USER_ROLES.CONTENT_DIRECTOR);
    return signOut(auth);
  }

  async function switchRole(newRole) {
    if (!currentUser?.email) return;
    
    // System admins can switch to any role
    if (!isSystemAdmin(currentUser.email)) {
      const assignedRoles = currentUser.roles || [currentUser.primaryRole || currentUser.role] || ['content_director'];
      if (!assignedRoles.includes(newRole)) {
        alert('You are not authorized to switch to this role.');
        return;
      }
    }
    
    if (!Object.values(USER_ROLES).includes(newRole)) {
      alert(`Invalid role: ${newRole}`);
      return;
    }

    setCurrentRole(newRole);
    
    // Save to Firestore
    try {
      await firestoreService.saveSystemConfig('currentRole', newRole);
    } catch (e) { /* silent */ }
    
    // Update user with new role data
    const roleUserData = getUserByRole(newRole);
    const updatedUser = {
      ...currentUser,
      ...roleUserData,
      role: newRole,
      primaryRole: newRole,
      email: currentUser.email,
      firstName: currentUser.firstName,
      lastName: currentUser.lastName,
      displayName: currentUser.displayName,
      avatar: currentUser.avatar,
      uid: currentUser.uid,
      customPermissions: currentUser.customPermissions || []
    };
    
    setCurrentUser(updatedUser);
    setChatbotResetTrigger(prev => prev + 1);
  }

  function getCurrentRolePermissions() {
    return getRolePermissions(currentRole);
  }

  function hasPermission(permission) {
    // System admin always has all permissions
    if (isSystemAdmin(currentUser?.email)) return true;
    
    // Check custom permissions
    const customPerms = currentUser?.customPermissions || userData?.customPermissions || [];
    if (customPerms.includes(permission)) return true;
    
    // Check role permissions
    const permissions = getCurrentRolePermissions();
    return permissions.permissions[permission] || false;
  }

  // ============================================================================
  // FIREBASE AUTH LISTENER
  // ============================================================================
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // User is signed in
          await handleUserSignIn(firebaseUser);
        } else {
          // User signed out
          saveAuthToStorage(null);
          setCurrentUser(null);
          setUserData(null);
          setCurrentRole(USER_ROLES.CONTENT_DIRECTOR);
        }
      } catch (error) {
        console.error('Auth error:', error);
        setCurrentUser(null);
        setCurrentRole(USER_ROLES.CONTENT_DIRECTOR);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Handle user sign-in logic
  async function handleUserSignIn(firebaseUser) {
    const { uid, email, displayName, photoURL } = firebaseUser;

    // System admin - full access
    if (isSystemAdmin(email)) {
      let savedRole;
      try {
        savedRole = await firestoreService.getSystemConfig('currentRole');
      } catch (e) {
        savedRole = null;
      }
      
      const roleToUse = savedRole && Object.values(USER_ROLES).includes(savedRole) 
        ? savedRole 
        : USER_ROLES.ADMIN;
      
      const roleUserData = getUserByRole(roleToUse);
      const adminUser = {
        uid,
        email,
        displayName: displayName || roleUserData.displayName,
        firstName: displayName?.split(' ')[0] || roleUserData.firstName,
        lastName: displayName?.split(' ').slice(1).join(' ') || roleUserData.lastName,
        role: roleToUse,
        roles: Object.values(USER_ROLES), // Admin can access all roles
        primaryRole: USER_ROLES.ADMIN,
        department: roleUserData.department,
        startDate: roleUserData.startDate,
        avatar: photoURL || roleUserData.avatar,
        bio: roleUserData.bio,
        skills: roleUserData.skills,
        stats: roleUserData.stats,
        isApproved: true,
        onboardingCompleted: true
      };
      
      setCurrentRole(roleToUse);
      setCurrentUser(adminUser);
      setUserData(adminUser);
      saveAuthToStorage(adminUser);
      return;
    }

    // Check if user is approved
    try {
      const approvedUsers = await firestoreService.getApprovedUsers();
      const approvedUser = approvedUsers.find(u => u.email === email);
      
      if (approvedUser?.isApproved) {
        // Approved user
        const assignedRoles = approvedUser.roles || [approvedUser.primaryRole || approvedUser.role] || ['content_director'];
        const primaryRole = assignedRoles[0] || 'content_director';
        
        let savedRole;
        try {
          savedRole = await firestoreService.getSystemConfig('currentRole');
        } catch (e) {
          savedRole = null;
        }
        
        const roleToUse = savedRole && assignedRoles.includes(savedRole) ? savedRole : primaryRole;
        const roleUserData = getUserByRole(roleToUse);
        
        const mergedUser = {
          uid,
          email,
          displayName: approvedUser.displayName || displayName || roleUserData.displayName,
          firstName: approvedUser.firstName || displayName?.split(' ')[0] || roleUserData.firstName,
          lastName: approvedUser.lastName || displayName?.split(' ').slice(1).join(' ') || roleUserData.lastName,
          role: roleToUse,
          roles: assignedRoles,
          primaryRole,
          department: approvedUser.department || roleUserData.department,
          startDate: approvedUser.startDate || roleUserData.startDate,
          avatar: approvedUser.avatar || photoURL || roleUserData.avatar,
          bio: approvedUser.bio || roleUserData.bio,
          skills: approvedUser.skills || roleUserData.skills,
          stats: approvedUser.stats || roleUserData.stats,
          customPermissions: approvedUser.customPermissions || [],
          isApproved: true,
          onboardingCompleted: approvedUser.onboardingCompleted
        };
        
        setCurrentRole(roleToUse);
        setCurrentUser(mergedUser);
        setUserData(mergedUser);
        saveAuthToStorage(mergedUser);
        
        // Navigate based on status
        const currentPath = window.location.pathname;
        if (currentPath === '/login' || currentPath === '/') {
          if (!mergedUser.onboardingCompleted) {
            appNavigate('/onboarding', { replace: true });
          } else {
            appNavigate('/dashboard', { replace: true });
          }
        }
      } else {
        // New/pending user
        const newUser = {
          uid,
          email,
          displayName: displayName || 'New User',
          firstName: displayName?.split(' ')[0] || 'New',
          lastName: displayName?.split(' ').slice(1).join(' ') || 'User',
          role: 'pending',
          department: 'Pending Approval',
          startDate: new Date().toISOString().split('T')[0],
          avatar: photoURL,
          isApproved: false
        };
        
        setCurrentUser(newUser);
        setUserData(newUser);
        setCurrentRole('pending');
        
        // Add to pending users in Firestore
        try {
          const existingPending = await firestoreService.getPendingUsers();
          const alreadyPending = existingPending.some(u => u.email === email);
          
          if (!alreadyPending) {
            await firestoreService.addPendingUser({
              ...newUser,
              id: `pending-${Date.now()}`,
              createdAt: new Date().toISOString()
            });
          }
        } catch (e) {
          console.warn('Could not add to pending users:', e);
        }
        
        // Navigate to waiting page
        if (window.location.pathname !== '/waiting-for-approval') {
          appNavigate('/waiting-for-approval', { replace: true });
        }
      }
    } catch (error) {
      console.error('Error checking user approval:', error);
      setCurrentRole('pending');
      setCurrentUser({
        uid,
        email,
        displayName: displayName || 'New User',
        role: 'pending',
        isApproved: false
      });
    }
  }

  // Load saved role when user changes
  useEffect(() => {
    if (!currentUser) return;

    const loadCurrentRole = async () => {
      try {
        const savedRole = await firestoreService.getSystemConfig('currentRole');
        if (savedRole && Object.values(USER_ROLES).includes(savedRole)) {
          setCurrentRole(savedRole);
        }
      } catch (e) { /* silent */ }
    };

    loadCurrentRole();
  }, [currentUser]);

  // Safety timeout - show app after 10s even if auth is stuck
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('Auth timeout - showing app');
        setLoading(false);
      }
    }, 10000);

    return () => clearTimeout(timeout);
  }, [loading]);

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================
  
  const value = {
    currentUser,
    userData,
    currentRole,
    loading,
    switchRole,
    getCurrentRolePermissions,
    hasPermission,
    signInWithGoogle,
    logout,
    chatbotResetTrigger,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
