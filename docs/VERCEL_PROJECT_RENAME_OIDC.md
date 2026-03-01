# Vercel Project Renamed to "luxury-listings-portal"

**Production domain is unchanged:** still **smmluxurylistings.info**. Only the Vercel project name (and thus default `*.vercel.app` URLs) changed to `luxury-listings-portal`.

## What Was Updated in This Repo

- **storage.cors.json** – Added `https://luxury-listings-portal.vercel.app` for Vercel preview/default URLs. Production remains `smmluxurylistings.info`.
- **functions/index.js** – Added `https://luxury-listings-portal.vercel.app` to `ALLOWED_ORIGINS` for callable functions.
- **docs/AUTO_DEPLOY_SETUP.md** – Project name set to `luxury-listings-portal`; note to re-run `npx vercel link` after rename.

## OpenID Connect (OIDC)

Renaming the project changes **OIDC token claims** (e.g. audience/subject may include the new project name). If you use:

- **Vercel OIDC** with **Google Cloud Workload Identity Federation**, **AWS IAM**, or another **OIDC federation**:
  - Update the **audience** and/or **issuer** in that provider’s config to the new project (e.g. `luxury-listings-portal`).
  - See [Vercel OIDC](https://vercel.com/docs/security/secure-compute/oidc) and your cloud provider’s OIDC docs.

No code in this repo validates Vercel OIDC tokens; that configuration lives in the cloud provider (GCP/AWS/etc.).

## Firebase

- **Authorized domains**: Production stays on `smmluxurylistings.info`. In [Firebase Console → Authentication → Settings → Authorized domains](https://console.firebase.google.com/project/luxury-listings-portal-e56de/authentication/settings), add `luxury-listings-portal.vercel.app` only if you need sign-in from Vercel preview URLs.
- **Storage CORS**: After editing `storage.cors.json`, re-apply it to the bucket (see `STORAGE_CORS_SETUP.md`).
