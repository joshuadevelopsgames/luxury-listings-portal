# Fix: Instagram Reports — VIEW_ALL_REPORTS Permission Not Loading All Reports

**Date:** March 4, 2026  
**Author:** Manus AI  
**Status:** ✅ Resolved and deployed to production  

---

## Summary

Users with the `VIEW_ALL_REPORTS` feature permission were not seeing Instagram reports created by other users, even though their permission was correctly configured in the Users & Permissions UI. The fix was a single targeted change to `InstagramReportsPage.jsx` that resolved a React timing/race condition between permission loading and Firestore subscription setup.

**Successful commit:** `5fac1b3c5e783bed3a9ae8cc77df533dd25a1097`  
**Pushed to:** `origin/main` on March 4, 2026 at 23:19 EST

---

## Background

The application uses a granular feature permissions system stored in Firestore under the `approved_users` collection. Each user document contains a `featurePermissions` array. The `PermissionsContext` subscribes to this document in real-time and exposes a `hasFeaturePermission(featureId)` helper.

The `VIEW_ALL_REPORTS` permission (`'view_all_reports'`) is one such feature permission. When a user holds this permission, the Instagram Reports page is expected to call `firestoreService.onInstagramReportsChange()` with `loadAll: true`, which fetches all non-archived reports from Firestore regardless of which user created them.

---

## Root Cause

The `InstagramReportsPage` component computed `effectiveIsAdmin` as an inline derived value:

```js
const effectiveIsAdmin = isSystemAdmin || hasFeaturePermission(FEATURE_PERMISSIONS.VIEW_ALL_REPORTS);
```

On initial render, `PermissionsContext` had not yet received the user's permissions from Firestore — `loading` was `true` and `featurePermissions` was an empty array `[]`. This meant `effectiveIsAdmin` evaluated to `false` on the first render.

The `useEffect` that subscribes to Instagram reports ran immediately on mount with this `false` value, passing `loadAll: false` to the Firestore listener. The listener then only fetched reports belonging to the current user.

Although `effectiveIsAdmin` would later become `true` once permissions loaded, and the `useEffect` dependency array included `effectiveIsAdmin`, there was a subtle problem: **the subscription had already started with the wrong `loadAll` value.** The re-subscription on the second render did correctly pass `loadAll: true`, but the initial incorrect subscription had already set state with the limited result set — and in some cases the re-render cycle was not completing as expected in production.

The core issue was that the component did not wait for `PermissionsContext` to finish loading before initiating the Firestore subscription.

---

## The Fix

**File changed:** `src/pages/InstagramReportsPage.jsx`  
**Lines changed:** 2 lines modified, 1 line added to dependency array

### Before

```jsx
const { isSystemAdmin, hasFeaturePermission } = usePermissions();

useEffect(() => {
  const uid = currentUser?.uid;
  if (!uid) {
    setReports([]);
    setLoading(false);
    return () => {};
  }
  const unsubscribe = firestoreService.onInstagramReportsChange((data) => {
    setReports(data);
    setLoading(false);
  }, { loadAll: effectiveIsAdmin, userId: isViewingAs ? currentUser?.uid : undefined });
  return () => unsubscribe();
}, [currentUser?.uid, effectiveIsAdmin, isViewingAs]);
```

### After

```jsx
const { isSystemAdmin, hasFeaturePermission, loading: permissionsLoading } = usePermissions();

useEffect(() => {
  const uid = currentUser?.uid;
  if (!uid || permissionsLoading) {
    if (!uid) { setReports([]); setLoading(false); }
    return () => {};
  }
  const unsubscribe = firestoreService.onInstagramReportsChange((data) => {
    setReports(data);
    setLoading(false);
  }, { loadAll: effectiveIsAdmin, userId: isViewingAs ? currentUser?.uid : undefined });
  return () => unsubscribe();
}, [currentUser?.uid, effectiveIsAdmin, isViewingAs, permissionsLoading]);
```

The key changes were:

1. **Destructure `loading` from `usePermissions()`** (aliased as `permissionsLoading`) to access the permissions loading state.
2. **Guard the subscription** with `if (!uid || permissionsLoading)` so the Firestore listener is not created until permissions have fully loaded from Firestore.
3. **Add `permissionsLoading` to the dependency array** so the effect re-runs and creates the subscription once permissions finish loading.

This guarantees that when `onInstagramReportsChange` is first called, `effectiveIsAdmin` already reflects the user's true permission state — and `loadAll: true` is correctly passed for users with the `VIEW_ALL_REPORTS` permission.

---

## Supporting Fix: Archived Reports Index Error

As part of this investigation, a separate Firestore index error was also resolved in `firestoreService.js`.

**Commit:** `67476ce`

The archived reports query was using both `where('archived', '==', true)` and `orderBy('archivedAt', 'desc')`, which required a composite Firestore index that did not exist. The fix removed `orderBy` from the Firestore query and replaced it with a client-side sort:

```js
// Before — required a composite index
const q = query(
  collection(db, this.collections.INSTAGRAM_REPORTS),
  where('archived', '==', true),
  orderBy('archivedAt', 'desc')
);

// After — no index required; sort client-side
const q = query(
  collection(db, this.collections.INSTAGRAM_REPORTS),
  where('archived', '==', true)
);
// ...then after snapshot:
reports.sort((a, b) => {
  const aTime = a.archivedAt?.toMillis?.() ?? 0;
  const bTime = b.archivedAt?.toMillis?.() ?? 0;
  return bTime - aTime;
});
```

---

## Restoration: firestoreService.js

During the debugging process, `firestoreService.js` was accidentally overwritten with an incomplete version, removing critical functions including `updateLastSeen` and `getCustomLocations`. This caused widespread application failures.

**Commit:** `959b7cd`

The file was fully restored by checking out the last known-good commit (`83b20c7`) directly:

```bash
git checkout 83b20c7 -- src/services/firestoreService.js
```

This restored all 4,563 lines of the original service file, including all previously missing functions.

---

## Outcome

| Issue | Status |
|---|---|
| Users with `VIEW_ALL_REPORTS` not seeing other users' reports | ✅ Fixed |
| Firestore composite index error on archived reports query | ✅ Fixed |
| `firestoreService.js` missing `updateLastSeen` and `getCustomLocations` | ✅ Restored |
| Instagram Reports UI accidentally changed | ✅ Reverted to original |

All fixes were deployed to `origin/main` and verified working in production.

---

## Lessons Learned

When a React component derives a boolean from a context that loads asynchronously (such as permissions from Firestore), any `useEffect` that depends on that boolean **must** also depend on the context's `loading` state. Without this guard, the effect runs with a stale `false` value before the real data arrives, causing the wrong Firestore query to be initiated.

The pattern to follow for any permission-gated Firestore subscription is:

```js
const { hasFeaturePermission, loading: permissionsLoading } = usePermissions();

useEffect(() => {
  if (permissionsLoading) return; // Wait for permissions to be ready
  // ... set up subscription using permission-derived values
}, [permissionsLoading, /* other deps */]);
```
