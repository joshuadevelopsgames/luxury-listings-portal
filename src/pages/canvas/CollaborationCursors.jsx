import React from 'react';

/**
 * Renders remote collaborators' carets from Supabase presence (x/y client coords).
 */
export default function CollaborationCursors({ others = [] }) {
  if (!others?.length) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[40] overflow-hidden" aria-hidden>
      {others.map((o, i) => {
        const c = o?.cursor;
        if (!c || typeof c.x !== 'number' || typeof c.y !== 'number') return null;
        return (
          <div
            key={`${o.userId || 'u'}-${i}`}
            className="absolute flex flex-col items-start"
            style={{
              left: c.x,
              top: c.y,
              transform: 'translate(-1px, 0)',
            }}
          >
            <span
              className="text-[10px] font-semibold px-1 py-0.5 rounded shadow-sm max-w-[140px] truncate text-white"
              style={{ backgroundColor: o.color || '#2563eb' }}
            >
              {o.name || o.email || 'Collaborator'}
            </span>
            <div
              className="w-px rounded-full"
              style={{
                backgroundColor: o.color || '#2563eb',
                height: Math.max(16, c.height || 18),
                marginLeft: 0,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
