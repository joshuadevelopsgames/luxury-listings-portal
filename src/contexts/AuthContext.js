/**
 * AuthContext.js — CUTOVER VERSION
 *
 * Re-exports the Supabase AuthProvider and hooks under the original names.
 * All components that import from './contexts/AuthContext' now use Supabase Auth.
 *
 * Original Firebase implementation: AuthContext.js.firebase.bak
 * To roll back: run scripts/rollback-to-firebase.sh
 */
export { AuthContext, AuthProvider, useAuth, useEffectiveAuth } from './AuthContext.supabase';
