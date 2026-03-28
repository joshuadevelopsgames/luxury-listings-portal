# Workspaces (canvases) — Firebase → Supabase

Canvas “workspaces” live in Firestore `canvases` and in Supabase `canvases`. Version history in Firebase is often in the **subcollection** `canvases/{docId}/history`, not only on the parent document.

## Prerequisites

- `FIREBASE_SERVICE_ACCOUNT_JSON` **or** `scripts/firebase-service-account.json` (or `FIREBASE_SERVICE_ACCOUNT_PATH`)
- `REACT_APP_SUPABASE_URL` or `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (required — bypasses RLS for migration)
- `firebase-admin` available (`npm install` from repo root picks up devDependencies)

## Commands (from repo root)

```bash
# Load env (must include Supabase service role + Firebase creds)
set -a && source .env.local && set +a

# Full repair: Firebase is source of truth — syncs content/history, dedupes, updates tasks
npm run repair:workspaces

# Dry run (no writes)
npm run repair:workspaces -- --dry-run

# First-time import only (skips rows that already have legacy_firebase_id)
npm run restore:firebase-workspaces -- --dry-run
npm run restore:firebase-workspaces
```

Prefer **`repair:workspaces`** for ongoing fixes; it updates existing Supabase rows from Firestore and merges duplicates.

## Troubleshooting empty lists in the app

1. **RLS** — the app uses the user JWT; migration scripts use the **service role** key. If lists are empty in the UI but rows exist in Supabase, check `profiles` and canvas `owner_id` / `user_id_legacy` match the signed-in user.
2. **Missing `profiles.uid`** — repair now falls back to **Firebase Auth** (`getUser`) → email → `profiles.email`.
3. **History missing** — re-run repair after deploying script changes so subcollection history is copied.
