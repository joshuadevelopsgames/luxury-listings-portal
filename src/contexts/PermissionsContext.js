import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabaseService } from '../services/supabaseService';
import { isSystemAdmin as checkIsSystemAdmin, onSystemAdminsChange } from '../utils/systemAdmins';

const PermissionsContext = createContext();

/**
 * @deprecated Import from '../entities/Capabilities' instead.
 * Kept here only so existing `import { FEATURE_PERMISSIONS } from './PermissionsContext'`
 * statements don't break until they're migrated.
 */
export { CAPABILITIES as FEATURE_PERMISSIONS } from '../entities/Capabilities';

export function usePermissions() {
  return useContext(PermissionsContext);
}

/**
 * PermissionsProvider — the SINGLE authority for all authorization checks.
 *
 * Two concepts:
 *   1. PAGE ACCESS  — which sidebar pages can a user see?
 *      → hasPageAccess(pageId)
 *   2. CAPABILITIES — what actions can a user take?
 *      → hasCapability(capabilityId)
 *
 * System admins bypass all capability checks automatically.
 * Demo view-only users can see all pages but have no capabilities.
 *
 * Deprecated aliases (`hasPermission`, `hasFeaturePermission`) are provided
 * for backwards compatibility and will be removed in a future release.
 */
export function PermissionsProvider({ children }) {
  const { currentUser } = useAuth();
  const [pages, setPages] = useState([]);
  const [capabilities, setCapabilities] = useState([]);
  const [permissionsVersion, setPermissionsVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);

  // Refresh permissions on demand (e.g., after admin changes)
  const refreshPermissions = useCallback(async () => {
    if (!currentUser?.email || currentUser?.isDemoViewOnly) return;

    try {
      const result = await supabaseService.getUserPermissions(currentUser.email);
      const pagePerms = Array.isArray(result?.pages) ? result.pages : (Array.isArray(result) ? result : []);
      const caps = Array.isArray(result?.capabilities) ? result.capabilities : [];

      setPages(pagePerms);
      setCapabilities(caps);
      if (result?.version !== undefined) setPermissionsVersion(result.version);
    } catch (error) {
      console.error('Error refreshing permissions:', error);
    }
  }, [currentUser?.email, isSystemAdmin]);

  useEffect(() => {
    if (!currentUser?.email) {
      setPages([]);
      setCapabilities([]);
      setLoading(false);
      setIsSystemAdmin(false);
      return;
    }

    // Demo view-only: see all pages, no capabilities
    const isDemoViewOnly = !!currentUser.isDemoViewOnly;
    if (isDemoViewOnly) {
      setIsSystemAdmin(false);
      setPages([]);
      setCapabilities([]);
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

    // Subscribe to permission changes with version-based stale rejection
    const sub = supabaseService.getUserPermissions(currentUser.email, {
      subscribe: true,
      onUpdate: (result) => {
        const incomingVersion = result?.version ?? 0;
        setPermissionsVersion((prevVersion) => {
          if (incomingVersion < prevVersion) {
            return prevVersion; // Stale — ignore
          }
          setPages(Array.isArray(result?.pages) ? result.pages : []);
          setCapabilities(Array.isArray(result?.capabilities) ? result.capabilities : []);
          setLoading(false);
          return incomingVersion;
        });
        setLoading(false);
      }
    });

    return () => {
      sub?.unsubscribe?.();
      unsubscribeAdmins();
    };
  }, [currentUser?.email]);

  const isDemoViewOnly = !!currentUser?.isDemoViewOnly;

  // ── Primary API ──────────────────────────────────────────────────────

  /** Can the user see this sidebar page? */
  const hasPageAccess = (pageId) => {
    if (isDemoViewOnly) return true;
    if (pageId === 'dashboard') return true;
    return pages.includes(pageId);
  };

  /** Can the user perform this action? System admins pass all checks. */
  const hasCapability = (capabilityId) => {
    if (isDemoViewOnly) return false;
    if (isSystemAdmin) return true;
    return capabilities.includes(capabilityId);
  };

  // ── Deprecated aliases (remove after full migration) ─────────────────

  /** @deprecated Use hasPageAccess() */
  const hasPermission = hasPageAccess;

  /** @deprecated Use hasCapability() */
  const hasFeaturePermission = (featureId) => {
    // Old callers don't expect admin bypass, but new system provides it
    if (isDemoViewOnly) return false;
    if (isSystemAdmin) return true;
    return capabilities.includes(featureId);
  };

  const value = {
    // New API
    pages,
    capabilities,
    hasPageAccess,
    hasCapability,

    // Backwards compat (deprecated)
    permissions: pages,
    featurePermissions: capabilities,
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
