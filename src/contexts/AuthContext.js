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

// Import the pending users context
import { usePendingUsers } from './PendingUsersContext';

// Helper function to navigate based on user role
const navigateBasedOnRole = (role) => {
  // Prevent navigation loops by checking current path
  const currentPath = window.location.pathname;
  
  if (role === 'pending' && currentPath !== '/waiting-for-approval') {
    console.log('🔄 Navigating pending user to approval page...');
    window.location.href = '/waiting-for-approval';
  } else if (role && role !== 'pending' && currentPath !== '/dashboard') {
    console.log('🔄 Navigating approved user to dashboard...');
    window.location.href = '/dashboard';
  }
};

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

  function switchRole(newRole) {
    console.log('🔍 switchRole called with:', newRole);
    console.log('🔍 Available roles:', Object.values(USER_ROLES));
    
    if (!currentUser || !currentUser.email) {
      console.error('❌ No user logged in');
      return;
    }
    
    // Admin users (jrsschroeder@gmail.com) can always switch to any role
    if (currentUser.email === 'jrsschroeder@gmail.com') {
      console.log('✅ Admin user - allowing role switch to:', newRole);
    } else {
      // Check if user can switch to this role
      if (!canUserSwitchToRole(currentUser.email, newRole)) {
        console.error('❌ User not authorized to switch to role:', newRole);
        alert('You are not authorized to switch to this role. Please contact your administrator.');
        return;
      }
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
        role: newRole,
        // Preserve the original email - this is crucial for admin access
        email: currentUser.email
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
        console.log('🔐 Auth state changed - User:', user);
        if (user) {
          console.log('✅ User signed in:', user.email);
          // User is signed in - get their role mapping
          const roleMapping = getUserRoleMapping(user.email);
          
          if (roleMapping) {
            console.log('✅ User has role mapping:', roleMapping);
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
              stats: userData.stats,
              isApproved: true
            };
            
            setCurrentUser(mergedUser);
            console.log('🔄 Navigating approved user to dashboard...');
            navigateBasedOnRole(assignedRole);
          } else {
            // Check if user has been approved by admin
            const approvedUsers = JSON.parse(localStorage.getItem('luxury-listings-approved-users') || '[]');
            const approvedUser = approvedUsers.find(u => u.email === user.email);
            
            if (approvedUser && approvedUser.isApproved) {
              console.log('✅ User approved by admin:', approvedUser);
              // User was approved by admin - set their approved role
              const assignedRole = approvedUser.role;
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
                stats: userData.stats,
                isApproved: true
              };
              
              setCurrentUser(mergedUser);
              console.log('🔄 Navigating approved user to dashboard...');
              navigateBasedOnRole(assignedRole);
            } else {
              console.log('🆕 New user - no role mapping found, setting to pending');
              // New user - no role assigned yet, they need approval
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
              setCurrentRole('pending');
              localStorage.setItem('luxury-listings-role', 'pending');
              
              // Add this user to the pending users system
              const pendingUserData = {
                id: `pending-${Date.now()}`,
                email: newUser.email,
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                requestedRole: 'content_director', // Default role
                requestedAt: new Date().toISOString().split('T')[0],
                status: 'pending',
                bio: newUser.bio,
                skills: newUser.skills,
                uid: newUser.uid,
                displayName: newUser.displayName
              };
              
              addPendingUser(pendingUserData);
              console.log('✅ Added user to pending users system:', pendingUserData);
              
              console.log('🔄 Navigating pending user to approval page...');
              navigateBasedOnRole('pending');
            }
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
  }, [isInitialized]);

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

