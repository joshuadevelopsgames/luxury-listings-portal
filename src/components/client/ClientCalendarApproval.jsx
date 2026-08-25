import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Image as ImageIcon,
  Video,
  FileText,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Youtube,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { format, isSameDay, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { supabaseService } from '../../services/supabaseService';

// Statuses a client is allowed to see in their portal (internal drafts/paused are hidden).
const VISIBLE_STATUSES = ['pending_approval', 'needs_revision', 'approved', 'scheduled', 'published'];
const ACTIONABLE_STATUSES = ['pending_approval', 'needs_revision'];

const STATUS_META = {
  pending_approval: { label: 'Awaiting your review', badge: 'bg-warning-soft text-warning', dot: 'bg-warning' },
  needs_revision: { label: 'Changes requested', badge: 'bg-danger-soft text-danger', dot: 'bg-danger' },
  approved: { label: 'Approved', badge: 'bg-positive-soft text-positive', dot: 'bg-positive' },
  scheduled: { label: 'Scheduled', badge: 'bg-brand-soft text-brand', dot: 'bg-brand' },
  published: { label: 'Published', badge: 'bg-gray-100 text-gray-700', dot: 'bg-gray-400' },
};

const platformIcon = (platform) => {
  switch (platform) {
    case 'instagram': return <Instagram className="w-4 h-4" />;
    case 'facebook': return <Facebook className="w-4 h-4" />;
    case 'twitter': return <Twitter className="w-4 h-4" />;
    case 'linkedin': return <Linkedin className="w-4 h-4" />;
    case 'youtube': return <Youtube className="w-4 h-4" />;
    default: return <FileText className="w-4 h-4" />;
  }
};

const firstMedia = (item) => (Array.isArray(item.media) && item.media.length > 0 ? item.media[0] : null);

const ClientCalendarApproval = ({ clientId, clientEmail, calendarId, clientName }) => {
  const [contentItems, setContentItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedItem, setSelectedItem] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rejectModal, setRejectModal] = useState({ open: false, itemId: null, reason: '' });

  const loadContentItems = useCallback(async () => {
    if (!calendarId) {
      setContentItems([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const items = await supabaseService.getCalendarItemsById(calendarId);
      setContentItems((items || []).filter((i) => VISIBLE_STATUSES.includes(i.status)));
    } catch (error) {
      console.error('Error loading content items:', error);
      toast.error('Could not load your content calendar.');
    } finally {
      setLoading(false);
    }
  }, [calendarId]);

  useEffect(() => {
    loadContentItems();
  }, [loadContentItems]);

  const openItem = async (item) => {
    setSelectedItem(item);
    setComments([]);
    setCommentsLoading(true);
    try {
      const all = await supabaseService.getContentPostComments(item.id);
      // Never surface internal (manager-only) notes to the client.
      setComments((all || []).filter((c) => c.type !== 'internal'));
    } catch {
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  };

  const closeItem = () => {
    setSelectedItem(null);
    setComments([]);
  };

  const handleApprove = async (item) => {
    setSubmitting(true);
    try {
      await supabaseService.setContentItemApproval(item.id, { status: 'approved', authorEmail: clientEmail });
      toast.success('Post approved!');
      closeItem();
      await loadContentItems();
    } catch (error) {
      console.error('Error approving content:', error);
      toast.error('Failed to approve. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitRejectModal = async () => {
    const reason = (rejectModal.reason || '').trim();
    if (!reason) {
      toast.error('Please describe the changes you would like.');
      return;
    }
    setSubmitting(true);
    try {
      await supabaseService.setContentItemApproval(rejectModal.itemId, {
        status: 'needs_revision',
        reason,
        authorEmail: clientEmail,
      });
      toast.success('Change request sent to your media manager.');
      setRejectModal({ open: false, itemId: null, reason: '' });
      closeItem();
      await loadContentItems();
    } catch (error) {
      console.error('Error requesting changes:', error);
      toast.error('Failed to send. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const weekDays = (() => {
    const start = startOfWeek(currentWeek, { weekStartsOn: 1 });
    const end = endOfWeek(currentWeek, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  })();

  const itemsForDate = (date) => contentItems.filter((item) => isSameDay(new Date(item.scheduledDate), date));
  const pendingCount = contentItems.filter((i) => i.status === 'pending_approval').length;

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand mx-auto"></div>
        <p className="text-gray-600 mt-4">Loading content calendar...</p>
      </div>
    );
  }

  if (!calendarId) {
    return (
      <Card className="p-12 text-center">
        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 font-medium">Your calendar isn't connected yet</p>
        <p className="text-sm text-gray-500 mt-2">
          Your media manager hasn't linked a content calendar to your account. Check back soon.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Week Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentWeek(new Date(currentWeek.getTime() - 7 * 864e5))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 whitespace-nowrap">
            {format(weekDays[0], 'MMM d')} – {format(weekDays[6], 'MMM d, yyyy')}
          </h2>
          <Button variant="outline" size="sm" onClick={() => setCurrentWeek(new Date(currentWeek.getTime() + 7 * 864e5))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentWeek(new Date())}>Today</Button>
        </div>
        {pendingCount > 0 && (
          <Badge className="bg-warning-soft text-warning">
            {pendingCount} awaiting your review
          </Badge>
        )}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {weekDays.map((day, index) => {
          const dayContent = itemsForDate(day);
          const isToday = isSameDay(day, new Date());
          return (
            <Card key={index} className={`p-3 ${isToday ? 'ring-2 ring-brand' : ''}`}>
              <div className="mb-2">
                <p className="text-[10px] font-medium text-gray-500 uppercase">{format(day, 'EEE')}</p>
                <p className={`text-lg font-semibold ${isToday ? 'text-brand' : 'text-gray-900'}`}>{format(day, 'd')}</p>
              </div>
              <div className="space-y-2">
                {dayContent.map((item) => {
                  const meta = STATUS_META[item.status] || STATUS_META.scheduled;
                  const media = firstMedia(item);
                  return (
                    <button
                      key={item.id}
                      onClick={() => openItem(item)}
                      className="w-full text-left rounded-lg border border-gray-200 overflow-hidden hover:border-blue-400 hover:shadow-sm transition-all"
                    >
                      {media && media.type?.startsWith('image') ? (
                        <img src={media.url} alt={item.title} className="w-full h-16 object-cover" />
                      ) : media && media.type?.startsWith('video') ? (
                        <div className="w-full h-16 bg-gray-900 flex items-center justify-center">
                          <Video className="w-5 h-5 text-white" />
                        </div>
                      ) : null}
                      <div className="p-2">
                        <div className="flex items-center gap-1 text-gray-500 mb-1">
                          {platformIcon(item.platform)}
                          <span className={`ml-auto w-2 h-2 rounded-full ${meta.dot}`} title={meta.label} />
                        </div>
                        <p className="text-xs font-medium text-gray-900 truncate">{item.title || 'Untitled'}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      {contentItems.length === 0 && (
        <Card className="p-12 text-center">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">No content to review yet</p>
          <p className="text-sm text-gray-500 mt-2">
            Your media manager will add posts here for your review.
          </p>
        </Card>
      )}

      {/* Content Detail Modal */}
      {selectedItem && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeItem}>
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="min-w-0">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2 break-words">
                    {selectedItem.title || 'Untitled Content'}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                    <span className="flex items-center gap-1 capitalize">{platformIcon(selectedItem.platform)} {selectedItem.platform}</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(selectedItem.scheduledDate), 'EEE, MMM d, yyyy')}
                    </span>
                    <Badge className={(STATUS_META[selectedItem.status] || STATUS_META.scheduled).badge}>
                      {(STATUS_META[selectedItem.status] || STATUS_META.scheduled).label}
                    </Badge>
                  </div>
                </div>
                <button onClick={closeItem} className="p-1 rounded hover:bg-gray-100 flex-shrink-0">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {(() => {
                const media = firstMedia(selectedItem);
                if (media && media.type?.startsWith('image')) {
                  return <img src={media.url} alt={selectedItem.title} className="w-full rounded-lg mb-4" />;
                }
                if (media && media.type?.startsWith('video')) {
                  return <video src={media.url} controls className="w-full rounded-lg mb-4 bg-black" />;
                }
                return null;
              })()}

              {selectedItem.description && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Caption</p>
                  <p className="text-gray-600 whitespace-pre-wrap">{selectedItem.description}</p>
                </div>
              )}

              {Array.isArray(selectedItem.tags) && selectedItem.tags.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {selectedItem.tags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              )}

              {/* Conversation */}
              <div className="mb-4 border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4" /> Conversation
                </p>
                {commentsLoading ? (
                  <p className="text-sm text-gray-400">Loading…</p>
                ) : comments.length === 0 ? (
                  <p className="text-sm text-gray-400">No messages yet.</p>
                ) : (
                  <div className="space-y-2">
                    {comments.map((c) => (
                      <div key={c.id} className="bg-gray-50 rounded-lg px-3 py-2">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-medium text-gray-700">{c.author}</span>
                          <span className="text-[11px] text-gray-400">{c.ts ? format(new Date(c.ts), 'MMM d, h:mm a') : ''}</span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {ACTIONABLE_STATUSES.includes(selectedItem.status) ? (
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    onClick={() => handleApprove(selectedItem)}
                    disabled={submitting}
                    className="flex-1 bg-positive hover:bg-positive-hover text-white"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" /> Approve
                  </Button>
                  <Button
                    onClick={() => setRejectModal({ open: true, itemId: selectedItem.id, reason: '' })}
                    disabled={submitting}
                    variant="outline"
                    className="flex-1 border-red-300 text-danger hover:bg-danger-soft"
                  >
                    <XCircle className="w-4 h-4 mr-2" /> Request Changes
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 pt-4 border-t text-sm text-gray-500">
                  {selectedItem.status === 'approved' ? <CheckCircle className="w-4 h-4 text-positive" /> : <Clock className="w-4 h-4" />}
                  {(STATUS_META[selectedItem.status] || STATUS_META.scheduled).label}
                </div>
              )}
            </div>
          </Card>
        </div>,
        document.body
      )}

      {/* Request-changes reason modal */}
      {rejectModal.open && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <Card className="max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">What would you like changed?</h3>
              <button type="button" onClick={() => setRejectModal({ open: false, itemId: null, reason: '' })} className="p-1 rounded hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <textarea
              value={rejectModal.reason}
              onChange={(e) => setRejectModal((p) => ({ ...p, reason: e.target.value }))}
              placeholder="e.g. Please use the second photo and shorten the caption…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-brand"
              autoFocus
            />
            <div className="flex gap-2 mt-4">
              <Button onClick={() => setRejectModal({ open: false, itemId: null, reason: '' })} variant="outline" className="flex-1">Cancel</Button>
              <Button onClick={submitRejectModal} disabled={submitting} className="flex-1 bg-danger hover:bg-danger-hover text-white">
                {submitting ? 'Sending…' : 'Send Request'}
              </Button>
            </div>
          </Card>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ClientCalendarApproval;
