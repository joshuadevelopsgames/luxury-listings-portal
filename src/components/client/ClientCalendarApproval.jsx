import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Clock,
  Image,
  Video,
  FileText,
  Instagram,
  Facebook,
  Twitter
} from 'lucide-react';
import { format, isSameDay, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { firestoreService } from '../../services/firestoreService';

const ClientCalendarApproval = ({ clientId, clientEmail }) => {
  const [contentItems, setContentItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    loadContentItems();
  }, [clientEmail, currentWeek]);

  const loadContentItems = async () => {
    try {
      setLoading(true);
      // Load content items for this client
      // For now, we'll filter by client email or use a client-specific calendar
      const userStorageKey = `content_items_client_${clientEmail}`;
      const stored = localStorage.getItem(userStorageKey);
      
      if (stored) {
        const parsedItems = JSON.parse(stored);
        const itemsWithDates = parsedItems.map(item => ({
          ...item,
          scheduledDate: new Date(item.scheduledDate)
        }));
        // Filter items that need approval (status: 'pending_approval' or 'draft')
        const pendingItems = itemsWithDates.filter(item => 
          item.status === 'pending_approval' || item.status === 'draft'
        );
        setContentItems(pendingItems);
      } else {
        // Try loading from Firestore if we add that functionality
        setContentItems([]);
      }
    } catch (error) {
      console.error('Error loading content items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (itemId) => {
    try {
      // Update item status to 'approved'
      const updatedItems = contentItems.map(item =>
        item.id === itemId ? { ...item, status: 'approved', approvedAt: new Date() } : item
      );
      setContentItems(updatedItems);
      
      // Save to localStorage
      const userStorageKey = `content_items_client_${clientEmail}`;
      localStorage.setItem(userStorageKey, JSON.stringify(updatedItems));
      
      // TODO: Save to Firestore when we implement that
      
      alert('Content approved successfully!');
    } catch (error) {
      console.error('Error approving content:', error);
      alert('Failed to approve content. Please try again.');
    }
  };

  const handleReject = async (itemId, reason) => {
    const rejectionReason = reason || prompt('Please provide a reason for rejection:');
    if (!rejectionReason) return;

    try {
      const updatedItems = contentItems.map(item =>
        item.id === itemId 
          ? { ...item, status: 'rejected', rejectionReason, rejectedAt: new Date() } 
          : item
      );
      setContentItems(updatedItems);
      
      const userStorageKey = `content_items_client_${clientEmail}`;
      localStorage.setItem(userStorageKey, JSON.stringify(updatedItems));
      
      alert('Content rejected. Your media manager will be notified.');
    } catch (error) {
      console.error('Error rejecting content:', error);
      alert('Failed to reject content. Please try again.');
    }
  };

  const getWeekDays = () => {
    const start = startOfWeek(currentWeek, { weekStartsOn: 1 });
    const end = endOfWeek(currentWeek, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  };

  const getContentForDate = (date) => {
    return contentItems.filter(item => isSameDay(new Date(item.scheduledDate), date));
  };

  const getPlatformIcon = (platform) => {
    switch (platform) {
      case 'instagram': return <Instagram className="w-4 h-4" />;
      case 'facebook': return <Facebook className="w-4 h-4" />;
      case 'twitter': return <Twitter className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getContentTypeIcon = (type) => {
    switch (type) {
      case 'image': return <Image className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const weekDays = getWeekDays();

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-4">Loading content calendar...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => setCurrentWeek(new Date(currentWeek.getTime() - 7 * 24 * 60 * 60 * 1000))}
          >
            Previous Week
          </Button>
          <h2 className="text-lg font-semibold text-gray-900">
            {format(weekDays[0], 'MMM d')} - {format(weekDays[6], 'MMM d, yyyy')}
          </h2>
          <Button
            variant="outline"
            onClick={() => setCurrentWeek(new Date(currentWeek.getTime() + 7 * 24 * 60 * 60 * 1000))}
          >
            Next Week
          </Button>
          <Button
            variant="outline"
            onClick={() => setCurrentWeek(new Date())}
          >
            Today
          </Button>
        </div>
        <Badge className="bg-blue-100 text-blue-800">
          {contentItems.length} items pending approval
        </Badge>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-4">
        {weekDays.map((day, index) => {
          const dayContent = getContentForDate(day);
          const isToday = isSameDay(day, new Date());

          return (
            <Card key={index} className={`p-4 ${isToday ? 'ring-2 ring-blue-500' : ''}`}>
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-500 uppercase">
                  {format(day, 'EEE')}
                </p>
                <p className={`text-lg font-semibold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                  {format(day, 'd')}
                </p>
              </div>

              <div className="space-y-2">
                {dayContent.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className="p-2 bg-blue-50 rounded cursor-pointer hover:bg-blue-100 transition-colors"
                  >
                    <div className="flex items-center gap-1 mb-1">
                      {getPlatformIcon(item.platform)}
                      {getContentTypeIcon(item.contentType)}
                    </div>
                    <p className="text-xs font-medium text-gray-900 truncate">
                      {item.title || 'Untitled'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(item.scheduledDate), 'h:mm a')}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Content Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {selectedItem.title || 'Untitled Content'}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      {getPlatformIcon(selectedItem.platform)}
                      <span className="capitalize">{selectedItem.platform}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(selectedItem.scheduledDate), 'MMM d, yyyy h:mm a')}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setSelectedItem(null)}
                >
                  ✕
                </Button>
              </div>

              {selectedItem.imageUrl && (
                <div className="mb-4">
                  <img 
                    src={selectedItem.imageUrl} 
                    alt={selectedItem.title}
                    className="w-full rounded-lg"
                  />
                </div>
              )}

              {selectedItem.description && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Description</p>
                  <p className="text-gray-600 whitespace-pre-wrap">{selectedItem.description}</p>
                </div>
              )}

              {selectedItem.tags && selectedItem.tags.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedItem.tags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={() => {
                    handleApprove(selectedItem.id);
                    setSelectedItem(null);
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={() => {
                    handleReject(selectedItem.id);
                    setSelectedItem(null);
                  }}
                  variant="outline"
                  className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Request Changes
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {contentItems.length === 0 && (
        <Card className="p-12 text-center">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">No content pending approval</p>
          <p className="text-sm text-gray-500 mt-2">
            Your media manager will add content for your review here.
          </p>
        </Card>
      )}
    </div>
  );
};

export default ClientCalendarApproval;

