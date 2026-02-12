import { findPotentialDuplicateGroups } from '../services/clientDuplicateService';

const LEAD_FIELDS = [
  'contactName',
  'email',
  'type',
  'phone',
  'instagram',
  'organization',
  'website',
  'notes',
  'status',
  'lastContact',
  'addedToCrmAt',
  'category'
];

function firstNonEmpty(group, key) {
  for (const c of group) {
    const v = c[key];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return group[0]?.[key] ?? '';
}

/**
 * Merge duplicate CRM leads (by name/email) into one per group. Keeps one lead per group with merged fields.
 * @param {Array} warmLeads
 * @param {Array} contactedClients
 * @param {Array} coldLeads
 * @returns {{ warmLeads: Array, contactedClients: Array, coldLeads: Array, mergedCount: number }}
 */
export function mergeCrmDuplicates(warmLeads, contactedClients, coldLeads) {
  const withSource = (arr, source) => (arr || []).map((c) => ({ ...c, _source: source }));
  const all = [
    ...withSource(warmLeads, 'warm'),
    ...withSource(contactedClients, 'contacted'),
    ...withSource(coldLeads, 'cold')
  ];
  const groups = findPotentialDuplicateGroups(all);
  if (groups.length === 0) {
    return {
      warmLeads: warmLeads || [],
      contactedClients: contactedClients || [],
      coldLeads: coldLeads || [],
      mergedCount: 0
    };
  }

  const idsToRemove = new Set();
  const mergedLeads = [];

  for (const group of groups) {
    const keeper = group[0];
    const merged = { _source: keeper._source };
    for (const key of LEAD_FIELDS) {
      merged[key] = key === 'id' ? keeper.id : firstNonEmpty(group, key);
    }
    merged.id = keeper.id;
    mergedLeads.push(merged);
    group.forEach((c) => idsToRemove.add(c.id));
  }

  const drop = (arr) => (arr || []).filter((c) => !idsToRemove.has(c.id));
  let warm = drop(warmLeads);
  let contacted = drop(contactedClients);
  let cold = drop(coldLeads);

  for (const lead of mergedLeads) {
    const { _source, ...rest } = lead;
    const clean = { ...rest };
    if (_source === 'warm') warm = [clean, ...warm];
    else if (_source === 'contacted') contacted = [clean, ...contacted];
    else cold = [clean, ...cold];
  }

  const removed = idsToRemove.size;
  const kept = mergedLeads.length;
  const mergedCount = removed - kept;

  return {
    warmLeads: warm,
    contactedClients: contacted,
    coldLeads: cold,
    mergedCount
  };
}
