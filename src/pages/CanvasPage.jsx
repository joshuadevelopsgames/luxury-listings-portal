import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { firestoreService } from '../services/firestoreService';
import { openaiService } from '../services/openaiService';
import CanvasBlockEditor, { blockId } from './canvas/CanvasBlockEditor';

function extractMentionedEmails(blocks) {
  const emails = new Set();
  if (!Array.isArray(blocks)) return emails;
  blocks.forEach((b) => {
    const html = b.content || '';
    const regex = /@\[[^\]]*\]\(([^)]+)\)/g;
    let m;
    while ((m = regex.exec(html)) !== null) emails.add(m[1].trim().toLowerCase());
  });
  return emails;
}

function blockSearchableText(block) {
  if (block.type === 'checklist') {
    try {
      const items = JSON.parse(block.content || '[]');
      return items.map((i) => i.text).join(' ');
    } catch { return ''; }
  }
  if (block.type === 'poll') {
    try {
      const d = JSON.parse(block.content || '{}');
      return (d.question || '') + ' ' + (d.options || []).map((o) => o.text).join(' ');
    } catch { return ''; }
  }
  if (block.type === 'form') {
    try {
      const d = JSON.parse(block.content || '{}');
      return (d.title || '') + ' ' + (d.fields || []).map((f) => f.label).join(' ');
    } catch { return ''; }
  }
  if (block.type === 'image' || block.type === 'video') return block.caption || '';
  return (block.content || '').replace(/<[^>]+>/g, ' ');
}

function searchBlocksInCanvases(canvasesList, query) {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const results = [];
  canvasesList.forEach((canvas) => {
    const blocks = canvas.blocks || [];
    blocks.forEach((block) => {
      const text = blockSearchableText(block);
      if (text.toLowerCase().includes(q)) {
        const excerpt = text.replace(/\s+/g, ' ').trim().slice(0, 60) + (text.length > 60 ? '…' : '');
        results.push({
          canvasId: canvas.id,
          canvasTitle: canvas.title || 'Untitled',
          blockId: block.id,
          blockType: block.type,
          excerpt,
        });
      }
    });
  });
  return results.slice(0, 20);
}
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
  UserPlus,
  History,
  Keyboard,
  Sparkles,
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
  const [searchParams, setSearchParams] = useSearchParams();

  const [canvases, setCanvases] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [search, setSearch] = useState('');
  const [contextOpen, setContextOpen] = useState(false);
  const [contextPos, setContextPos] = useState({ top: 0, left: 0 });
  const [linkModal, setLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const linkSavedSelectionRef = useRef(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState('mine'); // 'mine' | 'shared'
  const [sharedCanvases, setSharedCanvases] = useState([]);
  const [sharedLoading, setSharedLoading] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareSelectedUser, setShareSelectedUser] = useState('');
  const [shareSubmitting, setShareSubmitting] = useState(false);
  const [shareCollaborators, setShareCollaborators] = useState([]);
  const [approvedUsers, setApprovedUsers] = useState([]);
  const [wordCountStr, setWordCountStr] = useState('0 words · 0 characters');
  const [loading, setLoading] = useState(true);
  const [highlightBlockId, setHighlightBlockId] = useState(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyVersions, setHistoryVersions] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [aiMenuOpen, setAiMenuOpen] = useState(false);
  const [aiAssistLoading, setAiAssistLoading] = useState(false);
  const persistBlocksTimerRef = useRef(null);
  const canvasEditorRef = useRef(null);
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const [restoreKey, setRestoreKey] = useState(0); // bump on undo/redo so contenteditable remounts with restored content
  const MAX_UNDO = 50;

  const userId = currentUser?.uid ?? null;
  const userEmail = currentUser?.email ?? null;
  const activeCanvas = canvases.find((c) => c.id === activeId) ?? sharedCanvases.find((c) => c.id === activeId);
  const filteredCanvases = search.trim()
    ? canvases.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()))
    : canvases;
  const filteredSharedCanvases = search.trim()
    ? sharedCanvases.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()))
    : sharedCanvases;
  const isOwner = activeCanvas && userId && (canvases.some((c) => c.id === activeId) || activeCanvas.userId === userId);
  const canShare = isOwner;

  const pushUndo = useCallback((blocks) => {
    if (!blocks?.length) return;
    const copy = JSON.parse(JSON.stringify(blocks));
    const key = JSON.stringify(copy);
    const stack = undoStackRef.current;
    if (stack.length && JSON.stringify(stack[stack.length - 1]) === key) return;
    if (stack.length >= MAX_UNDO) stack.shift();
    stack.push(copy);
  }, []);

  const updateActiveBlocks = useCallback(
    (blocks, opts = {}) => {
      if (!activeId) return;
      if (!opts.skipUndoPush && activeCanvas?.blocks) {
        pushUndo(activeCanvas.blocks);
        redoStackRef.current = [];
      }
      setCanvases((prev) =>
        prev.map((c) =>
          c.id === activeId ? { ...c, blocks, updated: Date.now() } : c
        )
      );
      if (persistBlocksTimerRef.current) clearTimeout(persistBlocksTimerRef.current);
      persistBlocksTimerRef.current = setTimeout(() => {
        persistBlocksTimerRef.current = null;
        if (activeId && (userId || activeCanvas?.userId)) {
          const ownerId = activeCanvas?.userId ?? userId;
          firestoreService.updateCanvas(ownerId, activeId, { blocks }).catch((err) => {
            console.error('Canvas save error (blocks):', err);
            toast.error('Failed to save');
          });
          if (isOwner) {
            firestoreService.saveCanvasHistorySnapshot(activeId, {
              blocks,
              title: activeCanvas?.title,
              createdBy: userEmail,
            }).catch(() => {});
          }
          if (sharedCanvases.some((c) => c.id === activeId)) {
            setSharedCanvases((prev) => prev.map((c) => (c.id === activeId ? { ...c, blocks, updated: Date.now() } : c)));
          }
          const prevEmails = extractMentionedEmails(activeCanvas?.blocks);
          const newEmails = extractMentionedEmails(blocks);
          const currentEmail = (currentUser?.email || '').toLowerCase();
          const excerpt = blocks.slice(0, 3).map((b) => (b.content || '').replace(/<[^>]+>/g, ' ').trim()).join(' ').slice(0, 80) + (blocks.length > 3 ? '…' : '');
          for (const email of newEmails) {
            if (email && email !== currentEmail && !prevEmails.has(email)) {
              let blockIdForLink = blocks[0]?.id || '';
              for (const b of blocks) {
                if ((b.content || '').toLowerCase().includes(email)) {
                  blockIdForLink = b.id;
                  break;
                }
              }
              firestoreService.createNotification({
                userEmail: email,
                type: 'workspace_mention',
                title: 'Mentioned you in a workspace',
                message: excerpt || 'You were mentioned.',
                link: `/workspaces?id=${activeId}&block=${blockIdForLink}`,
                read: false,
              }).catch(() => {});
            }
          }
        }
      }, 1200);
    },
    [activeId, userId, activeCanvas?.blocks, activeCanvas?.userId, pushUndo, sharedCanvases]
  );

  const handleUndo = useCallback(() => {
    if (!activeId || !activeCanvas?.blocks) return;
    const prev = undoStackRef.current.pop();
    if (!prev) return;
    redoStackRef.current.push(JSON.parse(JSON.stringify(activeCanvas.blocks)));
    updateActiveBlocks(prev, { skipUndoPush: true });
    setRestoreKey((k) => k + 1);
  }, [activeId, activeCanvas?.blocks, updateActiveBlocks]);

  const handleRedo = useCallback(() => {
    if (!activeId || !activeCanvas?.blocks) return;
    const next = redoStackRef.current.pop();
    if (!next) return;
    undoStackRef.current.push(JSON.parse(JSON.stringify(activeCanvas.blocks)));
    updateActiveBlocks(next, { skipUndoPush: true });
    setRestoreKey((k) => k + 1);
  }, [activeId, activeCanvas?.blocks, updateActiveBlocks]);

  const createCanvas = useCallback(
    (title = 'Untitled Workspace', emoji = '📄') => {
      if (!userId) {
        toast.error('Please sign in to create workspaces');
        return;
      }
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
      toast.success('Workspace created');
      firestoreService.createCanvas(userId, c).catch((err) => {
        console.error('Canvas create error:', err);
        toast.error('Failed to save workspace');
      });
      return c;
    },
    [userId]
  );

  const openCanvas = useCallback(
    (id) => {
      if (persistBlocksTimerRef.current) {
        clearTimeout(persistBlocksTimerRef.current);
        persistBlocksTimerRef.current = null;
      }
      const prev = canvases.find((x) => x.id === activeId);
      if (userId && activeId && prev?.blocks) {
        firestoreService.updateCanvas(userId, activeId, { blocks: prev.blocks }).catch((err) => {
        console.error('Canvas save error (openCanvas):', err);
      });
      }
      const c = canvases.find((x) => x.id === id);
      if (!c) return;
      setActiveId(id);
      setSidebarOpen(false);
    },
    [canvases, activeId, userId]
  );

  const deleteCanvas = useCallback(
    async (id) => {
      const c = canvases.find((x) => x.id === id);
      const ok = await confirm({
        title: 'Delete Workspace',
        message: `Delete "${c?.title ?? 'Workspace'}"? This cannot be undone.`,
        confirmText: 'Delete',
        variant: 'danger',
      });
      if (ok && userId) {
        try {
          await firestoreService.deleteCanvas(userId, id);
          setCanvases((prev) => prev.filter((x) => x.id !== id));
          if (activeId === id) setActiveId(null);
          toast.success('Workspace deleted');
        } catch (err) {
          console.error('Workspace delete error:', err);
          toast.error('Failed to delete workspace');
        }
      }
    },
    [canvases, activeId, confirm, userId]
  );

  const duplicateCanvas = useCallback(
    (id) => {
      if (!userId) return;
      const src = canvases.find((c) => c.id === id) ?? sharedCanvases.find((c) => c.id === id);
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
      firestoreService.createCanvas(userId, c).catch((err) => {
        console.error('Canvas duplicate error:', err);
        toast.error('Failed to duplicate workspace');
      });
      toast.success('Workspace duplicated');
    },
    [canvases, sharedCanvases, userId]
  );

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    firestoreService
      .getCanvases(userId)
      .then((list) => {
        setCanvases(list);
        setActiveId(null);
      })
      .catch((err) => {
        console.error('Canvas load error:', err);
        toast.error('Failed to load workspaces');
      })
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    if (sidebarTab !== 'shared' || !userEmail) return;
    setSharedLoading(true);
    firestoreService
      .getCanvasesSharedWith(userEmail)
      .then(setSharedCanvases)
      .catch((err) => {
        console.error('Shared workspaces load error:', err);
        toast.error('Failed to load shared workspaces');
      })
      .finally(() => setSharedLoading(false));
  }, [sidebarTab, userEmail]);

  useEffect(() => {
    firestoreService.getApprovedUsers().then(setApprovedUsers).catch(() => setApprovedUsers([]));
  }, []);

  useEffect(() => {
    const id = searchParams.get('id');
    const block = searchParams.get('block');
    if (!id) return;
    setActiveId(id);
    if (block) setHighlightBlockId(block);
    if (id && block) setSearchParams({}, { replace: true });
    const inMine = canvases.some((c) => c.id === id);
    const inShared = sharedCanvases.some((c) => c.id === id);
    if (!inMine && !inShared) {
      firestoreService.getCanvasById(id).then((c) => {
        if (!c) return;
        if (c.userId === userId) setCanvases((prev) => [c, ...prev]);
        else setSharedCanvases((prev) => [c, ...prev]);
      }).catch(() => {});
    }
  }, [searchParams, setSearchParams, userId, canvases, sharedCanvases]);

  useEffect(() => {
    if (!highlightBlockId) return;
    const t = setTimeout(() => setHighlightBlockId(null), 2000);
    return () => clearTimeout(t);
  }, [highlightBlockId]);

  useEffect(() => {
    if (!activeId) return;
    const onKeyDown = (e) => {
      const active = document.activeElement;
      const inEditable = active?.isContentEditable || active?.tagName === 'TEXTAREA' || (active?.tagName === 'INPUT' && !/^(button|submit|checkbox|radio)$/i.test(active?.type));
      const isMac = navigator.platform?.toUpperCase().includes('MAC');
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (e.key === '?' || (mod && e.key === '/')) {
        if (inEditable && e.key === '?') return;
        e.preventDefault();
        setShortcutsOpen((o) => !o);
        return;
      }
      if (!mod) return;
      if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        e.stopPropagation();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      }
      if (e.key === 'y' && !isMac) {
        e.preventDefault();
        e.stopPropagation();
        handleRedo();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [activeId, handleUndo, handleRedo]);

  const updateActiveMeta = useCallback(
    (patch) => {
      if (!activeId || !activeCanvas) return;
      const ownerId = activeCanvas.userId ?? userId;
      if (!ownerId) return;
      setCanvases((prev) =>
        prev.map((c) => (c.id === activeId ? { ...c, ...patch, updated: Date.now() } : c))
      );
      if (sharedCanvases.some((c) => c.id === activeId)) {
        setSharedCanvases((prev) => prev.map((c) => (c.id === activeId ? { ...c, ...patch, updated: Date.now() } : c)));
      }
      firestoreService.updateCanvas(ownerId, activeId, patch).catch((err) => {
        console.error('Canvas save error (meta):', err);
        toast.error('Failed to save');
      });
    },
    [activeId, activeCanvas, userId, sharedCanvases]
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
    a.download = (activeCanvas.title || 'workspace') + '.txt';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported');
  };

  const insertLink = () => {
    if (linkUrl.trim()) {
      const saved = linkSavedSelectionRef.current;
      if (saved?.editable && saved?.range) {
        saved.editable.focus();
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(saved.range);
      }
      document.execCommand('createLink', false, linkUrl.trim());
      toast.success('Link inserted');
      canvasEditorRef.current?.syncFocusedBlockFromDom?.();
    }
    setLinkModal(false);
    setLinkUrl('');
    linkSavedSelectionRef.current = null;
  };

  const handleShareInvite = async () => {
    const email = (shareSelectedUser || '').trim().toLowerCase();
    if (!email || !activeId || !userId || !activeCanvas || !userEmail) return;
    const ownerId = activeCanvas.userId ?? userId;
    if (ownerId !== userId) return;
    setShareSubmitting(true);
    try {
      await firestoreService.shareCanvas(userId, activeId, { email, role: 'editor' });
      setShareCollaborators((prev) => [...prev.filter((c) => c.email !== email), { email, role: 'editor' }]);
      setShareSelectedUser('');
      const workspaceTitle = activeCanvas?.title || 'Untitled workspace';
      const inviterName = currentUser?.displayName || currentUser?.firstName || userEmail?.split('@')[0] || 'Someone';
      await firestoreService.createNotification({
        userEmail: email,
        type: 'workspace_shared',
        title: 'Workspace shared with you',
        message: `${inviterName} invited you to edit "${workspaceTitle}".`,
        link: `/workspaces?id=${activeId}`,
        read: false,
      });
      toast.success(`Invited ${email}`);
    } catch (err) {
      console.error('Share error:', err);
      toast.error(err?.message || 'Failed to invite');
    } finally {
      setShareSubmitting(false);
    }
  };

  const handleAiAssist = useCallback(async (action) => {
    setAiMenuOpen(false);
    canvasEditorRef.current?.syncFocusedBlockFromDom?.();
    const blockId = canvasEditorRef.current?.getFocusedBlockId?.();
    const html = canvasEditorRef.current?.getFocusedBlockContent?.();
    if (!blockId || html === null) {
      toast.error('Focus a text block first');
      return;
    }
    const plainText = (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!plainText) {
      toast.error('Block is empty');
      return;
    }
    setAiAssistLoading(true);
    try {
      const result = await openaiService.canvasAssist(action, plainText);
      canvasEditorRef.current?.setFocusedBlockContent?.(result);
      toast.success('Done');
    } catch (err) {
      console.error('AI assist error:', err);
      toast.error(err?.message || 'AI assist failed');
    } finally {
      setAiAssistLoading(false);
    }
  }, []);

  const handleRestoreVersion = async (versionId) => {
    if (!activeId || !activeCanvas || !userId) return;
    const ownerId = activeCanvas.userId ?? userId;
    if (ownerId !== userId && !canvases.some((c) => c.id === activeId)) return;
    try {
      const { blocks } = await firestoreService.restoreCanvasVersion(ownerId, activeId, versionId);
      pushUndo(activeCanvas.blocks);
      setCanvases((prev) => prev.map((c) => (c.id === activeId ? { ...c, blocks, updated: Date.now() } : c)));
      if (sharedCanvases.some((c) => c.id === activeId)) {
        setSharedCanvases((prev) => prev.map((c) => (c.id === activeId ? { ...c, blocks, updated: Date.now() } : c)));
      }
      setRestoreKey((k) => k + 1);
      setHistoryModalOpen(false);
      toast.success('Version restored');
    } catch (err) {
      console.error('Restore error:', err);
      toast.error(err?.message || 'Failed to restore');
    }
  };

  const handleUnshare = async (email) => {
    if (!activeId || !userId || !activeCanvas) return;
    const ownerId = activeCanvas.userId ?? userId;
    if (ownerId !== userId) return;
    try {
      await firestoreService.unshareCanvas(userId, activeId, email);
      setShareCollaborators((prev) => prev.filter((c) => c.email !== email));
      toast.success('Removed collaborator');
    } catch (err) {
      console.error('Unshare error:', err);
      toast.error(err?.message || 'Failed to remove');
    }
  };

  if (!currentUser) return null;

  return (
    <div className="flex flex-1 min-h-0 bg-[#f5f5f7] dark:bg-[#161617] overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-20 w-[280px] min-w-[280px] flex flex-col bg-[#ffffff] dark:bg-[#1c1c1e] border-r border-border transition-transform duration-300 md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
              <PencilRuler className="w-4 h-4" />
            </div>
            <h2 className="text-foreground font-bold text-[15px]">Workspaces</h2>
          </div>
          <button
            type="button"
            className="md:hidden p-1.5 text-muted-foreground hover:bg-muted rounded"
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
            className="w-full py-2.5 px-3.5 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm flex items-center justify-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" /> New Workspace
          </button>
        </div>
        <div className="relative px-3.5 pb-3">
          <div className="flex items-center gap-2 rounded-md border border-input bg-muted/30 text-foreground focus-within:border-ring focus-within:ring-1 focus-within:ring-ring py-2 pl-3 pr-3">
            <Search className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
              placeholder="Search workspaces and content…"
              className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          {searchFocused && search.trim().length >= 2 && (
            <div className="absolute left-3.5 right-3.5 top-full mt-1 py-1.5 max-h-64 overflow-y-auto bg-popover border border-border rounded-lg shadow-xl z-30">
              {searchBlocksInCanvases([...canvases, ...sharedCanvases], search).length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">No matches in content</p>
              ) : (
                searchBlocksInCanvases([...canvases, ...sharedCanvases], search).map((r) => (
                  <button
                    key={`${r.canvasId}-${r.blockId}`}
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                    onClick={() => {
                      setActiveId(r.canvasId);
                      setHighlightBlockId(r.blockId);
                      setSearch('');
                      setSearchFocused(false);
                      setSidebarOpen(false);
                      setTimeout(() => setHighlightBlockId(null), 2000);
                    }}
                  >
                    <span className="font-medium text-foreground block truncate">{r.canvasTitle}</span>
                    <span className="text-xs text-muted-foreground block truncate">{r.excerpt}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        <div className="flex border-b border-border px-2">
          <button
            type="button"
            onClick={() => setSidebarTab('mine')}
            className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wider ${sidebarTab === 'mine' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
          >
            My Workspaces
          </button>
          <button
            type="button"
            onClick={() => setSidebarTab('shared')}
            className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wider ${sidebarTab === 'shared' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
          >
            Shared with me
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-4 min-h-0">
          {sidebarTab === 'shared' ? (
            sharedLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredSharedCanvases.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <FolderOpen className="w-9 h-9 mx-auto mb-3 opacity-40" />
                Workspaces shared with you will appear here.
              </div>
            ) : (
              <ul className="space-y-0.5">
                {filteredSharedCanvases.map((c) => (
                  <li
                    key={c.id}
                    onClick={() => openCanvas(c.id)}
                    className={`flex items-center gap-2.5 py-2.5 px-3 rounded-md cursor-pointer transition-colors group ${
                      c.id === activeId ? 'bg-muted' : 'hover:bg-muted/70'
                    }`}
                  >
                    <span className="text-base flex-shrink-0 w-5 text-center">{c.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-sm truncate ${c.id === activeId ? 'text-foreground font-bold' : 'text-foreground/90'}`}
                      >
                        {c.title}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{dateStr(c.updated)}</div>
                    </div>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateCanvas(c.id);
                        }}
                        className="p-1.5 rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                        title="Duplicate"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )
          ) : loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredCanvases.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <FolderOpen className="w-9 h-9 mx-auto mb-3 opacity-40" />
              {search.trim() ? 'No workspaces match your search.' : 'No workspaces yet.'}
            </div>
          ) : (
            <ul className="space-y-0.5">
              {filteredCanvases.map((c) => (
                <li
                  key={c.id}
                  onClick={() => openCanvas(c.id)}
                  className={`flex items-center gap-2.5 py-2.5 px-3 rounded-md cursor-pointer transition-colors group ${
                    c.id === activeId ? 'bg-muted' : 'hover:bg-muted/70'
                  }`}
                >
                  <span className="text-base flex-shrink-0 w-5 text-center">{c.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-sm truncate ${c.id === activeId ? 'text-foreground font-bold' : 'text-foreground/90'}`}
                    >
                      {c.title}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{dateStr(c.updated)}</div>
                  </div>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        duplicateCanvas(c.id);
                      }}
                      className="p-1.5 rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                      title="Duplicate"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        deleteCanvas(c.id);
                      }}
                      className="p-1.5 rounded text-muted-foreground hover:bg-muted hover:text-destructive"
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
          className="fixed inset-0 bg-black/40 z-10 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#f5f5f7] dark:bg-[#161617]">
        {!activeId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
            <div className="w-16 h-16 rounded-2xl bg-black/5 dark:bg-white/10 flex items-center justify-center text-primary mb-5">
              <PencilRuler className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-[#1d1d1f] dark:text-[#f5f5f7] mb-2">
              Your Workspace
            </h3>
            <p className="text-sm max-w-[340px] leading-relaxed text-[#86868b] dark:text-[#a1a1a6] mb-5">
              Create workspaces with blocks, checklists, media, and slash commands. Type{' '}
              <strong className="text-foreground">/</strong> for quick commands. Use <strong className="text-foreground">[[</strong> to link to other workspaces.
            </p>
            <button
              type="button"
              onClick={() => createCanvas()}
              className="inline-flex items-center gap-1.5 py-2.5 px-5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm shadow-sm"
            >
              <Plus className="w-4 h-4" /> Create Your First Workspace
            </button>
          </div>
        ) : (
          <>
            {/* Top bar */}
            <div className="h-[52px] flex items-center gap-2.5 px-4 border-b border-border bg-[#f5f5f7] dark:bg-[#161617] flex-shrink-0">
              <button
                type="button"
                className="md:hidden p-1.5 text-muted-foreground hover:bg-muted rounded"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                <Menu className="w-4 h-4" />
              </button>
              <div className="flex-1 flex items-center gap-2 min-w-0 relative">
                <button
                  type="button"
                  onClick={() => setEmojiPickerOpen((o) => !o)}
                  className="text-xl p-1 rounded hover:bg-muted shrink-0"
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
                    <div className="absolute top-full left-0 mt-1 z-50 w-[270px] p-3 bg-popover border border-border rounded-xl shadow-xl grid grid-cols-7 gap-1">
                      {EMOJIS.map((e) => (
                        <button
                          key={e}
                          type="button"
                          className="text-2xl p-1.5 rounded-md hover:bg-muted"
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
                  className="flex-1 min-w-0 px-1.5 py-1 rounded text-base font-bold text-foreground bg-transparent border-none outline-none focus:bg-muted/50"
                  spellCheck={false}
                />
              </div>
              <div className="flex items-center gap-1">
<button
                type="button"
                onClick={handleUndo}
                className="p-2 rounded text-muted-foreground hover:bg-muted"
                title="Undo"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
                <button
                  type="button"
                  onClick={handleRedo}
                  className="p-2 rounded text-muted-foreground hover:bg-muted"
                  title="Redo"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleExport}
                  className="p-2 rounded text-muted-foreground hover:bg-muted"
                  title="Export"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShortcutsOpen((o) => !o)}
                  className="p-2 rounded text-muted-foreground hover:bg-muted"
                  title="Shortcuts (?)"
                >
                  <Keyboard className="w-4 h-4" />
                </button>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setAiMenuOpen((o) => !o)}
                    disabled={aiAssistLoading}
                    className="p-2 rounded text-muted-foreground hover:bg-muted disabled:opacity-50"
                    title="AI assist"
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>
                  {aiMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setAiMenuOpen(false)} aria-hidden />
                      <div className="absolute right-0 top-full mt-1 z-50 min-w-[180px] py-1.5 px-1.5 bg-popover border border-border rounded-xl shadow-xl">
                        <button type="button" onClick={() => handleAiAssist('summarize')} className="w-full text-left py-2 px-3 rounded-lg hover:bg-muted text-sm">Summarize</button>
                        <button type="button" onClick={() => handleAiAssist('expand')} className="w-full text-left py-2 px-3 rounded-lg hover:bg-muted text-sm">Expand</button>
                        <button type="button" onClick={() => handleAiAssist('professional')} className="w-full text-left py-2 px-3 rounded-lg hover:bg-muted text-sm">Professional tone</button>
                        <button type="button" onClick={() => handleAiAssist('casual')} className="w-full text-left py-2 px-3 rounded-lg hover:bg-muted text-sm">Casual tone</button>
                      </div>
                    </>
                  )}
                </div>
                {canShare && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setHistoryModalOpen(true);
                        setHistoryLoading(true);
                        setHistoryVersions([]);
                        if (activeId) {
                          firestoreService.getCanvasHistory(activeId).then((v) => {
                            setHistoryVersions(v);
                          }).catch(() => setHistoryVersions([])).finally(() => setHistoryLoading(false));
                        }
                      }}
                      className="p-2 rounded text-muted-foreground hover:bg-muted"
                      title="Version history"
                    >
                      <History className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShareModalOpen(true);
                        setShareSelectedUser('');
                        if (activeId) {
                          firestoreService.getCanvasById(activeId).then((c) => {
                            setShareCollaborators(c?.sharedWith || []);
                          }).catch(() => setShareCollaborators([]));
                        }
                      }}
                      className="p-2 rounded text-muted-foreground hover:bg-muted"
                      title="Share"
                    >
                      <UserPlus className="w-4 h-4" />
                    </button>
                  </>
                )}
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setContextPos({ top: rect.bottom + 4, left: rect.right - 180 });
                      setContextOpen(true);
                    }}
                    className="p-2 rounded text-muted-foreground hover:bg-muted"
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
                        className="fixed z-50 min-w-[180px] py-1.5 px-1.5 bg-popover border border-border rounded-xl shadow-xl"
                        style={{ top: contextPos.top, left: contextPos.left }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            duplicateCanvas(activeId);
                            setContextOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 py-2 px-3 rounded-md hover:bg-muted text-foreground text-left text-sm"
                        >
                          <Copy className="w-4 h-4 text-muted-foreground" /> Duplicate
                        </button>
                        {canShare && (
                          <button
                            type="button"
                            onClick={() => {
                              setContextOpen(false);
                              setShareModalOpen(true);
                              setShareSelectedUser('');
                              if (activeId) {
                                firestoreService.getCanvasById(activeId).then((c) => {
                                  setShareCollaborators(c?.sharedWith || []);
                                }).catch(() => setShareCollaborators([]));
                              }
                            }}
                            className="w-full flex items-center gap-2.5 py-2 px-3 rounded-md hover:bg-muted text-foreground text-left text-sm"
                          >
                            <UserPlus className="w-4 h-4 text-muted-foreground" /> Share
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            deleteCanvas(activeId);
                            setContextOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 py-2 px-3 rounded-md hover:bg-destructive/10 text-destructive text-left text-sm"
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
            <div className="h-[46px] flex items-center gap-0.5 px-4 border-b border-border bg-[#f5f5f7] dark:bg-[#161617] flex-shrink-0 overflow-x-auto">
              <FormatBtn cmd="bold" icon={<Bold className="w-3.5 h-3.5" />} />
              <FormatBtn cmd="italic" icon={<Italic className="w-3.5 h-3.5" />} />
              <FormatBtn cmd="underline" icon={<Underline className="w-3.5 h-3.5" />} />
              <FormatBtn cmd="strikeThrough" icon={<Strikethrough className="w-3.5 h-3.5" />} />
              <div className="w-px h-5 bg-border mx-1" />
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  document.execCommand('insertUnorderedList');
                  canvasEditorRef.current?.syncFocusedBlockFromDom?.();
                }}
                className="p-2 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  document.execCommand('insertOrderedList');
                  canvasEditorRef.current?.syncFocusedBlockFromDom?.();
                }}
                className="p-2 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <ListOrdered className="w-4 h-4" />
              </button>
              <div className="w-px h-5 bg-border mx-1" />
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  const sel = window.getSelection();
                  const editable = document.activeElement?.closest?.('[contenteditable="true"]');
                  if (editable && sel?.rangeCount) {
                    linkSavedSelectionRef.current = {
                      range: sel.getRangeAt(0).cloneRange(),
                      editable,
                    };
                  } else {
                    linkSavedSelectionRef.current = null;
                  }
                  setLinkModal(true);
                }}
                className="p-2 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                title="Insert link"
              >
                <Link2 className="w-4 h-4" />
              </button>
            </div>

            {/* Block editor */}
            <CanvasBlockEditor
              ref={canvasEditorRef}
              blocks={activeCanvas?.blocks ?? []}
              onBlocksChange={updateActiveBlocks}
              onWordCountChange={setWordCountStr}
              restoreKey={restoreKey}
              approvedUsers={approvedUsers}
              highlightBlockId={highlightBlockId}
              canvasId={activeId}
              currentUserEmail={userEmail}
              currentUserName={currentUser?.firstName && currentUser?.lastName ? `${currentUser.firstName} ${currentUser.lastName}` : currentUser?.email || null}
              workspaceList={[...canvases, ...sharedCanvases].map((c) => ({ id: c.id, title: c.title || 'Untitled' }))}
            />

            {/* Word count */}
            <div className="h-7 flex items-center justify-end px-5 border-t border-border bg-[#f5f5f7] dark:bg-[#161617] text-[11px] text-muted-foreground">
              {wordCountStr}
            </div>
          </>
        )}
      </main>

      {/* Share modal */}
      {shareModalOpen && activeId && (() => {
        const collaboratorEmails = new Set(shareCollaborators.map((c) => (c.email || '').toLowerCase()));
        const shareableUsers = approvedUsers.filter(
          (u) => u.email && (u.email || '').toLowerCase() !== (userEmail || '').toLowerCase() && !collaboratorEmails.has((u.email || '').toLowerCase())
        );
        return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-black/45">
          <div className="bg-card border border-border rounded-xl shadow-xl p-7 max-w-md w-full max-h-[80vh] flex flex-col">
            <h3 className="text-lg font-bold text-foreground mb-2">Share workspace</h3>
            <p className="text-sm text-muted-foreground mb-4">Invite a team member to edit this workspace. They will get a notification.</p>
            <div className="flex gap-2 mb-4">
              <select
                value={shareSelectedUser}
                onChange={(e) => setShareSelectedUser(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-md border border-input bg-background text-foreground text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
              >
                <option value="">Select a team member…</option>
                {shareableUsers.map((u) => (
                  <option key={u.email || u.id} value={u.email || u.id}>
                    {u.displayName || [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || u.id}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={shareSubmitting || !shareSelectedUser.trim()}
                onClick={handleShareInvite}
                className="px-4 py-2.5 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm disabled:opacity-50"
              >
                Add
              </button>
            </div>
            {shareCollaborators.length > 0 && (
              <div className="flex-1 min-h-0 overflow-y-auto mb-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Collaborators</p>
                <ul className="space-y-1">
                  {shareCollaborators.map((collab) => (
                    <li
                      key={collab.email}
                      className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50"
                    >
                      <span className="text-sm text-foreground truncate">{collab.email}</span>
                      <button
                        type="button"
                        onClick={() => handleUnshare(collab.email)}
                        className="p-1.5 rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        title="Remove"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShareModalOpen(false); setShareSelectedUser(''); setShareCollaborators([]); }}
                className="px-4 py-2 rounded-md bg-muted text-muted-foreground hover:text-foreground font-semibold text-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Shortcuts modal */}
      {shortcutsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-black/45" onClick={() => setShortcutsOpen(false)}>
          <div className="bg-card border border-border rounded-xl shadow-xl p-7 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
              <Keyboard className="w-5 h-5" /> Shortcuts
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between gap-4"><span className="text-muted-foreground">Block types</span><kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">/</kbd></li>
              <li className="flex justify-between gap-4"><span className="text-muted-foreground">Link to workspace</span><kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">[[</kbd></li>
              <li className="flex justify-between gap-4"><span className="text-muted-foreground">Mention</span><kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">@</kbd></li>
              <li className="flex justify-between gap-4"><span className="text-muted-foreground">Undo</span><kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">⌘Z</kbd></li>
              <li className="flex justify-between gap-4"><span className="text-muted-foreground">Redo</span><kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">⌘⇧Z</kbd></li>
              <li className="flex justify-between gap-4"><span className="text-muted-foreground">Duplicate block</span><span className="text-muted-foreground text-xs">hover block → copy icon</span></li>
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">Press ? or ⌘/ to toggle this panel</p>
          </div>
        </div>
      )}

      {/* History modal */}
      {historyModalOpen && activeId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-black/45">
          <div className="bg-card border border-border rounded-xl shadow-xl p-7 max-w-md w-full max-h-[80vh] flex flex-col">
            <h3 className="text-lg font-bold text-foreground mb-2">Version history</h3>
            <p className="text-sm text-muted-foreground mb-4">Restore a previous version of this workspace.</p>
            {historyLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : historyVersions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No history yet. Edits will create versions.</p>
            ) : (
              <ul className="flex-1 min-h-0 overflow-y-auto space-y-1 mb-4">
                {historyVersions.map((v) => (
                  <li
                    key={v.id}
                    className="flex items-center justify-between gap-3 py-2 px-3 rounded-md bg-muted/50 hover:bg-muted"
                  >
                    <span className="text-sm text-foreground truncate">{dateStr(v.updated)} · {v.blocks?.length ?? 0} blocks</span>
                    <button
                      type="button"
                      onClick={() => handleRestoreVersion(v.id)}
                      className="px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90"
                    >
                      Restore
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setHistoryModalOpen(false)}
                className="px-4 py-2 rounded-md bg-muted text-muted-foreground hover:text-foreground font-semibold text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Link modal */}
      {linkModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-black/45">
          <div className="bg-card border border-border rounded-xl shadow-xl p-7 max-w-md w-full">
            <h3 className="text-lg font-bold text-foreground mb-2">
              Insert Link
            </h3>
            <p className="text-sm text-muted-foreground mb-4">Enter the URL:</p>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-3.5 py-2.5 rounded-md border border-input bg-background text-foreground text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
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
                className="px-4 py-2 rounded-md bg-muted text-muted-foreground hover:text-foreground font-semibold text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={insertLink}
                className="px-4 py-2 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm"
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
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => {
        document.execCommand(cmd, false, null);
        update();
      }}
      className={`p-2 rounded hover:bg-muted ${active ? 'bg-muted text-primary' : 'text-muted-foreground hover:text-foreground'}`}
    >
      {icon}
    </button>
  );
}
