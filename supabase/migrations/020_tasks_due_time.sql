-- App + restore script expect due_time (V3 tasks); safe if 012 already added it elsewhere
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_time TEXT;
