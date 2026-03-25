import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { v4WelcomeSessionKey, V4_SESSION_FIRST_PATH_KEY } from '../lib/welcomeStorage';

const AuthContext = createContext(null);

/**
 * V4 AuthProvider — backwards-compatible with V3 useAuth() shape.
 *
 * Exposes both the lean V4 API (user, profile) AND the full V3 shape
 * (currentUser, currentRole, hasPermission, userData, etc.) so that
 * ported V3 pages work without changes.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chatbotResetTrigger, setChatbotResetTrigger] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id);
      else { setProfile(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    setProfile(data);
    setLoading(false);
  };

  // ── Auth methods ──────────────────────────────────────────

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signInWithEmail = signIn; // V3 alias

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
      if (error) throw error;
    } catch (err) {
      console.error('Google sign-in error:', err);
      throw err;
    }
  };

  const signOut = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const id = session?.user?.id;
    if (typeof window !== 'undefined') {
      try {
        if (id) sessionStorage.removeItem(v4WelcomeSessionKey(id));
        sessionStorage.removeItem(V4_SESSION_FIRST_PATH_KEY);
      } catch { /* ignore */ }
    }
    await supabase.auth.signOut();
  };

  const logout = signOut; // V3 alias

  const updateProfile = async (updates) => {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();
    if (error) throw error;
    setProfile(data);
    return data;
  };

  // ── Build V3-compatible currentUser from Supabase user+profile ──

  const currentUser = useMemo(() => {
    if (!user || !profile) return null;
    return {
      // Core identifiers
      uid: user.id,
      email: user.email?.toLowerCase() || '',
      displayName: profile.full_name || user.user_metadata?.full_name || user.email || '',
      firstName: profile.first_name || '',
      lastName: profile.last_name || '',
      name: profile.full_name || '',

      // Role & department
      role: profile.role || 'team_member',
      roles: [profile.role || 'team_member'],
      primaryRole: profile.role || 'team_member',
      position: profile.position || '',
      department: profile.department || '',

      // Profile
      avatar: profile.avatar_url || user.user_metadata?.avatar_url || '',
      avatar_url: profile.avatar_url || user.user_metadata?.avatar_url || '',
      bio: profile.bio || '',
      phone: profile.phone || '',
      startDate: profile.start_date || '',
      skills: profile.skills || [],
      stats: {},

      // Permissions
      customPermissions: profile.custom_permissions || [],
      pagePermissions: profile.page_permissions || [],
      featurePermissions: profile.feature_permissions || [],

      // Status
      isApproved: profile.is_approved ?? false,
      onboardingCompleted: profile.onboarding_completed ?? false,
      isDemoViewOnly: false,

      // Leave
      leaveBalances: profile.leave_balances || null,
      isTimeOffAdmin: profile.is_time_off_admin || false,
    };
  }, [user, profile]);

  const currentRole = currentUser?.role || 'team_member';

  // ── V3-compatible permission check ────────────────────────

  const isSystemAdmin = useMemo(() => {
    // Admins are users with role='admin'
    return currentUser?.role === 'admin';
  }, [currentUser?.role]);

  const hasPermission = useCallback((permission) => {
    if (!currentUser) return false;
    if (isSystemAdmin) return true;
    if (currentUser.isDemoViewOnly) return true;
    if (permission === 'dashboard') return true;
    return (
      (currentUser.pagePermissions || []).includes(permission) ||
      (currentUser.featurePermissions || []).includes(permission) ||
      (currentUser.customPermissions || []).includes(permission)
    );
  }, [currentUser, isSystemAdmin]);

  const switchRole = useCallback(async (newRole) => {
    if (!user) return;
    await supabase.from('profiles').update({ role: newRole }).eq('id', user.id);
    await loadProfile(user.id);
  }, [user]);

  const mergeCurrentUser = useCallback((partial) => {
    setProfile((prev) => prev ? { ...prev, ...partial } : prev);
  }, []);

  // ── Provider value ────────────────────────────────────────

  const value = useMemo(() => ({
    // V4 API
    user,
    profile,
    loading,
    signIn,
    signInWithGoogle,
    signOut,
    updateProfile,

    // V3-compatible API
    currentUser,
    userData: currentUser,
    currentRole,
    hasPermission,
    isSystemAdmin,
    switchRole,
    signInWithEmail,
    logout,
    chatbotResetTrigger,
    mergeCurrentUser,

    // View As stubs (not needed in V4 but prevents errors)
    realUser: currentUser,
    isViewingAs: false,
    viewingAsUser: null,

    // Helper for V3 pages that call getCurrentRolePermissions
    getCurrentRolePermissions: () => ({
      pages: currentUser?.pagePermissions || [],
      features: currentUser?.featurePermissions || [],
    }),
  }), [user, profile, loading, currentUser, currentRole, hasPermission, isSystemAdmin, switchRole, chatbotResetTrigger, mergeCurrentUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

/** V3 compatibility: useEffectiveAuth respects View As mode. In V4 it's just useAuth. */
export const useEffectiveAuth = useAuth;
