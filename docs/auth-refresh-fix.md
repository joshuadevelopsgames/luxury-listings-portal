# Auth Refresh / Timeout Fix

## Problem

After migrating from Firebase to Supabase, users experienced a persistent loading spinner after OAuth login. The app's 5-second safety timeout was firing consistently before authentication could complete, leaving users stuck on a blank screen.

## Root Cause Chain

The issue traced through several layers:

1. **Supabase Navigator LockManager** — The `@supabase/auth-js` library uses the browser's Navigator Locks API to coordinate auth sessions across tabs. After a page reload (especially one triggered by the app's `lazyRetry` chunk-failure detection calling `window.location.reload()`), these locks could get permanently stuck.

2. **AbortError on all auth operations** — With the lock stuck, every auth call (`getSession`, `setSession`, `onAuthStateChange`) would hang until the internal AbortController timed out (~10 seconds), then throw an `AbortError`.

3. **Safety timeout too short** — The app had a 5-second safety timeout that would fire before the lock timeout resolved, setting `loading: false` without a user — resulting in a redirect to login or an empty state.

4. **`onAuthStateChange` delay** — The app relied solely on Supabase's `onAuthStateChange` listener, which can be delayed by token refresh. There was no proactive session restore.

5. **OAuth hash tokens not processed** — After an OAuth redirect, Supabase puts `#access_token=...&refresh_token=...` in the URL hash. The app wasn't manually processing these as a fallback if the automatic detection failed.

6. **`ProtectedApp` loading condition** — The condition `(!currentUser && hashHasAuthTokens)` kept the spinner showing forever if the hash tokens were present but auth hadn't completed, creating a deadlock where the spinner waited for auth, but auth had already silently failed.

## Fixes Applied

### 1. Bypass Navigator LockManager (`src/lib/supabase.js`)

Added a custom `lock` option to the Supabase client config that bypasses the Navigator Lock entirely. Since this is a single-tab app, cross-tab session coordination isn't needed.

```js
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    lock: (name, acquireTimeout, fn) => fn(), // bypass Navigator Lock
  },
});
```

### 2. Proactive session restore (`src/contexts/AuthContext.supabase.js`)

Instead of waiting for `onAuthStateChange` (which can be delayed by token refresh), the auth context now calls `supabase.auth.getSession()` immediately on mount. This provides the session within milliseconds if one exists in storage.

Two helper functions handle edge cases:

- **`extractHashTokens()`** — Parses OAuth tokens from the URL hash (`#access_token=...&refresh_token=...`).
- **`setSessionFromHash()`** — Manually calls `supabase.auth.setSession()` with the extracted tokens as a fallback if `getSession()` returns no session but hash tokens are present.

The flow:

```
getSession() → session exists? → handleUserSignIn → done
           → no session, hash tokens? → setSessionFromHash() → handleUserSignIn → done
           → no session, no tokens → set loading=false (user is signed out)
```

If `getSession()` itself throws (e.g., from an AbortError), the catch block tries `setSessionFromHash()` as a final fallback.

### 3. Safety timeout with grace period

The safety timeout was increased from 5s to 10s, with a `signInInProgressRef` that grants a 4-second grace period when a sign-in is actively in progress. This prevents the timeout from firing during legitimate slow operations.

### 4. `ProtectedApp` loading condition fix (`src/App.jsx`)

The old condition created a deadlock:

```js
// OLD — kept spinner forever when hash tokens were present but auth failed
if (loading || (!currentUser && hashHasAuthTokens) || (!authHydrated && !currentUser))
```

The new condition trusts `authHydrated` as the definitive signal and proactively cleans stale hash tokens:

```js
// NEW — authHydrated is the source of truth
if (authHydrated && hashHasAuthTokens) {
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
}
if (loading || (!authHydrated && (!currentUser || hashHasAuthTokens))) {
  // show spinner
}
```

Once `authHydrated` is true, the app trusts that auth has fully resolved — either the user is signed in or they're not. Stale hash tokens in the URL are cleaned up so they don't trigger false loading states on subsequent renders.

## Files Modified

| File | Change |
|------|--------|
| `src/lib/supabase.js` | Added `lock` bypass in Supabase client config |
| `src/contexts/AuthContext.supabase.js` | Added proactive `getSession()` restore, hash token fallback, adjusted safety timeout |
| `src/App.jsx` | Fixed `ProtectedApp` loading condition to trust `authHydrated` |

## How to Verify

1. Sign out completely and clear the site's localStorage.
2. Click "Sign in with Google" — should complete within 1–2 seconds, no stuck spinner.
3. Once signed in, hard-refresh the page (Cmd+Shift+R) — should restore session instantly.
4. Open DevTools console — should see `[getSession] proactive restore` logs, no `AbortError` warnings.
