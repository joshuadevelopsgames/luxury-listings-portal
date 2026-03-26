import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Calendar, Plus, Instagram, Facebook, Twitter, Linkedin, Youtube,
  Image, Video, FileText, Clock, Users, TrendingUp, Settings,
  ExternalLink, Filter, Download, RefreshCw, CheckCircle, AlertCircle, Pause, Play,
  X, Edit, Trash2, Eye, CalendarDays, Folder, FolderPlus, FileSpreadsheet, Upload,
  Check, MoreVertical, Link as LinkIcon, ChevronLeft, ChevronRight,
  Grid, List, LayoutGrid, MessageSquare, ThumbsUp, ThumbsDown, BookmarkPlus,
  Bookmark, Hash, Sparkles, Library, Star, Clock3, GripVertical
} from 'lucide-react';
import { format, addDays, isToday, isPast, isFuture, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek, addWeeks, subWeeks, addMonths, subMonths, getDay } from 'date-fns';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import XLogo from '../../assets/Twitter-X-logo.png';
import XLogoSelected from '../../assets/x-logo-selected.png';
import { CAPABILITIES } from '../../entities/Capabilities';
import { toast } from 'react-hot-toast';
import { useConfirm } from '../contexts/ConfirmContext';
import { googleSheetsService } from '../services/googleSheetsService';
import { openaiService } from '../services/openaiService';
import { uploadFile } from '../../services/storageService';
import { supabaseService } from '../../services/supabaseService';
import PostPreviewCard from '../../components/content/PostPreviewCard';

const MAX_MEDIA_PER_POST = 15;

// ─── Draggable Post Chip ────────────────────────────────────────────────────
function DraggablePostChip({ content, getStatusColor, getContentThumbUrl, onClick }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: content.id });
  const style = transform ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)`, opacity: isDragging ? 0.4 : 1, zIndex: isDragging ? 999 : 'auto' } : {};
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => { e.stopPropagation(); onClick(content); }}
      className={`text-[10px] p-1.5 rounded-lg overflow-hidden cursor-grab active:cursor-grabbing select-none ${getStatusColor(content.status)} group relative`}
      title={content.title}
    >
      {getContentThumbUrl(content) ? (
        <img src={getContentThumbUrl(content)} alt={content.title} className="w-full h-12 object-cover rounded mb-1" onError={(e) => { e.target.style.display = 'none'; }} />
      ) : (
        <div className="w-full h-12 rounded mb-1 flex items-center justify-center bg-black/20">
          <Image className="w-4 h-4 text-white/60" />
        </div>
      )}
      <div className="text-white truncate font-medium leading-tight">{content.title}</div>
      <div className="text-white/70 text-[9px] mt-0.5">{format(new Date(content.scheduledDate), 'h:mm a')}</div>
    </div>
  );
}

// ─── Droppable Day Cell ─────────────────────────────────────────────────────
function DroppableDayCell({ date, children, isCurrentMonth, onDoubleClick }) {
  const id = format(date, 'yyyy-MM-dd');
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      onDoubleClick={() => isCurrentMonth && onDoubleClick(date)}
      className={`min-h-[140px] p-2 rounded-xl border transition-all ${
        !isCurrentMonth
          ? 'bg-black/[0.015] dark:bg-white/[0.02] text-[#86868b] border-transparent'
          : isOver
          ? 'border-[#0071e3] bg-[#0071e3]/10 dark:bg-[#0071e3]/15'
          : isToday(date)
          ? 'bg-[#0071e3]/8 dark:bg-[#0071e3]/15 border-[#0071e3]/40'
          : 'border-black/5 dark:border-white/8 hover:bg-black/[0.02] dark:hover:bg-white/[0.03]'
      }`}
    >
      {children}
    </div>
  );
}

const ContentCalendar = () => {
  const { currentUser, hasPermission } = useAuth();
  const { confirm } = useConfirm();
  
  // Permissions
  const canCreateContent = hasPermission(CAPABILITIES.CREATE_CONTENT);
  const canDeleteContent = hasPermission(CAPABILITIES.DELETE_CONTENT);
  const canApproveContent = hasPermission(CAPABILITIES.APPROVE_CONTENT);

  // ─── View mode: 'month' | 'week' | 'grid' (Instagram grid planner) ─────────
  const [viewMode, setViewMode] = useState('month');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [contentItems, setContentItems] = useState([]);
  const [editingContent, setEditingContent] = useState(null);
  const [calendars, setCalendars] = useState([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState('default');
  const [showAddCalendar, setShowAddCalendar] = useState(false);
  const [newCalendarName, setNewCalendarName] = useState('');
  const [editingCalendarId, setEditingCalendarId] = useState(null);
  const [editingCalendarName, setEditingCalendarName] = useState('');
  const [refreshingCalendarId, setRefreshingCalendarId] = useState(null);
  const [linkingCalendarId, setLinkingCalendarId] = useState(null);
  const [linkSheetUrl, setLinkSheetUrl] = useState('');

  // ─── Drag state ─────────────────────────────────────────────────────────────
  const [activePostId, setActivePostId] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // ─── Media Library ──────────────────────────────────────────────────────────
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [mediaLibrary, setMediaLibrary] = useState(() => {
    try { return JSON.parse(localStorage.getItem('media_library') || '[]'); } catch { return []; }
  });
  const [mediaLibraryFilter, setMediaLibraryFilter] = useState('all');
  const [uploadingLibraryMedia, setUploadingLibraryMedia] = useState(false);
  const mediaLibraryInputRef = useRef(null);

  // ─── Best Time to Post ──────────────────────────────────────────────────────
  const [bestTimes, setBestTimes] = useState(null); // { monday: ['9:00 AM', '6:00 PM'], ... }
  const [showBestTimesPanel, setShowBestTimesPanel] = useState(false);

  // ─── Approval / Comments ────────────────────────────────────────────────────
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalPost, setApprovalPost] = useState(null);
  const [approvalComment, setApprovalComment] = useState('');
  const [postComments, setPostComments] = useState({}); // { postId: [{author, text, ts, type}] }

  // ─── Saved Captions & Hashtag Groups ────────────────────────────────────────
  const [showSavedCaptionsModal, setShowSavedCaptionsModal] = useState(false);
  const [savedCaptions, setSavedCaptions] = useState(() => {
    try { return JSON.parse(localStorage.getItem('saved_captions') || '[]'); } catch { return []; }
  });
  const [savedHashtagGroups, setSavedHashtagGroups] = useState(() => {
    try { return JSON.parse(localStorage.getItem('saved_hashtag_groups') || '[]'); } catch { return []; }
  });
  const [newCaptionName, setNewCaptionName] = useState('');
  const [newCaptionText, setNewCaptionText] = useState('');
  const [newHashtagGroupName, setNewHashtagGroupName] = useState('');
  const [newHashtagGroupText, setNewHashtagGroupText] = useState('');
  const [captionTab, setCaptionTab] = useState('captions'); // 'captions' | 'hashtags'

  // ─── Post Detail / Quick View ────────────────────────────────────────────────
  const [quickViewPost, setQuickViewPost] = useState(null);

  // ─── Import from Sheets state ───────────────────────────────────────────────
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStep, setImportStep] = useState(1);
  const [sheetUrl, setSheetUrl] = useState('');
  const [sheetData, setSheetData] = useState(null);
  const [columnMappings, setColumnMappings] = useState({});
  const [mappingConfidence, setMappingConfidence] = useState({});
  const [mappingSuggestions, setMappingSuggestions] = useState({});
  const [isImporting, setIsImporting] = useState(false);
  const [isSheetsAuthorized, setIsSheetsAuthorized] = useState(false);
  const [enrichmentByRowIndex, setEnrichmentByRowIndex] = useState([]);
  const [isEnriching, setIsEnriching] = useState(false);
  const [availableTabs, setAvailableTabs] = useState([]);
  const [selectedTabTitle, setSelectedTabTitle] = useState('');

  // ─── AI Caption Generation ───────────────────────────────────────────────────
  const [showAICaptionModal, setShowAICaptionModal] = useState(false);
  const [aiCaptionPrompt, setAiCaptionPrompt] = useState('');
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  const [generatedCaption, setGeneratedCaption] = useState(null);

  // ─── Post Form ───────────────────────────────────────────────────────────────
  const [postForm, setPostForm] = useState({
    title: '', description: '', platform: 'instagram', contentType: 'image',
    scheduledDate: new Date(), status: 'draft', tags: '', media: [], notes: ''
  });
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaDropActive, setMediaDropActive] = useState(false);
  const mediaFileInputRef = useRef(null);

  // ─── Static data ─────────────────────────────────────────────────────────────
  const platforms = [
    { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'bg-gradient-to-br from-purple-500 to-pink-500' },
    { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'bg-blue-600' },
    { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: 'bg-blue-700' },
    { id: 'youtube', name: 'YouTube', icon: Youtube, color: 'bg-red-600' },
    { id: 'twitter', name: 'X (Twitter)', icon: function XIcon(props) {
      const isSelected = props?.isSelected;
      return <img src={isSelected ? XLogoSelected : XLogo} alt="X" className={`w-4 h-4 object-contain align-middle ${props?.className || ''}`} />;
    }, color: 'bg-black' }
  ];

  const contentTypes = [
    { id: 'image', name: 'Image Post', icon: Image },
    { id: 'video', name: 'Video / Reel', icon: Video },
    { id: 'text', name: 'Text Post', icon: FileText }
  ];

  const statuses = [
    { id: 'draft', name: 'Draft', color: 'bg-[#86868b]' },
    { id: 'scheduled', name: 'Scheduled', color: 'bg-[#0071e3]' },
    { id: 'pending_approval', name: 'Pending Approval', color: 'bg-[#ff9500]' },
    { id: 'approved', name: 'Approved', color: 'bg-[#34c759]' },
    { id: 'published', name: 'Published', color: 'bg-[#30d158]' },
    { id: 'paused', name: 'Paused', color: 'bg-[#636366]' }
  ];

  const getPlatformIcon = (platformId) => {
    const platform = platforms.find(p => p.id === platformId);
    return platform ? platform.icon : Instagram;
  };

  const getStatusColor = (statusId) => {
    const status = statuses.find(s => s.id === statusId);
    return status ? status.color : 'bg-gray-500';
  };

  const getStatusBadge = (statusId) => {
    const map = {
      draft: 'bg-[#86868b]/15 text-[#86868b]',
      scheduled: 'bg-[#0071e3]/15 text-[#0071e3]',
      pending_approval: 'bg-[#ff9500]/15 text-[#ff9500]',
      approved: 'bg-[#34c759]/15 text-[#34c759]',
      published: 'bg-[#30d158]/15 text-[#30d158]',
      paused: 'bg-[#636366]/15 text-[#636366]'
    };
    return map[statusId] || 'bg-gray-100 text-gray-600';
  };

  const getContentThumbUrl = (content) => {
    if (content.media?.length) return content.media[0].url;
    return content.imageUrl || content.videoUrl || null;
  };

  // ─── Load data ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser?.email) return;
    let cancelled = false;
    setContentItems([]);
    setCalendars([]);
    setEditingContent(null);
    const load = async () => {
      const email = currentUser.email;
      const [cals, items] = await Promise.all([
        supabaseService.getContentCalendars(email),
        supabaseService.getContentItems(email)
      ]);
      if (cancelled) return;
      if (cals.length === 0) {
        const defaultNames = [
          { id: 'default', name: 'My Calendar' },
          { id: 'client-ll', name: 'Luxury Listings' }
        ];
        for (const def of defaultNames) {
          const res = await supabaseService.createContentCalendar({ userEmail: email, name: def.name });
          cals.push({ id: res.id, name: def.name });
        }
        const refetched = await supabaseService.getContentCalendars(email);
        if (!cancelled) { setCalendars(refetched); setSelectedCalendarId(refetched[0]?.id ?? 'default'); }
      } else {
        setCalendars(cals);
        setSelectedCalendarId(cals[0]?.id ?? 'default');
      }
      if (items.length === 0) {
        const storedItems = localStorage.getItem(`content_items_${email}`);
        const storedCals = localStorage.getItem(`calendars_${email}`);
        let parsedItems = [], parsedCals = [];
        try { if (storedCals) parsedCals = JSON.parse(storedCals); if (storedItems) parsedItems = JSON.parse(storedItems); } catch (_) {}
        if (parsedCals.length || parsedItems.length) {
          await supabaseService.migrateContentCalendarFromLocalStorage(email, parsedItems, parsedCals);
          const refetchedItems = await supabaseService.getContentItems(email);
          if (!cancelled) setContentItems(refetchedItems);
        } else { setContentItems([]); }
      } else { setContentItems(items); }
    };
    load();
    return () => { cancelled = true; };
  }, [currentUser?.email]);

  // ─── Best Time to Post: compute from existing content ────────────────────────
  useEffect(() => {
    if (!contentItems.length) return;
    const published = contentItems.filter(i => i.status === 'published' && i.calendarId === selectedCalendarId);
    if (published.length < 3) return;
    // Simple heuristic: group by day-of-week and hour, find most common slots
    const slots = {};
    published.forEach(item => {
      const d = new Date(item.scheduledDate);
      const day = format(d, 'EEEE');
      const hour = d.getHours();
      const key = `${day}-${hour}`;
      slots[key] = (slots[key] || 0) + 1;
    });
    const sorted = Object.entries(slots).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const grouped = {};
    sorted.forEach(([key]) => {
      const [day, hour] = key.split('-');
      const h = parseInt(hour);
      const label = h === 0 ? '12:00 AM' : h < 12 ? `${h}:00 AM` : h === 12 ? '12:00 PM' : `${h - 12}:00 PM`;
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(label);
    });
    setBestTimes(grouped);
  }, [contentItems, selectedCalendarId]);

  // ─── Calendar helpers ─────────────────────────────────────────────────────────
  const getCalendarDays = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    // Pad start with previous month days
    const startDow = getDay(start);
    const padded = [];
    for (let i = startDow - 1; i >= 0; i--) padded.push(addDays(start, -(i + 1)));
    return [...padded, ...days];
  };

  const getWeekDays = () => {
    const start = startOfWeek(currentWeek, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  };

  const getContentForDate = (date) => {
    return contentItems.filter(item =>
      item.calendarId === selectedCalendarId && isSameDay(new Date(item.scheduledDate), date)
    );
  };

  const filteredContent = contentItems.filter(item => {
    if (item.calendarId !== selectedCalendarId) return false;
    const platformMatch = filterPlatform === 'all' || item.platform === filterPlatform;
    const statusMatch = filterStatus === 'all' || item.status === filterStatus;
    return platformMatch && statusMatch;
  });

  // Instagram grid: all published/scheduled instagram posts sorted by date desc
  const instagramGridPosts = contentItems
    .filter(i => i.calendarId === selectedCalendarId && i.platform === 'instagram')
    .sort((a, b) => new Date(b.scheduledDate) - new Date(a.scheduledDate));

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));
  const prevWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));

  // ─── Drag and Drop ────────────────────────────────────────────────────────────
  const handleDragStart = (event) => setActivePostId(event.active.id);

  const handleDragEnd = async (event) => {
    setActivePostId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const newDate = new Date(over.id + 'T12:00:00');
    if (isNaN(newDate.getTime())) return;
    const post = contentItems.find(i => i.id === active.id);
    if (!post) return;
    // Optimistic update
    setContentItems(prev => prev.map(i => i.id === active.id ? { ...i, scheduledDate: newDate } : i));
    try {
      await supabaseService.updateContentItem(active.id, { scheduledDate: newDate });
      toast.success(`Moved to ${format(newDate, 'MMM d')}`);
    } catch {
      toast.error('Failed to reschedule');
      const updated = await supabaseService.getContentItems(currentUser.email);
      setContentItems(updated);
    }
  };

  // ─── Post form handlers ───────────────────────────────────────────────────────
  const handleDateDoubleClick = (date) => {
    setSelectedDate(date);
    setPostForm(prev => ({ ...prev, scheduledDate: date }));
    setShowAddModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser?.email) return;
    const tags = postForm.tags.split(',').map(tag => tag.trim()).filter(Boolean);
    const media = (postForm.media || []).slice(0, MAX_MEDIA_PER_POST);
    if (editingContent) {
      await supabaseService.updateContentItem(editingContent.id, {
        calendarId: selectedCalendarId, title: postForm.title, description: postForm.description,
        platform: postForm.platform, contentType: postForm.contentType, scheduledDate: postForm.scheduledDate,
        status: postForm.status, tags, media
      });
      const updated = await supabaseService.getContentItems(currentUser.email);
      setContentItems(updated);
      setEditingContent(null);
    } else {
      await supabaseService.createContentItem({
        userEmail: currentUser.email, calendarId: selectedCalendarId, title: postForm.title,
        description: postForm.description, platform: postForm.platform, contentType: postForm.contentType,
        scheduledDate: postForm.scheduledDate, status: postForm.status, tags, media
      });
      const updated = await supabaseService.getContentItems(currentUser.email);
      setContentItems(updated);
    }
    setShowAddModal(false);
    resetPostForm();
  };

  const resetPostForm = () => {
    setPostForm({ title: '', description: '', platform: 'instagram', contentType: 'image', scheduledDate: new Date(), status: 'draft', tags: '', media: [], notes: '' });
    if (mediaFileInputRef.current) mediaFileInputRef.current.value = '';
    setMediaDropActive(false);
    setEditingContent(null);
  };

  const uploadMediaFiles = async (files) => {
    const accepted = Array.from(files).filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
    if (!accepted.length) { toast.error('Please choose image or video files'); return; }
    const currentLen = (postForm.media || []).length;
    if (currentLen + accepted.length > MAX_MEDIA_PER_POST) { toast.error(`Max ${MAX_MEDIA_PER_POST} media per post`); return; }
    setUploadingMedia(true);
    const uid = (currentUser?.email || 'anon').replace(/[^a-zA-Z0-9]/g, '_');
    const itemId = editingContent?.id || `draft-${Date.now()}`;
    const newEntries = [];
    try {
      for (let i = 0; i < accepted.length; i++) {
        const file = accepted[i];
        const ext = file.name.split('.').pop() || (file.type.startsWith('video') ? 'mp4' : 'jpg');
        const path = `content-calendar/${uid}/${itemId}/${Date.now()}_${i}.${ext}`;
        const url = await uploadFile(path, file);
        newEntries.push({ type: file.type.startsWith('video/') ? 'video' : 'image', url });
      }
      setPostForm(prev => ({ ...prev, media: [...(prev.media || []), ...newEntries] }));
      toast.success(`${newEntries.length} file(s) uploaded`);
    } catch (err) { console.error(err); toast.error('Upload failed'); }
    finally { setUploadingMedia(false); if (mediaFileInputRef.current) mediaFileInputRef.current.value = ''; }
  };

  const removeMediaAt = (index) => setPostForm(prev => ({ ...prev, media: (prev.media || []).filter((_, i) => i !== index) }));

  const handleEdit = (content) => {
    if (!canCreateContent) { toast.error('You need CREATE_CONTENT permission to edit content'); return; }
    setEditingContent(content);
    setPostForm({
      title: content.title, description: content.description || '', platform: content.platform,
      contentType: content.contentType, scheduledDate: content.scheduledDate instanceof Date ? content.scheduledDate : new Date(content.scheduledDate),
      status: content.status, tags: Array.isArray(content.tags) ? content.tags.join(', ') : '', media: content.media?.length ? content.media : [], notes: content.notes || ''
    });
    setShowAddModal(true);
  };

  const handleDelete = async (contentId) => {
    if (!canDeleteContent) { toast.error('You need DELETE_CONTENT permission'); return; }
    await supabaseService.deleteContentItem(contentId);
    if (currentUser?.email) {
      const updated = await supabaseService.getContentItems(currentUser.email);
      setContentItems(updated);
    }
  };

  // ─── Media Library ────────────────────────────────────────────────────────────
  const persistMediaLibrary = (lib) => {
    setMediaLibrary(lib);
    localStorage.setItem('media_library', JSON.stringify(lib));
  };

  const handleLibraryUpload = async (files) => {
    const accepted = Array.from(files).filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
    if (!accepted.length) return;
    setUploadingLibraryMedia(true);
    const uid = (currentUser?.email || 'anon').replace(/[^a-zA-Z0-9]/g, '_');
    const newItems = [];
    try {
      for (const file of accepted) {
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `media-library/${uid}/${Date.now()}_${file.name.slice(0, 40)}.${ext}`;
        const url = await uploadFile(path, file);
        newItems.push({ id: `ml-${Date.now()}-${Math.random()}`, url, type: file.type.startsWith('video/') ? 'video' : 'image', name: file.name, uploadedAt: new Date().toISOString() });
      }
      persistMediaLibrary([...newItems, ...mediaLibrary]);
      toast.success(`${newItems.length} file(s) added to library`);
    } catch (err) { toast.error('Upload failed'); }
    finally { setUploadingLibraryMedia(false); }
  };

  const handleAddFromLibrary = (item) => {
    if ((postForm.media || []).length >= MAX_MEDIA_PER_POST) { toast.error(`Max ${MAX_MEDIA_PER_POST} media per post`); return; }
    setPostForm(prev => ({ ...prev, media: [...(prev.media || []), { type: item.type, url: item.url }] }));
    setShowMediaLibrary(false);
    toast.success('Added from library');
  };

  const handleDeleteLibraryItem = (id) => {
    persistMediaLibrary(mediaLibrary.filter(i => i.id !== id));
  };

  // ─── Approval Workflow ────────────────────────────────────────────────────────
  const handleSubmitForApproval = async (content) => {
    await supabaseService.updateContentItem(content.id, { status: 'pending_approval' });
    const updated = await supabaseService.getContentItems(currentUser.email);
    setContentItems(updated);
    toast.success('Submitted for approval');
  };

  const handleApprove = async (content) => {
    if (!canApproveContent) { toast.error('You need APPROVE_CONTENT permission'); return; }
    const comment = approvalComment.trim();
    if (comment) {
      const existing = postComments[content.id] || [];
      setPostComments(prev => ({ ...prev, [content.id]: [...existing, { author: currentUser.email, text: comment, ts: new Date().toISOString(), type: 'approval' }] }));
    }
    await supabaseService.updateContentItem(content.id, { status: 'approved' });
    const updated = await supabaseService.getContentItems(currentUser.email);
    setContentItems(updated);
    setApprovalComment('');
    setShowApprovalModal(false);
    setApprovalPost(null);
    toast.success('Post approved!');
  };

  const handleRequestChanges = async (content) => {
    if (!canApproveContent) { toast.error('You need APPROVE_CONTENT permission'); return; }
    if (!approvalComment.trim()) { toast.error('Please provide feedback before requesting changes'); return; }
    const existing = postComments[content.id] || [];
    setPostComments(prev => ({ ...prev, [content.id]: [...existing, { author: currentUser.email, text: approvalComment, ts: new Date().toISOString(), type: 'changes_requested' }] }));
    await supabaseService.updateContentItem(content.id, { status: 'draft' });
    const updated = await supabaseService.getContentItems(currentUser.email);
    setContentItems(updated);
    setApprovalComment('');
    setShowApprovalModal(false);
    setApprovalPost(null);
    toast.success('Changes requested — post moved back to Draft');
  };

  const handleAddComment = (postId, text) => {
    if (!text.trim()) return;
    const existing = postComments[postId] || [];
    setPostComments(prev => ({ ...prev, [postId]: [...existing, { author: currentUser.email, text, ts: new Date().toISOString(), type: 'comment' }] }));
  };

  // ─── Saved Captions & Hashtags ────────────────────────────────────────────────
  const persistSavedCaptions = (list) => {
    setSavedCaptions(list);
    localStorage.setItem('saved_captions', JSON.stringify(list));
  };

  const persistSavedHashtagGroups = (list) => {
    setSavedHashtagGroups(list);
    localStorage.setItem('saved_hashtag_groups', JSON.stringify(list));
  };

  const handleSaveCaption = () => {
    if (!newCaptionName.trim() || !newCaptionText.trim()) { toast.error('Please fill in name and caption text'); return; }
    persistSavedCaptions([{ id: `sc-${Date.now()}`, name: newCaptionName.trim(), text: newCaptionText.trim(), createdAt: new Date().toISOString() }, ...savedCaptions]);
    setNewCaptionName(''); setNewCaptionText('');
    toast.success('Caption saved!');
  };

  const handleSaveHashtagGroup = () => {
    if (!newHashtagGroupName.trim() || !newHashtagGroupText.trim()) { toast.error('Please fill in name and hashtags'); return; }
    persistSavedHashtagGroups([{ id: `hg-${Date.now()}`, name: newHashtagGroupName.trim(), tags: newHashtagGroupText.trim(), createdAt: new Date().toISOString() }, ...savedHashtagGroups]);
    setNewHashtagGroupName(''); setNewHashtagGroupText('');
    toast.success('Hashtag group saved!');
  };

  const handleUseSavedCaption = (caption) => {
    setPostForm(prev => ({ ...prev, description: caption.text }));
    setShowSavedCaptionsModal(false);
    toast.success('Caption applied!');
  };

  const handleUseHashtagGroup = (group) => {
    setPostForm(prev => ({ ...prev, tags: group.tags }));
    setShowSavedCaptionsModal(false);
    toast.success('Hashtags applied!');
  };

  // ─── Save current caption/tags to library ────────────────────────────────────
  const handleSaveCurrentCaption = () => {
    if (!postForm.description.trim()) { toast.error('No caption to save'); return; }
    const name = postForm.title || `Caption ${new Date().toLocaleDateString()}`;
    persistSavedCaptions([{ id: `sc-${Date.now()}`, name, text: postForm.description.trim(), createdAt: new Date().toISOString() }, ...savedCaptions]);
    toast.success('Caption saved to library!');
  };

  const handleSaveCurrentHashtags = () => {
    if (!postForm.tags.trim()) { toast.error('No hashtags to save'); return; }
    const name = postForm.title || `Hashtags ${new Date().toLocaleDateString()}`;
    persistSavedHashtagGroups([{ id: `hg-${Date.now()}`, name, tags: postForm.tags.trim(), createdAt: new Date().toISOString() }, ...savedHashtagGroups]);
    toast.success('Hashtags saved to library!');
  };

  // ─── Calendar management ──────────────────────────────────────────────────────
  const handleEditCalendar = (calendarId, currentName) => { setEditingCalendarId(calendarId); setEditingCalendarName(currentName); };
  const handleSaveCalendarName = async () => {
    if (!editingCalendarName.trim()) { toast.error('Calendar name cannot be empty'); return; }
    await supabaseService.updateContentCalendar(editingCalendarId, { name: editingCalendarName.trim() });
    if (currentUser?.email) { const refetched = await supabaseService.getContentCalendars(currentUser.email); setCalendars(refetched); }
    toast.success('Calendar renamed!');
    setEditingCalendarId(null); setEditingCalendarName('');
  };
  const handleCancelEditCalendar = () => { setEditingCalendarId(null); setEditingCalendarName(''); };
  const handleDeleteCalendar = async (calendarId, calendarName) => {
    const confirmed = await confirm({ title: 'Delete Calendar', message: `Delete "${calendarName}"? All content will be deleted. This cannot be undone.`, confirmText: 'Delete', variant: 'danger' });
    if (!confirmed) return;
    const itemsInCalendar = contentItems.filter(item => item.calendarId === calendarId);
    for (const item of itemsInCalendar) await supabaseService.deleteContentItem(item.id);
    await supabaseService.deleteContentCalendar(calendarId);
    if (currentUser?.email) {
      const [refetchedCals, refetchedItems] = await Promise.all([supabaseService.getContentCalendars(currentUser.email), supabaseService.getContentItems(currentUser.email)]);
      setCalendars(refetchedCals); setContentItems(refetchedItems);
      if (selectedCalendarId === calendarId && refetchedCals.length) setSelectedCalendarId(refetchedCals.find(c => c.id !== calendarId)?.id ?? refetchedCals[0]?.id ?? 'default');
    }
    toast.success(`Deleted "${calendarName}"`);
  };
  const handleLinkSheet = (calendarId) => { setLinkingCalendarId(calendarId); setLinkSheetUrl(''); };
  const handleSaveLinkSheet = () => {
    if (!linkSheetUrl.trim()) { toast.error('Please enter a Google Sheets URL'); return; }
    setCalendars(prev => prev.map(cal => cal.id === linkingCalendarId ? { ...cal, sheetUrl: linkSheetUrl.trim(), lastImported: new Date().toISOString() } : cal));
    toast.success('Sheet linked!');
    setLinkingCalendarId(null); setLinkSheetUrl('');
  };
  const handleCancelLinkSheet = () => { setLinkingCalendarId(null); setLinkSheetUrl(''); };

  const handleRefreshCalendar = async (calendarId, calendarName, sheetUrl, sheetTitle = null) => {
    if (!sheetUrl) { toast.error('No sheet URL found for this calendar'); return; }
    setRefreshingCalendarId(calendarId);
    try {
      toast.loading('Refreshing from Google Sheets...', { id: 'refresh-cal' });
      const data = await googleSheetsService.fetchSheetData(sheetUrl, sheetTitle || undefined);
      if (!data.headers || data.headers.length === 0) { toast.error('Sheet appears to be empty', { id: 'refresh-cal' }); setRefreshingCalendarId(null); return; }
      const sampleRows = googleSheetsService.getSampleRows(data.rows, 5);
      toast.loading('AI is re-analyzing columns...', { id: 'refresh-cal' });
      let aiMappings = {};
      try { const aiResult = await openaiService.analyzeColumnMapping(data.headers, sampleRows); aiMappings = aiResult.mappings; }
      catch (aiError) { const fallback = openaiService.fallbackMapping(data.headers); aiMappings = fallback.mappings; }
      setContentItems(prev => prev.filter(item => item.calendarId !== calendarId));
      const convertToDirectUrl = (url) => {
        if (!url) return '';
        const u = String(url).trim();
        if (u.includes('dropbox.com')) return u.replace(/\?dl=0/g, '?raw=1').replace(/&dl=0/g, '&raw=1');
        if (u.includes('drive.google.com')) { const match = u.match(/\/d\/([^\/\?]+)/); if (match) return `https://drive.google.com/uc?export=view&id=${match[1]}`; }
        return u;
      };
      const extractImageUrlFromCell = (cell) => {
        if (cell == null) return '';
        const s = String(cell).trim();
        const markdownMatch = s.match(/!\[.*?\]\((https?[^)]+)\)/);
        if (markdownMatch) return markdownMatch[1];
        const imageFormulaMatch = s.match(/=IMAGE\s*\(\s*["']?(https?[^"')]+)["']?\s*\)/i);
        if (imageFormulaMatch) return imageFormulaMatch[1];
        if (/^https?:\/\//i.test(s)) return s;
        return s || '';
      };
      const imageUrlColIndices = Object.entries(aiMappings).filter(([, field]) => field === 'imageUrl').map(([col]) => parseInt(col, 10)).sort((a, b) => a - b);
      const multiPostPerRow = imageUrlColIndices.length >= 2;
      const importedContent = [];
      let successCount = 0, skipCount = 0;
      for (let i = 0; i < data.rows.length; i++) {
        const row = data.rows[i];
        try {
          const contentItem = {};
          Object.keys(aiMappings).forEach(colIndex => {
            const field = aiMappings[colIndex];
            const value = row[parseInt(colIndex)];
            if (field === 'unmapped' || !value) return;
            if (multiPostPerRow && field === 'imageUrl') return;
            if ((field === 'mediaUrls' || field === 'imageUrl') && contentItem[field]) contentItem[field] = `${contentItem[field]}, ${value}`;
            else contentItem[field] = value;
          });
          const parsedDate = contentItem.postDate ? parseDate(contentItem.postDate) : addDays(new Date(), i);
          const normalizedPlatform = normalizePlatform(contentItem.platform) || 'instagram';
          const defaultContentType = (contentItem.mediaUrls && (contentItem.mediaUrls.includes('video') || contentItem.mediaUrls.includes('.mp4'))) ? 'video' : 'image';
          const normalizedContentType = normalizeContentType(contentItem.contentType) || defaultContentType;
          const normalizedStatus = normalizeStatus(contentItem.status) || 'draft';
          const allMediaUrls = contentItem.mediaUrls || '';
          const buildOnePost = (primaryImageUrl, mediaUrlsForPost = allMediaUrls) => {
            let title = 'Imported Post';
            if (contentItem.caption) title = contentItem.caption.substring(0, 50);
            else if (contentItem.notes) title = contentItem.notes.substring(0, 50);
            else if (contentItem.assignedTo) title = `Post for ${contentItem.assignedTo}`;
            const media = [];
            if (primaryImageUrl) media.push({ type: 'image', url: primaryImageUrl });
            const extraUrls = (typeof mediaUrlsForPost === 'string' ? mediaUrlsForPost.split(',').map(u => u.trim()).filter(Boolean) : []);
            extraUrls.slice(0, MAX_MEDIA_PER_POST - media.length).forEach(url => { media.push({ type: url.match(/\.(mp4|webm|mov)$/i) ? 'video' : 'image', url }); });
            return { id: Date.now() + Math.random(), calendarId, title, description: contentItem.caption || contentItem.notes || '', platform: normalizedPlatform, contentType: normalizedContentType, scheduledDate: parsedDate, status: normalizedStatus, tags: contentItem.hashtags ? contentItem.hashtags.split(/[,\s#]+/).filter(t => t) : [], media, notes: contentItem.notes || '', assignedTo: contentItem.assignedTo || '', createdAt: new Date() };
          };
          if (multiPostPerRow) {
            for (const colIdx of imageUrlColIndices) {
              const rawUrl = extractImageUrlFromCell(row[colIdx]);
              if (!rawUrl) continue;
              importedContent.push(buildOnePost(convertToDirectUrl(rawUrl), ''));
              successCount++;
            }
            if (imageUrlColIndices.every((colIdx) => !extractImageUrlFromCell(row[colIdx]))) skipCount++;
          } else {
            if (Object.keys(contentItem).length === 0) { skipCount++; continue; }
            let primaryImageUrl = '';
            const rawImageUrl = extractImageUrlFromCell(contentItem.imageUrl);
            if (rawImageUrl) primaryImageUrl = convertToDirectUrl(rawImageUrl);
            else if (allMediaUrls) {
              const urls = allMediaUrls.split(',').map(u => u.trim());
              const imageUrl = urls.find(url => url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) || (!url.includes('video') && !url.includes('.mp4') && (url.includes('drive.google.com') || url.includes('dropbox.com') || url.includes('imgur.com') || url.includes('cloudinary.com') || url.includes('googleusercontent.com'))));
              if (imageUrl) primaryImageUrl = convertToDirectUrl(imageUrl);
            }
            importedContent.push(buildOnePost(primaryImageUrl, allMediaUrls));
            successCount++;
          }
        } catch (rowError) { skipCount++; }
      }
      if (currentUser?.email && importedContent.length) {
        for (const item of importedContent) await supabaseService.createContentItem({ userEmail: currentUser.email, calendarId: item.calendarId, title: item.title, description: item.description, platform: item.platform, contentType: item.contentType, scheduledDate: item.scheduledDate, status: item.status, tags: item.tags, media: item.media || [] });
        const updated = await supabaseService.getContentItems(currentUser.email);
        setContentItems(updated);
      } else if (importedContent.length) { setContentItems(prev => [...prev, ...importedContent]); }
      toast.success(`✅ Refreshed "${calendarName}" with ${successCount} posts!`, { id: 'refresh-cal' });
    } catch (error) { toast.error(error.message || 'Failed to refresh calendar', { id: 'refresh-cal' }); }
    finally { setRefreshingCalendarId(null); }
  };

  // ─── Google Sheets Import ─────────────────────────────────────────────────────
  const handleStartImport = async () => {
    setShowImportModal(true); setImportStep(1);
    try {
      toast.loading('Initializing Google Sheets...', { id: 'init-sheets' });
      const result = await googleSheetsService.initialize(currentUser.email);
      toast.dismiss('init-sheets');
      if (!result.needsAuth) { setIsSheetsAuthorized(true); setImportStep(2); toast.success('✅ Already authorized!'); }
    } catch (error) { toast.error(error.message || 'Failed to initialize Google Sheets.', { id: 'init-sheets' }); }
  };

  const handleAuthorizeSheets = async () => {
    try {
      toast.loading('Opening authorization window...', { id: 'auth-sheets' });
      await googleSheetsService.requestAuthorization();
      toast.success('✅ Google Sheets authorized!', { id: 'auth-sheets' });
      setIsSheetsAuthorized(true); setImportStep(2);
    } catch (error) { toast.error(error.message || 'Failed to authorize Google Sheets.', { id: 'auth-sheets' }); }
  };

  const handleFetchSheet = async () => {
    if (!sheetUrl.trim()) { toast.error('Please enter a Google Sheets URL'); return; }
    try {
      googleSheetsService.extractSpreadsheetId(sheetUrl);
      if (availableTabs.length === 0) {
        toast.loading('Loading spreadsheet tabs...', { id: 'fetch-sheet' });
        const { sheets } = await googleSheetsService.listSheets(sheetUrl);
        if (!sheets || sheets.length === 0) { toast.error('No sheets found in this spreadsheet', { id: 'fetch-sheet' }); return; }
        setAvailableTabs(sheets);
        if (sheets.length > 1) { setSelectedTabTitle(sheets[0].title); toast.success(`Found ${sheets.length} tabs`, { id: 'fetch-sheet' }); return; }
        setSelectedTabTitle(sheets[0].title);
      }
      const tabToFetch = selectedTabTitle || availableTabs[0]?.title;
      toast.loading(`Fetching "${tabToFetch}"...`, { id: 'fetch-sheet' });
      const data = await googleSheetsService.fetchSheetData(sheetUrl, tabToFetch);
      if (!data.headers || data.headers.length === 0) { toast.error('Sheet appears to be empty', { id: 'fetch-sheet' }); return; }
      const sampleRows = googleSheetsService.getSampleRows(data.rows, 5);
      toast.loading('AI is analyzing columns...', { id: 'fetch-sheet' });
      let aiMappings = {}, aiConfidence = {}, aiSuggestions = {};
      try {
        const aiResult = await openaiService.analyzeColumnMapping(data.headers, sampleRows);
        aiMappings = aiResult.mappings; aiConfidence = aiResult.confidence || {}; aiSuggestions = aiResult.suggestions || {};
      } catch { const fallback = openaiService.fallbackMapping(data.headers); aiMappings = fallback.mappings; }
      setSheetData(data); setColumnMappings(aiMappings); setMappingConfidence(aiConfidence); setMappingSuggestions(aiSuggestions);
      setImportStep(3);
      toast.success(`✅ Found ${data.headers.length} columns, ${data.rows.length} rows`, { id: 'fetch-sheet' });
    } catch (error) { toast.error(error.message || 'Failed to fetch sheet data', { id: 'fetch-sheet' }); }
  };

  const handleMappingChange = (colIndex, field) => setColumnMappings(prev => ({ ...prev, [colIndex]: field }));

  const handleEnrichWithChatGPT = async () => {
    if (!sheetData) return;
    setIsEnriching(true);
    try {
      toast.loading('Enriching rows with AI...', { id: 'enrich' });
      const enriched = await openaiService.enrichRows(sheetData.headers, sheetData.rows.slice(0, 20), columnMappings);
      setEnrichmentByRowIndex(enriched || []);
      toast.success('Enrichment complete!', { id: 'enrich' });
    } catch { toast.error('Enrichment failed', { id: 'enrich' }); }
    finally { setIsEnriching(false); }
  };

  const handleImportContent = async () => {
    if (!sheetData) return;
    setImportStep(4); setIsImporting(true);
    try {
      const newCalendarName = `Import ${format(new Date(), 'MMM d, yyyy')}`;
      const newCalendar = await supabaseService.createContentCalendar({ userEmail: currentUser.email, name: newCalendarName });
      const newCalendarId = newCalendar.id;
      setCalendars(prev => [...prev, { id: newCalendarId, name: newCalendarName }]);
      const convertToDirectUrl = (url) => {
        if (!url) return '';
        const u = String(url).trim();
        if (u.includes('dropbox.com')) return u.replace(/\?dl=0/g, '?raw=1').replace(/&dl=0/g, '&raw=1');
        if (u.includes('drive.google.com')) { const match = u.match(/\/d\/([^\/\?]+)/); if (match) return `https://drive.google.com/uc?export=view&id=${match[1]}`; }
        return u;
      };
      const extractImageUrlFromCell = (cell) => {
        if (cell == null) return '';
        const s = String(cell).trim();
        const markdownMatch = s.match(/!\[.*?\]\((https?[^)]+)\)/);
        if (markdownMatch) return markdownMatch[1];
        const imageFormulaMatch = s.match(/=IMAGE\s*\(\s*["']?(https?[^"')]+)["']?\s*\)/i);
        if (imageFormulaMatch) return imageFormulaMatch[1];
        if (/^https?:\/\//i.test(s)) return s;
        return s || '';
      };
      const imageUrlColIndices = Object.entries(columnMappings).filter(([, field]) => field === 'imageUrl').map(([col]) => parseInt(col, 10)).sort((a, b) => a - b);
      const multiPostPerRow = imageUrlColIndices.length >= 2;
      const importedContent = [];
      let successCount = 0, skipCount = 0;
      for (let i = 0; i < sheetData.rows.length; i++) {
        const row = sheetData.rows[i];
        try {
          const contentItem = {};
          Object.keys(columnMappings).forEach(colIndex => {
            const field = columnMappings[colIndex];
            const value = row[parseInt(colIndex)];
            if (field === 'unmapped' || !value) return;
            if (multiPostPerRow && field === 'imageUrl') return;
            if ((field === 'mediaUrls' || field === 'imageUrl') && contentItem[field]) contentItem[field] = `${contentItem[field]}, ${value}`;
            else contentItem[field] = value;
          });
          const enrichment = enrichmentByRowIndex[i] || {};
          const parsedDate = contentItem.postDate ? parseDate(contentItem.postDate) : addDays(new Date(), i);
          const normalizedPlatform = normalizePlatform(contentItem.platform) || 'instagram';
          const defaultContentType = (contentItem.mediaUrls && (contentItem.mediaUrls.includes('video') || contentItem.mediaUrls.includes('.mp4'))) ? 'video' : 'image';
          const normalizedContentType = normalizeContentType(contentItem.contentType) || defaultContentType;
          const normalizedStatus = normalizeStatus(contentItem.status) || 'draft';
          const allMediaUrls = contentItem.mediaUrls || '';
          const buildOnePost = (primaryImageUrl, mediaUrlsForPost = allMediaUrls) => {
            let title = 'Imported Post';
            if (contentItem.caption) title = contentItem.caption.substring(0, 50);
            else if (contentItem.notes) title = contentItem.notes.substring(0, 50);
            else if (contentItem.assignedTo) title = `Post for ${contentItem.assignedTo}`;
            const media = [];
            if (primaryImageUrl) media.push({ type: 'image', url: primaryImageUrl });
            const extraUrls = (typeof mediaUrlsForPost === 'string' ? mediaUrlsForPost.split(',').map(u => u.trim()).filter(Boolean) : []);
            extraUrls.slice(0, MAX_MEDIA_PER_POST - media.length).forEach(url => { media.push({ type: url.match(/\.(mp4|webm|mov)$/i) ? 'video' : 'image', url }); });
            return { id: Date.now() + Math.random(), calendarId: newCalendarId, title, description: contentItem.caption || contentItem.notes || enrichment.caption || '', platform: normalizedPlatform, contentType: normalizedContentType, scheduledDate: parsedDate, status: normalizedStatus, tags: contentItem.hashtags ? contentItem.hashtags.split(/[,\s#]+/).filter(t => t) : [], media, notes: contentItem.notes || '', assignedTo: contentItem.assignedTo || '', createdAt: new Date() };
          };
          if (multiPostPerRow) {
            for (const colIdx of imageUrlColIndices) {
              const rawUrl = extractImageUrlFromCell(row[colIdx]);
              if (!rawUrl) continue;
              importedContent.push(buildOnePost(convertToDirectUrl(rawUrl), ''));
              successCount++;
            }
            if (imageUrlColIndices.every((colIdx) => !extractImageUrlFromCell(row[colIdx]))) skipCount++;
          } else {
            if (Object.keys(contentItem).length === 0) { skipCount++; continue; }
            let primaryImageUrl = '';
            const rawImageUrl = extractImageUrlFromCell(contentItem.imageUrl);
            if (rawImageUrl) primaryImageUrl = convertToDirectUrl(rawImageUrl);
            else if (allMediaUrls) {
              const urls = allMediaUrls.split(',').map(u => u.trim());
              const imageUrl = urls.find(url => url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) || (!url.includes('video') && !url.includes('.mp4') && (url.includes('drive.google.com') || url.includes('dropbox.com') || url.includes('imgur.com') || url.includes('cloudinary.com') || url.includes('googleusercontent.com'))));
              if (imageUrl) primaryImageUrl = convertToDirectUrl(imageUrl);
            }
            importedContent.push(buildOnePost(primaryImageUrl, allMediaUrls));
            successCount++;
          }
        } catch { skipCount++; }
      }
      if (currentUser?.email && importedContent.length) {
        for (const item of importedContent) await supabaseService.createContentItem({ userEmail: currentUser.email, calendarId: item.calendarId, title: item.title, description: item.description, platform: item.platform, contentType: item.contentType, scheduledDate: item.scheduledDate, status: item.status, tags: item.tags, media: item.media || [] });
        const updated = await supabaseService.getContentItems(currentUser.email);
        setContentItems(updated);
      } else if (importedContent.length) { setContentItems(prev => [...prev, ...importedContent]); }
      setSelectedCalendarId(newCalendarId);
      toast.success(`✅ Created "${newCalendarName}" with ${successCount} posts! ${skipCount > 0 ? `(${skipCount} skipped)` : ''}`);
      setTimeout(() => { setShowImportModal(false); resetImportState(); }, 2000);
    } catch (error) { toast.error('Failed to import content.'); }
    finally { setIsImporting(false); }
  };

  // ─── Normalization helpers ────────────────────────────────────────────────────
  const normalizePlatform = (value) => {
    if (!value) return null;
    const lower = value.toLowerCase().trim();
    if (lower.includes('insta') || lower === 'ig') return 'instagram';
    if (lower.includes('face')) return 'facebook';
    if (lower.includes('twit') || lower === 'x') return 'twitter';
    if (lower.includes('link')) return 'linkedin';
    if (lower.includes('you') || lower.includes('tube')) return 'youtube';
    if (lower.includes('tik')) return 'tiktok';
    return platforms.find(p => p.id === lower) ? lower : null;
  };

  const normalizeContentType = (value) => {
    if (!value) return null;
    const lower = value.toLowerCase().trim();
    if (lower.includes('image') || lower.includes('photo') || lower.includes('picture')) return 'image';
    if (lower.includes('video') || lower.includes('reel') || lower.includes('story')) return 'video';
    if (lower.includes('text') || lower.includes('post')) return 'text';
    return contentTypes.find(ct => ct.id === lower) ? lower : null;
  };

  const normalizeStatus = (value) => {
    if (!value) return null;
    const lower = value.toLowerCase().trim();
    if (lower.includes('draft')) return 'draft';
    if (lower.includes('schedule') || lower.includes('plan')) return 'scheduled';
    if (lower.includes('publish') || lower.includes('post') || lower.includes('live') || lower.includes('done')) return 'published';
    if (lower.includes('pause') || lower.includes('hold')) return 'paused';
    return statuses.find(s => s.id === lower) ? lower : null;
  };

  const parseDate = (value) => {
    if (value === undefined || value === null || String(value).trim() === '') return new Date();
    const str = String(value).trim();
    try {
      const serial = typeof value === 'number' ? value : (/^\d+$/.test(str) ? parseInt(str, 10) : NaN);
      if (!isNaN(serial) && serial > 1000 && serial < 1000000) { const d = new Date((serial - 25569) * 86400 * 1000); if (!isNaN(d.getTime())) return d; }
      const shortDate = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
      if (shortDate) { const [, mm, dd, yy] = shortDate; const month = parseInt(mm, 10) - 1; const day = parseInt(dd, 10); const year = yy.length === 2 ? 2000 + parseInt(yy, 10) : parseInt(yy, 10); const d = new Date(year, month, day); if (!isNaN(d.getTime())) return d; }
      const dayMonthPattern = /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(\w+)\s+(\d+)$/i;
      const match = str.match(dayMonthPattern);
      if (match) { const [, , month, day] = match; const d = new Date(`${month} ${day}, ${new Date().getFullYear()}`); if (!isNaN(d.getTime())) return d; }
      let date = new Date(str); if (!isNaN(date.getTime())) return date;
      date = new Date(str.replace(/\//g, '-')); if (!isNaN(date.getTime())) return date;
      date = new Date(`${str}, ${new Date().getFullYear()}`); if (!isNaN(date.getTime())) return date;
      return new Date();
    } catch { return new Date(); }
  };

  const resetImportState = () => {
    setImportStep(1); setSheetUrl(''); setSheetData(null); setColumnMappings({}); setMappingConfidence({});
    setMappingSuggestions({}); setEnrichmentByRowIndex([]); setAvailableTabs([]); setSelectedTabTitle('');
    setIsImporting(false); setIsEnriching(false);
  };

  const availableFields = [
    { value: 'postDate', label: 'Post Date (optional)' },
    { value: 'platform', label: 'Platform' },
    { value: 'contentType', label: 'Content Type' },
    { value: 'caption', label: 'Caption/Description' },
    { value: 'status', label: 'Status' },
    { value: 'assignedTo', label: 'Assigned To' },
    { value: 'hashtags', label: 'Hashtags' },
    { value: 'imageUrl', label: 'Image / Photo URL' },
    { value: 'mediaUrls', label: 'Media / Video URLs' },
    { value: 'notes', label: 'Notes' },
    { value: 'unmapped', label: '(Skip this column)' }
  ];

  const activePost = activePostId ? contentItems.find(i => i.id === activePostId) : null;
  const pendingApprovalCount = contentItems.filter(i => i.calendarId === selectedCalendarId && i.status === 'pending_approval').length;

  // ─── RENDER ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-[28px] sm:text-[34px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em] mb-1">
            Content Calendar
          </h1>
          <p className="text-[15px] sm:text-[17px] text-[#86868b]">
            Plan, schedule, and manage your social media content
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* View mode toggle */}
          <div className="flex items-center bg-black/5 dark:bg-white/10 rounded-xl p-1 gap-0.5">
            {[
              { id: 'month', icon: CalendarDays, label: 'Month' },
              { id: 'week', icon: List, label: 'Week' },
              { id: 'grid', icon: Grid, label: 'Grid' }
            ].map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setViewMode(id)}
                title={label}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                  viewMode === id ? 'bg-white dark:bg-[#3d3d3d] text-[#1d1d1f] dark:text-white shadow-sm' : 'text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Best Times button */}
          {bestTimes && (
            <button
              onClick={() => setShowBestTimesPanel(!showBestTimesPanel)}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-medium transition-colors border ${
                showBestTimesPanel ? 'bg-[#ff9500]/10 border-[#ff9500]/30 text-[#ff9500]' : 'bg-white dark:bg-[#2d2d2d] border-black/10 dark:border-white/10 text-[#1d1d1f] dark:text-white hover:bg-[#f5f5f7] dark:hover:bg-[#3d3d3d]'
              }`}
              title="Best times to post"
            >
              <Clock3 className="w-4 h-4" />
              <span className="hidden sm:inline">Best Times</span>
            </button>
          )}

          {/* Saved Captions */}
          <button
            onClick={() => setShowSavedCaptionsModal(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-[#2d2d2d] border border-black/10 dark:border-white/10 text-[#1d1d1f] dark:text-white text-[13px] font-medium hover:bg-[#f5f5f7] dark:hover:bg-[#3d3d3d] transition-colors"
            title="Saved captions & hashtags"
          >
            <Bookmark className="w-4 h-4" />
            <span className="hidden sm:inline">Saved</span>
          </button>

          {/* Media Library */}
          <button
            onClick={() => setShowMediaLibrary(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-[#2d2d2d] border border-black/10 dark:border-white/10 text-[#1d1d1f] dark:text-white text-[13px] font-medium hover:bg-[#f5f5f7] dark:hover:bg-[#3d3d3d] transition-colors"
            title="Media library"
          >
            <Library className="w-4 h-4" />
            <span className="hidden sm:inline">Library</span>
            {mediaLibrary.length > 0 && <span className="bg-[#0071e3] text-white text-[10px] px-1.5 py-0.5 rounded-full">{mediaLibrary.length}</span>}
          </button>

          {/* Pending approvals badge */}
          {pendingApprovalCount > 0 && (
            <button
              onClick={() => setFilterStatus('pending_approval')}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#ff9500]/10 border border-[#ff9500]/30 text-[#ff9500] text-[13px] font-medium hover:bg-[#ff9500]/20 transition-colors"
            >
              <AlertCircle className="w-4 h-4" />
              {pendingApprovalCount} Pending
            </button>
          )}

          <button
            onClick={handleStartImport}
            disabled={!canCreateContent}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-[#2d2d2d] border border-black/10 dark:border-white/10 text-[#1d1d1f] dark:text-white text-[13px] font-medium hover:bg-[#f5f5f7] dark:hover:bg-[#3d3d3d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Import</span>
          </button>

          <button
            onClick={() => canCreateContent ? setShowAddModal(true) : toast.error('You need CREATE_CONTENT permission')}
            disabled={!canCreateContent}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0071e3] text-white text-[13px] font-medium hover:bg-[#0077ed] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Add Post
          </button>
        </div>
      </div>

      {/* Best Times Panel */}
      {showBestTimesPanel && bestTimes && (
        <div className="rounded-2xl bg-gradient-to-r from-[#ff9500]/10 to-[#ff6b00]/5 border border-[#ff9500]/20 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock3 className="w-5 h-5 text-[#ff9500]" />
            <h3 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white">Best Times to Post</h3>
            <span className="text-[12px] text-[#86868b] ml-1">Based on your published content engagement</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(day => (
              <div key={day} className="bg-white/60 dark:bg-white/5 rounded-xl p-3">
                <div className="text-[11px] font-semibold text-[#86868b] mb-2">{day.slice(0,3)}</div>
                {bestTimes[day]?.length ? (
                  bestTimes[day].map((time, i) => (
                    <div key={i} className="text-[12px] font-medium text-[#ff9500] flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current" />
                      {time}
                    </div>
                  ))
                ) : (
                  <div className="text-[11px] text-[#86868b]">No data</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        {/* Left: Calendars panel */}
        <div className="lg:sticky lg:top-20 h-fit space-y-4">
          <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-black/5 dark:border-white/10">
              <h3 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white flex items-center gap-2">
                <Folder className="w-4 h-4 text-[#0071e3]" /> Calendars
              </h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="space-y-1.5">
                {calendars.map((cal) => {
                  const count = contentItems.filter(ci => ci.calendarId === cal.id).length;
                  const isActive = cal.id === selectedCalendarId;
                  const isEditing = editingCalendarId === cal.id;
                  const isLinking = linkingCalendarId === cal.id;
                  const isDefault = cal.id === 'default' || cal.id === 'client-ll';
                  return (
                    <div key={cal.id} className={`px-3 py-2.5 rounded-xl border transition-all ${isActive ? 'border-[#0071e3] bg-[#0071e3]/10 dark:bg-[#0071e3]/20' : 'border-black/5 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5'}`}>
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input value={editingCalendarName} onChange={(e) => setEditingCalendarName(e.target.value)} className="flex-1 h-8 px-3 text-[13px] rounded-lg bg-white dark:bg-[#2d2d2d] border border-black/10 dark:border-white/10 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') handleSaveCalendarName(); if (e.key === 'Escape') handleCancelEditCalendar(); }} />
                          <button onClick={handleSaveCalendarName} className="p-1.5 hover:bg-[#34c759]/20 rounded-lg"><Check className="w-4 h-4 text-[#34c759]" /></button>
                          <button onClick={handleCancelEditCalendar} className="p-1.5 hover:bg-[#ff3b30]/20 rounded-lg"><X className="w-4 h-4 text-[#ff3b30]" /></button>
                        </div>
                      ) : isLinking ? (
                        <div className="space-y-2">
                          <input value={linkSheetUrl} onChange={(e) => setLinkSheetUrl(e.target.value)} className="w-full h-8 px-3 text-[12px] rounded-lg bg-white dark:bg-[#2d2d2d] border border-black/10 dark:border-white/10 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]" placeholder="Paste Google Sheets URL..." autoFocus onKeyDown={(e) => { if (e.key === 'Enter') handleSaveLinkSheet(); if (e.key === 'Escape') handleCancelLinkSheet(); }} />
                          <div className="flex gap-2">
                            <button onClick={handleSaveLinkSheet} className="px-3 py-1.5 text-[12px] font-medium rounded-lg bg-[#0071e3] text-white hover:bg-[#0077ed]">Link</button>
                            <button onClick={handleCancelLinkSheet} className="px-3 py-1.5 text-[12px] font-medium rounded-lg bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button onClick={() => setSelectedCalendarId(cal.id)} className="flex-1 flex items-center justify-between text-left min-w-0">
                            <span className={`truncate text-[13px] ${isActive ? 'text-[#0071e3] dark:text-white font-medium' : 'text-[#1d1d1f] dark:text-white'}`}>{cal.name}</span>
                            <span className={`ml-2 text-[11px] px-2 py-0.5 rounded-full flex-shrink-0 font-medium ${isActive ? 'bg-[#0071e3] text-white' : 'bg-black/5 dark:bg-white/10 text-[#86868b]'}`}>{count}</span>
                          </button>
                          {!isDefault && (
                            <div className="flex gap-0.5 flex-shrink-0">
                              {cal.sheetUrl ? (
                                <button onClick={() => handleRefreshCalendar(cal.id, cal.name, cal.sheetUrl, cal.sheetTitle)} disabled={refreshingCalendarId === cal.id} className={`p-1.5 hover:bg-[#34c759]/20 rounded-lg ${refreshingCalendarId === cal.id ? 'animate-spin' : ''}`} title="Refresh from Google Sheets"><RefreshCw className="w-3.5 h-3.5 text-[#34c759]" /></button>
                              ) : (
                                <button onClick={() => handleLinkSheet(cal.id)} className="p-1.5 hover:bg-[#af52de]/20 rounded-lg" title="Link to Google Sheet"><LinkIcon className="w-3.5 h-3.5 text-[#af52de]" /></button>
                              )}
                              <button onClick={() => handleEditCalendar(cal.id, cal.name)} className="p-1.5 hover:bg-[#0071e3]/20 rounded-lg"><Edit className="w-3.5 h-3.5 text-[#0071e3]" /></button>
                              <button onClick={() => handleDeleteCalendar(cal.id, cal.name)} className="p-1.5 hover:bg-[#ff3b30]/20 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-[#ff3b30]" /></button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {showAddCalendar ? (
                <div className="space-y-2">
                  <input value={newCalendarName} onChange={(e) => setNewCalendarName(e.target.value)} placeholder="Calendar name" className="w-full h-10 px-3 text-[14px] rounded-xl bg-white dark:bg-[#2d2d2d] border border-black/10 dark:border-white/10 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]" />
                  <div className="flex gap-2">
                    <button onClick={() => { const name = newCalendarName.trim(); if (!name) return; const id = `cal-${Date.now()}`; setCalendars(prev => [...prev, { id, name }]); setSelectedCalendarId(id); setNewCalendarName(''); setShowAddCalendar(false); }} className="px-4 py-2 text-[13px] font-medium rounded-xl bg-[#0071e3] text-white hover:bg-[#0077ed]">Create</button>
                    <button onClick={() => { setShowAddCalendar(false); setNewCalendarName(''); }} className="px-4 py-2 text-[13px] font-medium rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowAddCalendar(true)} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[13px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors">
                  <FolderPlus className="w-4 h-4" /> New Calendar
                </button>
              )}
              <p className="text-[11px] text-[#86868b]">Posts you create will be saved in the selected calendar.</p>
            </div>
          </div>

          {/* Filters */}
          <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#86868b]" />
              <span className="text-[13px] font-semibold text-[#1d1d1f] dark:text-white">Filters</span>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#86868b] mb-1.5">Platform</label>
              <select value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)} className="w-full h-9 px-3 rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[13px] text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-[#0071e3] focus:outline-none">
                <option value="all">All Platforms</option>
                {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#86868b] mb-1.5">Status</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full h-9 px-3 rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[13px] text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-[#0071e3] focus:outline-none">
                <option value="all">All Status</option>
                {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Right: Main content area */}
        <div className="space-y-6 min-w-0">

          {/* ── MONTH VIEW ─────────────────────────────────────────────────────── */}
          {viewMode === 'month' && (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 overflow-hidden">
                {/* Calendar header */}
                <div className="px-5 py-4 border-b border-black/5 dark:border-white/10 flex justify-between items-center">
                  <h3 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-[#0071e3]" />
                    {format(currentMonth, 'MMMM yyyy')}
                  </h3>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setCurrentMonth(new Date())} className="px-3 py-1.5 text-[12px] font-medium rounded-lg bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15 transition-colors">Today</button>
                    <button onClick={prevMonth} className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/10 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/15 transition-colors"><ChevronLeft className="w-4 h-4 text-[#1d1d1f] dark:text-white" /></button>
                    <button onClick={nextMonth} className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/10 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/15 transition-colors"><ChevronRight className="w-4 h-4 text-[#1d1d1f] dark:text-white" /></button>
                  </div>
                </div>
                <div className="p-4">
                  {/* Day headers */}
                  <div className="grid grid-cols-7 gap-2 mb-2">
                    {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day => (
                      <div key={day} className="py-2 text-center text-[12px] font-semibold text-[#86868b] uppercase tracking-wide">{day}</div>
                    ))}
                  </div>
                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-2">
                    {getCalendarDays().map((date, index) => {
                      const dayContent = getContentForDate(date);
                      const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
                      const filteredDayContent = dayContent.filter(c => {
                        const platformMatch = filterPlatform === 'all' || c.platform === filterPlatform;
                        const statusMatch = filterStatus === 'all' || c.status === filterStatus;
                        return platformMatch && statusMatch;
                      });
                      return (
                        <DroppableDayCell key={index} date={date} isCurrentMonth={isCurrentMonth} onDoubleClick={handleDateDoubleClick}>
                          <div className={`text-[13px] font-semibold mb-2 w-7 h-7 flex items-center justify-center rounded-full ${
                            isToday(date) ? 'bg-[#0071e3] text-white' : isCurrentMonth ? 'text-[#1d1d1f] dark:text-white' : 'text-[#c7c7cc] dark:text-[#48484a]'
                          }`}>
                            {format(date, 'd')}
                          </div>
                          <div className="space-y-1">
                            {filteredDayContent.slice(0, 3).map(content => (
                              <DraggablePostChip
                                key={content.id}
                                content={content}
                                getStatusColor={getStatusColor}
                                getContentThumbUrl={getContentThumbUrl}
                                onClick={(c) => setQuickViewPost(c)}
                              />
                            ))}
                            {filteredDayContent.length > 3 && (
                              <button
                                onClick={() => { /* could expand */ }}
                                className="text-[10px] text-[#0071e3] font-medium px-1.5 py-0.5 rounded-md bg-[#0071e3]/10 hover:bg-[#0071e3]/20 transition-colors w-full text-left"
                              >
                                +{filteredDayContent.length - 3} more
                              </button>
                            )}
                            {isCurrentMonth && filteredDayContent.length === 0 && (
                              <div className="text-[10px] text-[#c7c7cc] dark:text-[#48484a] text-center py-1 opacity-0 group-hover:opacity-100">
                                Double-click to add
                              </div>
                            )}
                          </div>
                        </DroppableDayCell>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-[#86868b] mt-3 text-center">Double-click a day to add a post · Drag posts to reschedule</p>
                </div>
              </div>
              <DragOverlay>
                {activePost && (
                  <div className={`text-[10px] p-2 rounded-lg shadow-2xl ${getStatusColor(activePost.status)} opacity-90 w-32`}>
                    {getContentThumbUrl(activePost) && <img src={getContentThumbUrl(activePost)} alt="" className="w-full h-12 object-cover rounded mb-1" />}
                    <div className="text-white truncate font-medium">{activePost.title}</div>
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          )}

          {/* ── WEEK VIEW ──────────────────────────────────────────────────────── */}
          {viewMode === 'week' && (
            <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 overflow-hidden">
              <div className="px-5 py-4 border-b border-black/5 dark:border-white/10 flex justify-between items-center">
                <h3 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-[#0071e3]" />
                  Week of {format(startOfWeek(currentWeek, { weekStartsOn: 0 }), 'MMM d, yyyy')}
                </h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCurrentWeek(new Date())} className="px-3 py-1.5 text-[12px] font-medium rounded-lg bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 transition-colors">This Week</button>
                  <button onClick={prevWeek} className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/10 flex items-center justify-center hover:bg-black/10 transition-colors"><ChevronLeft className="w-4 h-4 text-[#1d1d1f] dark:text-white" /></button>
                  <button onClick={nextWeek} className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/10 flex items-center justify-center hover:bg-black/10 transition-colors"><ChevronRight className="w-4 h-4 text-[#1d1d1f] dark:text-white" /></button>
                </div>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-7 gap-3">
                  {getWeekDays().map((date, i) => {
                    const dayContent = getContentForDate(date).filter(c => {
                      const platformMatch = filterPlatform === 'all' || c.platform === filterPlatform;
                      const statusMatch = filterStatus === 'all' || c.status === filterStatus;
                      return platformMatch && statusMatch;
                    });
                    return (
                      <div key={i} className={`rounded-xl border p-3 min-h-[200px] transition-colors ${isToday(date) ? 'border-[#0071e3]/50 bg-[#0071e3]/5' : 'border-black/5 dark:border-white/10'}`}>
                        <div className="mb-3 text-center">
                          <div className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wide">{format(date, 'EEE')}</div>
                          <div className={`text-[20px] font-bold mt-0.5 ${isToday(date) ? 'text-[#0071e3]' : 'text-[#1d1d1f] dark:text-white'}`}>{format(date, 'd')}</div>
                        </div>
                        <div className="space-y-2">
                          {dayContent.map(content => (
                            <button
                              key={content.id}
                              onClick={() => setQuickViewPost(content)}
                              className="w-full text-left"
                            >
                              <div className={`p-2 rounded-lg ${getStatusColor(content.status)} hover:opacity-90 transition-opacity`}>
                                {getContentThumbUrl(content) && <img src={getContentThumbUrl(content)} alt="" className="w-full h-16 object-cover rounded mb-1.5" onError={(e) => e.target.style.display='none'} />}
                                <div className="text-white text-[11px] font-semibold truncate">{content.title}</div>
                                <div className="text-white/70 text-[10px] mt-0.5">{format(new Date(content.scheduledDate), 'h:mm a')}</div>
                              </div>
                            </button>
                          ))}
                          <button
                            onClick={() => handleDateDoubleClick(date)}
                            className="w-full py-2 rounded-lg border-2 border-dashed border-black/10 dark:border-white/10 text-[11px] text-[#86868b] hover:border-[#0071e3]/50 hover:text-[#0071e3] transition-colors flex items-center justify-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Add
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── INSTAGRAM GRID PLANNER ─────────────────────────────────────────── */}
          {viewMode === 'grid' && (
            <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 overflow-hidden">
              <div className="px-5 py-4 border-b border-black/5 dark:border-white/10 flex justify-between items-center">
                <div>
                  <h3 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white flex items-center gap-2">
                    <Instagram className="w-5 h-5 text-pink-500" />
                    Instagram Grid Planner
                  </h3>
                  <p className="text-[12px] text-[#86868b] mt-0.5">Preview how your Instagram profile grid will look</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-[#86868b]">{instagramGridPosts.length} posts</span>
                </div>
              </div>
              <div className="p-5">
                {/* Mock Instagram profile header */}
                <div className="flex items-center gap-4 mb-6 pb-5 border-b border-black/5 dark:border-white/10">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-[24px] font-bold flex-shrink-0">
                    {(currentUser?.email || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white">{currentUser?.email?.split('@')[0] || 'your_account'}</div>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-[13px] text-[#1d1d1f] dark:text-white"><strong>{instagramGridPosts.length}</strong> <span className="text-[#86868b]">posts</span></span>
                    </div>
                  </div>
                </div>
                {/* 3-column grid */}
                {instagramGridPosts.length === 0 ? (
                  <div className="text-center py-16">
                    <Instagram className="w-12 h-12 text-[#86868b] mx-auto mb-3" />
                    <p className="text-[15px] text-[#86868b]">No Instagram posts yet</p>
                    <p className="text-[13px] text-[#86868b] mt-1">Add posts with the Instagram platform to see your grid preview</p>
                    <button onClick={() => { setPostForm(prev => ({ ...prev, platform: 'instagram' })); setShowAddModal(true); }} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[13px] font-medium hover:from-purple-600 hover:to-pink-600 transition-all">
                      <Plus className="w-4 h-4" /> Add Instagram Post
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-1">
                    {instagramGridPosts.map((post, index) => (
                      <button
                        key={post.id}
                        onClick={() => setQuickViewPost(post)}
                        className="aspect-square relative group overflow-hidden bg-black/5 dark:bg-white/5 rounded-sm"
                      >
                        {getContentThumbUrl(post) ? (
                          <img src={getContentThumbUrl(post)} alt={post.title} className="w-full h-full object-cover" onError={(e) => { e.target.style.display='none'; e.target.nextElementSibling?.classList.remove('hidden'); }} />
                        ) : null}
                        <div className={`w-full h-full flex items-center justify-center ${getContentThumbUrl(post) ? 'hidden' : ''} bg-gradient-to-br ${index % 3 === 0 ? 'from-purple-400 to-pink-400' : index % 3 === 1 ? 'from-blue-400 to-cyan-400' : 'from-orange-400 to-red-400'}`}>
                          <Image className="w-8 h-8 text-white/60" />
                        </div>
                        {/* Overlay on hover */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="text-center text-white p-2">
                            <div className="text-[11px] font-semibold truncate">{post.title}</div>
                            <div className={`text-[10px] mt-1 px-2 py-0.5 rounded-full inline-block ${getStatusBadge(post.status)}`}>{post.status}</div>
                            <div className="text-[10px] mt-1 text-white/70">{format(new Date(post.scheduledDate), 'MMM d')}</div>
                          </div>
                        </div>
                        {/* Status indicator dot */}
                        <div className={`absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full border-2 border-white ${getStatusColor(post.status)}`} />
                      </button>
                    ))}
                    {/* Placeholder cells */}
                    {Array.from({ length: Math.max(0, 9 - instagramGridPosts.length) }).map((_, i) => (
                      <button key={`placeholder-${i}`} onClick={() => { setPostForm(prev => ({ ...prev, platform: 'instagram' })); setShowAddModal(true); }} className="aspect-square bg-black/[0.02] dark:bg-white/[0.02] border-2 border-dashed border-black/10 dark:border-white/10 rounded-sm flex items-center justify-center hover:border-pink-400/50 hover:bg-pink-50/30 dark:hover:bg-pink-900/10 transition-colors group">
                        <Plus className="w-6 h-6 text-[#c7c7cc] group-hover:text-pink-400 transition-colors" />
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-[#86868b] mt-4 text-center">Click any post to view details · Shows most recent posts first</p>
              </div>
            </div>
          )}

          {/* ── CONTENT LIST ───────────────────────────────────────────────────── */}
          <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white">
                All Posts <span className="text-[#86868b] font-normal">({filteredContent.length})</span>
              </h3>
              {filterStatus !== 'all' || filterPlatform !== 'all' ? (
                <button onClick={() => { setFilterStatus('all'); setFilterPlatform('all'); }} className="text-[12px] text-[#0071e3] hover:underline">Clear filters</button>
              ) : null}
            </div>
            <div className="divide-y divide-black/5 dark:divide-white/5">
              {filteredContent.length === 0 ? (
                <div className="text-center py-16">
                  <CalendarDays className="w-12 h-12 text-[#86868b] mx-auto mb-3" />
                  <p className="text-[15px] text-[#86868b]">No posts yet</p>
                  <p className="text-[13px] text-[#86868b] mt-1">Double-click a date or use the Add Post button</p>
                </div>
              ) : (
                filteredContent.map(content => {
                  const PlatformIcon = getPlatformIcon(content.platform);
                  const comments = postComments[content.id] || [];
                  return (
                    <div key={content.id} className="flex items-center gap-4 p-4 hover:bg-black/[0.015] dark:hover:bg-white/[0.02] transition-colors">
                      {/* Thumbnail */}
                      <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-black/5 dark:bg-white/5">
                        {getContentThumbUrl(content) ? (
                          <img src={getContentThumbUrl(content)} alt={content.title} className="w-full h-full object-cover" onError={(e) => e.target.style.display='none'} />
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center ${getStatusColor(content.status)}`}>
                            <PlatformIcon className="w-6 h-6 text-white" />
                          </div>
                        )}
                      </div>
                      {/* Content details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-[14px] font-semibold text-[#1d1d1f] dark:text-white truncate">{content.title}</h3>
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${getStatusBadge(content.status)}`}>{content.status.replace('_', ' ')}</span>
                          {comments.length > 0 && <span className="text-[11px] text-[#86868b] flex items-center gap-1"><MessageSquare className="w-3 h-3" />{comments.length}</span>}
                        </div>
                        <p className="text-[12px] text-[#86868b] line-clamp-1 mt-0.5">{content.description}</p>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <span className="text-[11px] text-[#86868b] flex items-center gap-1">
                            <PlatformIcon className="w-3 h-3" /> {platforms.find(p => p.id === content.platform)?.name || content.platform}
                          </span>
                          <span className="text-[11px] text-[#86868b] flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {format(new Date(content.scheduledDate), 'MMM d, yyyy')}
                          </span>
                          {content.tags?.length > 0 && (
                            <span className="text-[11px] text-[#86868b] flex items-center gap-1">
                              <Hash className="w-3 h-3" /> {content.tags.slice(0, 2).join(', ')}{content.tags.length > 2 ? ` +${content.tags.length - 2}` : ''}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* Submit for approval */}
                        {content.status === 'draft' && canCreateContent && (
                          <button onClick={() => handleSubmitForApproval(content)} className="p-2 rounded-lg bg-[#ff9500]/10 hover:bg-[#ff9500]/20 transition-colors" title="Submit for approval">
                            <ThumbsUp className="w-4 h-4 text-[#ff9500]" />
                          </button>
                        )}
                        {/* Approve/Request changes */}
                        {content.status === 'pending_approval' && canApproveContent && (
                          <button onClick={() => { setApprovalPost(content); setShowApprovalModal(true); }} className="p-2 rounded-lg bg-[#34c759]/10 hover:bg-[#34c759]/20 transition-colors" title="Review & approve">
                            <CheckCircle className="w-4 h-4 text-[#34c759]" />
                          </button>
                        )}
                        <button onClick={() => setQuickViewPost(content)} className="p-2 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 transition-colors" title="Quick view">
                          <Eye className="w-4 h-4 text-[#1d1d1f] dark:text-white" />
                        </button>
                        <button onClick={() => handleEdit(content)} className="p-2 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 transition-colors" title="Edit">
                          <Edit className="w-4 h-4 text-[#1d1d1f] dark:text-white" />
                        </button>
                        <button onClick={() => handleDelete(content.id)} className="p-2 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-[#ff3b30]/20 transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4 text-[#ff3b30]" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODALS
      ═══════════════════════════════════════════════════════════════════════ */}

      {/* ── Quick View Post Modal ─────────────────────────────────────────────── */}
      {quickViewPost && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setQuickViewPost(null)}>
          <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl w-full max-w-lg border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white dark:bg-[#1d1d1f] px-5 py-4 border-b border-black/5 dark:border-white/10 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${getStatusBadge(quickViewPost.status)}`}>{quickViewPost.status.replace('_', ' ')}</span>
                <span className="text-[13px] text-[#86868b]">{format(new Date(quickViewPost.scheduledDate), 'MMM d, yyyy · h:mm a')}</span>
              </div>
              <button onClick={() => setQuickViewPost(null)} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"><X className="w-5 h-5 text-[#86868b]" /></button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {getContentThumbUrl(quickViewPost) && (
                <img src={getContentThumbUrl(quickViewPost)} alt={quickViewPost.title} className="w-full rounded-xl object-cover max-h-64" onError={(e) => e.target.style.display='none'} />
              )}
              <div>
                <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">{quickViewPost.title}</h2>
                {quickViewPost.description && <p className="text-[14px] text-[#86868b] mt-2 whitespace-pre-wrap">{quickViewPost.description}</p>}
              </div>
              {quickViewPost.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {quickViewPost.tags.map((tag, i) => <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">#{tag}</span>)}
                </div>
              )}
              {/* Comments section */}
              <div>
                <h4 className="text-[13px] font-semibold text-[#1d1d1f] dark:text-white mb-2 flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Comments</h4>
                {(postComments[quickViewPost.id] || []).length === 0 ? (
                  <p className="text-[12px] text-[#86868b]">No comments yet</p>
                ) : (
                  <div className="space-y-2">
                    {(postComments[quickViewPost.id] || []).map((c, i) => (
                      <div key={i} className={`p-3 rounded-xl text-[12px] ${c.type === 'approval' ? 'bg-[#34c759]/10 border border-[#34c759]/20' : c.type === 'changes_requested' ? 'bg-[#ff3b30]/10 border border-[#ff3b30]/20' : 'bg-black/5 dark:bg-white/5'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-[#1d1d1f] dark:text-white">{c.author.split('@')[0]}</span>
                          {c.type === 'approval' && <span className="text-[10px] text-[#34c759] font-medium">✓ Approved</span>}
                          {c.type === 'changes_requested' && <span className="text-[10px] text-[#ff3b30] font-medium">↩ Changes requested</span>}
                          <span className="text-[#86868b] ml-auto">{format(new Date(c.ts), 'MMM d, h:mm a')}</span>
                        </div>
                        <p className="text-[#1d1d1f] dark:text-white">{c.text}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 mt-3">
                  <input
                    placeholder="Add a comment..."
                    className="flex-1 h-9 px-3 text-[13px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    onKeyDown={(e) => { if (e.key === 'Enter' && e.target.value.trim()) { handleAddComment(quickViewPost.id, e.target.value.trim()); e.target.value = ''; } }}
                  />
                  <button className="px-3 py-1.5 text-[12px] font-medium rounded-xl bg-[#0071e3] text-white hover:bg-[#0077ed]" onClick={(e) => { const input = e.target.previousElementSibling; if (input?.value?.trim()) { handleAddComment(quickViewPost.id, input.value.trim()); input.value = ''; } }}>Send</button>
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-black/5 dark:border-white/10 flex gap-2 flex-wrap">
              {quickViewPost.status === 'draft' && canCreateContent && (
                <button onClick={() => { handleSubmitForApproval(quickViewPost); setQuickViewPost(null); }} className="px-4 py-2 text-[13px] font-medium rounded-xl bg-[#ff9500]/10 text-[#ff9500] hover:bg-[#ff9500]/20 transition-colors">Submit for Approval</button>
              )}
              {quickViewPost.status === 'pending_approval' && canApproveContent && (
                <button onClick={() => { setApprovalPost(quickViewPost); setShowApprovalModal(true); setQuickViewPost(null); }} className="px-4 py-2 text-[13px] font-medium rounded-xl bg-[#34c759]/10 text-[#34c759] hover:bg-[#34c759]/20 transition-colors">Review & Approve</button>
              )}
              <button onClick={() => { handleEdit(quickViewPost); setQuickViewPost(null); }} className="px-4 py-2 text-[13px] font-medium rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 transition-colors">Edit Post</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Approval Modal ────────────────────────────────────────────────────── */}
      {showApprovalModal && approvalPost && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl w-full max-w-lg border border-black/10 dark:border-white/10 shadow-2xl">
            <div className="px-5 py-4 border-b border-black/5 dark:border-white/10 flex justify-between items-center">
              <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-[#34c759]" /> Review Post
              </h2>
              <button onClick={() => { setShowApprovalModal(false); setApprovalPost(null); setApprovalComment(''); }} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"><X className="w-5 h-5 text-[#86868b]" /></button>
            </div>
            <div className="p-5 space-y-4">
              {getContentThumbUrl(approvalPost) && (
                <img src={getContentThumbUrl(approvalPost)} alt={approvalPost.title} className="w-full rounded-xl object-cover max-h-48" onError={(e) => e.target.style.display='none'} />
              )}
              <div>
                <h3 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white">{approvalPost.title}</h3>
                {approvalPost.description && <p className="text-[13px] text-[#86868b] mt-1 line-clamp-3">{approvalPost.description}</p>}
                <div className="flex items-center gap-3 mt-2 text-[12px] text-[#86868b]">
                  <span>{platforms.find(p => p.id === approvalPost.platform)?.name}</span>
                  <span>·</span>
                  <span>{format(new Date(approvalPost.scheduledDate), 'MMM d, yyyy')}</span>
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">Feedback (optional for approval, required for changes)</label>
                <textarea
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  placeholder="Leave feedback or notes for the team..."
                  rows={3}
                  className="w-full px-4 py-3 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => handleRequestChanges(approvalPost)} className="flex-1 py-2.5 text-[14px] font-medium rounded-xl bg-[#ff3b30]/10 text-[#ff3b30] hover:bg-[#ff3b30]/20 transition-colors flex items-center justify-center gap-2">
                  <ThumbsDown className="w-4 h-4" /> Request Changes
                </button>
                <button onClick={() => handleApprove(approvalPost)} className="flex-1 py-2.5 text-[14px] font-medium rounded-xl bg-[#34c759] text-white hover:bg-[#30c755] transition-colors flex items-center justify-center gap-2">
                  <ThumbsUp className="w-4 h-4" /> Approve
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Media Library Modal ───────────────────────────────────────────────── */}
      {showMediaLibrary && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col border border-black/10 dark:border-white/10 shadow-2xl">
            <div className="sticky top-0 bg-white dark:bg-[#1d1d1f] px-5 py-4 border-b border-black/5 dark:border-white/10 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Library className="w-5 h-5 text-[#0071e3]" />
                <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">Media Library</h2>
                <span className="text-[12px] text-[#86868b]">{mediaLibrary.length} assets</span>
              </div>
              <div className="flex items-center gap-2">
                <input ref={mediaLibraryInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => { if (e.target.files?.length) handleLibraryUpload(e.target.files); }} />
                <button onClick={() => mediaLibraryInputRef.current?.click()} disabled={uploadingLibraryMedia} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0071e3] text-white text-[13px] font-medium hover:bg-[#0077ed] transition-colors disabled:opacity-50">
                  {uploadingLibraryMedia ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Upload
                </button>
                <button onClick={() => setShowMediaLibrary(false)} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"><X className="w-5 h-5 text-[#86868b]" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {/* Filter tabs */}
              <div className="flex gap-2 mb-4">
                {['all','image','video'].map(f => (
                  <button key={f} onClick={() => setMediaLibraryFilter(f)} className={`px-3 py-1.5 text-[12px] font-medium rounded-lg transition-colors ${mediaLibraryFilter === f ? 'bg-[#0071e3] text-white' : 'bg-black/5 dark:bg-white/10 text-[#1d1d1
f]'}`}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
                ))}
              </div>
              {mediaLibrary.length === 0 ? (
                <div className="text-center py-16">
                  <Library className="w-12 h-12 text-[#86868b] mx-auto mb-3" />
                  <p className="text-[15px] text-[#86868b]">No assets yet</p>
                  <p className="text-[13px] text-[#86868b] mt-1">Upload images and videos to reuse across posts</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {mediaLibrary.filter(item => mediaLibraryFilter === 'all' || item.type === mediaLibraryFilter).map(item => (
                    <div key={item.id} className="group relative aspect-square rounded-xl overflow-hidden bg-black/5 dark:bg-white/5">
                      {item.type === 'video' ? (
                        <video src={item.url} className="w-full h-full object-cover" muted />
                      ) : (
                        <img src={item.url} alt={item.name} className="w-full h-full object-cover" onError={(e) => e.target.style.display='none'} />
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                        <button onClick={() => handleAddFromLibrary(item)} className="w-full py-1.5 text-[11px] font-medium rounded-lg bg-[#0071e3] text-white hover:bg-[#0077ed] transition-colors">Use</button>
                        <button onClick={() => handleDeleteLibraryItem(item.id)} className="w-full py-1.5 text-[11px] font-medium rounded-lg bg-[#ff3b30]/80 text-white hover:bg-[#ff3b30] transition-colors">Delete</button>
                      </div>
                      {item.type === 'video' && (
                        <div className="absolute top-1.5 left-1.5 bg-black/60 rounded-md px-1.5 py-0.5 text-[9px] text-white font-medium">VIDEO</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Saved Captions & Hashtags Modal ──────────────────────────────────── */}
      {showSavedCaptionsModal && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-black/10 dark:border-white/10 shadow-2xl">
            <div className="sticky top-0 bg-white dark:bg-[#1d1d1f] px-5 py-4 border-b border-black/5 dark:border-white/10 flex justify-between items-center">
              <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-[#0071e3]" /> Saved Captions & Hashtags
              </h2>
              <button onClick={() => setShowSavedCaptionsModal(false)} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"><X className="w-5 h-5 text-[#86868b]" /></button>
            </div>
            {/* Tabs */}
            <div className="flex border-b border-black/5 dark:border-white/10 px-5">
              {[{ id: 'captions', label: 'Captions', icon: FileText }, { id: 'hashtags', label: 'Hashtag Groups', icon: Hash }].map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setCaptionTab(id)} className={`flex items-center gap-2 px-4 py-3 text-[13px] font-medium border-b-2 transition-colors ${captionTab === id ? 'border-[#0071e3] text-[#0071e3]' : 'border-transparent text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'}`}>
                  <Icon className="w-4 h-4" /> {label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {captionTab === 'captions' ? (
                <>
                  {/* Add new caption */}
                  <div className="rounded-xl border border-black/10 dark:border-white/10 p-4 space-y-3">
                    <h4 className="text-[13px] font-semibold text-[#1d1d1f] dark:text-white">Save New Caption</h4>
                    <input value={newCaptionName} onChange={(e) => setNewCaptionName(e.target.value)} placeholder="Caption name (e.g. 'Luxury listing reveal')" className="w-full h-10 px-3 text-[13px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]" />
                    <textarea value={newCaptionText} onChange={(e) => setNewCaptionText(e.target.value)} placeholder="Caption text..." rows={3} className="w-full px-3 py-2.5 text-[13px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none" />
                    <button onClick={handleSaveCaption} className="px-4 py-2 text-[13px] font-medium rounded-xl bg-[#0071e3] text-white hover:bg-[#0077ed] transition-colors">Save Caption</button>
                  </div>
                  {/* Saved captions list */}
                  {savedCaptions.length === 0 ? (
                    <div className="text-center py-8">
                      <Bookmark className="w-10 h-10 text-[#86868b] mx-auto mb-2" />
                      <p className="text-[13px] text-[#86868b]">No saved captions yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {savedCaptions.map(caption => (
                        <div key={caption.id} className="rounded-xl border border-black/5 dark:border-white/10 p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="text-[13px] font-semibold text-[#1d1d1f] dark:text-white">{caption.name}</div>
                              <p className="text-[12px] text-[#86868b] mt-1 line-clamp-2">{caption.text}</p>
                            </div>
                            <div className="flex gap-1.5 flex-shrink-0">
                              <button onClick={() => handleUseSavedCaption(caption)} className="px-3 py-1.5 text-[11px] font-medium rounded-lg bg-[#0071e3]/10 text-[#0071e3] hover:bg-[#0071e3]/20 transition-colors">Use</button>
                              <button onClick={() => persistSavedCaptions(savedCaptions.filter(c => c.id !== caption.id))} className="p-1.5 rounded-lg hover:bg-[#ff3b30]/10 transition-colors"><Trash2 className="w-3.5 h-3.5 text-[#ff3b30]" /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Add new hashtag group */}
                  <div className="rounded-xl border border-black/10 dark:border-white/10 p-4 space-y-3">
                    <h4 className="text-[13px] font-semibold text-[#1d1d1f] dark:text-white">Save New Hashtag Group</h4>
                    <input value={newHashtagGroupName} onChange={(e) => setNewHashtagGroupName(e.target.value)} placeholder="Group name (e.g. 'Luxury Real Estate')" className="w-full h-10 px-3 text-[13px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]" />
                    <textarea value={newHashtagGroupText} onChange={(e) => setNewHashtagGroupText(e.target.value)} placeholder="#luxuryhomes #realestate #dreamhome ..." rows={3} className="w-full px-3 py-2.5 text-[13px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none" />
                    <button onClick={handleSaveHashtagGroup} className="px-4 py-2 text-[13px] font-medium rounded-xl bg-[#0071e3] text-white hover:bg-[#0077ed] transition-colors">Save Group</button>
                  </div>
                  {/* Saved hashtag groups */}
                  {savedHashtagGroups.length === 0 ? (
                    <div className="text-center py-8">
                      <Hash className="w-10 h-10 text-[#86868b] mx-auto mb-2" />
                      <p className="text-[13px] text-[#86868b]">No hashtag groups yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {savedHashtagGroups.map(group => (
                        <div key={group.id} className="rounded-xl border border-black/5 dark:border-white/10 p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="text-[13px] font-semibold text-[#1d1d1f] dark:text-white">{group.name}</div>
                              <p className="text-[12px] text-[#86868b] mt-1 line-clamp-2">{group.tags}</p>
                            </div>
                            <div className="flex gap-1.5 flex-shrink-0">
                              <button onClick={() => handleUseHashtagGroup(group)} className="px-3 py-1.5 text-[11px] font-medium rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition-colors">Use</button>
                              <button onClick={() => persistSavedHashtagGroups(savedHashtagGroups.filter(g => g.id !== group.id))} className="p-1.5 rounded-lg hover:bg-[#ff3b30]/10 transition-colors"><Trash2 className="w-3.5 h-3.5 text-[#ff3b30]" /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Add / Edit Post Modal ─────────────────────────────────────────────── */}
      {showAddModal && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setShowAddModal(false); resetPostForm(); }}>
          <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-black/10 dark:border-white/10 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white dark:bg-[#1d1d1f] px-5 py-4 border-b border-black/5 dark:border-white/10 flex justify-between items-center rounded-t-2xl">
              <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">
                {editingContent ? 'Edit Post' : 'New Post'}
              </h2>
              <button onClick={() => { setShowAddModal(false); resetPostForm(); }} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"><X className="w-5 h-5 text-[#86868b]" /></button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="p-5 space-y-5">
                {/* Title */}
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">Post Title *</label>
                  <input
                    value={postForm.title}
                    onChange={(e) => setPostForm(prev => ({ ...prev, title: e.target.value }))}
                    required
                    placeholder="e.g. Luxury penthouse listing reveal"
                    className="w-full h-11 px-4 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                </div>

                {/* Caption / Description */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">Caption</label>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setShowSavedCaptionsModal(true)} className="text-[11px] text-[#0071e3] hover:underline flex items-center gap-1">
                        <Bookmark className="w-3 h-3" /> Load saved
                      </button>
                      {postForm.description && (
                        <button type="button" onClick={handleSaveCurrentCaption} className="text-[11px] text-[#86868b] hover:text-[#0071e3] flex items-center gap-1">
                          <BookmarkPlus className="w-3 h-3" /> Save
                        </button>
                      )}
                    </div>
                  </div>
                  <textarea
                    value={postForm.description}
                    onChange={(e) => setPostForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Write your caption here..."
                    rows={4}
                    className="w-full px-4 py-3 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none"
                  />
                </div>

                {/* Platform & Content Type */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">Platform</label>
                    <div className="grid grid-cols-3 gap-2">
                      {platforms.map(platform => {
                        const Icon = platform.icon;
                        const isSelected = postForm.platform === platform.id;
                        return (
                          <button
                            key={platform.id}
                            type="button"
                            onClick={() => setPostForm(prev => ({ ...prev, platform: platform.id }))}
                            className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${isSelected ? 'border-[#0071e3] bg-[#0071e3]/10' : 'border-black/5 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20'}`}
                          >
                            <Icon className="w-4 h-4" isSelected={isSelected} />
                            <span className="text-[10px] font-medium text-[#1d1d1f] dark:text-white truncate w-full text-center">{platform.name.split(' ')[0]}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">Content Type</label>
                    <div className="space-y-1.5">
                      {contentTypes.map(type => {
                        const Icon = type.icon;
                        return (
                          <button
                            key={type.id}
                            type="button"
                            onClick={() => setPostForm(prev => ({ ...prev, contentType: type.id }))}
                            className={`w-full flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all text-left ${postForm.contentType === type.id ? 'border-[#0071e3] bg-[#0071e3]/10' : 'border-black/5 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20'}`}
                          >
                            <Icon className="w-4 h-4 text-[#1d1d1f] dark:text-white flex-shrink-0" />
                            <span className="text-[12px] font-medium text-[#1d1d1f] dark:text-white">{type.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Scheduled Date */}
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">Scheduled Date & Time</label>
                  <input
                    type="datetime-local"
                    value={postForm.scheduledDate instanceof Date ? format(postForm.scheduledDate, "yyyy-MM-dd'T'HH:mm") : ''}
                    onChange={(e) => setPostForm(prev => ({ ...prev, scheduledDate: new Date(e.target.value) }))}
                    className="w-full h-11 px-4 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">Status</label>
                  <div className="grid grid-cols-3 gap-2">
                    {statuses.map(status => (
                      <button
                        key={status.id}
                        type="button"
                        onClick={() => setPostForm(prev => ({ ...prev, status: status.id }))}
                        className={`px-3 py-2 rounded-xl border-2 text-[12px] font-medium transition-all ${postForm.status === status.id ? 'border-[#0071e3] bg-[#0071e3]/10 text-[#0071e3]' : 'border-black/5 dark:border-white/10 text-[#86868b] hover:border-black/20 dark:hover:border-white/20'}`}
                      >
                        {status.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hashtags */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">Hashtags</label>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => { setCaptionTab('hashtags'); setShowSavedCaptionsModal(true); }} className="text-[11px] text-[#0071e3] hover:underline flex items-center gap-1">
                        <Hash className="w-3 h-3" /> Load group
                      </button>
                      {postForm.tags && (
                        <button type="button" onClick={handleSaveCurrentHashtags} className="text-[11px] text-[#86868b] hover:text-[#0071e3] flex items-center gap-1">
                          <BookmarkPlus className="w-3 h-3" /> Save
                        </button>
                      )}
                    </div>
                  </div>
                  <input
                    value={postForm.tags}
                    onChange={(e) => setPostForm(prev => ({ ...prev, tags: e.target.value }))}
                    placeholder="#luxuryhomes, #realestate, #dreamhome"
                    className="w-full h-11 px-4 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                </div>

                {/* Media Upload */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">Media ({(postForm.media || []).length}/{MAX_MEDIA_PER_POST})</label>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setShowMediaLibrary(true)} className="text-[11px] text-[#0071e3] hover:underline flex items-center gap-1">
                        <Library className="w-3 h-3" /> From library
                      </button>
                    </div>
                  </div>
                  <input ref={mediaFileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => { if (e.target.files?.length) uploadMediaFiles(e.target.files); }} />
                  <div
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${mediaDropActive ? 'border-[#0071e3] bg-[#0071e3]/5' : 'border-black/10 dark:border-white/10 hover:border-[#0071e3]/50'}`}
                    onClick={() => mediaFileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setMediaDropActive(true); }}
                    onDragLeave={() => setMediaDropActive(false)}
                    onDrop={(e) => { e.preventDefault(); setMediaDropActive(false); if (e.dataTransfer.files?.length) uploadMediaFiles(e.dataTransfer.files); }}
                  >
                    {uploadingMedia ? (
                      <div className="flex items-center justify-center gap-2 text-[#0071e3]">
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span className="text-[13px]">Uploading...</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-[#86868b] mx-auto mb-2" />
                        <p className="text-[13px] text-[#86868b]">Drop files here or click to upload</p>
                        <p className="text-[11px] text-[#86868b] mt-1">Images & videos supported · Max {MAX_MEDIA_PER_POST} files</p>
                      </>
                    )}
                  </div>
                  {/* Media previews */}
                  {(postForm.media || []).length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mt-3">
                      {(postForm.media || []).map((item, index) => (
                        <div key={index} className="relative aspect-square rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 group">
                          {item.type === 'video' ? (
                            <video src={item.url} className="w-full h-full object-cover" muted />
                          ) : (
                            <img src={item.url} alt="" className="w-full h-full object-cover" onError={(e) => e.target.style.display='none'} />
                          )}
                          <button
                            type="button"
                            onClick={() => removeMediaAt(index)}
                            className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3 text-white" />
                          </button>
                          {item.type === 'video' && <div className="absolute bottom-1 left-1 bg-black/60 rounded px-1 text-[9px] text-white">VIDEO</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {/* Footer */}
              <div className="sticky bottom-0 bg-white dark:bg-[#1d1d1f] px-5 py-4 border-t border-black/5 dark:border-white/10 flex justify-between items-center rounded-b-2xl">
                <div className="flex gap-2">
                  {editingContent && editingContent.status === 'draft' && (
                    <button type="button" onClick={() => { handleSubmitForApproval(editingContent); setShowAddModal(false); resetPostForm(); }} className="px-4 py-2 text-[13px] font-medium rounded-xl bg-[#ff9500]/10 text-[#ff9500] hover:bg-[#ff9500]/20 transition-colors">
                      Submit for Approval
                    </button>
                  )}
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => { setShowAddModal(false); resetPostForm(); }} className="px-5 py-2.5 text-[14px] font-medium rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" className="px-5 py-2.5 text-[14px] font-medium rounded-xl bg-[#0071e3] text-white hover:bg-[#0077ed] transition-colors">
                    {editingContent ? 'Save Changes' : 'Create Post'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── Google Sheets Import Modal ────────────────────────────────────────── */}
      {showImportModal && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-black/10 dark:border-white/10 shadow-2xl">
            <div className="sticky top-0 bg-white dark:bg-[#1d1d1f] px-5 py-4 border-b border-black/5 dark:border-white/10 flex justify-between items-center rounded-t-2xl">
              <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#34c759]" /> Import from Google Sheets
              </h2>
              <button onClick={() => { setShowImportModal(false); resetImportState(); }} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"><X className="w-5 h-5 text-[#86868b]" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {/* Step 1: Authorize */}
              {importStep === 1 && (
                <div className="space-y-6">
                  <div className="text-center py-8">
                    <FileSpreadsheet className="w-16 h-16 text-[#34c759] mx-auto mb-4" />
                    <h3 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white mb-2">Connect Google Sheets</h3>
                    <p className="text-[14px] text-[#86868b] mb-6">Authorize access to import your content calendar from Google Sheets.</p>
                    <button onClick={handleAuthorizeSheets} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#34c759] text-white text-[14px] font-medium hover:bg-[#30c755] transition-colors">
                      <ExternalLink className="w-4 h-4" /> Authorize Google Sheets
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Enter sheet URL */}
              {importStep === 2 && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">Google Sheets URL</label>
                    <input
                      value={sheetUrl}
                      onChange={(e) => setSheetUrl(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      className="w-full h-11 px-4 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    />
                  </div>
                  {availableTabs.length > 1 && (
                    <div>
                      <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">Select Tab</label>
                      <select value={selectedTabTitle} onChange={(e) => setSelectedTabTitle(e.target.value)} className="w-full h-11 px-4 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]">
                        {availableTabs.map(tab => <option key={tab.title} value={tab.title}>{tab.title}</option>)}
                      </select>
                    </div>
                  )}
                  <button onClick={handleFetchSheet} className="w-full py-3 rounded-xl bg-[#0071e3] text-white text-[14px] font-medium hover:bg-[#0077ed] transition-colors">
                    Fetch Sheet Data
                  </button>
                </div>
              )}

              {/* Step 3: Map columns */}
              {importStep === 3 && sheetData && (
                <div className="space-y-4">
                  <div className="rounded-xl bg-[#34c759]/10 border border-[#34c759]/20 p-4">
                    <p className="text-[13px] text-[#34c759] font-medium">✅ Found {sheetData.headers.length} columns and {sheetData.rows.length} rows</p>
                    <p className="text-[12px] text-[#34c759]/80 mt-1">
                      🖼️ <strong>Images:</strong> Map photo columns to "Image / Photo URL". Multiple image columns = one post per image.
                    </p>
                  </div>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {sheetData.headers.map((header, index) => {
                      const mapping = columnMappings[index.toString()];
                      const confidence = mappingConfidence[index.toString()];
                      const suggestion = mappingSuggestions[index.toString()];
                      const sampleData = sheetData.rows.slice(0, 2).map(row => row[index]).filter(v => v);
                      return (
                        <div key={index} className="rounded-xl p-4 bg-black/[0.02] dark:bg-white/5 border border-black/5 dark:border-white/10">
                          <div className="flex items-start gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white truncate">{header}</p>
                                {confidence && (
                                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${confidence === 'high' ? 'bg-[#34c759]/10 text-[#34c759]' : confidence === 'medium' ? 'bg-[#ff9500]/10 text-[#ff9500]' : 'bg-black/5 dark:bg-white/10 text-[#86868b]'}`}>
                                    {confidence} confidence
                                  </span>
                                )}
                              </div>
                              {sampleData.length > 0 && <p className="text-[11px] text-[#86868b] truncate">Sample: {sampleData.join(', ')}</p>}
                              {suggestion && <p className="text-[11px] text-[#0071e3] mt-1">💡 {suggestion}</p>}
                            </div>
                            <div className="w-48 flex-shrink-0">
                              <select
                                value={mapping || 'unmapped'}
                                onChange={(e) => handleMappingChange(index.toString(), e.target.value)}
                                className="w-full h-9 px-3 text-[13px] rounded-lg bg-white dark:bg-[#2d2d2d] border border-black/10 dark:border-white/10 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                              >
                                {availableFields.map(field => <option key={field.value} value={field.value}>{field.label}</option>)}
                              </select>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-black/5 dark:border-white/10">
                    <button onClick={() => setImportStep(2)} className="px-5 py-2.5 text-[14px] font-medium rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15 transition-colors">Back</button>
                    <button type="button" onClick={handleEnrichWithChatGPT} disabled={isEnriching} className="inline-flex items-center gap-2 px-5 py-2.5 text-[14px] font-medium rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15 transition-colors disabled:opacity-60">
                      {isEnriching ? <><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />Analyzing…</> : <>Enrich with ChatGPT</>}
                    </button>
                    <button onClick={handleImportContent} className="inline-flex items-center gap-2 px-5 py-2.5 text-[14px] font-medium rounded-xl bg-[#0071e3] text-white hover:bg-[#0077ed] transition-colors">
                      <Upload className="w-4 h-4" /> Import {sheetData.rows.length} Posts
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Importing */}
              {importStep === 4 && (
                <div className="text-center space-y-6 py-12">
                  <div className="flex justify-center">
                    {isImporting ? (
                      <div className="w-20 h-20 border-4 border-[#0071e3] border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <div className="w-20 h-20 bg-[#34c759]/10 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-10 h-10 text-[#34c759]" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white mb-2">
                      {isImporting ? 'Importing Content...' : 'Import Complete!'}
                    </h3>
                    <p className="text-[14px] text-[#86868b]">
                      {isImporting ? 'Please wait while we import your content...' : 'Your content has been successfully imported to your calendar.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ContentCalendar;
