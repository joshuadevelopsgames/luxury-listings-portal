/**
 * InstagramAnalyticsHero - Primary dashboard card.
 *
 * Answers "who still needs their Instagram report this month?" at a glance and
 * lets you jump straight into creating the missing report for a client.
 */

import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Instagram,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  CalendarDays,
  Sparkles,
} from 'lucide-react';
import useInstagramReportStatus from '../../hooks/useInstagramReportStatus';

const STATUS_STYLES = {
  missing: {
    label: 'Not started',
    dot: 'bg-[#ff3b30]',
    text: 'text-[#ff3b30]',
    chip: 'bg-[#ff3b30]/10 text-[#ff3b30]',
  },
  partial: {
    label: 'Partial',
    dot: 'bg-[#ff9500]',
    text: 'text-[#ff9500]',
    chip: 'bg-[#ff9500]/10 text-[#c26a00] dark:text-[#ff9500]',
  },
};

const initialsOf = (name) => (name || '?')
  .trim()
  .split(/\s+/)
  .slice(0, 2)
  .map((w) => w[0])
  .join('')
  .toUpperCase();

const ClientRow = ({ client, status, onStart }) => {
  const style = STATUS_STYLES[status] || STATUS_STYLES.missing;
  const name = client.clientName || client.name || 'Unnamed client';
  return (
    <button
      type="button"
      onClick={() => onStart(client)}
      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-colors text-left group"
    >
      {client.logo ? (
        <img
          src={client.logo}
          alt=""
          className="w-9 h-9 rounded-full object-cover shrink-0 border border-black/5 dark:border-white/10"
        />
      ) : (
        <div className="w-9 h-9 rounded-full shrink-0 bg-gradient-to-br from-[#e1306c] to-[#f77737] flex items-center justify-center text-white text-[11px] font-semibold">
          {initialsOf(name)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium text-[#1d1d1f] dark:text-white truncate">{name}</p>
        <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${style.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
          {style.label}
        </span>
      </div>
      <span className="shrink-0 flex items-center gap-1 text-[12px] font-medium text-[#0071e3] group-hover:underline">
        {status === 'partial' ? 'Finish' : 'Start'}
        <ArrowUpRight className="w-3.5 h-3.5" />
      </span>
    </button>
  );
};

const InstagramAnalyticsHero = () => {
  const navigate = useNavigate();
  const [showAll, setShowAll] = useState(false);
  const {
    period, outstanding, complete, partial, missing, total, percentComplete, loading,
  } = useInstagramReportStatus();

  const visible = useMemo(
    () => (showAll ? outstanding : outstanding.slice(0, 5)),
    [outstanding, showAll]
  );

  const startReport = (client) => {
    navigate(`/instagram-reports?newReport=${encodeURIComponent(client.id)}`);
  };

  if (loading) {
    return (
      <div className="rounded-2xl bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-white/5 p-5 sm:p-6 animate-pulse min-h-[360px]">
        <div className="h-6 w-48 bg-black/10 dark:bg-white/10 rounded mb-6" />
        <div className="h-10 w-40 bg-black/10 dark:bg-white/10 rounded mb-4" />
        <div className="h-2 w-full bg-black/5 dark:bg-white/5 rounded-full mb-6" />
        <div className="space-y-3">
          <div className="h-12 w-full bg-black/5 dark:bg-white/5 rounded-xl" />
          <div className="h-12 w-full bg-black/5 dark:bg-white/5 rounded-xl" />
          <div className="h-12 w-full bg-black/5 dark:bg-white/5 rounded-xl" />
        </div>
      </div>
    );
  }

  const pct = (n) => (total > 0 ? (n / total) * 100 : 0);
  const allDone = total > 0 && outstanding.length === 0;

  return (
    <div className="rounded-2xl bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-white/5 overflow-hidden flex flex-col min-h-[360px]">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-5 sm:p-6 pb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#e1306c] to-[#f77737] flex items-center justify-center shadow-lg shadow-[#e1306c]/25 shrink-0">
            <Instagram className="w-5 h-5 text-white" strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white truncate">Instagram Analytics</h2>
            <p className="text-[12px] text-[#86868b] flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" />
              {period.label} reports
            </p>
          </div>
        </div>
        <Link
          to="/instagram-reports"
          className="shrink-0 h-9 px-3 sm:px-4 rounded-xl bg-black/5 dark:bg-white/10 text-[13px] font-medium text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15 transition-colors flex items-center gap-1.5"
        >
          Open
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {total === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 pb-8">
          <Instagram className="w-10 h-10 text-[#86868b] mb-3" strokeWidth={1.5} />
          <p className="text-[15px] font-medium text-[#1d1d1f] dark:text-white">No clients assigned</p>
          <p className="text-[13px] text-[#86868b] mt-1">Instagram reports will show up here once you have clients.</p>
        </div>
      ) : (
        <>
          {/* Progress */}
          <div className="px-5 sm:px-6">
            <div className="flex items-end justify-between gap-4 mb-3">
              <div>
                <p className="text-[34px] leading-none font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em]">
                  {complete}
                  <span className="text-[20px] text-[#86868b] font-normal"> / {total}</span>
                </p>
                <p className="text-[13px] text-[#86868b] mt-1.5">reports complete · {percentComplete}%</p>
              </div>
              {outstanding.length > 0 && (
                <div className="text-right">
                  <p className="text-[28px] leading-none font-semibold text-[#ff3b30] tracking-[-0.02em]">{outstanding.length}</p>
                  <p className="text-[12px] text-[#86868b] mt-1.5">still to do</p>
                </div>
              )}
            </div>

            {/* Segmented bar */}
            <div className="h-2.5 w-full rounded-full bg-black/5 dark:bg-white/10 overflow-hidden flex">
              <div className="h-full bg-[#34c759] transition-all" style={{ width: `${pct(complete)}%` }} />
              <div className="h-full bg-[#ff9500] transition-all" style={{ width: `${pct(partial)}%` }} />
              <div className="h-full bg-[#ff3b30]/70 transition-all" style={{ width: `${pct(missing)}%` }} />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5 text-[12px] text-[#86868b]">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#34c759]" />{complete} complete</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#ff9500]" />{partial} partial</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#ff3b30]" />{missing} missing</span>
            </div>
          </div>

          {/* Outstanding clients */}
          <div className="mt-5 flex-1 min-h-0 flex flex-col">
            {allDone ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-6 pb-8">
                <div className="w-12 h-12 rounded-2xl bg-[#34c759]/10 flex items-center justify-center mb-3">
                  <Sparkles className="w-6 h-6 text-[#34c759]" strokeWidth={1.5} />
                </div>
                <p className="text-[15px] font-medium text-[#1d1d1f] dark:text-white">Every client is done for {period.label}</p>
                <p className="text-[13px] text-[#86868b] mt-1">Nice work — nothing outstanding.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between px-5 sm:px-6 pb-2">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#86868b] flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#ff9500]" />
                    Needs a report
                  </h3>
                  {outstanding.length > 5 && (
                    <button
                      type="button"
                      onClick={() => setShowAll((v) => !v)}
                      className="text-[12px] font-medium text-[#0071e3] hover:underline"
                    >
                      {showAll ? 'Show less' : `Show all ${outstanding.length}`}
                    </button>
                  )}
                </div>
                <div className="widget-scroll overflow-auto px-3 sm:px-3.5 pb-3 max-h-[320px]">
                  {visible.map(({ client, status }) => (
                    <ClientRow key={client.id} client={client} status={status} onStart={startReport} />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Footer action */}
          <div className="p-4 sm:p-5 pt-0">
            <Link
              to="/instagram-reports"
              className="w-full h-11 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-[14px] font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#0071e3]/20"
            >
              {allDone ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  View all reports
                </>
              ) : (
                <>
                  <Instagram className="w-4 h-4" />
                  Go to Instagram Analytics
                </>
              )}
            </Link>
          </div>
        </>
      )}
    </div>
  );
};

export default InstagramAnalyticsHero;
