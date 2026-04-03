/**
 * Yjs + Supabase Realtime (broadcast + presence) for shared workspaces.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { supabase } from '../lib/supabase';

const COLORS = ['#e11d48', '#ea580c', '#ca8a04', '#16a34a', '#0891b2', '#2563eb', '#7c3aed', '#db2777'];

function colorForUser(id) {
  if (!id) return COLORS[0];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

function blockToYMap(block) {
  const m = new Y.Map();
  m.set('id', block.id);
  m.set('type', block.type);
  const raw =
    typeof block.content === 'string' ? block.content : JSON.stringify(block.content ?? '');
  const yt = new Y.Text();
  yt.insert(0, raw);
  m.set('content', yt);
  const skip = new Set(['id', 'type', 'content']);
  for (const k of Object.keys(block)) {
    if (skip.has(k)) continue;
    const v = block[k];
    if (v === undefined) continue;
    if (v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      m.set(k, v);
    } else {
      m.set(k, JSON.stringify(v));
    }
  }
  return m;
}

function yArrayToPlainBlocks(yarr) {
  const out = [];
  for (let i = 0; i < yarr.length; i++) {
    const ym = yarr.get(i);
    if (!(ym instanceof Y.Map)) continue;
    const o = ym.toJSON();
    const block = { id: o.id, type: o.type, content: o.content };
    for (const k of Object.keys(o)) {
      if (k === 'id' || k === 'type' || k === 'content') continue;
      const v = o[k];
      if (typeof v === 'string' && (v.startsWith('{') || v.startsWith('['))) {
        try {
          block[k] = JSON.parse(v);
        } catch {
          block[k] = v;
        }
      } else {
        block[k] = v;
      }
    }
    out.push(block);
  }
  return out;
}

function syncPlainBlocksIntoYDoc(ydoc, plainBlocks) {
  const arr = ydoc.getArray('blocks');
  ydoc.transact(() => {
    while (arr.length > plainBlocks.length) {
      arr.delete(arr.length - 1, 1);
    }
    while (arr.length < plainBlocks.length) {
      arr.push([blockToYMap(plainBlocks[arr.length])]);
    }
    for (let i = 0; i < plainBlocks.length; i++) {
      const ym = arr.get(i);
      if (!(ym instanceof Y.Map)) continue;
      const plain = plainBlocks[i];
      if (ym.get('id') !== plain.id) {
        arr.delete(i, 1);
        arr.insert(i, [blockToYMap(plain)]);
        continue;
      }
      if (ym.get('type') !== plain.type) ym.set('type', plain.type);
      const raw =
        typeof plain.content === 'string' ? plain.content : JSON.stringify(plain.content ?? '');
      let yt = ym.get('content');
      if (!(yt instanceof Y.Text)) {
        yt = new Y.Text();
        ym.set('content', yt);
      }
      if (yt.toString() !== raw) {
        const len = yt.length;
        if (len > 0) yt.delete(0, len);
        yt.insert(0, raw);
      }
      const skip = new Set(['id', 'type', 'content']);
      for (const k of Object.keys(plain)) {
        if (skip.has(k)) continue;
        const v = plain[k];
        if (v === undefined) continue;
        const enc =
          v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
            ? v
            : JSON.stringify(v);
        if (ym.get(k) !== enc) ym.set(k, enc);
      }
    }
  }, 'react');
}

function encodeUpdate(u8) {
  let s = '';
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return btoa(s);
}

function decodeUpdate(b64) {
  const s = atob(b64);
  const u8 = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i);
  return u8;
}

export function useYjsCanvasCollaboration(canvasUuid, enabled, user, initialBlocks, onPersist) {
  const [mergedBlocks, setMergedBlocks] = useState(() => initialBlocks || []);
  const [others, setOthers] = useState([]);
  const [docReady, setDocReady] = useState(false);
  const ydocRef = useRef(null);
  const channelRef = useRef(null);
  const persistTimerRef = useRef(null);
  const onPersistRef = useRef(onPersist);
  onPersistRef.current = onPersist;
  const userRef = useRef(user);
  userRef.current = user;
  const initialBlocksRef = useRef(initialBlocks);
  initialBlocksRef.current = initialBlocks;

  useEffect(() => {
    if (!canvasUuid || !enabled || !user?.id) {
      setDocReady(false);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      ydocRef.current = null;
      return;
    }

    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;
    const yblocks = ydoc.getArray('blocks');
    const seed = initialBlocksRef.current?.length
      ? initialBlocksRef.current
      : [{ id: `b${Date.now().toString(36)}`, type: 'text', content: '' }];

    ydoc.transact(() => {
      while (yblocks.length) yblocks.delete(yblocks.length - 1, 1);
      seed.forEach((b) => yblocks.push([blockToYMap(b)]));
    }, 'init');

    setMergedBlocks(yArrayToPlainBlocks(yblocks));

    const channel = supabase.channel(`canvas-collab:${canvasUuid}`, {
      config: {
        broadcast: { self: true },
        presence: { key: user.id },
      },
    });

    const flushPresence = () => {
      const state = channel.presenceState();
      const list = [];
      for (const key of Object.keys(state)) {
        const presences = state[key];
        for (const p of presences || []) {
          if (p?.userId && p.userId !== user.id) list.push(p);
        }
      }
      setOthers(list);
    };

    channel
      .on('broadcast', { event: 'yjs' }, ({ payload }) => {
        if (!payload || typeof payload !== 'string') return;
        try {
          const u8 = decodeUpdate(payload);
          Y.applyUpdate(ydoc, u8, 'remote');
        } catch (e) {
          console.warn('[collab] applyUpdate failed', e);
        }
      })
      .on('presence', { event: 'sync' }, flushPresence)
      .on('presence', { event: 'join' }, flushPresence)
      .on('presence', { event: 'leave' }, flushPresence);

    const onYUpdate = (update, origin) => {
      if (origin === 'remote' || origin === 'init') return;
      try {
        channel.send({
          type: 'broadcast',
          event: 'yjs',
          payload: encodeUpdate(update),
        });
      } catch (e) {
        console.warn('[collab] broadcast failed', e);
      }
    };
    ydoc.on('update', onYUpdate);

    const deepObserver = () => {
      const blocks = yArrayToPlainBlocks(yblocks);
      setMergedBlocks(blocks);
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
      persistTimerRef.current = setTimeout(() => {
        persistTimerRef.current = null;
        onPersistRef.current?.(blocks);
      }, 900);
    };
    yblocks.observeDeep(deepObserver);

    channel.subscribe(async (status) => {
      if (status !== 'SUBSCRIBED') return;
      try {
        await channel.track({
          userId: user.id,
          email: user.email || '',
          name: user.name || user.email || 'User',
          color: colorForUser(user.id),
          cursor: null,
        });
      } catch (_) {
        /* presence optional */
      }
      setDocReady(true);
      flushPresence();
      try {
        const full = Y.encodeStateAsUpdate(ydoc);
        channel.send({ type: 'broadcast', event: 'yjs', payload: encodeUpdate(full) });
      } catch (_) {
        /* ignore */
      }
    });

    channelRef.current = channel;

    return () => {
      setDocReady(false);
      ydoc.off('update', onYUpdate);
      yblocks.unobserveDeep(deepObserver);
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
      supabase.removeChannel(channel);
      channelRef.current = null;
      ydocRef.current = null;
    };
  }, [canvasUuid, enabled, user?.id, user?.email]);

  const syncFromEditor = useCallback(
    (plainBlocks) => {
      if (!enabled || !ydocRef.current) return;
      syncPlainBlocksIntoYDoc(ydocRef.current, plainBlocks);
    },
    [enabled]
  );

  const updateCursor = useCallback(
    (cursor) => {
      const ch = channelRef.current;
      const u = userRef.current;
      if (!ch || !enabled || !u?.id) return;
      ch.track({
        userId: u.id,
        email: u.email || '',
        name: u.name || u.email || 'User',
        color: colorForUser(u.id),
        cursor,
      });
    },
    [enabled]
  );

  return {
    mergedBlocks: enabled ? mergedBlocks : null,
    syncFromEditor,
    updateCursor,
    others,
    ready: Boolean(enabled && canvasUuid && user?.id && docReady),
  };
}
