/**
 * Formatters for values rendered in stat cards and metric rows.
 *
 * Every helper returns the placeholder em dash ("—") rather than "NaN",
 * "undefined", "0k" or similar when the underlying value is missing or
 * not a finite number. Never substitute an example number.
 */

export const PLACEHOLDER = '—';

const isFiniteNumberValue = (value) =>
  typeof value === 'number' && Number.isFinite(value);

/** Coerce anything to a finite number, or null when that isn't possible. */
const toFiniteNumber = (value) => {
  if (isFiniteNumberValue(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

/** Plain count: 0 is a real value, null/undefined/NaN are not. */
export function formatStat(value) {
  const n = toFiniteNumber(value);
  return n === null ? PLACEHOLDER : n.toLocaleString('en-US');
}

/** Whole-dollar amount, e.g. 1234 -> "$1,234". */
export function formatCurrency(value) {
  const n = toFiniteNumber(value);
  if (n === null) return PLACEHOLDER;
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

/** Compact dollars for dense stat cards, e.g. 42000 -> "$42k". */
export function formatCurrencyCompact(value) {
  const n = toFiniteNumber(value);
  if (n === null) return PLACEHOLDER;
  if (Math.abs(n) >= 1000) return `$${Math.round(n / 1000).toLocaleString('en-US')}k`;
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

/** Day count, e.g. 47 -> "47d". Guards the "NaNd" case. */
export function formatDays(value) {
  const n = toFiniteNumber(value);
  return n === null ? PLACEHOLDER : `${Math.round(n)}d`;
}

/** Percentage, e.g. 0.42 with fraction=true -> "42%". */
export function formatPercent(value, { fraction = false, decimals = 0 } = {}) {
  const n = toFiniteNumber(value);
  if (n === null) return PLACEHOLDER;
  const pct = fraction ? n * 100 : n;
  return `${pct.toFixed(decimals)}%`;
}
