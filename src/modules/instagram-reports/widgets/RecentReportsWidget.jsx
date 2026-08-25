/**
 * RecentReportsWidget - Dashboard widget showing recent Instagram reports
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Instagram, ExternalLink, Plus, Copy, Check } from 'lucide-react';
import { supabaseService } from '../../../services/supabaseService';

const RecentReportsWidget = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    const loadReports = async () => {
      try {
        const allReports = await supabaseService.getInstagramReports();
        setReports(allReports.slice(0, 4)); // Show latest 4
      } catch (error) {
        console.error('Error loading reports:', error);
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, []);

  const copyPublicLink = async (publicLinkId, e) => {
    e.stopPropagation();
    const link = `${window.location.origin}/report/${publicLinkId}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(publicLinkId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-[280px] sm:h-[327px] sm:min-h-[327px] widget-scroll overflow-auto bg-surface backdrop-blur-xl rounded-xl p-4 sm:p-6 border border-hairline animate-pulse">
        <div className="h-5 w-32 bg-black/10 dark:bg-white/10 rounded mb-4" />
        <div className="space-y-3">
          <div className="h-12 w-full bg-surface-3 rounded" />
          <div className="h-12 w-full bg-surface-3 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[280px] sm:h-[327px] sm:min-h-[327px] widget-scroll overflow-auto bg-surface backdrop-blur-xl rounded-xl p-4 sm:p-6 border border-hairline">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#e1306c] to-[#f77737] flex items-center justify-center shadow-lg shadow-[#e1306c]/20">
            <Instagram className="w-4 h-4 text-white" strokeWidth={1.5} />
          </div>
          <h3 className="font-semibold text-[15px] text-ink">Instagram Analytics</h3>
        </div>
        <button
          onClick={() => navigate('/instagram-reports')}
          className="w-8 h-8 rounded-lg bg-brand hover:bg-brand-hover flex items-center justify-center transition-colors"
        >
          <Plus className="w-4 h-4 text-white" strokeWidth={2} />
        </button>
      </div>

      {/* Reports List */}
      {reports.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-[13px] text-ink-muted">No reports created yet</p>
          <button
            onClick={() => navigate('/instagram-reports')}
            className="mt-3 text-[13px] text-brand hover:text-brand-hover font-medium"
          >
            Create your first report
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map((report) => (
            <div 
              key={report.id}
              className="flex items-center justify-between p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors cursor-pointer group"
              onClick={() => navigate('/instagram-reports')}
            >
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-ink truncate">
                  {report.clientName || 'Untitled Report'}
                </p>
                <p className="text-[11px] text-ink-muted">
                  {report.title || report.dateRange || formatDate(report.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => copyPublicLink(report.publicLinkId, e)}
                  className="w-7 h-7 rounded-lg hover:bg-surface-3 flex items-center justify-center transition-colors"
                  title="Copy public link"
                >
                  {copiedId === report.publicLinkId ? (
                    <Check className="w-3.5 h-3.5 text-positive" strokeWidth={2} />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-ink-muted" strokeWidth={1.5} />
                  )}
                </button>
                <a
                  href={`/report/${report.publicLinkId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="w-7 h-7 rounded-lg hover:bg-surface-3 flex items-center justify-center transition-colors"
                  title="Open report"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-ink-muted" strokeWidth={1.5} />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentReportsWidget;
