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
 * Merge duplicate CRM leads (by name/email) into one per group.
 * @returns {{ contactedClients: Array, coldLeads: Array, notInterestedLeads: Array, mergedCount: number }}
 */
export function mergeCrmDuplicates(contactedClients, coldLeads, notInterestedLeads = []) {
  const withSource = (arr, source) => (arr || []).map((c) => ({ ...c, _source: source }));
  const all = [
    ...withSource(contactedClients, 'contacted'),
    ...withSource(coldLeads, 'cold'),
    ...withSource(notInterestedLeads, 'notInterested')
  ];
  const groups = findPotentialDuplicateGroups(all);
  if (groups.length === 0) {
    return {
      contactedClients: contactedClients || [],
      coldLeads: coldLeads || [],
      notInterestedLeads: notInterestedLeads || [],
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
  let contacted = drop(contactedClients);
  let cold = drop(coldLeads);
  let notInterested = drop(notInterestedLeads);

  for (const lead of mergedLeads) {
    const { _source, _sources, ...rest } = lead;
    const clean = { ...rest };
    const list = _sources || (_source ? [_source] : []);
    if (list.includes('contacted')) contacted = [clean, ...contacted];
    if (list.includes('cold') || list.includes('warm')) cold = [clean, ...cold];
    if (list.includes('notInterested')) notInterested = [clean, ...notInterested];
  }

  const removed = idsToRemove.size;
  const kept = mergedLeads.length;
  const mergedCount = removed - kept;

  return {
    contactedClients: contacted,
    coldLeads: cold,
    notInterestedLeads: notInterested,
    mergedCount
  };
}
