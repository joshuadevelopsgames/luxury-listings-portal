import React from 'react';
import { PLACEHOLDER } from '../../utils/formatStat';

/**
 * The single stat-card treatment for the app.
 *
 * Colour rules this component exists to enforce:
 *  - the value is always ink. Colour lands on the delta/status line, where
 *    it carries meaning, not on a 24px numeral where it is decoration.
 *  - the icon sits in a neutral chip.
 * Everything resolves through design tokens, so the card restyles itself
 * between the light and dark themes with no `dark:` variants here.
 */
const TONE = {
  neutral:  'text-ink-subtle',
  positive: 'text-positive',
  warning:  'text-warning',
  critical: 'text-danger',
  brand:    'text-brand',
};

export default function StatCard({
  label,
  value,
  icon: Icon,
  status,
  statusTone = 'neutral',
  onClick,
  className = '',
}) {
  const interactive = typeof onClick === 'function';
  const Container = interactive ? 'button' : 'div';

  return (
    <Container
      {...(interactive ? { type: 'button', onClick } : {})}
      className={`w-full text-left rounded-xl bg-surface border border-hairline shadow-sm p-4 ${
        interactive ? 'transition-colors hover:border-hairline-strong' : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11.5px] font-medium text-ink-muted truncate">{label}</p>
          <p className="text-[23px] leading-none font-semibold text-ink mt-2 tabular-nums tracking-[-.02em]">
            {value === null || value === undefined || value === '' ? PLACEHOLDER : value}
          </p>
          {status && (
            <p className={`text-[11px] mt-2 ${TONE[statusTone] || TONE.neutral}`}>{status}</p>
          )}
        </div>
        {Icon && (
          <div className="shrink-0 p-2 rounded-lg bg-surface-3">
            <Icon className="w-4 h-4 text-ink-subtle" />
          </div>
        )}
      </div>
    </Container>
  );
}
