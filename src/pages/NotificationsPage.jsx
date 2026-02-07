import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { firestoreService } from '../services/firestoreService';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  Check, 
  X, 
  Trash2,
  MessageSquare, 
  Calendar, 
  CheckCircle, 
  AlertCircle,
  ArrowLeft,
  Filter
} from 'lucide-react';
import { safeFormatDate } from '../utils/dateUtils';

const NotificationsPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, read

  // Real-time listener for notifications
  useEffect(() => {
    if (!currentUser?.email) {
      setLoading(false);
      return;
    }

    const unsubscribe = firestoreService.onNotificationsChange(
      currentUser.email,
      (notifs) => {
        setNotifications(notifs || []);
        setLoading(false);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentUser?.email]);

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'read') return n.read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = async (notification) => {
    // Mark as read
    if (!notification.read) {
      await firestoreService.markNotificationRead(notification.id);
    }

    // Navigate to link if provided
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await firestoreService.markAllNotificationsRead(currentUser.email);
      if (unreadCount > 0) setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (e) {
      console.error('Mark all read failed:', e);
    }
  };

  const handleDeleteNotification = async (notificationId, e) => {
    e.stopPropagation();
    await firestoreService.deleteNotification(notificationId);
  };

  const handleClearAll = async () => {
    // Delete all notifications
    for (const notification of notifications) {
      await firestoreService.deleteNotification(notification.id);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'time_off_request':
        return <Calendar className="w-5 h-5 text-[#ff9500]" />;
      case 'time_off_approved':
        return <CheckCircle className="w-5 h-5 text-[#34c759]" />;
      case 'time_off_rejected':
        return <X className="w-5 h-5 text-[#ff3b30]" />;
      case 'time_off_cancelled':
        return <AlertCircle className="w-5 h-5 text-[#ff9500]" />;
      case 'leave_balance_updated':
        return <Calendar className="w-5 h-5 text-[#5856d6]" />;
      case 'ticket_comment':
        return <MessageSquare className="w-5 h-5 text-blue-600" />;
      case 'ticket_status':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'task_request':
        return <MessageSquare className="w-5 h-5 text-orange-600" />;
      case 'task_accepted':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'task_completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'task_rejected':
        return <Bell className="w-5 h-5 text-red-600" />;
      case 'error_report':
        return <AlertCircle className="w-5 h-5 text-[#ff3b30]" />;
      default:
        return <Bell className="w-5 h-5 text-[#86868b]" />;
    }
  };

  const getTypeLabel = (type) => {
    const labels = {
      'time_off_request': 'Time Off',
      'time_off_approved': 'Approved',
      'time_off_rejected': 'Rejected',
      'time_off_cancelled': 'Cancelled',
      'leave_balance_updated': 'Balance Update',
      'ticket_comment': 'Comment',
      'ticket_status': 'Ticket Update',
      'task_request': 'Task Request',
      'task_accepted': 'Task Accepted',
      'task_completed': 'Task Completed',
      'task_rejected': 'Task Rejected',
      'error_report': 'Error Report',
    };
    return labels[type] || 'Notification';
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[#86868b]" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-[#1d1d1f] dark:text-white">
              Notifications
            </h1>
            <p className="text-sm text-[#86868b]">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[13px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
            >
              <Check className="w-4 h-4" />
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#ff3b30]/10 text-[#ff3b30] text-[13px] font-medium hover:bg-[#ff3b30]/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {['all', 'unread', 'read'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-[#0071e3] text-white'
                : 'bg-black/5 dark:bg-white/5 text-[#86868b] hover:bg-black/10 dark:hover:bg-white/10'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'unread' && unreadCount > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-white/20 rounded-full text-xs">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="bg-white dark:bg-[#2c2c2e] rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0071e3] mx-auto"></div>
            <p className="text-sm text-[#86868b] mt-4">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="w-16 h-16 text-[#86868b]/50 mx-auto mb-4" />
            <p className="text-lg font-medium text-[#1d1d1f] dark:text-white mb-2">
              {filter === 'all' ? 'No notifications yet' : `No ${filter} notifications`}
            </p>
            <p className="text-sm text-[#86868b]">
              {filter === 'all' 
                ? "You're all caught up!" 
                : `Try checking the "${filter === 'unread' ? 'all' : 'unread'}" tab`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-white/5">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`p-5 cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors ${
                  !notification.read ? 'bg-[#0071e3]/5' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`p-3 rounded-xl ${!notification.read ? 'bg-[#0071e3]/10' : 'bg-black/5 dark:bg-white/5'}`}>
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-[15px] font-medium text-[#1d1d1f] dark:text-white">
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <span className="px-2 py-0.5 bg-[#0071e3] text-white text-[10px] font-semibold rounded-full">
                          NEW
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] text-[#86868b] mb-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-[#86868b]">
                      <span className="px-2 py-1 bg-black/5 dark:bg-white/5 rounded-md">
                        {getTypeLabel(notification.type)}
                      </span>
                      <span>
                        {safeFormatDate(notification.createdAt, 'MMM d, yyyy h:mm a', 'Just now')}
                      </span>
                      {notification.link && (
                        <span className="text-[#0071e3]">Click to view →</span>
                      )}
                    </div>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={(e) => handleDeleteNotification(notification.id, e)}
                    className="p-2 text-[#86868b] hover:text-[#ff3b30] hover:bg-[#ff3b30]/10 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
