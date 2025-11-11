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
  X, Edit, Trash2, Eye, CalendarDays, Folder, FolderPlus
} from 'lucide-react';
import { format, addDays, isToday, isPast, isFuture, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import XLogo from '../assets/Twitter-X-logo.png';
import XLogoSelected from '../assets/x-logo-selected.png';
import { PERMISSIONS } from '../entities/Permissions';
import { toast } from 'react-hot-toast';

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
    if (!currentUser?.email || contentItems.length === 0) return;

    const userStorageKey = `content_items_${currentUser.email}`;
    localStorage.setItem(userStorageKey, JSON.stringify(contentItems));
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

  const nextMonth = () => {
    setCurrentMonth(addDays(currentMonth, 32));
  };

  const prevMonth = () => {
    setCurrentMonth(addDays(currentMonth, -32));
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Content Calendar</h1>
          <p className="text-gray-600">Plan and schedule your social media content</p>
        </div>
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
                  return (
                    <button
                      key={cal.id}
                      onClick={() => setSelectedCalendarId(cal.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-md border text-left transition-colors ${
                        isActive ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <span className="truncate">{cal.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>{count}</span>
                    </button>
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
                        className={`text-xs p-1 rounded truncate ${getStatusColor(content.status)} text-white`}
                        title={content.title}
                      >
                        {content.title}
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
                <div key={content.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${getStatusColor(content.status)}`}>
                      <PlatformIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-medium">{content.title}</h3>
                      <p className="text-sm text-gray-600">{content.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {content.contentType}
                        </Badge>
                        <Badge className={`text-xs ${getStatusColor(content.status)}`}>
                          {content.status}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {format(new Date(content.scheduledDate), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
        </div>
      </div>
    </div>
  );
};

export default ContentCalendar;
