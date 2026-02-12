import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { firestoreService } from '../services/firestoreService';
import { Bell, Check, X, MessageSquare, Calendar, CheckCircle, AlertCircle, Instagram, Bug, Lightbulb } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

const NotificationsCenter = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Real-time listener for notifications - auto-updates when new notifications arrive
  useEffect(() => {
    if (!currentUser?.email) {
      setLoading(false);
      return;
    }

    // Set up real-time listener - automatically updates when notifications are created/updated
    const unsubscribe = firestoreService.onNotificationsChange(
      currentUser.email,
      (notifs) => {
        setNotifications(notifs || []);
        setLoading(false);
      }
    );

    // Cleanup listener on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentUser?.email]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = async (notification) => {
    // Mark as read
    if (!notification.read) {
      await firestoreService.markNotificationRead(notification.id);
    }

    // Navigate to link if provided
    if (notification.link) {
      navigate(notification.link);
      setIsOpen(false);
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

  const getNotificationIcon = (type) => {
    switch (type) {
      // Time off notifications
      case 'time_off_request':
        return <Calendar className="w-4 h-4 text-[#ff9500]" />;
      case 'time_off_approved':
        return <CheckCircle className="w-4 h-4 text-[#34c759]" />;
      case 'time_off_rejected':
        return <X className="w-4 h-4 text-[#ff3b30]" />;
      case 'time_off_cancelled':
        return <AlertCircle className="w-4 h-4 text-[#ff9500]" />;
      case 'leave_balance_updated':
        return <Calendar className="w-4 h-4 text-[#5856d6]" />;
      case 'leave_request':
        return <Calendar className="w-4 h-4 text-purple-600" />;
      // Support tickets
      case 'ticket_comment':
        return <MessageSquare className="w-4 h-4 text-blue-600" />;
      case 'ticket_status':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      // Tasks
      case 'task_request':
        return <MessageSquare className="w-4 h-4 text-orange-600" />;
      case 'task_accepted':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'task_completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'task_rejected':
        return <Bell className="w-4 h-4 text-red-600" />;
      // Error reports
      case 'error_report':
        return <AlertCircle className="w-4 h-4 text-[#ff3b30]" />;
      // Instagram reports
      case 'instagram_report_reminder':
        return <Instagram className="w-4 h-4 text-pink-500" />;
      // Post logging (SMM)
      case 'post_log_reminder_week':
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
      case 'team_post_log_support':
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
      // Feedback & Support
      case 'bug_report':
        return <Bug className="w-4 h-4 text-[#ff3b30]" />;
      case 'feature_request':
        return <Lightbulb className="w-4 h-4 text-[#ff9500]" />;
      case 'chat_started':
        return <MessageSquare className="w-4 h-4 text-[#5856d6]" />;
      case 'post_due':
      case 'task_reminder':
        return <Calendar className="w-4 h-4 text-[#0071e3]" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 bg-[#ff3b30] text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Panel: on mobile fixed and centered; on desktop absolute under bell */}
          <div className="fixed left-4 right-4 top-14 z-50 max-h-[600px] flex flex-col w-[calc(100vw-2rem)] max-w-96 mx-auto sm:absolute sm:right-0 sm:left-auto sm:top-auto sm:mt-2 sm:w-96 sm:max-w-none sm:mx-0 bg-[#ffffff] dark:bg-[#2c2c2e] rounded-xl shadow-2xl border border-gray-200 dark:border-white/10">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-white/5 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-[#1d1d1f] dark:text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <p className="text-xs text-[#86868b]">{unreadCount} unread</p>
                )}
              </div>
              {unreadCount > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleMarkAllRead}
                  className="text-xs dark:text-white dark:hover:bg-white/5"
                >
                  <Check className="w-3 h-3 mr-1" />
                  Mark all read
                </Button>
              )}
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0071e3] mx-auto"></div>
                  <p className="text-sm text-[#86868b] mt-2">Loading...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 text-[#86868b] mx-auto mb-2" />
                  <p className="text-sm text-[#86868b]">No notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-white/5">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${
                        !notification.read ? 'bg-[#0071e3]/5' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#1d1d1f] dark:text-white mb-1">
                            {notification.title}
                          </p>
                          <p className="text-xs text-[#86868b] mb-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-[#86868b]">
                            {notification.createdAt?.toDate 
                              ? format(notification.createdAt.toDate(), 'MMM dd, h:mm a')
                              : 'Just now'}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex-shrink-0 flex items-center gap-1">
                          {!notification.read && (
                            <div className="w-2 h-2 bg-[#0071e3] rounded-full"></div>
                          )}
                          <button
                            onClick={(e) => handleDeleteNotification(notification.id, e)}
                            className="p-1 text-[#86868b] hover:text-[#ff3b30] hover:bg-[#ff3b30]/10 rounded"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-200 dark:border-white/5 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/notifications');
                  }}
                  className="text-xs text-[#0071e3] hover:text-[#0077ed] dark:hover:bg-white/5"
                >
                  View All Notifications
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationsCenter;

