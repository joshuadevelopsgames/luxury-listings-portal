-- ============================================================
-- LUXURY LISTINGS PORTAL V4 — Supabase Schema
-- ============================================================
-- Run this in Supabase SQL Editor to bootstrap the database.
-- Enable Row Level Security on all tables after creation.

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for search

-- ─────────────────────────────────────────────────────────────
-- PROFILES (extends Supabase auth.users)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE profiles (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name      TEXT,
  avatar_url     TEXT,
  role           TEXT NOT NULL DEFAULT 'team_member',
  -- roles: admin | director | manager | content_manager | graphic_designer | hr_manager | sales_manager | team_member
  department     TEXT,
  phone          TEXT,
  bio            TEXT,
  is_approved    BOOLEAN NOT NULL DEFAULT false,
  last_seen_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- CLIENTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE clients (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_number      SERIAL UNIQUE,
  name               TEXT NOT NULL,
  logo_url           TEXT,
  status             TEXT NOT NULL DEFAULT 'active',
  -- status: active | inactive | onboarding | churned
  health_status      TEXT NOT NULL DEFAULT 'monitor',
  -- health_status: healthy | monitor | at_risk
  health_score       INT,  -- 0-100 AI score
  account_manager_id UUID REFERENCES profiles(id),
  platform           TEXT DEFAULT 'instagram',
  posts_per_month    INT,
  instagram_handle   TEXT,
  facebook_page      TEXT,
  meta_access_token  TEXT, -- encrypted at rest
  notes              TEXT,
  onboarded_at       DATE,
  contract_start     DATE,
  contract_end       DATE,
  monthly_value      NUMERIC(10,2),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- CLIENT HEALTH SNAPSHOTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE client_health_snapshots (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id    UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  status       TEXT NOT NULL, -- healthy | monitor | at_risk
  score        INT,
  summary      TEXT,  -- AI-generated summary
  factors      JSONB, -- { engagement_rate, follower_growth, post_frequency, ... }
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON client_health_snapshots(client_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- TASKS (unified — aggregates content, CRM, manual)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE tasks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           TEXT NOT NULL,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'todo',
  -- status: todo | in_progress | done | cancelled
  priority        INT NOT NULL DEFAULT 2, -- 1=low, 2=normal, 3=high, 4=urgent
  source          TEXT NOT NULL DEFAULT 'task',
  -- source: task | content | crm | instagram | graphic | hr
  source_id       UUID,  -- FK to content_posts.id, deals.id, etc.
  client_id       UUID REFERENCES clients(id) ON DELETE SET NULL,
  assigned_to_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by_id   UUID REFERENCES profiles(id),
  due_date        DATE,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON tasks(assigned_to_id, status, due_date);

-- ─────────────────────────────────────────────────────────────
-- CONTENT CALENDAR
-- ─────────────────────────────────────────────────────────────
CREATE TABLE content_posts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  calendar_id     UUID,
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  created_by_id   UUID REFERENCES profiles(id),
  platform        TEXT NOT NULL DEFAULT 'instagram',
  -- platform: instagram | facebook | tiktok | linkedin | x | youtube
  post_type       TEXT DEFAULT 'image',
  -- post_type: image | video | reel | carousel | story
  caption         TEXT,
  hashtags        TEXT[],
  media_urls      TEXT[],
  scheduled_date  DATE NOT NULL,
  scheduled_time  TIME,
  status          TEXT NOT NULL DEFAULT 'draft',
  -- status: draft | pending_approval | approved | scheduled | published | failed
  approved_by_id  UUID REFERENCES profiles(id),
  approved_at     TIMESTAMPTZ,
  published_at    TIMESTAMPTZ,
  post_url        TEXT,
  ai_generated    BOOLEAN DEFAULT false,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON content_posts(client_id, scheduled_date);
CREATE INDEX ON content_posts(status, scheduled_date);

-- ─────────────────────────────────────────────────────────────
-- INSTAGRAM REPORTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE instagram_reports (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id           UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  created_by_id       UUID REFERENCES profiles(id),
  period_start        DATE NOT NULL,
  period_end          DATE NOT NULL,
  -- Core metrics
  followers_start     INT,
  followers_end       INT,
  follower_change     INT GENERATED ALWAYS AS (followers_end - followers_start) STORED,
  total_reach         INT,
  profile_views       INT,
  impressions         INT,
  likes               INT,
  comments            INT,
  shares              INT,
  saves               INT,
  engagement_rate     NUMERIC(5,2),
  -- Media
  screenshot_urls     TEXT[],
  -- Sharing
  public_link_id      TEXT UNIQUE DEFAULT substr(md5(random()::text), 1, 12),
  is_public           BOOLEAN DEFAULT false,
  archived            BOOLEAN DEFAULT false,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON instagram_reports(client_id, period_start DESC);

-- ─────────────────────────────────────────────────────────────
-- ENGAGEMENT EVENTS (real-time feed)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE engagement_events (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id    UUID REFERENCES clients(id) ON DELETE CASCADE,
  type         TEXT NOT NULL, -- like | comment | follow | share | mention
  actor_name   TEXT,
  actor_handle TEXT,
  post_url     TEXT,
  post_id      UUID REFERENCES content_posts(id) ON DELETE SET NULL,
  message      TEXT,
  occurred_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON engagement_events(client_id, occurred_at DESC);

-- ─────────────────────────────────────────────────────────────
-- LEADS & PIPELINE (CRM)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE leads (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                  TEXT NOT NULL,
  company               TEXT,
  email                 TEXT,
  phone                 TEXT,
  source                TEXT, -- website | referral | social | event | cold_outreach
  status                TEXT NOT NULL DEFAULT 'new',
  -- status: new | contacted | qualified | proposal | negotiation | won | lost | converted
  temperature           TEXT DEFAULT 'warm', -- hot | warm | cold
  score                 INT DEFAULT 50,
  owner_id              UUID REFERENCES profiles(id),
  converted_client_id   UUID REFERENCES clients(id),
  converted_at          TIMESTAMPTZ,
  notes                 TEXT,
  last_contact_at       TIMESTAMPTZ,
  next_follow_up_at     DATE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE deals (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id      UUID REFERENCES leads(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  value        NUMERIC(10,2),
  stage        TEXT NOT NULL DEFAULT 'qualification',
  -- stage: qualification | proposal | negotiation | closing | closed_won | closed_lost
  probability  INT DEFAULT 50,
  owner_id     UUID REFERENCES profiles(id),
  close_date   DATE,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON deals(stage, close_date);

-- ─────────────────────────────────────────────────────────────
-- GRAPHIC PROJECTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE graphic_projects (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id       UUID REFERENCES clients(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  type            TEXT, -- social_post | logo | banner | video | other
  status          TEXT NOT NULL DEFAULT 'requested',
  -- status: requested | in_progress | review | approved | delivered
  requested_by_id UUID REFERENCES profiles(id),
  assigned_to_id  UUID REFERENCES profiles(id),
  due_date        DATE,
  delivered_at    TIMESTAMPTZ,
  asset_urls      TEXT[],
  feedback        TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  -- type: task_due | health_alert | content_approval | engagement | crm | system
  title      TEXT NOT NULL,
  body       TEXT,
  link       TEXT,
  client_id  UUID REFERENCES clients(id) ON DELETE SET NULL,
  read       BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON notifications(user_id, read, created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- TIME OFF
-- ─────────────────────────────────────────────────────────────
CREATE TABLE time_off_requests (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL, -- vacation | sick | personal | unpaid
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  days        INT GENERATED ALWAYS AS (end_date - start_date + 1) STORED,
  status      TEXT NOT NULL DEFAULT 'pending', -- pending | approved | denied
  reason      TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────
ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients               ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_health_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_posts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_reports     ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE graphic_projects      ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_off_requests     ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all, update only their own
CREATE POLICY "Profiles readable by authenticated" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Profiles updatable by owner" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Notifications: users see only their own
CREATE POLICY "Notifications: own only" ON notifications FOR ALL TO authenticated USING (user_id = auth.uid());

-- Time off: users see own; admins see all (add admin check via role)
CREATE POLICY "Time off: own" ON time_off_requests FOR ALL TO authenticated USING (user_id = auth.uid());

-- Clients: all authenticated users can read; managers+ can write
CREATE POLICY "Clients: readable by authenticated" ON clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Clients: writable by managers" ON clients FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','director','manager'));

-- Content: readable by all; writable by content roles
CREATE POLICY "Content: readable by all" ON content_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Content: writable by content team" ON content_posts FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','director','manager','content_manager'));

-- Instagram reports: readable by all authenticated
CREATE POLICY "Instagram reports: readable" ON instagram_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "Instagram reports: writable" ON instagram_reports FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','director','manager','content_manager'));

-- Tasks: users see tasks assigned to or created by them
CREATE POLICY "Tasks: own and assigned" ON tasks FOR ALL TO authenticated
  USING (assigned_to_id = auth.uid() OR created_by_id = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','director','manager'));

-- Realtime: enable publications
ALTER PUBLICATION supabase_realtime ADD TABLE engagement_events;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE content_posts;
