/**
 * Writes public/version.json with a unique version per build.
 * Run before `react-scripts build` so each deploy has a new version.
 */
const fs = require('fs');
const path = require('path');

const version = process.env.VERCEL_GIT_COMMIT_SHA
  || process.env.SOURCE_VERSION
  || process.env.GIT_COMMIT
  || `build-${Date.now()}`;

const dir = path.join(__dirname, '..', 'public');
const file = path.join(dir, 'version.json');

if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(file, JSON.stringify({ version }) + '\n', 'utf8');
console.log('Wrote version:', version);
