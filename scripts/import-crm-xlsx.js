#!/usr/bin/env node
/**
 * One-off: import CRM leads from xlsx into Firestore. Sheet names → warm/contacted/cold.
 * Run: node scripts/import-crm-xlsx.js "/Users/joshua/Downloads/Luxury Listings Warm Leads.xlsx"
 * Requires: GOOGLE_APPLICATION_CREDENTIALS or gcloud auth application-default login
 */

const admin = require('firebase-admin');
const XLSX = require('xlsx');
const path = require('path');

const COL_ALIASES = {
  contactname: ['contact name', 'name', 'contact'],
  email: ['email', 'e-mail'],
  type: ['type'],
  phone: ['phone', 'tel'],
  instagram: ['instagram', 'ig'],
  organization: ['organization', 'company', 'org'],
  website: ['website', 'web'],
  notes: ['notes', 'note'],
  status: ['status'],
  lastcontact: ['last contact', 'lastcontact']
};

function columnIndex(headers, key) {
  const aliases = COL_ALIASES[key] || [key];
  const raw = (headers || []).map((h) => (h || '').toString().toLowerCase().trim());
  for (const a of aliases) {
    const i = raw.findIndex((h) => h === a || h.includes(a));
    if (i !== -1) return i;
  }
  return -1;
}

function rowToLead(row, headers, sheetCategory, rowIndex) {
  const get = (key) => {
    const i = columnIndex(headers, key);
    if (i === -1) return null;
    const v = row[i];
    return v != null && String(v).trim() !== '' ? String(v).trim() : null;
  };
  const contactName = get('contactname') || get('email')?.split('@')[0] || '—';
  const email = get('email') || '';
  if (!email) return null;
  return {
    id: `import-${sheetCategory}-${rowIndex}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    contactName,
    email,
    type: get('type') || 'N/A',
    phone: get('phone') || '',
    instagram: get('instagram') || '',
    organization: get('organization') || '',
    website: get('website') || '',
    notes: get('notes') || '',
    status: sheetCategory === 'warmLeads' ? 'Warm' : sheetCategory === 'coldLeads' ? 'Cold' : 'Contacted',
    lastContact: get('lastcontact') || new Date().toISOString(),
    addedToCrmAt: new Date().toISOString(),
    category: sheetCategory
  };
}

function findHeaderRow(data) {
  if (!data || data.length === 0) return -1;
  for (let r = 0; r < Math.min(data.length, 15); r++) {
    const row = (data[r] || []).map((c) => String(c).toLowerCase());
    if (row.some((c) => c.includes('email') || c === 'e-mail')) return r;
  }
  return 0;
}

function parseSheet(ws, sheetCategory) {
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (!data || data.length < 2) return [];
  const headerRow = findHeaderRow(data);
  const headers = data[headerRow];
  const leads = [];
  for (let i = headerRow + 1; i < data.length; i++) {
    const row = data[i];
    const lead = rowToLead(row, headers, sheetCategory, i);
    if (lead && lead.email) leads.push(lead);
  }
  return leads;
}

const SHEET_MAP = [
  { names: ['Warm Leads', 'Warm'], key: 'warmLeads' },
  { names: ['Have Contacted Before with Proposals', 'Have Contacted Before with Prop', 'Contacted', 'Have Contacted'], key: 'contactedClients' },
  { names: ['Cold Leads', 'Cold'], key: 'coldLeads' }
];

function categoryForSheetName(sheetName) {
  const normalized = (sheetName || '').trim().toLowerCase();
  if (!normalized) return null;
  for (const { names, key } of SHEET_MAP) {
    const matched = names.some((alias) => {
      const a = alias.toLowerCase();
      return normalized === a || normalized.includes(a);
    });
    if (matched) return key;
  }
  return null;
}

function importFromFile(filePath) {
  const wb = XLSX.readFile(filePath);
  const warmLeads = [];
  const contactedClients = [];
  const coldLeads = [];

  for (const sheetName of wb.SheetNames) {
    const key = categoryForSheetName(sheetName);
    if (!key) {
      console.log('  Skip sheet (no category):', sheetName);
      continue;
    }
    const ws = wb.Sheets[sheetName];
    const rows = parseSheet(ws, key);
    if (key === 'warmLeads') warmLeads.push(...rows);
    else if (key === 'contactedClients') contactedClients.push(...rows);
    else coldLeads.push(...rows);
    console.log(`  ${sheetName} → ${key}: ${rows.length} leads`);
  }

  if (warmLeads.length === 0 && contactedClients.length === 0 && coldLeads.length === 0 && wb.SheetNames.length > 0) {
    warmLeads.push(...parseSheet(wb.Sheets[wb.SheetNames[0]], 'warmLeads'));
    console.log('  (no tab matched; first sheet → warmLeads):', warmLeads.length, 'leads');
  }

  return { warmLeads, contactedClients, coldLeads };
}

async function main() {
  const filePath = process.argv[2] || path.join(__dirname, '../Downloads/Luxury Listings Warm Leads.xlsx');
  console.log('Reading:', filePath);

  const { warmLeads, contactedClients, coldLeads } = importFromFile(filePath);
  const total = warmLeads.length + contactedClients.length + coldLeads.length;
  console.log('Total:', total, '| warm:', warmLeads.length, '| contacted:', contactedClients.length, '| cold:', coldLeads.length);

  if (total === 0) {
    console.log('No leads to import.');
    process.exit(1);
  }

  admin.initializeApp({ projectId: 'luxury-listings-portal-e56de' });
  const db = admin.firestore();

  const ref = db.collection('crm').doc('data');
  await ref.set({
    warmLeads,
    contactedClients,
    coldLeads,
    lastSyncTime: new Date().toISOString()
  }, { merge: true });

  console.log('CRM data written to Firestore (crm/data).');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
