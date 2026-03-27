-- Idempotent Firebase → Supabase restores: store original Firestore document IDs
ALTER TABLE canvases ADD COLUMN IF NOT EXISTS legacy_firebase_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_canvases_legacy_firebase_id
  ON canvases (legacy_firebase_id)
  WHERE legacy_firebase_id IS NOT NULL;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS legacy_firebase_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_legacy_firebase_id
  ON tasks (legacy_firebase_id)
  WHERE legacy_firebase_id IS NOT NULL;
