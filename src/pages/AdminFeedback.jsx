/**
 * AdminFeedback - View and manage bug reports and feature requests
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { firestoreService } from '../services/firestoreService';
import { 
  Bug, 
  Lightbulb, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Search,
  Filter,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

const PRIORITY_COLORS = {
  low: { bg: 'bg-[#34c759]/10', text: 'text-[#34c759]', label: 'Low' },
  medium: { bg: 'bg-[#ff9500]/10', text: 'text-[#ff9500]', label: 'Medium' },
  high: { bg: 'bg-[#ff3b30]/10', text: 'text-[#ff3b30]', label: 'High' },
  critical: { bg: 'bg-[#af52de]/10', text: 'text-[#af52de]', label: 'Critical' }
};

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open', icon: Clock, color: 'text-[#0071e3]' },
  { value: 'in_progress', label: 'In Progress', icon: AlertCircle, color: 'text-[#ff9500]' },
  { value: 'resolved', label: 'Resolved', icon: CheckCircle2, color: 'text-[#34c759]' },
  { value: 'closed', label: 'Closed', icon: CheckCircle2, color: 'text-[#86868b]' }
];

export default function AdminFeedback() {
  const { currentUser, isSystemAdmin } = useAuth();
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    loadFeedback();
  }, []);

  const loadFeedback = async () => {
    setLoading(true);
    try {
      const data = await firestoreService.getAllFeedback();
      setFeedback(data || []);
    } catch (error) {
      console.error('Error loading feedback:', error);
      toast.error('Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (feedbackId, newStatus) => {
    try {
      await firestoreService.updateFeedbackStatus(feedbackId, newStatus);
      setFeedback(prev => prev.map(f => 
        f.id === feedbackId ? { ...f, status: newStatus } : f
      ));
      toast.success('Status updated');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const filteredFeedback = useMemo(() => {
    let filtered = feedback;

    if (typeFilter !== 'all') {
      filtered = filtered.filter(f => f.type === typeFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(f => f.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(f => 
        f.title?.toLowerCase().includes(query) ||
        f.description?.toLowerCase().includes(query) ||
        f.userName?.toLowerCase().includes(query) ||
        f.userEmail?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [feedback, typeFilter, statusFilter, searchQuery]);

  const stats = useMemo(() => ({
    total: feedback.length,
    bugs: feedback.filter(f => f.type === 'bug').length,
    features: feedback.filter(f => f.type === 'feature').length,
    open: feedback.filter(f => f.status === 'open').length
  }), [feedback]);

  if (!isSystemAdmin) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#000] flex items-center justify-center">
        <p className="text-[#86868b]">Access denied. Admin only.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#000] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-[28px] font-semibold text-[#1d1d1f] dark:text-white">Feedback & Reports</h1>
          <p className="text-[15px] text-[#86868b]">Manage bug reports and feature requests</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 border border-black/5 dark:border-white/10">
            <p className="text-[12px] text-[#86868b] mb-1">Total</p>
            <p className="text-[24px] font-semibold text-[#1d1d1f] dark:text-white">{stats.total}</p>
          </div>
          <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 border border-black/5 dark:border-white/10">
            <p className="text-[12px] text-[#86868b] mb-1">Bug Reports</p>
            <p className="text-[24px] font-semibold text-[#ff3b30]">{stats.bugs}</p>
          </div>
          <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 border border-black/5 dark:border-white/10">
            <p className="text-[12px] text-[#86868b] mb-1">Feature Requests</p>
            <p className="text-[24px] font-semibold text-[#ff9500]">{stats.features}</p>
          </div>
          <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 border border-black/5 dark:border-white/10">
            <p className="text-[12px] text-[#86868b] mb-1">Open</p>
            <p className="text-[24px] font-semibold text-[#0071e3]">{stats.open}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search feedback..."
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-white dark:bg-[#1c1c1e] border border-black/10 dark:border-white/10 text-[14px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-10 px-4 rounded-xl bg-white dark:bg-[#1c1c1e] border border-black/10 dark:border-white/10 text-[14px] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
          >
            <option value="all">All Types</option>
            <option value="bug">Bug Reports</option>
            <option value="feature">Feature Requests</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-4 rounded-xl bg-white dark:bg-[#1c1c1e] border border-black/10 dark:border-white/10 text-[14px] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        {/* Feedback List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredFeedback.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-[#1c1c1e] rounded-2xl border border-black/5 dark:border-white/10">
            <Filter className="w-10 h-10 text-[#86868b] mx-auto mb-3 opacity-50" />
            <p className="text-[15px] text-[#86868b]">No feedback found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFeedback.map(item => {
              const isExpanded = expandedId === item.id;
              const priority = PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.medium;
              const statusOption = STATUS_OPTIONS.find(s => s.value === item.status) || STATUS_OPTIONS[0];
              const StatusIcon = statusOption.icon;

              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-[#1c1c1e] rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden"
                >
                  {/* Header */}
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="flex items-center gap-4 p-4 cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      item.type === 'bug' ? 'bg-[#ff3b30]/10' : 'bg-[#ff9500]/10'
                    }`}>
                      {item.type === 'bug' ? (
                        <Bug className="w-5 h-5 text-[#ff3b30]" />
                      ) : (
                        <Lightbulb className="w-5 h-5 text-[#ff9500]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-[15px] font-medium text-[#1d1d1f] dark:text-white truncate">
                          {item.title}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${priority.bg} ${priority.text}`}>
                          {priority.label}
                        </span>
                      </div>
                      <p className="text-[13px] text-[#86868b]">
                        {item.userName || item.userEmail} • {item.createdAt?.toDate ? format(item.createdAt.toDate(), 'MMM d, yyyy') : 'Unknown date'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <select
                        value={item.status}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleStatusChange(item.id, e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className={`h-8 px-3 rounded-lg text-[12px] font-medium border-0 focus:outline-none focus:ring-2 focus:ring-[#0071e3] ${
                          item.status === 'open' ? 'bg-[#0071e3]/10 text-[#0071e3]' :
                          item.status === 'in_progress' ? 'bg-[#ff9500]/10 text-[#ff9500]' :
                          item.status === 'resolved' ? 'bg-[#34c759]/10 text-[#34c759]' :
                          'bg-[#86868b]/10 text-[#86868b]'
                        }`}
                      >
                        {STATUS_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <ChevronDown className={`w-5 h-5 text-[#86868b] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 border-t border-black/5 dark:border-white/10">
                      <div className="pt-4 space-y-4">
                        <div>
                          <p className="text-[12px] font-medium text-[#86868b] mb-1">Description</p>
                          <p className="text-[14px] text-[#1d1d1f] dark:text-white whitespace-pre-wrap">
                            {item.description}
                          </p>
                        </div>
                        {item.url && (
                          <div>
                            <p className="text-[12px] font-medium text-[#86868b] mb-1">Page URL</p>
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[14px] text-[#0071e3] hover:underline flex items-center gap-1"
                            >
                              {item.url}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                        <div className="flex gap-6">
                          <div>
                            <p className="text-[12px] font-medium text-[#86868b] mb-1">Email</p>
                            <p className="text-[14px] text-[#1d1d1f] dark:text-white">{item.userEmail}</p>
                          </div>
                          <div>
                            <p className="text-[12px] font-medium text-[#86868b] mb-1">Type</p>
                            <p className="text-[14px] text-[#1d1d1f] dark:text-white capitalize">{item.type}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
