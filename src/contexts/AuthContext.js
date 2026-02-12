import React, { createContext, useContext, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { signInWithPopup, signInWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { USER_ROLES, getUserByRole, getRolePermissions } from '../entities/UserRoles';
import { firestoreService } from '../services/firestoreService';
import { appNavigate } from '../utils/navigation';
import { usePendingUsers } from './PendingUsersContext';
import { useViewAs } from './ViewAsContext';
import { googleCalendarService } from '../services/googleCalendarService';

// ============================================================================
// SYSTEM ADMINS - Full access to everything (excludes demo; demo is view-only)
// ============================================================================
const SYSTEM_ADMINS = ['jrsschroeder@gmail.com'];
const isSystemAdmin = (email) => SYSTEM_ADMINS.includes(email?.toLowerCase());

// Demo login: can see everything, cannot edit anything
const DEMO_VIEW_ONLY_EMAILS = ['demo@luxurylistings.app'];
const isDemoViewOnly = (email) => DEMO_VIEW_ONLY_EMAILS.includes(email?.toLowerCase());

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
  
  async function signInWithGoogle() {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      
      // Get the Google OAuth credential which includes the access token
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        const userEmail = result.user.email;
        console.log('🔐 Got Google access token during sign-in for:', userEmail);
        
        // Store the token for Google Calendar use (expires in 1 hour)
        // The googleCalendarService will use this for calendar operations
        const tokenKey = `google_calendar_token_${userEmail}`;
        const expiryKey = `google_calendar_token_expiry_${userEmail}`;
        const expiryTime = Date.now() + (3600 * 1000); // 1 hour
        
        localStorage.setItem(tokenKey, credential.accessToken);
        localStorage.setItem(expiryKey, expiryTime.toString());
        
        console.log('✅ Calendar access token stored for:', userEmail);
        
        // Try to initialize calendar service with the new token
        try {
          await googleCalendarService.tryAutoReconnect(userEmail);
          console.log('✅ Google Calendar auto-connected on sign-in');
        } catch (calError) {
          console.warn('⚠️ Could not auto-connect calendar:', calError);
        }
      }
      
      return result;
    } catch (error) {
      console.error('Sign-in error:', error);
      throw error;
    }
  }

  async function signInWithEmail(email, password) {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ Email sign-in successful for:', email);
      return result;
    } catch (error) {
      console.error('Email sign-in error:', error);
      // Provide user-friendly error messages
      if (error.code === 'auth/user-not-found') {
        throw new Error('No account found with this email address.');
      } else if (error.code === 'auth/wrong-password') {
        throw new Error('Incorrect password. Please try again.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address.');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Too many failed attempts. Please try again later.');
      } else if (error.code === 'auth/invalid-credential') {
        throw new Error('Invalid email or password. Please check your credentials.');
      }
      throw error;
    }
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
    
    // Demo view-only cannot switch roles
    if (currentUser?.isDemoViewOnly) {
      toast.error('Demo account cannot change roles.');
      return;
    }
    // System admins can switch to any role
    if (!isSystemAdmin(currentUser.email)) {
      const assignedRoles = currentUser.roles || [currentUser.primaryRole || currentUser.role] || ['content_director'];
      if (!assignedRoles.includes(newRole)) {
        toast.error('You are not authorized to switch to this role.');
        return;
      }
    }
    
    if (!Object.values(USER_ROLES).includes(newRole)) {
      toast.error(`Invalid role: ${newRole}`);
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

    // Demo view-only: see everything, no edit; skip Firestore approval
    if (isDemoViewOnly(email)) {
      const roleUserData = getUserByRole(USER_ROLES.CONTENT_DIRECTOR);
      const demoUser = {
        uid,
        email,
        displayName: displayName || 'Demo User',
        firstName: displayName?.split(' ')[0] || 'Demo',
        lastName: displayName?.split(' ').slice(1).join(' ') || 'User',
        position: roleUserData.position,
        role: USER_ROLES.CONTENT_DIRECTOR,
        roles: [USER_ROLES.CONTENT_DIRECTOR],
        primaryRole: USER_ROLES.CONTENT_DIRECTOR,
        department: 'Demo (View Only)',
        startDate: roleUserData.startDate,
        avatar: photoURL || roleUserData.avatar,
        bio: roleUserData.bio,
        skills: roleUserData.skills,
        stats: roleUserData.stats,
        isApproved: true,
        onboardingCompleted: true,
        isDemoViewOnly: true
      };
      setCurrentRole(USER_ROLES.CONTENT_DIRECTOR);
      setCurrentUser(demoUser);
      setUserData(demoUser);
      saveAuthToStorage(demoUser);
      const currentPath = window.location.pathname;
      if (currentPath === '/login' || currentPath === '/') {
        appNavigate('/dashboard', { replace: true });
      }
      return;
    }

    // System admin - full access; merge in saved profile from approved_users if present
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
        position: roleUserData.position,
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

      // Persist: load saved profile from approved_users (My Profile writes here)
      try {
        const approved = await firestoreService.getApprovedUserByEmail(email);
        if (approved?.displayName) adminUser.displayName = approved.displayName;
        if (approved?.firstName != null) adminUser.firstName = approved.firstName;
        if (approved?.lastName != null) adminUser.lastName = approved.lastName;
        if (approved?.position != null) adminUser.position = approved.position;
        if (approved?.department) adminUser.department = approved.department;
        if (approved?.avatar) adminUser.avatar = approved.avatar;
      } catch (e) { /* ignore */ }
      
      setCurrentRole(roleToUse);
      setCurrentUser(adminUser);
      setUserData(adminUser);
      saveAuthToStorage(adminUser);
      return;
    }

    // Check if user is approved (direct lookup first so admin-added members are found regardless of doc id casing)
    try {
      let approvedUser = await firestoreService.getApprovedUserByEmail(email);
      if (!approvedUser) {
        const approvedUsers = await firestoreService.getApprovedUsers();
        const emailLower = (email || '').toLowerCase();
        const matched = approvedUsers.filter(u =>
          (u.id || '').toLowerCase() === emailLower || (u.email || '').toLowerCase() === emailLower
        );
        approvedUser = matched[0];
      }
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
          position: approvedUser.position || roleUserData.position,
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
        
        // Sync Gmail profile photo only to approved_users (name stays from personal info / Firestore)
        if (photoURL) {
          const docId = approvedUser.id || email;
          firestoreService.updateApprovedUser(docId, { avatar: photoURL }).catch(() => {});
        }
        
        // Navigate based on status (only redirect to onboarding after they're past login)
        const currentPath = window.location.pathname;
        const onLoginOrHome = currentPath === '/login' || currentPath === '/';
        if (onLoginOrHome) {
          if (mergedUser.onboardingCompleted) {
            appNavigate('/dashboard', { replace: true });
          } else {
            appNavigate('/onboarding', { replace: true });
          }
        } else if (!mergedUser.onboardingCompleted && currentPath !== '/onboarding') {
          appNavigate('/onboarding', { replace: true });
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

  // Listen for profile changes from Firestore (My Profile writes to approved_users; applies to all users with a doc)
  useEffect(() => {
    if (!currentUser?.email) return;

    const unsubscribe = firestoreService.onApprovedUserChange(currentUser.email, (approvedUser) => {
      if (!approvedUser) return;
      
      // Update current user with new profile data
      setCurrentUser(prev => {
        if (!prev) return prev;
        
        const updated = {
          ...prev,
          displayName: approvedUser.displayName || prev.displayName,
          firstName: approvedUser.firstName || prev.firstName,
          lastName: approvedUser.lastName || prev.lastName,
          position: approvedUser.position ?? prev.position,
          department: approvedUser.department || prev.department,
          avatar: approvedUser.avatar || prev.avatar,
          phone: approvedUser.phone || prev.phone,
          location: approvedUser.location || prev.location,
          bio: approvedUser.bio || prev.bio,
          role: approvedUser.role || prev.role,
          primaryRole: approvedUser.primaryRole || prev.primaryRole,
          roles: approvedUser.roles || prev.roles,
          customPermissions: approvedUser.customPermissions || prev.customPermissions || [],
          onboardingCompleted: approvedUser.onboardingCompleted !== undefined ? approvedUser.onboardingCompleted : prev.onboardingCompleted,
          onboardingCompletedDate: approvedUser.onboardingCompletedDate ?? prev.onboardingCompletedDate
        };
        
        // Also update localStorage cache
        saveAuthToStorage(updated);
        return updated;
      });
      
      setUserData(prev => prev ? { ...prev, ...approvedUser } : approvedUser);
    });

    return () => unsubscribe();
  }, [currentUser?.email]);

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
  
  const mergeCurrentUser = (partial) => {
    setCurrentUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...partial };
      saveAuthToStorage(updated);
      return updated;
    });
  };

  const viewAs = useViewAs();
  const isViewingAs = viewAs?.isViewingAs && viewAs?.viewingAsUser;
  const effectiveUser = isViewingAs ? viewAs.viewingAsUser : currentUser;
  const effectiveRole = isViewingAs && viewAs.viewAsRole ? viewAs.viewAsRole : currentRole;
  const viewAsPagePerms = viewAs?.viewAsPermissions || [];
  const viewAsRolePerms = getRolePermissions(effectiveRole)?.permissions;

  const value = {
    currentUser: effectiveUser,
    userData: effectiveUser ?? userData,
    currentRole: effectiveRole,
    loading,
    switchRole,
    getCurrentRolePermissions: () => getRolePermissions(effectiveRole),
    hasPermission: (permission) => {
      if (isViewingAs) {
        const custom = effectiveUser?.customPermissions || [];
        return viewAsPagePerms.includes(permission) || (viewAsRolePerms && viewAsRolePerms[permission]) || custom.includes(permission);
      }
      return hasPermission(permission);
    },
    signInWithGoogle,
    signInWithEmail,
    logout,
    chatbotResetTrigger,
    mergeCurrentUser,
    realUser: currentUser,
    isSystemAdmin: isSystemAdmin(currentUser?.email),
    isViewingAs: !!isViewingAs,
    viewingAsUser: viewAs?.viewingAsUser ?? null,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * useEffectiveAuth - Hook that returns the effective user (viewed user if in View As mode)
 * Use this in components that should respect View As mode
 */
export function useEffectiveAuth() {
  const auth = useAuth();
  
  // Get ViewAs context - returns safe defaults if not available
  const viewAs = useViewAs();
  
  if (viewAs?.isViewingAs && viewAs?.viewingAsUser) {
    return {
      ...auth,
      currentUser: {
        ...viewAs.viewingAsUser,
        _realUser: auth.currentUser,
        _isViewingAs: true
      },
      currentRole: viewAs.viewAsRole || auth.currentRole,
      hasPermission: (permission) => {
        // When viewing as, check the viewed user's permissions
        return viewAs.viewAsPermissions?.includes(permission) || false;
      },
      isViewingAs: true,
      realUser: auth.currentUser,
      viewingAsUser: viewAs.viewingAsUser
    };
  }
  
  return {
    ...auth,
    isViewingAs: false,
    realUser: auth.currentUser,
    viewingAsUser: null
  };
}
