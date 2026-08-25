import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabaseService } from '../services/supabaseService';
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
    const unsubscribe = supabaseService.onNotificationsChange(
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
      await supabaseService.markNotificationRead(notification.id);
    }

    // Navigate to link if provided
    if (notification.link) {
      navigate(notification.link);
      setIsOpen(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await supabaseService.markAllNotificationsRead(currentUser.email);
      if (unreadCount > 0) setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (e) {
      console.error('Mark all read failed:', e);
    }
  };

  const handleDeleteNotification = async (notificationId, e) => {
    e.stopPropagation();
    await supabaseService.deleteNotification(notificationId);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      // Time off notifications
      case 'time_off_request':
        return <Calendar className="w-4 h-4 text-warning" />;
      case 'time_off_approved':
        return <CheckCircle className="w-4 h-4 text-positive" />;
      case 'time_off_rejected':
        return <X className="w-4 h-4 text-danger" />;
      case 'time_off_cancelled':
        return <AlertCircle className="w-4 h-4 text-warning" />;
      case 'leave_balance_updated':
        return <Calendar className="w-4 h-4 text-brand" />;
      case 'leave_request':
        return <Calendar className="w-4 h-4 text-brand" />;
      // Support tickets
      case 'ticket_comment':
        return <MessageSquare className="w-4 h-4 text-brand" />;
      case 'ticket_status':
        return <CheckCircle className="w-4 h-4 text-positive" />;
      // Tasks
      case 'task_request':
        return <MessageSquare className="w-4 h-4 text-warning" />;
      case 'task_accepted':
        return <CheckCircle className="w-4 h-4 text-positive" />;
      case 'task_completed':
        return <CheckCircle className="w-4 h-4 text-positive" />;
      case 'task_rejected':
        return <Bell className="w-4 h-4 text-danger" />;
      // Error reports
      case 'error_report':
        return <AlertCircle className="w-4 h-4 text-danger" />;
      // Instagram reports
      case 'instagram_report_reminder':
        return <Instagram className="w-4 h-4 text-pink-500" />;
      // Post logging (SMM)
      case 'post_log_reminder_week':
        return <AlertCircle className="w-4 h-4 text-warning" />;
      case 'team_post_log_support':
        return <AlertCircle className="w-4 h-4 text-warning" />;
      // Feedback & Support
      case 'bug_report':
        return <Bug className="w-4 h-4 text-danger" />;
      case 'feature_request':
        return <Lightbulb className="w-4 h-4 text-warning" />;
      case 'chat_started':
        return <MessageSquare className="w-4 h-4 text-brand" />;
      case 'post_due':
      case 'task_reminder':
        return <Calendar className="w-4 h-4 text-brand" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  // Returns { label, path } for actionable notification types, or null
  const getNotificationCTA = (notification) => {
    const link = notification.link || null;
    switch (notification.type) {
      case 'instagram_report_reminder':
        return { label: 'Create Report', path: link || '/instagram-reports', style: 'pink' };
      case 'post_log_reminder_week':
      case 'team_post_log_support':
      case 'post_due':
        return { label: 'Log Post', path: link || '/my-clients', style: 'blue' };
      case 'task_request':
        return { label: 'Review Request', path: link || '/tasks', style: 'orange' };
      case 'time_off_request':
      case 'leave_request':
        return { label: 'Review', path: link || '/hr-calendar', style: 'purple' };
      case 'ticket_comment':
      case 'ticket_status':
        return link ? { label: 'View Ticket', path: link, style: 'blue' } : null;
      case 'bug_report':
      case 'feature_request':
        return link ? { label: 'View', path: link, style: 'gray' } : null;
      default:
        return link ? { label: 'View', path: link, style: 'blue' } : null;
    }
  };

  const ctaClass = (style) => {
    switch (style) {
      case 'pink': return 'bg-[#E1306C]/10 text-[#E1306C] hover:bg-[#E1306C]/20';
      case 'orange': return 'bg-warning/10 text-warning hover:bg-warning/20';
      case 'purple': return 'bg-brand/10 text-brand hover:bg-brand/20';
      case 'gray': return 'bg-surface-3 text-ink-muted hover:bg-hairline-strong';
      default: return 'bg-brand/10 text-brand hover:bg-brand/20';
    }
  };

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-ink-muted hover:text-ink dark:hover:text-white hover:bg-surface-3 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 bg-danger text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
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
          <div className="fixed left-4 right-4 top-14 z-50 max-h-[600px] flex flex-col w-[calc(100vw-2rem)] max-w-96 mx-auto sm:absolute sm:right-0 sm:left-auto sm:top-auto sm:mt-2 sm:w-96 sm:max-w-none sm:mx-0 bg-surface rounded-xl shadow-lg border border-gray-200 dark:border-white/10">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-white/5 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-ink">Notifications</h3>
                {unreadCount > 0 && (
                  <p className="text-xs text-ink-muted">{unreadCount} unread</p>
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
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand mx-auto"></div>
                  <p className="text-sm text-ink-muted mt-2">Loading...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 text-ink-muted mx-auto mb-2" />
                  <p className="text-sm text-ink-muted">No notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-white/5">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 cursor-pointer hover:bg-surface-3 transition-colors ${
                        !notification.read ? 'bg-brand/5' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink mb-1">
                            {notification.title}
                            {(notification.count || 0) > 1 && (
                              <span className="ml-1.5 text-ink-muted font-normal">({notification.count})</span>
                            )}
                          </p>
                          <p className="text-xs text-ink-muted mb-2">
                            {notification.message}
                          </p>
                          {(() => {
                            const cta = getNotificationCTA(notification);
                            return cta ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!notification.read) supabaseService.markNotificationRead(notification.id);
                                  navigate(cta.path);
                                  setIsOpen(false);
                                }}
                                className={`mb-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${ctaClass(cta.style)}`}
                              >
                                {cta.label} →
                              </button>
                            ) : null;
                          })()}
                          <p className="text-xs text-ink-muted">
                            {notification.updatedAt?.toDate
                              ? format(notification.updatedAt.toDate(), 'MMM dd, h:mm a')
                              : notification.createdAt?.toDate
                                ? format(notification.createdAt.toDate(), 'MMM dd, h:mm a')
                                : 'Just now'}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex-shrink-0 flex items-center gap-1">
                          {!notification.read && (
                            <div className="w-2 h-2 bg-brand rounded-full"></div>
                          )}
                          <button
                            onClick={(e) => handleDeleteNotification(notification.id, e)}
                            className="p-1 text-ink-muted hover:text-danger hover:bg-danger/10 rounded"
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
                  className="text-xs text-brand hover:text-brand-hover dark:hover:bg-white/5"
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

