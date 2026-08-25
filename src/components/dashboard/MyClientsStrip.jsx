/**
 * MyClientsStrip - The clients you're responsible for, shown directly under the
 * Instagram Analytics and Time Off cards.
 *
 * Each card carries the two things that actually get acted on: how much of the
 * posting package is left, and whether this month's Instagram report is done.
 */

import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, ChevronRight, ArrowUpRight } from 'lucide-react';
import ClientLink from '../ui/ClientLink';
import { getPostsRemaining, getPostsUsed } from '../../utils/clientPostsUtils';
import useInstagramReportStatus from '../../hooks/useInstagramReportStatus';

const INITIAL_VISIBLE = 8;

const REPORT_STATUS = {
  complete: { label: 'Report done', dot: 'bg-[#34c759]', text: 'text-[#1a7a2e] dark:text-[#34c759]' },
  partial: { label: 'Report partial', dot: 'bg-[#ff9500]', text: 'text-[#c26a00] dark:text-[#ff9500]' },
  missing: { label: 'Report missing', dot: 'bg-[#ff3b30]', text: 'text-[#ff3b30]' },
};

const packageHealth = (client) => {
  const remaining = getPostsRemaining(client);
  const packageSize = client.packageSize || 12;
  const percentage = packageSize ? (remaining / packageSize) * 100 : 0;
  if (percentage <= 20) return '#ff3b30';
  if (percentage <= 50) return '#ff9500';
  return '#34c759';
};

const ClientCard = ({ client, status, showReportStatus }) => {
  const postsUsed = getPostsUsed(client);
  const packageSize = client.packageSize || 12;
  const usedPct = packageSize ? Math.min(100, (postsUsed / packageSize) * 100) : 0;
  const accent = packageHealth(client);
  const report = REPORT_STATUS[status];

  return (
    <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-white/5 flex flex-col gap-2.5 isolate">
      <div className="flex items-start gap-2 min-w-0">
        {client.logo ? (
          <img src={client.logo} alt="" className="w-7 h-7 rounded-full object-cover shrink-0 border border-black/5 dark:border-white/10" />
        ) : (
          <div className="w-7 h-7 rounded-full shrink-0 bg-gradient-to-br from-[#0071e3] to-[#5856d6] flex items-center justify-center text-white text-[10px] font-semibold">
            {(client.clientName || client.name || '?').trim().slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <ClientLink client={client} className="!inline text-[13px] sm:text-[14px] font-medium truncate max-w-full" />
          <p className="text-[11px] text-[#86868b] truncate">{client.packageType || client.platform || 'Standard'}</p>
        </div>
      </div>

      {/* Package usage */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-[#86868b]">Posts</span>
          <span className="text-[11px] font-medium text-[#1d1d1f] dark:text-white">{postsUsed}/{packageSize}</span>
        </div>
        <div className="h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${usedPct}%`, backgroundColor: accent }} />
        </div>
      </div>

      {/* Monthly Instagram report status */}
      {showReportStatus && report && (
        status === 'complete' ? (
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${report.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${report.dot}`} />
            {report.label}
          </span>
        ) : (
          <Link
            to={`/instagram-reports?newReport=${encodeURIComponent(client.id)}`}
            className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${report.text} hover:underline`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${report.dot}`} />
            {report.label}
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        )
      )}
    </div>
  );
};

const MyClientsStrip = ({ clientsPath = '/my-clients', showReportStatus = true }) => {
  const [showAll, setShowAll] = useState(false);
  const { clients, rows, loading } = useInstagramReportStatus();

  const statusByClientId = useMemo(() => {
    const m = new Map();
    rows.forEach((r) => m.set(r.client.id, r.status));
    return m;
  }, [rows]);

  const visible = showAll ? clients : clients.slice(0, INITIAL_VISIBLE);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 rounded-2xl skeleton-shimmer" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="text-[15px] sm:text-[17px] font-semibold text-[#1d1d1f] dark:text-white flex items-center gap-2">
          <Users className="w-4 h-4 text-[#0071e3]" strokeWidth={1.75} />
          My Clients
          {clients.length > 0 && <span className="text-[#86868b] font-normal">{clients.length}</span>}
        </h2>
        <Link to={clientsPath} className="text-[13px] text-[#0071e3] font-medium hover:underline flex items-center gap-1">
          View all
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {clients.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-white/5 p-8 text-center">
          <Users className="w-10 h-10 text-[#86868b] mx-auto mb-2" strokeWidth={1.5} />
          <p className="text-[15px] font-medium text-[#1d1d1f] dark:text-white">No clients assigned to you yet</p>
          <p className="text-[13px] text-[#86868b] mt-1">They'll appear here once a manager assigns them.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {visible.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                status={statusByClientId.get(client.id)}
                showReportStatus={showReportStatus}
              />
            ))}
          </div>
          {clients.length > INITIAL_VISIBLE && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="mt-3 text-[13px] font-medium text-[#0071e3] hover:underline"
            >
              {showAll ? 'Show fewer' : `Show all ${clients.length} clients`}
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default MyClientsStrip;
