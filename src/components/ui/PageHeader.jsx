import React from 'react';

/**
 * The single page-title treatment for the app.
 *
 * Deliberately smaller and lighter than the 34px bold titles it replaces:
 * the sidebar already tells the user where they are, so the heading is a
 * label, not a billboard. `description` is optional and should be used only
 * when it carries information the title does not — not for marketing copy.
 */
export default function PageHeader({ title, description, actions, className = '' }) {
  return (
    <div
      className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${className}`}
    >
      <div className="min-w-0">
        <h1 className="text-[20px] sm:text-[24px] font-semibold text-ink tracking-[-0.02em] truncate">
          {title}
        </h1>
        {description && (
          <p className="text-[13px] text-ink-muted mt-0.5">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
}
