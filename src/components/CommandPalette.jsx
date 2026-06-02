import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Search, X, ArrowRight, Home, CheckSquare, Users, Calendar, Settings,
  FileText, Instagram, BarChart3, Target, Palette, Sparkles, Wrench,
  TrendingUp, Activity, Briefcase, User, Clock, Command, Plus, Share2,
  ChevronRight
} from 'lucide-react';

/**
 * CommandPalette — Global Cmd+K search and navigation
 * Searches pages, clients, and quick actions.
 * Keyboard navigable: ↑↓ to move, Enter to open, Esc to close.
 */
const CommandPalette = ({ isOpen, onClose, allPages = {}, clients = [], basePath = '' }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const navigate = useNavigate();

  // Focus input and reset state whenever palette opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      const t = setTimeout(() => inputRef.current?.focus(), 40);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Quick actions available regardless of search query
  const quickActions = [
    {
      type: 'action', id: 'new-task',
      label: 'New Task',
      subtitle: 'Open Tasks and add a task',
      icon: CheckSquare,
      path: `${basePath}/tasks`,
    },
    {
      type: 'action', id: 'new-report',
      label: 'New Instagram Report',
      subtitle: 'Open Analytics and create a report',
      icon: Instagram,
      path: `${basePath}/instagram-reports`,
    },
    {
      type: 'action', id: 'my-clients',
      label: 'My Clients',
      subtitle: 'View your assigned clients',
      icon: Users,
      path: `${basePath}/my-clients`,
    },
  ];

  // Build the flat results list based on query
  const { groups, selectableItems } = useMemo(() => {
    const q = query.toLowerCase().trim();

    // Pages — filter by name match
    const matchedPages = Object.entries(allPages)
      .filter(([, page]) => !q || page.name.toLowerCase().includes(q))
      .slice(0, q ? 6 : 5)
      .map(([id, page]) => ({
        type: 'page',
        id,
        label: page.name,
        path: page.path,
        icon: page.icon,
      }));

    // Clients — only shown when there is a query
    const matchedClients = q
      ? clients
          .filter(c => (c.clientName || c.name || '').toLowerCase().includes(q))
          .slice(0, 5)
          .map(c => ({
            type: 'client',
            id: c.id,
            label: c.clientName || c.name || 'Unnamed Client',
            subtitle: c.instagramHandle ? `@${(c.instagramHandle).replace(/^@/, '')}` : c.location || null,
            path: `${basePath}/my-clients/${c.id}`,
            icon: Users,
          }))
      : [];

    // Actions — filter or show all when no query
    const matchedActions = quickActions.filter(
      a => !q || a.label.toLowerCase().includes(q) || (a.subtitle || '').toLowerCase().includes(q)
    );

    const groupList = [];
    const allSelectable = [];

    if (matchedPages.length) {
      groupList.push({ label: q ? 'Pages' : 'Navigation', items: matchedPages });
      allSelectable.push(...matchedPages);
    }
    if (matchedClients.length) {
      groupList.push({ label: 'Clients', items: matchedClients });
      allSelectable.push(...matchedClients);
    }
    if (matchedActions.length) {
      groupList.push({ label: 'Quick Actions', items: matchedActions });
      allSelectable.push(...matchedActions);
    }

    return { groups: groupList, selectableItems: allSelectable };
  }, [query, allPages, clients, basePath]);

  // Reset selected index when results change
  useEffect(() => { setSelectedIndex(0); }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selectedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, selectableItems.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter') {
        const item = selectableItems[selectedIndex];
        if (item?.path) { navigate(item.path); onClose(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, selectedIndex, selectableItems, navigate, onClose]);

  if (!isOpen) return null;

  // Track selectable index while rendering groups
  let selectableIdx = -1;

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-start justify-center pt-[12vh] px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-[560px] bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">

        {/* Search Row */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-black/5 dark:border-white/5">
          <Search className="w-[18px] h-[18px] text-[#86868b] flex-shrink-0" strokeWidth={1.5} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search pages, clients, actions…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-[15px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] outline-none"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4 text-[#86868b]" />
            </button>
          ) : (
            <kbd className="flex items-center px-1.5 py-0.5 bg-black/5 dark:bg-white/10 rounded text-[11px] text-[#86868b] font-medium">
              esc
            </kbd>
          )}
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[380px] overflow-y-auto py-2">
          {groups.length === 0 ? (
            <div className="py-14 text-center">
              <Search className="w-10 h-10 text-[#86868b]/30 mx-auto mb-3" strokeWidth={1} />
              <p className="text-[14px] text-[#86868b]">No results for "<span className="text-[#1d1d1f] dark:text-white">{query}</span>"</p>
              <p className="text-[12px] text-[#86868b]/60 mt-1">Try a page name or client name</p>
            </div>
          ) : (
            groups.map((group, gIdx) => (
              <div key={gIdx}>
                <p className="px-4 pt-2 pb-1 text-[11px] font-semibold text-[#86868b] uppercase tracking-wider">
                  {group.label}
                </p>
                {group.items.map((item) => {
                  selectableIdx++;
                  const currentIdx = selectableIdx;
                  const isSelected = currentIdx === selectedIndex;
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-idx={currentIdx}
                      onClick={() => { navigate(item.path); onClose(); }}
                      onMouseEnter={() => setSelectedIndex(currentIdx)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        isSelected
                          ? 'bg-[#0071e3]/10'
                          : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.03]'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-[#0071e3]/15' : 'bg-black/5 dark:bg-white/10'
                      }`}>
                        {Icon && (
                          <Icon
                            className={`w-3.5 h-3.5 ${isSelected ? 'text-[#0071e3]' : 'text-[#86868b]'}`}
                            strokeWidth={1.5}
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={`text-[13px] font-medium truncate block ${
                          isSelected ? 'text-[#0071e3]' : 'text-[#1d1d1f] dark:text-[#f5f5f7]'
                        }`}>
                          {item.label}
                        </span>
                        {item.subtitle && (
                          <span className="text-[11px] text-[#86868b] truncate block mt-0.5">
                            {item.subtitle}
                          </span>
                        )}
                      </div>
                      <ChevronRight
                        className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-[#0071e3]' : 'text-[#86868b]/40'}`}
                        strokeWidth={1.5}
                      />
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint row */}
        <div className="px-4 py-2.5 border-t border-black/5 dark:border-white/5 flex items-center gap-4 text-[11px] text-[#86868b]">
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-black/5 dark:bg-white/10 rounded text-[10px] font-mono">↑↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-black/5 dark:bg-white/10 rounded text-[10px] font-mono">↵</kbd>
            open
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-black/5 dark:bg-white/10 rounded text-[10px] font-mono">esc</kbd>
            close
          </span>
          <span className="ml-auto flex items-center gap-1">
            <Command className="w-3 h-3" strokeWidth={1.5} />
            <span>K</span>
            <span className="text-[#86868b]/50 ml-1">anywhere</span>
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CommandPalette;
