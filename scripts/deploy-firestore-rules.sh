#!/usr/bin/env sh
# Deploy full Firestore rules so the app can read approved_users, clients, graphic_projects, etc.
# Run from repo root: ./scripts/deploy-firestore-rules.sh
# Or with project: ./scripts/deploy-firestore-rules.sh YOUR_PROJECT_ID
# If "No project active": run firebase use --add and pick your project, then run this again.

set -e
cd "$(dirname "$0")/.."
if [ -n "$1" ]; then
  firebase deploy --only firestore:rules --project "$1"
else
  firebase deploy --only firestore:rules
fi
echo "Done. If the app still shows no data, hard-refresh or log out and back in."
