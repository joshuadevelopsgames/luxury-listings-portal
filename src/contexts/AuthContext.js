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
import { firestoreService } from '../services/firestoreService';
import Loader from '../components/Loader';

// Import the pending users context
import { usePendingUsers } from './PendingUsersContext';

// ============================================================================
// SYSTEM ADMINS - These users have full access to everything
// ============================================================================
const SYSTEM_ADMINS = [
  'jrsschroeder@gmail.com'
];

// Helper to check if email is a system admin
const isSystemAdmin = (email) => SYSTEM_ADMINS.includes(email?.toLowerCase());

// ============================================================================
// LOCAL STORAGE PERSISTENCE
// ============================================================================
const AUTH_STORAGE_KEY = 'luxury_listings_auth';

const saveAuthToStorage = (user) => {
  try {
    if (user) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch (error) {
    // Silent fail for localStorage
  }
};

const loadAuthFromStorage = () => {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    // Silent fail for localStorage
  }
  return null;
};

// Helper function to get department for a role
const getDepartmentForRole = (role) => {
  if (!role) return 'General';
  
  const departments = {
    'admin': 'Administration',
    'content_director': 'Content & Creative',
    'social_media_manager': 'Marketing',
    'hr_manager': 'Human Resources',
    'sales_manager': 'Sales'
  };
  return departments[role] || 'General';
};

// Only log redirect skip once per session to avoid console spam
let _redirectSkipLogged = false;
const navigateBasedOnRole = (role, userData) => {
  const currentPath = window.location.pathname;
  const shouldRedirect = currentPath === '/login' || currentPath === '/waiting-for-approval' || currentPath === '/';
  // #region agent log
  var _doRedirect = false;
  if (role === 'pending' && currentPath !== '/waiting-for-approval') _doRedirect = true;
  else if (role && role !== 'pending') {
    if (!userData?.onboardingCompleted && currentPath !== '/onboarding') _doRedirect = true;
    else if (currentPath === '/login' || currentPath === '/') _doRedirect = true;
  }
  fetch('http://127.0.0.1:7247/ingest/5f481a4f-2c53-40ee-be98-e77cffd69946',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.js:navigateBasedOnRole',message:'navigateBasedOnRole',data:{currentPath,shouldRedirect,doRedirect:shouldRedirect&&_doRedirect},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
  // #endregion

  if (!shouldRedirect) {
    if (!_redirectSkipLogged) {
      _redirectSkipLogged = true;
      console.log('🔍 Skipping redirect - user is already on:', currentPath);
    }
    return;
  }
  _redirectSkipLogged = false;

  if (role === 'pending' && currentPath !== '/waiting-for-approval') {
    console.log('🔄 Navigating pending user to approval page...');
    window.location.href = '/waiting-for-approval';
  } else if (role && role !== 'pending') {
    // Check if user needs onboarding
    if (!userData?.onboardingCompleted && currentPath !== '/onboarding') {
      console.log('🎓 New user detected - navigating to onboarding...');
      window.location.href = '/onboarding';
    } else if (currentPath === '/login' || currentPath === '/') {
      console.log('🔄 Navigating approved user to dashboard...');
      window.location.href = '/dashboard';
    }
  }
};

// Flag to disable Google authentication
const GOOGLE_AUTH_DISABLED = false;

// Dev mode: Auto-login as jrsschroeder@gmail.com
// Works in: local development OR Vercel preview deployments (dev branch)
// Check multiple ways to detect preview/dev environment
const isVercelPreview = 
  process.env.VERCEL_ENV === 'preview' ||
  process.env.VERCEL === '1' ||
  window.location.hostname.includes('vercel.app');

const DEV_MODE_AUTO_LOGIN = 
  process.env.NODE_ENV === 'development' || 
  isVercelPreview ||
  process.env.REACT_APP_DEV_AUTO_LOGIN === 'true';

const DEV_AUTO_LOGIN_EMAIL = 'jrsschroeder@gmail.com';

// Dev mode status logged only once on initial load (not on every render)
if (typeof window !== 'undefined' && !window.__devModeLogged) {
  window.__devModeLogged = true;
  console.log('🔍 Dev Mode:', DEV_MODE_AUTO_LOGIN ? 'ENABLED' : 'DISABLED');
}

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  // Initialize from localStorage for instant restore on page refresh
  const storedAuth = loadAuthFromStorage();
  
  const [currentRole, setCurrentRole] = useState(storedAuth?.role || USER_ROLES.CONTENT_DIRECTOR);
  const [currentUser, setCurrentUser] = useState(storedAuth);
  const [userData, setUserData] = useState(storedAuth); // Full employee data from Firestore
  const [loading, setLoading] = useState(!storedAuth); // If we have stored auth, don't show loading
  const [isInitialized, setIsInitialized] = useState(!!storedAuth);
  const [chatbotResetTrigger, setChatbotResetTrigger] = useState(0);
  
  // Get pending users functions
  const { addPendingUser } = usePendingUsers();
  
  // Track if auth listener is already set up to prevent duplicates
  const [authListenerSetup, setAuthListenerSetup] = useState(false);

  function signInWithGoogle() {
    if (GOOGLE_AUTH_DISABLED) {
      // Bypass authentication for development
      console.log('Google authentication is currently disabled');
      return Promise.resolve();
    }
    return signInWithPopup(auth, googleProvider);
  }

  function logout() {
    // Clear localStorage on logout
    saveAuthToStorage(null);
    setCurrentUser(null);
    setUserData(null);
    setCurrentRole(USER_ROLES.CONTENT_DIRECTOR);
    
    if (GOOGLE_AUTH_DISABLED) {
      // Bypass logout for development
      console.log('Logout bypassed - Google authentication is disabled');
      return Promise.resolve();
    }
    return signOut(auth);
  }

  async function switchRole(newRole) {
    if (!currentUser || !currentUser.email) {
      return;
    }
    
    // System admin users can always switch to any role
    if (!isSystemAdmin(currentUser.email)) {
      // Check if user has this role in their assigned roles from Firestore
      const assignedRoles = currentUser.roles || [currentUser.primaryRole || currentUser.role] || ['content_director'];
      if (!assignedRoles.includes(newRole)) {
        alert('You are not authorized to switch to this role. Please contact your administrator.');
        return;
      }
    }
    
    const validRoles = Object.values(USER_ROLES);
    
    if (validRoles.includes(newRole)) {
      // Update the current role first
      setCurrentRole(newRole);
      
      // Save role to Firestore for persistence
      try {
        await firestoreService.saveSystemConfig('currentRole', newRole);
      } catch (error) {
        // Silent fail
      }
      
      // Update current user with new role data
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
      
      // Trigger chatbot reset
      setChatbotResetTrigger(prev => prev + 1);
    } else {
      alert(`Invalid role: ${newRole}. Please try again.`);
    }
  }

  function getCurrentRolePermissions() {
    return getRolePermissions(currentRole);
  }

  function hasPermission(permission) {
    // Special handling for admin user - always grant all permissions
    if (currentUser?.email === 'jrsschroeder@gmail.com') {
      return true;
    }
    
    // Check user-specific permissions first (these override role permissions)
    if (currentUser?.customPermissions && Array.isArray(currentUser.customPermissions)) {
      if (currentUser.customPermissions.includes(permission)) {
        return true;
      }
    }
    
    // Also check userData for custom permissions
    if (userData?.customPermissions && Array.isArray(userData.customPermissions)) {
      if (userData.customPermissions.includes(permission)) {
        return true;
      }
    }
    
    // Fall back to role-based permissions
    const permissions = getCurrentRolePermissions();
    return permissions.permissions[permission] || false;
  }

  // Load current role from Firestore only when user is authenticated (avoids permission error on login page)
  useEffect(() => {
    if (!currentUser) return;

    const loadCurrentRole = async () => {
      try {
        const savedRole = await firestoreService.getSystemConfig('currentRole');
        if (savedRole && Object.values(USER_ROLES).includes(savedRole)) {
          setCurrentRole(savedRole);
        }
      } catch (error) {
        // Use default role on error (e.g. insufficient permissions before auth)
      }
    };

    loadCurrentRole();
  }, [currentUser]);

  useEffect(() => {
    // Dev mode: Auto-login as jrsschroeder@gmail.com
    if (DEV_MODE_AUTO_LOGIN && !isInitialized) {
      try {
        console.log('🔧 DEV MODE: Auto-logging in as', DEV_AUTO_LOGIN_EMAIL);
        setIsInitialized(true);
        
        // Create mock admin user for dev mode
        const adminUserData = getUserByRole(USER_ROLES.ADMIN);
        const devUser = {
          uid: 'dev-user-' + Date.now(),
          email: DEV_AUTO_LOGIN_EMAIL,
          displayName: 'Joshua Schroeder',
          firstName: 'Joshua',
          lastName: 'Schroeder',
          role: USER_ROLES.ADMIN,
          roles: Object.values(USER_ROLES), // Admin can access all roles
          primaryRole: USER_ROLES.ADMIN,
          department: adminUserData?.department || 'Administration',
          startDate: adminUserData?.startDate || new Date().toISOString().split('T')[0],
          avatar: adminUserData?.avatar || 'JS',
          bio: adminUserData?.bio || 'Development Admin User',
          skills: adminUserData?.skills || [],
          stats: adminUserData?.stats || {},
          isApproved: true
        };
        
        setCurrentUser(devUser);
        setUserData(devUser);
        setCurrentRole(USER_ROLES.ADMIN);
        setLoading(false);
        
        // Navigate to dashboard if on login page
        const currentPath = window.location.pathname;
        if (currentPath === '/login' || currentPath === '/') {
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 100);
        }
      } catch (error) {
        console.error('❌ Error in dev mode auto-login:', error);
        setLoading(false);
      }
      return;
    }

    if (GOOGLE_AUTH_DISABLED && !isInitialized) {
      // Only initialize once
      setIsInitialized(true);
      
      // Get the current role (either from localStorage or default)
      const roleUserData = getUserByRole(currentRole);
      const mockUser = {
        uid: roleUserData.uid,
        email: roleUserData.email,
        displayName: roleUserData.displayName,
        firstName: roleUserData.firstName,
        lastName: roleUserData.lastName,
        role: roleUserData.role,
        department: roleUserData.department,
        startDate: roleUserData.startDate,
        avatar: roleUserData.avatar,
        bio: roleUserData.bio,
        skills: roleUserData.skills,
        stats: roleUserData.stats
      };
      setCurrentUser(mockUser);
      setLoading(false);
      return;
    }

    // Skip Firebase auth if dev mode is enabled or already setup
    if (DEV_MODE_AUTO_LOGIN || authListenerSetup) {
      return;
    }

    if (!GOOGLE_AUTH_DISABLED) {
      // Mark that we're setting up the listener to prevent duplicates
      setAuthListenerSetup(true);
      
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        try {
          if (user) {
            // Special handling for system admin users
            if (isSystemAdmin(user.email)) {
              // Load saved role from Firestore or use admin as default
              let savedRole;
              try {
                savedRole = await firestoreService.getSystemConfig('currentRole');
              } catch (error) {
                savedRole = null;
              }
              
              // Use saved role if valid, otherwise use admin
              const roleToUse = savedRole && Object.values(USER_ROLES).includes(savedRole) ? savedRole : USER_ROLES.ADMIN;
              
              // Get user data for the role
              const roleUserData = getUserByRole(roleToUse);
              
              // Create admin user object
              const adminUser = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || roleUserData.displayName,
                firstName: user.displayName?.split(' ')[0] || roleUserData.firstName,
                lastName: user.displayName?.split(' ').slice(1).join(' ') || roleUserData.lastName,
                role: roleToUse,
                roles: Object.values(USER_ROLES), // Admin can access all roles
                primaryRole: USER_ROLES.ADMIN, // Keep admin as primary
                department: roleUserData.department,
                startDate: roleUserData.startDate,
                avatar: user.photoURL || roleUserData.avatar,
                bio: roleUserData.bio,
                skills: roleUserData.skills,
                stats: roleUserData.stats,
                isApproved: true,
                onboardingCompleted: true // Admin doesn't need onboarding
              };
              
              setCurrentRole(roleToUse);
              setCurrentUser(adminUser);
              setUserData(adminUser);
              saveAuthToStorage(adminUser);
              navigateBasedOnRole(roleToUse, adminUser);
              setLoading(false);
              return;
            }
            
            // Check if user has been approved by admin (from Firestore)
            try {
              const approvedUsers = await firestoreService.getApprovedUsers();
              const approvedUser = approvedUsers.find(u => u.email === user.email);
              
              if (approvedUser && approvedUser.isApproved) {
                // User was approved by admin - set their approved roles
                const assignedRoles = approvedUser.roles || [approvedUser.primaryRole || approvedUser.role] || ['content_director'];
                const primaryRole = assignedRoles[0] || 'content_director';
                
                // Load saved role from Firestore or use primary role
                let savedRole;
                try {
                  savedRole = await firestoreService.getSystemConfig('currentRole');
                } catch (error) {
                  savedRole = null;
                }
                
                const roleToUse = savedRole && assignedRoles.includes(savedRole) ? savedRole : primaryRole;
                
                // Get user data for the role
                const roleUserData = getUserByRole(roleToUse);
                
                // Merge Firebase user data with role data
                const mergedUser = {
                  uid: user.uid,
                  email: user.email,
                  displayName: approvedUser.displayName || user.displayName || roleUserData.displayName,
                  firstName: approvedUser.firstName || user.displayName?.split(' ')[0] || roleUserData.firstName,
                  lastName: approvedUser.lastName || user.displayName?.split(' ').slice(1).join(' ') || roleUserData.lastName,
                  role: roleToUse,
                  roles: assignedRoles,
                  primaryRole: primaryRole,
                  department: approvedUser.department || roleUserData.department,
                  startDate: approvedUser.startDate || roleUserData.startDate,
                  avatar: approvedUser.avatar || user.photoURL || roleUserData.avatar,
                  bio: approvedUser.bio || roleUserData.bio,
                  skills: approvedUser.skills || roleUserData.skills,
                  stats: approvedUser.stats || roleUserData.stats,
                  customPermissions: approvedUser.customPermissions || [],
                  isApproved: true
                };
                
                setCurrentRole(roleToUse);
                setCurrentUser(mergedUser);
                saveAuthToStorage(mergedUser);
                
                // Load full employee data from Firestore
                try {
                  const employeeData = await firestoreService.getEmployeeByEmail(user.email);
                  if (employeeData) {
                    const fullUser = { ...mergedUser, ...employeeData };
                    setUserData(employeeData);
                    saveAuthToStorage(fullUser);
                    navigateBasedOnRole(roleToUse, fullUser);
                  } else {
                    setUserData(mergedUser);
                    navigateBasedOnRole(roleToUse, mergedUser);
                  }
                } catch (error) {
                  setUserData(mergedUser);
                  navigateBasedOnRole(roleToUse, mergedUser);
                }
                setLoading(false);
              } else {
                // New user - no approval yet, they need admin approval
                const newUser = {
                  uid: user.uid,
                  email: user.email,
                  displayName: user.displayName || 'New User',
                  firstName: user.displayName?.split(' ')[0] || 'New',
                  lastName: user.displayName?.split(' ').slice(1).join(' ') || 'User',
                  role: 'pending',
                  department: 'Pending Approval',
                  startDate: new Date().toISOString().split('T')[0],
                  avatar: user.photoURL,
                  bio: 'Account pending administrator approval',
                  skills: [],
                  stats: {},
                  isApproved: false,
                  createdAt: new Date().toISOString()
                };
                
                setCurrentUser(newUser);
                setUserData(newUser);
                setCurrentRole('pending');
                
                // Add this user to the pending users system
                const pendingUserData = {
                  id: `pending-${Date.now()}`,
                  email: user.email,
                  displayName: user.displayName || 'New User',
                  firstName: user.displayName?.split(' ')[0] || 'New',
                  lastName: user.displayName?.split(' ').slice(1).join(' ') || 'User',
                  role: 'pending',
                  department: 'Pending Approval',
                  startDate: new Date().toISOString().split('T')[0],
                  avatar: user.photoURL,
                  bio: 'Account pending administrator approval',
                  skills: [],
                  stats: {},
                  isApproved: false,
                  createdAt: new Date().toISOString()
                };
                
                // Add to pending users in Firestore
                try {
                  const existingPending = await firestoreService.getPendingUsers();
                  const alreadyPending = existingPending.some(u => u.email === user.email);
                  
                  if (!alreadyPending) {
                    await firestoreService.addPendingUser(pendingUserData);
                  }
                } catch (error) {
                  console.warn('⚠️ Could not add user to pending users:', error);
                }
                
                navigateBasedOnRole('pending', newUser);
                setLoading(false);
              }
            } catch (error) {
              console.error('❌ Error checking user approval status:', error);
              setCurrentRole('pending');
              setCurrentUser({
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || 'New User',
                role: 'pending',
                isApproved: false
              });
              setLoading(false);
            }
          } else {
            // Clear localStorage on sign out
            saveAuthToStorage(null);
            setCurrentUser(null);
            setUserData(null);
            setCurrentRole(USER_ROLES.CONTENT_DIRECTOR);
            setLoading(false);
          }
        } catch (error) {
          console.error('❌ Error in auth state change handler:', error);
          setCurrentUser(null);
          setCurrentRole(USER_ROLES.CONTENT_DIRECTOR);
          setLoading(false);
        }
      });

      return () => {
        unsubscribe();
        setAuthListenerSetup(false);
      };
    }
  }, [isInitialized, authListenerSetup]);

  // Safety timeout: if loading takes too long, show app anyway
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('⚠️ Auth loading timeout - showing app anyway');
        setLoading(false);
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeout);
  }, [loading]);

  const handleApproveUser = async (pendingUser) => {
    try {
      console.log('✅ Approving user:', pendingUser);
      
      // Create approved user data with support for multiple roles
      const approvedUserData = {
        email: pendingUser.email,
        firstName: pendingUser.firstName || 'User',
        lastName: pendingUser.lastName || 'Name',
        role: pendingUser.requestedRole || 'content_director', // Keep for backward compatibility
        primaryRole: pendingUser.requestedRole || 'content_director', // Primary role
        roles: [pendingUser.requestedRole || 'content_director'], // Array of all roles
        bio: pendingUser.bio || '',
        skills: pendingUser.skills || [],
        isApproved: true,
        approvedAt: new Date().toISOString(),
        approvedBy: currentUser.email,
        uid: pendingUser.uid || `user-${Date.now()}`, // Generate uid if not present
        displayName: pendingUser.displayName || `${pendingUser.firstName || 'User'} ${pendingUser.lastName || 'Name'}`,
        department: getDepartmentForRole(pendingUser.requestedRole || 'content_director'),
        startDate: new Date().toISOString().split('T')[0],
        phone: pendingUser.phone || '',
        location: pendingUser.location || 'Remote',
        avatar: pendingUser.avatar || ''
      };

      // Remove any undefined values to prevent Firestore errors
      Object.keys(approvedUserData).forEach(key => {
        if (approvedUserData[key] === undefined) {
          delete approvedUserData[key];
        }
      });

      // Approve the user (this will move them from pending to approved)
      await firestoreService.approveUser(pendingUser.id, approvedUserData);
      
      console.log('✅ User approved successfully');
    } catch (error) {
      console.error('❌ Error approving user:', error);
      alert('Failed to approve user. Please try again.');
    }
  };

  // Function to refresh current user data from Firestore
  const refreshCurrentUser = async () => {
    if (GOOGLE_AUTH_DISABLED || !auth.currentUser) {
      return;
    }

    const user = auth.currentUser;
    try {
      // Special handling for admin user
      if (user.email === 'jrsschroeder@gmail.com') {
        const savedRole = await firestoreService.getSystemConfig('currentRole');
        const roleToUse = savedRole && Object.values(USER_ROLES).includes(savedRole) ? savedRole : USER_ROLES.ADMIN;
        setCurrentRole(roleToUse);
        
        // Try to get admin user data from Firestore
        let approvedUser = null;
        try {
          const approvedUsers = await firestoreService.getApprovedUsers();
          approvedUser = approvedUsers.find(u => u.email === user.email);
        } catch (error) {
          console.warn('⚠️ Could not fetch approved users for admin:', error);
        }
        
        const userData = getUserByRole(roleToUse);
        const adminUser = {
          uid: user.uid,
          email: user.email,
          displayName: approvedUser?.displayName || user.displayName || userData.displayName,
          firstName: approvedUser?.firstName || user.displayName?.split(' ')[0] || userData.firstName,
          lastName: approvedUser?.lastName || user.displayName?.split(' ').slice(1).join(' ') || userData.lastName,
          role: roleToUse,
          roles: Object.values(USER_ROLES),
          primaryRole: USER_ROLES.ADMIN,
          department: approvedUser?.department || userData.department,
          startDate: approvedUser?.startDate || userData.startDate,
          avatar: approvedUser?.avatar || user.photoURL || userData.avatar,
          bio: approvedUser?.bio || userData.bio,
          skills: approvedUser?.skills || userData.skills,
          stats: approvedUser?.stats || userData.stats,
          isApproved: true
        };
        setCurrentUser(adminUser);
        setUserData(adminUser);
        return;
      }

      // For regular users, fetch from approved users
      const approvedUsers = await firestoreService.getApprovedUsers();
      const approvedUser = approvedUsers.find(u => u.email === user.email);
      
      if (approvedUser && approvedUser.isApproved) {
        const assignedRoles = approvedUser.roles || [approvedUser.primaryRole || approvedUser.role] || ['content_director'];
        const primaryRole = assignedRoles[0] || 'content_director';
        
        const savedRole = await firestoreService.getSystemConfig('currentRole');
        const roleToUse = savedRole && assignedRoles.includes(savedRole) ? savedRole : primaryRole;
        setCurrentRole(roleToUse);
        
        const userData = getUserByRole(roleToUse);
        const mergedUser = {
          uid: user.uid,
          email: user.email,
          displayName: approvedUser.displayName || user.displayName || userData.displayName,
          firstName: approvedUser.firstName || user.displayName?.split(' ')[0] || userData.firstName,
          lastName: approvedUser.lastName || user.displayName?.split(' ').slice(1).join(' ') || userData.lastName,
          role: roleToUse,
          roles: assignedRoles,
          primaryRole: primaryRole,
          department: approvedUser.department || userData.department,
          startDate: approvedUser.startDate || userData.startDate,
          avatar: approvedUser.avatar || user.photoURL || userData.avatar,
          bio: approvedUser.bio || userData.bio,
          skills: approvedUser.skills || userData.skills,
          stats: approvedUser.stats || userData.stats,
          customPermissions: approvedUser.customPermissions || [],
          isApproved: true
        };
        
        setCurrentUser(mergedUser);
        
        try {
          const employeeData = await firestoreService.getEmployeeByEmail(user.email);
          if (employeeData) {
            setUserData(employeeData);
          } else {
            setUserData(mergedUser);
          }
        } catch (error) {
          console.warn('⚠️ Could not load employee data:', error);
          setUserData(mergedUser);
        }
      }
    } catch (error) {
      console.error('❌ Error refreshing current user:', error);
    }
  };

  const value = {
    currentUser,
    userData,
    currentRole,
    switchRole,
    getCurrentRolePermissions,
    hasPermission,
    signInWithGoogle,
    logout,
    isGoogleAuthDisabled: GOOGLE_AUTH_DISABLED,
    chatbotResetTrigger,
    refreshCurrentUser
  };

  // Check if we're on a light-themed page (login pages are always light)
  const isLightThemedPage = () => {
    const lightPages = ['/login', '/client-login', '/client-password-reset', '/waiting-for-approval', '/client-waiting-for-approval'];
    return lightPages.some(path => window.location.pathname.startsWith(path));
  };

  // Check if it's after 5 PM Vancouver time for dark mode
  const isAfter5PMVancouver = () => {
    const vancouverTime = new Date().toLocaleString('en-US', { timeZone: 'America/Vancouver' });
    const hour = new Date(vancouverTime).getHours();
    return hour >= 17 || hour < 6;
  };

  const [showLoader, setShowLoader] = useState(loading);
  const [fadeOut, setFadeOut] = useState(false);
  
  // Use light mode for login pages, otherwise use time-based dark mode
  const isDarkMode = isLightThemedPage() ? false : isAfter5PMVancouver();

  // Handle fade transition when loading completes
  useEffect(() => {
    if (!loading && showLoader) {
      // Start fade out
      setFadeOut(true);
    } else if (loading) {
      setShowLoader(true);
      setFadeOut(false);
    }
  }, [loading, showLoader]);

  const handleFadeComplete = () => {
    setShowLoader(false);
    setFadeOut(false);
  };

  // Check if on login page for special loader colors
  const isOnLoginPage = isLightThemedPage();

  return (
    <AuthContext.Provider value={value}>
      {showLoader && (
        <Loader 
          isDark={isDarkMode} 
          fadeOut={fadeOut} 
          onFadeComplete={handleFadeComplete}
          useLoginColors={isOnLoginPage}
        />
      )}
      {children}
    </AuthContext.Provider>
  );
}

