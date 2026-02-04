# Instagram Reports: 500, OpenAI Key, and CORS Errors

## What’s going on

1. **500 / “Incorrect API key provided”**  
   The **Cloud Function** `extractInstagramMetricsAI` uses the **OpenAI API key from Firebase (Secret Manager)**. That key is invalid (wrong, expired, or revoked). The function calls OpenAI, gets an error, then throws → you see 500 and the “Incorrect API key” message in the client.

2. **“Falling back to direct API call” then CORS**  
   When the Cloud Function fails, the **client** tries to call `api.openai.com` directly from the browser. That:
   - Exposes the API key in the browser (only use for local dev).
   - Fails with **CORS** because OpenAI’s API does not allow requests from `https://www.smmluxurylistings.info`; the browser blocks it.

3. **Cloud Vision “blocked by CORS”**  
   Next the app calls the **Cloud Function** `processInstagramScreenshots`. If that function throws (e.g. internal error), the **error response** sometimes doesn’t include CORS headers, so the browser reports “blocked by CORS” and you see `FirebaseError: internal`.

So: the **root cause** is the **invalid OpenAI key** in the Cloud Function. The CORS messages are mostly from error responses and from the insecure browser fallback.

## Fixes

### 1. Set a valid OpenAI API key (required)

The function reads the key from Firebase’s Secret Manager.

1. Create a **new API key** at https://platform.openai.com/account/api-keys (or fix the existing one).
2. Set it as a secret for your project:

   ```bash
   cd /path/to/smmluxurylistings
   firebase functions:secrets:set OPENAI_API_KEY
   ```
   When prompted, paste the new key.

3. **Redeploy** the function so it picks up the new secret:

   ```bash
   firebase deploy --only functions:extractInstagramMetricsAI
   ```

After this, the AI extraction path should work and you won’t hit the “fallback” or the OpenAI CORS error from the browser.

### 2. (Optional) Disable direct OpenAI fallback in production

So the key is never sent to the browser and users don’t see the confusing CORS/OpenAI error when the function fails.

In `src/services/openaiService.js`, the fallback to a direct API call can be disabled when the app is running on your production domain (see code change below). Then if the Cloud Function fails, the user gets a clear “AI extraction not available” style message instead of CORS/OpenAI errors.

### 3. If Cloud Vision still fails

If `processInstagramScreenshots` keeps returning “internal”:

- In **Google Cloud Console** → APIs & Services → enable **Cloud Vision API** for project `luxury-listings-portal-e56de`.
- Ensure the Cloud Function’s service account has permission to use Vision (e.g. “Cloud Vision API User” or project Editor).

---

**Summary:** Set a valid `OPENAI_API_KEY` in Firebase secrets and redeploy `extractInstagramMetricsAI`. Optionally disable the in-browser OpenAI fallback in production so you never send the key to the client and avoid CORS noise.
