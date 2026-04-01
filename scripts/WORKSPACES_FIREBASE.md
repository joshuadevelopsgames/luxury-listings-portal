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

## Block Comments

Firestore stores per-block comment threads in `canvases/{docId}/block_comments/{blockId}`. These are migrated to the `canvas_block_comments` Supabase table.

Block comments are now included automatically in both `repair:workspaces` and `restore:firebase-workspaces`. You can also run the migration standalone:

```bash
# Standalone block comments migration (canvases must already be in Supabase)
npm run migrate:block-comments
npm run migrate:block-comments -- --dry-run
```

The migration:
- Maps Firestore canvas doc IDs → Supabase canvas UUIDs via `legacy_firebase_id`
- Upserts into `canvas_block_comments` (unique on `canvas_id + block_id`)
- Merges comments/reactions if the row already exists (deduplicates by comment `id` and reaction `emoji+userId`)
- Skips blocks with no comments and no reactions

## Troubleshooting empty lists in the app

1. **RLS** — the app uses the user JWT; migration scripts use the **service role** key. If lists are empty in the UI but rows exist in Supabase, check `profiles` and canvas `owner_id` / `user_id_legacy` match the signed-in user.
2. **Missing `profiles.uid`** — repair now falls back to **Firebase Auth** (`getUser`) → email → `profiles.email`.
3. **History missing** — re-run repair after deploying script changes so subcollection history is copied.
