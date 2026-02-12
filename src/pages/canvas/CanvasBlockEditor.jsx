import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
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
  Image,
  Film,
  Plus,
  Trash2,
} from 'lucide-react';

export function blockId() {
  return 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export const BLOCK_TYPES = [
  { id: 'text', icon: '¶', label: 'Text', desc: 'Plain paragraph' },
  { id: 'h1', icon: Heading1, label: 'Heading 1', desc: 'Large heading' },
  { id: 'h2', icon: Heading2, label: 'Heading 2', desc: 'Medium heading' },
  { id: 'h3', icon: Heading3, label: 'Heading 3', desc: 'Small heading' },
  { id: 'bullet', icon: List, label: 'Bullet List', desc: 'Unordered list' },
  { id: 'ordered', icon: ListOrdered, label: 'Numbered List', desc: 'Ordered list' },
  { id: 'checklist', icon: CheckSquare, label: 'Checklist', desc: 'Task checklist' },
  { id: 'quote', icon: Quote, label: 'Quote', desc: 'Block quote' },
  { id: 'code', icon: Code, label: 'Code Block', desc: 'Monospace code' },
  { id: 'callout', icon: Lightbulb, label: 'Callout', desc: 'Highlighted note' },
  { id: 'divider', icon: Minus, label: 'Divider', desc: 'Horizontal rule' },
  { id: 'image', icon: Image, label: 'Image', desc: 'Upload or drop image' },
  { id: 'video', icon: Film, label: 'Video', desc: 'Upload or drop video' },
];

function wordCharCount(blocks) {
  const text = blocks
    .map((b) => {
      if (b.type === 'checklist') {
        try {
          const items = JSON.parse(b.content || '[]');
          return items.map((i) => i.text).join(' ');
        } catch {
          return '';
        }
      }
      if (b.type === 'image' || b.type === 'video') return b.caption || '';
      return b.content || '';
    })
    .join(' ')
    .replace(/<[^>]+>/g, ' ')
    .trim();
  const words = text ? text.split(/\s+/).length : 0;
  return `${words} word${words !== 1 ? 's' : ''} · ${text.length} char${text.length !== 1 ? 's' : ''}`;
}

function SortableBlock({ block, onContentChange, onRemove, isFocused, onFocus, fileInputRef, onRequestImage, onRequestVideo, onSlashDetect }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex gap-1 py-0.5 -mx-2 px-2 rounded hover:bg-[#7b5ea7]/5 dark:hover:bg-[#b494da]/10"
      data-block-id={block.id}
      data-block-type={block.type}
    >
      <div
        {...attributes}
        {...listeners}
        className="flex items-center justify-center w-6 shrink-0 cursor-grab active:cursor-grabbing text-[#a0a0a0] dark:text-[#6d5f80] opacity-0 group-hover:opacity-100 touch-none"
      >
        <GripVertical className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <BlockContent
          block={block}
          onContentChange={onContentChange}
          onRemove={onRemove}
          isFocused={isFocused}
          onFocus={onFocus}
          fileInputRef={fileInputRef}
          onRequestImage={onRequestImage}
          onRequestVideo={onRequestVideo}
          onSlashDetect={onSlashDetect}
        />
      </div>
    </div>
  );
}

function BlockContent({ block, onContentChange, onRemove, isFocused, onFocus, fileInputRef, onRequestImage, onRequestVideo, onSlashDetect }) {
  const elRef = useRef(null);

  const notifyContent = useCallback(
    (content, caption) => {
      onContentChange(block.id, { content, caption });
    },
    [block.id, onContentChange]
  );

  if (block.type === 'checklist') {
    let items = [];
    try {
      items = JSON.parse(block.content || '[]');
    } catch {
      items = [{ text: '', checked: false }];
    }
    if (!items.length) items = [{ text: '', checked: false }];
    return (
      <div className="space-y-1 py-1">
        {items.map((item, i) => (
          <div
            key={i}
            className={`flex items-start gap-2 ${item.checked ? 'opacity-70' : ''}`}
          >
            <input
              type="checkbox"
              checked={!!item.checked}
              onChange={(e) => {
                const next = items.map((it, j) => (j === i ? { ...it, checked: e.target.checked } : it));
                notifyContent(JSON.stringify(next));
              }}
              className="mt-1.5 w-4 h-4 accent-[#7b5ea7] cursor-pointer shrink-0"
            />
            <span
              ref={i === 0 ? elRef : null}
              contentEditable
              suppressContentEditableWarning
              className={`flex-1 outline-none min-h-[22px] ${item.checked ? 'line-through text-[#a0a0a0]' : ''}`}
              dangerouslySetInnerHTML={{ __html: item.text }}
              onBlur={(e) => {
                const next = items.map((it, j) => (j === i ? { ...it, text: e.currentTarget.innerHTML } : it));
                notifyContent(JSON.stringify(next));
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  const next = [...items.slice(0, i + 1), { text: '', checked: false }, ...items.slice(i + 1)];
                  notifyContent(JSON.stringify(next));
                }
              }}
            />
          </div>
        ))}
      </div>
    );
  }

  if (block.type === 'image') {
    return (
      <div className="relative rounded-lg overflow-hidden my-1 bg-black max-w-full">
        {block.content ? (
          <>
            <img src={block.content} alt="" className="block max-w-full rounded-lg" />
            <div className="absolute inset-0 flex items-start justify-end p-2 opacity-0 hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => onRemove(block.id)}
                className="p-1.5 rounded bg-black/60 text-white hover:bg-black/80"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div
              contentEditable
              suppressContentEditableWarning
              className="text-sm text-[#616061] dark:text-[#a393b8] text-center py-1 px-2 outline-none empty:before:content-['Add_caption…'] empty:before:text-[#a0a0a0]"
              onBlur={(e) => notifyContent(block.content, e.currentTarget.innerHTML)}
              dangerouslySetInnerHTML={{ __html: block.caption || '' }}
            />
          </>
        ) : (
          <button
            type="button"
            onClick={() => onRequestImage?.()}
            className="w-full py-8 border-2 border-dashed border-[#7b5ea7] rounded-lg text-[#7b5ea7] font-medium hover:bg-[#7b5ea7]/10"
          >
            Click or drop image
          </button>
        )}
      </div>
    );
  }

  if (block.type === 'video') {
    return (
      <div className="relative rounded-lg overflow-hidden my-1 bg-black max-w-full">
        {block.content ? (
          <>
            <video src={block.content} controls className="block max-w-full rounded-lg" />
            <div className="absolute top-2 right-2 opacity-0 hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => onRemove(block.id)}
                className="p-1.5 rounded bg-black/60 text-white hover:bg-black/80"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div
              contentEditable
              suppressContentEditableWarning
              className="text-sm text-[#616061] dark:text-[#a393b8] text-center py-1 outline-none empty:before:content-['Add_caption…']"
              onBlur={(e) => notifyContent(block.content, e.currentTarget.innerHTML)}
              dangerouslySetInnerHTML={{ __html: block.caption || '' }}
            />
          </>
        ) : (
          <button
            type="button"
            onClick={() => onRequestVideo?.()}
            className="w-full py-8 border-2 border-dashed border-[#7b5ea7] rounded-lg text-[#7b5ea7] font-medium hover:bg-[#7b5ea7]/10"
          >
            Click or drop video
          </button>
        )}
      </div>
    );
  }

  if (block.type === 'divider') {
    return <hr className="border-0 h-px bg-[#e8e3ef] dark:bg-[#3b2f52] my-4" />;
  }

  const isTextLike = ['text', 'h1', 'h2', 'h3', 'quote', 'code', 'callout', 'bullet', 'ordered'].includes(block.type);
  if (isTextLike) {
    const tag = block.type === 'h1' ? 'h1' : block.type === 'h2' ? 'h2' : block.type === 'h3' ? 'h3' : 'div';
    const className =
      block.type === 'h1'
        ? 'text-2xl font-bold leading-tight mt-4 mb-1'
        : block.type === 'h2'
          ? 'text-xl font-bold leading-tight mt-3 mb-1'
          : block.type === 'h3'
            ? 'text-lg font-semibold mt-2 mb-0.5'
            : block.type === 'quote'
              ? 'border-l-4 border-[#7b5ea7] pl-4 py-1 bg-[#ede4f7] dark:bg-[#3b2f52] rounded-r text-[#616061] dark:text-[#a393b8] italic'
              : block.type === 'code'
                ? 'font-mono text-sm bg-[#f4f2f7] dark:bg-[#271f38] border border-[#e8e3ef] dark:border-[#3b2f52] rounded px-4 py-2 whitespace-pre-wrap'
                : block.type === 'callout'
                  ? 'flex gap-2 py-2 px-3 bg-[#fef9ec] dark:bg-[#252014] border-l-4 border-[#f5c542] dark:border-[#9e7a20] rounded-r'
                  : block.type === 'bullet' || block.type === 'ordered'
                    ? 'pl-4'
                    : 'min-h-[24px]';
    const contentClass = block.type === 'callout' ? 'flex-1 outline-none' : 'outline-none min-h-[24px]';
    const placeholder = block.type === 'text' ? "Type something, or press '/' for commands…" : block.type === 'code' ? 'Write code…' : '';

    return (
      <div
        ref={elRef}
        className={className}
        data-block-type={block.type}
      >
        {block.type === 'callout' && <span className="text-lg shrink-0">💡</span>}
        {block.type === 'bullet' && (
          <ul
            contentEditable
            suppressContentEditableWarning
            className="list-disc outline-none list-inside min-h-[24px]"
            dangerouslySetInnerHTML={{ __html: block.content || '<li></li>' }}
            onBlur={(e) => notifyContent(e.currentTarget.innerHTML)}
            onFocus={() => onFocus(block.id)}
          />
        )}
        {block.type === 'ordered' && (
          <ol
            contentEditable
            suppressContentEditableWarning
            className="list-decimal outline-none list-inside min-h-[24px]"
            dangerouslySetInnerHTML={{ __html: block.content || '<li></li>' }}
            onBlur={(e) => notifyContent(e.currentTarget.innerHTML)}
            onFocus={() => onFocus(block.id)}
          />
        )}
        {!['bullet', 'ordered'].includes(block.type) && (
          <div
            contentEditable
            suppressContentEditableWarning
            ref={block.type === 'text' ? elRef : undefined}
            className={contentClass}
            data-placeholder={placeholder}
            dangerouslySetInnerHTML={{ __html: block.content || '' }}
            onBlur={(e) => notifyContent(e.currentTarget.innerHTML)}
            onFocus={() => onFocus(block.id)}
            onInput={(e) => {
              if (!onSlashDetect || !['text', 'h1', 'h2', 'h3', 'quote', 'callout'].includes(block.type)) return;
              const sel = window.getSelection();
              if (!sel?.rangeCount) return;
              const node = sel.anchorNode;
              const text = node?.textContent || '';
              const offset = sel.anchorOffset || 0;
              const before = text.substring(0, offset);
              const m = before.match(/\/(\w*)$/);
              if (m) {
                const rect = e.currentTarget.getBoundingClientRect();
                onSlashDetect(m[1], rect);
              } else {
                onSlashDetect(null);
              }
            }}
            style={{ caretColor: '#7b5ea7' }}
          />
        )}
      </div>
    );
  }

  return null;
}

export default function CanvasBlockEditor({
  blocks,
  onBlocksChange,
  onWordCountChange,
}) {
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);
  const [focusedBlockId, setFocusedBlockId] = useState(null);
  const [dropZoneOver, setDropZoneOver] = useState(false);
  const [dropZoneVisible, setDropZoneVisible] = useState(false);
  const [slashOpen, setSlashOpen] = useState(false);
  const pendingMediaRef = useRef({ blockId: null, type: null });
  const [slashFilter, setSlashFilter] = useState('');
  const [slashIndex, setSlashIndex] = useState(0);
  const slashPosRef = useRef({ left: 0, top: 0 });
  const persistTimerRef = useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const safeBlocks = Array.isArray(blocks) ? blocks : [];
  const blockIds = safeBlocks.map((b) => b.id);

  const updateBlock = useCallback(
    (blockId, patch) => {
      const next = safeBlocks.map((b) =>
        b.id === blockId ? { ...b, ...patch } : b
      );
      onBlocksChange(next);
      if (onWordCountChange) onWordCountChange(wordCharCount(next));
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
      persistTimerRef.current = setTimeout(() => {
        persistTimerRef.current = null;
        onBlocksChange(next);
      }, 1200);
    },
    [safeBlocks, onBlocksChange, onWordCountChange]
  );

  const addBlockAfter = useCallback(
    (afterIndex, block) => {
      const next = [...safeBlocks];
      next.splice(afterIndex + 1, 0, block);
      onBlocksChange(next);
      setFocusedBlockId(block.id);
      if (onWordCountChange) onWordCountChange(wordCharCount(next));
    },
    [safeBlocks, onBlocksChange, onWordCountChange]
  );

  const removeBlock = useCallback(
    (blockId) => {
      const next = safeBlocks.filter((b) => b.id !== blockId);
      onBlocksChange(next);
      if (onWordCountChange) onWordCountChange(wordCharCount(next));
    },
    [safeBlocks, onBlocksChange, onWordCountChange]
  );

  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = safeBlocks.findIndex((b) => b.id === active.id);
      const newIndex = safeBlocks.findIndex((b) => b.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const next = arrayMove(safeBlocks, oldIndex, newIndex);
      onBlocksChange(next);
    },
    [safeBlocks, onBlocksChange]
  );

  const handleFiles = useCallback(
    (files) => {
      const { blockId: fillBlockId, type: fillType } = pendingMediaRef.current;
      pendingMediaRef.current = { blockId: null, type: null };
      const file = Array.from(files).find((f) => f.type.startsWith('image/') || f.type.startsWith('video/'));
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const type = file.type.startsWith('image/') ? 'image' : 'video';
        if (fillBlockId && (fillType === type || !fillType)) {
          updateBlock(fillBlockId, { content: e.target.result });
        } else {
          const newBlock = { id: blockId(), type, content: e.target.result, caption: '' };
          addBlockAfter(safeBlocks.length - 1, newBlock);
        }
      };
      reader.readAsDataURL(file);
    },
    [safeBlocks.length, addBlockAfter, updateBlock]
  );

  useEffect(() => {
    onWordCountChange?.(wordCharCount(safeBlocks));
  }, [safeBlocks, onWordCountChange]);

  const focusedIndex = safeBlocks.findIndex((b) => b.id === focusedBlockId);
  const handleSlashDetect = useCallback((filter, rect) => {
    if (filter === null) {
      setSlashOpen(false);
      return;
    }
    if (rect) {
      slashPosRef.current = { left: rect.left, top: rect.bottom + 4 };
    }
    setSlashFilter(filter);
    setSlashIndex(0);
    setSlashOpen(true);
  }, []);

  const slashItems = BLOCK_TYPES.filter(
    (c) =>
      !slashFilter ||
      c.label.toLowerCase().includes(slashFilter.toLowerCase()) ||
      c.id.includes(slashFilter)
  );

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) handleFiles(e.target.files);
          e.target.value = '';
        }}
      />

      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto min-h-0"
        onDragEnter={(e) => {
          if (e.dataTransfer?.types?.includes('Files')) {
            setDropZoneVisible(true);
          }
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) {
            setDropZoneVisible(false);
            setDropZoneOver(false);
          }
        }}
        onDragOver={(e) => {
          if (e.dataTransfer?.types?.includes('Files')) {
            e.preventDefault();
            setDropZoneOver(true);
          }
        }}
        onDrop={(e) => {
          setDropZoneVisible(false);
          setDropZoneOver(false);
          if (e.dataTransfer?.files?.length) {
            e.preventDefault();
            handleFiles(e.dataTransfer.files);
          }
        }}
      >
        <div className="max-w-[760px] mx-auto py-7 px-9 min-h-full">
          {dropZoneVisible && (
            <div
              className={`flex flex-col items-center justify-center gap-2 py-8 my-2 border-2 border-dashed rounded-xl text-[#7b5ea7] font-semibold text-sm ${
                dropZoneOver ? 'bg-[#7b5ea7]/15 border-[#6a4e94]' : 'bg-[#7b5ea7]/5'
              }`}
            >
              Drop images or videos here
              <span className="text-xs font-normal text-[#616061] dark:text-[#a393b8]">PNG, JPG, GIF, MP4, WebM</span>
            </div>
          )}

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
              {safeBlocks.map((block) => (
                <SortableBlock
                  key={block.id}
                  block={block}
                  onContentChange={updateBlock}
                  onRemove={removeBlock}
                  isFocused={block.id === focusedBlockId}
                  onFocus={setFocusedBlockId}
                  fileInputRef={fileInputRef}
                  onRequestImage={() => {
                    pendingMediaRef.current = { blockId: block.id, type: 'image' };
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = 'image/*';
                      fileInputRef.current.click();
                    }
                  }}
                  onRequestVideo={() => {
                    pendingMediaRef.current = { blockId: block.id, type: 'video' };
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = 'video/*';
                      fileInputRef.current.click();
                    }
                  }}
                  onSlashDetect={handleSlashDetect}
                />
              ))}
            </SortableContext>
          </DndContext>

          <div className="flex items-center gap-2 py-2 mt-2 opacity-80 hover:opacity-100">
            <button
              type="button"
              onClick={() => addBlockAfter(safeBlocks.length - 1, { id: blockId(), type: 'text', content: '' })}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#a0a0a0] dark:text-[#6d5f80] border border-dashed border-[#e8e3ef] dark:border-[#3b2f52] rounded-md hover:border-[#7b5ea7] hover:text-[#7b5ea7]"
            >
              <Plus className="w-4 h-4" /> Add block
            </button>
            <button
              type="button"
              onClick={() => {
                pendingMediaRef.current = { blockId: null, type: null };
                fileInputRef.current?.click();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#a0a0a0] dark:text-[#6d5f80] border border-dashed border-[#e8e3ef] dark:border-[#3b2f52] rounded-md hover:border-[#7b5ea7] hover:text-[#7b5ea7]"
            >
              <Image className="w-4 h-4" /> Add media
            </button>
          </div>
        </div>
      </div>

      {slashOpen && slashItems.length > 0 && (
        <div
          className="fixed z-50 w-[230px] max-h-[260px] overflow-y-auto py-1.5 px-1.5 bg-white dark:bg-[#231b33] border border-[#e8e3ef] dark:border-[#3b2f52] rounded-xl shadow-xl"
          style={{ left: slashPosRef.current.left, top: slashPosRef.current.top }}
        >
          {slashItems.map((c, i) => (
            <button
              key={c.id}
              type="button"
              className={`w-full flex items-center gap-2 py-2 px-3 rounded-lg text-left text-sm ${
                i === slashIndex ? 'bg-[#ede8f5] dark:bg-[#3b2f52]' : 'hover:bg-[#ede8f5] dark:hover:bg-[#3b2f52]'
              }`}
              onClick={() => {
                const idx = focusedIndex >= 0 ? focusedIndex : safeBlocks.length - 1;
                if (c.id === 'image' || c.id === 'video') {
                  pendingMediaRef.current = { blockId: null, type: null };
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = c.id === 'image' ? 'image/*' : 'video/*';
                    fileInputRef.current.click();
                  }
                } else {
                  const newBlock =
                    c.id === 'checklist'
                      ? { id: blockId(), type: 'checklist', content: JSON.stringify([{ text: '', checked: false }]) }
                      : { id: blockId(), type: c.id, content: c.id === 'bullet' || c.id === 'ordered' ? '<li></li>' : '', caption: '' };
                  addBlockAfter(idx, newBlock);
                }
                setSlashOpen(false);
              }}
            >
              <span className="w-6 h-6 flex items-center justify-center rounded-md bg-[#ede4f7] dark:bg-[#3b2f52] text-[#7b5ea7] shrink-0">
                {typeof c.icon === 'function' ? <c.icon className="w-3.5 h-3.5" /> : c.icon}
              </span>
              <div>
                <span className="font-semibold">{c.label}</span>
                <small className="block text-[10px] text-[#616061] dark:text-[#a393b8]">{c.desc}</small>
              </div>
            </button>
          ))}
        </div>
      )}

    </>
  );
}
