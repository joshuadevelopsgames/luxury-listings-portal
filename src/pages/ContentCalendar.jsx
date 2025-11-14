import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { 
  Calendar, Plus, Instagram, Facebook, Twitter, Linkedin, Youtube,
  Image, Video, FileText, Clock, Users, TrendingUp, Settings,
  ExternalLink, Filter, Download, RefreshCw, CheckCircle, AlertCircle, Pause, Play,
  X, Edit, Trash2, Eye, CalendarDays, Folder, FolderPlus, FileSpreadsheet, Upload,
  Check, MoreVertical, Link as LinkIcon
} from 'lucide-react';
import { format, addDays, isToday, isPast, isFuture, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import XLogo from '../assets/Twitter-X-logo.png';
import XLogoSelected from '../assets/x-logo-selected.png';
import { PERMISSIONS } from '../entities/Permissions';
import { toast } from 'react-hot-toast';
import { googleSheetsService } from '../services/googleSheetsService';
import { openaiService } from '../services/openaiService';

const ContentCalendar = () => {
  const { currentUser, hasPermission } = useAuth();
  
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
    { id: 'draft', name: 'Draft', color: 'bg-gray-500' },
    { id: 'scheduled', name: 'Scheduled', color: 'bg-blue-500' },
    { id: 'published', name: 'Published', color: 'bg-green-500' },
    { id: 'paused', name: 'Paused', color: 'bg-yellow-500' }
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
    setCurrentMonth(addDays(currentMonth, 32));
  };

  const prevMonth = () => {
    setCurrentMonth(addDays(currentMonth, -32));
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

  const handleDeleteCalendar = (calendarId, calendarName) => {
    // Prevent deleting default calendars
    if (calendarId === 'default' || calendarId === 'client-ll') {
      toast.error('Cannot delete default calendars');
      return;
    }

    // Show confirmation
    if (!window.confirm(`Delete "${calendarName}"?\n\nAll content in this calendar will also be deleted. This cannot be undone.`)) {
      return;
    }

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

  const handleRefreshCalendar = async (calendarId, calendarName, sheetUrl) => {
    if (!sheetUrl) {
      toast.error('No sheet URL found for this calendar');
      return;
    }

    setRefreshingCalendarId(calendarId);
    
    try {
      toast.loading('Refreshing from Google Sheets...', { id: 'refresh-cal' });
      
      // Fetch the sheet data
      const data = await googleSheetsService.fetchSheetData(sheetUrl);
      
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

      // Import new content
      const importedContent = [];
      let successCount = 0;
      let skipCount = 0;

      for (let i = 0; i < data.rows.length; i++) {
        const row = data.rows[i];
        try {
          const contentItem = {};
          
          // Map columns to fields based on AI mappings
          Object.keys(aiMappings).forEach(colIndex => {
            const field = aiMappings[colIndex];
            let value = row[parseInt(colIndex)];
            
            if (field !== 'unmapped' && value) {
              // If this is a mediaUrls or imageUrl field and we already have one, append it
              if ((field === 'mediaUrls' || field === 'imageUrl') && contentItem[field]) {
                contentItem[field] = `${contentItem[field]}, ${value}`;
              } else {
                contentItem[field] = value;
              }
            }
          });

          // Skip completely empty rows
          if (Object.keys(contentItem).length === 0) {
            skipCount++;
            continue;
          }

          // Parse and format the data
          const parsedDate = contentItem.postDate ? parseDate(contentItem.postDate) : addDays(new Date(), i);
          const normalizedPlatform = normalizePlatform(contentItem.platform) || 'instagram';
          const defaultContentType = (contentItem.mediaUrls && 
            (contentItem.mediaUrls.includes('video') || contentItem.mediaUrls.includes('.mp4'))) 
            ? 'video' : 'image';
          const normalizedContentType = normalizeContentType(contentItem.contentType) || defaultContentType;
          const normalizedStatus = normalizeStatus(contentItem.status) || 'draft';

          // Generate title
          let title = 'Imported Post';
          if (contentItem.caption) {
            title = contentItem.caption.substring(0, 50);
          } else if (contentItem.notes) {
            title = contentItem.notes.substring(0, 50);
          } else if (contentItem.assignedTo) {
            title = `Post for ${contentItem.assignedTo}`;
          }

          // Handle URLs and convert cloud storage links
          const convertToDirectUrl = (url) => {
            if (!url) return '';
            
            // Dropbox: Convert viewer URL to raw/direct URL
            if (url.includes('dropbox.com')) {
              // If it has preview parameter, extract the file and convert to raw
              if (url.includes('preview=')) {
                const match = url.match(/preview=([^&]+)/);
                if (match) {
                  const filename = decodeURIComponent(match[1]);
                  // For now, return the base URL with raw=1
                  return url.split('?')[0] + '?raw=1';
                }
              }
              // Otherwise just change dl=0 to raw=1
              return url.replace(/\?dl=0/g, '?raw=1').replace(/&dl=0/g, '&raw=1');
            }
            
            // Google Drive: Try to extract file ID and create direct link
            if (url.includes('drive.google.com')) {
              // If it's a file URL with /d/, extract ID
              const match = url.match(/\/d\/([^\/\?]+)/);
              if (match) {
                return `https://drive.google.com/uc?export=view&id=${match[1]}`;
              }
              // If it's a folder URL, we can't embed it directly
              if (url.includes('/folders/')) {
                console.warn('⚠️ Cannot embed Google Drive folder URL:', url);
                return ''; // Return empty for folder URLs
              }
            }
            
            return url;
          };
          
          // Get image URL from either imageUrl field or mediaUrls field
          let primaryImageUrl = '';
          let allMediaUrls = contentItem.mediaUrls || '';
          
          // If imageUrl field is explicitly set (from PHOTO LINK column)
          if (contentItem.imageUrl) {
            primaryImageUrl = convertToDirectUrl(contentItem.imageUrl);
            console.log('🖼️ Using imageUrl field:', { original: contentItem.imageUrl, converted: primaryImageUrl });
          }
          // Otherwise try to extract from mediaUrls
          else if (allMediaUrls) {
            const urls = allMediaUrls.split(',').map(u => u.trim());
            
            // Look for image URLs (but prefer explicit image columns)
            const imageUrl = urls.find(url => 
              url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ||
              (!url.includes('video') && !url.includes('.mp4') && 
               (url.includes('drive.google.com') || url.includes('dropbox.com') || 
                url.includes('imgur.com') || url.includes('cloudinary.com')))
            );
            
            if (imageUrl) {
              primaryImageUrl = convertToDirectUrl(imageUrl);
              console.log('🖼️ Extracted from mediaUrls:', { original: imageUrl, converted: primaryImageUrl });
            }
          }

          const newContent = {
            id: Date.now() + Math.random(),
            calendarId: calendarId,
            title: title,
            description: contentItem.caption || contentItem.notes || '',
            platform: normalizedPlatform,
            contentType: normalizedContentType,
            scheduledDate: parsedDate,
            status: normalizedStatus,
            tags: contentItem.hashtags ? contentItem.hashtags.split(/[,\s#]+/).filter(t => t) : [],
            imageUrl: primaryImageUrl,
            videoUrl: allMediaUrls,
            notes: contentItem.notes || '',
            assignedTo: contentItem.assignedTo || '',
            createdAt: new Date()
          };

          importedContent.push(newContent);
          successCount++;
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
      toast.loading('Fetching sheet data...', { id: 'fetch-sheet' });
      
      // Fetch the sheet data
      const data = await googleSheetsService.fetchSheetData(sheetUrl);
      
      if (!data.headers || data.headers.length === 0) {
        toast.error('Sheet appears to be empty', { id: 'fetch-sheet' });
        return;
      }

      setSheetData(data);
      
      console.log('📋 Sheet data received:', {
        spreadsheetTitle: data.spreadsheetTitle,
        headers: data.headers,
        rowCount: data.rows.length,
        sampleRow: data.rows[0]
      });
      
      // Get sample rows for AI analysis
      const sampleRows = googleSheetsService.getSampleRows(data.rows, 5);
      
      toast.loading('AI is analyzing columns...', { id: 'fetch-sheet' });
      
      // Use AI to suggest mappings
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
          sheetUrl: sheetUrl, // Store the sheet URL for refresh
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

      // Process each row
      for (let i = 0; i < sheetData.rows.length; i++) {
        const row = sheetData.rows[i];
        try {
          console.log(`\n📝 Processing row ${i + 1}:`, row);
          const contentItem = {};
          
          // Map columns to fields based on mappings
          Object.keys(columnMappings).forEach(colIndex => {
            const field = columnMappings[colIndex];
            let value = row[parseInt(colIndex)];
            
            if (field !== 'unmapped' && value) {
              // If this is a mediaUrls or imageUrl field and we already have one, append it
              if ((field === 'mediaUrls' || field === 'imageUrl') && contentItem[field]) {
                contentItem[field] = `${contentItem[field]}, ${value}`;
                console.log(`  ✓ Appended to ${field}: "${value}"`);
              } else {
                contentItem[field] = value;
                console.log(`  ✓ Mapped column ${colIndex} (${sheetData.headers[colIndex]}) → ${field}: "${value}"`);
              }
            }
          });

          console.log('  📋 Parsed content item:', contentItem);

          // Skip completely empty rows
          if (Object.keys(contentItem).length === 0) {
            console.warn('  ⚠️ Skipping empty row');
            skipCount++;
            continue;
          }

          // Parse and format the data
          // If no date provided, use current date + row number to spread them out
          const parsedDate = contentItem.postDate ? parseDate(contentItem.postDate) : addDays(new Date(), i);
          const normalizedPlatform = normalizePlatform(contentItem.platform) || 'instagram';
          // Default to 'video' if mediaUrls contains video-like content, otherwise 'image'
          const defaultContentType = (contentItem.mediaUrls && 
            (contentItem.mediaUrls.includes('video') || contentItem.mediaUrls.includes('.mp4'))) 
            ? 'video' : 'image';
          const normalizedContentType = normalizeContentType(contentItem.contentType) || defaultContentType;
          const normalizedStatus = normalizeStatus(contentItem.status) || 'draft';
          
          if (!contentItem.postDate) {
            console.log('  ℹ️ No date provided, using auto-generated date:', parsedDate);
          }
          
          console.log('  🔄 Normalized values:', {
            originalDate: contentItem.postDate,
            parsedDate,
            originalPlatform: contentItem.platform,
            normalizedPlatform,
            originalContentType: contentItem.contentType,
            normalizedContentType,
            originalStatus: contentItem.status,
            normalizedStatus
          });

          // Generate a meaningful title from available data
          let title = 'Imported Post';
          if (contentItem.caption) {
            title = contentItem.caption.substring(0, 50);
          } else if (contentItem.notes) {
            title = contentItem.notes.substring(0, 50);
          } else if (contentItem.assignedTo) {
            title = `Post for ${contentItem.assignedTo}`;
          }

          // Handle URLs and convert cloud storage links
          const convertToDirectUrl = (url) => {
            if (!url) return '';
            
            // Dropbox: Convert viewer URL to raw/direct URL
            if (url.includes('dropbox.com')) {
              // If it has preview parameter, extract the file and convert to raw
              if (url.includes('preview=')) {
                const match = url.match(/preview=([^&]+)/);
                if (match) {
                  const filename = decodeURIComponent(match[1]);
                  // For now, return the base URL with raw=1
                  return url.split('?')[0] + '?raw=1';
                }
              }
              // Otherwise just change dl=0 to raw=1
              return url.replace(/\?dl=0/g, '?raw=1').replace(/&dl=0/g, '&raw=1');
            }
            
            // Google Drive: Try to extract file ID and create direct link
            if (url.includes('drive.google.com')) {
              // If it's a file URL with /d/, extract ID
              const match = url.match(/\/d\/([^\/\?]+)/);
              if (match) {
                return `https://drive.google.com/uc?export=view&id=${match[1]}`;
              }
              // If it's a folder URL, we can't embed it directly
              if (url.includes('/folders/')) {
                console.warn('⚠️ Cannot embed Google Drive folder URL:', url);
                return ''; // Return empty for folder URLs
              }
            }
            
            return url;
          };
          
          // Get image URL from either imageUrl field or mediaUrls field
          let primaryImageUrl = '';
          let allMediaUrls = contentItem.mediaUrls || '';
          
          // If imageUrl field is explicitly set (from PHOTO LINK column)
          if (contentItem.imageUrl) {
            primaryImageUrl = convertToDirectUrl(contentItem.imageUrl);
            console.log('  🖼️ Using imageUrl field:', { original: contentItem.imageUrl, converted: primaryImageUrl });
          }
          // Otherwise try to extract from mediaUrls
          else if (allMediaUrls) {
            const urls = allMediaUrls.split(',').map(u => u.trim());
            
            // Look for image URLs (but prefer explicit image columns)
            const imageUrl = urls.find(url => 
              url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ||
              (!url.includes('video') && !url.includes('.mp4') && 
               (url.includes('drive.google.com') || url.includes('dropbox.com') || 
                url.includes('imgur.com') || url.includes('cloudinary.com')))
            );
            
            if (imageUrl) {
              primaryImageUrl = convertToDirectUrl(imageUrl);
              console.log('  🖼️ Extracted from mediaUrls:', { original: imageUrl, converted: primaryImageUrl });
            }
          }

          const newContent = {
            id: Date.now() + Math.random(),
            calendarId: newCalendarId, // Use the new calendar
            title: title,
            description: contentItem.caption || contentItem.notes || '',
            platform: normalizedPlatform,
            contentType: normalizedContentType,
            scheduledDate: parsedDate,
            status: normalizedStatus,
            tags: contentItem.hashtags ? contentItem.hashtags.split(/[,\s#]+/).filter(t => t) : [],
            imageUrl: primaryImageUrl,
            videoUrl: allMediaUrls,
            notes: contentItem.notes || '',
            assignedTo: contentItem.assignedTo || '',
            createdAt: new Date()
          };

          console.log('  ✅ Created content object:', newContent);
          importedContent.push(newContent);
          successCount++;
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
    setIsImporting(false);
  };

  const availableFields = [
    { value: 'postDate', label: 'Post Date (optional - auto-generated if missing)' },
    { value: 'platform', label: 'Platform' },
    { value: 'contentType', label: 'Content Type' },
    { value: 'caption', label: 'Caption/Description' },
    { value: 'status', label: 'Status' },
    { value: 'assignedTo', label: 'Assigned To' },
    { value: 'hashtags', label: 'Hashtags' },
    { value: 'mediaUrls', label: 'Media URLs' },
    { value: 'notes', label: 'Notes' },
    { value: 'unmapped', label: '(Skip this column)' }
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Content Calendar</h1>
          <p className="text-gray-600">Plan and schedule your social media content</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleStartImport}
            variant="outline"
            className="flex items-center gap-2"
            disabled={!canCreateContent}
            title={!canCreateContent ? 'You need CREATE_CONTENT permission' : 'Import from Google Sheets'}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Import from Sheets
          </Button>
          <Button 
            onClick={() => canCreateContent ? setShowAddModal(true) : toast.error('You need CREATE_CONTENT permission')} 
            className="flex items-center gap-2"
            disabled={!canCreateContent}
            title={!canCreateContent ? 'You need CREATE_CONTENT permission' : ''}
          >
            <Plus className="w-4 h-4" />
            Add Content
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
        {/* Left: Calendars panel */}
        <div className="md:sticky md:top-20 h-fit">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Folder className="w-4 h-4" /> Calendars
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
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
                      className={`px-3 py-2 rounded-md border transition-colors ${
                        isActive ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {isEditing ? (
                        // Edit name mode
                        <div className="flex items-center gap-2">
                          <Input
                            value={editingCalendarName}
                            onChange={(e) => setEditingCalendarName(e.target.value)}
                            className="flex-1 h-8 text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveCalendarName();
                              if (e.key === 'Escape') handleCancelEditCalendar();
                            }}
                          />
                          <button
                            onClick={handleSaveCalendarName}
                            className="p-1 hover:bg-green-100 rounded"
                            title="Save"
                          >
                            <Check className="w-4 h-4 text-green-600" />
                          </button>
                          <button
                            onClick={handleCancelEditCalendar}
                            className="p-1 hover:bg-red-100 rounded"
                            title="Cancel"
                          >
                            <X className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      ) : isLinking ? (
                        // Link sheet URL mode
                        <div className="space-y-2">
                          <Input
                            value={linkSheetUrl}
                            onChange={(e) => setLinkSheetUrl(e.target.value)}
                            className="w-full h-8 text-xs"
                            placeholder="Paste Google Sheets URL..."
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveLinkSheet();
                              if (e.key === 'Escape') handleCancelLinkSheet();
                            }}
                          />
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              onClick={handleSaveLinkSheet}
                              className="h-7 text-xs"
                            >
                              Link
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancelLinkSheet}
                              className="h-7 text-xs"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // View mode
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedCalendarId(cal.id)}
                            className="flex-1 flex items-center justify-between text-left min-w-0"
                          >
                            <span className={`truncate ${isActive ? 'text-blue-900 font-medium' : 'text-gray-900'}`}>
                              {cal.name}
                            </span>
                            <span className={`ml-2 text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                              isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
                            }`}>
                              {count}
                            </span>
                          </button>
                          
                          {!isDefault && (
                            <div className="flex gap-1 flex-shrink-0">
                              {cal.sheetUrl ? (
                                <button
                                  onClick={() => handleRefreshCalendar(cal.id, cal.name, cal.sheetUrl)}
                                  disabled={refreshingCalendarId === cal.id}
                                  className={`p-1 hover:bg-green-100 rounded ${
                                    refreshingCalendarId === cal.id ? 'animate-spin' : ''
                                  }`}
                                  title={`Refresh from Google Sheets${cal.lastImported ? '\nLast updated: ' + new Date(cal.lastImported).toLocaleString() : ''}`}
                                >
                                  <RefreshCw className="w-3 h-3 text-green-600" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleLinkSheet(cal.id)}
                                  className="p-1 hover:bg-purple-100 rounded"
                                  title="Link to Google Sheet for auto-refresh"
                                >
                                  <LinkIcon className="w-3 h-3 text-purple-600" />
                                </button>
                              )}
                              <button
                                onClick={() => handleEditCalendar(cal.id, cal.name)}
                                className="p-1 hover:bg-blue-100 rounded"
                                title="Rename calendar"
                              >
                                <Edit className="w-3 h-3 text-blue-600" />
                              </button>
                              <button
                                onClick={() => handleDeleteCalendar(cal.id, cal.name)}
                                className="p-1 hover:bg-red-100 rounded"
                                title="Delete calendar"
                              >
                                <Trash2 className="w-3 h-3 text-red-600" />
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
                  <Input
                    value={newCalendarName}
                    onChange={(e) => setNewCalendarName(e.target.value)}
                    placeholder="Client/Calendar name"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        const name = newCalendarName.trim();
                        if (!name) return;
                        const id = `cal-${Date.now()}`;
                        setCalendars(prev => [...prev, { id, name }]);
                        setSelectedCalendarId(id);
                        setNewCalendarName('');
                        setShowAddCalendar(false);
                      }}
                    >
                      Create
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setShowAddCalendar(false); setNewCalendarName(''); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" className="w-full flex items-center gap-2" onClick={() => setShowAddCalendar(true)}>
                  <FolderPlus className="w-4 h-4" /> New Calendar
                </Button>
              )}
              <p className="text-xs text-gray-500">Posts you create will be saved in the selected calendar.</p>
            </CardContent>
          </Card>
        </div>

        {/* Right: Main content */}
        <div className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-4" style={{ padding: '26px' }}>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Filters:</span>
                </div>
                
                {/* Platform Filters */}
                <div>
                  <span className="text-sm font-medium text-gray-700 mb-2 block">Platform:</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setFilterPlatform('all')}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        filterPlatform === 'all' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      All Platforms
                    </button>
                    {platforms.map(platform => (
                      <button
                        key={platform.id}
                        onClick={() => setFilterPlatform(platform.id)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                          filterPlatform === platform.id 
                            ? `${platform.color} text-white` 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <platform.icon className="w-4 h-4" isSelected={filterPlatform === platform.id} />
                        {platform.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status Filters */}
                <div>
                  <span className="text-sm font-medium text-gray-700 mb-2 block">Status:</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setFilterStatus('all')}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        filterStatus === 'all' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      All Status
                    </button>
                    {statuses.map(status => (
                      <button
                        key={status.id}
                        onClick={() => setFilterStatus(status.id)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                          filterStatus === status.id 
                            ? `${status.color} text-white` 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {status.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

      {/* Calendar View */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />
              {format(currentMonth, 'MMMM yyyy')}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={prevMonth}>
                ←
              </Button>
              <Button variant="outline" size="sm" onClick={nextMonth}>
                →
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {/* Day headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 bg-gray-50">
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
                  className={`min-h-[120px] p-2 border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
                    !isCurrentMonth ? 'bg-gray-100 text-gray-400' : ''
                  } ${isToday(date) ? 'bg-blue-50 border-blue-300' : ''}`}
                  onDoubleClick={() => isCurrentMonth && handleDateDoubleClick(date)}
                >
                  <div className="text-sm font-medium mb-1">
                    {format(date, 'd')}
                  </div>
                  <div className="space-y-1">
                    {dayContent.slice(0, 2).map(content => (
                      <div
                        key={content.id}
                        className={`text-xs p-1 rounded overflow-hidden ${getStatusColor(content.status)}`}
                        title={`${content.title}${content.imageUrl ? '\n📎 ' + content.imageUrl.substring(0, 50) : ''}`}
                      >
                        {content.imageUrl && (
                          <img 
                            src={content.imageUrl} 
                            alt={content.title}
                            className="w-full h-12 object-cover rounded mb-1"
                            onError={(e) => {
                              console.warn('❌ Failed to load image:', content.imageUrl);
                              e.target.style.display = 'none';
                            }}
                          />
                        )}
                        <div className="text-white truncate">{content.title}</div>
                      </div>
                    ))}
                    {dayContent.length > 2 && (
                      <div className="text-xs text-gray-500">
                        +{dayContent.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Content List */}
      <Card>
        <CardHeader>
          <CardTitle>Content Items ({filteredContent.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredContent.map(content => {
              const PlatformIcon = getPlatformIcon(content.platform);
              return (
                <div key={content.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Image Preview */}
                    {content.imageUrl && (
                      <div className="flex-shrink-0">
                        <img 
                          src={content.imageUrl} 
                          alt={content.title}
                          className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                          onError={(e) => e.target.style.display = 'none'}
                        />
                      </div>
                    )}
                    
                    {/* Platform Icon */}
                    <div className={`flex-shrink-0 p-2 rounded-lg ${getStatusColor(content.status)}`}>
                      <PlatformIcon className="w-5 h-5 text-white" />
                    </div>
                    
                    {/* Content Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{content.title}</h3>
                      <p className="text-sm text-gray-600 line-clamp-2">{content.description}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {content.contentType}
                        </Badge>
                        <Badge className={`text-xs ${getStatusColor(content.status)}`}>
                          {content.status}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {format(new Date(content.scheduledDate), 'MMM d, yyyy')}
                        </span>
                        {content.notes && (
                          <span className="text-xs text-gray-400 truncate">
                            📝 {content.notes}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(content)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(content.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Content Modal */}
      {showAddModal && (
        <div className="modal-overlay bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingContent ? 'Edit Content' : 'Create New Content'}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => {
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
              }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <Input
                    value={postForm.title}
                    onChange={(e) => setPostForm({...postForm, title: e.target.value})}
                    placeholder="Enter content title"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Platform</label>
                  <select
                    value={postForm.platform}
                    onChange={(e) => setPostForm({...postForm, platform: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    {platforms.map(platform => (
                      <option key={platform.id} value={platform.id}>{platform.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <Textarea
                  value={postForm.description}
                  onChange={(e) => setPostForm({...postForm, description: e.target.value})}
                  placeholder="Enter content description"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Content Type</label>
                  <select
                    value={postForm.contentType}
                    onChange={(e) => setPostForm({...postForm, contentType: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    {contentTypes.map(type => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    value={postForm.status}
                    onChange={(e) => setPostForm({...postForm, status: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    {statuses.map(status => (
                      <option key={status.id} value={status.id}>{status.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Scheduled Date</label>
                  <Input
                    type="datetime-local"
                    value={format(postForm.scheduledDate, "yyyy-MM-dd'T'HH:mm")}
                    onChange={(e) => setPostForm({...postForm, scheduledDate: new Date(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
                  <Input
                    value={postForm.tags}
                    onChange={(e) => setPostForm({...postForm, tags: e.target.value})}
                    placeholder="luxury, realestate, hometour"
                  />
                </div>
              </div>

              {postForm.contentType === 'image' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Image URL</label>
                  <Input
                    value={postForm.imageUrl}
                    onChange={(e) => setPostForm({...postForm, imageUrl: e.target.value})}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              )}

              {postForm.contentType === 'video' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Video URL</label>
                  <Input
                    value={postForm.videoUrl}
                    onChange={(e) => setPostForm({...postForm, videoUrl: e.target.value})}
                    placeholder="https://example.com/video.mp4"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingContent(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingContent ? 'Update Content' : 'Create Content'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import from Google Sheets Modal */}
      {showImportModal && (
        <div className="modal-overlay bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Import from Google Sheets</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Step {importStep} of 4
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => {
                setShowImportModal(false);
                resetImportState();
              }}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-6">
              {/* Step 1: Authorization */}
              {importStep === 1 && (
                <div className="text-center space-y-6 py-8">
                  <div className="flex justify-center">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                      <FileSpreadsheet className="w-10 h-10 text-green-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Connect Google Sheets</h3>
                    <p className="text-gray-600 max-w-md mx-auto">
                      To import content from your Google Sheets, we need permission to access your sheets.
                    </p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                    <p className="text-sm text-blue-900">
                      <strong>We only read data from sheets you select.</strong> Your data is never stored on our servers.
                    </p>
                  </div>
                  <Button 
                    onClick={handleAuthorizeSheets}
                    className="flex items-center gap-2 mx-auto"
                    size="lg"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Authorize Google Sheets
                  </Button>
                </div>
              )}

              {/* Step 2: Enter Sheet URL */}
              {importStep === 2 && (
                <div className="space-y-6 py-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Enter Sheet URL</h3>
                    <p className="text-gray-600">
                      Paste the URL or ID of your Google Sheet content calendar.
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Google Sheets URL or ID</label>
                    <Input
                      value={sheetUrl}
                      onChange={(e) => setSheetUrl(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      className="w-full"
                    />
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      How to find your Sheet URL:
                    </h4>
                    <ol className="text-sm text-gray-600 space-y-1 ml-6 list-decimal">
                      <li>Open your Google Sheet</li>
                      <li>Copy the URL from your browser's address bar</li>
                      <li>Paste it here</li>
                    </ol>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setImportStep(1)}
                    >
                      Back
                    </Button>
                    <Button 
                      onClick={handleFetchSheet}
                      disabled={!sheetUrl.trim()}
                    >
                      Fetch Sheet Data
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Column Mapping */}
              {importStep === 3 && sheetData && (
                <div className="space-y-6 py-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Review Column Mapping</h3>
                    <p className="text-gray-600">
                      AI has analyzed your sheet. Review and adjust the mappings below.
                    </p>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-900 mb-2">
                      ✅ Found <strong>{sheetData.headers.length}</strong> columns and <strong>{sheetData.rows.length}</strong> rows
                    </p>
                    <p className="text-xs text-green-800 mb-1">
                      💡 <strong>Tip:</strong> Post dates are optional. If you don't have dates, they'll be auto-generated starting from today.
                    </p>
                    <p className="text-xs text-green-800">
                      🖼️ <strong>Images:</strong> Columns with image URLs, Drive/Dropbox links, or thumbnails will show as previews in your calendar!
                    </p>
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {sheetData.headers.map((header, index) => {
                      const mapping = columnMappings[index.toString()];
                      const confidence = mappingConfidence[index.toString()];
                      const suggestion = mappingSuggestions[index.toString()];
                      const sampleData = sheetData.rows.slice(0, 2).map(row => row[index]).filter(v => v);

                      return (
                        <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                          <div className="flex items-start gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium text-gray-900 truncate">{header}</p>
                                {confidence && (
                                  <Badge 
                                    className={`text-xs ${
                                      confidence === 'high' ? 'bg-green-100 text-green-800' :
                                      confidence === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}
                                  >
                                    {confidence} confidence
                                  </Badge>
                                )}
                              </div>
                              {sampleData.length > 0 && (
                                <p className="text-xs text-gray-500 truncate">
                                  Sample: {sampleData.join(', ')}
                                </p>
                              )}
                              {suggestion && (
                                <p className="text-xs text-blue-600 mt-1">
                                  💡 {suggestion}
                                </p>
                              )}
                            </div>
                            <div className="w-48 flex-shrink-0">
                              <select
                                value={mapping || 'unmapped'}
                                onChange={(e) => handleMappingChange(index.toString(), e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
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

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => setImportStep(2)}
                    >
                      Back
                    </Button>
                    <Button 
                      onClick={handleImportContent}
                      className="flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Import {sheetData.rows.length} Posts
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 4: Importing */}
              {importStep === 4 && (
                <div className="text-center space-y-6 py-12">
                  <div className="flex justify-center">
                    {isImporting ? (
                      <div className="w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-10 h-10 text-green-600" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">
                      {isImporting ? 'Importing Content...' : 'Import Complete!'}
                    </h3>
                    <p className="text-gray-600">
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
        </div>
      )}
        </div>
      </div>
    </div>
  );
};

export default ContentCalendar;
