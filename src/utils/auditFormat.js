// Helpers for rendering audit_log entries (see migration 040 + getAuditLog()).
// Shared by the per-client History view and the HRAnalytics audit panel.

// Columns that change on almost every write and add no signal for a reader.
const NOISE_COLUMNS = new Set(['updated_at', 'updatedat', 'updated_time', 'meta']);

// Friendly labels for the columns people actually care about. Anything not
// listed falls back to a humanized version of the raw column name.
const FIELD_LABELS = {
  notes: 'Notes',
  name: 'Name',
  client_name: 'Name',
  status: 'Status',
  assigned_manager: 'Assigned manager',
  account_manager_id: 'Account manager',
  health_status: 'Health status',
  health_score: 'Health score',
  monthly_value: 'Monthly value',
  contract_start: 'Contract start',
  contract_end: 'Contract end',
  instagram_handle: 'Instagram handle',
  email: 'Email',
  phone: 'Phone',
  brokerage: 'Brokerage',
  package_size: 'Package size',
  posts_used: 'Posts used',
  posts_remaining: 'Posts remaining',
};

export function fieldLabel(col) {
  if (FIELD_LABELS[col]) return FIELD_LABELS[col];
  return String(col)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Render a stored JSON value as a short, readable string.
export function formatAuditValue(v, max = 140) {
  if (v === null || v === undefined || v === '') return '∅ (empty)';
  let s;
  if (typeof v === 'object') {
    try { s = JSON.stringify(v); } catch { s = String(v); }
  } else {
    s = String(v);
  }
  if (s.length > max) s = s.slice(0, max) + '…';
  return s;
}

// For an UPDATE entry, return [{ field, label, from, to }] for the meaningful
// changed columns. For INSERT/DELETE returns [] (caller shows a summary line).
export function auditFieldChanges(entry) {
  if (!entry || entry.operation !== 'UPDATE') return [];
  const cols = (entry.changedColumns && entry.changedColumns.length)
    ? entry.changedColumns
    : Object.keys(entry.new || {});
  return cols
    .filter((c) => !NOISE_COLUMNS.has(c))
    .map((c) => ({
      field: c,
      label: fieldLabel(c),
      from: entry.old ? entry.old[c] : undefined,
      to: entry.new ? entry.new[c] : undefined,
    }));
}

// Who made the change, in human terms.
export function auditActorLabel(entry) {
  if (entry.actorEmail) return entry.actorEmail;
  if (entry.actorRole === 'service_role') return 'Automated / import (service role)';
  if (entry.actorRole) return entry.actorRole;
  return 'Unknown (direct DB write)';
}

// One-line summary used for INSERT/DELETE rows and list headers.
export function auditSummary(entry) {
  if (entry.operation === 'INSERT') return 'Record created';
  if (entry.operation === 'DELETE') return 'Record deleted';
  const changes = auditFieldChanges(entry);
  if (!changes.length) return 'Updated';
  if (changes.length === 1) return `Changed ${changes[0].label}`;
  return `Changed ${changes.length} fields: ${changes.map((c) => c.label).join(', ')}`;
}
