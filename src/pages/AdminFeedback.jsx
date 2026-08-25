/**
 * AdminFeedback - View and manage bug reports and feature requests
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabaseService } from '../services/supabaseService';
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
  low: { bg: 'bg-positive/10', text: 'text-positive', label: 'Low' },
  medium: { bg: 'bg-warning/10', text: 'text-warning', label: 'Medium' },
  high: { bg: 'bg-danger/10', text: 'text-danger', label: 'High' },
  critical: { bg: 'bg-brand/10', text: 'text-brand', label: 'Critical' }
};

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open', icon: Clock, color: 'text-brand' },
  { value: 'in_progress', label: 'In Progress', icon: AlertCircle, color: 'text-warning' },
  { value: 'resolved', label: 'Resolved', icon: CheckCircle2, color: 'text-positive' },
  { value: 'closed', label: 'Closed', icon: CheckCircle2, color: 'text-ink-muted' }
];

export default function AdminFeedback() {
  const { currentUser } = useAuth();
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
      const data = await supabaseService.getAllFeedback();
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
      await supabaseService.updateFeedbackStatus(feedbackId, newStatus);
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

  return (
    <div className="min-h-screen bg-surface-2 dark:bg-[#000] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-[28px] font-semibold text-ink">Feedback & Reports</h1>
          <p className="text-[15px] text-ink-muted">Manage bug reports and feature requests</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-surface rounded-xl p-4 border border-hairline">
            <p className="text-[12px] text-ink-muted mb-1">Total</p>
            <p className="text-[24px] font-semibold text-ink">{stats.total}</p>
          </div>
          <div className="bg-surface rounded-xl p-4 border border-hairline">
            <p className="text-[12px] text-ink-muted mb-1">Bug Reports</p>
            <p className="text-[24px] font-semibold text-danger">{stats.bugs}</p>
          </div>
          <div className="bg-surface rounded-xl p-4 border border-hairline">
            <p className="text-[12px] text-ink-muted mb-1">Feature Requests</p>
            <p className="text-[24px] font-semibold text-warning">{stats.features}</p>
          </div>
          <div className="bg-surface rounded-xl p-4 border border-hairline">
            <p className="text-[12px] text-ink-muted mb-1">Open</p>
            <p className="text-[24px] font-semibold text-brand">{stats.open}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search feedback..."
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-surface border border-hairline-strong text-[14px] text-ink placeholder-ink-muted focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-10 px-4 rounded-xl bg-surface border border-hairline-strong text-[14px] text-ink focus:outline-none focus:ring-2 focus:ring-brand"
          >
            <option value="all">All Types</option>
            <option value="bug">Bug Reports</option>
            <option value="feature">Feature Requests</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-4 rounded-xl bg-surface border border-hairline-strong text-[14px] text-ink focus:outline-none focus:ring-2 focus:ring-brand"
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
            <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredFeedback.length === 0 ? (
          <div className="text-center py-12 bg-surface rounded-xl border border-hairline">
            <Filter className="w-10 h-10 text-ink-muted mx-auto mb-3 opacity-50" />
            <p className="text-[15px] text-ink-muted">No feedback found</p>
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
                  className="bg-surface rounded-xl border border-hairline overflow-hidden"
                >
                  {/* Header */}
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="flex items-center gap-4 p-4 cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      item.type === 'bug' ? 'bg-danger/10' : 'bg-warning/10'
                    }`}>
                      {item.type === 'bug' ? (
                        <Bug className="w-5 h-5 text-danger" />
                      ) : (
                        <Lightbulb className="w-5 h-5 text-warning" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-[15px] font-medium text-ink truncate">
                          {item.title}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${priority.bg} ${priority.text}`}>
                          {priority.label}
                        </span>
                      </div>
                      <p className="text-[13px] text-ink-muted">
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
                        className={`h-8 px-3 rounded-lg text-[12px] font-medium border-0 focus:outline-none focus:ring-2 focus:ring-brand ${
                          item.status === 'open' ? 'bg-brand/10 text-brand' :
                          item.status === 'in_progress' ? 'bg-warning/10 text-warning' :
                          item.status === 'resolved' ? 'bg-positive/10 text-positive' :
                          'bg-ink-muted/10 text-ink-muted'
                        }`}
                      >
                        {STATUS_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <ChevronDown className={`w-5 h-5 text-ink-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 border-t border-hairline">
                      <div className="pt-4 space-y-4">
                        <div>
                          <p className="text-[12px] font-medium text-ink-muted mb-1">Description</p>
                          <p className="text-[14px] text-ink whitespace-pre-wrap">
                            {item.description}
                          </p>
                        </div>
                        {item.url && (
                          <div>
                            <p className="text-[12px] font-medium text-ink-muted mb-1">Page URL</p>
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[14px] text-brand hover:underline flex items-center gap-1"
                            >
                              {item.url}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}

                        {/* Selected Element Info */}
                        {item.selectedElement && (
                          <div>
                            <p className="text-[12px] font-medium text-ink-muted mb-1">Selected Element</p>
                            <div className="p-3 rounded-lg bg-surface-3 text-[13px] font-mono">
                              <p className="text-ink">
                                &lt;{item.selectedElement.tagName?.toLowerCase()}&gt;
                                {item.selectedElement.id && <span className="text-brand"> #{item.selectedElement.id}</span>}
                                {item.selectedElement.className && <span className="text-warning"> .{item.selectedElement.className.split(' ')[0]}</span>}
                              </p>
                              {item.selectedElement.textContent && (
                                <p className="text-ink-muted mt-1 truncate">Text: "{item.selectedElement.textContent.substring(0, 100)}"</p>
                              )}
                              {item.selectedElement.xpath && (
                                <p className="text-ink-muted mt-1 text-[11px]">XPath: {item.selectedElement.xpath}</p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* User Info */}
                        {item.userInfo && (
                          <div>
                            <p className="text-[12px] font-medium text-ink-muted mb-1">Browser Info</p>
                            <div className="p-3 rounded-lg bg-surface-3 text-[12px] text-ink-muted">
                              <p>Viewport: {item.userInfo.viewport?.width}x{item.userInfo.viewport?.height}</p>
                              <p className="truncate">UA: {item.userInfo.userAgent?.substring(0, 80)}...</p>
                            </div>
                          </div>
                        )}

                        {/* Console Logs */}
                        {item.consoleLogs && item.consoleLogs.length > 0 && (
                          <div>
                            <p className="text-[12px] font-medium text-ink-muted mb-1">Console Logs ({item.consoleLogs.length})</p>
                            <div className="max-h-[200px] overflow-y-auto p-3 rounded-lg bg-ink text-[11px] font-mono">
                              {item.consoleLogs.slice(-50).map((log, idx) => (
                                <div key={idx} className={`py-0.5 ${
                                  log.type === 'error' ? 'text-danger' :
                                  log.type === 'warn' ? 'text-warning' :
                                  'text-ink-muted'
                                }`}>
                                  <span className="opacity-50">[{log.type}]</span> {log.message?.substring(0, 200)}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex gap-6">
                          <div>
                            <p className="text-[12px] font-medium text-ink-muted mb-1">Email</p>
                            <p className="text-[14px] text-ink">{item.userEmail}</p>
                          </div>
                          <div>
                            <p className="text-[12px] font-medium text-ink-muted mb-1">Type</p>
                            <p className="text-[14px] text-ink capitalize">{item.type}</p>
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
