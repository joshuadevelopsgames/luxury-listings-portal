/**
 * CRM service - shared logic for adding contacts to CRM (Firebase crmData).
 * Adding a client/lead anywhere on the site should call addContactToCRM so the
 * contact appears in the CRM with a timestamp and Type (SMM, PP, BOTH, N/A).
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { auth } from '../firebase';

// Type (SMM, PP, BOTH, N/A) - required for every contact
export const CLIENT_TYPE = {
  SMM: 'SMM',
  PP: 'PP',
  BOTH: 'BOTH',
  NA: 'N/A'
};

export const CLIENT_TYPE_OPTIONS = [
  { value: CLIENT_TYPE.SMM, label: 'SMM' },
  { value: CLIENT_TYPE.PP, label: 'Posting Package (PP)' },
  { value: CLIENT_TYPE.BOTH, label: 'Both' },
  { value: CLIENT_TYPE.NA, label: 'N/A (lead – service interest unknown)' }
];

const DEFAULT_TAB = 'warmLeads';

/**
 * Get CRM leads for a user (Firebase users/{uid}.crmData).
 * Returns a single array of { id, clientName, clientEmail, source: 'lead' } for use in pickers.
 * @param {string} [uid] - Optional. If provided, uses this uid; otherwise uses auth.currentUser.uid.
 * @returns {Promise<Array<{ id: string, clientName: string, clientEmail: string, source: string }>>}
 */
export async function getCrmLeadsForCurrentUser(uid) {
  const resolvedUid = uid ?? auth.currentUser?.uid;
  if (!resolvedUid) return [];

  try {
    const userRef = doc(db, 'users', resolvedUid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return [];
    const raw = snap.data();
    // CRM Add Lead form writes to crmData; Google Sheets sync writes to top level. Merge both.
    const fromCrm = raw.crmData || {};
    const warmLeads = [...(fromCrm.warmLeads || []), ...(raw.warmLeads || [])];
    const contactedClients = [...(fromCrm.contactedClients || []), ...(raw.contactedClients || [])];
    const coldLeads = [...(fromCrm.coldLeads || []), ...(raw.coldLeads || [])];
    const mapLead = (c, i, prefix) => ({
      id: String(c.id ?? `${prefix}-${i}`),
      clientName: (c.contactName || c.clientName || c.name || '').trim() || '—',
      clientEmail: (c.email || c.clientEmail || '').trim() || '',
      source: 'lead'
    });
    const warm = warmLeads.map((c, i) => mapLead(c, i, 'lead-warm'));
    const contacted = contactedClients.map((c, i) => mapLead(c, i, 'lead-contacted'));
    const cold = coldLeads.map((c, i) => mapLead(c, i, 'lead-cold'));
    return [...warm, ...contacted, ...cold];
  } catch (err) {
    console.error('CRM getCrmLeadsForCurrentUser error:', err);
    return [];
  }
}

/**
 * Add a contact to the current user's CRM (Firebase users/{uid}.crmData).
 * Requires: contactName (or clientName), email, type (SMM | PP | BOTH | N/A).
 * Automatically sets addedToCrmAt (ISO timestamp).
 * @param {Object} contact - { contactName?, clientName?, email, type, phone?, instagram?, organization?, website?, notes?, ... }
 * @param {string} tab - 'warmLeads' | 'contactedClients' | 'coldLeads'
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function addContactToCRM(contact, tab = DEFAULT_TAB) {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    console.warn('CRM: No user logged in, skipping add to CRM');
    return { success: false, error: 'Not authenticated' };
  }

  const name = (contact.contactName || contact.clientName || '').trim();
  const email = (contact.email || contact.clientEmail || '').trim();
  const type = contact.type || CLIENT_TYPE.NA;

  if (!email) {
    return { success: false, error: 'Email is required for CRM' };
  }

  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    const existing = snap.exists() ? snap.data().crmData || {} : {};
    const warmLeads = Array.isArray(existing.warmLeads) ? existing.warmLeads : [];
    const contactedClients = Array.isArray(existing.contactedClients) ? existing.contactedClients : [];
    const coldLeads = Array.isArray(existing.coldLeads) ? existing.coldLeads : [];

    const newLead = {
      id: `crm-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      contactName: name || email.split('@')[0] || '—',
      email,
      type,
      addedToCrmAt: new Date().toISOString(),
      phone: contact.phone || '',
      instagram: contact.instagram || '',
      organization: contact.organization || '',
      website: contact.website || '',
      notes: contact.notes || '',
      status: 'New Lead',
      lastContact: new Date().toISOString(),
      category: tab === 'warmLeads' ? 'warmLeads' : tab === 'contactedClients' ? 'contactedClients' : 'coldLeads'
    };

    if (tab === 'warmLeads') {
      warmLeads.unshift(newLead);
    } else if (tab === 'contactedClients') {
      contactedClients.unshift(newLead);
    } else {
      coldLeads.unshift(newLead);
    }

    await setDoc(userRef, {
      crmData: {
        warmLeads,
        contactedClients,
        coldLeads,
        lastSyncTime: new Date().toLocaleString()
      }
    }, { merge: true });

    return { success: true };
  } catch (err) {
    console.error('CRM addContactToCRM error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Remove a lead from the current user's CRM (Firebase crmData) by id.
 * @param {string} leadId
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function removeLeadFromCRM(leadId) {
  const uid = auth.currentUser?.uid;
  if (!uid) return { success: false, error: 'Not authenticated' };
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    const existing = snap.exists() ? snap.data().crmData || {} : {};
    const warmLeads = (Array.isArray(existing.warmLeads) ? existing.warmLeads : []).filter(l => l.id !== leadId);
    const contactedClients = (Array.isArray(existing.contactedClients) ? existing.contactedClients : []).filter(l => l.id !== leadId);
    const coldLeads = (Array.isArray(existing.coldLeads) ? existing.coldLeads : []).filter(l => l.id !== leadId);
    await setDoc(userRef, {
      crmData: {
        warmLeads,
        contactedClients,
        coldLeads,
        lastSyncTime: new Date().toLocaleString()
      }
    }, { merge: true });
    return { success: true };
  } catch (err) {
    console.error('CRM removeLeadFromCRM error:', err);
    return { success: false, error: err.message };
  }
}
