# Supabase Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click **"New Project"**
3. Fill in:
   - **Name:** `luxury-listings-portal`
   - **Database Password:** (save this securely!)
   - **Region:** Choose closest to your users
4. Wait ~2 minutes for project creation

### 2. Get API Credentials

1. In Supabase dashboard, go to **Settings** → **API**
2. Copy:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public key** (starts with `eyJ...`)

### 3. Add to Environment Variables

Add these lines to your `.env.local` file:

```env
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
```

**⚠️ Important:** Replace `your-project-id` and `your-anon-key-here` with your actual values!

### 4. Create Database Tables

1. In Supabase dashboard, go to **SQL Editor**
2. Click **"New Query"**
3. Copy and paste the entire contents of `supabase/migrations/001_create_content_calendar_tables.sql`
4. Click **"Run"** (or press Cmd/Ctrl + Enter)
5. You should see "Success. No rows returned"

### 5. Enable Real-time

1. Go to **Database** → **Replication**
2. Toggle ON for:
   - ✅ `content_items`
   - ✅ `calendars`

### 6. Test Connection

In your browser console (after starting the app), run:

```javascript
import { runSetupVerification } from './utils/supabaseSetup'
runSetupVerification()
```

Or test manually:

```javascript
import { supabase } from './services/supabaseService'

// Test connection
const { data, error } = await supabase.from('content_items').select('count').limit(1)
console.log('Connection test:', error ? 'Failed' : 'Success')
```

---

## ✅ Verification Checklist

- [ ] Supabase project created
- [ ] Environment variables added to `.env.local`
- [ ] SQL migration run successfully
- [ ] Real-time enabled for both tables
- [ ] Connection test passes

---

## 🐛 Troubleshooting

### "Invalid API key" error
- Check `.env.local` has correct values
- Make sure you copied the **anon/public** key, not the service role key
- Restart your dev server after adding env vars

### "relation does not exist" error
- Make sure you ran the SQL migration
- Check table names match exactly: `content_items` and `calendars`

### Real-time not working
- Verify replication is enabled in Database → Replication
- Check browser console for WebSocket errors
- Make sure you're using HTTPS (Supabase requires it)

### Connection timeout
- Check your internet connection
- Verify Supabase project is active (not paused)
- Check Supabase status page: status.supabase.com

---

## 📚 Next Steps

After setup is complete:

1. **Migrate Content Calendar** - Update `ContentCalendar.jsx` to use Supabase
2. **Test Migration** - Run `migrateFromLocalStorage()` for existing users
3. **Remove localStorage** - Clean up old localStorage code

See `docs/SUPABASE_SETUP.md` for detailed documentation.

---

## 🔗 Useful Links

- [Supabase Dashboard](https://app.supabase.com)
- [Supabase Docs](https://supabase.com/docs)
- [SQL Editor](https://app.supabase.com/project/_/sql)
- [API Settings](https://app.supabase.com/project/_/settings/api)

---

**Need Help?** Check the full setup guide: `docs/SUPABASE_SETUP.md`
