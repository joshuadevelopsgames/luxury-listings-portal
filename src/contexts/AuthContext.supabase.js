/**
 * AuthContext.supabase.js
 *
 * Drop-in replacement for AuthContext.js — identical useAuth() shape,
 * backed by Supabase Auth instead of Firebase Auth.
 *
 * Usage: swap the import in V3SupabaseApp.jsx:
 *   import { AuthProvider, useAuth } from './contexts/AuthContext.supabase';
 */

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { USER_ROLES, getUserByRole, getRolePermissions, getDefaultPagePermissions } from '../entities/UserRoles';
import { supabaseService } from '../services/supabaseService';
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
    const data = await supabaseService.getSystemConfig('admins');
    if (data && Array.isArray(data.emails)) {
      _adminEmails = [...new Set([BOOTSTRAP_ADMIN, ...data.emails.map((e) => e.toLowerCase())])];
    }
  } catch (e) {
    console.warn('Could not load system admins, using bootstrap admin:', e.message);
  }
  _notifyAdminListeners();
}

function startAdminListener() {
  // loadSystemAdmins() on app boot already fetches the initial admin list.
  // Realtime handles all subsequent changes — no polling needed.
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
// HELPERS
// ============================================================================
/**
 * Wraps a promise with a timeout. If the promise doesn't resolve/reject within
 * `ms` milliseconds, the timeout rejects with a TimeoutError. This prevents
 * Supabase queries from hanging indefinitely during sign-in.
 */
function withTimeout(promise, ms, label = 'operation') {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`[Auth] ${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// ============================================================================
// LOCAL STORAGE — lightweight display cache for instant shell rendering
// ============================================================================
// IMPORTANT: This cache is ONLY for rendering the UI shell instantly on refresh
// (name, avatar, role). Permissions are NEVER read from this cache for access
// control — they always come fresh from the DB via handleUserSignIn or the
// realtime listener.
const DISPLAY_CACHE_KEY = 'luxury_listings_display_cache';
const AUTH_STORAGE_KEY = 'luxury_listings_auth_sb'; // legacy key — cleaned up on load
const DISPLAY_CACHE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours — discard stale shell data

const saveDisplayCache = (user) => {
  try {
    if (user) {
      // Only store display data for the UI shell — NO permissions.
      // Permissions are never cached in localStorage to prevent stale access
      // after an admin revokes a user's page access.
      localStorage.setItem(DISPLAY_CACHE_KEY, JSON.stringify({
        email: user.email,
        displayName: user.displayName,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        role: user.role,
        primaryRole: user.primaryRole,
        uid: user.uid,
        isApproved: user.isApproved,
        onboardingCompleted: user.onboardingCompleted,
        isDemoViewOnly: user.isDemoViewOnly,
        _cacheTimestamp: Date.now(),
      }));
    } else {
      localStorage.removeItem(DISPLAY_CACHE_KEY);
    }
    // Clean up legacy full-user cache
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (_) {}
};

const loadDisplayCache = () => {
  try {
    // Try new cache first, fall back to legacy for seamless migration
    const stored = localStorage.getItem(DISPLAY_CACHE_KEY) || localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    // Discard cache older than 24 hours — stale name/avatar is worse than a brief
    // loading state, and the auth flow will repopulate this within ~1 second anyway.
    if (parsed?._cacheTimestamp && Date.now() - parsed._cacheTimestamp > DISPLAY_CACHE_MAX_AGE) {
      localStorage.removeItem(DISPLAY_CACHE_KEY);
      return null;
    }
    // Strip permissions — never serve stale cached permissions
    if (parsed) {
      parsed.pagePermissions = [];
    }
    return parsed;
  } catch (_) {
    return null;
  }
};

// Backwards-compatible alias used in mergeCurrentUser and a few other places
const saveAuthToStorage = saveDisplayCache;

// ============================================================================
// AUTH CONTEXT
// ============================================================================
// AuthContext is defined and exported here (post-cutover AuthContext.js re-exports it).
// All V3 components using useAuth() transparently use Supabase state.

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const displayCache = loadDisplayCache();

  const [currentUser, setCurrentUser] = useState(displayCache);
  const [userData, setUserData] = useState(displayCache);
  const [currentRole, setCurrentRole] = useState(displayCache?.role || USER_ROLES.CONTENT_DIRECTOR);
  const [loading, setLoading] = useState(!displayCache);
  const [chatbotResetTrigger, setChatbotResetTrigger] = useState(0);
  // True once the first onAuthStateChange → handleUserSignIn cycle has fetched
  // real permissions from the DB. Until this is true, PermissionsContext should
  // keep loading=true so PermissionRoute shows a spinner instead of "Access Denied".
  const [authHydrated, setAuthHydrated] = useState(false);
  // Guard: prevent realtime listener from overwriting permissions during initial sign-in
  const signInInProgressRef = useRef(false);
  // Track whether we've done a full sign-in this session (vs just restoring)
  const hasCompletedFullSignIn = useRef(false);

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
      const redirectTo = `${window.location.origin}/dashboard`;

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
      // Key is scoped per-user so role switches on one account don't affect others
      await supabaseService.saveSystemConfig(`currentRole:${currentUser.email.toLowerCase()}`, newRole);
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
    };

    setCurrentUser(updatedUser);
    setChatbotResetTrigger((prev) => prev + 1);
  }

  /**
   * @deprecated Use usePermissions().hasPageAccess() instead.
   * Kept for backwards compatibility.
   */
  function hasPermission(permission) {
    return resolvePermission({
      permission,
      pagePermissions: currentUser?.pagePermissions || [],
      isAdmin: isSystemAdmin(currentUser?.email),
    });
  }

  // ============================================================================
  // SUPABASE AUTH LISTENER
  // ============================================================================

  useEffect(() => {
    // ── Proactive session restore ──────────────────────────────────────
    // onAuthStateChange can be delayed several seconds while Supabase
    // refreshes an expired access token over the network. Meanwhile the
    // safety timeout fires at 5s and unblocks the app with EMPTY
    // permissions — causing "Access Denied" flashes and empty data.
    //
    // Fix: call getSession() immediately on mount. It returns the stored
    // session from localStorage synchronously (even if the access token is
    // expired). The Supabase client auto-refreshes expired tokens on the
    // first DB query, so handleUserSignIn works fine with a stale token.
    // This lets us start the sign-in flow ~instantly instead of waiting
    // for onAuthStateChange.
    // Helper: extract OAuth tokens from URL hash (e.g. #access_token=…&refresh_token=…)
    function extractHashTokens() {
      const hash = window.location.hash;
      if (!hash || !hash.includes('access_token=')) return null;
      const params = new URLSearchParams(hash.substring(1));
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      if (!access_token || !refresh_token) return null;
      return { access_token, refresh_token };
    }

    // Helper: manually set session from hash tokens (bypasses navigator lock)
    async function setSessionFromHash() {
      const tokens = extractHashTokens();
      if (!tokens) return null;
      console.log('[Auth] Attempting manual setSession from URL hash tokens…');
      const { data, error } = await supabase.auth.setSession({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
      });
      if (error) {
        console.error('[Auth] setSession from hash failed:', error.message);
        return null;
      }
      console.log('[Auth] setSession from hash succeeded:', data.session?.user?.email);
      return data.session;
    }

    console.log('[Auth] Proactive restore — calling getSession()…');
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('[Auth] Proactive restore — getSession returned:', session ? `user=${session.user?.email}` : 'null');
      if (hasCompletedFullSignIn.current) return;

      // If getSession() returned no session but URL has OAuth hash tokens,
      // the URL detection may not have run yet. Try setSession as fallback.
      if (!session?.user && extractHashTokens()) {
        console.log('[Auth] No session from getSession but URL has hash tokens — trying setSession…');
        session = await setSessionFromHash();
      }

      if (!session?.user) {
        console.log('[Auth] Proactive restore — no session, unblocking as signed-out');
        setAuthHydrated(true);
        setLoading(false);
        return;
      }
      try {
        console.log('[Auth] Proactive restore — starting handleUserSignIn for', session.user.email);
        await handleUserSignIn(session.user);
        hasCompletedFullSignIn.current = true;
        setAuthHydrated(true);
        setLoading(false);
        console.log('[Auth] Proactive restore — complete');
        if (window.location.hash?.includes('access_token=')) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      } catch (err) {
        console.error('[Auth] Proactive restore FAILED:', err);
        setAuthHydrated(true);
        setLoading(false);
      }
    }).catch(async (err) => {
      console.error('[Auth] getSession() threw:', err.message);
      // getSession() can fail with AbortError when the Supabase navigator lock
      // times out (stale lock from previous tab/page reload). If URL has OAuth
      // hash tokens, try to establish the session manually — this bypasses the
      // lock entirely.
      if (hasCompletedFullSignIn.current) return;
      try {
        const session = await setSessionFromHash();
        if (session?.user) {
          console.log('[Auth] Fallback setSession succeeded after getSession failure');
          await handleUserSignIn(session.user);
          hasCompletedFullSignIn.current = true;
          setAuthHydrated(true);
          setLoading(false);
          if (window.location.hash?.includes('access_token=')) {
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
          }
          return;
        }
      } catch (fallbackErr) {
        console.error('[Auth] Fallback setSession also failed:', fallbackErr.message);
      }
      setAuthHydrated(true);
      setLoading(false);
    });

    // ── Standard auth listener (handles sign-in, sign-out, token refresh) ──
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (event === 'SIGNED_OUT' || !session?.user) {
          saveDisplayCache(null);
          setCurrentUser(null);
          setUserData(null);
          setCurrentRole(USER_ROLES.CONTENT_DIRECTOR);
          hasCompletedFullSignIn.current = false;
          setAuthHydrated(true);
          setLoading(false);
          return;
        }

        if (event === 'TOKEN_REFRESHED') {
          if (hasCompletedFullSignIn.current) {
            // Token rotated mid-session — permissions already loaded, no re-fetch needed
            setAuthHydrated(true);
            setLoading(false);
            return;
          }
          // TOKEN_REFRESHED fired before INITIAL_SESSION on a hard refresh (token was
          // near-expiry). Fall through to the full sign-in path below so we fetch
          // fresh permissions from the DB before unblocking the app.
        }

        // Skip if proactive restore already completed sign-in
        if (hasCompletedFullSignIn.current) {
          if (event === 'SIGNED_IN') {
            // Explicit new sign-in (e.g. OAuth redirect) — always re-run
            await handleUserSignIn(session.user);
            setAuthHydrated(true);
            setLoading(false);
            if (window.location.hash?.includes('access_token=')) {
              window.history.replaceState(null, '', window.location.pathname + window.location.search);
            }
          } else {
            // INITIAL_SESSION after proactive restore — already handled
            setAuthHydrated(true);
            setLoading(false);
          }
          return;
        }

        // First load via onAuthStateChange (proactive restore didn't run or failed)
        console.log('[Auth] onAuthStateChange sign-in — event:', event);
        await handleUserSignIn(session.user);
        hasCompletedFullSignIn.current = true;
        setAuthHydrated(true);
        if (window.location.hash?.includes('access_token=')) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      } catch (error) {
        console.error('Auth state error:', error);
        const msg = (error.message || '').toLowerCase();
        const isAuthFailure = msg.includes('jwt') || msg.includes('token') ||
          msg.includes('not authorized') || msg.includes('invalid') ||
          error.status === 401 || error.status === 403;
        if (isAuthFailure) {
          saveDisplayCache(null);
          setCurrentUser(null);
          setUserData(null);
          setCurrentRole(USER_ROLES.CONTENT_DIRECTOR);
          hasCompletedFullSignIn.current = false;
        } else {
          console.warn('Transient auth error — keeping cached state, will retry on next event');
        }
        setAuthHydrated(true);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle user sign-in logic (mirrors original handleUserSignIn)
  async function handleUserSignIn(supabaseUser) {
    signInInProgressRef.current = true;
    try {
      return await _handleUserSignInInner(supabaseUser);
    } finally {
      signInInProgressRef.current = false;
    }
  }

  async function _handleUserSignInInner(supabaseUser) {
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
      if (currentPath === '/login' || currentPath === '/') {
        appNavigate('/dashboard', { replace: true });
      }
      return;
    }

    // System admin
    if (isSystemAdmin(email)) {
      supabaseService.bootstrapSystemAdmins(email).catch(() => {});

      const [savedRole, approved] = await Promise.all([
        supabaseService.getSystemConfig(`currentRole:${email.toLowerCase()}`).catch(() => null),
        supabaseService.getApprovedUserByEmail(email).catch(() => null),
      ]);

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
      if (approved) {
        if (approved.displayName) adminUser.displayName = approved.displayName;
        if (approved.firstName != null) adminUser.firstName = approved.firstName;
        if (approved.lastName != null) adminUser.lastName = approved.lastName;
        if (approved.position != null) adminUser.position = approved.position;
        if (approved.department) adminUser.department = approved.department;
        if (approved.avatar) adminUser.avatar = approved.avatar;
      }

      setCurrentRole(roleToUse);
      setCurrentUser(adminUser);
      setUserData(adminUser);
      saveAuthToStorage(adminUser);
      return;
    }

    // Regular user: look up in profiles (approved_users)
    // Always bust the profile cache before fetching — ensures DB changes
    // (permissions, role, approval status) are reflected immediately without
    // requiring a log-out/in cycle.
    const emailNormalized = (email || '').trim().toLowerCase();
    supabaseService.clearProfileCache(emailNormalized);
    try {
      let profileFetchTimedOut = false;
      let [approvedUser, savedRoleRaw] = await withTimeout(
        Promise.all([
          supabaseService.getApprovedUserByEmail(emailNormalized),
          supabaseService.getSystemConfig(`currentRole:${emailNormalized}`).catch(() => null),
        ]),
        5000,
        'profile fetch'
      ).catch((err) => {
        console.warn('[Auth] Profile fetch timed out or failed:', err.message);
        profileFetchTimedOut = true;
        return [null, null];
      });
      // If the profile query returned null it may be a race condition: on a hard
      // refresh the Supabase session JWT can take a moment to attach to outgoing
      // requests, so RLS blocks the SELECT and maybeSingle() returns null instead
      // of an error. Retry once after a short delay before treating the user as
      // not-approved and triggering a forced logout.
      if (!approvedUser && !profileFetchTimedOut) {
        // RLS race: JWT may not be attached yet on a hard refresh. Wait briefly then retry.
        await new Promise((resolve) => setTimeout(resolve, 400));
        supabaseService.clearProfileCache(emailNormalized);
        approvedUser = await withTimeout(
          supabaseService.getApprovedUserByEmail(emailNormalized),
          5000,
          'profile retry'
        ).catch((err) => {
          console.warn('[Auth] Profile retry timed out or failed:', err.message);
          profileFetchTimedOut = true;
          return null;
        });
      }
      if (approvedUser) {
        const assignedRoles =
          approvedUser.roles || [approvedUser.primaryRole || approvedUser.role] || ['content_director'];
        const primaryRole = assignedRoles[0] || 'content_director';

        let savedRole = savedRoleRaw;

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
          pagePermissions: Array.isArray(approvedUser.pagePermissions) ? approvedUser.pagePermissions : [],
          isApproved: true,
          onboardingCompleted: approvedUser.onboardingCompleted,
        };

        // If user has NO page permissions yet, apply role defaults IN-MEMORY ONLY.
        // Do NOT write back to DB — that overwrites intentionally-empty permissions
        // and causes the "random revocation" bug when roles change.
        if (!mergedUser.pagePermissions.length) {
          const defaults = getDefaultPagePermissions(roleToUse);
          mergedUser.pagePermissions = defaults;
        }

        setCurrentRole(roleToUse);
        setCurrentUser(mergedUser);
        setUserData(mergedUser);
        saveAuthToStorage(mergedUser);

        // Sync avatar + uid back to profiles
        const syncPayload = {};
        if (photoURL) syncPayload.avatar = photoURL;
        if (uid) syncPayload.uid = uid;
        if (Object.keys(syncPayload).length) {
          supabaseService.updateApprovedUser(approvedUser.id || email, syncPayload).catch(() => {});
        }

        // Navigate
        const currentPath = window.location.pathname;
        if (currentPath.startsWith('/report/')) return;

        const onLoginOrHome =
          currentPath === '/login' ||
          currentPath === '/';

        if (onLoginOrHome) {
          if (mergedUser.onboardingCompleted) {
            appNavigate('/dashboard', { replace: true });
          } else {
            appNavigate('/onboarding', { replace: true });
          }
        } else if (!mergedUser.onboardingCompleted && !currentPath.includes('/onboarding')) {
          appNavigate('/onboarding', { replace: true });
        }
      } else if (profileFetchTimedOut) {
        // The profile fetch timed out (Supabase slow/unreachable) — don't log the user
        // out. Apply role-based defaults from the display cache so pages are accessible,
        // then let the safety timeout unblock the app. The user can refresh to retry.
        console.warn('[Auth] Profile fetch timed out — applying role defaults from display cache');
        const cachedRole = loadDisplayCache()?.role || USER_ROLES.CONTENT_DIRECTOR;
        const roleUserData = getUserByRole(cachedRole);
        const fallbackUser = {
          uid,
          email,
          displayName: displayName || roleUserData.displayName,
          firstName: displayName?.split(' ')[0] || roleUserData.firstName,
          lastName: displayName?.split(' ').slice(1).join(' ') || roleUserData.lastName,
          position: roleUserData.position,
          role: cachedRole,
          roles: [cachedRole],
          primaryRole: cachedRole,
          department: roleUserData.department,
          startDate: roleUserData.startDate,
          avatar: photoURL || roleUserData.avatar,
          bio: roleUserData.bio,
          skills: roleUserData.skills,
          stats: roleUserData.stats,
          pagePermissions: getDefaultPagePermissions(cachedRole),
          isApproved: true,
          onboardingCompleted: true,
          _fromTimeoutFallback: true,
        };
        setCurrentRole(cachedRole);
        setCurrentUser(fallbackUser);
        setUserData(fallbackUser);
        // Don't save to storage — this is a temporary fallback only
      } else {
        // Not approved — sign out
        await logout();
        if (!window.location.pathname.includes('/login')) {
          appNavigate('/login?error=access_required', { replace: true });
        }
      }
    } catch (error) {
      console.error('Error checking user approval:', error);
      // Only force-logout on genuine auth failures (bad token, revoked access, 401/403).
      // Transient network errors or Supabase outages should NOT log the user out —
      // we keep whatever state was already set (display cache / previous currentUser).
      const msg = (error.message || '').toLowerCase();
      const isAuthFailure =
        msg.includes('jwt') ||
        msg.includes('token') ||
        msg.includes('not authorized') ||
        msg.includes('invalid') ||
        msg.includes('not approved') ||
        error.status === 401 ||
        error.status === 403;
      if (isAuthFailure) {
        await logout();
        if (!window.location.pathname.includes('/login')) {
          appNavigate('/login?error=access_required', { replace: true });
        }
      } else {
        // Transient error (network blip, Supabase outage) — keep cached state
        console.warn('Transient error during sign-in check — keeping cached user state');
      }
    }
  }

  // Load saved role when user changes
  useEffect(() => {
    if (!currentUser) return;
    const loadCurrentRole = async () => {
      try {
        const savedRole = await supabaseService.getSystemConfig(`currentRole:${currentUser.email.toLowerCase()}`);
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
    supabaseService.updateLastSeen(currentUser.email).catch(() => {});
    const interval = setInterval(() => {
      supabaseService.updateLastSeen(currentUser.email).catch(() => {});
    }, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [currentUser?.email, currentUser?.isDemoViewOnly, currentUser?.isApproved]);

  // Listen for profile changes in real time
  useEffect(() => {
    if (!currentUser?.email) return;

    const unsubscribe = supabaseService.onApprovedUserChange(currentUser.email, (approvedUser) => {
      if (!approvedUser) return;
      // Don't overwrite permissions while handleUserSignIn is still running
      if (signInInProgressRef.current) return;
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
          pagePermissions: approvedUser.pagePermissions ?? prev.pagePermissions ?? [],
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

  // Safety timeout — last-resort fallback if both proactive restore AND
  // onAuthStateChange fail to complete (e.g. Supabase is completely down,
  // network is blocked, or an unexpected error swallows the promise).
  //
  // With the proactive getSession() restore above, this should almost never
  // fire in normal operation. Kept as a safety net at 10s.
  useEffect(() => {
    let timeout;
    // Hard deadline: force-unblock after 12s no matter what.
    // This prevents the app from being stuck forever if handleUserSignIn hangs
    // (e.g. a Supabase query that never resolves/rejects).
    const HARD_DEADLINE_MS = 12000;
    const startedAt = Date.now();
    const forceUnblock = () => {
      console.warn('[Auth] Force-unblocking app — sign-in took too long');
      setAuthHydrated(true);
      setLoading(false);
    };
    const scheduleTimeout = (delay) => {
      timeout = setTimeout(() => {
        const elapsed = Date.now() - startedAt;
        if (signInInProgressRef.current && elapsed < HARD_DEADLINE_MS) {
          // Sign-in is still running and we haven't hit the hard deadline yet —
          // give it a bit more time.
          console.log('[Auth] Safety timeout: sign-in in progress, extending…');
          scheduleTimeout(2000);
          return;
        }
        if (signInInProgressRef.current) {
          // Hard deadline reached — sign-in is hanging, force-unblock.
          forceUnblock();
          return;
        }
        setAuthHydrated((prev) => {
          if (!prev) console.warn('[Auth] Safety timeout — unblocking app after wait');
          return true;
        });
        setLoading(false);
      }, delay);
    };
    scheduleTimeout(5000);
    return () => clearTimeout(timeout);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
          pagePermissions: viewAs.viewAsPermissions || [],
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
    authHydrated,
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
          pagePermissions: viewAs.viewAsPermissions || [],
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
