import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { firestoreService } from '../../services/firestoreService';
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
  Copy,
  BarChart2,
  FileText,
  MessageSquare,
  FileBarChart,
  Maximize2,
  Minimize2,
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
  { id: 'poll', icon: BarChart2, label: 'Poll', desc: 'Single or multiple choice poll' },
  { id: 'form', icon: FileText, label: 'Form', desc: 'Custom form with fields' },
  { id: 'report', icon: FileBarChart, label: 'Report', desc: 'Embed an analytics report' },
];

function FormBlock({ data, blockId, canvasId, currentUserEmail, currentUserName, onRemove }) {
  const [formValues, setFormValues] = useState({});
  const [formSubmitted, setFormSubmitted] = useState(false);
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canvasId || !blockId) return;
    firestoreService.addCanvasFormResponse(canvasId, blockId, currentUserEmail || null, currentUserName || null, formValues).then(() => {
      setFormSubmitted(true);
    }).catch(() => {});
  };
  if (formSubmitted) {
    return (
      <div className="py-3 px-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
        Thanks for submitting.
      </div>
    );
  }
  return (
    <form onSubmit={handleSubmit} className="py-2 space-y-3">
      {data.title && <div className="text-sm font-medium text-foreground">{data.title}</div>}
      {data.fields.map((field, i) => (
        <div key={i} className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
          {field.type === 'short_text' && (
            <input
              type="text"
              value={formValues[i] ?? ''}
              onChange={(e) => setFormValues((v) => ({ ...v, [i]: e.target.value }))}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
            />
          )}
          {field.type === 'long_text' && (
            <textarea
              value={formValues[i] ?? ''}
              onChange={(e) => setFormValues((v) => ({ ...v, [i]: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
            />
          )}
          {field.type === 'single_choice' && (
            <select
              value={formValues[i] ?? ''}
              onChange={(e) => setFormValues((v) => ({ ...v, [i]: e.target.value }))}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
            >
              <option value="">Select...</option>
              {(field.options || []).map((opt, j) => (
                <option key={j} value={opt}>{opt}</option>
              ))}
            </select>
          )}
        </div>
      ))}
      <button type="submit" className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
        Submit
      </button>
    </form>
  );
}

function ReportBlock({ block, onContentChange }) {
  const notifyContent = useCallback((content) => onContentChange(block.id, { content }), [block.id, onContentChange]);
  let data = { reportId: '', publicLinkId: '', title: '', size: 'full' };
  try {
    const parsed = JSON.parse(block.content || '{}');
    data = { ...data, ...parsed };
  } catch {
    // use defaults
  }
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const reportUrl = data.publicLinkId ? `${window.location.origin}/report/${data.publicLinkId}` : '';

  useEffect(() => {
    if (!data.publicLinkId && reports.length === 0) {
      setLoadingReports(true);
      firestoreService.getInstagramReports().then((list) => {
        setReports(list.filter((r) => r.publicLinkId));
        setLoadingReports(false);
      }).catch(() => setLoadingReports(false));
    }
  }, [data.publicLinkId]);

  const sizeOptions = [
    { id: 'link', label: 'Link', icon: Link2, desc: 'Small link' },
    { id: 'small', label: 'Small', icon: Minimize2, desc: 'Small embed' },
    { id: 'full', label: 'Full', icon: Maximize2, desc: 'Full view' },
  ];

  if (!data.publicLinkId) {
    return (
      <div className="py-3 px-4 rounded-lg border border-dashed border-border bg-muted/30">
        <label className="text-xs font-medium text-muted-foreground block mb-2">Select report</label>
        <select
          value={data.reportId}
          onChange={(e) => {
            const id = e.target.value;
            const r = reports.find((x) => x.id === id);
            if (r) notifyContent(JSON.stringify({ reportId: r.id, publicLinkId: r.publicLinkId, title: r.title || 'Report', size: data.size }));
          }}
          className="w-full max-w-md px-3 py-2 rounded-md border border-input bg-background text-sm"
          disabled={loadingReports}
        >
          <option value="">{loadingReports ? 'Loading…' : 'Choose a report…'}</option>
          {reports.map((r) => (
            <option key={r.id} value={r.id}>{r.title || 'Untitled'} {r.clientName ? `(${r.clientName})` : ''}</option>
          ))}
        </select>
      </div>
    );
  }

  const SizeButton = ({ sizeId, icon: Icon, label }) => (
    <button
      type="button"
      onClick={() => notifyContent(JSON.stringify({ ...data, size: sizeId }))}
      className={`p-1.5 rounded border transition-colors ${data.size === sizeId ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}
      title={label}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );

  return (
    <div className="relative rounded-lg border border-border bg-muted/20 overflow-hidden">
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
        {sizeOptions.map((s) => (
          <SizeButton key={s.id} sizeId={s.id} icon={s.icon} label={s.label} />
        ))}
      </div>
      {data.size === 'link' && (
        <div className="py-3 px-4 pr-24">
          <a href={reportUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
            {data.title || 'View report'}
          </a>
        </div>
      )}
      {(data.size === 'small' || data.size === 'full') && (
        <iframe
          src={reportUrl}
          title={data.title || 'Report'}
          className="w-full border-0 bg-white dark:bg-[#1d1d1f]"
          style={{ height: data.size === 'small' ? 280 : 420, minHeight: data.size === 'small' ? 280 : 420 }}
        />
      )}
    </div>
  );
}

function contentWithWikiLinks(html) {
  if (!html || typeof html !== 'string') return '';
  return html.replace(/\[\[([^\]]*)\]\]\(([^)]+)\)/g, (_, title, id) => {
    const safeId = String(id).replace(/"/g, '&quot;');
    const safeTitle = (title || 'Workspace').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    return `<a href="/workspaces?id=${encodeURIComponent(id)}" class="text-primary hover:underline" data-wiki="1">${safeTitle}</a>`;
  });
}

// Render @[Display Name](email) as member card: only show name, hide email from display
function contentWithMentions(html) {
  if (!html || typeof html !== 'string') return '';
  return html.replace(/@\[([^\]]*)\]\(([^)]+)\)/g, (_, name, email) => {
    const safeName = String(name || 'User').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    const safeEmail = String(email || '').replace(/"/g, '&quot;');
    return `<span class="mention-pill inline-flex items-center rounded-md bg-primary/10 text-primary px-1.5 py-0.5 text-sm font-medium no-underline" data-mention="1" data-email="${safeEmail}" contenteditable="false">@${safeName}</span>`;
  });
}

// On save, convert mention pills back to @[Name](email) so storage stays canonical (attr order may vary)
function htmlMentionsToStorage(html) {
  if (!html || typeof html !== 'string') return html;
  return html.replace(/<span[^>]*(?:mention-pill[^>]*data-email="([^"]*)"|data-email="([^"]*)"[^>]*mention-pill)[^>]*>@([^<]*)<\/span>/gi, (_, e1, e2, name) => `@[${name}](${e1 || e2})`);
}

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
      if (b.type === 'poll') {
        try {
          const d = JSON.parse(b.content || '{}');
          return (d.question || '') + ' ' + (d.options || []).map((o) => o.text).join(' ');
        } catch {
          return '';
        }
      }
      if (b.type === 'form') {
        try {
          const d = JSON.parse(b.content || '{}');
          return (d.title || '') + ' ' + (d.fields || []).map((f) => f.label).join(' ');
        } catch {
          return '';
        }
      }
      if (b.type === 'report') {
        try {
          const d = JSON.parse(b.content || '{}');
          return d.title || '';
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

const REACTION_EMOJIS = ['👍', '❤️', '😂'];
const TEXT_BLOCK_TYPES = ['text', 'h1', 'h2', 'h3', 'quote', 'code', 'callout', 'bullet', 'ordered'];

function AiSuggestionDiff({ originalHtml, suggestedText, onAccept, onReject }) {
  return (
    <div className="space-y-2 py-1">
      <div className="text-muted-foreground/90 line-through text-[0.95em] min-h-[24px] [&>*]:line-through" dangerouslySetInnerHTML={{ __html: originalHtml || '' }} />
      <div className="text-foreground min-h-[24px] border-l-2 border-primary/50 pl-2 text-[0.95em] whitespace-pre-wrap">{suggestedText}</div>
      <div className="flex items-center gap-2 pt-1">
        <button type="button" onClick={onAccept} className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">Accept</button>
        <button type="button" onClick={onReject} className="px-3 py-1.5 rounded-md border border-input bg-muted/50 hover:bg-muted text-sm">Reject</button>
      </div>
    </div>
  );
}

function SortableBlock({ block, onContentChange, onRemove, isFocused, onFocus, fileInputRef, onRequestImage, onRequestVideo, onSlashDetect, onMentionDetect, onWikiDetect, enableWikiDetect, onEnterCreateBlock, onPasteImage, onBackspaceEmptyBlock, onDuplicateBlock, restoreKey, onOpenComments, onToggleReaction, getBlockData, canvasId, currentUserEmail, currentUserName, aiSuggestion, onAiAccept, onAiReject }) {
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
      className="group flex gap-1 py-0.5 -mx-2 px-2 rounded hover:bg-muted/50"
      data-block-id={block.id}
      data-block-type={block.type}
    >
      <div
        {...attributes}
        {...listeners}
        className="flex items-center justify-center w-6 shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground opacity-0 group-hover:opacity-100 touch-none"
      >
        <GripVertical className="w-4 h-4" />
      </div>
      {onDuplicateBlock && (
        <button
          type="button"
          onClick={() => onDuplicateBlock(block.id)}
          className="flex items-center justify-center w-6 shrink-0 rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-foreground"
          title="Duplicate block"
          aria-label="Duplicate block"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
      )}
      <div className="flex-1 min-w-0 relative">
        {aiSuggestion?.blockId === block.id && TEXT_BLOCK_TYPES.includes(block.type) && onAiAccept && onAiReject ? (
          <AiSuggestionDiff
            originalHtml={aiSuggestion.originalHtml}
            suggestedText={aiSuggestion.suggestedText}
            onAccept={onAiAccept}
            onReject={onAiReject}
          />
        ) : (
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
            onMentionDetect={onMentionDetect}
            onWikiDetect={enableWikiDetect ? onWikiDetect : null}
            onEnterCreateBlock={onEnterCreateBlock}
            onPasteImage={onPasteImage}
            onBackspaceEmptyBlock={onBackspaceEmptyBlock}
            restoreKey={restoreKey}
            canvasId={canvasId}
            currentUserEmail={currentUserEmail}
            currentUserName={currentUserName}
          />
        )}
        {(canvasId && (onOpenComments || onToggleReaction)) || onRemove ? (
          <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
            {canvasId && onOpenComments && (
              <button
                type="button"
                onClick={() => onOpenComments(block.id)}
                className="p-1 rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                title="Comment"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                {getBlockData?.(block.id)?.comments?.length > 0 && (
                  <span className="ml-0.5 text-[10px]">{getBlockData(block.id).comments.length}</span>
                )}
              </button>
            )}
            {canvasId && onToggleReaction && REACTION_EMOJIS.map((emoji) => {
              const reactions = getBlockData?.(block.id)?.reactions || [];
              const count = reactions.filter((r) => r.emoji === emoji).length;
              const hasReacted = currentUserEmail && reactions.some((r) => r.emoji === emoji && r.userId === currentUserEmail);
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onToggleReaction(block.id, emoji)}
                  className={`p-1 rounded text-sm ${hasReacted ? 'opacity-100' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                  title={emoji}
                >
                  {emoji}{count > 0 ? <span className="ml-0.5 text-[10px]">{count}</span> : null}
                </button>
              );
            })}
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(block.id)}
                className="p-1 rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                title="Remove block"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function BlockContent({ block, onContentChange, onRemove, isFocused, onFocus, fileInputRef, onRequestImage, onRequestVideo, onSlashDetect, onMentionDetect, onWikiDetect, onEnterCreateBlock, onPasteImage, onBackspaceEmptyBlock, restoreKey, canvasId, currentUserEmail, currentUserName }) {
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
              className="mt-1.5 w-4 h-4 accent-primary cursor-pointer shrink-0"
            />
            <span
              ref={i === 0 ? elRef : null}
              contentEditable
              suppressContentEditableWarning
              className={`flex-1 outline-none min-h-[22px] ${item.checked ? 'line-through text-muted-foreground' : ''}`}
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

  if (block.type === 'poll') {
    let data = { question: '', options: [{ text: 'Option 1', votes: 0 }, { text: 'Option 2', votes: 0 }], votedBy: [] };
    try {
      data = JSON.parse(block.content || '{}');
      if (!Array.isArray(data.options)) data.options = [{ text: 'Option 1', votes: 0 }, { text: 'Option 2', votes: 0 }];
      if (!Array.isArray(data.votedBy)) data.votedBy = [];
    } catch {
      // use defaults
    }
    const hasVoted = currentUserEmail && data.votedBy.includes(currentUserEmail);
    const totalVotes = data.options.reduce((s, o) => s + (o.votes || 0), 0);
    return (
      <div className="py-2 space-y-3">
        <input
          type="text"
          value={data.question}
          onChange={(e) => {
            const next = { ...data, question: e.target.value };
            notifyContent(JSON.stringify(next));
          }}
          placeholder="Poll question"
          className="w-full text-base font-medium bg-transparent border-none outline-none focus:ring-0 p-0 text-foreground placeholder:text-muted-foreground"
        />
        <div className="space-y-2">
          {data.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <button
                type="button"
                disabled={hasVoted}
                onClick={() => {
                  if (!currentUserEmail || hasVoted) return;
                  const nextOpts = data.options.map((o, j) => (j === i ? { ...o, votes: (o.votes || 0) + 1 } : o));
                  const next = { ...data, options: nextOpts, votedBy: [...data.votedBy, currentUserEmail] };
                  notifyContent(JSON.stringify(next));
                }}
                className="px-3 py-1.5 rounded-md border border-input bg-muted/50 hover:bg-muted text-sm disabled:opacity-60"
              >
                Vote
              </button>
              <span className="flex-1 text-sm text-foreground">{opt.text}</span>
              {totalVotes > 0 && (
                <span className="text-xs text-muted-foreground">
                  {opt.votes || 0} ({totalVotes ? Math.round(((opt.votes || 0) / totalVotes) * 100) : 0}%)
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (block.type === 'form') {
    let data = { title: '', fields: [{ type: 'short_text', label: 'Field 1' }] };
    try {
      data = JSON.parse(block.content || '{}');
      if (!Array.isArray(data.fields)) data.fields = [{ type: 'short_text', label: 'Field 1' }];
    } catch {
      // use defaults
    }
    return (
      <FormBlock
        data={data}
        blockId={block.id}
        canvasId={canvasId}
        currentUserEmail={currentUserEmail}
        currentUserName={currentUserName}
        onRemove={() => onRemove(block.id)}
      />
    );
  }

  if (block.type === 'report') {
    return (
      <ReportBlock
        block={block}
        onContentChange={(blockId, patch) => onContentChange(blockId, patch)}
      />
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
              className="text-sm text-muted-foreground text-center py-1 px-2 outline-none empty:before:content-['Add_caption…'] empty:before:text-muted-foreground"
              onBlur={(e) => notifyContent(block.content, e.currentTarget.innerHTML)}
              dangerouslySetInnerHTML={{ __html: block.caption || '' }}
            />
          </>
        ) : (
          <button
            type="button"
            onClick={() => onRequestImage?.()}
            className="w-full py-8 border-2 border-dashed border-primary rounded-lg text-primary font-medium hover:bg-primary/10"
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
              className="text-sm text-muted-foreground text-center py-1 outline-none empty:before:content-['Add_caption…']"
              onBlur={(e) => notifyContent(block.content, e.currentTarget.innerHTML)}
              dangerouslySetInnerHTML={{ __html: block.caption || '' }}
            />
          </>
        ) : (
          <button
            type="button"
            onClick={() => onRequestVideo?.()}
            className="w-full py-8 border-2 border-dashed border-primary rounded-lg text-primary font-medium hover:bg-primary/10"
          >
            Click or drop video
          </button>
        )}
      </div>
    );
  }

  if (block.type === 'divider') {
    return <hr className="border-0 h-px bg-border my-4" />;
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
              ? 'border-l-4 border-primary pl-4 py-1 bg-muted rounded-r text-muted-foreground italic'
              : block.type === 'code'
                ? 'font-mono text-sm bg-muted border border-border rounded px-4 py-2 whitespace-pre-wrap'
                : block.type === 'callout'
                  ? 'flex gap-2 py-2 px-3 bg-amber-500/10 dark:bg-amber-500/15 border-l-4 border-amber-500 dark:border-amber-400 rounded-r'
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
            key={restoreKey != null ? `${block.id}-r${restoreKey}` : block.id}
            contentEditable
            suppressContentEditableWarning
            className="list-disc outline-none list-inside min-h-[24px]"
            dangerouslySetInnerHTML={{ __html: contentWithMentions(contentWithWikiLinks(block.content || '<li></li>')) }}
            onBlur={(e) => notifyContent(htmlMentionsToStorage(e.currentTarget.innerHTML))}
            onFocus={() => onFocus(block.id)}
          />
        )}
        {block.type === 'ordered' && (
          <ol
            key={restoreKey != null ? `${block.id}-r${restoreKey}` : block.id}
            contentEditable
            suppressContentEditableWarning
            className="list-decimal outline-none list-inside min-h-[24px]"
            dangerouslySetInnerHTML={{ __html: contentWithMentions(contentWithWikiLinks(block.content || '<li></li>')) }}
            onBlur={(e) => notifyContent(htmlMentionsToStorage(e.currentTarget.innerHTML))}
            onFocus={() => onFocus(block.id)}
          />
        )}
        {!['bullet', 'ordered'].includes(block.type) && (
          <div
            key={restoreKey != null ? `${block.id}-r${restoreKey}` : block.id}
            contentEditable
            suppressContentEditableWarning
            ref={block.type === 'text' ? elRef : undefined}
            className={contentClass}
            data-placeholder={placeholder}
            dangerouslySetInnerHTML={{ __html: contentWithMentions(contentWithWikiLinks(block.content || '')) }}
            onBlur={(e) => notifyContent(htmlMentionsToStorage(e.currentTarget.innerHTML))}
            onFocus={() => onFocus(block.id)}
            onKeyDown={(e) => {
              const el = e.currentTarget;
              const text = (el.textContent || '').trim();
              const isTextLike = ['text', 'h1', 'h2', 'h3', 'quote', 'callout'].includes(block.type);
              if (e.key === 'Enter' && !e.shiftKey && onEnterCreateBlock && isTextLike) {
                const sel = window.getSelection();
                const atEnd = !sel?.rangeCount || (() => {
                  const r = sel.getRangeAt(0);
                  if (!r.collapsed) return false;
                  const end = document.createRange();
                  end.selectNodeContents(el);
                  end.collapse(false);
                  return r.compareBoundaryPoints(Range.END_TO_END, end) === 0;
                })();
                if (text === '' || atEnd) {
                  e.preventDefault();
                  onEnterCreateBlock(block.id);
                }
              }
              if (e.key === 'Backspace' && text === '' && onBackspaceEmptyBlock && isTextLike) {
                e.preventDefault();
                onBackspaceEmptyBlock(block.id);
              }
            }}
            onPaste={(e) => {
              const files = e.clipboardData?.files;
              if (files?.length && onPasteImage) {
                const imageFile = Array.from(files).find((f) => f.type.startsWith('image/'));
                if (imageFile) {
                  e.preventDefault();
                  onPasteImage(block.id, imageFile);
                }
              }
            }}
            onInput={(e) => {
              if (!['text', 'h1', 'h2', 'h3', 'quote', 'callout'].includes(block.type)) return;
              const sel = window.getSelection();
              if (!sel?.rangeCount) return;
              const node = sel.anchorNode;
              const text = node?.textContent || '';
              const offset = sel.anchorOffset || 0;
              const before = text.substring(0, offset);
              const slashM = before.match(/\/(\w*)$/);
              const mentionM = before.match(/@([^\s@]*)$/);
              const wikiM = before.match(/\[\[([^\]]*)$/);
              const rect = e.currentTarget.getBoundingClientRect();
              if (slashM && onSlashDetect) {
                onSlashDetect(slashM[1], rect);
                if (onMentionDetect) onMentionDetect(null, null, null);
                if (onWikiDetect) onWikiDetect(null, null, null);
              } else if (mentionM && onMentionDetect) {
                onMentionDetect(block.id, mentionM[1], rect);
                if (onSlashDetect) onSlashDetect(null);
                if (onWikiDetect) onWikiDetect(null, null, null);
              } else if (wikiM && onWikiDetect) {
                onWikiDetect(block.id, wikiM[1], rect);
                if (onSlashDetect) onSlashDetect(null);
                if (onMentionDetect) onMentionDetect(null, null, null);
              } else {
                if (onSlashDetect) onSlashDetect(null);
                if (onMentionDetect) onMentionDetect(null, null, null);
                if (onWikiDetect) onWikiDetect(null, null, null);
              }
            }}
            style={{ caretColor: 'hsl(var(--primary))' }}
          />
        )}
      </div>
    );
  }

  return null;
}

function CanvasBlockEditorInner({
  blocks,
  onBlocksChange,
  onWordCountChange,
  restoreKey = 0,
  approvedUsers = [],
  highlightBlockId = null,
  canvasId = null,
  currentUserEmail = null,
  currentUserName = null,
  workspaceList = [],
  aiSuggestion = null,
  onAiAccept = null,
  onAiReject = null,
  latestBlocksRef = null,
}, ref) {
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
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const mentionPosRef = useRef({ left: 0, top: 0 });
  const mentionBlockIdRef = useRef(null);
  const [wikiOpen, setWikiOpen] = useState(false);
  const [wikiFilter, setWikiFilter] = useState('');
  const [wikiIndex, setWikiIndex] = useState(0);
  const wikiBlockIdRef = useRef(null);
  const wikiPosRef = useRef({ left: 0, top: 0 });
  const [openCommentBlockId, setOpenCommentBlockId] = useState(null);
  const [blockDataMap, setBlockDataMap] = useState({});
  const [commentInput, setCommentInput] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [addBlockMenuOpen, setAddBlockMenuOpen] = useState(false);
  const addBlockMenuPosRef = useRef({ left: 0, top: 0 });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const safeBlocks = Array.isArray(blocks) ? blocks : [];
  const blockIds = safeBlocks.map((b) => b.id);

  const updateBlock = useCallback(
    (blockId, patch) => {
      const base = (latestBlocksRef?.current && Array.isArray(latestBlocksRef.current)) ? latestBlocksRef.current : safeBlocks;
      const next = base.map((b) =>
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
    [safeBlocks, onBlocksChange, onWordCountChange, latestBlocksRef]
  );

  const addBlockAfter = useCallback(
    (afterIndex, block) => {
      const base = (latestBlocksRef?.current && Array.isArray(latestBlocksRef.current)) ? latestBlocksRef.current : safeBlocks;
      const next = [...base];
      next.splice(afterIndex + 1, 0, block);
      onBlocksChange(next);
      setFocusedBlockId(block.id);
      if (onWordCountChange) onWordCountChange(wordCharCount(next));
    },
    [safeBlocks, onBlocksChange, onWordCountChange, latestBlocksRef]
  );

  const createBlockByType = useCallback((typeId) => {
    if (typeId === 'checklist') {
      return { id: blockId(), type: 'checklist', content: JSON.stringify([{ text: '', checked: false }]) };
    }
    if (typeId === 'poll') {
      return { id: blockId(), type: 'poll', content: JSON.stringify({ question: '', options: [{ text: 'Option 1', votes: 0 }, { text: 'Option 2', votes: 0 }], votedBy: [] }) };
    }
    if (typeId === 'form') {
      return { id: blockId(), type: 'form', content: JSON.stringify({ title: '', fields: [{ type: 'short_text', label: 'Field 1' }] }) };
    }
    if (typeId === 'report') {
      return { id: blockId(), type: 'report', content: JSON.stringify({ reportId: '', publicLinkId: '', title: '', size: 'full' }) };
    }
    if (typeId === 'image' || typeId === 'video') {
      return { id: blockId(), type: typeId, content: '', caption: '' };
    }
    return { id: blockId(), type: typeId, content: typeId === 'bullet' || typeId === 'ordered' ? '<li></li>' : '', caption: '' };
  }, []);

  const removeBlock = useCallback(
    (blockId) => {
      const base = (latestBlocksRef?.current && Array.isArray(latestBlocksRef.current)) ? latestBlocksRef.current : safeBlocks;
      const next = base.filter((b) => b.id !== blockId);
      onBlocksChange(next);
      if (onWordCountChange) onWordCountChange(wordCharCount(next));
    },
    [safeBlocks, onBlocksChange, onWordCountChange, latestBlocksRef]
  );

  const handleEnterCreateBlock = useCallback(
    (blockId) => {
      const idx = safeBlocks.findIndex((b) => b.id === blockId);
      if (idx === -1) return;
      const newBlock = { id: blockId(), type: 'text', content: '' };
      addBlockAfter(idx, newBlock);
      setFocusedBlockId(newBlock.id);
    },
    [safeBlocks, addBlockAfter]
  );

  const handlePasteImage = useCallback(
    (blockId, file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const idx = safeBlocks.findIndex((b) => b.id === blockId);
        const newBlock = { id: blockId(), type: 'image', content: ev.target.result, caption: '' };
        addBlockAfter(idx >= 0 ? idx : safeBlocks.length - 1, newBlock);
        setFocusedBlockId(newBlock.id);
      };
      reader.readAsDataURL(file);
    },
    [safeBlocks, addBlockAfter]
  );

  const handleBackspaceEmptyBlock = useCallback(
    (blockId) => {
      const idx = safeBlocks.findIndex((b) => b.id === blockId);
      if (idx <= 0) return;
      const prev = safeBlocks[idx - 1];
      removeBlock(blockId);
      setFocusedBlockId(prev.id);
    },
    [safeBlocks, removeBlock]
  );

  const handleDuplicateBlock = useCallback(
    (blockId) => {
      const base = (latestBlocksRef?.current && Array.isArray(latestBlocksRef.current)) ? latestBlocksRef.current : safeBlocks;
      const idx = base.findIndex((b) => b.id === blockId);
      if (idx === -1) return;
      const block = base[idx];
      const cloned = { ...block, id: blockId() };
      addBlockAfter(idx, cloned);
      setFocusedBlockId(cloned.id);
    },
    [safeBlocks, addBlockAfter, latestBlocksRef]
  );

  useImperativeHandle(ref, () => ({
    syncFocusedBlockFromDom() {
      if (!focusedBlockId || !containerRef.current) return;
      const row = containerRef.current.querySelector(`[data-block-id="${focusedBlockId}"]`);
      const editable = row?.querySelector?.('[contenteditable="true"]');
      if (editable && editable.innerHTML !== undefined) {
        updateBlock(focusedBlockId, { content: editable.innerHTML });
      }
    },
    getFocusedBlockId() {
      return focusedBlockId;
    },
    getFocusedBlockContent() {
      if (!focusedBlockId || !containerRef.current) return null;
      const row = containerRef.current.querySelector(`[data-block-id="${focusedBlockId}"]`);
      const editable = row?.querySelector?.('[contenteditable="true"]');
      return editable ? editable.innerHTML : null;
    },
    setFocusedBlockContent(html) {
      if (!focusedBlockId || !containerRef.current) return;
      const row = containerRef.current.querySelector(`[data-block-id="${focusedBlockId}"]`);
      const editable = row?.querySelector?.('[contenteditable="true"]');
      if (editable) {
        editable.innerHTML = html;
        updateBlock(focusedBlockId, { content: html });
      }
    },
    openAddBlockMenu() {
      setAddBlockMenuOpen(true);
      const rect = containerRef.current?.getBoundingClientRect?.();
      if (rect) {
        addBlockMenuPosRef.current = { left: rect.left + rect.width / 2 - 115, top: rect.bottom - 140 };
      }
    },
  }), [focusedBlockId, updateBlock]);

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

  const handleWikiDetect = useCallback((blockId, filter, rect) => {
    if (blockId === null) {
      setWikiOpen(false);
      wikiBlockIdRef.current = null;
      return;
    }
    if (rect) wikiPosRef.current = { left: rect.left, top: rect.bottom + 4 };
    wikiBlockIdRef.current = blockId;
    setWikiFilter(filter || '');
    setWikiIndex(0);
    setWikiOpen(true);
  }, []);

  const handleWikiSelect = useCallback((workspace) => {
    const blockId = wikiBlockIdRef.current;
    if (!blockId || !workspace) { setWikiOpen(false); return; }
    const block = safeBlocks.find((b) => b.id === blockId);
    if (!block) { setWikiOpen(false); return; }
    const token = `[[${workspace.title || 'Workspace'}](${workspace.id})`;
    const content = block.content || '';
    const needle = '[[' + wikiFilter;
    const idx = content.indexOf(needle);
    const newContent = idx === -1 ? content + token : content.slice(0, idx) + token + content.slice(idx + needle.length);
    updateBlock(blockId, { content: newContent });
    setWikiOpen(false);
    wikiBlockIdRef.current = null;
  }, [wikiFilter, safeBlocks, updateBlock]);

  const wikiItems = (workspaceList || []).filter((w) => {
    const q = (wikiFilter || '').toLowerCase();
    if (!q) return true;
    return (w.title || '').toLowerCase().includes(q);
  }).slice(0, 8);

  const handleMentionDetect = useCallback((blockId, filter, rect) => {
    if (blockId === null) {
      setMentionOpen(false);
      mentionBlockIdRef.current = null;
      return;
    }
    if (rect) {
      mentionPosRef.current = { left: rect.left, top: rect.bottom + 4 };
    }
    mentionBlockIdRef.current = blockId;
    setMentionFilter(filter || '');
    setMentionIndex(0);
    setMentionOpen(true);
  }, []);

  const handleMentionSelect = useCallback((user) => {
    const blockId = mentionBlockIdRef.current;
    if (!blockId) { setMentionOpen(false); return; }
    const block = safeBlocks.find((b) => b.id === blockId);
    if (!block) { setMentionOpen(false); return; }
    // Use live DOM content so deletions (e.g. backspaced pill) are reflected before we insert
    const row = containerRef.current?.querySelector(`[data-block-id="${blockId}"]`);
    const editable = row?.querySelector?.('[contenteditable="true"]');
    const rawHtml = editable?.innerHTML ?? block.content ?? '';
    const content = htmlMentionsToStorage(rawHtml);
    const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || '';
    const token = `@[${displayName}](${user.email || user.id || ''})`;
    const needle = '@' + mentionFilter;
    const idx = content.indexOf(needle);
    const newContent = idx === -1 ? content + token : content.slice(0, idx) + token + content.slice(idx + needle.length);
    updateBlock(blockId, { content: newContent });
    setMentionOpen(false);
    mentionBlockIdRef.current = null;
  }, [mentionFilter, safeBlocks, updateBlock]);

  const mentionItems = (approvedUsers || []).filter((u) => {
    const name = [u.firstName, u.lastName].filter(Boolean).join(' ').toLowerCase();
    const email = (u.email || u.id || '').toLowerCase();
    const q = (mentionFilter || '').toLowerCase();
    if (!q) return true;
    return name.includes(q) || email.includes(q);
  }).slice(0, 8);

  const slashItems = BLOCK_TYPES.filter(
    (c) =>
      !slashFilter ||
      c.label.toLowerCase().includes(slashFilter.toLowerCase()) ||
      c.id.includes(slashFilter)
  );

  // Slash menu keyboard: ArrowUp/Down, Enter, Escape
  useEffect(() => {
    if (!slashOpen || slashItems.length === 0) return;
    const onKey = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashIndex((i) => (i + 1) % slashItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashIndex((i) => (i - 1 + slashItems.length) % slashItems.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const c = slashItems[slashIndex];
        if (!c) return;
        const idx = focusedIndex >= 0 ? focusedIndex : safeBlocks.length - 1;
        if (c.id === 'image' || c.id === 'video') {
          pendingMediaRef.current = { blockId: null, type: null };
          if (fileInputRef.current) {
            fileInputRef.current.accept = c.id === 'image' ? 'image/*' : 'video/*';
            fileInputRef.current.click();
          }
        } else {
          let newBlock;
          if (c.id === 'checklist') {
            newBlock = { id: blockId(), type: 'checklist', content: JSON.stringify([{ text: '', checked: false }]) };
          } else if (c.id === 'poll') {
            newBlock = { id: blockId(), type: 'poll', content: JSON.stringify({ question: '', options: [{ text: 'Option 1', votes: 0 }, { text: 'Option 2', votes: 0 }], votedBy: [] }) };
          } else if (c.id === 'form') {
            newBlock = { id: blockId(), type: 'form', content: JSON.stringify({ title: '', fields: [{ type: 'short_text', label: 'Field 1' }] }) };
          } else {
            newBlock = { id: blockId(), type: c.id, content: c.id === 'bullet' || c.id === 'ordered' ? '<li></li>' : '', caption: '' };
          }
          addBlockAfter(idx, newBlock);
          setFocusedBlockId(newBlock.id);
        }
        setSlashOpen(false);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setSlashOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [slashOpen, slashIndex, slashItems, focusedIndex, safeBlocks, addBlockAfter]);

  // Mention menu keyboard
  useEffect(() => {
    if (!mentionOpen || mentionItems.length === 0) return;
    const onKey = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((i) => (i + 1) % mentionItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((i) => (i - 1 + mentionItems.length) % mentionItems.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const u = mentionItems[mentionIndex];
        if (u) handleMentionSelect(u);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setMentionOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mentionOpen, mentionIndex, mentionItems, handleMentionSelect]);

  useEffect(() => {
    if (!wikiOpen || wikiItems.length === 0) return;
    const onKey = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setWikiIndex((i) => (i + 1) % wikiItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setWikiIndex((i) => (i - 1 + wikiItems.length) % wikiItems.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const w = wikiItems[wikiIndex];
        if (w) handleWikiSelect(w);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setWikiOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [wikiOpen, wikiIndex, wikiItems, handleWikiSelect]);

  // Scroll to and focus block when highlightBlockId is set
  useEffect(() => {
    if (!highlightBlockId || !containerRef.current) return;
    const row = containerRef.current.querySelector(`[data-block-id="${highlightBlockId}"]`);
    if (!row) return;
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const editable = row.querySelector?.('[contenteditable="true"]');
    if (editable) {
      editable.focus();
      setFocusedBlockId(highlightBlockId);
    }
  }, [highlightBlockId]);

  useEffect(() => {
    if (!openCommentBlockId || !canvasId) return;
    firestoreService.getBlockComments(canvasId, openCommentBlockId).then((data) => {
      setBlockDataMap((prev) => ({ ...prev, [openCommentBlockId]: data }));
    });
  }, [openCommentBlockId, canvasId]);

  const handleOpenComments = useCallback((blockId) => {
    setOpenCommentBlockId(blockId);
    setCommentInput('');
  }, []);

  const handleToggleReaction = useCallback((blockId, emoji) => {
    if (!canvasId || !blockId || !currentUserEmail) return;
    firestoreService.toggleBlockReaction(canvasId, blockId, emoji, currentUserEmail).then(() => {
      firestoreService.getBlockComments(canvasId, blockId).then((data) => {
        setBlockDataMap((prev) => ({ ...prev, [blockId]: data }));
      });
    });
  }, [canvasId, currentUserEmail]);

  const getBlockData = useCallback((blockId) => blockDataMap[blockId], [blockDataMap]);

  const handleAddBlockComment = useCallback(async () => {
    if (!openCommentBlockId || !canvasId || !commentInput.trim() || !currentUserEmail) return;
    setCommentSubmitting(true);
    try {
      const newComment = await firestoreService.addBlockComment(canvasId, openCommentBlockId, {
        user: currentUserEmail,
        userName: currentUserName || currentUserEmail,
        text: commentInput.trim(),
      });
      setBlockDataMap((prev) => ({
        ...prev,
        [openCommentBlockId]: {
          ...prev[openCommentBlockId],
          comments: [...(prev[openCommentBlockId]?.comments || []), newComment],
          reactions: prev[openCommentBlockId]?.reactions || [],
        },
      }));
      setCommentInput('');
    } finally {
      setCommentSubmitting(false);
    }
  }, [openCommentBlockId, canvasId, commentInput, currentUserEmail, currentUserName]);

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
              className={`flex flex-col items-center justify-center gap-2 py-8 my-2 border-2 border-dashed rounded-xl text-primary font-semibold text-sm ${
                dropZoneOver ? 'bg-primary/15 border-primary' : 'bg-primary/5'
              }`}
            >
              Drop images or videos here
              <span className="text-xs font-normal text-muted-foreground">PNG, JPG, GIF, MP4, WebM</span>
            </div>
          )}

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
              {safeBlocks.map((block) => (
                <SortableBlock
                  key={block.id}
                  block={block}
                  restoreKey={restoreKey}
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
                  onMentionDetect={handleMentionDetect}
                  onWikiDetect={handleWikiDetect}
                  enableWikiDetect={(workspaceList || []).length > 0}
                  onEnterCreateBlock={handleEnterCreateBlock}
                  onPasteImage={handlePasteImage}
                  onBackspaceEmptyBlock={handleBackspaceEmptyBlock}
                  onDuplicateBlock={handleDuplicateBlock}
                  onOpenComments={canvasId ? handleOpenComments : null}
                  onToggleReaction={canvasId && currentUserEmail ? handleToggleReaction : null}
                  getBlockData={getBlockData}
                  canvasId={canvasId}
                  currentUserEmail={currentUserEmail}
                  currentUserName={currentUserName}
                  aiSuggestion={aiSuggestion}
                  onAiAccept={onAiAccept}
                  onAiReject={onAiReject}
                />
              ))}
            </SortableContext>
          </DndContext>

          <div className="flex items-center gap-2 py-2 mt-2 opacity-80 hover:opacity-100 relative">
            <button
              type="button"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                addBlockMenuPosRef.current = { left: rect.left, top: rect.bottom + 4 };
                setAddBlockMenuOpen((o) => !o);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground border border-dashed border-border rounded-md hover:border-primary hover:text-primary"
            >
              <Plus className="w-4 h-4" /> Add block
            </button>
            <button
              type="button"
              onClick={() => {
                pendingMediaRef.current = { blockId: null, type: null };
                fileInputRef.current?.click();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground border border-dashed border-border rounded-md hover:border-primary hover:text-primary"
            >
              <Image className="w-4 h-4" /> Add media
            </button>
            {addBlockMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setAddBlockMenuOpen(false)} aria-hidden />
                <div
                  className="fixed z-50 w-[230px] max-h-[280px] overflow-y-auto py-1.5 px-1.5 bg-popover border border-border rounded-xl shadow-xl"
                  style={{ left: addBlockMenuPosRef.current.left, top: addBlockMenuPosRef.current.top }}
                >
                  {BLOCK_TYPES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="w-full flex items-center gap-2 py-2 px-3 rounded-lg text-left text-sm text-foreground hover:bg-muted"
                      onClick={() => {
                        if (c.id === 'image' || c.id === 'video') {
                          pendingMediaRef.current = { blockId: null, type: null };
                          if (fileInputRef.current) {
                            fileInputRef.current.accept = c.id === 'image' ? 'image/*' : 'video/*';
                            fileInputRef.current.click();
                          }
                        } else {
                          const newBlock = createBlockByType(c.id);
                          addBlockAfter(safeBlocks.length - 1, newBlock);
                          setFocusedBlockId(newBlock.id);
                        }
                        setAddBlockMenuOpen(false);
                      }}
                    >
                      <span className="w-6 h-6 flex items-center justify-center rounded-md bg-muted text-primary shrink-0">
                        {typeof c.icon === 'string' || typeof c.icon === 'number' ? c.icon : React.createElement(c.icon, { className: 'w-3.5 h-3.5' })}
                      </span>
                      <div>
                        <span className="font-semibold">{c.label}</span>
                        <small className="block text-[10px] text-muted-foreground">{c.desc}</small>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {slashOpen && slashItems.length > 0 && (() => {
        // #region agent log
        fetch('http://127.0.0.1:7247/ingest/5f481a4f-2c53-40ee-be98-e77cffd69946',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CanvasBlockEditor.jsx:slashMenu',message:'slash menu render',data:{slashItemsLen:slashItems.length,firstIconType:typeof slashItems[0]?.icon,firstIconKeys:slashItems[0]?.icon!=null?Object.keys(slashItems[0].icon).slice(0,5):null,firstId:slashItems[0]?.id},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        return (
        <div
          className="fixed z-50 w-[230px] max-h-[260px] overflow-y-auto py-1.5 px-1.5 bg-popover border border-border rounded-xl shadow-xl"
          style={{ left: slashPosRef.current.left, top: slashPosRef.current.top }}
        >
          {slashItems.map((c, i) => (
            <button
              key={c.id}
              type="button"
              className={`w-full flex items-center gap-2 py-2 px-3 rounded-lg text-left text-sm text-foreground ${
                i === slashIndex ? 'bg-muted' : 'hover:bg-muted'
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
                  const newBlock = createBlockByType(c.id);
                  addBlockAfter(idx, newBlock);
                }
                setSlashOpen(false);
              }}
            >
              <span className="w-6 h-6 flex items-center justify-center rounded-md bg-muted text-primary shrink-0">
                {(() => {
                  // #region agent log
                  const isPrim = typeof c.icon === 'string' || typeof c.icon === 'number';
                  let out = isPrim ? c.icon : React.createElement(c.icon, { className: 'w-3.5 h-3.5' });
                  if (!isPrim && c.icon != null) {
                    fetch('http://127.0.0.1:7247/ingest/5f481a4f-2c53-40ee-be98-e77cffd69946',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CanvasBlockEditor.jsx:iconBranch',message:'icon render',data:{id:c.id,iconType:typeof c.icon,iconKeys:Object.keys(c.icon).slice(0,6),outKeys:out&&typeof out==='object'?Object.keys(out).slice(0,6):null},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
                  }
                  // #endregion
                  return out;
                })()}
              </span>
              <div>
                <span className="font-semibold">{c.label}</span>
                <small className="block text-[10px] text-muted-foreground">{c.desc}</small>
              </div>
            </button>
          ))}
        </div>
      ); })()}

      {openCommentBlockId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setOpenCommentBlockId(null)}>
          <div className="bg-popover border border-border rounded-xl shadow-xl w-full max-w-md max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-3 border-b border-border font-medium text-foreground">Comments</div>
            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
              {(blockDataMap[openCommentBlockId]?.comments || []).map((c) => (
                <div key={c.id} className="text-sm">
                  <span className="font-medium text-foreground">{c.userName || c.user}</span>
                  <span className="text-muted-foreground ml-2 text-xs">{c.createdAt && new Date(c.createdAt).toLocaleString()}</span>
                  <p className="mt-0.5 text-foreground/90">{c.text}</p>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-border flex gap-2">
              <input
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAddBlockComment()}
                placeholder="Add a comment…"
                className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-sm"
              />
              <button
                type="button"
                onClick={handleAddBlockComment}
                disabled={commentSubmitting || !commentInput.trim()}
                className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {wikiOpen && wikiItems.length > 0 && (
        <div
          className="fixed z-50 w-[260px] max-h-[260px] overflow-y-auto py-1.5 px-1.5 bg-popover border border-border rounded-xl shadow-xl"
          style={{ left: wikiPosRef.current.left, top: wikiPosRef.current.top }}
        >
          {wikiItems.map((w, i) => (
            <button
              key={w.id}
              type="button"
              className={`w-full flex items-center gap-2 py-2 px-3 rounded-lg text-left text-sm text-foreground ${i === wikiIndex ? 'bg-muted' : 'hover:bg-muted'}`}
              onClick={() => handleWikiSelect(w)}
            >
              <span className="text-base">{w.title || 'Untitled'}</span>
            </button>
          ))}
        </div>
      )}

      {mentionOpen && mentionItems.length > 0 && (
        <div
          className="fixed z-50 w-[260px] max-h-[260px] overflow-y-auto py-1.5 px-1.5 bg-popover border border-border rounded-xl shadow-xl"
          style={{ left: mentionPosRef.current.left, top: mentionPosRef.current.top }}
        >
          {mentionItems.map((u, i) => (
            <button
              key={u.email || u.id || i}
              type="button"
              className={`w-full flex items-center gap-2 py-2 px-3 rounded-lg text-left text-sm text-foreground ${
                i === mentionIndex ? 'bg-muted' : 'hover:bg-muted'
              }`}
              onClick={() => handleMentionSelect(u)}
            >
              <span className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                {(u.firstName?.[0] || u.email?.[0] || '?').toUpperCase()}
              </span>
              <div className="min-w-0">
                <div className="font-medium truncate">
                  {[u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || 'User'}
                </div>
                {u.email && <div className="text-xs text-muted-foreground truncate">{u.email}</div>}
              </div>
            </button>
          ))}
        </div>
      )}

    </>
  );
}

export default forwardRef(CanvasBlockEditorInner);
