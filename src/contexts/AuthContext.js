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

// Import the pending users context
import { usePendingUsers } from './PendingUsersContext';

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

// Helper function to navigate based on user role (only from login page)
const navigateBasedOnRole = (role, userData) => {
  // Only navigate if user is on login or waiting page, not on page reloads
  const currentPath = window.location.pathname;
  
  // Only redirect from login page or waiting page
  const shouldRedirect = currentPath === '/login' || currentPath === '/waiting-for-approval' || currentPath === '/';
  
  if (!shouldRedirect) {
    console.log('🔍 Skipping redirect - user is already on a page:', currentPath);
    return;
  }
  
  if (role === 'pending' && currentPath !== '/waiting-for-approval') {
    console.log('🔄 Navigating pending user to approval page...');
    window.location.href = '/waiting-for-approval';
  } else if (role && role !== 'pending') {
    // Check if user needs onboarding
    if (!userData?.onboardingCompleted && currentPath !== '/onboarding') {
      console.log('🎓 New user detected - navigating to onboarding...');
      window.location.href = '/onboarding';
    } else if (currentPath !== '/dashboard' && currentPath !== '/onboarding') {
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

// Log dev mode status for debugging
console.log('🔍 Dev Mode Check:', {
  NODE_ENV: process.env.NODE_ENV,
  VERCEL_ENV: process.env.VERCEL_ENV,
  VERCEL: process.env.VERCEL,
  hostname: window.location.hostname,
  isVercelPreview,
  DEV_MODE_AUTO_LOGIN
});

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentRole, setCurrentRole] = useState(USER_ROLES.CONTENT_DIRECTOR);
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null); // Full employee data from Firestore
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [chatbotResetTrigger, setChatbotResetTrigger] = useState(0);
  
  // Get pending users functions
  const { addPendingUser } = usePendingUsers();

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

  async function switchRole(newRole) {
    console.log('🔍 switchRole called with:', newRole);
    console.log('🔍 Current user:', currentUser);
    console.log('🔍 Current role before switch:', currentRole);
    console.log('🔍 Available roles:', Object.values(USER_ROLES));
    
    if (!currentUser || !currentUser.email) {
      console.error('❌ No user logged in');
      return;
    }
    
    // Admin users (jrsschroeder@gmail.com) can always switch to any role
    if (currentUser.email === 'jrsschroeder@gmail.com') {
      console.log('✅ Admin user - allowing role switch to:', newRole);
    } else {
      // Check if user has this role in their assigned roles from Firestore
      const assignedRoles = currentUser.roles || [currentUser.primaryRole || currentUser.role] || ['content_director'];
      if (!assignedRoles.includes(newRole)) {
        console.error('❌ User not authorized to switch to role:', newRole);
        console.error('❌ User assigned roles:', assignedRoles);
        alert('You are not authorized to switch to this role. Please contact your administrator.');
        return;
      }
    }
    
    const validRoles = Object.values(USER_ROLES);
    
    if (validRoles.includes(newRole)) {
      console.log('✅ Role is valid, switching to:', newRole);
      
      // Update the current role first
      setCurrentRole(newRole);
      console.log('✅ Current role updated to:', newRole);
      
      // Save role to Firestore for persistence
      try {
        await firestoreService.saveSystemConfig('currentRole', newRole);
        console.log('✅ Role saved to Firestore:', newRole);
      } catch (error) {
        console.error('❌ Error saving role to Firestore:', error);
      }
      
      // Update current user with new role data
      const userData = getUserByRole(newRole);
      console.log('🔍 User data for role:', userData);
      
      const updatedUser = {
        ...currentUser, // Preserve all existing user data
        ...userData, // Override with role-specific data
        role: newRole, // Keep for backward compatibility
        primaryRole: newRole, // Update primary role
        // Preserve the original email and user-specific data - this is crucial for admin access
        email: currentUser.email,
        firstName: currentUser.firstName, // Keep actual user's first name
        lastName: currentUser.lastName, // Keep actual user's last name
        displayName: currentUser.displayName, // Keep actual user's display name
        avatar: currentUser.avatar, // Keep actual user's avatar
        uid: currentUser.uid, // Keep actual user's UID
        customPermissions: currentUser.customPermissions || [] // Keep custom permissions across role switches
      };
      
      setCurrentUser(updatedUser);
      console.log('✅ Current user updated with new role data');
      
      // Trigger chatbot reset
      setChatbotResetTrigger(prev => prev + 1);
      
      // Don't navigate - keep user on current page when switching roles
      console.log(`✅ Successfully switched to role: ${newRole} - staying on current page`);
    } else {
      console.error('❌ Invalid role:', newRole);
      console.error('❌ Valid roles are:', validRoles);
      alert(`Invalid role: ${newRole}. Please try again.`);
    }
  }

  function getCurrentRolePermissions() {
    console.log('🔍 getCurrentRolePermissions called with currentRole:', currentRole);
    const permissions = getRolePermissions(currentRole);
    console.log('🔍 Retrieved permissions:', permissions);
    return permissions;
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

  // Load current role from Firestore on mount
  useEffect(() => {
    const loadCurrentRole = async () => {
      try {
        const savedRole = await firestoreService.getSystemConfig('currentRole');
        console.log('🔍 Loaded role from Firestore:', savedRole);
        
        if (savedRole && Object.values(USER_ROLES).includes(savedRole)) {
          console.log('✅ Using saved role from Firestore:', savedRole);
          setCurrentRole(savedRole);
        } else {
          console.log('ℹ️ No valid saved role found, using default:', USER_ROLES.CONTENT_DIRECTOR);
          setCurrentRole(USER_ROLES.CONTENT_DIRECTOR);
        }
      } catch (error) {
        console.error('❌ Error loading role from Firestore:', error);
        console.log('ℹ️ Using default role due to error:', USER_ROLES.CONTENT_DIRECTOR);
        setCurrentRole(USER_ROLES.CONTENT_DIRECTOR);
      }
    };

    loadCurrentRole();
  }, []);

  useEffect(() => {
    console.log('🔍 AuthContext useEffect running - DEV_MODE_AUTO_LOGIN:', DEV_MODE_AUTO_LOGIN, 'isInitialized:', isInitialized, 'currentUser:', currentUser);
    
    // Dev mode: Auto-login as jrsschroeder@gmail.com
    if (DEV_MODE_AUTO_LOGIN && !isInitialized && !currentUser) {
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
        
        console.log('✅ DEV MODE: Setting user and loading state');
        setCurrentUser(devUser);
        setUserData(devUser);
        setCurrentRole(USER_ROLES.ADMIN);
        setLoading(false);
        console.log('✅ DEV MODE: Loading set to false');
        
        // Navigate to dashboard if on login page
        const currentPath = window.location.pathname;
        if (currentPath === '/login' || currentPath === '/') {
          console.log('🔄 DEV MODE: Navigating to dashboard...');
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

    // Skip Firebase auth if dev mode is enabled
    if (DEV_MODE_AUTO_LOGIN) {
      console.log('🔧 DEV MODE: Skipping Firebase auth listener');
      // Ensure loading is false if dev mode already handled it
      if (loading) {
        console.log('⚠️ DEV MODE: Loading still true, forcing false');
        setLoading(false);
      }
      return;
    }

    if (!GOOGLE_AUTH_DISABLED) {
      console.log('🔐 Setting up Firebase auth listener...');
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        console.log('🔐 Auth state changed - User:', user);
        try {
          if (user) {
            console.log('✅ User signed in:', user.email);
            
            // Special handling for admin user
            if (user.email === 'jrsschroeder@gmail.com') {
              console.log('✅ Admin user detected - setting up admin access');
              
              // Load saved role from Firestore or use admin as default
              let savedRole;
              try {
                savedRole = await firestoreService.getSystemConfig('currentRole');
              } catch (error) {
                console.warn('⚠️ Could not load saved role from Firestore:', error);
                savedRole = null;
              }
              
              // Use saved role if valid, otherwise use admin
              const roleToUse = savedRole && Object.values(USER_ROLES).includes(savedRole) ? savedRole : USER_ROLES.ADMIN;
              setCurrentRole(roleToUse);
              
              // Save role to Firestore for persistence (with error handling)
              try {
                await firestoreService.saveSystemConfig('currentRole', roleToUse);
              } catch (error) {
                console.warn('⚠️ Could not save role to Firestore:', error);
              }
              
              // Get user data for the role
              const userData = getUserByRole(roleToUse);
              
              // Create admin user object
              const adminUser = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || userData.displayName,
                firstName: user.displayName?.split(' ')[0] || userData.firstName,
                lastName: user.displayName?.split(' ').slice(1).join(' ') || userData.lastName,
                role: roleToUse,
                roles: Object.values(USER_ROLES), // Admin can access all roles
                primaryRole: USER_ROLES.ADMIN, // Keep admin as primary
                department: userData.department,
                startDate: userData.startDate,
                avatar: user.photoURL || userData.avatar,
                bio: userData.bio,
                skills: userData.skills,
                stats: userData.stats,
                isApproved: true
              };
              
              setCurrentUser(adminUser);
              setUserData(adminUser); // Admin doesn't need onboarding
              console.log('🔄 Navigating admin user to dashboard...');
              navigateBasedOnRole(roleToUse, adminUser);
              setLoading(false);
              return;
            }
            
            // Check if user has been approved by admin (from Firestore)
            try {
              const approvedUsers = await firestoreService.getApprovedUsers();
              const approvedUser = approvedUsers.find(u => u.email === user.email);
              
              if (approvedUser && approvedUser.isApproved) {
                console.log('✅ User approved by admin:', approvedUser);
                // User was approved by admin - set their approved roles
                const assignedRoles = approvedUser.roles || [approvedUser.primaryRole || approvedUser.role] || ['content_director'];
                const primaryRole = assignedRoles[0] || 'content_director';
                
                // Load saved role from Firestore or use primary role
                let savedRole;
                try {
                  savedRole = await firestoreService.getSystemConfig('currentRole');
                } catch (error) {
                  console.warn('⚠️ Could not load saved role from Firestore:', error);
                  savedRole = null;
                }
                
                const roleToUse = savedRole && assignedRoles.includes(savedRole) ? savedRole : primaryRole;
                
                setCurrentRole(roleToUse);
                
                // Save role to Firestore for persistence
                try {
                  await firestoreService.saveSystemConfig('currentRole', roleToUse);
                } catch (error) {
                  console.warn('⚠️ Could not save role to Firestore:', error);
                }
                
                // Get user data for the role
                const userData = getUserByRole(roleToUse);
                
                // Merge Firebase user data with role data
                const mergedUser = {
                  uid: user.uid,
                  email: user.email,
                  displayName: approvedUser.displayName || user.displayName || userData.displayName,
                  firstName: approvedUser.firstName || user.displayName?.split(' ')[0] || userData.firstName,
                  lastName: approvedUser.lastName || user.displayName?.split(' ').slice(1).join(' ') || userData.lastName,
                  role: roleToUse, // Keep for backward compatibility
                  roles: assignedRoles, // Store all assigned roles
                  primaryRole: primaryRole, // Store primary role
                  department: approvedUser.department || userData.department,
                  startDate: approvedUser.startDate || userData.startDate,
                  avatar: approvedUser.avatar || user.photoURL || userData.avatar,
                  bio: approvedUser.bio || userData.bio,
                  skills: approvedUser.skills || userData.skills,
                  stats: approvedUser.stats || userData.stats, // Use actual user stats from Firestore
                  customPermissions: approvedUser.customPermissions || [], // Custom permissions granted by admin
                  isApproved: true
                };
                
                setCurrentUser(mergedUser);
                
                // Load full employee data from Firestore (including onboarding status)
                try {
                  const employeeData = await firestoreService.getEmployeeByEmail(user.email);
                  if (employeeData) {
                    setUserData(employeeData);
                    console.log('✅ Loaded employee data from Firestore:', employeeData);
                    
                    // Update navigation with employee data
                    navigateBasedOnRole(roleToUse, { ...mergedUser, ...employeeData });
                  } else {
                    setUserData(mergedUser);
                    navigateBasedOnRole(roleToUse, mergedUser);
                  }
                } catch (error) {
                  console.warn('⚠️ Could not load employee data:', error);
                  setUserData(mergedUser);
                  navigateBasedOnRole(roleToUse, mergedUser);
                }
              } else {
                console.log('🆕 New user - no approval found, setting to pending');
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
                setUserData(newUser); // Pending users don't have onboarding yet
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
                  console.log('🔍 DEBUG: Checking for existing pending user for:', user.email);
                  console.log('🔍 DEBUG: Current stack trace:', new Error().stack);
                  
                  // Prevent duplicates: check if a pending user with this email already exists
                  const existingPending = await firestoreService.getPendingUsers();
                  console.log('🔍 DEBUG: Found existing pending users:', existingPending.length);
                  console.log('🔍 DEBUG: Existing pending emails:', existingPending.map(u => u.email));
                  
                  const alreadyPending = existingPending.some(u => u.email === user.email);
                  console.log('🔍 DEBUG: User already pending?', alreadyPending);
                  
                  if (alreadyPending) {
                    console.log('ℹ️ Pending user already exists for', user.email, '- skipping add');
                    console.log('🔍 DEBUG: Skipping duplicate pending user creation');
                  } else {
                    console.log('🔍 DEBUG: No existing pending user found, adding new one');
                    console.log('🔍 DEBUG: Pending user data to add:', pendingUserData);
                    await firestoreService.addPendingUser(pendingUserData);
                    console.log('✅ Added user to pending users:', user.email);
                  }
                } catch (error) {
                  console.error('❌ ERROR adding pending user:', error);
                  console.error('❌ ERROR stack:', error.stack);
                  console.warn('⚠️ Could not add user to pending users:', error);
                }
                
                console.log('🔄 Navigating pending user to approval page...');
                navigateBasedOnRole('pending', newUser);
              }
            } catch (error) {
              console.error('❌ Error checking user approval status:', error);
              // Fallback to pending status
              setCurrentRole('pending');
              setCurrentUser({
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || 'New User',
                role: 'pending',
                isApproved: false
              });
            }
          } else {
            console.log('❌ User signed out');
            
            // Dev mode: Auto-login again if signed out
            if (DEV_MODE_AUTO_LOGIN) {
              console.log('🔧 DEV MODE: User signed out, auto-logging back in...');
              // Trigger auto-login by resetting initialization
              setIsInitialized(false);
              return;
            }
            
            setCurrentUser(null);
            setCurrentRole(USER_ROLES.CONTENT_DIRECTOR);
          }
        } catch (error) {
          console.error('❌ Error in auth state change handler:', error);
          // Fallback to prevent blank page
          setCurrentUser(null);
          setCurrentRole(USER_ROLES.CONTENT_DIRECTOR);
        }
        setLoading(false);
      });

      return unsubscribe;
    }
  }, [isInitialized, currentUser]);

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

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '100vh',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f4f6',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p style={{ color: '#6b7280' }}>Loading...</p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

