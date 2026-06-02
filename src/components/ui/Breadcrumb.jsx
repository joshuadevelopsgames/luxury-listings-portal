import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ArrowLeft } from 'lucide-react';

/**
 * Breadcrumb — lightweight breadcrumb / back-to-context strip.
 *
 * Usage:
 *   <Breadcrumb items={[
 *     { label: 'My Clients', path: '/my-clients' },
 *     { label: 'Acme Corp' },          // last item = current page (no path)
 *   ]} />
 *
 * The first item is rendered as an ← back button on mobile,
 * and the full chain is shown on sm+ screens.
 */
const Breadcrumb = ({ items = [] }) => {
  const navigate = useNavigate();

  if (!items.length) return null;

  const parent = items[items.length - 2] ?? null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px] mb-1">
      {/* Mobile: just show ← Parent */}
      {parent && (
        <button
          type="button"
          onClick={() => navigate(parent.path)}
          className="sm:hidden flex items-center gap-1 text-[#0071e3] hover:underline font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {parent.label}
        </button>
      )}

      {/* Desktop: full chain */}
      <ol className="hidden sm:flex items-center gap-1.5">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={i} className="flex items-center gap-1.5">
              {isLast ? (
                <span className="text-[#1d1d1f] dark:text-white font-medium truncate max-w-[200px]">
                  {item.label}
                </span>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => item.path && navigate(item.path)}
                    className="text-[#0071e3] hover:underline truncate max-w-[160px]"
                  >
                    {item.label}
                  </button>
                  <ChevronRight className="w-3 h-3 text-[#86868b] flex-shrink-0" />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
