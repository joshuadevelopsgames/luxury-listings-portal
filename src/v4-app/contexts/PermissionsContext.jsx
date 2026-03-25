/**
 * V4 PermissionsContext — mirrors the V3 PermissionsContext API
 * so ported V3 pages can call usePermissions() unchanged.
 *
 * Two concepts:
 *   1. PAGE ACCESS  — hasPageAccess(pageId)
 *   2. CAPABILITIES — hasCapability(capabilityId)
 *
 * System admins bypass all capability checks automatically.
 * Demo view-only users can see all pages but have no capabilities.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

const PermissionsContext = createContext();

/** @deprecated Import from '../../entities/Capabilities' instead. */
export { CAPABILITIES as FEATURE_PERMISSIONS } from '../../entities/Capabilities';

export function usePermissions() {
  return useContext(PermissionsContext);
}

export function PermissionsProvider({ children }) {
  const { currentUser, isSystemAdmin: authIsAdmin } = useAuth();
  const [pages, setPages] = useState([]);
  const [capabilities, setCapabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);

  const refreshPermissions = useCallback(async () => {
    if (!currentUser?.uid) return;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('page_permissions, feature_permissions, custom_permissions, role')
        .eq('id', currentUser.uid)
        .single();
      if (data) {
        setPages(Array.isArray(data.page_permissions) ? data.page_permissions : []);
        const caps = [...new Set([
          ...(Array.isArray(data.feature_permissions) ? data.feature_permissions : []),
          ...(Array.isArray(data.custom_permissions) ? data.custom_permissions : []),
        ])];
        setCapabilities(caps);
        setIsSystemAdmin(data.role === 'admin');
      }
    } catch (error) {
      console.error('Error refreshing permissions:', error);
    }
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid) {
      setPages([]);
      setCapabilities([]);
      setLoading(false);
      setIsSystemAdmin(false);
      return;
    }

    const isDemoViewOnly = !!currentUser.isDemoViewOnly;
    if (isDemoViewOnly) {
      setIsSystemAdmin(false);
      setPages([]);
      setCapabilities([]);
      setLoading(false);
      return;
    }

    setIsSystemAdmin(authIsAdmin || currentUser.role === 'admin');
    setPages(Array.isArray(currentUser.pagePermissions) ? currentUser.pagePermissions : []);
    // Merge feature + custom into capabilities
    const caps = [...new Set([
      ...(Array.isArray(currentUser.featurePermissions) ? currentUser.featurePermissions : []),
      ...(Array.isArray(currentUser.customPermissions) ? currentUser.customPermissions : []),
    ])];
    setCapabilities(caps);
    setLoading(false);

    // Subscribe to profile changes for live permission updates
    const channel = supabase
      .channel(`perms_${currentUser.uid}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${currentUser.uid}` },
        (payload) => {
          const p = payload.new;
          setPages(Array.isArray(p.page_permissions) ? p.page_permissions : []);
          const updatedCaps = [...new Set([
            ...(Array.isArray(p.feature_permissions) ? p.feature_permissions : []),
            ...(Array.isArray(p.custom_permissions) ? p.custom_permissions : []),
          ])];
          setCapabilities(updatedCaps);
          setIsSystemAdmin(p.role === 'admin');
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [currentUser?.uid, currentUser?.role, authIsAdmin]);

  const isDemoViewOnly = !!currentUser?.isDemoViewOnly;

  // ── Primary API ──────────────────────────────────────────────────────

  const hasPageAccess = useCallback((pageId) => {
    if (isDemoViewOnly) return true;
    if (isSystemAdmin) return true;
    if (pageId === 'dashboard') return true;
    return pages.includes(pageId);
  }, [pages, isSystemAdmin, isDemoViewOnly]);

  const hasCapability = useCallback((capabilityId) => {
    if (isDemoViewOnly) return false;
    if (isSystemAdmin) return true;
    return capabilities.includes(capabilityId);
  }, [capabilities, isSystemAdmin, isDemoViewOnly]);

  // ── Deprecated aliases ───────────────────────────────────────────────

  /** @deprecated Use hasPageAccess() */
  const hasPermission = hasPageAccess;

  /** @deprecated Use hasCapability() */
  const hasFeaturePermission = hasCapability;

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
