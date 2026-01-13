# Fixing 401 Errors on Vercel Preview

## Issue

Getting 401 errors when accessing `manifest.json` and other static files on Vercel preview deployments.

## Causes

1. **Vercel Preview Protection** - Preview deployments may have password protection enabled
2. **Rewrite Rules** - Static files being caught by SPA rewrite rules
3. **Build Configuration** - Static files not being included in build

## Solutions

### Solution 1: Disable Preview Protection (Recommended for Dev Branch)

1. Go to **Vercel Dashboard** → Your Project
2. **Settings** → **Deployment Protection**
3. Under **Preview Deployments**, disable password protection for `dev` branch
4. Or add your IP to allowed list

### Solution 2: Updated vercel.json (Already Applied)

The `vercel.json` has been updated to:
- Use `routes` instead of `rewrites` for better static file handling
- Explicitly handle `manifest.json` with correct headers
- Serve static assets (JS, CSS, images) directly
- Only route non-static files to `index.html`

### Solution 3: Check Build Output

Ensure `manifest.json` is in the `build` directory:

```bash
npm run build
ls -la build/manifest.json  # Should exist
```

### Solution 4: Verify File Permissions

The `manifest.json` file should be readable:
- File exists in `public/manifest.json`
- Gets copied to `build/manifest.json` during build
- Vercel serves it from `build/` directory

## Testing

After deploying, test:

```bash
# Should return 200, not 401
curl -I https://your-preview-url.vercel.app/manifest.json
```

Expected response:
```
HTTP/2 200
Content-Type: application/manifest+json
```

## Current Status

✅ Updated `vercel.json` with proper static file routing
✅ Added specific headers for `manifest.json`
✅ Static files should now be served correctly

**Next Step:** Check Vercel Dashboard → Deployment Protection settings

---

**Note:** The 401 error is likely due to Vercel Preview Protection. Disable it for the `dev` branch in Vercel settings.
