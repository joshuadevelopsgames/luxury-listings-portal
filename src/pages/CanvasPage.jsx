import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useConfirm } from '../contexts/ConfirmContext';
import toast from 'react-hot-toast';
import { firestoreService } from '../services/firestoreService';
import CanvasBlockEditor, { blockId } from './canvas/CanvasBlockEditor';
import {
  PencilRuler,
  Plus,
  Search,
  X,
  Menu,
  RotateCcw,
  RotateCw,
  Download,
  MoreHorizontal,
  Copy,
  Trash2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  Lightbulb,
  Minus,
  Link2,
  Heading1,
  Heading2,
  Heading3,
  FolderOpen,
} from 'lucide-react';

const EMOJIS = ['📄', '📝', '📋', '📑', '🗒️', '📌', '📎', '💡', '🎯', '🚀', '🔥', '⭐', '💎', '🎨', '📊', '📈', '🏆', '💼', '🧠', '❤️', '✅', '🌟', '🌈', '🔔', '⚡'];

function uid() {
  return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function dateStr(ts) {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export default function CanvasPage() {
  const { currentUser } = useAuth();
  const confirm = useConfirm();

  const [canvases, setCanvases] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [search, setSearch] = useState('');
  const [contextOpen, setContextOpen] = useState(false);
  const [contextPos, setContextPos] = useState({ top: 0, left: 0 });
  const [linkModal, setLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [wordCountStr, setWordCountStr] = useState('0 words · 0 characters');
  const [loading, setLoading] = useState(true);
  const persistBlocksTimerRef = useRef(null);

  const uid = currentUser?.uid ?? null;
  const activeCanvas = canvases.find((c) => c.id === activeId);
  const filteredCanvases = search.trim()
    ? canvases.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()))
    : canvases;

  const updateActiveBlocks = useCallback(
    (blocks) => {
      if (!activeId) return;
      setCanvases((prev) =>
        prev.map((c) =>
          c.id === activeId ? { ...c, blocks, updated: Date.now() } : c
        )
      );
      if (persistBlocksTimerRef.current) clearTimeout(persistBlocksTimerRef.current);
      persistBlocksTimerRef.current = setTimeout(() => {
        persistBlocksTimerRef.current = null;
        if (uid && activeId) {
          firestoreService.updateCanvas(uid, activeId, { blocks }).catch(() => toast.error('Failed to save'));
        }
      }, 1200);
    },
    [activeId, uid]
  );

  const createCanvas = useCallback(
    (title = 'Untitled Canvas', emoji = '📄') => {
      if (!uid) return;
      const initialBlocks = [{ id: blockId(), type: 'text', content: '' }];
      const c = {
        id: uid(),
        title,
        emoji,
        blocks: initialBlocks,
        created: Date.now(),
        updated: Date.now(),
      };
      setCanvases((prev) => [c, ...prev]);
      setActiveId(c.id);
      firestoreService.createCanvas(uid, c).catch(() => toast.error('Failed to create canvas'));
      return c;
    },
    [uid]
  );

  const openCanvas = useCallback(
    (id) => {
      if (persistBlocksTimerRef.current) {
        clearTimeout(persistBlocksTimerRef.current);
        persistBlocksTimerRef.current = null;
      }
      const prev = canvases.find((x) => x.id === activeId);
      if (uid && activeId && prev?.blocks) {
        firestoreService.updateCanvas(uid, activeId, { blocks: prev.blocks }).catch(() => {});
      }
      const c = canvases.find((x) => x.id === id);
      if (!c) return;
      setActiveId(id);
      setSidebarOpen(false);
    },
    [canvases, activeId, uid]
  );

  const deleteCanvas = useCallback(
    async (id) => {
      const c = canvases.find((x) => x.id === id);
      const ok = await confirm({
        title: 'Delete Canvas',
        message: `Delete "${c?.title ?? 'Canvas'}"? This cannot be undone.`,
        confirmText: 'Delete',
        variant: 'danger',
      });
      if (ok && uid) {
        try {
          await firestoreService.deleteCanvas(uid, id);
          setCanvases((prev) => prev.filter((x) => x.id !== id));
          if (activeId === id) setActiveId(null);
          toast.success('Canvas deleted');
        } catch {
          toast.error('Failed to delete canvas');
        }
      }
    },
    [canvases, activeId, confirm, uid]
  );

  const duplicateCanvas = useCallback(
    (id) => {
      if (!uid) return;
      const src = canvases.find((c) => c.id === id);
      if (!src) return;
      const blocks = Array.isArray(src.blocks) && src.blocks.length
        ? src.blocks.map((b) => ({ ...b, id: blockId() }))
        : [{ id: blockId(), type: 'text', content: '' }];
      const c = {
        id: uid(),
        title: src.title + ' (copy)',
        emoji: src.emoji,
        blocks,
        created: Date.now(),
        updated: Date.now(),
      };
      setCanvases((prev) => [c, ...prev]);
      setActiveId(c.id);
      firestoreService.createCanvas(uid, c).catch(() => toast.error('Failed to duplicate canvas'));
      toast.success('Canvas duplicated');
    },
    [canvases, uid]
  );

  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    firestoreService
      .getCanvases(uid)
      .then((list) => {
        setCanvases(list);
        setActiveId(null);
      })
      .catch(() => toast.error('Failed to load canvases'))
      .finally(() => setLoading(false));
  }, [uid]);


  const updateActiveMeta = useCallback(
    (patch) => {
      if (!activeId || !uid) return;
      setCanvases((prev) =>
        prev.map((c) => (c.id === activeId ? { ...c, ...patch, updated: Date.now() } : c))
      );
      firestoreService.updateCanvas(uid, activeId, patch).catch(() => toast.error('Failed to save'));
    },
    [activeId, uid]
  );

  const handleExport = () => {
    if (!activeCanvas) return;
    const blocks = activeCanvas.blocks || [];
    const text = blocks
      .map((b) => {
        if (b.type === 'checklist') {
          try {
            const items = JSON.parse(b.content || '[]');
            return items.map((i) => (i.checked ? '[x] ' : '[ ] ') + (i.text || '').replace(/<[^>]+>/g, '')).join('\n');
          } catch {
            return '';
          }
        }
        return (b.content || '').replace(/<[^>]+>/g, ' ');
      })
      .join('\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (activeCanvas.title || 'canvas') + '.txt';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported');
  };

  const insertLink = () => {
    if (linkUrl.trim()) {
      document.execCommand('createLink', false, linkUrl.trim());
      toast.success('Link inserted');
    }
    setLinkModal(false);
    setLinkUrl('');
  };

  if (!currentUser) return null;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-[#1a1329] overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-30 w-[280px] min-w-[280px] flex flex-col bg-[#231b33] border-r border-white/10 transition-transform duration-300 md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7b5ea7] to-[#b494da] flex items-center justify-center text-white">
              <PencilRuler className="w-4 h-4" />
            </div>
            <h2 className="text-white font-bold text-[15px]">Canvases</h2>
          </div>
          <button
            type="button"
            className="md:hidden p-1.5 text-[#cfc3e0] hover:bg-white/10 rounded"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-3 pt-2">
          <button
            type="button"
            onClick={() => createCanvas()}
            className="w-full py-2.5 px-3.5 rounded-md bg-[#7b5ea7] hover:bg-[#6a4e94] text-white font-bold text-sm flex items-center justify-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" /> New Canvas
          </button>
        </div>
        <div className="relative px-3.5 pb-3">
          <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#a393b8]/70 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search canvases…"
            className="w-full pl-9 pr-3 py-2 rounded-md border border-white/10 bg-white/5 text-[#cfc3e0] placeholder:text-[#a393b8]/60 text-sm outline-none focus:border-[#7b5ea7] focus:bg-white/10"
          />
        </div>
        <div className="px-4 pt-2 text-[11px] font-bold uppercase tracking-wider text-[#a393b8]">
          Your Canvases
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-4 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-[#7b5ea7] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredCanvases.length === 0 ? (
            <div className="text-center py-8 text-[#a393b8] text-sm">
              <FolderOpen className="w-9 h-9 mx-auto mb-3 opacity-40" />
              {search.trim() ? 'No canvases match your search.' : 'No canvases yet.'}
            </div>
          ) : (
            <ul className="space-y-0.5">
              {filteredCanvases.map((c) => (
                <li
                  key={c.id}
                  onClick={() => openCanvas(c.id)}
                  className={`flex items-center gap-2.5 py-2.5 px-3 rounded-md cursor-pointer transition-colors group ${
                    c.id === activeId
                      ? 'bg-[#3b2f52]'
                      : 'hover:bg-[#2e2445]'
                  }`}
                >
                  <span className="text-base flex-shrink-0 w-5 text-center">{c.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-sm truncate ${c.id === activeId ? 'text-white font-bold' : 'text-[#cfc3e0]'}`}
                    >
                      {c.title}
                    </div>
                    <div className="text-[11px] text-[#a393b8]/60">{dateStr(c.updated)}</div>
                  </div>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateCanvas(c.id);
                      }}
                      className="p-1.5 rounded text-[#a393b8] hover:bg-white/10 hover:text-white"
                      title="Duplicate"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteCanvas(c.id);
                      }}
                      className="p-1.5 rounded text-[#a393b8] hover:bg-white/10 hover:text-[#e05260]"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      {/* Main */}
      <main className="flex-1 flex flex-col bg-white dark:bg-[#1e1a2a] min-w-0">
        {!activeId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10 text-[#616061] dark:text-[#a393b8]">
            <div className="w-[100px] h-[100px] rounded-2xl bg-gradient-to-br from-[#ede4f7] to-[#f8f7fa] dark:from-[#3b2f52] dark:to-[#271f38] flex items-center justify-center text-[#7b5ea7] mb-6">
              <PencilRuler className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-[#1d1c1d] dark:text-[#e4dced] mb-2">
              Your Canvas Workspace
            </h3>
            <p className="text-sm max-w-[340px] leading-relaxed mb-5">
              Create rich documents with blocks, checklists, media, and slash commands. Type{' '}
              <strong>/</strong> for quick commands. Drag to reorder blocks.
            </p>
            <button
              type="button"
              onClick={() => createCanvas()}
              className="inline-flex items-center gap-1.5 py-2.5 px-5 rounded-md bg-[#7b5ea7] hover:bg-[#6a4e94] text-white font-bold text-sm"
            >
              <Plus className="w-4 h-4" /> Create Your First Canvas
            </button>
          </div>
        ) : (
          <>
            {/* Top bar */}
            <div className="h-[52px] flex items-center gap-2.5 px-4 border-b border-[#e8e3ef] dark:border-[#3b2f52] bg-[#f8f7fa] dark:bg-[#271f38] flex-shrink-0">
              <button
                type="button"
                className="md:hidden p-1.5 text-[#616061] dark:text-[#a393b8] hover:bg-black/5 dark:hover:bg-white/10 rounded"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                <Menu className="w-4 h-4" />
              </button>
              <div className="flex-1 flex items-center gap-2 min-w-0 relative">
                <button
                  type="button"
                  onClick={() => setEmojiPickerOpen((o) => !o)}
                  className="text-xl p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 shrink-0"
                >
                  {activeCanvas?.emoji ?? '📄'}
                </button>
                {emojiPickerOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setEmojiPickerOpen(false)}
                      aria-hidden
                    />
                    <div className="absolute top-full left-0 mt-1 z-50 w-[270px] p-3 bg-white dark:bg-[#231b33] border border-[#e8e3ef] dark:border-[#3b2f52] rounded-xl shadow-xl grid grid-cols-7 gap-1">
                      {EMOJIS.map((e) => (
                        <button
                          key={e}
                          type="button"
                          className="text-2xl p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10"
                          onClick={() => {
                            updateActiveMeta({ emoji: e });
                            setEmojiPickerOpen(false);
                          }}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                <input
                  type="text"
                  value={activeCanvas?.title ?? ''}
                  onChange={(e) => updateActiveMeta({ title: e.target.value })}
                  className="flex-1 min-w-0 px-1.5 py-1 rounded text-base font-bold text-[#1d1c1d] dark:text-[#e4dced] bg-transparent border-none outline-none focus:bg-black/5 dark:focus:bg-white/10"
                  spellCheck={false}
                />
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => document.execCommand('undo')}
                  className="p-2 rounded text-[#616061] dark:text-[#a393b8] hover:bg-black/5 dark:hover:bg-white/10"
                  title="Undo"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => document.execCommand('redo')}
                  className="p-2 rounded text-[#616061] dark:text-[#a393b8] hover:bg-black/5 dark:hover:bg-white/10"
                  title="Redo"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleExport}
                  className="p-2 rounded text-[#616061] dark:text-[#a393b8] hover:bg-black/5 dark:hover:bg-white/10"
                  title="Export"
                >
                  <Download className="w-4 h-4" />
                </button>
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setContextPos({ top: rect.bottom + 4, left: rect.right - 180 });
                      setContextOpen(true);
                    }}
                    className="p-2 rounded text-[#616061] dark:text-[#a393b8] hover:bg-black/5 dark:hover:bg-white/10"
                    title="More"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                  {contextOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setContextOpen(false)}
                        aria-hidden
                      />
                      <div
                        className="fixed z-50 min-w-[180px] py-1.5 px-1.5 bg-white dark:bg-[#231b33] border border-[#e8e3ef] dark:border-[#3b2f52] rounded-xl shadow-xl"
                        style={{ top: contextPos.top, left: contextPos.left }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            duplicateCanvas(activeId);
                            setContextOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 py-2 px-3 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-left text-sm"
                        >
                          <Copy className="w-4 h-4 text-[#616061]" /> Duplicate
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            deleteCanvas(activeId);
                            setContextOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 py-2 px-3 rounded-md hover:bg-red-500/10 text-red-600 dark:text-red-400 text-left text-sm"
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Format toolbar */}
            <div className="h-[46px] flex items-center gap-0.5 px-4 border-b border-[#e8e3ef] dark:border-[#3b2f52] bg-[#f8f7fa] dark:bg-[#271f38] flex-shrink-0 overflow-x-auto">
              <FormatBtn cmd="bold" icon={<Bold className="w-3.5 h-3.5" />} />
              <FormatBtn cmd="italic" icon={<Italic className="w-3.5 h-3.5" />} />
              <FormatBtn cmd="underline" icon={<Underline className="w-3.5 h-3.5" />} />
              <FormatBtn cmd="strikeThrough" icon={<Strikethrough className="w-3.5 h-3.5" />} />
              <div className="w-px h-5 bg-[#e8e3ef] dark:bg-[#3b2f52] mx-1" />
              <button
                type="button"
                onClick={() => document.execCommand('insertUnorderedList')}
                className="p-2 rounded hover:bg-[#ede8f5] dark:hover:bg-[#3b2f52] text-[#616061] dark:text-[#a393b8]"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => document.execCommand('insertOrderedList')}
                className="p-2 rounded hover:bg-[#ede8f5] dark:hover:bg-[#3b2f52] text-[#616061] dark:text-[#a393b8]"
              >
                <ListOrdered className="w-4 h-4" />
              </button>
              <div className="w-px h-5 bg-[#e8e3ef] dark:bg-[#3b2f52] mx-1" />
              <button
                type="button"
                onClick={() => setLinkModal(true)}
                className="p-2 rounded hover:bg-[#ede8f5] dark:hover:bg-[#3b2f52] text-[#616061] dark:text-[#a393b8]"
                title="Insert link"
              >
                <Link2 className="w-4 h-4" />
              </button>
            </div>

            {/* Block editor */}
            <CanvasBlockEditor
              blocks={activeCanvas?.blocks ?? []}
              onBlocksChange={updateActiveBlocks}
              onWordCountChange={setWordCountStr}
            />

            {/* Word count */}
            <div className="h-7 flex items-center justify-end px-5 border-t border-[#e8e3ef] dark:border-[#3b2f52] bg-[#f8f7fa] dark:bg-[#271f38] text-[11px] text-[#a0a0a0] dark:text-[#6d5f80]">
              {wordCountStr}
            </div>
          </>
        )}
      </main>

      {/* Link modal */}
      {linkModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-black/45">
          <div className="bg-white dark:bg-[#231b33] rounded-xl shadow-xl p-7 max-w-md w-full">
            <h3 className="text-lg font-bold text-[#1d1c1d] dark:text-[#e4dced] mb-2">
              Insert Link
            </h3>
            <p className="text-sm text-[#616061] dark:text-[#a393b8] mb-4">Enter the URL:</p>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-3.5 py-2.5 rounded-md border border-[#ddd6e5] dark:border-[#3b2f52] bg-white dark:bg-[#1e1a2a] text-[#1d1c1d] dark:text-[#e4dced] text-sm outline-none focus:border-[#7b5ea7]"
              onKeyDown={(e) => e.key === 'Enter' && insertLink()}
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  setLinkModal(false);
                  setLinkUrl('');
                }}
                className="px-4 py-2 rounded-md bg-[#ede8f5] dark:bg-[#3b2f52] text-[#616061] dark:text-[#a393b8] font-semibold text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={insertLink}
                className="px-4 py-2 rounded-md bg-[#7b5ea7] hover:bg-[#6a4e94] text-white font-semibold text-sm"
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FormatBtn({ cmd, icon }) {
  const [active, setActive] = useState(false);
  const update = () => {
    const el = document.activeElement;
    if (!el?.isContentEditable) return;
    setActive(document.queryCommandState(cmd));
  };
  useEffect(() => {
    document.addEventListener('selectionchange', update);
    return () => document.removeEventListener('selectionchange', update);
  }, [cmd]);
  return (
    <button
      type="button"
      onClick={() => {
        document.execCommand(cmd, false, null);
        update();
      }}
      className={`p-2 rounded hover:bg-[#ede8f5] dark:hover:bg-[#3b2f52] ${active ? 'bg-[#d9d0ea] dark:bg-[#4a3c64] text-[#7b5ea7]' : 'text-[#616061] dark:text-[#a393b8]'}`}
    >
      {icon}
    </button>
  );
}
