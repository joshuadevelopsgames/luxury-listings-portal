# Blank Screen Troubleshooting

## Common Causes

### 1. Missing Environment Variables
If Firebase or Supabase environment variables are missing, the app might fail silently.

**Check:**
- Open browser console (F12)
- Look for errors about missing API keys
- Verify all `REACT_APP_*` variables are set in Vercel

### 2. JavaScript Errors
Check browser console for:
- Uncaught errors
- Failed imports
- Network errors

### 3. Loading State Stuck
The AuthContext might be stuck in loading state.

**Fix Applied:**
- Added loading fallback UI
- Added 10-second timeout safety
- Added error boundary

### 4. Build Issues
Check Vercel build logs:
- Go to Vercel Dashboard → Deployments
- Click on the failed deployment
- Check build logs for errors

### 5. Dev Mode Auto-Login Issues
If dev mode auto-login fails, it might cause blank screen.

**Check:**
- Browser console for "🔧 DEV MODE" messages
- Verify `VERCEL_ENV === 'preview'` or `REACT_APP_DEV_AUTO_LOGIN === 'true'`

## Debugging Steps

### Step 1: Check Browser Console
1. Open preview URL
2. Press F12 to open DevTools
3. Check Console tab for errors
4. Check Network tab for failed requests

### Step 2: Check Vercel Build Logs
1. Go to Vercel Dashboard
2. Click on latest deployment
3. Check build output for errors

### Step 3: Verify Environment Variables
In Vercel Dashboard → Settings → Environment Variables:
- ✅ `REACT_APP_SUPABASE_URL`
- ✅ `REACT_APP_SUPABASE_ANON_KEY`
- ✅ `REACT_APP_FIREBASE_API_KEY`
- ✅ All other Firebase variables

### Step 4: Test Local Build
```bash
npm run build
npm install -g serve
serve -s build
```

If local build works but Vercel doesn't, it's likely an environment variable issue.

## Quick Fixes Applied

1. ✅ Added ErrorBoundary to catch React errors
2. ✅ Added loading fallback UI (shows spinner instead of blank)
3. ✅ Added 10-second timeout safety
4. ✅ Better error handling in dev mode auto-login
5. ✅ Global error handlers in index.js

## Next Steps

If still seeing blank screen:

1. **Check browser console** - What errors do you see?
2. **Check Vercel build logs** - Did build succeed?
3. **Verify environment variables** - Are they set correctly?
4. **Test locally** - Does `npm start` work?

---

**Most Common Issue:** Missing environment variables in Vercel preview deployment.
