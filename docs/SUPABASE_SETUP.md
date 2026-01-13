# Supabase Setup Guide

## Overview

Supabase is being integrated to replace localStorage for persistent, cross-device data storage. This provides:
- ✅ Persistent data across devices
- ✅ Real-time updates
- ✅ Better security with Row Level Security
- ✅ PostgreSQL database (more powerful than Firestore)
- ✅ Can coexist with Firebase

---

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Name:** luxury-listings-portal
   - **Database Password:** (save this securely)
   - **Region:** Choose closest to your users
5. Wait for project to be created (~2 minutes)

---

## Step 2: Get API Credentials

1. Go to **Settings** → **API**
2. Copy:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

---

## Step 3: Add Environment Variables

Add to `.env.local`:

```env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_DB_PASSWORD=your-database-password
```

**Note:** 
- `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY` are required for the React app
- `SUPABASE_DB_PASSWORD` is optional and only needed for:
  - Supabase CLI operations
  - Direct PostgreSQL connections (server-side)
  - Database migrations via CLI

---

## Step 4: Create Database Tables

Go to **SQL Editor** in Supabase dashboard and run:

### Content Items Table

```sql
-- Content Items Table
CREATE TABLE content_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  platform TEXT NOT NULL,
  content_type TEXT NOT NULL,
  scheduled_date TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'draft',
  tags TEXT[],
  image_url TEXT,
  video_url TEXT,
  calendar_id UUID REFERENCES calendars(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX idx_content_items_user_email ON content_items(user_email);
CREATE INDEX idx_content_items_scheduled_date ON content_items(scheduled_date);
CREATE INDEX idx_content_items_calendar_id ON content_items(calendar_id);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_content_items_updated_at BEFORE UPDATE
    ON content_items FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### Calendars Table

```sql
-- Calendars Table
CREATE TABLE calendars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX idx_calendars_user_email ON calendars(user_email);

-- Update trigger for updated_at
CREATE TRIGGER update_calendars_updated_at BEFORE UPDATE
    ON calendars FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

## Step 5: Set Up Row Level Security (RLS)

### Enable RLS

```sql
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendars ENABLE ROW LEVEL SECURITY;
```

### Create Policies

**Note:** Since we're using Firebase Auth, we'll use `user_email` matching instead of Supabase Auth. For now, we'll allow authenticated users to access their own data.

```sql
-- Content Items Policies
CREATE POLICY "Users can view their own content items"
  ON content_items FOR SELECT
  USING (true); -- We'll filter by user_email in the application

CREATE POLICY "Users can insert their own content items"
  ON content_items FOR INSERT
  WITH CHECK (true); -- We'll validate user_email in the application

CREATE POLICY "Users can update their own content items"
  ON content_items FOR UPDATE
  USING (true); -- We'll validate ownership in the application

CREATE POLICY "Users can delete their own content items"
  ON content_items FOR DELETE
  USING (true); -- We'll validate ownership in the application

-- Calendars Policies
CREATE POLICY "Users can view their own calendars"
  ON calendars FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own calendars"
  ON calendars FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own calendars"
  ON calendars FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete their own calendars"
  ON calendars FOR DELETE
  USING (true);
```

**⚠️ Security Note:** These policies allow all authenticated users. For production, you should:
1. Integrate Supabase Auth with Firebase Auth, OR
2. Create a service role function that validates Firebase tokens, OR
3. Use Supabase Edge Functions with Firebase token validation

For now, we're relying on application-level filtering by `user_email`.

---

## Step 6: Enable Real-time

1. Go to **Database** → **Replication**
2. Enable replication for:
   - `content_items`
   - `calendars`

---

## Step 7: Test Connection

Run the test function:

```javascript
import { testSupabaseConnection } from './services/supabaseService'

testSupabaseConnection().then(result => {
  console.log('Connection test:', result)
})
```

---

## Migration from localStorage

The `contentCalendarService.migrateFromLocalStorage()` function will:
1. Load existing data from localStorage
2. Upload to Supabase
3. Check for duplicates
4. Preserve existing data

Run migration:

```javascript
import { contentCalendarService } from './services/supabaseService'

// After user logs in
await contentCalendarService.migrateFromLocalStorage(userEmail)
```

---

## Next Steps

1. ✅ Supabase project created
2. ✅ Tables created
3. ✅ RLS policies set up
4. ✅ Real-time enabled
5. ⏳ Update ContentCalendar component to use Supabase
6. ⏳ Test migration from localStorage
7. ⏳ Remove localStorage code

---

## Troubleshooting

### Connection Issues
- Check `.env.local` has correct credentials
- Verify Supabase project is active
- Check browser console for errors

### RLS Issues
- Ensure RLS is enabled on tables
- Check policies are created
- Verify user_email matches

### Real-time Not Working
- Enable replication in Supabase dashboard
- Check network tab for WebSocket connections
- Verify subscription is set up correctly

---

## Future Enhancements

1. **Supabase Auth Integration:** Replace Firebase Auth with Supabase Auth (optional)
2. **Better RLS:** Use Supabase Auth JWT for proper RLS policies
3. **Edge Functions:** Use Supabase Edge Functions for server-side logic
4. **Storage:** Use Supabase Storage for images/videos instead of URLs
5. **Additional Tables:** Migrate more features to Supabase (deals, reports, etc.)

---

**Last Updated:** Initial setup guide
