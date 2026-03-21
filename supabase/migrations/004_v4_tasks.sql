-- ============================================================
-- V4 MIGRATION 004: Unified Tasks
-- Aggregates tasks from all sources: content, CRM, manual, HR
-- ============================================================

CREATE TABLE IF NOT EXISTS tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'todo',
  priority        INT NOT NULL DEFAULT 2,
  source          TEXT NOT NULL DEFAULT 'task',
  source_id       UUID,
  client_id       UUID REFERENCES clients(id) ON DELETE SET NULL,
  assigned_to_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  due_date        DATE,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assigned_to_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_client ON tasks(client_id, due_date);

-- RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_own_and_assigned" ON tasks FOR ALL TO authenticated
  USING (
    assigned_to_id = auth.uid()
    OR created_by_id = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','director','manager')
  );

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
