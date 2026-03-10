# Cohesion Changes: Safe-Only Execution Plan

This plan intentionally applies **zero-runtime-risk** work only.

## What is safe to do now (no behavior change)

1. Add audit/report tooling (read-only) to detect cohesion drift.
2. Document target architecture and migration phases.
3. Add CI/reporting checks in non-blocking mode first.
4. Add dead-code/deprecation inventory (without deleting anything).
5. Add test harness scaffolding (without changing runtime wiring).

## What is intentionally deferred (can break behavior)

1. Permission logic unification across AuthContext, PermissionsContext, rules, and Cloud Functions.
2. Route/module/page registry consolidation used by live navigation and guards.
3. Firestore service/function monolith splits.
4. OAuth/integration flow rewrites (Meta/Slack/Google).
5. Migration off legacy systems (Supabase fallback, old pages, archived flows).

## Safety gates before any deferred change

1. Baseline smoke tests pass (auth, dashboard, tasks, notifications, onboarding, permissions).
2. Feature-flag and rollout plan exists.
3. Rollback path verified.
4. One subsystem at a time with post-change verification.
5. Production-only secrets and endpoints validated.

## Included tool

- `scripts/system-cohesion-audit.js`
  - Compares route/page/module IDs across key files.
  - Reports hardcoded API key patterns and hardcoded integration endpoints.
  - Read-only and safe to run:

```bash
node scripts/system-cohesion-audit.js
```

