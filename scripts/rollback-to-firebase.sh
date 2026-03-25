#!/usr/bin/env bash
# ============================================================================
# Firebase Rollback Script
#
# Restores the original Firebase implementations from their .firebase.bak backups.
# Run this if the Supabase cutover has issues.
# ============================================================================

set -e
SRC="$(cd "$(dirname "$0")/../src" && pwd)"

echo "=== Rolling back to Firebase ==="

if [ ! -f "$SRC/services/firestoreService.js.firebase.bak" ]; then
  echo "❌ No backup found at src/services/firestoreService.js.firebase.bak"
  echo "   Was cutover-to-supabase.sh run first?"
  exit 1
fi

cp "$SRC/services/firestoreService.js.firebase.bak" "$SRC/services/firestoreService.js"
cp "$SRC/contexts/AuthContext.js.firebase.bak" "$SRC/contexts/AuthContext.js"

echo "✅ Restored firestoreService.js (Firebase)"
echo "✅ Restored AuthContext.js (Firebase)"
echo ""
echo "=== Rollback complete ==="
echo "  Rebuild and deploy to restore Firebase-backed production app."
