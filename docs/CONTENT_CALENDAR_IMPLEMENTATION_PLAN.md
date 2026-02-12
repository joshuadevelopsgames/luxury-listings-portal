# Content Calendar: Firestore, Multi-Media, Previews, Later-Style

Updated plan: content items use a **media array** (up to 15 photos/videos) with files stored in Firebase Storage; Firestore holds metadata and media references (URLs).

---

## 1. Media storage model (replaces single imageUrl/videoUrl)

**Per-post media:**
- **Firebase Storage:** Store uploaded files under a path like `content-calendar/{userId}/{contentItemId}/{index}_{originalName}` (or `content-calendar/{userId}/{tempId}/{index}_...` for new drafts before the item has an id). Each file is uploaded via `uploadBytes`; get `getDownloadURL` per file.
- **Firestore `content_items`:** Store a **`media`** array (max 15 items). Each element: `{ type: 'image' | 'video', url: string }`. Optionally add `storagePath` for deletion/orphan cleanup later.
- **Validation:** Enforce max 15 entries in `media` in the UI and in Firestore (or in a Cloud Function). Allow mixed image + video in one post (Instagram carousel supports both).

**Migration:** Existing items that have `imageUrl` or `videoUrl` can be normalized to `media: [{ type: 'image', url: imageUrl }]` or `[{ type: 'video', url: videoUrl }]` when loading or in a one-time migration.

---

## 2. Firestore schema and service layer

**Collections** (in [src/services/firestoreService.js](src/services/firestoreService.js)):
- `content_calendars`: `userEmail`, `name`, `description`, `color`, `createdAt`.
- `content_items`: `userEmail`, `calendarId`, `title`, `description`, `platform`, `contentType`, `scheduledDate` (ISO date string), `status`, `tags` (array), **`media`** (array of `{ type, url }`), `createdAt`. No `imageUrl`/`videoUrl`.

**FirestoreService methods:** Same as before (getContentCalendars, getContentItems, getContentItem, create/update/delete for calendars and items). When saving an item, persist `media` as-is; when reading, normalize legacy `imageUrl`/`videoUrl` into `media` if present.

**Index:** `content_items`: `userEmail` (ASC), `scheduledDate` (ASC) in [firestore.indexes.json](firestore.indexes.json).

---

## 3. ContentCalendar page: multi-media upload and Firestore

**Post form state:** Replace `imageUrl` and `videoUrl` with `media: []` (array of `{ type, url }`). Max 15 items.

**Upload flow:**
- **Add files:** Multi-file input and/or drag-and-drop that accepts images and videos (e.g. `image/*`, `video/*`). For each file (until `media.length` is 15): upload to Storage at `content-calendar/{uid}/{contentItemId || 'draft-' + Date.now()}/{index}_{sanitizedFileName}`; on success append `{ type: file.type.startsWith('video') ? 'video' : 'image', url }` to form `media`.
- **Reorder/remove:** Allow reordering (e.g. drag-and-drop) and remove single entry from `media`; optionally delete the file from Storage when removing (or leave for orphan cleanup job later).
- **Draft before save:** For new posts, use a client-generated temp id (e.g. `draft-${Date.now()}`) for the Storage path so uploads can happen before the Firestore doc exists; when creating the doc, use the returned doc id and optionally copy/move files to a path with the real id (or keep draft path for simplicity).

**Load/Save:** Same as in the original plan: load calendars and items from Firestore; save create/update/delete via firestoreService. Persist `media` array; no more `imageUrl`/`videoUrl` in the saved shape.

**Migration from localStorage:** When migrating old items, map `imageUrl`/`videoUrl` to `media: [{ type: 'image', url: imageUrl }]` or video equivalent (and omit if empty).

---

## 4. Post preview components

**PostPreviewCard** receives an item (or shape) that includes **`media`** (array). For each platform:
- **Instagram:** Show first media as main; if multiple, show carousel dots or swipeable area (or small thumbnails) and one main image/video at a time. Caption and hashtags below.
- **Facebook:** Same idea: primary media + indicator for more (e.g. "1/5").
- **TikTok:** Typically single video; if multiple, show first or a simple strip.

Use `media[0].url` for the primary asset; `media.length > 1` to show carousel/indicators. Support both image and video in the preview (video: `<video src={url} />` with muted/loop for autoplay in preview).

---

## 5. Post-due view and routing

Unchanged from original plan: route e.g. `content-calendar/post-due/:id`, load item by id, show:
- **Preview:** PostPreviewCard with full `media` array (carousel if multiple).
- **Caption:** Copy-to-clipboard.
- **Open in [Instagram|Facebook|TikTok]:** Link to app/site. User manually uploads media and pastes caption (Instagram doesn’t allow pre-filled composer).

If the post has multiple media, show them in order (carousel or grid) so the user can download/re-upload in the same order.

---

## 6. Later-style reminder (scheduled function)

Unchanged: scheduled Cloud Function runs (e.g. every 15 minutes or daily), computes Vancouver today as `YYYY-MM-DD`, queries `content_items` where `scheduledDate == today` and `status == 'scheduled'`, creates notification with `link: '/content-calendar/post-due/' + id`. Optionally set `reminderSent: true` on the item.

---

## 7. Firestore rules and Storage rules

- **Firestore:** `content_calendars` and `content_items` readable/writable only when `request.auth.token.email` matches doc `userEmail`.
- **Storage:** Ensure `content-calendar/{userId}/**` is writable by the authenticated user (and readable for their uploads). Existing [storage.rules](storage.rules) may already allow this; verify path and auth.

---

## 8. Implementation order

1. **Firestore schema and service:** Add collections, CRUD, `media` array; index; migration helper that maps old `imageUrl`/`videoUrl` to `media`.
2. **ContentCalendar:** Switch to `media` array in form state; implement multi-file upload (max 15) to Storage and append to `media`; save/load from Firestore; remove localStorage; run migration for existing users.
3. **Post preview:** PostPreviewCard with `media` (carousel for multiple); integrate in add/edit modal.
4. **Post-due route and view:** New page/route; load item; show preview (with media carousel), copy caption, open app link.
5. **Scheduled function and rules:** Cron for due posts, create notification; Firestore and Storage rules.

---

## 9. Files to add or touch (summary)

| Action | File |
|--------|------|
| Add collections + CRUD + migration (media array) | [src/services/firestoreService.js](src/services/firestoreService.js) |
| Add index | [firestore.indexes.json](firestore.indexes.json) |
| Multi-media form, upload to Storage, Firestore load/save | [src/pages/ContentCalendar.jsx](src/pages/ContentCalendar.jsx) |
| New | `src/components/content/PostPreviewCard.jsx` (media array, carousel) |
| New | `src/pages/ContentCalendarPostDue.jsx` |
| Add route | [src/App.jsx](src/App.jsx) |
| Scheduled function | [functions/index.js](functions/index.js) |
| Rules | [firestore.rules](firestore.rules), [storage.rules](storage.rules) |
