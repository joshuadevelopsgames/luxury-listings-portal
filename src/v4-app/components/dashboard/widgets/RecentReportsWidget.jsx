import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Instagram, Plus, Copy, Check } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
export default function RecentReportsWidget() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('instagram_reports')
          .select('id, period_start, period_end, public_link_id, is_public, client:clients(name)')
          .eq('archived', false)
          .order('created_at', { ascending: false })
          .limit(4);
        if (error) throw error;
        setReports(data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const copyLink = async (publicLinkId, e) => {
    e.stopPropagation();
    const link = `${window.location.origin}/report/${publicLinkId}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(publicLinkId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[280px] sm:h-[327px] sm:min-h-[327px] widget-scroll overflow-auto bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-4 sm:p-6 border border-black/5 dark:border-white/10 animate-pulse">
        <div className="h-5 w-32 bg-black/10 dark:bg-white/10 rounded mb-4" />
      </div>
    );
  }

  return (
    <div className="min-h-[280px] sm:h-[327px] sm:min-h-[327px] widget-scroll overflow-auto bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-4 sm:p-6 border border-black/5 dark:border-white/10">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#e1306c] to-[#f77737] flex items-center justify-center shadow-lg shadow-[#e1306c]/20">
            <Instagram className="w-4 h-4 text-white" strokeWidth={1.5} />
          </div>
          <h3 className="font-semibold text-[15px] text-[#1d1d1f] dark:text-white">Instagram Analytics</h3>
        </div>
        <button
          type="button"
          onClick={() => navigate('/v4/instagram-reports')}
          className="w-8 h-8 rounded-lg bg-[#0071e3] hover:bg-[#0077ed] flex items-center justify-center transition-colors"
        >
          <Plus className="w-4 h-4 text-white" strokeWidth={2} />
        </button>
      </div>

      {reports.length === 0 ? (
        <p className="text-[13px] text-[#86868b] text-center py-6">No reports yet</p>
      ) : (
        <div className="space-y-2">
          {reports.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-2 p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02]"
            >
              <button type="button" onClick={() => navigate('/v4/instagram-reports')} className="text-left min-w-0 flex-1">
                <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white truncate">{r.client?.name || 'Client'}</p>
                <p className="text-[11px] text-[#86868b]">
                  {r.period_start} – {r.period_end}
                </p>
              </button>
              {r.is_public && r.public_link_id && (
                <button
                  type="button"
                  onClick={(e) => copyLink(r.public_link_id, e)}
                  className="shrink-0 w-8 h-8 rounded-lg bg-black/5 dark:bg-white/10 flex items-center justify-center"
                >
                  {copiedId === r.public_link_id ? (
                    <Check className="w-4 h-4 text-[#34c759]" />
                  ) : (
                    <Copy className="w-4 h-4 text-[#86868b]" />
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
