/**
 * AuthContext.supabase.js
 *
 * Drop-in replacement for AuthContext.js — identical useAuth() shape,
 * backed by Supabase Auth instead of Firebase Auth.
 *
 * Usage: swap the import in V3SupabaseApp.jsx:
 *   import { AuthProvider, useAuth } from './contexts/AuthContext.supabase';
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { USER_ROLES, getUserByRole, getRolePermissions } from '../entities/UserRoles';
import { firestoreService } from '../services/supabaseFirestoreService';
import { appNavigate } from '../utils/navigation';
import { useViewAs } from './ViewAsContext';
import { resolvePermission } from '../utils/permissionResolver';

// Define the context here so it can be exported and re-exported by AuthContext.js
// after cutover without creating a circular dependency.
export const AuthContext = createContext();

// ============================================================================
// SYSTEM ADMINS (Supabase-backed, mirrors systemAdmins.js without Firebase)
// ============================================================================
const BOOTSTRAP_ADMIN = 'jrsschroeder@gmail.com';
const DEMO_VIEW_ONLY_EMAILS = ['demo@luxurylistings.app'];

let _adminEmails = [BOOTSTRAP_ADMIN];
let _adminListeners = [];

function _notifyAdminListeners() {
  _adminListeners.forEach((cb) => cb(_adminEmails));
}

async function loadSystemAdmins() {
  try {
    const data = await firestoreService.getSystemConfig('admins');
    if (data && Array.isArray(data.emails)) {
      _adminEmails = [...new Set([BOOTSTRAP_ADMIN, ...data.emails.map((e) => e.toLowerCase())])];
    }
  } catch (e) {
    console.warn('Could not load system admins, using bootstrap admin:', e.message);
  }
  _notifyAdminListeners();
}

function startAdminListener() {
  // Poll every 60s as a lightweight fallback; real-time handled by postgres_changes
  const interval = setInterval(async () => {
    try {
      const data = await firestoreService.getSystemConfig('admins');
      if (data && Array.isArray(data.emails)) {
        const updated = [...new Set([BOOTSTRAP_ADMIN, ...data.emails.map((e) => e.toLowerCase())])];
        if (JSON.stringify(updated) !== JSON.stringify(_adminEmails)) {
          _adminEmails = updated;
          _notifyAdminListeners();
        }
      }
    } catch (_) {}
  }, 60000);

  // Also subscribe via Supabase Realtime on system_config
  const channel = supabase
    .channel('admin-config-watcher')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'system_config' }, async (payload) => {
      if (payload?.new?.key === 'admins') {
        const emails = payload?.new?.value?.emails || [];
        _adminEmails = [...new Set([BOOTSTRAP_ADMIN, ...emails.map((e) => e.toLowerCase())])];
        _notifyAdminListeners();
      }
    })
    .subscribe();

  return () => {
    clearInterval(interval);
    supabase.removeChannel(channel);
  };
}

function isSystemAdmin(email) {
  if (!email) return false;
  return _adminEmails.includes(email.toLowerCase());
}

function isDemoViewOnly(email) {
  if (!email) return false;
  return DEMO_VIEW_ONLY_EMAILS.includes(email.toLowerCase());
}

// ============================================================================
// LOCAL STORAGE — persist auth for instant restore on refresh
// ============================================================================
const AUTH_STORAGE_KEY = 'luxury_listings_auth_sb';

const saveAuthToStorage = (user) => {
  try {
    if (user) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch (_) {}
};

const loadAuthFromStorage = () => {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (_) {
    return null;
  }
};

// ============================================================================
// AUTH CONTEXT
// ============================================================================
// AuthContext is defined and exported here (post-cutover AuthContext.js re-exports it).
// All V3 components using useAuth() transparently use Supabase state.

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const storedAuth = loadAuthFromStorage();

  const [currentUser, setCurrentUser] = useState(storedAuth);
  const [userData, setUserData] = useState(storedAuth);
  const [currentRole, setCurrentRole] = useState(storedAuth?.role || USER_ROLES.CONTENT_DIRECTOR);
  const [loading, setLoading] = useState(!storedAuth);
  const [chatbotResetTrigger, setChatbotResetTrigger] = useState(0);

  // Boot system-admin list + live listener
  useEffect(() => {
    loadSystemAdmins();
    const unsubscribeAdmins = startAdminListener();
    return () => unsubscribeAdmins();
  }, []);

  // ============================================================================
  // AUTH METHODS
  // ============================================================================

  async function signInWithGoogle() {
    try {
      // Supabase OAuth uses a redirect flow. We open the OAuth URL in a popup
      // manually to match the original UX as closely as possible.
      const redirectTo = `${window.location.origin}/v4/auth/callback`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  }

  async function signInWithEmail(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        // Map Supabase error messages to user-friendly equivalents
        const msg = error.message?.toLowerCase() || '';
        if (msg.includes('invalid login credentials') || msg.includes('invalid email or password')) {
          throw new Error('Invalid email or password. Please check your credentials.');
        }
        if (msg.includes('email not confirmed')) {
          throw new Error('Please confirm your email address before signing in.');
        }
        if (msg.includes('too many requests')) {
          throw new Error('Too many failed attempts. Please try again later.');
        }
        throw new Error(error.message);
      }
      console.log('✅ Email sign-in successful for:', email);
      return data;
    } catch (error) {
      console.error('Email sign-in error:', error);
      throw error;
    }
  }

  async function logout() {
    saveAuthToStorage(null);
    setCurrentUser(null);
    setUserData(null);
    setCurrentRole(USER_ROLES.CONTENT_DIRECTOR);
    await supabase.auth.signOut();
  }

  async function switchRole(newRole) {
    if (!currentUser?.email) return;

    if (currentUser?.isDemoViewOnly) {
      toast.error('Demo account cannot change roles.');
      return;
    }

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

    try {
      await firestoreService.saveSystemConfig('currentRole', newRole);
    } catch (_) {}

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
      customPermissions: currentUser.customPermissions || [],
    };

    setCurrentUser(updatedUser);
    setChatbotResetTrigger((prev) => prev + 1);
  }

  function hasPermission(permission) {
    return resolvePermission({
      permission,
      customPermissions: currentUser?.customPermissions || userData?.customPermissions || [],
      pagePermissions: currentUser?.pagePermissions || [],
      featurePermissions: currentUser?.featurePermissions || [],
      isAdmin: isSystemAdmin(currentUser?.email),
    });
  }

  // ============================================================================
  // SUPABASE AUTH LISTENER
  // ============================================================================

  useEffect(() => {
    // onAuthStateChange fires with the current session on mount, then on every change
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (session?.user) {
          await handleUserSignIn(session.user);
        } else {
          saveAuthToStorage(null);
          setCurrentUser(null);
          setUserData(null);
          setCurrentRole(USER_ROLES.CONTENT_DIRECTOR);
        }
      } catch (error) {
        console.error('Auth state error:', error);
        setCurrentUser(null);
        setCurrentRole(USER_ROLES.CONTENT_DIRECTOR);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle user sign-in logic (mirrors original handleUserSignIn)
  async function handleUserSignIn(supabaseUser) {
    const { id: uid, email, user_metadata } = supabaseUser;
    const displayName = user_metadata?.full_name || user_metadata?.name || email;
    const photoURL = user_metadata?.avatar_url || user_metadata?.picture || null;

    // Demo view-only
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
        isDemoViewOnly: true,
      };
      setCurrentRole(USER_ROLES.CONTENT_DIRECTOR);
      setCurrentUser(demoUser);
      setUserData(demoUser);
      saveAuthToStorage(demoUser);
      const currentPath = window.location.pathname;
      if (currentPath === '/v4/login' || currentPath === '/v4' || currentPath === '/v4/') {
        appNavigate('/v4/dashboard', { replace: true });
      }
      return;
    }

    // System admin
    if (isSystemAdmin(email)) {
      firestoreService.bootstrapSystemAdmins(email).catch(() => {});

      let savedRole = null;
      try {
        savedRole = await firestoreService.getSystemConfig('currentRole');
      } catch (_) {}

      const roleToUse =
        savedRole && Object.values(USER_ROLES).includes(savedRole) ? savedRole : USER_ROLES.ADMIN;
      const roleUserData = getUserByRole(roleToUse);

      const adminUser = {
        uid,
        email,
        displayName: displayName || roleUserData.displayName,
        firstName: displayName?.split(' ')[0] || roleUserData.firstName,
        lastName: displayName?.split(' ').slice(1).join(' ') || roleUserData.lastName,
        position: roleUserData.position,
        role: roleToUse,
        roles: Object.values(USER_ROLES),
        primaryRole: USER_ROLES.ADMIN,
        department: roleUserData.department,
        startDate: roleUserData.startDate,
        avatar: photoURL || roleUserData.avatar,
        bio: roleUserData.bio,
        skills: roleUserData.skills,
        stats: roleUserData.stats,
        isApproved: true,
        onboardingCompleted: true,
      };

      // Sync profile from approved_users / profiles
      try {
        const approved = await firestoreService.getApprovedUserByEmail(email);
        if (approved) {
          if (approved.displayName) adminUser.displayName = approved.displayName;
          if (approved.firstName != null) adminUser.firstName = approved.firstName;
          if (approved.lastName != null) adminUser.lastName = approved.lastName;
          if (approved.position != null) adminUser.position = approved.position;
          if (approved.department) adminUser.department = approved.department;
          if (approved.avatar) adminUser.avatar = approved.avatar;
        }
      } catch (_) {}

      setCurrentRole(roleToUse);
      setCurrentUser(adminUser);
      setUserData(adminUser);
      saveAuthToStorage(adminUser);
      return;
    }

    // Regular user: look up in profiles (approved_users)
    const emailNormalized = (email || '').trim().toLowerCase();
    try {
      const approvedUser = await firestoreService.getApprovedUserByEmail(emailNormalized);
      if (approvedUser) {
        const assignedRoles =
          approvedUser.roles || [approvedUser.primaryRole || approvedUser.role] || ['content_director'];
        const primaryRole = assignedRoles[0] || 'content_director';

        let savedRole = null;
        try {
          savedRole = await firestoreService.getSystemConfig('currentRole');
        } catch (_) {}

        const roleToUse =
          savedRole && assignedRoles.includes(savedRole) ? savedRole : primaryRole;
        const roleUserData = getUserByRole(roleToUse);

        const mergedUser = {
          uid,
          email,
          displayName: approvedUser.displayName || displayName || roleUserData.displayName,
          firstName: approvedUser.firstName || displayName?.split(' ')[0] || roleUserData.firstName,
          lastName:
            approvedUser.lastName ||
            displayName?.split(' ').slice(1).join(' ') ||
            roleUserData.lastName,
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
          pagePermissions: approvedUser.pagePermissions || [],
          featurePermissions: approvedUser.featurePermissions || [],
          isApproved: true,
          onboardingCompleted: approvedUser.onboardingCompleted,
        };

        setCurrentRole(roleToUse);
        setCurrentUser(mergedUser);
        setUserData(mergedUser);
        saveAuthToStorage(mergedUser);

        // Sync avatar + uid back to profiles
        if (photoURL) {
          firestoreService.updateApprovedUser(approvedUser.id || email, { avatar: photoURL }).catch(() => {});
        }
        firestoreService.updateApprovedUser(approvedUser.id || email, { uid }).catch(() => {});

        // Navigate
        const currentPath = window.location.pathname;
        if (currentPath.startsWith('/report/')) return;

        const onLoginOrHome =
          currentPath === '/v4/login' ||
          currentPath === '/v4' ||
          currentPath === '/v4/' ||
          currentPath === '/login' ||
          currentPath === '/';

        if (onLoginOrHome) {
          if (mergedUser.onboardingCompleted) {
            appNavigate('/v4/dashboard', { replace: true });
          } else {
            appNavigate('/v4/onboarding', { replace: true });
          }
        } else if (!mergedUser.onboardingCompleted && !currentPath.includes('/onboarding')) {
          appNavigate('/v4/onboarding', { replace: true });
        }
      } else {
        // Not approved — sign out
        await logout();
        if (!window.location.pathname.includes('/login')) {
          appNavigate('/v4/login?error=access_required', { replace: true });
        }
      }
    } catch (error) {
      console.error('Error checking user approval:', error);
      await logout();
      if (!window.location.pathname.includes('/login')) {
        appNavigate('/v4/login?error=access_required', { replace: true });
      }
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
      } catch (_) {}
    };
    loadCurrentRole();
  }, [currentUser?.email]); // eslint-disable-line react-hooks/exhaustive-deps

  // Presence ping
  useEffect(() => {
    if (!currentUser?.email || currentUser?.isDemoViewOnly || !currentUser?.isApproved) return;
    firestoreService.updateLastSeen(currentUser.email).catch(() => {});
    const interval = setInterval(() => {
      firestoreService.updateLastSeen(currentUser.email).catch(() => {});
    }, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [currentUser?.email, currentUser?.isDemoViewOnly, currentUser?.isApproved]);

  // Listen for profile changes in real time
  useEffect(() => {
    if (!currentUser?.email) return;

    const unsubscribe = firestoreService.onApprovedUserChange(currentUser.email, (approvedUser) => {
      if (!approvedUser) return;
      setCurrentUser((prev) => {
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
          pagePermissions: approvedUser.pagePermissions ?? prev.pagePermissions ?? [],
          featurePermissions: approvedUser.featurePermissions ?? prev.featurePermissions ?? [],
          adminPermissions: false,
          onboardingCompleted:
            approvedUser.onboardingCompleted !== undefined
              ? approvedUser.onboardingCompleted
              : prev.onboardingCompleted,
          onboardingCompletedDate:
            approvedUser.onboardingCompletedDate ?? prev.onboardingCompletedDate,
        };
        saveAuthToStorage(updated);
        return updated;
      });
      setUserData((prev) => (prev ? { ...prev, ...approvedUser } : approvedUser));
    });

    return () => unsubscribe();
  }, [currentUser?.email]); // eslint-disable-line react-hooks/exhaustive-deps

  // Safety timeout
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('Auth timeout — showing app');
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

  const value = {
    currentUser: effectiveUser,
    userData: effectiveUser ?? userData,
    currentRole: effectiveRole,
    loading,
    switchRole,
    getCurrentRolePermissions: () => getRolePermissions(effectiveRole),
    hasPermission: (permission) => {
      if (isViewingAs && viewAs?.viewingAsUser) {
        return resolvePermission({
          permission,
          customPermissions: effectiveUser?.customPermissions || [],
          pagePermissions: viewAs.viewAsPermissions || [],
          featurePermissions: viewAs.viewAsFeaturePermissions || [],
          isAdmin: false,
        });
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useEffectiveAuth — identical to the original, respects View As mode.
 */
export function useEffectiveAuth() {
  const authCtx = useAuth();
  const viewAs = useViewAs();

  if (viewAs?.isViewingAs && viewAs?.viewingAsUser) {
    const viewingAsUser = viewAs.viewingAsUser;
    return {
      ...authCtx,
      currentUser: {
        ...viewingAsUser,
        _realUser: authCtx.realUser,
        _isViewingAs: true,
      },
      currentRole: viewAs.viewAsRole || authCtx.currentRole,
      hasPermission: (permission) =>
        resolvePermission({
          permission,
          customPermissions: viewingAsUser?.customPermissions || [],
          pagePermissions: viewAs.viewAsPermissions || [],
          featurePermissions: viewAs.viewAsFeaturePermissions || [],
          isAdmin: false,
        }),
      isViewingAs: true,
      realUser: authCtx.currentUser,
      viewingAsUser: viewAs.viewingAsUser,
    };
  }

  return {
    ...authCtx,
    isViewingAs: false,
    realUser: authCtx.currentUser,
    viewingAsUser: null,
  };
}
