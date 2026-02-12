/**
 * Detect potential duplicate clients (same person, bad data) and support merge decisions.
 * Compares name + email (and optional phone) to find groups that likely refer to one client.
 */

/**
 * Normalize string for comparison: trim, lower, collapse spaces.
 * @param {string} s
 * @returns {string}
 */
function normalize(s) {
  if (s == null || typeof s !== 'string') return '';
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Normalize name: strip punctuation, collapse spaces, optional strip middle initial.
 * @param {string} name
 * @returns {string}
 */
export function normalizeName(name) {
  const n = normalize(name).replace(/[.,]/g, '');
  return n;
}

/**
 * Normalize email: trim, lower. Empty if invalid/missing.
 * @param {string} email
 * @returns {string}
 */
export function normalizeEmail(email) {
  const e = normalize(email);
  if (!e || !e.includes('@')) return '';
  return e;
}

/**
 * Normalize phone for comparison: digits only (last 7+ digits used for weak match).
 * @param {string} phone
 * @returns {string}
 */
export function normalizePhone(phone) {
  if (phone == null || typeof phone !== 'string') return '';
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 7 ? digits.slice(-10) : '';
}

/**
 * Get display name from client (clientName or contactName or email prefix).
 * @param {Object} client
 * @returns {string}
 */
function getDisplayName(client) {
  return (client.clientName || client.contactName || client.name || '').trim()
    || (client.clientEmail || client.email || '').split('@')[0] || '—';
}

/**
 * Get email from client.
 * @param {Object} client
 * @returns {string}
 */
function getEmail(client) {
  return normalizeEmail(client.clientEmail || client.email || '');
}

/**
 * Names are considered matching if:
 * - Exact normalized match, or
 * - One normalized name contains the other (e.g. "Jane Smith" vs "Jane M Smith"), or
 * - Same first + last token (e.g. "Jane Smith" vs "Smith, Jane")
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function namesAlign(a, b) {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const tokensA = na.split(' ').filter(Boolean);
  const tokensB = nb.split(' ').filter(Boolean);
  const firstA = tokensA[0];
  const firstB = tokensB[0];
  const lastA = tokensA[tokensA.length - 1];
  const lastB = tokensB[tokensB.length - 1];
  if (firstA === firstB && lastA === lastB) return true;
  if (firstA === lastB && lastA === firstB) return true; // "Jane Smith" vs "Smith Jane"
  return false;
}

/**
 * Check if two clients could be the same person (enough details align).
 * - Same email => always match.
 * - Same normalized name + one has email and they match => match.
 * - Same name + both emails empty => match (possible duplicate).
 * - Same name + different non-empty emails => no match.
 * - Optional: same phone (last 7 digits) + name match => match.
 * @param {Object} clientA
 * @param {Object} clientB
 * @param {{ usePhone: boolean }} options
 * @returns {boolean}
 */
export function couldBeSameClient(clientA, clientB, options = {}) {
  const nameA = getDisplayName(clientA);
  const nameB = getDisplayName(clientB);
  const emailA = getEmail(clientA);
  const emailB = getEmail(clientB);

  if (!namesAlign(nameA, nameB)) return false;

  if (emailA && emailB) {
    if (emailA === emailB) return true;
    return false;
  }
  return true;

  if (options.usePhone) {
    const phoneA = normalizePhone(clientA.phone || '');
    const phoneB = normalizePhone(clientB.phone || '');
    if (phoneA && phoneB && phoneA === phoneB) return true;
  }

  return true;
}

/**
 * Find groups of clients that might be duplicates (same person).
 * Each group is an array of clients (from the given list) that could be merged.
 * Uses union-find: if A matches B and B matches C, all go in one group.
 * @param {Array<Object>} clients - List of client objects with id, clientName/contactName, clientEmail/email, etc.
 * @returns {Array<Array<Object>>} Array of groups; each group is 2+ clients that could be duplicates.
 */
export function findPotentialDuplicateGroups(clients) {
  if (!Array.isArray(clients) || clients.length < 2) return [];

  const parent = new Map();
  const idToClient = new Map();
  clients.forEach((c) => {
    const id = c.id || c.clientId;
    if (id) {
      parent.set(id, id);
      idToClient.set(id, c);
    }
  });

  function find(x) {
    if (parent.get(x) !== x) parent.set(x, find(parent.get(x)));
    return parent.get(x);
  }
  function union(x, y) {
    const px = find(x);
    const py = find(y);
    if (px !== py) parent.set(px, py);
  }

  for (let i = 0; i < clients.length; i++) {
    const idA = clients[i].id || clients[i].clientId;
    if (!idA) continue;
    for (let j = i + 1; j < clients.length; j++) {
      const idB = clients[j].id || clients[j].clientId;
      if (!idB) continue;
      if (couldBeSameClient(clients[i], clients[j], { usePhone: true })) {
        union(idA, idB);
      }
    }
  }

  const groupsByRoot = new Map();
  idToClient.forEach((client, id) => {
    const root = find(id);
    if (!groupsByRoot.has(root)) groupsByRoot.set(root, []);
    const group = groupsByRoot.get(root);
    if (group.length === 0 || !group.some((c) => (c.id || c.clientId) === id)) {
      group.push(client);
    }
  });

  return Array.from(groupsByRoot.values()).filter((g) => g.length >= 2);
}

/**
 * Find existing clients/contacts that might match a new contact (by name/email).
 * Use before creating a client or lead to prompt "Possible existing client – add anyway or open existing?"
 * @param {Array<Object>} existingList - Clients or leads (with id, clientName/contactName, clientEmail/email)
 * @param {{ name?: string, email?: string, phone?: string }} contact - The new contact being added
 * @returns {Array<Object>} List of existing records that could be the same person (0 = no match)
 */
export function findPotentialMatchesForContact(existingList, contact) {
  if (!Array.isArray(existingList) || !contact) return [];
  const name = (contact.name || contact.clientName || contact.contactName || '').trim();
  const email = normalizeEmail(contact.email || contact.clientEmail || '');
  if (!name && !email) return [];

  const fakeEntry = {
    id: '__new__',
    clientName: name,
    contactName: name,
    clientEmail: email,
    email,
    phone: contact.phone || ''
  };

  return existingList.filter((c) => {
    const id = c.id || c.clientId;
    if (!id) return false;
    return couldBeSameClient(fakeEntry, c, { usePhone: true });
  });
}
