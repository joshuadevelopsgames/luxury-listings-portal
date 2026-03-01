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

function mergedObject(group) {
  const merged = {};
  const allKeys = new Set();
  group.forEach((c) => Object.keys(c || {}).forEach((k) => allKeys.add(k)));
  allKeys.forEach((key) => {
    if (key === '_source') return;
    merged[key] = key === 'id' ? group[0]?.id : firstNonEmpty(group, key);
  });
  return merged;
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
    const sources = [...new Set(group.map((c) => c._source))];
    const merged = { ...mergedObject(group), _sources: sources };
    merged.id = keeper.id;
    mergedLeads.push(merged);
    group.forEach((c) => idsToRemove.add(c.id));
  }

  const drop = (arr) => (arr || []).filter((c) => !idsToRemove.has(c.id));
  let warm = drop(warmLeads);
  let contacted = drop(contactedClients);
  let cold = drop(coldLeads);

  for (const lead of mergedLeads) {
    const { _source, _sources, ...rest } = lead;
    const clean = { ...rest };
    const list = _sources || (_source ? [_source] : []);
    if (list.includes('warm')) warm = [clean, ...warm];
    if (list.includes('contacted')) contacted = [clean, ...contacted];
    if (list.includes('cold')) cold = [clean, ...cold];
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
