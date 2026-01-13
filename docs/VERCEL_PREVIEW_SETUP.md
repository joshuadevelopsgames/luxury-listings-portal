# Vercel Preview Deployment Setup

## Overview

The `dev` branch is configured to deploy as a preview deployment on Vercel. This allows for:
- Testing changes before merging to main
- Auto-login for development (jrsschroeder@gmail.com)
- Separate environment from production

---

## Environment Variables for Preview Deployments

### Required Variables

Add these to **Vercel Dashboard → Project Settings → Environment Variables**:

#### For Preview Deployments (dev branch):

```env
# Supabase
REACT_APP_SUPABASE_URL=https://uzyavlkadkapsbmnnsvq.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key

# Dev Mode Auto-Login (optional - enables auto-login in preview)
REACT_APP_DEV_AUTO_LOGIN=true

# Firebase (same as production)
REACT_APP_FIREBASE_API_KEY=...
REACT_APP_FIREBASE_AUTH_DOMAIN=...
# ... other Firebase vars
```

#### For Production (main branch):

```env
# Same variables but WITHOUT REACT_APP_DEV_AUTO_LOGIN
# (or set it to 'false')
```

---

## How Auto-Login Works

The app automatically detects if it's running in:
1. **Local development** (`NODE_ENV === 'development'`)
2. **Vercel preview** (`VERCEL_ENV === 'preview'`)
3. **Explicit dev mode** (`REACT_APP_DEV_AUTO_LOGIN === 'true'`)

If any of these are true, it will:
- Auto-login as `jrsschroeder@gmail.com`
- Grant admin access
- Skip the login page

---

## Setting Up Vercel Preview

### 1. Connect GitHub Branch

Vercel automatically creates preview deployments for:
- Pull requests
- Pushes to `dev` branch (if configured)

### 2. Configure Environment Variables

1. Go to **Vercel Dashboard** → Your Project
2. **Settings** → **Environment Variables**
3. Add variables for **Preview** environment:
   - `REACT_APP_SUPABASE_URL`
   - `REACT_APP_SUPABASE_ANON_KEY`
   - `REACT_APP_DEV_AUTO_LOGIN=true` (optional)
   - All Firebase variables

### 3. Branch Configuration

Vercel will automatically:
- Deploy `main` branch → Production
- Deploy `dev` branch → Preview (with dev auto-login)
- Deploy PR branches → Preview

---

## Testing Preview Deployment

1. Push to `dev` branch:
   ```bash
   git push origin dev
   ```

2. Vercel will automatically:
   - Build the preview
   - Deploy to a preview URL
   - Send you a notification

3. Visit the preview URL
   - You should be auto-logged in as `jrsschroeder@gmail.com`
   - No login required!

---

## Disabling Auto-Login

To disable auto-login in preview:
- Remove `REACT_APP_DEV_AUTO_LOGIN` environment variable, OR
- Set `REACT_APP_DEV_AUTO_LOGIN=false` in Vercel

---

## Production vs Preview

| Feature | Production (main) | Preview (dev) |
|---------|------------------|---------------|
| Auto-login | ❌ No | ✅ Yes (if enabled) |
| Environment | Production | Preview |
| URL | `smmluxurylistings.info` | `*.vercel.app` |
| Branch | `main` | `dev` |

---

**Note:** Auto-login only works in preview/development, never in production (`main` branch).
