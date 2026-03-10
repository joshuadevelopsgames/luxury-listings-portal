#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * System cohesion audit (read-only):
 * - Compares page/module IDs across routing + nav + permissions config
 * - Reports hardcoded integration endpoints and Google-style API keys
 *
 * Safe by design: no writes, no runtime imports, no app behavior changes.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function readFile(relPath) {
  const fullPath = path.join(ROOT, relPath);
  return fs.readFileSync(fullPath, 'utf8');
}

function extractBalancedObjectLiteral(content, constName) {
  const anchor = `const ${constName} = {`;
  const anchorIndex = content.indexOf(anchor);
  if (anchorIndex === -1) return '';

  const start = content.indexOf('{', anchorIndex);
  if (start === -1) return '';

  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let escaped = false;

  for (let i = start; i < content.length; i += 1) {
    const ch = content[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === '\\') {
      escaped = true;
      continue;
    }

    if (inSingle) {
      if (ch === '\'') inSingle = false;
      continue;
    }
    if (inDouble) {
      if (ch === '"') inDouble = false;
      continue;
    }
    if (inTemplate) {
      if (ch === '`') inTemplate = false;
      continue;
    }

    if (ch === '\'') {
      inSingle = true;
      continue;
    }
    if (ch === '"') {
      inDouble = true;
      continue;
    }
    if (ch === '`') {
      inTemplate = true;
      continue;
    }

    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return content.slice(start, i + 1);
      }
    }
  }

  return '';
}

function extractObjectKeys(content, constName) {
  const block = extractBalancedObjectLiteral(content, constName);
  if (!block) return [];
  const keys = [];
  const re = /'([^']+)'\s*:/g;
  let match;
  while ((match = re.exec(block)) !== null) {
    keys.push(match[1]);
  }
  return Array.from(new Set(keys)).sort();
}

function extractPermissionRouteIds(appContent) {
  const ids = [];
  const re = /pageId="([^"]+)"/g;
  let match;
  while ((match = re.exec(appContent)) !== null) {
    ids.push(match[1]);
  }
  return Array.from(new Set(ids)).sort();
}

function toSet(list) {
  return new Set(list);
}

function diff(left, right) {
  return Array.from(left).filter((item) => !right.has(item)).sort();
}

function listSourceFiles(dir, collector = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'build') {
        continue;
      }
      listSourceFiles(full, collector);
    } else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) {
      collector.push(full);
    }
  }
  return collector;
}

function scanForPatterns(rootDir, checks) {
  const files = listSourceFiles(rootDir);
  const findings = [];
  for (const file of files) {
    const rel = path.relative(ROOT, file);
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      checks.forEach((check) => {
        if (check.regex.test(line)) {
          findings.push({
            type: check.type,
            file: rel,
            line: idx + 1,
            text: line.trim().slice(0, 220),
          });
        }
      });
    });
  }
  return findings;
}

function printSection(title) {
  console.log(`\n=== ${title} ===`);
}

function main() {
  const app = readFile('src/App.jsx');
  const layout = readFile('src/v3-app/components/Layout.jsx');
  const permissions = readFile('src/v3-app/pages/PermissionsManager.jsx');
  const modules = readFile('src/modules/registry.js');

  const routePageIds = extractPermissionRouteIds(app);
  const layoutPageIds = extractObjectKeys(layout, 'allPages');
  const permissionsPageIds = extractObjectKeys(permissions, 'ALL_PAGES');
  const moduleIds = extractObjectKeys(modules, 'modules');

  const routeSet = toSet(routePageIds);
  const layoutSet = toSet(layoutPageIds);
  const permsSet = toSet(permissionsPageIds);
  const moduleSet = toSet(moduleIds);

  printSection('Page/Module Cohesion');
  console.log(`Route pageIds: ${routePageIds.length}`);
  console.log(`Layout allPages: ${layoutPageIds.length}`);
  console.log(`Permissions ALL_PAGES: ${permissionsPageIds.length}`);
  console.log(`Module registry IDs: ${moduleIds.length}`);

  const routeNotInLayout = diff(routeSet, layoutSet);
  const routeNotInPermissions = diff(routeSet, permsSet);
  const layoutNotInPermissions = diff(layoutSet, permsSet);
  const modulesNotInLayout = diff(moduleSet, layoutSet);

  if (!routeNotInLayout.length && !routeNotInPermissions.length && !layoutNotInPermissions.length && !modulesNotInLayout.length) {
    console.log('No cohesion drift found across route/nav/permissions/module IDs.');
  } else {
    if (routeNotInLayout.length) console.log(`Route IDs missing in Layout allPages: ${routeNotInLayout.join(', ')}`);
    if (routeNotInPermissions.length) console.log(`Route IDs missing in Permissions ALL_PAGES: ${routeNotInPermissions.join(', ')}`);
    if (layoutNotInPermissions.length) console.log(`Layout allPages IDs missing in Permissions ALL_PAGES: ${layoutNotInPermissions.join(', ')}`);
    if (modulesNotInLayout.length) console.log(`Module IDs missing in Layout allPages: ${modulesNotInLayout.join(', ')}`);
  }

  const findings = scanForPatterns(path.join(ROOT, 'src'), [
    { type: 'google_api_key', regex: /AIza[0-9A-Za-z_-]{10,}/g },
    { type: 'google_apps_script_url', regex: /script\.google\.com\/macros\/s\//g },
    { type: 'firebase_cloudfunctions_url', regex: /cloudfunctions\.net\//g },
  ]);

  printSection('Hardcoded Integration Audit');
  if (!findings.length) {
    console.log('No hardcoded integration endpoints or API key patterns found in src/.');
  } else {
    const byType = findings.reduce((acc, item) => {
      acc[item.type] = acc[item.type] || [];
      acc[item.type].push(item);
      return acc;
    }, {});

    Object.keys(byType).sort().forEach((type) => {
      console.log(`${type}: ${byType[type].length}`);
      byType[type].slice(0, 25).forEach((item) => {
        console.log(`  - ${item.file}:${item.line} :: ${item.text}`);
      });
      if (byType[type].length > 25) {
        console.log(`  ... ${byType[type].length - 25} more`);
      }
    });
  }

  printSection('Result');
  console.log('Audit completed (read-only).');
}

main();

