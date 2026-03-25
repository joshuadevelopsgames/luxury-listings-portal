/**
 * V4 PermissionsContext — mirrors the V3 PermissionsContext API
 * so ported V3 pages can call usePermissions() unchanged.
 *
 * Reads page_permissions / feature_permissions from profiles (Supabase)
 * instead of approved_users (Firestore).
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

const PermissionsContext = createContext();

// ── Feature permission IDs (same as V3) ─────────────────
export const FEATURE_PERMISSIONS = {
  VIEW_FINANCIALS: 'view_financials',
  MANAGE_USERS: 'manage_users',
  APPROVE_TIME_OFF: 'approve_time_off',
  VIEW_ANALYTICS: 'view_analytics',
  MANAGE_CLIENTS: 'manage_clients',
  ASSIGN_CLIENT_MANAGERS: 'assign_client_managers',
  EDIT_CLIENT_PACKAGES: 'edit_client_packages',
  VIEW_ALL_REPORTS: 'view_all_reports',
  APPROVE_CONTENT: 'approve_content',
  MANAGE_CHATS: 'manage_chats',
  MANAGE_FEEDBACK: 'manage_feedback',
  MANAGE_GRAPHIC_PROJECTS: 'manage_graphic_projects',
  MANAGE_RESOURCES: 'manage_resources',
  MANAGE_EMPLOYEE_PROFILES: 'manage_employee_profiles',
  VIEW_ALL_MODULES: 'view_all_modules',
  MANAGE_WORKLOAD: 'manage_workload',
  MANAGE_ALL_CLIENTS: 'manage_all_clients',
  VIEW_AUDIT_TRAIL: 'view_audit_trail',
  MANAGE_INSTAGRAM_REPORTS: 'manage_instagram_reports',
};

export function usePermissions() {
  return useContext(PermissionsContext);
}

export function PermissionsProvider({ children }) {
  const { currentUser, isSystemAdmin: authIsAdmin } = useAuth();
  const [permissions, setPermissions] = useState([]);
  const [featurePermissions, setFeaturePermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);

  const refreshPermissions = useCallback(async () => {
    if (!currentUser?.uid) return;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('page_permissions, feature_permissions, role')
        .eq('id', currentUser.uid)
        .single();
      if (data) {
        setPermissions(data.page_permissions || []);
        setFeaturePermissions(data.feature_permissions || []);
        setIsSystemAdmin(data.role === 'admin');
      }
    } catch (error) {
      console.error('Error refreshing permissions:', error);
    }
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid) {
      setPermissions([]);
      setFeaturePermissions([]);
      setLoading(false);
      setIsSystemAdmin(false);
      return;
    }

    const isDemoViewOnly = !!currentUser.isDemoViewOnly;
    if (isDemoViewOnly) {
      setIsSystemAdmin(false);
      setPermissions([]);
      setFeaturePermissions([]);
      setLoading(false);
      return;
    }

    setIsSystemAdmin(authIsAdmin || currentUser.role === 'admin');
    setPermissions(currentUser.pagePermissions || []);
    setFeaturePermissions(currentUser.featurePermissions || []);
    setLoading(false);

    // Subscribe to profile changes for live permission updates
    const channel = supabase
      .channel(`perms_${currentUser.uid}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${currentUser.uid}` },
        (payload) => {
          const p = payload.new;
          setPermissions(p.page_permissions || []);
          setFeaturePermissions(p.feature_permissions || []);
          setIsSystemAdmin(p.role === 'admin');
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [currentUser?.uid, currentUser?.role, authIsAdmin]);

  const isDemoViewOnly = !!currentUser?.isDemoViewOnly;

  const hasPermission = useCallback((pageId) => {
    if (isDemoViewOnly) return true;
    if (isSystemAdmin) return true;
    if (pageId === 'dashboard') return true;
    return permissions.includes(pageId);
  }, [permissions, isSystemAdmin, isDemoViewOnly]);

  const hasFeaturePermission = useCallback((featureId) => {
    if (isDemoViewOnly) return false;
    if (isSystemAdmin) return true;
    return featurePermissions.includes(featureId);
  }, [featurePermissions, isSystemAdmin, isDemoViewOnly]);

  const value = {
    permissions,
    featurePermissions,
    loading,
    isSystemAdmin,
    isDemoViewOnly,
    hasPermission,
    hasFeaturePermission,
    refreshPermissions,
  };

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}
