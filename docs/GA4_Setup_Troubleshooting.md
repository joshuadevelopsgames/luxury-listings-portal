## Google Analytics (GA4) Setup and Troubleshooting

This guide documents the working GA4 configuration, common pitfalls we hit, and the exact fixes that got real data flowing.

### Prerequisites
- GA4 Property ID: numeric only (example: `501624524`) — do NOT prefix with `G-`
- Service Account JSON (downloaded from Google Cloud → IAM → Service Accounts → Keys)
- Grant the Service Account email Viewer access in GA: Admin → Property access management → Add user → `<service_account>@<project>.iam.gserviceaccount.com` → Role: Viewer
- Enable the Google Analytics Data API in Google Cloud for your project

### App Setup Flow
1. Open the app → Analytics → “Setup GA” (route: `/setup-ga`).
2. Paste the numeric Property ID and the full Service Account JSON.
3. Validate & Save — the app generates a JWT, exchanges it for an access token, and runs real GA4 queries.

### Fixes We Implemented

#### 1) Route for Setup GA
- Added a protected route so the button doesn’t lead to a blank page:
  - Import `GoogleAnalyticsSetup` and add route: `/setup-ga` in `src/App.jsx`.

#### 2) Real auth (no mock token)
- The setup page now generates a real OAuth access token from the Service Account JSON:
  - `src/components/GoogleAnalyticsSetup.jsx` calls `analyticsService.generateAccessToken(credentials)` and uses the returned token for API calls.

#### 3) GA4-safe metrics and dimensions
Some UA-era metrics/dimensions are invalid in GA4. We replaced them with valid alternatives:

- Invalid: `returningUsers` (metric)
  - Fix: Compute Returning Users = `totalUsers - newUsers` in `getOverviewMetrics`

- Invalid: `uniquePageviews` (metric)
  - Fix: Use `screenPageViews` and `totalUsers`; also use `userEngagementDuration` and compute average time per page: `engagementDuration / screenPageViews`

- Invalid: `sessionCount` (dimension)
  - Fix: Removed. We no longer query by `sessionCount`.

Files updated:
- `src/services/analyticsService.js`
  - `getOverviewMetrics`: single request for `totalUsers`, `newUsers`, `sessions`, `screenPageViews`, `bounceRate`, `averageSessionDuration`; compute `returningUsers = totalUsers - newUsers`.
  - `getTopPages`: request `pageTitle` with metrics `screenPageViews`, `totalUsers`, `userEngagementDuration`; compute average time per page.
- `src/components/GoogleAnalyticsSetup.jsx`
  - Use real `generateAccessToken` with Service Account JSON; removed mock token usage.
- `src/App.jsx`
  - Added `/setup-ga` route.

### Remote Config: System Uptime (Admin Dashboard)
- We now source uptime from Firebase Remote Config (parameter: `systemUptime`).
- Edit in Firebase Console → Remote Config → Add parameter `systemUptime` (e.g., `99.97%`).
- The admin WelcomeCard and stats use this live value; fallback remains `99.9%`.

### Quick Validation Checklist
- Property ID is numeric (no `G-` prefix).
- Service Account JSON is pasted exactly as downloaded.
- Service Account email has GA Property Viewer access.
- GA Data API enabled in Google Cloud project.
- Analytics page loads without 400/401 errors; trends/top pages show data.

### Common 400 Errors and Resolutions
- "Field returningUsers is not a valid metric" → Use `totalUsers - newUsers` instead.
- "Field uniquePageviews is not a valid metric" → Use `screenPageViews` and `totalUsers`; for time, use `userEngagementDuration`.
- "Field sessionCount is not a valid dimension" → Remove; do not query by `sessionCount`.

### Notes
- If you rotate keys, re-paste the new Service Account JSON and re-validate.
- If auth fails with 401, confirm GA access for the Service Account and that the token is generated (Setup GA page).




