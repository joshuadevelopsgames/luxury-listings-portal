-- Migrated Firebase tasks may have due_time only in meta (before column existed).
-- Copy to column and drop from meta so _mapTask meta spread does not shadow the column.
UPDATE tasks
SET
  due_time = NULLIF(trim(meta->>'due_time'), ''),
  meta = meta - 'due_time'
WHERE (due_time IS NULL OR trim(due_time) = '')
  AND meta ? 'due_time'
  AND NULLIF(trim(meta->>'due_time'), '') IS NOT NULL;
