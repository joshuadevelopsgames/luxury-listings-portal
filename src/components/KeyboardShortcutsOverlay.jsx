import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Command, Keyboard } from 'lucide-react';

/**
 * KeyboardShortcutsOverlay — Press ? anywhere to open.
 * Lists all global keyboard shortcuts in an Apple-style modal.
 */
const KeyboardShortcutsOverlay = ({ isOpen, onClose }) => {
  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sections = [
    {
      title: 'Global',
      shortcuts: [
        { keys: ['⌘', 'K'], label: 'Open command palette' },
        { keys: ['?'], label: 'Show keyboard shortcuts' },
        { keys: ['Esc'], label: 'Close modal / palette' },
      ],
    },
    {
      title: 'Tasks',
      shortcuts: [
        { keys: ['N'], label: 'New task (when on Tasks page)' },
        { keys: ['⌘', 'K'], label: 'Quick add task (when on Tasks page)' },
        { keys: ['Esc'], label: 'Close task form' },
      ],
    },
    {
      title: 'Navigation',
      shortcuts: [
        { keys: ['↑', '↓'], label: 'Move through command palette results' },
        { keys: ['↵'], label: 'Open selected result' },
      ],
    },
    {
      title: 'Sidebar',
      shortcuts: [
        { keys: ['⌘', '\\'], label: 'Collapse / expand sidebar' },
      ],
    },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[310] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-2.5">
            <Keyboard className="w-5 h-5 text-[#86868b]" strokeWidth={1.5} />
            <h2 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4 text-[#86868b]" strokeWidth={1.5} />
          </button>
        </div>

        {/* Shortcut sections */}
        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wider mb-2.5">
                {section.title}
              </p>
              <div className="space-y-1.5">
                {section.shortcuts.map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-black/[0.03] dark:hover:bg-white/[0.03]">
                    <span className="text-[13px] text-[#1d1d1f] dark:text-[#f5f5f7]">{s.label}</span>
                    <div className="flex items-center gap-1">
                      {s.keys.map((k, ki) => (
                        <React.Fragment key={ki}>
                          <kbd className="px-2 py-1 bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/10 rounded-md text-[12px] font-medium text-[#1d1d1f] dark:text-white font-mono leading-none">
                            {k}
                          </kbd>
                          {ki < s.keys.length - 1 && (
                            <span className="text-[10px] text-[#86868b]">+</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-black/5 dark:border-white/5">
          <p className="text-[11px] text-[#86868b] text-center">
            Press <kbd className="px-1.5 py-0.5 bg-black/5 dark:bg-white/10 rounded text-[10px] font-mono">?</kbd> at any time to show this
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default KeyboardShortcutsOverlay;
