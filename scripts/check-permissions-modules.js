#!/usr/bin/env node
/**
 * System check: permissions and module mapping.
 * Ensures registry, PermissionsManager ALL_PAGES, App.jsx routes, and PermissionsContext are aligned.
 * Run: node scripts/check-permissions-modules.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

// Extract module IDs from registry.js (keys of `modules = { ... }`)
function getRegistryModuleIds() {
  const content = read('src/modules/registry.js');
  const ids = [];
  const re = /^\s*'([a-z0-9-]+)':\s*\{\s*$/gm;
  let m;
  while ((m = re.exec(content)) !== null) ids.push(m[1]);
  return ids;
}

// Extract ALL_PAGES keys from PermissionsManager.jsx
function getAllPagesKeys() {
  const content = read('src/v3-app/pages/PermissionsManager.jsx');
  const start = content.indexOf('const ALL_PAGES = {');
  if (start === -1) return [];
  const slice = content.slice(start, start + 4000);
  const ids = [];
  const re = /^\s*'([a-z0-9-]+)':\s*\{\s*name:/gm;
  let m;
  while ((m = re.exec(slice)) !== null) ids.push(m[1]);
  return ids;
}

// Extract pageId from PermissionRoute in App.jsx
function getAppRoutePageIds() {
  const content = read('src/App.jsx');
  const ids = [];
  const re = /PermissionRoute\s+pageId="([^"]+)"/g;
  let m;
  while ((m = re.exec(content)) !== null) ids.push(m[1]);
  return ids;
}

// Extract Layout allPages keys
function getLayoutPageKeys() {
  const content = read('src/v3-app/components/Layout.jsx');
  const start = content.indexOf("const allPages = {");
  if (start === -1) return [];
  const slice = content.slice(start, start + 2500);
  const ids = [];
  const re = /'\s*([a-z0-9-]+)\s*':\s*\{\s*name:/g;
  let m;
  while ((m = re.exec(slice)) !== null) ids.push(m[1]);
  return ids;
}

// Extract FEATURE_PERMISSIONS values from PermissionsContext (object values like VIEW_FINANCIALS: 'view_financials')
function getFeaturePermissionIds() {
  const content = read('src/contexts/PermissionsContext.js');
  const start = content.indexOf('export const FEATURE_PERMISSIONS = {');
  if (start === -1) return [];
  const slice = content.slice(start, start + 800);
  const ids = [];
  const re = /:\s*'([a-z_]+)'/g;
  let m;
  while ((m = re.exec(slice)) !== null) ids.push(m[1]);
  return ids;
}

// ALL_FEATURES keys in PermissionsManager (feature IDs used in UI)
function getPermissionsManagerFeatureKeys() {
  const content = read('src/v3-app/pages/PermissionsManager.jsx');
  const ids = [];
  const re = /\[\s*FEATURE_PERMISSIONS\.(\w+)\]\s*:\s*\{/g;
  let m;
  while ((m = re.exec(content)) !== null) ids.push(m[1]);
  return ids;
}

function main() {
  const registryIds = getRegistryModuleIds();
  const allPagesKeys = getAllPagesKeys();
  const appPageIds = getAppRoutePageIds();
  const layoutKeys = getLayoutPageKeys();
  const featureIds = getFeaturePermissionIds();
  const pmFeatureKeys = getPermissionsManagerFeatureKeys();

  const specialPages = new Set(['dashboard', 'permissions']);
  const registrySet = new Set(registryIds);
  const allPagesSet = new Set(allPagesKeys);
  const layoutSet = new Set(layoutKeys);

  let hasError = false;

  console.log('=== Permissions / Module system check ===\n');

  // 1) Every registry module should be in ALL_PAGES (so admins can grant them)
  const missingInAllPages = registryIds.filter((id) => !allPagesSet.has(id));
  if (missingInAllPages.length > 0) {
    console.log('❌ Registry modules missing in PermissionsManager ALL_PAGES:', missingInAllPages.join(', '));
    hasError = true;
  } else {
    console.log('✅ All registry modules present in ALL_PAGES');
  }

  // 2) ALL_PAGES should not have unknown keys (every key = registry id or dashboard)
  const unknownInAllPages = allPagesKeys.filter((k) => k !== 'dashboard' && !registrySet.has(k));
  if (unknownInAllPages.length > 0) {
    console.log('❌ ALL_PAGES keys not in registry (or dashboard):', unknownInAllPages.join(', '));
    hasError = true;
  } else {
    console.log('✅ All ALL_PAGES keys are registry modules or dashboard');
  }

  // 3) Every App PermissionRoute pageId should be in registry or dashboard
  const unknownInApp = appPageIds.filter((id) => id !== 'dashboard' && !registrySet.has(id));
  if (unknownInApp.length > 0) {
    console.log('❌ App.jsx PermissionRoute pageId not in registry:', unknownInApp.join(', '));
    hasError = true;
  } else {
    console.log('✅ All App PermissionRoute pageIds are in registry or dashboard');
  }

  // 4) Every registry module (with a route) should have a matching route in App (or be nav-only like permissions)
  const appPageIdSet = new Set(appPageIds);
  appPageIdSet.add('dashboard');
  const registryWithoutRoute = registryIds.filter((id) => !appPageIdSet.has(id));
  // time-off routes to /my-time-off but pageId is 'time-off' - route is not PermissionRoute
  const allowedNoRoute = ['time-off', 'my-clients', 'instagram-reports'];
  const missingRoute = registryWithoutRoute.filter((id) => !allowedNoRoute.includes(id));
  if (missingRoute.length > 0) {
    console.log('⚠️  Registry modules with no PermissionRoute in App (may be intentional):', missingRoute.join(', '));
  }

  // 5) Layout allPages: should include dashboard, permissions, and all registry ids that have nav
  const missingInLayout = registryIds.filter((id) => !layoutSet.has(id));
  if (missingInLayout.length > 0) {
    console.log('⚠️  Registry modules missing in Layout allPages (nav may still work via getNavItemsForModules):', missingInLayout.join(', '));
  }
  const extraInLayout = layoutKeys.filter((k) => !registrySet.has(k) && !specialPages.has(k));
  if (extraInLayout.length > 0) {
    console.log('ℹ️  Layout allPages extra keys (non-registry):', extraInLayout.join(', '));
  }

  // 6) Feature permissions: every FEATURE_PERMISSIONS key should appear in ALL_FEATURES (keys are [FEATURE_PERMISSIONS.XXX])
  const permContent = read('src/contexts/PermissionsContext.js');
  const fpStart = permContent.indexOf('FEATURE_PERMISSIONS = {');
  const fpEnd = permContent.indexOf('};', fpStart) + 2;
  const fpBlock = permContent.slice(fpStart, fpEnd);
  const featureConstantNames = [];
  let re2 = /^\s*([A-Z_]+):\s*'/gm;
  let m2;
  while ((m2 = re2.exec(fpBlock)) !== null) featureConstantNames.push(m2[1]);
  const allFeaturesBlock = read('src/v3-app/pages/PermissionsManager.jsx').match(/const ALL_FEATURES = \{[\s\S]*?\n\};/);
  const allFeaturesStr = allFeaturesBlock ? allFeaturesBlock[0] : '';
  const missingFeatureInPM = featureConstantNames.filter((name) => !allFeaturesStr.includes(`FEATURE_PERMISSIONS.${name}`));
  if (missingFeatureInPM.length > 0) {
    console.log('❌ FEATURE_PERMISSIONS not present in PermissionsManager ALL_FEATURES:', missingFeatureInPM.join(', '));
    hasError = true;
  } else {
    console.log('✅ All FEATURE_PERMISSIONS are mapped in ALL_FEATURES');
  }

  console.log('\n--- Summary ---');
  console.log('Registry modules:', registryIds.length);
  console.log('ALL_PAGES keys:', allPagesKeys.length);
  console.log('App PermissionRoute pageIds:', appPageIds.length);
  console.log('Layout allPages keys:', layoutKeys.length);
  console.log('Feature permissions (context):', featureIds.length);
  console.log('Feature constants mapped in ALL_FEATURES:', featureConstantNames.length);

  process.exit(hasError ? 1 : 0);
}

main();
