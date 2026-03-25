# V4 Cloud Functions → Supabase Edge Functions

## Overview

All Firebase Cloud Functions have been ported to Supabase Edge Functions (Deno/TypeScript).
V4 no longer needs Firebase auth to call AI functions.

| Firebase Function | Supabase Edge Function | Status |
|---|---|---|
| `extractInstagramMetricsAI` | `extract-instagram-metrics` | ✅ Ported |
| `generateCaption` | `generate-caption` | ✅ Ported |
| `generateReportSummary` | `generate-report-summary` | ✅ Ported |
| `runBulkHealthPrediction` | `run-health-check` | ✅ Ported |
| `canvasAssist` | `canvas-assist` | ✅ Ported |
| `processInstagramScreenshots` | use `extract-instagram-metrics` | ✅ Consolidated |
| Email notifications | Supabase triggers + pg_net | 🔜 Planned |
| Slack integration | Supabase function + webhook | 🔜 Planned |
| Scheduled reminders | Supabase pg_cron | 🔜 Planned |

## Deployment

### Prerequisites

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

### Set secrets

```bash
supabase secrets set OPENROUTER_API_KEY=sk-or-...
supabase secrets set OPENAI_API_KEY=sk-...
```

### Deploy all functions

```bash
supabase functions deploy extract-instagram-metrics
supabase functions deploy generate-caption
supabase functions deploy generate-report-summary
supabase functions deploy run-health-check
supabase functions deploy canvas-assist
```

## Usage in V4 app

Use `src/v4-app/services/edgeFunctionsService.js`:

```javascript
import { generateCaption, extractInstagramMetrics, runHealthCheck } from '../services/edgeFunctionsService';

// Generate a caption
const { caption, hashtags } = await generateCaption({
  description: 'Stunning oceanfront penthouse in West Vancouver',
  platform: 'instagram',
  tone: 'luxury',
});

// Extract Instagram metrics from screenshots
const { metrics } = await extractInstagramMetrics([
  { base64: '...' }, // or { url: 'https://...' }
]);

// Run health check (bulk — admin only)
const { processed, results } = await runHealthCheck();

// Run health check for one client
const result = await runHealthCheck(clientId);
```

## Rate Limits

Rate limiting uses a `rate_limit_requests` table. Add to Supabase:

```sql
CREATE TABLE IF NOT EXISTS rate_limit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON rate_limit_requests(user_id, feature, created_at DESC);
ALTER TABLE rate_limit_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rate_limit_insert" ON rate_limit_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "rate_limit_select" ON rate_limit_requests FOR SELECT TO authenticated USING (user_id = auth.uid());
```

Limits per user:
- OpenAI/caption/report functions: 50/hour, 200/day
- Vision functions: 30/hour, 100/day

## Local Development

```bash
supabase start
supabase functions serve --env-file .env.local
```

Test with curl:
```bash
curl -X POST http://localhost:54321/functions/v1/generate-caption \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"description": "Luxury penthouse", "platform": "instagram"}'
```

## V3 Compatibility

V3 still uses Firebase Cloud Functions via `httpsCallable`. No changes needed there.
V4 uses Supabase Edge Functions exclusively via `edgeFunctionsService`.
Both can run in parallel during the migration period.
