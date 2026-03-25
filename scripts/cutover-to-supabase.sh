#!/usr/bin/env bash
# ============================================================================
# Supabase Cutover Script
#
# Run this AFTER:
#   1. Migration 012 SQL has been applied in Supabase dashboard
#   2. Data migration has run:
#        SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate-firebase-to-supabase.js
#   3. Testing at /v4/* is verified working
#
# What this does:
#   - Swaps firestoreService.js to re-export from supabaseFirestoreService.js
#   - Swaps AuthContext.js to re-export from AuthContext.supabase.js
#   - Both files are backed up as *.firebase.bak before swapping
#   - After cutover, the main app at / uses Supabase for auth + data
#
# To ROLL BACK: run scripts/rollback-to-firebase.sh
# ============================================================================

set -e
SRC="$(cd "$(dirname "$0")/../src" && pwd)"

echo "=== Supabase Cutover ==="

# Backup originals
cp "$SRC/services/firestoreService.js" "$SRC/services/firestoreService.js.firebase.bak"
cp "$SRC/contexts/AuthContext.js" "$SRC/contexts/AuthContext.js.firebase.bak"
echo "✅ Backed up originals (.firebase.bak)"

# Swap data service: firestoreService.js → re-exports from supabaseFirestoreService
cat > "$SRC/services/firestoreService.js" << 'EOF'
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
EOF
echo "✅ firestoreService.js → supabaseFirestoreService"

# Swap auth context: AuthContext.js → re-exports from AuthContext.supabase
cat > "$SRC/contexts/AuthContext.js" << 'EOF'
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
EOF
echo "✅ AuthContext.js → AuthContext.supabase"

echo ""
echo "=== Cutover complete ==="
echo "  Rebuild and deploy: npm run build && firebase deploy (or your deploy process)"
echo "  The app at / now uses Supabase for auth and data."
echo ""
echo "  To roll back at any time: bash scripts/rollback-to-firebase.sh"
