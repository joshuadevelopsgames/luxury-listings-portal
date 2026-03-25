/**
 * CRM service - shared logic for adding contacts to CRM.
 * Data is stored in Firestore shared doc (crm/data) so new leads show for all users.
 */

import { auth } from '../firebase';
import { supabaseService } from './supabaseService';

// Type (SMM, PP, BOTH, N/A, DESIGN, PROD, CONSULT) - required for every contact
export const CLIENT_TYPE = {
  SMM: 'SMM',
  PP: 'PP',
  BOTH: 'BOTH',
  NA: 'N/A',
  DESIGN: 'Design',
  PROD: 'Prod',
  CONSULT: 'Consult',
  PAST: 'Past'
};

export const CLIENT_TYPE_OPTIONS = [
  { value: CLIENT_TYPE.SMM, label: 'SMM' },
  { value: CLIENT_TYPE.PP, label: 'Posting Package (PP)' },
  { value: CLIENT_TYPE.DESIGN, label: 'Graphic Design (Design)' },
  { value: CLIENT_TYPE.PROD, label: 'Production (Prod)' },
  { value: CLIENT_TYPE.CONSULT, label: 'Consultation (Consult)' },
  { value: CLIENT_TYPE.PAST, label: 'Past Client (Past)' },
  { value: CLIENT_TYPE.NA, label: 'N/A (lead – service interest unknown)' }
];

const LOCATION_ABBREVIATIONS = {
  nyc: 'New York City',
  fl: 'Florida',
  ct: 'Connecticut',
  la: 'Los Angeles',
  uk: 'United Kingdom',
  'so cal': 'Southern California',
  socal: 'Southern California',
  norcal: 'Northern California',
  'nw fl': 'Northwest Florida',
  'nw florida': 'Northwest Florida'
};

/**
 * Normalize location for storage: trim, expand abbreviations, title case. Case-insensitive so we avoid duplicates.
 * @param {string} loc
 * @returns {string}
 */
export function normalizeLocation(loc) {
  let s = (loc || '').trim();
  if (!s) return '';
  const lower = s.toLowerCase();
  for (const [abbr, full] of Object.entries(LOCATION_ABBREVIATIONS)) {
    if (lower === abbr || lower === full.toLowerCase()) {
      return full;
    }
  }
  return s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

/** Canonical location options: no slashes, no abbreviations (e.g. New York City not NYC). */
export const CRM_LOCATIONS = [
  'Arizona',
  'Aspen',
  'Austin',
  'Australia',
  'Beverly Hills',
  'Boston',
  'Cayman',
  'Denver',
  'Europe',
  'Florida Keys',
  'Gold Coast, Australia',
  'Hamptons, New York',
  'Latin America',
  'London',
  'Los Angeles',
  'Martha\'s Vineyard',
  'Miami',
  'Miami Beach',
  'Monaco',
  'Nashville',
  'Naples, Florida',
  'New Canaan, Connecticut',
  'New York',
  'New York City',
  'Northern California',
  'Northwest Florida',
  'Phoenix',
  'San Antonio',
  'Santa Fe',
  'Scottsdale',
  'Paradise Valley',
  'Seattle',
  'Southern California',
  'United Kingdom'
].sort();

/** Normalize contact type(s) to array for display/filter. Supports types[], type, clientTypes[], clientType. */
export function getContactTypes(contact) {
  if (!contact) return [CLIENT_TYPE.NA];
  const arr = contact.types ?? contact.clientTypes;
  if (Array.isArray(arr) && arr.length) return arr;
  const single = contact.type ?? contact.clientType;
  if (single) return [single];
  return [CLIENT_TYPE.NA];
}

const DEFAULT_TAB = 'warmLeads';

/**
 * Get CRM leads from shared doc (all users see same leads).
 * Returns a single array of { id, clientName, clientEmail, source: 'lead' } for use in pickers.
 * @param {string} [uid] - Unused; kept for API compatibility.
 * @returns {Promise<Array<{ id: string, clientName: string, clientEmail: string, source: string }>>}
 */
export async function getCrmLeadsForCurrentUser(uid) {
  if (!auth.currentUser?.uid) return [];
  try {
    const { warmLeads, contactedClients, coldLeads } = await supabaseService.getCrmData();
    const mapLead = (c, i, prefix) => ({
      id: String(c.id ?? `${prefix}-${i}`),
      clientName: (c.contactName || c.clientName || c.name || '').trim() || '—',
      clientEmail: (c.email || c.clientEmail || '').trim() || '',
      source: 'lead'
    });
    return [
      ...warmLeads.map((c, i) => mapLead(c, i, 'lead-warm')),
      ...contactedClients.map((c, i) => mapLead(c, i, 'lead-contacted')),
      ...coldLeads.map((c, i) => mapLead(c, i, 'lead-cold'))
    ];
  } catch (err) {
    console.error('CRM getCrmLeadsForCurrentUser error:', err);
    return [];
  }
}

/**
 * Add a contact to shared CRM (Firestore crm/data). Visible to all users.
 * @param {Object} contact - { contactName?, clientName?, email, type, phone?, ... }
 * @param {string} tab - 'warmLeads' | 'contactedClients' | 'coldLeads'
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function addContactToCRM(contact, tab = DEFAULT_TAB) {
  if (!auth.currentUser?.uid) {
    return { success: false, error: 'Not authenticated' };
  }
  const name = (contact.contactName || contact.clientName || '').trim();
  const email = (contact.email || contact.clientEmail || '').trim();
  const types = Array.isArray(contact.types) && contact.types.length
    ? contact.types
    : (contact.clientTypes && contact.clientTypes.length)
      ? contact.clientTypes
      : (contact.type || contact.clientType)
        ? [contact.type || contact.clientType]
        : [CLIENT_TYPE.NA];
  const type = types[0] || CLIENT_TYPE.NA;
  if (!email) return { success: false, error: 'Email is required for CRM' };

  try {
    const { warmLeads, contactedClients, coldLeads } = await supabaseService.getCrmData();
    const primaryContact = contact.primaryContact && (contact.primaryContact.name || contact.primaryContact.email || contact.primaryContact.phone || contact.primaryContact.role)
      ? { name: contact.primaryContact.name || '', email: contact.primaryContact.email || '', phone: contact.primaryContact.phone || '', role: contact.primaryContact.role || '' }
      : null;
    const newLead = {
      id: `crm-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      contactName: name || email.split('@')[0] || '—',
      email,
      type,
      types,
      addedToCrmAt: new Date().toISOString(),
      phone: contact.phone || '',
      instagram: contact.instagram || '',
      organization: contact.organization || '',
      website: contact.website || '',
      notes: contact.notes || '',
      location: normalizeLocation(contact.location || '') || null,
      primaryContact: primaryContact || null,
      status: tab === 'warmLeads' ? 'warm' : tab === 'contactedClients' ? 'contacted' : 'cold',
      lastContact: new Date().toISOString(),
      category: tab === 'warmLeads' ? 'warmLeads' : tab === 'contactedClients' ? 'contactedClients' : 'coldLeads'
    };
    if (tab === 'warmLeads') warmLeads.unshift(newLead);
    else if (tab === 'contactedClients') contactedClients.unshift(newLead);
    else coldLeads.unshift(newLead);
    await supabaseService.setCrmData({ warmLeads, contactedClients, coldLeads });
    return { success: true };
  } catch (err) {
    console.error('CRM addContactToCRM error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Remove a lead from shared CRM by id.
 * @param {string} leadId
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function removeLeadFromCRM(leadId) {
  if (!auth.currentUser?.uid) return { success: false, error: 'Not authenticated' };
  try {
    const { warmLeads, contactedClients, coldLeads } = await supabaseService.getCrmData();
    await supabaseService.setCrmData({
      warmLeads: warmLeads.filter(l => l.id !== leadId),
      contactedClients: contactedClients.filter(l => l.id !== leadId),
      coldLeads: coldLeads.filter(l => l.id !== leadId)
    });
    return { success: true };
  } catch (err) {
    console.error('CRM removeLeadFromCRM error:', err);
    return { success: false, error: err.message };
  }
}
