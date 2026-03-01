# Instagram / Meta integration – benefits and options

## Current state

- **Meta OAuth**: Implemented. `metaService.js` (Graph API v18), `userMetaConnections.js` (Firestore per-user tokens), `MetaCallback.jsx` (OAuth callback), `MetaConnectionModal.jsx` (connect UI). Connection requires **Facebook Page + linked Instagram Business account**.
- **Stored per user**: `accessToken`, `instagramBusinessAccountId`, `facebookPageId`, `instagramUsername`, `facebookPageName`. `MetaConnectionModal` is not currently referenced by any page; connection flow exists but may need to be wired (e.g. from Content Calendar or Settings).
- **metaService** already implements (but not wired to per-user connection in UI):
  - `getInstagramAccountInfo()` → followers_count, media_count
  - `getInstagramInsights(metric)` → impressions, reach, profile_views (needs `instagram_manage_insights` scope)
  - `getInstagramPosts()` → media with like_count, comments_count
  - `postToInstagram()`, `scheduleInstagramPost()`, `postToFacebook()`, `scheduleFacebookPost()`
- **Instagram Reports**: Screenshot upload → OCR/AI extraction → Firestore. No Meta API usage. Reports are per **client**; clients have an `instagram` handle field.

---

## Ways to benefit

| Area | Benefit | How |
|------|--------|-----|
| **Instagram Reports** | Replace or augment manual screenshots with real metrics | For reports tied to a connected IG account, call Graph API **Insights** (account + media) and optionally media list; pre-fill or replace OCR metrics. |
| **Content Calendar** | Publish/schedule to IG/FB from app | Use stored connection + `metaService.postToInstagram()` / `scheduleInstagramPost()` when user chooses Instagram and has connected. |
| **Reporting / dashboards** | Follower growth, engagement, top posts | Use `getInstagramAccountInfo` + `getInstagramInsights` + `getInstagramPosts` (with like/comment counts) for connected accounts. |
| **CRM / clients** | Link client to IG performance | Store optional link “client ↔ connected IG account” (or match by handle); show live follower/engagement in client view. |
| **Posting packages** | Verify or count posts per platform | Use Media API to count posts in date range; optionally reconcile with “posts used” for packages. |

---

## Implementation options

### 1. Use existing Graph API (Facebook Login + FB Page)

- **What**: Keep current flow (FB Login → Page → IG Business). Add usage of stored connection everywhere you need API calls.
- **Scopes**: Add `instagram_manage_insights` for Insights. Current: `instagram_basic`, `instagram_content_publish`, `pages_manage_posts`, `pages_read_engagement`. Consider `pages_read_engagement` for Page insights.
- **Token**: Short-lived token from OAuth is ~1–2 hours. Exchange for **long-lived** (≈60 days) on callback and store; optionally implement refresh before expiry. Meta docs: exchange with `client_secret` and `grant_type=fb_exchange_token`.
- **Where to wire**:
  - **Reports**: In Instagram Reports, add “Import from Instagram” for the current user’s connected account (or for a client linked to a connection). Call `userMetaConnections.getValidConnection(userEmail)`, then `metaService` with that token/IG ID (metaService must accept token/ID per call; today it uses instance state).
  - **Calendar**: Where user chooses “Post to Instagram”, if connected, show “Publish” / “Schedule” using `postToInstagram` / `scheduleInstagramPost` with the user’s connection.

### 2. Instagram API with Instagram Login (no FB Page)

- **What**: “Business Login for Instagram” – professional accounts connect with Instagram only (no Facebook Page).
- **Use when**: Clients/creators don’t have or don’t want to use a FB Page.
- **Caveat**: Newer; scope names differ (e.g. `instagram_business_basic`, `instagram_business_content_publish`). Some legacy scopes deprecated Jan 2025; use current docs.
- **Implementation**: Second OAuth flow (different endpoint/scopes); store in same or separate “connection” doc (e.g. `connectionType: 'instagram_login'`). Same app can offer both “Connect with Facebook” and “Connect with Instagram only”.

### 3. Backend proxy for token and API calls

- **What**: Never send long-lived token to the client. Backend (e.g. Firebase Cloud Functions) stores/refreshes token and calls Graph API; frontend calls your API.
- **Benefit**: Safer (client_secret and tokens only on server), easier to add refresh and rate limiting.
- **Effort**: Move token exchange and refresh to Cloud Function; add endpoints like `GET /api/instagram/insights`, `POST /api/instagram/publish` that use the user’s stored connection.

### 4. Instagram Reports: API vs screenshot

- **Option A – API-first for connected accounts**: When creating a report, if the client (or current user) has a connected IG account, “Import from Instagram” fetches insights + media and creates the report; no screenshots. Fallback to screenshot/OCR for unconnected or when API fails.
- **Option B – Hybrid**: User uploads screenshots as today; optionally “Refresh metrics from Instagram” for connected accounts to overwrite or fill gaps.
- **Option C – Screenshot-only**: Keep current flow; use API only for separate “Live analytics” or dashboard, not inside the report creation flow.

---

## API details (Graph API)

- **Account insights**: `GET /{ig-user-id}/insights` with `metric=impressions,reach,profile_views,follower_count` and `period=day|week|days_28`. Some metrics 24–48h delay; follower_count often same-day.
- **Media insights**: `GET /{ig-media-id}/insights` (per post/story/reel) for engagement, reach, etc.
- **Media list**: `GET /{ig-user-id}/media?fields=id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count` then insights per media if needed.
- **Limits**: ~200 req/hour; historical data often up to 90 days; demographics need ~100+ followers.

---

## Recommended order

1. **Wire existing connection**: Ensure `MetaConnectionModal` is reachable (e.g. Content Calendar or Settings), and implement **long-lived token** exchange + storage on callback.
2. **Make metaService connection-aware**: Add methods that accept `(accessToken, instagramBusinessAccountId)` (and optionally `facebookPageId`) so callers pass the user’s connection instead of relying on instance state.
3. **Instagram Reports – “Import from Instagram”**: For a report linked to a connected account, call Insights + media and create or update report; keep screenshot/OCR as fallback.
4. **Content Calendar – publish**: Add “Publish to Instagram” / “Schedule” using the user’s connection when they have one.
5. **Optional**: Add Instagram Login (no FB) path, then backend proxy for tokens and API.

---

## References

- [Instagram Platform overview](https://developers.facebook.com/docs/instagram-platform/overview/)
- [Instagram APIs](https://developers.facebook.com/products/instagram/apis)
- [Instagram Insights](https://developers.facebook.com/docs/instagram-api/guides/insights)
- [Business Login for Instagram](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login/) (no FB Page)
- [Migration / scope deprecation](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/migration-guide/) (e.g. Jan 2025)
