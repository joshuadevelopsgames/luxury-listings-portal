#!/usr/bin/env node
/**
 * Read CRM export xlsx and print location-wise summary (companies/contacts).
 * Run: node scripts/crm-export-location-summary.js "/Users/joshua/Downloads/CRM-export-2026-03-01.xlsx"
 */

const XLSX = require('xlsx');
const path = require('path');

const filePath = process.argv[2] || path.join(process.env.HOME || '', 'Downloads', 'CRM-export-2026-03-01.xlsx');

function normalizeLocation(loc) {
  if (loc == null || String(loc).trim() === '' || String(loc).trim() === '—') return '(no location)';
  return String(loc).trim();
}

// Known org (partial match) -> location. Order matters: more specific first.
const KNOWN_ORG_LOCATIONS = [
  ['astral properties sam', 'Monaco'],
  ['douglas elliman', 'NYC / Miami'],
  ['compass ', 'National (HQ NYC)'],
  [' compass', 'National (HQ NYC)'],
  ['sotheby\'s', 'NYC (global)'],
  ['the agency denver', 'Denver'],
  ['the agency nashville', 'Nashville'],
  ['the agency norcal', 'NorCal'],
  ['the agency carmel', 'Carmel / Pebble Beach'],
  ['the agency new canaan', 'New Canaan, CT'],
  ['the agency boston', 'Boston'],
  ['the agency seattle', 'Seattle'],
  ['the agency austin', 'Austin'],
  ['the agency miami', 'Miami'],
  ['the agency naples', 'Naples, FL'],
  ['the agency santa fe', 'Santa Fe'],
  ['the agency martha', 'Martha\'s Vineyard'],
  ['the agency nwfl', 'NW Florida'],
  ['the agency florida keys', 'Florida Keys'],
  ['the agency cayman', 'Cayman'],
  ['the agency aspen', 'Aspen'],
  ['the agency san antonio', 'San Antonio'],
  ['the agency so cal', 'So Cal'],
  ['the agency north cal', 'NorCal'],
  ['the agency new york', 'New York'],
  ['the agency re', 'National (HQ Beverly Hills)'],
  ['hilton & hyland', 'Beverly Hills'],
  ['hilton and hyland', 'Beverly Hills'],
  ['concierge auctions', 'NYC'],
  ['the corcoran group', 'NYC / Hamptons / FL'],
  ['corcoran ', 'NYC / Hamptons / FL'],
  ['eklund gomes', 'NYC'],
  ['eklund homes team', 'NYC'],
  ['fratantoni group', 'Scottsdale / Phoenix'],
  ['fratantoni ', 'Scottsdale / Phoenix'],
  ['walter danley', 'Scottsdale / Paradise Valley'],
  ['walt danley', 'Scottsdale / Paradise Valley'],
  ['christies realty', 'Arizona (Walt Danley)'],
  ['the jills zeder', 'Miami Beach'],
  ['jills zeder', 'Miami Beach'],
  ['kollosche', 'Gold Coast, Australia'],
  ['grand lux properties', 'LA'],
  ['kanavero real estate', 'Australia'],
  ['beauchamp estates', 'London'],
  ['dluxe', 'France / Monaco'],
  ['eurohouse', 'Europe'],
  ['lago real', 'Latin America'],
  ['vantage west realty', 'Arizona'],
  ['madison residential', 'LA'],
  ['carroll group', 'LA'],
  ['racing green group', 'UK'],
  ['resnick & nash', 'LA'],
  ['whiffen & wilson', 'UK'],
  ['faulkner architects', 'LA'],
  ['graham smith construction', 'LA'],
  ['burdge architects', 'LA / So Cal'],
  ['zoltan pali', 'LA (SPF:a)'],
  ['veranda estate homes', 'So Cal'],
  ['tami pardee', 'LA (The Agency)'],
  ['hq residences miami', 'Miami'],
  ['nyrose and associates', 'LA'],
  ['landmark west development', 'LA'],
  ['one shot productions', 'Entertainment (LA/NYC)'],
  ['molori design', 'LA'],
  ['vantage design group', 'So Cal'],
  ['canvas homes', 'So Cal'],
  ['archia development', 'LA'],
  ['spazio group', 'LA'],
  ['luxyspace', 'LA'],
  ['danny & claudio', 'LA'],
  ['bravo luxury rentals', 'LA'],
  ['carmenate', 'Miami'],
  ['duchon', 'Miami'],
  ['jacobson & bach', 'LA'],
  ['team whetzel', 'So Cal'],
  ['see materials', 'So Cal'],
  ['windsor smith home', 'LA'],
  ['the fridman group', 'NYC/Miami'],
  ['the taylor lucyk group', 'Denver'],
  ['tim allen properties', 'So Cal'],
  ['the stockton group', 'So Cal'],
  ['exp realty', 'eXp (virtual / national)'],
  ['mcclean designs', 'LA'],
  ['the agency', 'Beverly Hills (HQ) / national']
];

// Keyword in org name -> location (for geo cues in name)
const GEO_KEYWORDS = [
  ['boston', 'Boston'],
  ['seattle', 'Seattle'],
  ['denver', 'Denver'],
  ['nashville', 'Nashville'],
  ['carmel', 'Carmel / Pebble Beach'],
  ['pebble beach', 'Carmel / Pebble Beach'],
  ['new canaan', 'New Canaan, CT'],
  ['norcal', 'NorCal'],
  ['north cal', 'NorCal'],
  ['austin', 'Austin'],
  ['miami', 'Miami'],
  ['santa fe', 'Santa Fe'],
  ['naples', 'Naples, FL'],
  ['cayman', 'Cayman'],
  ['aspen', 'Aspen'],
  ["martha's vineyard", "Martha's Vineyard"],
  ['florida keys', 'Florida Keys'],
  ['nwfl', 'NW Florida'],
  ['san antonio', 'San Antonio'],
  ['so cal', 'So Cal'],
  ['new york', 'New York'],
  ['scottsdale', 'Scottsdale'],
  ['phoenix', 'Phoenix'],
  ['beverly hills', 'Beverly Hills'],
  ['los angeles', 'Los Angeles'],
  ['la ', 'Los Angeles'],
  ['hamptons', 'Hamptons, NY'],
  ['palm beach', 'Palm Beach, FL'],
  ['gold coast', 'Gold Coast, Australia'],
  ['london', 'London'],
  ['uk', 'UK'],
  ['australia', 'Australia']
];

function inferLocationFromOrg(org) {
  if (!org || typeof org !== 'string') return null;
  const o = org.toLowerCase().trim();
  for (const [key, label] of KNOWN_ORG_LOCATIONS) {
    if (o.includes(key)) return label;
  }
  for (const [key, label] of GEO_KEYWORDS) {
    if (o.includes(key)) return label;
  }
  return null;
}

function sheetToRows(ws) {
  return XLSX.utils.sheet_to_json(ws, { defval: '' });
}

function getCol(row, ...names) {
  for (const n of names) {
    const v = row[n];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return null;
}

function run() {
  const wb = XLSX.readFile(filePath);
  const all = [];
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows = sheetToRows(ws);
    // if (rows.length > 0 && all.length === 0) console.log('Columns in file:', Object.keys(rows[0]));
    for (const row of rows) {
      const contactName = getCol(row, 'Contact Name', 'Contact name', 'contact name');
      const email = getCol(row, 'Email', 'email');
      let location = normalizeLocation(getCol(row, 'Location', 'location'));
      const organization = getCol(row, 'Organization', 'organization', 'Organization/Company') || '';
      if (location === '(no location)' && organization) {
        const inferred = inferLocationFromOrg(organization);
        if (inferred) location = inferred + ' (from org)';
      }
      const sheet = sheetName;
      if (contactName || email) {
        all.push({ contactName: contactName || email || '—', email: email || '—', location, organization, sheet });
      }
    }
  }

  const byLocation = {};
  for (const r of all) {
    const loc = r.location;
    if (!byLocation[loc]) byLocation[loc] = { contacts: [], organizations: new Set() };
    byLocation[loc].contacts.push({ name: r.contactName, email: r.email, organization: r.organization, sheet: r.sheet });
    if (r.organization) byLocation[loc].organizations.add(r.organization);
  }

  const locations = Object.keys(byLocation).sort((a, b) => byLocation[b].contacts.length - byLocation[a].contacts.length);

  console.log('--- CRM Export: Location-wise summary ---\n');
  console.log(`Total rows: ${all.length}\n`);

  for (const loc of locations) {
    const data = byLocation[loc];
    const count = data.contacts.length;
    const orgs = [...data.organizations].filter(Boolean).sort();
    console.log(`## ${loc} (${count} contact${count !== 1 ? 's' : ''})`);
    if (orgs.length > 0) {
      console.log('   Companies/orgs: ' + orgs.join('; '));
    }
    console.log('   Contacts: ' + data.contacts.map((c) => c.name + (c.organization ? ` (${c.organization})` : '')).join(', '));
    console.log('');
  }
}

run();
