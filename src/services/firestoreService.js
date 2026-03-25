/**
 * firestoreService.js — CUTOVER VERSION
 *
 * Re-exports the Supabase implementation under the original name.
 * All pages/components that import { firestoreService } from './firestoreService'
 * now automatically use Supabase as the backend.
 *
 * Original Firebase implementation: firestoreService.js.firebase.bak
 * To roll back: run scripts/rollback-to-firebase.sh
 */
export { firestoreService } from './supabaseFirestoreService';
