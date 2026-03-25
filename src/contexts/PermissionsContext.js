import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabaseService } from '../services/supabaseService';
import { isSystemAdmin as checkIsSystemAdmin, onSystemAdminsChange } from '../utils/systemAdmins';

const PermissionsContext = createContext();

export function usePermissions() {
  return useContext(PermissionsContext);
}

/**
 * PermissionsProvider — the SINGLE authority for all authorization checks.
 *
 * Simplified model (March 2026):
 *   • PAGE ACCESS — which sidebar pages can a user see?
 *     → hasPageAccess(pageId)
 *   • If you have access to a page, you can do EVERYTHING on it.
 *   • No feature/capability permissions — page access IS the permission.
 *   • System admins bypass all checks automatically.
 *   • Demo view-only users can see all pages but cannot make changes.
 */
export function PermissionsProvider({ children }) {
  const { currentUser, authHydrated } = useAuth();
  const [pages, setPages] = useState([]);
  const [permissionsVersion, setPermissionsVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);

  // Refresh permissions on demand (e.g., after admin changes)
  const refreshPermissions = useCallback(async () => {
    if (!currentUser?.email || currentUser?.isDemoViewOnly) return;

    try {
      const result = await supabaseService.getUserPermissions(currentUser.email);
      const pagePerms = Array.isArray(result?.pages) ? result.pages : (Array.isArray(result) ? result : []);
      setPages(pagePerms);
      if (result?.version !== undefined) setPermissionsVersion(result.version);
    } catch (error) {
      console.error('Error refreshing permissions:', error);
    }
  }, [currentUser?.email, isSystemAdmin]);

  useEffect(() => {
    if (!currentUser?.email) {
      setPages([]);
      setLoading(false);
      setIsSystemAdmin(false);
      return;
    }

    // Demo view-only: see all pages
    const isDemoViewOnly = !!currentUser.isDemoViewOnly;
    if (isDemoViewOnly) {
      setIsSystemAdmin(false);
      setPages([]);
      setLoading(false);
      return;
    }

    // Subscribe to admin changes
    const unsubscribeAdmins = onSystemAdminsChange((adminEmails) => {
      const adminStatus = adminEmails.includes(currentUser.email.toLowerCase());
      setIsSystemAdmin(adminStatus);
    });

    const adminStatus = checkIsSystemAdmin(currentUser.email);
    setIsSystemAdmin(adminStatus);

    // Seed from currentUser (AuthContext already fetched these)
    const seededPages = Array.isArray(currentUser.pagePermissions) ? currentUser.pagePermissions : [];
    setPages(seededPages);
    setPermissionsVersion(currentUser.permissionsVersion || 0);
    // Only stop loading once AuthContext has completed its DB fetch (authHydrated).
    // This prevents PermissionRoute from blocking pages based on stale/empty cached permissions.
    if (authHydrated) {
      setLoading(false);
    }

    // Subscribe to realtime updates for live permission changes
    const unsub = supabaseService.onApprovedUserChange(currentUser.email, (user) => {
      if (!user) return;
      const incomingVersion = user.permissionsVersion || user.permissions_version || 0;
      setPermissionsVersion((prevVersion) => {
        if (incomingVersion < prevVersion) return prevVersion;
        const updatedPages = Array.isArray(user.pagePermissions) ? user.pagePermissions : [];
        setPages(updatedPages);
        return incomingVersion;
      });
    });

    return () => {
      if (typeof unsub === 'function') unsub();
      unsubscribeAdmins();
    };
  }, [
    currentUser?.email,
    currentUser?.permissionsVersion,
    currentUser?.pagePermissions,
    authHydrated,
  ]);

  const isDemoViewOnly = !!currentUser?.isDemoViewOnly;

  // ── Primary API ──────────────────────────────────────────────────────

  /** Can the user see this sidebar page? */
  const hasPageAccess = (pageId) => {
    if (isDemoViewOnly) return true;
    if (isSystemAdmin) return true;
    if (pageId === 'dashboard') return true;
    return pages.includes(pageId);
  };

  // ── Backwards-compatible stubs ──────────────────────────────────────
  // These always return true (for non-demo users with page access) since
  // the new model grants full access to any page you can see.
  // Kept temporarily so existing component code doesn't break before
  // hasCapability() calls are cleaned out of individual pages.

  /** @deprecated — always returns true for authenticated users (or admin). Page access = full access. */
  const hasCapability = (_capabilityId) => {
    if (isDemoViewOnly) return false;
    if (isSystemAdmin) return true;
    // Under the new model, if you have access to the page, you can do everything on it.
    // The PermissionRoute already gates page access, so any capability check = true.
    return true;
  };

  /** @deprecated Use hasPageAccess() */
  const hasPermission = hasPageAccess;
  /** @deprecated Use hasPageAccess() */
  const hasFeaturePermission = hasCapability;

  const value = {
    // Primary API
    pages,
    hasPageAccess,

    // Backwards compat stubs (will be removed once page components are cleaned up)
    capabilities: [],
    hasCapability,
    permissions: pages,
    featurePermissions: [],
    hasPermission,
    hasFeaturePermission,

    // Metadata
    permissionsVersion,
    loading,
    isSystemAdmin,
    isDemoViewOnly,
    refreshPermissions,
  };

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}
