import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Calendar, Plus, Instagram, Facebook, Twitter, Linkedin, Youtube,
  Image, Video, FileText, Clock, Users, TrendingUp, Settings,
  ExternalLink, Filter, Download, RefreshCw, CheckCircle, AlertCircle, Pause, Play,
  X, Edit, Trash2, Eye, CalendarDays, Folder, FolderPlus, FileSpreadsheet, Upload,
  Check, MoreVertical, Link as LinkIcon, ChevronLeft, ChevronRight
} from 'lucide-react';
import { format, addDays, isToday, isPast, isFuture, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import XLogo from '../assets/Twitter-X-logo.png';
import XLogoSelected from '../assets/x-logo-selected.png';
import { PERMISSIONS } from '../entities/Permissions';
import { toast } from 'react-hot-toast';
import { useConfirm } from '../contexts/ConfirmContext';
import { googleSheetsService } from '../services/googleSheetsService';
import { openaiService } from '../services/openaiService';

const ContentCalendar = () => {
  const { currentUser, hasPermission } = useAuth();
  const { confirm } = useConfirm();
  
  // Check permissions
  const canCreateContent = hasPermission(PERMISSIONS.CREATE_CONTENT);
  const canDeleteContent = hasPermission(PERMISSIONS.DELETE_CONTENT);
  const canApproveContent = hasPermission(PERMISSIONS.APPROVE_CONTENT);
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

  // Load user-specific content and calendars from localStorage
  useEffect(() => {
    if (!currentUser?.email) return;

    // Clear previous user's data first
    setContentItems([]);
    setCalendars([]);
    setEditingContent(null);
    setSelectedCalendarId('default');

    const userStorageKey = `content_items_${currentUser.email}`;
    const calendarsStorageKey = `calendars_${currentUser.email}`;
    
    console.log('📅 Loading calendar data for:', currentUser.email);
    
    // Load content items
    const stored = localStorage.getItem(userStorageKey);
    if (stored) {
      const parsedItems = JSON.parse(stored);
      // Convert date strings back to Date objects
      const itemsWithDates = parsedItems.map(item => ({
        ...item,
        scheduledDate: new Date(item.scheduledDate)
      }));
      setContentItems(itemsWithDates);
      console.log('✅ Loaded', itemsWithDates.length, 'content items');
    } else {
      console.log('ℹ️ No content items found for this user');
    }

    // Load calendars
    const storedCalendars = localStorage.getItem(calendarsStorageKey);
    if (storedCalendars) {
      setCalendars(JSON.parse(storedCalendars));
      console.log('✅ Loaded calendars');
    } else {
      // Set default calendars for new users
      const defaultCalendars = [
        { id: 'default', name: 'My Calendar' },
        { id: 'client-ll', name: 'Luxury Listings' }
      ];
      setCalendars(defaultCalendars);
      localStorage.setItem(calendarsStorageKey, JSON.stringify(defaultCalendars));
      console.log('ℹ️ Created default calendars for new user');
    }
  }, [currentUser?.email]);

  // Save content items to localStorage whenever they change
  useEffect(() => {
    if (!currentUser?.email) return;

    const userStorageKey = `content_items_${currentUser.email}`;
    localStorage.setItem(userStorageKey, JSON.stringify(contentItems));
    console.log('💾 Saved', contentItems.length, 'content items to localStorage');
  }, [contentItems, currentUser?.email]);

  // Save calendars to localStorage whenever they change
  useEffect(() => {
    if (!currentUser?.email || calendars.length === 0) return;

    const calendarsStorageKey = `calendars_${currentUser.email}`;
    localStorage.setItem(calendarsStorageKey, JSON.stringify(calendars));
  }, [calendars, currentUser?.email]);

  const [postForm, setPostForm] = useState({
    title: '',
    description: '',
    platform: 'instagram',
    contentType: 'image',
    scheduledDate: new Date(),
    status: 'draft',
    tags: '',
    imageUrl: '',
    videoUrl: ''
  });

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

  const handleDateDoubleClick = (date) => {
    setSelectedDate(date);
    setPostForm({
      ...postForm,
      scheduledDate: date
    });
    setShowAddModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newContent = {
      id: editingContent ? editingContent.id : Date.now(),
      calendarId: editingContent?.calendarId ?? selectedCalendarId,
      ...postForm,
      tags: postForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
      createdAt: editingContent?.createdAt ?? new Date()
    };

    if (editingContent) {
      setContentItems(prev => prev.map(item => 
        item.id === editingContent.id ? newContent : item
      ));
      setEditingContent(null);
    } else {
      setContentItems(prev => [...prev, newContent]);
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
      imageUrl: '',
      videoUrl: ''
    });
  };

  const handleEdit = (content) => {
    if (!canCreateContent) {
      toast.error('You need CREATE_CONTENT permission to edit content');
      return;
    }
    setEditingContent(content);
    setPostForm({
      title: content.title,
      description: content.description,
      platform: content.platform,
      contentType: content.contentType,
      scheduledDate: content.scheduledDate,
      status: content.status,
      tags: content.tags.join(', '),
      imageUrl: content.imageUrl || '',
      videoUrl: content.videoUrl || ''
    });
    setShowAddModal(true);
  };

  const handleDelete = (contentId) => {
    if (!canDeleteContent) {
      toast.error('You need DELETE_CONTENT permission to delete content');
      return;
    }
    setContentItems(prev => prev.filter(item => item.id !== contentId));
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

  // ========== CALENDAR MANAGEMENT ==========

  const handleEditCalendar = (calendarId, currentName) => {
    setEditingCalendarId(calendarId);
    setEditingCalendarName(currentName);
  };

  const handleSaveCalendarName = () => {
    if (!editingCalendarName.trim()) {
      toast.error('Calendar name cannot be empty');
      return;
    }

    setCalendars(prev => {
      const updated = prev.map(cal => 
        cal.id === editingCalendarId 
          ? { ...cal, name: editingCalendarName.trim() }
          : cal
      );
      
      // Save to localStorage
      if (currentUser?.email) {
        const calendarsStorageKey = `calendars_${currentUser.email}`;
        localStorage.setItem(calendarsStorageKey, JSON.stringify(updated));
      }
      
      return updated;
    });

    toast.success('Calendar renamed!');
    setEditingCalendarId(null);
    setEditingCalendarName('');
  };

  const handleCancelEditCalendar = () => {
    setEditingCalendarId(null);
    setEditingCalendarName('');
  };

  const handleDeleteCalendar = async (calendarId, calendarName) => {
    // Prevent deleting default calendars
    if (calendarId === 'default' || calendarId === 'client-ll') {
      toast.error('Cannot delete default calendars');
      return;
    }

    // Show confirmation
    const confirmed = await confirm({
      title: 'Delete Calendar',
      message: `Delete "${calendarName}"? All content in this calendar will also be deleted. This cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger'
    });
    if (!confirmed) return;

    // Delete calendar
    setCalendars(prev => {
      const updated = prev.filter(cal => cal.id !== calendarId);
      
      // Save to localStorage
      if (currentUser?.email) {
        const calendarsStorageKey = `calendars_${currentUser.email}`;
        localStorage.setItem(calendarsStorageKey, JSON.stringify(updated));
      }
      
      return updated;
    });

    // Delete all content items in this calendar
    setContentItems(prev => {
      const updated = prev.filter(item => item.calendarId !== calendarId);
      
      // Save to localStorage
      if (currentUser?.email) {
        const userStorageKey = `content_items_${currentUser.email}`;
        localStorage.setItem(userStorageKey, JSON.stringify(updated));
      }
      
      return updated;
    });

    // Switch to default calendar if we deleted the selected one
    if (selectedCalendarId === calendarId) {
      setSelectedCalendarId('default');
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

    setCalendars(prev => {
      const updated = prev.map(cal => 
        cal.id === linkingCalendarId 
          ? { ...cal, sheetUrl: linkSheetUrl.trim(), lastImported: new Date().toISOString() }
          : cal
      );
      
      // Save to localStorage
      if (currentUser?.email) {
        const calendarsStorageKey = `calendars_${currentUser.email}`;
        localStorage.setItem(calendarsStorageKey, JSON.stringify(updated));
      }
      
      return updated;
    });

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
        if (url.includes('dropbox.com')) {
          if (url.includes('preview=')) return url.split('?')[0] + '?raw=1';
          return url.replace(/\?dl=0/g, '?raw=1').replace(/&dl=0/g, '&raw=1');
        }
        if (url.includes('drive.google.com')) {
          const match = url.match(/\/d\/([^\/\?]+)/);
          if (match) return `https://drive.google.com/uc?export=view&id=${match[1]}`;
          if (url.includes('/folders/')) return '';
        }
        return url;
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
              imageUrl: primaryImageUrl,
              videoUrl: mediaUrlsForPost,
              notes: contentItem.notes || '',
              assignedTo: contentItem.assignedTo || '',
              createdAt: new Date()
            };
          };

          if (multiPostPerRow) {
            for (const colIdx of imageUrlColIndices) {
              const cellVal = row[colIdx];
              if (!cellVal || String(cellVal).trim() === '') continue;
              const primaryImageUrl = convertToDirectUrl(String(cellVal).trim());
              importedContent.push(buildOnePost(primaryImageUrl, ''));
              successCount++;
            }
            if (imageUrlColIndices.every((colIdx) => !row[colIdx] || String(row[colIdx]).trim() === '')) skipCount++;
          } else {
            if (Object.keys(contentItem).length === 0) { skipCount++; continue; }
            let primaryImageUrl = '';
            if (contentItem.imageUrl) primaryImageUrl = convertToDirectUrl(contentItem.imageUrl);
            else if (allMediaUrls) {
              const urls = allMediaUrls.split(',').map(u => u.trim());
              const imageUrl = urls.find(url =>
                url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ||
                (!url.includes('video') && !url.includes('.mp4') && (url.includes('drive.google.com') || url.includes('dropbox.com') || url.includes('imgur.com') || url.includes('cloudinary.com')))
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

      // Add imported content
      setContentItems(prev => {
        const updated = [...prev, ...importedContent];
        if (currentUser?.email) {
          const userStorageKey = `content_items_${currentUser.email}`;
          localStorage.setItem(userStorageKey, JSON.stringify(updated));
        }
        return updated;
      });

      // Update calendar last imported time
      setCalendars(prev => {
        const updated = prev.map(cal => 
          cal.id === calendarId 
            ? { ...cal, lastImported: new Date().toISOString() }
            : cal
        );
        if (currentUser?.email) {
          const calendarsStorageKey = `calendars_${currentUser.email}`;
          localStorage.setItem(calendarsStorageKey, JSON.stringify(updated));
        }
        return updated;
      });

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
      // Create a new calendar based on the sheet title
      const newCalendarId = `cal-${Date.now()}`;
      const newCalendarName = sheetData.spreadsheetTitle || 'Imported Calendar';
      
      console.log('📅 Creating new calendar:', newCalendarName);
      
      // Add the new calendar with sheet URL for refresh
      setCalendars(prev => {
        const updated = [...prev, { 
          id: newCalendarId, 
          name: newCalendarName,
          sheetUrl: sheetUrl,
          sheetTitle: sheetData.sheetTitle, // tab (e.g. month) for refresh
          lastImported: new Date().toISOString()
        }];
        // Save to localStorage immediately
        if (currentUser?.email) {
          const calendarsStorageKey = `calendars_${currentUser.email}`;
          localStorage.setItem(calendarsStorageKey, JSON.stringify(updated));
        }
        return updated;
      });

      const importedContent = [];
      let successCount = 0;
      let skipCount = 0;

      const convertToDirectUrl = (url) => {
        if (!url) return '';
        if (url.includes('dropbox.com')) {
          if (url.includes('preview=')) return url.split('?')[0] + '?raw=1';
          return url.replace(/\?dl=0/g, '?raw=1').replace(/&dl=0/g, '&raw=1');
        }
        if (url.includes('drive.google.com')) {
          const match = url.match(/\/d\/([^\/\?]+)/);
          if (match) return `https://drive.google.com/uc?export=view&id=${match[1]}`;
          if (url.includes('/folders/')) return '';
        }
        return url;
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
              imageUrl: primaryImageUrl,
              videoUrl: mediaUrlsForPost,
              notes: contentItem.notes || '',
              assignedTo: contentItem.assignedTo || '',
              createdAt: new Date()
            };
          };

          if (multiPostPerRow) {
            for (const colIdx of imageUrlColIndices) {
              const cellVal = row[colIdx];
              if (!cellVal || String(cellVal).trim() === '') continue;
              const primaryImageUrl = convertToDirectUrl(String(cellVal).trim());
              importedContent.push(buildOnePost(primaryImageUrl, ''));
              successCount++;
            }
            if (imageUrlColIndices.every((colIdx) => !row[colIdx] || String(row[colIdx]).trim() === '')) skipCount++;
          } else {
            if (Object.keys(contentItem).length === 0) { skipCount++; continue; }
            let primaryImageUrl = '';
            if (contentItem.imageUrl) primaryImageUrl = convertToDirectUrl(contentItem.imageUrl);
            else if (allMediaUrls) {
              const urls = allMediaUrls.split(',').map(u => u.trim());
              const imageUrl = urls.find(url =>
                url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ||
                (!url.includes('video') && !url.includes('.mp4') && (url.includes('drive.google.com') || url.includes('dropbox.com') || url.includes('imgur.com') || url.includes('cloudinary.com')))
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

      // Add imported content to the calendar
      setContentItems(prev => {
        console.log('  📋 Previous content items:', prev.length);
        const updated = [...prev, ...importedContent];
        console.log('  📋 Updated content items:', updated.length);
        
        // Save to localStorage immediately
        if (currentUser?.email) {
          const userStorageKey = `content_items_${currentUser.email}`;
          localStorage.setItem(userStorageKey, JSON.stringify(updated));
          console.log('  💾 Saved to localStorage:', userStorageKey);
          
          // Verify it was saved
          const verification = localStorage.getItem(userStorageKey);
          const parsed = JSON.parse(verification);
          console.log('  ✅ Verification - items in localStorage:', parsed.length);
        }
        return updated;
      });

      // Switch to the new calendar
      console.log('📅 Switching to new calendar:', newCalendarId);
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
    if (!value) {
      console.log('    ⚠️ No date value provided, using current date');
      return new Date();
    }
    
    console.log('    🗓️ Parsing date:', value);
    
    try {
      // Handle "Monday, October 20" format (add current year)
      const dayMonthPattern = /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(\w+)\s+(\d+)$/i;
      const match = value.match(dayMonthPattern);
      if (match) {
        const [, , month, day] = match;
        const currentYear = new Date().getFullYear();
        const dateString = `${month} ${day}, ${currentYear}`;
        const parsed = new Date(dateString);
        if (!isNaN(parsed.getTime())) {
          console.log('    ✅ Parsed day-month format with current year:', parsed);
          return parsed;
        }
      }
      
      // Try direct parsing
      let date = new Date(value);
      if (!isNaN(date.getTime())) {
        console.log('    ✅ Parsed directly:', date);
        return date;
      }
      
      // Try replacing slashes with dashes
      const withDashes = value.replace(/\//g, '-');
      date = new Date(withDashes);
      if (!isNaN(date.getTime())) {
        console.log('    ✅ Parsed with dashes:', date);
        return date;
      }
      
      // Try adding current year to common formats
      const currentYear = new Date().getFullYear();
      date = new Date(`${value}, ${currentYear}`);
      if (!isNaN(date.getTime())) {
        console.log('    ✅ Parsed with added year:', date);
        return date;
      }
      
      // Fallback to current date
      console.warn('    ⚠️ Could not parse date, using current date. Original value:', value);
      return new Date();
    } catch (error) {
      console.error('    ❌ Error parsing date:', error);
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

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Left: Calendars panel */}
        <div className="lg:sticky lg:top-20 h-fit">
          <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-black/5 dark:border-white/10">
              <h3 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white flex items-center gap-2">
                <Folder className="w-4 h-4 text-[#0071e3]" /> Calendars
              </h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="space-y-2">
                {calendars.map((cal) => {
                  const count = contentItems.filter(ci => ci.calendarId === cal.id).length;
                  const isActive = cal.id === selectedCalendarId;
                  const isEditing = editingCalendarId === cal.id;
                  const isLinking = linkingCalendarId === cal.id;
                  const isDefault = cal.id === 'default' || cal.id === 'client-ll';
                  
                  return (
                    <div
                      key={cal.id}
                      className={`px-3 py-2.5 rounded-xl border transition-all ${
                        isActive ? 'border-[#0071e3] bg-[#0071e3]/10 dark:bg-[#0071e3]/20' : 'border-black/5 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      {isEditing ? (
                        // Edit name mode
                        <div className="flex items-center gap-2">
                          <input
                            value={editingCalendarName}
                            onChange={(e) => setEditingCalendarName(e.target.value)}
                            className="flex-1 h-8 px-3 text-[13px] rounded-lg bg-white dark:bg-[#2d2d2d] border border-black/10 dark:border-white/10 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveCalendarName();
                              if (e.key === 'Escape') handleCancelEditCalendar();
                            }}
                          />
                          <button
                            onClick={handleSaveCalendarName}
                            className="p-1.5 hover:bg-[#34c759]/20 rounded-lg transition-colors"
                            title="Save"
                          >
                            <Check className="w-4 h-4 text-[#34c759]" />
                          </button>
                          <button
                            onClick={handleCancelEditCalendar}
                            className="p-1.5 hover:bg-[#ff3b30]/20 rounded-lg transition-colors"
                            title="Cancel"
                          >
                            <X className="w-4 h-4 text-[#ff3b30]" />
                          </button>
                        </div>
                      ) : isLinking ? (
                        // Link sheet URL mode
                        <div className="space-y-2">
                          <input
                            value={linkSheetUrl}
                            onChange={(e) => setLinkSheetUrl(e.target.value)}
                            className="w-full h-8 px-3 text-[12px] rounded-lg bg-white dark:bg-[#2d2d2d] border border-black/10 dark:border-white/10 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                            placeholder="Paste Google Sheets URL..."
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveLinkSheet();
                              if (e.key === 'Escape') handleCancelLinkSheet();
                            }}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleSaveLinkSheet}
                              className="px-3 py-1.5 text-[12px] font-medium rounded-lg bg-[#0071e3] text-white hover:bg-[#0077ed] transition-colors"
                            >
                              Link
                            </button>
                            <button
                              onClick={handleCancelLinkSheet}
                              className="px-3 py-1.5 text-[12px] font-medium rounded-lg bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        // View mode
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedCalendarId(cal.id)}
                            className="flex-1 flex items-center justify-between text-left min-w-0"
                          >
                            <span className={`truncate text-[13px] ${isActive ? 'text-[#0071e3] dark:text-white font-medium' : 'text-[#1d1d1f] dark:text-white'}`}>
                              {cal.name}
                            </span>
                            <span className={`ml-2 text-[11px] px-2 py-0.5 rounded-full flex-shrink-0 font-medium ${
                              isActive ? 'bg-[#0071e3] text-white' : 'bg-black/5 dark:bg-white/10 text-[#86868b]'
                            }`}>
                              {count}
                            </span>
                          </button>
                          
                          {!isDefault && (
                            <div className="flex gap-1 flex-shrink-0">
                              {cal.sheetUrl ? (
                                <button
                                  onClick={() => handleRefreshCalendar(cal.id, cal.name, cal.sheetUrl, cal.sheetTitle)}
                                  disabled={refreshingCalendarId === cal.id}
                                  className={`p-1.5 hover:bg-[#34c759]/20 rounded-lg transition-colors ${
                                    refreshingCalendarId === cal.id ? 'animate-spin' : ''
                                  }`}
                                  title={`Refresh from Google Sheets${cal.lastImported ? '\nLast updated: ' + new Date(cal.lastImported).toLocaleString() : ''}`}
                                >
                                  <RefreshCw className="w-3.5 h-3.5 text-[#34c759]" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleLinkSheet(cal.id)}
                                  className="p-1.5 hover:bg-[#af52de]/20 rounded-lg transition-colors"
                                  title="Link to Google Sheet for auto-refresh"
                                >
                                  <LinkIcon className="w-3.5 h-3.5 text-[#af52de]" />
                                </button>
                              )}
                              <button
                                onClick={() => handleEditCalendar(cal.id, cal.name)}
                                className="p-1.5 hover:bg-[#0071e3]/20 rounded-lg transition-colors"
                                title="Rename calendar"
                              >
                                <Edit className="w-3.5 h-3.5 text-[#0071e3]" />
                              </button>
                              <button
                                onClick={() => handleDeleteCalendar(cal.id, cal.name)}
                                className="p-1.5 hover:bg-[#ff3b30]/20 rounded-lg transition-colors"
                                title="Delete calendar"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-[#ff3b30]" />
                              </button>
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
                  <input
                    value={newCalendarName}
                    onChange={(e) => setNewCalendarName(e.target.value)}
                    placeholder="Client/Calendar name"
                    className="w-full h-10 px-3 text-[14px] rounded-xl bg-white dark:bg-[#2d2d2d] border border-black/10 dark:border-white/10 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const name = newCalendarName.trim();
                        if (!name) return;
                        const id = `cal-${Date.now()}`;
                        setCalendars(prev => [...prev, { id, name }]);
                        setSelectedCalendarId(id);
                        setNewCalendarName('');
                        setShowAddCalendar(false);
                      }}
                      className="px-4 py-2 text-[13px] font-medium rounded-xl bg-[#0071e3] text-white hover:bg-[#0077ed] transition-colors"
                    >
                      Create
                    </button>
                    <button 
                      onClick={() => { setShowAddCalendar(false); setNewCalendarName(''); }}
                      className="px-4 py-2 text-[13px] font-medium rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setShowAddCalendar(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[13px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
                >
                  <FolderPlus className="w-4 h-4" /> New Calendar
                </button>
              )}
              <p className="text-[11px] text-[#86868b]">Posts you create will be saved in the selected calendar.</p>
            </div>
          </div>
        </div>

        {/* Right: Main content */}
        <div className="space-y-6">
          {/* Filters */}
          <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 p-5">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#86868b]" />
                <span className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">Filters</span>
              </div>
              
              {/* Platform Filters */}
              <div>
                <span className="text-[12px] font-medium text-[#86868b] mb-2 block">Platform</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setFilterPlatform('all')}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all ${
                      filterPlatform === 'all' 
                        ? 'bg-[#0071e3] text-white' 
                        : 'bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15'
                    }`}
                  >
                    All Platforms
                  </button>
                  {platforms.map(platform => (
                    <button
                      key={platform.id}
                      onClick={() => setFilterPlatform(platform.id)}
                      className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all flex items-center gap-1.5 ${
                        filterPlatform === platform.id 
                          ? `${platform.color} text-white` 
                          : 'bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15'
                      }`}
                    >
                      <platform.icon className="w-3.5 h-3.5" isSelected={filterPlatform === platform.id} />
                      {platform.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Filters */}
              <div>
                <span className="text-[12px] font-medium text-[#86868b] mb-2 block">Status</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setFilterStatus('all')}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all ${
                      filterStatus === 'all' 
                        ? 'bg-[#0071e3] text-white' 
                        : 'bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15'
                    }`}
                  >
                    All Status
                  </button>
                  {statuses.map(status => (
                    <button
                      key={status.id}
                      onClick={() => setFilterStatus(status.id)}
                      className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all ${
                        filterStatus === status.id 
                          ? `${status.color} text-white` 
                          : 'bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15'
                      }`}
                    >
                      {status.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

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
            
            {/* Calendar days */}
            {getCalendarDays().map((date, index) => {
              const dayContent = getContentForDate(date);
              const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
              
              return (
                <div
                  key={index}
                  className={`min-h-[100px] p-2 rounded-lg border cursor-pointer transition-all ${
                    !isCurrentMonth 
                      ? 'bg-black/[0.02] dark:bg-white/5 text-[#86868b] border-transparent' 
                      : 'border-black/5 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-[#1d1d1f] dark:text-white'
                  } ${isToday(date) ? 'bg-[#0071e3]/10 dark:bg-[#0071e3]/20 border-[#0071e3]/30' : ''}`}
                  onDoubleClick={() => isCurrentMonth && handleDateDoubleClick(date)}
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
                              {content.imageUrl ? (
                                <img
                                  src={content.imageUrl}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling?.classList.remove('hidden'); }}
                                />
                              ) : null}
                              <div className={`w-full h-full flex items-center justify-center text-[10px] font-medium text-[#86868b] ${content.imageUrl ? 'hidden' : ''}`}>
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
                            title={`${content.title}${content.imageUrl ? '\n📎 ' + content.imageUrl.substring(0, 50) : ''}`}
                          >
                            {content.imageUrl ? (
                              <img
                                src={content.imageUrl}
                                alt={content.title}
                                className="w-full h-10 object-cover rounded mb-1"
                                onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling?.classList.remove('hidden'); }}
                              />
                            ) : null}
                            <div className={`w-full h-10 rounded mb-1 flex items-center justify-center bg-black/10 dark:bg-white/10 ${content.imageUrl ? 'hidden' : ''}`}>
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
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content List */}
      <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 overflow-hidden">
        <div className="px-5 py-4 border-b border-black/5 dark:border-white/10">
          <h3 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white">
            Content Items ({filteredContent.length})
          </h3>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            {filteredContent.length === 0 ? (
              <div className="text-center py-12">
                <CalendarDays className="w-12 h-12 text-[#86868b] mx-auto mb-3" />
                <p className="text-[15px] text-[#86868b]">No content items yet</p>
                <p className="text-[13px] text-[#86868b] mt-1">Double-click a date to add content</p>
              </div>
            ) : (
              filteredContent.map(content => {
                const PlatformIcon = getPlatformIcon(content.platform);
                return (
                  <div key={content.id} className="flex items-center justify-between p-4 rounded-xl border border-black/5 dark:border-white/10 hover:bg-black/[0.02] dark:hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {/* Image Preview */}
                      {content.imageUrl && (
                        <div className="flex-shrink-0">
                          <img 
                            src={content.imageUrl} 
                            alt={content.title}
                            className="w-20 h-20 object-cover rounded-xl border border-black/5 dark:border-white/10"
                            onError={(e) => e.target.style.display = 'none'}
                          />
                        </div>
                      )}
                      
                      {/* Platform Icon */}
                      <div className={`flex-shrink-0 p-2.5 rounded-xl ${getStatusColor(content.status)}`}>
                        <PlatformIcon className="w-5 h-5 text-white" />
                      </div>
                      
                      {/* Content Details */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[14px] font-medium text-[#1d1d1f] dark:text-white truncate">{content.title}</h3>
                        <p className="text-[12px] text-[#86868b] line-clamp-2 mt-0.5">{content.description}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white font-medium">
                            {content.contentType}
                          </span>
                          <span className={`text-[11px] px-2 py-0.5 rounded-md text-white font-medium ${getStatusColor(content.status)}`}>
                            {content.status}
                          </span>
                          <span className="text-[11px] text-[#86868b]">
                            {format(new Date(content.scheduledDate), 'MMM d, yyyy')}
                          </span>
                          {content.notes && (
                            <span className="text-[11px] text-[#86868b] truncate">
                              📝 {content.notes}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                      <button 
                        onClick={() => handleEdit(content)}
                        className="p-2 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
                      >
                        <Edit className="w-4 h-4 text-[#1d1d1f] dark:text-white" />
                      </button>
                      <button 
                        onClick={() => handleDelete(content.id)}
                        className="p-2 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-[#ff3b30]/20 transition-colors"
                      >
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
                    imageUrl: '',
                    videoUrl: ''
                  });
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

              {postForm.contentType === 'image' && (
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">Image URL</label>
                  <input
                    value={postForm.imageUrl}
                    onChange={(e) => setPostForm({...postForm, imageUrl: e.target.value})}
                    placeholder="https://example.com/image.jpg"
                    className="w-full h-11 px-4 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                </div>
              )}

              {postForm.contentType === 'video' && (
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">Video URL</label>
                  <input
                    value={postForm.videoUrl}
                    onChange={(e) => setPostForm({...postForm, videoUrl: e.target.value})}
                    placeholder="https://example.com/video.mp4"
                    className="w-full h-11 px-4 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-black/5 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingContent(null);
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
      </div>
    </div>
  );
};

export default ContentCalendar;
