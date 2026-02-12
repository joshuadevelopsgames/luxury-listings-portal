import * as XLSX from 'xlsx';

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
    status: get('status') || (sheetCategory === 'warmLeads' ? 'Warm' : sheetCategory === 'coldLeads' ? 'Cold' : 'Contacted'),
    lastContact: get('lastcontact') || new Date().toISOString(),
    addedToCrmAt: new Date().toISOString(),
    category: sheetCategory
  };
}

function parseSheet(ws, sheetCategory) {
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (!data || data.length < 2) return [];
  const headers = data[0];
  const leads = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const lead = rowToLead(row, headers, sheetCategory, i);
    if (lead && lead.email) leads.push(lead);
  }
  return leads;
}

const SHEET_MAP = [
  { names: ['Warm Leads', 'Warm'], key: 'warmLeads' },
  { names: ['Have Contacted Before with Proposals', 'Contacted', 'Have Contacted'], key: 'contactedClients' },
  { names: ['Cold Leads', 'Cold'], key: 'coldLeads' }
];

/**
 * One-time import from CRM xlsx file (e.g. "Copy of Luxury Listings Warm Leads.xlsx").
 * @param {File} file - The .xlsx file
 * @returns {Promise<{ warmLeads: Array, contactedClients: Array, coldLeads: Array }>}
 */
export function importCrmFromXlsxFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const warmLeads = [];
        const contactedClients = [];
        const coldLeads = [];

        for (const { names, key } of SHEET_MAP) {
          const sheetName = wb.SheetNames.find((n) => names.some((alias) => n.trim().toLowerCase().includes(alias.toLowerCase())));
          if (!sheetName) continue;
          const ws = wb.Sheets[sheetName];
          const rows = parseSheet(ws, key);
          if (key === 'warmLeads') warmLeads.push(...rows);
          else if (key === 'contactedClients') contactedClients.push(...rows);
          else coldLeads.push(...rows);
        }

        // If no standard sheet names, treat first sheet as Warm Leads
        if (warmLeads.length === 0 && contactedClients.length === 0 && coldLeads.length === 0 && wb.SheetNames.length > 0) {
          const first = wb.Sheets[wb.SheetNames[0]];
          warmLeads.push(...parseSheet(first, 'warmLeads'));
        }

        resolve({ warmLeads, contactedClients, coldLeads });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}
