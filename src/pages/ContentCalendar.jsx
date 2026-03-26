import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/PermissionsContext';
import { 
  Calendar, Plus, Instagram, Facebook, Twitter, Linkedin, Youtube,
  Image, Video, FileText, Clock, Users, TrendingUp, Settings,
  ExternalLink, Filter, Download, RefreshCw, CheckCircle, AlertCircle, Pause, Play,
  X, Edit, Trash2, Eye, CalendarDays, Folder, FolderPlus, FileSpreadsheet, Upload,
  Check, MoreVertical, Link as LinkIcon, ChevronLeft, ChevronRight,
  Library, GripVertical, ChevronDown
} from 'lucide-react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { format, addDays, isToday, isPast, isFuture, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import XLogo from '../assets/Twitter-X-logo.png';
import XLogoSelected from '../assets/x-logo-selected.png';
import { toast } from 'react-hot-toast';
import { useConfirm } from '../contexts/ConfirmContext';
import { googleSheetsService } from '../services/googleSheetsService';
import { openaiService } from '../services/openaiService';
import { uploadFile } from '../services/storageService';
import { supabaseService } from '../services/supabaseService';
import PostPreviewCard from '../components/content/PostPreviewCard';

const MAX_MEDIA_PER_POST = 15;

// ─── DroppableDay: a calendar cell that accepts library asset drops ───────────
const DroppableDay = ({ dateKey, isCurrentMonth, isToday: isTodayProp, onDoubleClick, activeDragId, children }) => {
  const { setNodeRef, isOver } = useDroppable({ id: dateKey });
  return (
    <div
      ref={setNodeRef}
      onDoubleClick={onDoubleClick}
      className={[
        'min-h-[120px] p-2 rounded-lg border cursor-pointer transition-all',
        !isCurrentMonth
          ? 'bg-black/[0.02] dark:bg-white/5 text-[#86868b] border-transparent'
          : 'border-black/5 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-[#1d1d1f] dark:text-white',
        isTodayProp ? 'bg-[#0071e3]/10 dark:bg-[#0071e3]/20 border-[#0071e3]/30' : '',
        isOver && activeDragId ? 'ring-2 ring-[#0071e3] bg-[#0071e3]/10 dark:bg-[#0071e3]/15 border-[#0071e3]/40' : ''
      ].join(' ')}
    >
      {children}
    </div>
  );
};

// ─── LibraryAssetTile: a draggable thumbnail in the Content Library ───────────
const LibraryAssetTile = ({ asset, isActive, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: asset.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={[
        'relative group aspect-square rounded-xl overflow-hidden bg-black/5 dark:bg-white/10 cursor-grab active:cursor-grabbing transition-all',
        isDragging ? 'opacity-40 scale-95' : 'hover:ring-2 hover:ring-[#0071e3]/60'
      ].join(' ')}
      title={asset.name}
    >
      {asset.type?.startsWith('video/') ? (
        <div className="w-full h-full flex items-center justify-center bg-black/20">
          <Video className="w-6 h-6 text-white" />
        </div>
      ) : (
        <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
      )}
      {/* Remove button */}
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onRemove(asset.id); }}
        className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
      >
        <X className="w-3 h-3" />
      </button>
      {/* Drag handle indicator */}
      <div className="absolute bottom-0.5 left-0.5 opacity-0 group-hover:opacity-60 transition-opacity">
        <GripVertical className="w-3 h-3 text-white" />
      </div>
    </div>
  );
};

const ContentCalendar = () => {
  const { currentUser } = useAuth();
  const { confirm } = useConfirm();
  // Check permissions (all true since page access = full access)
  const canCreateContent = true;
  const canDeleteContent = true;
  const canApproveContent = true;
  const [currentMonth, setCurrentMonth] = useState(new Date());
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

  // ─── Header dropdown popovers ────────────────────────────────────────────────
  const [showCalendarsDropdown, setShowCalendarsDropdown] = useState(false);
  const [showFiltersDropdown, setShowFiltersDropdown] = useState(false);
  const calendarsDropdownRef = useRef(null);
  const filtersDropdownRef = useRef(null);

  // ─── Content Library ─────────────────────────────────────────────────────────
  const [libraryAssets, setLibraryAssets] = useState(() => {
    try { return JSON.parse(localStorage.getItem('content_library_assets') || '[]'); } catch { return []; }
  });
  const [libraryDragOver, setLibraryDragOver] = useState(false);
  const [uploadingLibrary, setUploadingLibrary] = useState(false);
  const libraryFileInputRef = useRef(null);

  // ─── DnD sensors ─────────────────────────────────────────────────────────────
  const [activeDragId, setActiveDragId] = useState(null); // id of asset being dragged
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // Import from Sheets state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStep, setImportStep] = useState(1); // 1: Auth, 2: URL, 3: Mapping, 4: Importing
  const [sheetUrl, setSheetUrl] = useState('');
  const [sheetData, setSheetData] = useState(null);
  const [columnMappings, setColumnMappings] = useState({});
  const [mappingConfidence, setMappingConfidence] = useState({});
  const [mappingSuggestions, setMappingSuggestions] = useState({});
  const [isImporting, setIsImporting] = useState(false);
  const [isSheetsAuthorized, setIsSheetsAuthorized] = useState(false);
  const [enrichmentByRowIndex, setEnrichmentByRowIndex] = useState([]); // ChatGPT per-row suggestions
  const [isEnriching, setIsEnriching] = useState(false);
  const [availableTabs, setAvailableTabs] = useState([]); // sheet tabs (e.g. months)
  const [selectedTabTitle, setSelectedTabTitle] = useState('');

  // AI Caption Generation state
  const [showAICaptionModal, setShowAICaptionModal] = useState(false);
  const [aiCaptionPrompt, setAiCaptionPrompt] = useState('');
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  const [generatedCaption, setGeneratedCaption] = useState(null);

  // Load content and calendars from Firestore (with one-time localStorage migration)
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
        if (!cancelled) {
          setCalendars(refetched);
          setSelectedCalendarId(refetched[0]?.id ?? 'default');
        }
      } else {
        setCalendars(cals);
        setSelectedCalendarId(cals[0]?.id ?? 'default');
      }
      if (items.length === 0) {
        const storedItems = localStorage.getItem(`content_items_${email}`);
        const storedCals = localStorage.getItem(`calendars_${email}`);
        let parsedItems = [];
        let parsedCals = [];
        try {
          if (storedCals) parsedCals = JSON.parse(storedCals);
          if (storedItems) parsedItems = JSON.parse(storedItems);
        } catch (_) {}
        if (parsedCals.length || parsedItems.length) {
          await supabaseService.migrateContentCalendarFromLocalStorage(email, parsedItems, parsedCals);
          const refetchedItems = await supabaseService.getContentItems(email);
          if (!cancelled) setContentItems(refetchedItems);
        } else {
          setContentItems([]);
        }
      } else {
        setContentItems(items);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [currentUser?.email]);

  // Outside-click dismissal for header dropdowns
  useEffect(() => {
    const handler = (e) => {
      if (calendarsDropdownRef.current && !calendarsDropdownRef.current.contains(e.target)) setShowCalendarsDropdown(false);
      if (filtersDropdownRef.current && !filtersDropdownRef.current.contains(e.target)) setShowFiltersDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Persist library assets to localStorage
  useEffect(() => {
    localStorage.setItem('content_library_assets', JSON.stringify(libraryAssets));
  }, [libraryAssets]);

  const [postForm, setPostForm] = useState({
    title: '',
    description: '',
    platform: 'instagram',
    contentType: 'image',
    scheduledDate: new Date(),
    status: 'draft',
    tags: '',
    media: []
  });
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaDropActive, setMediaDropActive] = useState(false);
  const mediaFileInputRef = useRef(null);

  const platforms = [
    { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'bg-gradient-to-r from-purple-500 to-pink-500' },
    { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'bg-blue-600' },
    { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: 'bg-blue-700' },
    { id: 'youtube', name: 'YouTube', icon: Youtube, color: 'bg-red-600' },
    { id: 'twitter', name: 'Twitter', icon: function XIcon(props) { 
      const isSelected = props?.isSelected;
      return (
        <img 
          src={isSelected ? XLogoSelected : XLogo} 
          alt="Twitter" 
          className={`w-4 h-4 object-contain align-middle ${props?.className || ''}`}
        />
      ); 
    }, color: 'bg-black' }
  ];

  const contentTypes = [
    { id: 'image', name: 'Image Post', icon: Image },
    { id: 'video', name: 'Video Post', icon: Video },
    { id: 'text', name: 'Text Post', icon: FileText }
  ];

  const statuses = [
    { id: 'draft', name: 'Draft', color: 'bg-[#86868b]' },
    { id: 'scheduled', name: 'Scheduled', color: 'bg-[#0071e3]' },
    { id: 'published', name: 'Published', color: 'bg-[#34c759]' },
    { id: 'paused', name: 'Paused', color: 'bg-[#ff9500]' }
  ];

  const getPlatformIcon = (platformId) => {
    const platform = platforms.find(p => p.id === platformId);
    return platform ? platform.icon : Instagram;
  };

  const getStatusColor = (statusId) => {
    const status = statuses.find(s => s.id === statusId);
    return status ? status.color : 'bg-gray-500';
  };

  const getContentThumbUrl = (content) => {
    if (content.media?.length) return content.media[0].url;
    return content.imageUrl || content.videoUrl || null;
  };

  const handleDateDoubleClick = (date) => {
    setSelectedDate(date);
    setPostForm({
      ...postForm,
      scheduledDate: date
    });
    setShowAddModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser?.email) return;
    const tags = postForm.tags.split(',').map(tag => tag.trim()).filter(Boolean);
    const media = (postForm.media || []).slice(0, MAX_MEDIA_PER_POST);

    if (editingContent) {
      await supabaseService.updateContentItem(editingContent.id, {
        calendarId: selectedCalendarId,
        title: postForm.title,
        description: postForm.description,
        platform: postForm.platform,
        contentType: postForm.contentType,
        scheduledDate: postForm.scheduledDate,
        status: postForm.status,
        tags,
        media
      });
      const updated = await supabaseService.getContentItems(currentUser.email);
      setContentItems(updated);
      setEditingContent(null);
    } else {
      const { id } = await supabaseService.createContentItem({
        userEmail: currentUser.email,
        calendarId: selectedCalendarId,
        title: postForm.title,
        description: postForm.description,
        platform: postForm.platform,
        contentType: postForm.contentType,
        scheduledDate: postForm.scheduledDate,
        status: postForm.status,
        tags,
        media
      });
      const updated = await supabaseService.getContentItems(currentUser.email);
      setContentItems(updated);
    }

    setShowAddModal(false);
    setPostForm({
      title: '',
      description: '',
      platform: 'instagram',
      contentType: 'image',
      scheduledDate: new Date(),
      status: 'draft',
      tags: '',
      media: []
    });
    if (mediaFileInputRef.current) mediaFileInputRef.current.value = '';
    setMediaDropActive(false);
  };

  const uploadMediaFiles = async (files) => {
    const accepted = Array.from(files).filter(f =>
      f.type.startsWith('image/') || f.type.startsWith('video/')
    );
    if (accepted.length === 0) {
      toast.error('Please choose image or video files');
      return;
    }
    const currentLen = (postForm.media || []).length;
    if (currentLen + accepted.length > MAX_MEDIA_PER_POST) {
      toast.error(`Max ${MAX_MEDIA_PER_POST} media per post`);
      return;
    }
    setUploadingMedia(true);
    const uid = currentUser?.uid || (currentUser?.email || 'anon').replace(/[^a-zA-Z0-9]/g, '_');
    const itemId = editingContent?.id || `draft-${Date.now()}`;
    const newEntries = [];
    try {
      for (let i = 0; i < accepted.length; i++) {
        const file = accepted[i];
        const ext = file.name.split('.').pop() || (file.type.startsWith('video') ? 'mp4' : 'jpg');
        const path = `content-calendar/${uid}/${itemId}/${(postForm.media?.length || 0) + i}_${file.name.slice(0, 40)}.${ext}`;
        const url = await uploadFile(path, file);
        newEntries.push({ type: file.type.startsWith('video/') ? 'video' : 'image', url });
      }
      setPostForm(prev => ({
        ...prev,
        media: [...(prev.media || []), ...newEntries]
      }));
      toast.success(`${newEntries.length} file(s) uploaded`);
    } catch (err) {
      console.error(err);
      toast.error('Upload failed');
    } finally {
      setUploadingMedia(false);
      if (mediaFileInputRef.current) mediaFileInputRef.current.value = '';
    }
  };

  const removeMediaAt = (index) => {
    setPostForm(prev => ({
      ...prev,
      media: (prev.media || []).filter((_, i) => i !== index)
    }));
  };

  const handleMediaFileChange = (e) => {
    const files = e.target.files;
    if (files?.length) uploadMediaFiles(files);
  };

  const handleMediaDrop = (e) => {
    e.preventDefault();
    setMediaDropActive(false);
    const files = e.dataTransfer?.files;
    if (files?.length) uploadMediaFiles(files);
  };

  const handleEdit = (content) => {
    if (!canCreateContent) {
      toast.error('You need CREATE_CONTENT permission to edit content');
      return;
    }
    setEditingContent(content);
    setPostForm({
      title: content.title,
      description: content.description || '',
      platform: content.platform,
      contentType: content.contentType,
      scheduledDate: content.scheduledDate instanceof Date ? content.scheduledDate : new Date(content.scheduledDate),
      status: content.status,
      tags: Array.isArray(content.tags) ? content.tags.join(', ') : '',
      media: content.media && content.media.length ? content.media : []
    });
    setShowAddModal(true);
  };

  const handleDelete = async (contentId) => {
    if (!canDeleteContent) {
      toast.error('You need DELETE_CONTENT permission to delete content');
      return;
    }
    await supabaseService.deleteContentItem(contentId);
    if (currentUser?.email) {
      const updated = await supabaseService.getContentItems(currentUser.email);
      setContentItems(updated);
    }
  };

  const getCalendarDays = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
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

  // Debug logging for filtered content
  useEffect(() => {
    console.log('🔍 Filtering content:', {
      totalItems: contentItems.length,
      selectedCalendarId,
      filteredCount: filteredContent.length,
      filterPlatform,
      filterStatus
    });
  }, [contentItems, selectedCalendarId, filteredContent.length, filterPlatform, filterStatus]);

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  // ========== CONTENT LIBRARY ==========

  const handleLibraryFileDrop = async (e) => {
    e.preventDefault();
    setLibraryDragOver(false);
    const files = Array.from(e.dataTransfer?.files || e.target?.files || []);
    if (!files.length) return;
    setUploadingLibrary(true);
    try {
      const uploaded = await Promise.all(files.map(async (file) => {
        const url = await uploadFile(`content-library/${currentUser?.email || 'shared'}/${Date.now()}-${file.name}`, file);
        return { id: `lib-${Date.now()}-${Math.random().toString(36).slice(2)}`, url, name: file.name, type: file.type, size: file.size, addedAt: new Date().toISOString() };
      }));
      setLibraryAssets(prev => [...prev, ...uploaded]);
      toast.success(`${uploaded.length} file${uploaded.length > 1 ? 's' : ''} added to Content Library`);
    } catch (err) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploadingLibrary(false);
    }
  };

  const handleLibraryFileInput = (e) => handleLibraryFileDrop(e);

  const handleRemoveLibraryAsset = (id) => {
    setLibraryAssets(prev => prev.filter(a => a.id !== id));
  };

  // DnD: drag an asset from the library onto a calendar day
  const handleDragStart = (event) => {
    setActiveDragId(event.active.id);
  };

  const handleDragEnd = async (event) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;
    const assetId = active.id;
    const dateStr = over.id; // format: 'yyyy-MM-dd'
    const asset = libraryAssets.find(a => a.id === assetId);
    if (!asset) return;

    // Parse the dropped date
    let droppedDate;
    try { droppedDate = new Date(dateStr + 'T12:00:00'); } catch { return; }

    // Check if there's already a post on that day in the selected calendar
    const existingPosts = contentItems.filter(item =>
      item.calendarId === selectedCalendarId && isSameDay(new Date(item.scheduledDate), droppedDate)
    );

    if (existingPosts.length > 0) {
      // Append the asset to the first post on that day
      const post = existingPosts[0];
      const updatedMedia = [...(post.media || []), { url: asset.url, name: asset.name, type: asset.type }];
      try {
        await supabaseService.updateContentItem(post.id, { media: updatedMedia });
        setContentItems(prev => prev.map(i => i.id === post.id ? { ...i, media: updatedMedia } : i));
        toast.success(`Photo appended to "${post.title}"`);
      } catch (err) {
        toast.error('Failed to append photo: ' + err.message);
      }
    } else {
      // Create a new draft post with this asset on the dropped date
      const newPost = {
        calendarId: selectedCalendarId,
        userEmail: currentUser?.email,
        title: asset.name.replace(/\.[^.]+$/, '') || 'New Post',
        description: '',
        platform: 'instagram',
        contentType: asset.type?.startsWith('video/') ? 'video' : 'image',
        scheduledDate: droppedDate.toISOString(),
        status: 'draft',
        tags: '',
        media: [{ url: asset.url, name: asset.name, type: asset.type }],
        notes: ''
      };
      try {
        const created = await supabaseService.createContentItem(newPost);
        setContentItems(prev => [...prev, { ...newPost, id: created.id }]);
        toast.success('New draft post created from library asset');
      } catch (err) {
        toast.error('Failed to create post: ' + err.message);
      }
    }
  };

  // ========== CALENDAR MANAGEMENT ==========

  const handleEditCalendar = (calendarId, currentName) => {
    setEditingCalendarId(calendarId);
    setEditingCalendarName(currentName);
  };

  const handleSaveCalendarName = async () => {
    if (!editingCalendarName.trim()) {
      toast.error('Calendar name cannot be empty');
      return;
    }
    await supabaseService.updateContentCalendar(editingCalendarId, { name: editingCalendarName.trim() });
    if (currentUser?.email) {
      const refetched = await supabaseService.getContentCalendars(currentUser.email);
      setCalendars(refetched);
    }
    toast.success('Calendar renamed!');
    setEditingCalendarId(null);
    setEditingCalendarName('');
  };

  const handleCancelEditCalendar = () => {
    setEditingCalendarId(null);
    setEditingCalendarName('');
  };

  const handleDeleteCalendar = async (calendarId, calendarName) => {
    const confirmed = await confirm({
      title: 'Delete Calendar',
      message: `Delete "${calendarName}"? All content in this calendar will also be deleted. This cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger'
    });
    if (!confirmed) return;

    const itemsInCalendar = contentItems.filter(item => item.calendarId === calendarId);
    for (const item of itemsInCalendar) {
      await supabaseService.deleteContentItem(item.id);
    }
    await supabaseService.deleteContentCalendar(calendarId);
    if (currentUser?.email) {
      const [refetchedCals, refetchedItems] = await Promise.all([
        supabaseService.getContentCalendars(currentUser.email),
        supabaseService.getContentItems(currentUser.email)
      ]);
      setCalendars(refetchedCals);
      setContentItems(refetchedItems);
      if (selectedCalendarId === calendarId && refetchedCals.length) {
        setSelectedCalendarId(refetchedCals.find(c => c.id !== calendarId)?.id ?? refetchedCals[0]?.id ?? 'default');
      }
    }
    toast.success(`Deleted "${calendarName}"`);
  };

  const handleLinkSheet = (calendarId) => {
    setLinkingCalendarId(calendarId);
    setLinkSheetUrl('');
  };

  const handleSaveLinkSheet = () => {
    if (!linkSheetUrl.trim()) {
      toast.error('Please enter a Google Sheets URL');
      return;
    }
    setCalendars(prev => prev.map(cal =>
      cal.id === linkingCalendarId
        ? { ...cal, sheetUrl: linkSheetUrl.trim(), lastImported: new Date().toISOString() }
        : cal
    ));
    toast.success('Sheet linked! You can now use the refresh button.');
    setLinkingCalendarId(null);
    setLinkSheetUrl('');
  };

  const handleCancelLinkSheet = () => {
    setLinkingCalendarId(null);
    setLinkSheetUrl('');
  };

  const handleRefreshCalendar = async (calendarId, calendarName, sheetUrl, sheetTitle = null) => {
    if (!sheetUrl) {
      toast.error('No sheet URL found for this calendar');
      return;
    }

    setRefreshingCalendarId(calendarId);
    
    try {
      toast.loading('Refreshing from Google Sheets...', { id: 'refresh-cal' });
      const data = await googleSheetsService.fetchSheetData(sheetUrl, sheetTitle || undefined);
      
      if (!data.headers || data.headers.length === 0) {
        toast.error('Sheet appears to be empty', { id: 'refresh-cal' });
        setRefreshingCalendarId(null);
        return;
      }

      // Get sample rows for AI analysis
      const sampleRows = googleSheetsService.getSampleRows(data.rows, 5);
      
      toast.loading('AI is re-analyzing columns...', { id: 'refresh-cal' });
      
      // Use AI to suggest mappings
      let aiMappings = {};
      try {
        const aiResult = await openaiService.analyzeColumnMapping(data.headers, sampleRows);
        aiMappings = aiResult.mappings;
      } catch (aiError) {
        console.warn('⚠️ AI analysis failed, using fallback:', aiError);
        const fallback = openaiService.fallbackMapping(data.headers);
        aiMappings = fallback.mappings;
      }

      // Delete existing content in this calendar
      setContentItems(prev => prev.filter(item => item.calendarId !== calendarId));

      const convertToDirectUrl = (url) => {
        if (!url) return '';
        const u = String(url).trim();
        if (u.includes('dropbox.com')) {
          if (u.includes('preview=')) return u.split('?')[0] + '?raw=1';
          return u.replace(/\?dl=0/g, '?raw=1').replace(/&dl=0/g, '&raw=1');
        }
        if (u.includes('drive.google.com')) {
          const match = u.match(/\/d\/([^\/\?]+)/);
          if (match) return `https://drive.google.com/uc?export=view&id=${match[1]}`;
          if (u.includes('/folders/')) return '';
        }
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

      const imageUrlColIndices = Object.entries(aiMappings)
        .filter(([, field]) => field === 'imageUrl')
        .map(([col]) => parseInt(col, 10))
        .sort((a, b) => a - b);
      const multiPostPerRow = imageUrlColIndices.length >= 2;

      const importedContent = [];
      let successCount = 0;
      let skipCount = 0;

      for (let i = 0; i < data.rows.length; i++) {
        const row = data.rows[i];
        try {
          const contentItem = {};
          Object.keys(aiMappings).forEach(colIndex => {
            const field = aiMappings[colIndex];
            const value = row[parseInt(colIndex)];
            if (field === 'unmapped' || !value) return;
            if (multiPostPerRow && field === 'imageUrl') return;
            if ((field === 'mediaUrls' || field === 'imageUrl') && contentItem[field]) {
              contentItem[field] = `${contentItem[field]}, ${value}`;
            } else {
              contentItem[field] = value;
            }
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
            extraUrls.slice(0, MAX_MEDIA_PER_POST - media.length).forEach(url => {
              media.push({ type: url.match(/\.(mp4|webm|mov)$/i) ? 'video' : 'image', url });
            });
            return {
              id: Date.now() + Math.random(),
              calendarId,
              title,
              description: contentItem.caption || contentItem.notes || '',
              platform: normalizedPlatform,
              contentType: normalizedContentType,
              scheduledDate: parsedDate,
              status: normalizedStatus,
              tags: contentItem.hashtags ? contentItem.hashtags.split(/[,\s#]+/).filter(t => t) : [],
              media,
              notes: contentItem.notes || '',
              assignedTo: contentItem.assignedTo || '',
              createdAt: new Date()
            };
          };

          if (multiPostPerRow) {
            for (const colIdx of imageUrlColIndices) {
              const rawUrl = extractImageUrlFromCell(row[colIdx]);
              if (!rawUrl) continue;
              const primaryImageUrl = convertToDirectUrl(rawUrl);
              importedContent.push(buildOnePost(primaryImageUrl, ''));
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
              const imageUrl = urls.find(url =>
                url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ||
                (!url.includes('video') && !url.includes('.mp4') && (url.includes('drive.google.com') || url.includes('dropbox.com') || url.includes('imgur.com') || url.includes('cloudinary.com') || url.includes('googleusercontent.com')))
              );
              if (imageUrl) primaryImageUrl = convertToDirectUrl(imageUrl);
            }
            importedContent.push(buildOnePost(primaryImageUrl, allMediaUrls));
            successCount++;
          }
        } catch (rowError) {
          console.error('❌ Error processing row:', rowError, row);
          skipCount++;
        }
      }

      if (currentUser?.email && importedContent.length) {
        for (const item of importedContent) {
          await supabaseService.createContentItem({
            userEmail: currentUser.email,
            calendarId: item.calendarId,
            title: item.title,
            description: item.description,
            platform: item.platform,
            contentType: item.contentType,
            scheduledDate: item.scheduledDate,
            status: item.status,
            tags: item.tags,
            media: item.media || []
          });
        }
        const updated = await supabaseService.getContentItems(currentUser.email);
        setContentItems(updated);
      } else if (importedContent.length) {
        setContentItems(prev => [...prev, ...importedContent]);
      }

      toast.success(`✅ Refreshed "${calendarName}" with ${successCount} posts!`, { id: 'refresh-cal' });

    } catch (error) {
      console.error('❌ Refresh error:', error);
      toast.error(error.message || 'Failed to refresh calendar', { id: 'refresh-cal' });
    } finally {
      setRefreshingCalendarId(null);
    }
  };

  // ========== GOOGLE SHEETS IMPORT HANDLERS ==========

  const handleStartImport = async () => {
    console.log('🚀 Starting Google Sheets import...');
    setShowImportModal(true);
    setImportStep(1);
    
    try {
      toast.loading('Initializing Google Sheets...', { id: 'init-sheets' });
      
      // Initialize Google Sheets service
      const result = await googleSheetsService.initialize(currentUser.email);
      
      toast.dismiss('init-sheets');
      
      if (!result.needsAuth) {
        setIsSheetsAuthorized(true);
        setImportStep(2);
        toast.success('✅ Already authorized!');
      }
    } catch (error) {
      console.error('❌ Error initializing Sheets:', error);
      toast.error(error.message || 'Failed to initialize Google Sheets. Please refresh and try again.', { id: 'init-sheets' });
    }
  };

  const handleAuthorizeSheets = async () => {
    try {
      console.log('🔐 Requesting Sheets authorization...');
      toast.loading('Opening authorization window...', { id: 'auth-sheets' });
      
      await googleSheetsService.requestAuthorization();
      
      toast.success('✅ Google Sheets authorized!', { id: 'auth-sheets' });
      setIsSheetsAuthorized(true);
      setImportStep(2);
    } catch (error) {
      console.error('❌ Authorization failed:', error);
      toast.error(error.message || 'Failed to authorize Google Sheets. Please try again.', { id: 'auth-sheets' });
    }
  };

  const handleFetchSheet = async () => {
    if (!sheetUrl.trim()) {
      toast.error('Please enter a Google Sheets URL');
      return;
    }

    try {
      const spreadsheetId = googleSheetsService.extractSpreadsheetId(sheetUrl);

      // If we haven't loaded tabs yet, or user might have changed URL, list sheets first
      if (availableTabs.length === 0) {
        toast.loading('Loading spreadsheet tabs...', { id: 'fetch-sheet' });
        const { sheets } = await googleSheetsService.listSheets(sheetUrl);
        if (!sheets || sheets.length === 0) {
          toast.error('No tabs found in this spreadsheet', { id: 'fetch-sheet' });
          return;
        }
        setAvailableTabs(sheets);
        setSelectedTabTitle(sheets[0].title);
        toast.dismiss('fetch-sheet');
        if (sheets.length > 1) {
          toast.success(`Select which tab to import (e.g. month), then click Fetch.`);
          return;
        }
      }

      const tabToFetch = selectedTabTitle || availableTabs[0]?.title;
      toast.loading(`Fetching "${tabToFetch}"...`, { id: 'fetch-sheet' });

      const data = await googleSheetsService.fetchSheetData(sheetUrl, tabToFetch);

      if (!data.headers || data.headers.length === 0) {
        toast.error('This tab appears to be empty', { id: 'fetch-sheet' });
        return;
      }

      setSheetData(data);

      console.log('📋 Sheet data received:', {
        spreadsheetTitle: data.spreadsheetTitle,
        sheetTitle: data.sheetTitle,
        headers: data.headers,
        rowCount: data.rows.length,
        sampleRow: data.rows[0]
      });

      const sampleRows = googleSheetsService.getSampleRows(data.rows, 5);
      toast.loading('ChatGPT is analyzing columns...', { id: 'fetch-sheet' });

      try {
        const aiResult = await openaiService.analyzeColumnMapping(data.headers, sampleRows);
        setColumnMappings(aiResult.mappings);
        setMappingConfidence(aiResult.confidence);
        setMappingSuggestions(aiResult.suggestions);
        toast.success('✅ Sheet analyzed successfully!', { id: 'fetch-sheet' });
      } catch (aiError) {
        console.warn('⚠️ AI analysis failed, using fallback:', aiError);
        toast.loading('Using fallback mapping...', { id: 'fetch-sheet' });
        const fallback = openaiService.fallbackMapping(data.headers);
        setColumnMappings(fallback.mappings);
        setMappingConfidence(fallback.confidence);
        setMappingSuggestions(fallback.suggestions);
        toast.success('✅ Sheet fetched! Please review mappings.', { id: 'fetch-sheet' });
      }

      setImportStep(3);
    } catch (error) {
      console.error('❌ Error fetching sheet:', error);
      toast.error(error.message || 'Failed to fetch sheet data', { id: 'fetch-sheet' });
    }
  };

  const handleMappingChange = (columnIndex, newField) => {
    setColumnMappings(prev => ({
      ...prev,
      [columnIndex]: newField
    }));
  };

  const handleEnrichWithChatGPT = async () => {
    if (!sheetData?.rows?.length || !sheetData?.headers) return;
    setIsEnriching(true);
    try {
      toast.loading('ChatGPT is analyzing rows to enrich your calendar...', { id: 'enrich' });
      const enrichments = await openaiService.enrichSheetRowsForCalendar(
        sheetData.headers,
        sheetData.rows,
        columnMappings,
        25
      );
      setEnrichmentByRowIndex(enrichments);
      const filled = enrichments.filter(e => e && Object.keys(e).length > 0).length;
      toast.success(`ChatGPT suggested enrichments for ${filled} row(s). Import to apply.`, { id: 'enrich' });
    } catch (err) {
      console.warn('Enrichment failed:', err);
      toast.error(err.message || 'Enrichment failed. You can still import without it.', { id: 'enrich' });
    } finally {
      setIsEnriching(false);
    }
  };

  const handleImportContent = async () => {
    if (!sheetData || !sheetData.rows) {
      toast.error('No data to import');
      return;
    }

    setIsImporting(true);
    setImportStep(4);
    
    try {
      const newCalendarName = sheetData.spreadsheetTitle || 'Imported Calendar';
      console.log('📅 Creating new calendar:', newCalendarName);

      let newCalendarId;
      if (currentUser?.email) {
        const res = await supabaseService.createContentCalendar({ userEmail: currentUser.email, name: newCalendarName });
        newCalendarId = res.id;
        const refetchedCals = await supabaseService.getContentCalendars(currentUser.email);
        setCalendars(refetchedCals);
      } else {
        newCalendarId = `cal-${Date.now()}`;
        setCalendars(prev => [...prev, { id: newCalendarId, name: newCalendarName }]);
      }

      const importedContent = [];
      let successCount = 0;
      let skipCount = 0;

      const convertToDirectUrl = (url) => {
        if (!url) return '';
        const u = String(url).trim();
        if (u.includes('dropbox.com')) {
          if (u.includes('preview=')) return u.split('?')[0] + '?raw=1';
          return u.replace(/\?dl=0/g, '?raw=1').replace(/&dl=0/g, '&raw=1');
        }
        if (u.includes('drive.google.com')) {
          const match = u.match(/\/d\/([^\/\?]+)/);
          if (match) return `https://drive.google.com/uc?export=view&id=${match[1]}`;
          if (u.includes('/folders/')) return '';
        }
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

      const imageUrlColIndices = Object.entries(columnMappings)
        .filter(([, field]) => field === 'imageUrl')
        .map(([col]) => parseInt(col, 10))
        .sort((a, b) => a - b);
      const multiPostPerRow = imageUrlColIndices.length >= 2;

      // Process each row
      for (let i = 0; i < sheetData.rows.length; i++) {
        const row = sheetData.rows[i];
        try {
          const contentItem = {};
          Object.keys(columnMappings).forEach(colIndex => {
            const field = columnMappings[colIndex];
            const value = row[parseInt(colIndex)];
            if (field === 'unmapped' || !value) return;
            if (multiPostPerRow && field === 'imageUrl') return;
            if ((field === 'mediaUrls' || field === 'imageUrl') && contentItem[field]) {
              contentItem[field] = `${contentItem[field]}, ${value}`;
            } else {
              contentItem[field] = value;
            }
          });

          const enrichment = enrichmentByRowIndex[i];
          if (enrichment && typeof enrichment === 'object') {
            ['platform', 'contentType', 'hashtags', 'postDate', 'caption', 'notes'].forEach(field => {
              const v = enrichment[field];
              if (v != null && v !== '' && (!contentItem[field] || String(contentItem[field]).trim() === '')) {
                contentItem[field] = String(v).trim();
              }
            });
          }

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
            extraUrls.slice(0, MAX_MEDIA_PER_POST - media.length).forEach(url => {
              media.push({ type: url.match(/\.(mp4|webm|mov)$/i) ? 'video' : 'image', url });
            });
            return {
              id: Date.now() + Math.random(),
              calendarId: newCalendarId,
              title,
              description: contentItem.caption || contentItem.notes || '',
              platform: normalizedPlatform,
              contentType: normalizedContentType,
              scheduledDate: parsedDate,
              status: normalizedStatus,
              tags: contentItem.hashtags ? contentItem.hashtags.split(/[,\s#]+/).filter(t => t) : [],
              media,
              notes: contentItem.notes || '',
              assignedTo: contentItem.assignedTo || '',
              createdAt: new Date()
            };
          };

          if (multiPostPerRow) {
            for (const colIdx of imageUrlColIndices) {
              const cellVal = row[colIdx];
              const rawUrl = extractImageUrlFromCell(cellVal);
              if (!rawUrl) continue;
              const primaryImageUrl = convertToDirectUrl(rawUrl);
              importedContent.push(buildOnePost(primaryImageUrl, ''));
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
              const imageUrl = urls.find(url =>
                url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ||
                (!url.includes('video') && !url.includes('.mp4') && (url.includes('drive.google.com') || url.includes('dropbox.com') || url.includes('imgur.com') || url.includes('cloudinary.com') || url.includes('googleusercontent.com')))
              );
              if (imageUrl) primaryImageUrl = convertToDirectUrl(imageUrl);
            }
            importedContent.push(buildOnePost(primaryImageUrl, allMediaUrls));
            successCount++;
          }
        } catch (rowError) {
          console.error('  ❌ Error processing row:', rowError, row);
          skipCount++;
        }
      }

      // Log final column mappings for debugging
      console.log('\n📊 FINAL COLUMN MAPPINGS:');
      sheetData.headers.forEach((header, index) => {
        const mapping = columnMappings[index.toString()];
        console.log(`  Column ${index}: "${header}" → ${mapping || 'unmapped'}`);
      });
      
      console.log('\n📦 Total imported content:', importedContent);
      console.log(`📦 Importing ${importedContent.length} items to calendar: ${newCalendarName}`);

      if (currentUser?.email && importedContent.length) {
        for (const item of importedContent) {
          await supabaseService.createContentItem({
            userEmail: currentUser.email,
            calendarId: item.calendarId,
            title: item.title,
            description: item.description,
            platform: item.platform,
            contentType: item.contentType,
            scheduledDate: item.scheduledDate,
            status: item.status,
            tags: item.tags,
            media: item.media || []
          });
        }
        const updated = await supabaseService.getContentItems(currentUser.email);
        setContentItems(updated);
      } else if (importedContent.length) {
        setContentItems(prev => [...prev, ...importedContent]);
      }

      setSelectedCalendarId(newCalendarId);

      toast.success(`✅ Created "${newCalendarName}" with ${successCount} posts! ${skipCount > 0 ? `(${skipCount} skipped)` : ''}`);
      
      // Close modal after a short delay
      setTimeout(() => {
        setShowImportModal(false);
        resetImportState();
      }, 2000);

    } catch (error) {
      console.error('❌ Import error:', error);
      toast.error('Failed to import content. Please check the console for details.');
    } finally {
      setIsImporting(false);
    }
  };

  // Helper functions for normalizing imported data
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
    if (value === undefined || value === null || String(value).trim() === '') {
      return new Date();
    }
    const str = String(value).trim();
    try {
      // Google Sheets/Excel serial date (e.g. 45357 for March 2, 2026) - API often returns number not string
      const serial = typeof value === 'number' ? value : (/^\d+$/.test(str) ? parseInt(str, 10) : NaN);
      if (!isNaN(serial) && serial > 1000 && serial < 1000000) {
        const d = new Date((serial - 25569) * 86400 * 1000);
        if (!isNaN(d.getTime())) return d;
      }
      // MM/DD/YY or MM-DD-YY (e.g. 03/01/26, 3/2/26)
      const shortDate = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
      if (shortDate) {
        const [, mm, dd, yy] = shortDate;
        const month = parseInt(mm, 10) - 1;
        const day = parseInt(dd, 10);
        const year = yy.length === 2 ? 2000 + parseInt(yy, 10) : parseInt(yy, 10);
        const d = new Date(year, month, day);
        if (!isNaN(d.getTime())) return d;
      }
      // "Monday, October 20" style
      const dayMonthPattern = /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(\w+)\s+(\d+)$/i;
      const match = str.match(dayMonthPattern);
      if (match) {
        const [, , month, day] = match;
        const year = new Date().getFullYear();
        const d = new Date(`${month} ${day}, ${year}`);
        if (!isNaN(d.getTime())) return d;
      }
      let date = new Date(str);
      if (!isNaN(date.getTime())) return date;
      date = new Date(str.replace(/\//g, '-'));
      if (!isNaN(date.getTime())) return date;
      const currentYear = new Date().getFullYear();
      date = new Date(`${str}, ${currentYear}`);
      if (!isNaN(date.getTime())) return date;
      return new Date();
    } catch (error) {
      return new Date();
    }
  };

  const resetImportState = () => {
    setImportStep(1);
    setSheetUrl('');
    setSheetData(null);
    setColumnMappings({});
    setMappingConfidence({});
    setMappingSuggestions({});
    setEnrichmentByRowIndex([]);
    setAvailableTabs([]);
    setSelectedTabTitle('');
    setIsImporting(false);
    setIsEnriching(false);
  };

  const availableFields = [
    { value: 'postDate', label: 'Post Date (optional - auto-generated if missing)' },
    { value: 'platform', label: 'Platform' },
    { value: 'contentType', label: 'Content Type' },
    { value: 'caption', label: 'Caption/Description' },
    { value: 'status', label: 'Status' },
    { value: 'assignedTo', label: 'Assigned To' },
    { value: 'hashtags', label: 'Hashtags' },
    { value: 'imageUrl', label: 'Image / Photo URL (one column = one post per row if multiple)' },
    { value: 'mediaUrls', label: 'Media / Video URLs' },
    { value: 'notes', label: 'Notes' },
    { value: 'unmapped', label: '(Skip this column)' }
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-[28px] sm:text-[34px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em] mb-1">
            Content Calendar
          </h1>
          <p className="text-[15px] sm:text-[17px] text-[#86868b]">
            Plan and schedule your social media content
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleStartImport}
            disabled={!canCreateContent}
            title={!canCreateContent ? 'You need CREATE_CONTENT permission' : 'Import from Google Sheets'}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-[#2d2d2d] border border-black/10 dark:border-white/10 text-[#1d1d1f] dark:text-white text-[14px] font-medium hover:bg-[#f5f5f7] dark:hover:bg-[#3d3d3d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Import from Sheets
          </button>
          <button 
            onClick={() => canCreateContent ? setShowAddModal(true) : toast.error('You need CREATE_CONTENT permission')} 
            disabled={!canCreateContent}
            title={!canCreateContent ? 'You need CREATE_CONTENT permission' : ''}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0071e3] text-white text-[14px] font-medium hover:bg-[#0077ed] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Add Content
          </button>
        </div>
      </div>

      {/* ── FULL-WIDTH TOOLBAR (Calendars + Filters as header dropdowns) ─── */}
      <div className="flex flex-wrap items-center gap-2">

        {/* Calendars dropdown */}
        <div className="relative" ref={calendarsDropdownRef}>
          <button
            onClick={() => { setShowCalendarsDropdown(v => !v); setShowFiltersDropdown(false); }}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-medium transition-colors border ${
              showCalendarsDropdown ? 'bg-[#0071e3]/10 border-[#0071e3]/30 text-[#0071e3]' : 'bg-white dark:bg-[#2d2d2d] border-black/10 dark:border-white/10 text-[#1d1d1f] dark:text-white hover:bg-[#f5f5f7] dark:hover:bg-[#3d3d3d]'
            }`}
          >
            <Folder className="w-4 h-4" />
            <span>{calendars.find(c => c.id === selectedCalendarId)?.name || 'Calendars'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showCalendarsDropdown ? 'rotate-180' : ''}`} />
          </button>
          {showCalendarsDropdown && (
            <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-[#1d1d1f] rounded-2xl border border-black/10 dark:border-white/10 shadow-xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-black/5 dark:border-white/10">
                <h4 className="text-[13px] font-semibold text-[#1d1d1f] dark:text-white">Calendars</h4>
              </div>
              <div className="p-3 space-y-1.5 max-h-72 overflow-y-auto">
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
                          <button onClick={() => { setSelectedCalendarId(cal.id); setShowCalendarsDropdown(false); }} className="flex-1 flex items-center justify-between text-left min-w-0">
                            <span className={`truncate text-[13px] ${isActive ? 'text-[#0071e3] font-medium' : 'text-[#1d1d1f] dark:text-white'}`}>{cal.name}</span>
                            <span className={`ml-2 text-[11px] px-2 py-0.5 rounded-full flex-shrink-0 font-medium ${isActive ? 'bg-[#0071e3] text-white' : 'bg-black/5 dark:bg-white/10 text-[#86868b]'}`}>{count}</span>
                          </button>
                          {!isDefault && (
                            <div className="flex gap-0.5 flex-shrink-0">
                              {cal.sheetUrl ? (
                                <button onClick={() => handleRefreshCalendar(cal.id, cal.name, cal.sheetUrl, cal.sheetTitle)} disabled={refreshingCalendarId === cal.id} className={`p-1.5 hover:bg-[#34c759]/20 rounded-lg ${refreshingCalendarId === cal.id ? 'animate-spin' : ''}`}><RefreshCw className="w-3.5 h-3.5 text-[#34c759]" /></button>
                              ) : (
                                <button onClick={() => handleLinkSheet(cal.id)} className="p-1.5 hover:bg-[#af52de]/20 rounded-lg"><LinkIcon className="w-3.5 h-3.5 text-[#af52de]" /></button>
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
              <div className="px-3 pb-3">
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
              </div>
            </div>
          )}
        </div>

        {/* Filters dropdown */}
        <div className="relative" ref={filtersDropdownRef}>
          <button
            onClick={() => { setShowFiltersDropdown(v => !v); setShowCalendarsDropdown(false); }}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-medium transition-colors border ${
              (filterPlatform !== 'all' || filterStatus !== 'all')
                ? 'bg-[#0071e3]/10 border-[#0071e3]/30 text-[#0071e3]'
                : 'bg-white dark:bg-[#2d2d2d] border-black/10 dark:border-white/10 text-[#1d1d1f] dark:text-white hover:bg-[#f5f5f7] dark:hover:bg-[#3d3d3d]'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Filters{(filterPlatform !== 'all' || filterStatus !== 'all') ? ' •' : ''}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFiltersDropdown ? 'rotate-180' : ''}`} />
          </button>
          {showFiltersDropdown && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-[#1d1d1f] rounded-2xl border border-black/10 dark:border-white/10 shadow-xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
                <h4 className="text-[13px] font-semibold text-[#1d1d1f] dark:text-white">Filters</h4>
                {(filterPlatform !== 'all' || filterStatus !== 'all') && (
                  <button onClick={() => { setFilterPlatform('all'); setFilterStatus('all'); }} className="text-[11px] text-[#0071e3] hover:underline">Clear all</button>
                )}
              </div>
              <div className="p-4 space-y-4">
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
          )}
        </div>
      </div>

      {/* ── FULL-WIDTH CALENDAR + CONTENT LIBRARY ─────────────────────────── */}
      <div className="space-y-6">
        {/* ── DND CONTEXT wraps calendar + library ── */}
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
      {/* Calendar View */}
      <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 overflow-hidden">
        <div className="px-5 py-4 border-b border-black/5 dark:border-white/10 flex justify-between items-center">
          <h3 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-[#0071e3]" />
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
          <div className="flex gap-2">
            <button 
              onClick={prevMonth} 
              className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/10 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-[#1d1d1f] dark:text-white" />
            </button>
            <button 
              onClick={nextMonth} 
              className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/10 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-[#1d1d1f] dark:text-white" />
            </button>
          </div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-7 gap-1">
            {/* Day headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-2 text-center text-[12px] font-medium text-[#86868b] bg-black/[0.02] dark:bg-white/5 rounded-lg">
                {day}
              </div>
            ))}
            
            {/* Calendar days — each is a drop target for library assets */}
            {getCalendarDays().map((date, index) => {
              const dayContent = getContentForDate(date);
              const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
              const dateKey = format(date, 'yyyy-MM-dd');
              
              return (
                <DroppableDay
                  key={index}
                  dateKey={dateKey}
                  isCurrentMonth={isCurrentMonth}
                  isToday={isToday(date)}
                  onDoubleClick={() => isCurrentMonth && handleDateDoubleClick(date)}
                  activeDragId={activeDragId}
                >
                  <div className={`text-[12px] font-medium mb-1 ${isToday(date) ? 'text-[#0071e3]' : ''}`}>
                    {format(date, 'd')}
                  </div>
                  <div className="space-y-1">
                    {dayContent.length >= 3 ? (
                      <>
                        <div className="flex flex-wrap gap-0.5" title={dayContent.map(c => c.title).join(' · ')}>
                          {dayContent.slice(0, 5).map(content => (
                            <div key={content.id} className="w-[22%] min-w-0 aspect-square rounded overflow-hidden flex-shrink-0 bg-black/10 dark:bg-white/10">
                              {getContentThumbUrl(content) ? (
                                <img
                                  src={getContentThumbUrl(content)}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling?.classList.remove('hidden'); }}
                                />
                              ) : null}
                              <div className={`w-full h-full flex items-center justify-center text-[10px] font-medium text-[#86868b] ${getContentThumbUrl(content) ? 'hidden' : ''}`}>
                                <Image className="w-4 h-4 opacity-60" />
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="text-[10px] text-[#86868b] font-medium">{dayContent.length} posts</div>
                      </>
                    ) : (
                      <>
                        {dayContent.slice(0, 2).map(content => (
                          <div
                            key={content.id}
                            className={`text-[10px] p-1 rounded-md overflow-hidden ${getStatusColor(content.status)}`}
                            title={content.title}
                          >
                            {getContentThumbUrl(content) ? (
                              <img
                                src={getContentThumbUrl(content)}
                                alt={content.title}
                                className="w-full h-10 object-cover rounded mb-1"
                                onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling?.classList.remove('hidden'); }}
                              />
                            ) : null}
                            <div className={`w-full h-10 rounded mb-1 flex items-center justify-center bg-black/10 dark:bg-white/10 ${getContentThumbUrl(content) ? 'hidden' : ''}`}>
                              <Image className="w-5 h-5 text-[#86868b]" />
                            </div>
                            <div className="text-white truncate font-medium">{content.title}</div>
                          </div>
                        ))}
                        {dayContent.length > 2 && (
                          <div className="text-[10px] text-[#86868b] font-medium">+{dayContent.length - 2} more</div>
                        )}
                      </>
                    )}
                  </div>
                </DroppableDay>
              );
            })}
          </div>
        </div>
      </div>


      {/* ── CONTENT LIBRARY ──────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 overflow-hidden">
        <div className="px-5 py-4 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white flex items-center gap-2">
            <Library className="w-4 h-4 text-[#0071e3]" />
            Content Library
            {libraryAssets.length > 0 && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#0071e3]/10 text-[#0071e3] font-medium">{libraryAssets.length}</span>
            )}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => libraryFileInputRef.current?.click()}
              disabled={uploadingLibrary}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0071e3] text-white text-[12px] font-medium hover:bg-[#0077ed] transition-colors disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              {uploadingLibrary ? 'Uploading...' : 'Add Photos'}
            </button>
            <input
              ref={libraryFileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              className="hidden"
              onChange={handleLibraryFileInput}
            />
          </div>
        </div>

        {/* Drop zone + asset grid */}
        <div
          className={`p-4 min-h-[160px] transition-colors ${libraryDragOver ? 'bg-[#0071e3]/5 border-2 border-dashed border-[#0071e3]/40' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setLibraryDragOver(true); }}
          onDragLeave={() => setLibraryDragOver(false)}
          onDrop={handleLibraryFileDrop}
        >
          {libraryAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <Upload className="w-8 h-8 text-[#86868b] mb-2" />
              <p className="text-[14px] font-medium text-[#1d1d1f] dark:text-white">Drop photos &amp; videos here</p>
              <p className="text-[12px] text-[#86868b] mt-1">or click <span className="text-[#0071e3] cursor-pointer" onClick={() => libraryFileInputRef.current?.click()}>Add Photos</span> to upload</p>
              <p className="text-[11px] text-[#86868b] mt-2">Drag any asset onto a calendar date to create or append to a post</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
              {libraryAssets.map((asset) => (
                <LibraryAssetTile
                  key={asset.id}
                  asset={asset}
                  isActive={activeDragId === asset.id}
                  onRemove={handleRemoveLibraryAsset}
                />
              ))}
              {/* Add more button */}
              <button
                onClick={() => libraryFileInputRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-black/10 dark:border-white/10 flex items-center justify-center hover:border-[#0071e3]/40 hover:bg-[#0071e3]/5 transition-colors group"
              >
                <Plus className="w-5 h-5 text-[#86868b] group-hover:text-[#0071e3]" />
              </button>
            </div>
          )}
        </div>
        <div className="px-5 pb-3">
          <p className="text-[11px] text-[#86868b]">Drag any asset onto a calendar date to schedule it. Dropping on a date that already has a post will append the photo to that post.</p>
        </div>
      </div>

      {/* DragOverlay — shows the asset thumbnail while dragging */}
      <DragOverlay>
        {activeDragId ? (() => {
          const asset = libraryAssets.find(a => a.id === activeDragId);
          if (!asset) return null;
          return (
            <div className="w-16 h-16 rounded-xl overflow-hidden shadow-2xl ring-2 ring-[#0071e3] opacity-90">
              {asset.type?.startsWith('video/') ? (
                <div className="w-full h-full bg-black/20 flex items-center justify-center">
                  <Video className="w-6 h-6 text-white" />
                </div>
              ) : (
                <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
              )}
            </div>
          );
        })() : null}
      </DragOverlay>

      </DndContext>
      </div>

      {/* Add/Edit Content Modal */}
      {showAddModal && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-black/10 dark:border-white/10 shadow-2xl">
            <div className="sticky top-0 bg-white dark:bg-[#1d1d1f] px-6 py-4 border-b border-black/5 dark:border-white/10 flex justify-between items-center">
              <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">
                {editingContent ? 'Edit Content' : 'Create New Content'}
              </h2>
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setEditingContent(null);
                  setPostForm({
                    title: '',
                    description: '',
                    platform: 'instagram',
                    contentType: 'image',
                    scheduledDate: new Date(),
                    status: 'draft',
                    tags: '',
                    media: []
                  });
                  if (mediaFileInputRef.current) mediaFileInputRef.current.value = '';
                  setMediaDropActive(false);
                }}
                className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-[#86868b]" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">Title</label>
                  <input
                    value={postForm.title}
                    onChange={(e) => setPostForm({...postForm, title: e.target.value})}
                    placeholder="Enter content title"
                    required
                    className="w-full h-11 px-4 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">Platform</label>
                  <select
                    value={postForm.platform}
                    onChange={(e) => setPostForm({...postForm, platform: e.target.value})}
                    className="w-full h-11 px-4 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  >
                    {platforms.map(platform => (
                      <option key={platform.id} value={platform.id}>{platform.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">Description</label>
                  <button
                    type="button"
                    onClick={() => setShowAICaptionModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transition-all shadow-sm"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    AI Generate
                  </button>
                </div>
                <textarea
                  value={postForm.description}
                  onChange={(e) => setPostForm({...postForm, description: e.target.value})}
                  placeholder="Enter content description or use AI Generate"
                  rows={3}
                  className="w-full px-4 py-3 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">Content Type</label>
                  <select
                    value={postForm.contentType}
                    onChange={(e) => setPostForm({...postForm, contentType: e.target.value})}
                    className="w-full h-11 px-4 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  >
                    {contentTypes.map(type => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">Status</label>
                  <select
                    value={postForm.status}
                    onChange={(e) => setPostForm({...postForm, status: e.target.value})}
                    className="w-full h-11 px-4 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  >
                    {statuses.map(status => (
                      <option key={status.id} value={status.id}>{status.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">Scheduled Date</label>
                  <input
                    type="datetime-local"
                    value={format(postForm.scheduledDate, "yyyy-MM-dd'T'HH:mm")}
                    onChange={(e) => setPostForm({...postForm, scheduledDate: new Date(e.target.value)})}
                    className="w-full h-11 px-4 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">Tags (comma-separated)</label>
                  <input
                    value={postForm.tags}
                    onChange={(e) => setPostForm({...postForm, tags: e.target.value})}
                    placeholder="luxury, realestate, hometour"
                    className="w-full h-11 px-4 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">Photos / videos (up to {MAX_MEDIA_PER_POST})</label>
                <input
                  ref={mediaFileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleMediaFileChange}
                  className="hidden"
                />
                {(postForm.media?.length || 0) > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(postForm.media || []).map((m, i) => (
                      <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-black/10 dark:border-white/10 bg-black/5">
                        {m.type === 'video' ? (
                          <video src={m.url} className="w-full h-full object-cover" muted playsInline />
                        ) : (
                          <img src={m.url} alt="" className="w-full h-full object-cover" />
                        )}
                        <button
                          type="button"
                          onClick={() => removeMediaAt(i)}
                          className="absolute top-0.5 right-0.5 p-1 rounded bg-black/60 text-white hover:bg-black/80"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {(postForm.media?.length || 0) < MAX_MEDIA_PER_POST && (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setMediaDropActive(true); }}
                    onDragLeave={() => setMediaDropActive(false)}
                    onDrop={handleMediaDrop}
                    onClick={() => mediaFileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                      mediaDropActive ? 'border-[#0071e3] bg-[#0071e3]/10' : 'border-black/20 dark:border-white/20 hover:border-[#0071e3]/50 hover:bg-black/5 dark:hover:bg-white/5'
                    } ${uploadingMedia ? 'pointer-events-none opacity-70' : ''}`}
                  >
                    {uploadingMedia ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
                        <p className="text-[13px] text-[#86868b]">Uploading…</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 text-[#86868b] mx-auto mb-2" />
                        <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">Click or drag to add photos/videos</p>
                        <p className="text-[11px] text-[#86868b] mt-1">Up to {MAX_MEDIA_PER_POST} files</p>
                      </>
                    )}
                  </div>
                )}
              </div>

              {(postForm.media?.length > 0 || postForm.description) && (
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">Preview</label>
                  <div className="flex justify-center">
                    <PostPreviewCard
                      item={{
                        ...postForm,
                        tags: postForm.tags ? postForm.tags.split(',').map(t => t.trim()).filter(Boolean) : []
                      }}
                      variant={postForm.platform}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-black/5 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingContent(null);
                    if (mediaFileInputRef.current) mediaFileInputRef.current.value = '';
                    setMediaDropActive(false);
                  }}
                  className="px-5 py-2.5 text-[14px] font-medium rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2.5 text-[14px] font-medium rounded-xl bg-[#0071e3] text-white hover:bg-[#0077ed] transition-colors"
                >
                  {editingContent ? 'Update Content' : 'Create Content'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* AI Caption Generation Modal */}
      {showAICaptionModal && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl w-full max-w-lg border border-black/10 dark:border-white/10 shadow-2xl">
            {/* Modal Header */}
            <div className="border-b border-black/5 dark:border-white/10 px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">AI Caption Generator</h2>
                  <p className="text-[12px] text-[#86868b]">Generate captions for {platforms.find(p => p.id === postForm.platform)?.name || 'social media'}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAICaptionModal(false);
                  setAiCaptionPrompt('');
                  setGeneratedCaption(null);
                }}
                className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-[#86868b]" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {!generatedCaption ? (
                <>
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                      Describe your content
                    </label>
                    <textarea
                      value={aiCaptionPrompt}
                      onChange={(e) => setAiCaptionPrompt(e.target.value)}
                      placeholder="e.g., Luxury oceanfront villa in Malibu with infinity pool, 5 bedrooms, panoramic ocean views"
                      rows={4}
                      className="w-full px-4 py-3 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                      disabled={isGeneratingCaption}
                    />
                    <p className="text-[11px] text-[#86868b] mt-2">
                      Include details like property type, location, features, and any key selling points.
                    </p>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAICaptionModal(false);
                        setAiCaptionPrompt('');
                      }}
                      className="px-4 py-2 text-[14px] font-medium rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
                      disabled={isGeneratingCaption}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!aiCaptionPrompt.trim()) {
                          toast.error('Please describe your content first');
                          return;
                        }
                        setIsGeneratingCaption(true);
                        try {
                          const result = await openaiService.generateCaption(
                            aiCaptionPrompt,
                            postForm.platform,
                            'luxury'
                          );
                          setGeneratedCaption(result);
                          toast.success('Caption generated!');
                        } catch (error) {
                          console.error('Caption generation error:', error);
                          toast.error(error.message || 'Failed to generate caption');
                        } finally {
                          setIsGeneratingCaption(false);
                        }
                      }}
                      disabled={isGeneratingCaption || !aiCaptionPrompt.trim()}
                      className="px-5 py-2 text-[14px] font-medium rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isGeneratingCaption ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Generate Caption
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                      Generated Caption
                    </label>
                    <div className="w-full px-4 py-3 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                      {generatedCaption.caption}
                    </div>
                  </div>

                  {generatedCaption.hashtags && generatedCaption.hashtags.length > 0 && (
                    <div>
                      <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                        Suggested Hashtags
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {generatedCaption.hashtags.map((tag, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 text-[12px] rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setGeneratedCaption(null);
                      }}
                      className="px-4 py-2 text-[14px] font-medium rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15 transition-colors flex items-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Regenerate
                    </button>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          // Use caption only
                          setPostForm(prev => ({
                            ...prev,
                            description: generatedCaption.caption
                          }));
                          setShowAICaptionModal(false);
                          setAiCaptionPrompt('');
                          setGeneratedCaption(null);
                          toast.success('Caption added!');
                        }}
                        className="px-4 py-2 text-[14px] font-medium rounded-xl bg-[#0071e3] text-white hover:bg-[#0077ed] transition-colors"
                      >
                        Use Caption
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          // Use caption + hashtags in tags field
                          const hashtagsString = generatedCaption.hashtags?.join(', ') || '';
                          setPostForm(prev => ({
                            ...prev,
                            description: generatedCaption.caption,
                            tags: hashtagsString
                          }));
                          setShowAICaptionModal(false);
                          setAiCaptionPrompt('');
                          setGeneratedCaption(null);
                          toast.success('Caption and hashtags added!');
                        }}
                        className="px-4 py-2 text-[14px] font-medium rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transition-all"
                      >
                        Use Both
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Import from Google Sheets Modal */}
      {showImportModal && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-black/10 dark:border-white/10 shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white dark:bg-[#1d1d1f] border-b border-black/5 dark:border-white/10 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-[20px] font-semibold text-[#1d1d1f] dark:text-white">Import from Google Sheets</h2>
                <p className="text-[13px] text-[#86868b] mt-1">
                  Step {importStep} of 4
                </p>
              </div>
              <button 
                onClick={() => {
                  setShowImportModal(false);
                  resetImportState();
                }}
                className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-[#86868b]" />
              </button>
            </div>

            <div className="p-6">
              {/* Step 1: Authorization */}
              {importStep === 1 && (
                <div className="text-center space-y-6 py-8">
                  <div className="flex justify-center">
                    <div className="w-20 h-20 bg-[#34c759]/10 rounded-full flex items-center justify-center">
                      <FileSpreadsheet className="w-10 h-10 text-[#34c759]" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white mb-2">Connect Google Sheets</h3>
                    <p className="text-[14px] text-[#86868b] max-w-md mx-auto">
                      To import content from your Google Sheets, we need permission to access your sheets.
                    </p>
                  </div>
                  <div className="bg-[#0071e3]/10 rounded-xl p-4 max-w-md mx-auto">
                    <p className="text-[13px] text-[#0071e3]">
                      <strong>We only read data from sheets you select.</strong> Your data is never stored on our servers.
                    </p>
                  </div>
                  <button 
                    onClick={handleAuthorizeSheets}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0071e3] text-white text-[14px] font-medium hover:bg-[#0077ed] transition-colors"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Authorize Google Sheets
                  </button>
                </div>
              )}

              {/* Step 2: Enter Sheet URL */}
              {importStep === 2 && (
                <div className="space-y-6 py-4">
                  <div>
                    <h3 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white mb-2">Enter Sheet URL</h3>
                    <p className="text-[14px] text-[#86868b]">
                      Paste the URL or ID of your Google Sheet content calendar.
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">Google Sheets URL or ID</label>
                    <input
                      value={sheetUrl}
                      onChange={(e) => {
                        setSheetUrl(e.target.value);
                        setAvailableTabs([]);
                        setSelectedTabTitle('');
                      }}
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      className="w-full h-11 px-4 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    />
                  </div>

                  {availableTabs.length > 1 && (
                    <div>
                      <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">Import from tab (e.g. month)</label>
                      <select
                        value={selectedTabTitle}
                        onChange={(e) => setSelectedTabTitle(e.target.value)}
                        className="w-full h-11 px-4 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                      >
                        {availableTabs.map((tab) => (
                          <option key={tab.sheetId} value={tab.title}>
                            {tab.title}
                          </option>
                        ))}
                      </select>
                      <p className="text-[12px] text-[#86868b] mt-1">Select the tab you want to import (e.g. March 2026).</p>
                    </div>
                  )}

                  <div className="bg-black/[0.02] dark:bg-white/5 rounded-xl p-4">
                    <h4 className="text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-[#ff9500]" />
                      How to find your Sheet URL:
                    </h4>
                    <ol className="text-[13px] text-[#86868b] space-y-1 ml-6 list-decimal">
                      <li>Open your Google Sheet</li>
                      <li>Copy the URL from your browser's address bar</li>
                      <li>Paste it here</li>
                    </ol>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      onClick={() => setImportStep(1)}
                      className="px-5 py-2.5 text-[14px] font-medium rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
                    >
                      Back
                    </button>
                    <button 
                      onClick={handleFetchSheet}
                      disabled={!sheetUrl.trim()}
                      className="px-5 py-2.5 text-[14px] font-medium rounded-xl bg-[#0071e3] text-white hover:bg-[#0077ed] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {availableTabs.length > 1 ? `Fetch "${selectedTabTitle || availableTabs[0]?.title}"` : 'Fetch Sheet Data'}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Column Mapping */}
              {importStep === 3 && sheetData && (
                <div className="space-y-6 py-4">
                  <div>
                    <h3 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white mb-2">Review Column Mapping</h3>
                    <p className="text-[14px] text-[#86868b]">
                      ChatGPT has analyzed your sheet. Review mappings below, then optionally enrich rows with AI suggestions before importing.
                    </p>
                  </div>

                  <div className="bg-[#34c759]/10 rounded-xl p-4">
                    <p className="text-[13px] text-[#34c759] mb-2">
                      ✅ Found <strong>{sheetData.headers.length}</strong> columns and <strong>{sheetData.rows.length}</strong> rows
                    </p>
                    <p className="text-[12px] text-[#34c759]/80 mb-1">
                      💡 <strong>Tip:</strong> Post dates are optional. If you don't have dates, they'll be auto-generated starting from today.
                    </p>
                    <p className="text-[12px] text-[#34c759]/80">
                      🖼️ <strong>Images:</strong> Map photo columns to &quot;Image / Photo URL&quot;. If you map <strong>multiple</strong> columns to Image, each column becomes a <strong>separate post</strong> on the same day (one row = one day, one post per image column).
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
                                  <span 
                                    className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${
                                      confidence === 'high' ? 'bg-[#34c759]/10 text-[#34c759]' :
                                      confidence === 'medium' ? 'bg-[#ff9500]/10 text-[#ff9500]' :
                                      'bg-black/5 dark:bg-white/10 text-[#86868b]'
                                    }`}
                                  >
                                    {confidence} confidence
                                  </span>
                                )}
                              </div>
                              {sampleData.length > 0 && (
                                <p className="text-[11px] text-[#86868b] truncate">
                                  Sample: {sampleData.join(', ')}
                                </p>
                              )}
                              {suggestion && (
                                <p className="text-[11px] text-[#0071e3] mt-1">
                                  💡 {suggestion}
                                </p>
                              )}
                            </div>
                            <div className="w-48 flex-shrink-0">
                              <select
                                value={mapping || 'unmapped'}
                                onChange={(e) => handleMappingChange(index.toString(), e.target.value)}
                                className="w-full h-9 px-3 text-[13px] rounded-lg bg-white dark:bg-[#2d2d2d] border border-black/10 dark:border-white/10 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                              >
                                {availableFields.map(field => (
                                  <option key={field.value} value={field.value}>
                                    {field.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-black/5 dark:border-white/10">
                    <button
                      onClick={() => setImportStep(2)}
                      className="px-5 py-2.5 text-[14px] font-medium rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleEnrichWithChatGPT}
                      disabled={isEnriching}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-[14px] font-medium rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15 transition-colors disabled:opacity-60"
                    >
                      {isEnriching ? (
                        <>
                          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Analyzing…
                        </>
                      ) : (
                        <>Enrich with ChatGPT</>
                      )}
                    </button>
                    <button 
                      onClick={handleImportContent}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-[14px] font-medium rounded-xl bg-[#0071e3] text-white hover:bg-[#0077ed] transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      Import {sheetData.rows.length} Posts
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
                      {isImporting 
                        ? 'Please wait while we import your content...' 
                        : 'Your content has been successfully imported to your calendar.'
                      }
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
