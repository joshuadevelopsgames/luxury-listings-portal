/**
 * Client Health Overview - Admin view of AI health for all clients.
 * Shows monthly snapshot (from scheduled run) and allows "Run all" to refresh.
 * Account managers still use My Clients with on-demand prediction + optional snapshot.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabaseService } from '../services/supabaseService';
import { openaiService } from '../services/openaiService';
// Edge functions removed — AI calls go through openaiService (OpenRouter)
import {
  Activity,
  RefreshCw,
  Sparkles,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Filter,
  Calendar,
  X,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import ClientLink from '../components/ui/ClientLink';

const ClientHealthPage = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [runningBulk, setRunningBulk] = useState(false);
  const [clients, setClients] = useState([]);
  const [snapshots, setSnapshots] = useState({});
  const [assignedUserByKey, setAssignedUserByKey] = useState({}); // email/uid -> { uid, displayName }
  const [filterStatus, setFilterStatus] = useState('all');
  const [refreshingId, setRefreshingId] = useState(null);
  const [reportClient, setReportClient] = useState(null); // { client, snap } for health report modal

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [clientsList, snapMap, usersList] = await Promise.all([
        supabaseService.getClients(),
        supabaseService.getClientHealthSnapshots(),
        supabaseService.getApprovedUsers()
      ]);
      setClients(clientsList);
      setSnapshots(snapMap);
      const byKey = {};
      (usersList || []).forEach((u) => {
        const uid = u.uid || u.userId || u.id;
        const email = (u.email || u.id || '').toLowerCase();
        const label = u.displayName
          || ((u.firstName || u.lastName) ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : null)
          || u.name
          || u.email
          || u.id
          || uid
          || '—';
        const entry = { label };
        if (email) byKey[email] = entry;
        if (uid) byKey[uid] = entry;
        if (u.id && !byKey[u.id]) byKey[u.id] = entry;
      });
      setAssignedUserByKey(byKey);
    } catch (err) {
      console.error('Error loading client health data:', err);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const runBulk = async () => {
    try {
      setRunningBulk(true);
      // Process each client through OpenRouter instead of edge function
      const allClients = await supabaseService.getClients();
      let processed = 0;
      for (const client of allClients) {
        try {
          const reports = await supabaseService.getClientInstagramReportHistory(client.id, 6);
          const reportHistory = reports?.length
            ? reports.map((r) => ({ dateRange: r.dateRange, startDate: r.startDate, metrics: r.metrics || {} }))
            : null;
          const clientData = {
            clientName: client.clientName || 'Unknown',
            postsRemaining: client.postsRemaining ?? 0,
            packageSize: client.packageSize ?? 12,
            postsUsed: client.postsUsed ?? 0,
            paymentStatus: client.paymentStatus || 'unknown',
            packageType: client.packageType || 'unknown',
          };
          await openaiService.predictClientHealth(clientData, reportHistory);
          processed++;
        } catch (e) { console.warn(`Health check failed for ${client.clientName}:`, e); }
      }
      toast.success(`Updated ${processed} clients`);
      await loadData();
    } catch (err) {
      console.error('Bulk health run failed:', err);
      toast.error(err.message || 'Bulk run failed');
    } finally {
      setRunningBulk(false);
    }
  };

  const refreshOne = async (client) => {
    if (refreshingId) return;
    setRefreshingId(client.id);
    try {
      const reports = await supabaseService.getClientInstagramReportHistory(client.id, 6);
      const reportHistory = reports?.length
        ? reports.map((r) => ({
            dateRange: r.dateRange || `${r.startDate || ''} - ${r.endDate || ''}`,
            startDate: r.startDate,
            metrics: r.metrics || {}
          }))
        : null;
      const clientData = {
        clientName: client.clientName || 'Unknown',
        postsRemaining: client.postsRemaining ?? 0,
        packageSize: client.packageSize ?? 12,
        postsUsed: client.postsUsed ?? 0,
        paymentStatus: client.paymentStatus || 'unknown',
        packageType: client.packageType || 'unknown',
        daysSinceContact: null,
        daysUntilRenewal: null,
        createdAt: client.createdAt || null,
        lastPostDate: client.lastPostDate || null,
        notes: client.notes || ''
      };
      const prediction = await openaiService.predictClientHealth(clientData, reportHistory);
      setSnapshots((prev) => ({
        ...prev,
        [client.id]: {
          ...prediction,
          healthScore: prediction.healthScore ?? (prediction.churnRisk != null ? Math.round(100 - prediction.churnRisk) : undefined),
          clientName: client.clientName,
          assignedManager: client.assignedManager,
          timestamp: new Date().toISOString()
        }
      }));
      toast.success(`Updated ${client.clientName}`);
    } catch (err) {
      console.error('Refresh failed:', err);
      toast.error('Refresh failed');
    } finally {
      setRefreshingId(null);
    }
  };

  const filteredClients = clients.filter((c) => {
    if (filterStatus === 'all') return true;
    const snap = snapshots[c.id];
    return snap?.status === filterStatus;
  });

  const statusColors = {
    good: { color: 'text-positive', bg: 'bg-positive/10' },
    warning: { color: 'text-warning', bg: 'bg-warning/10' },
    critical: { color: 'text-danger', bg: 'bg-danger/10' }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-[28px] sm:text-[34px] font-semibold text-ink tracking-[-0.02em]">
            Client Health Overview
          </h1>
          <p className="text-[15px] text-ink-muted mt-1">
            Score out of 100 per client (100 = doing exceptionally well), from insights reports and deliverables. Runs automatically 3 days before month end; you can run manually below.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={runBulk}
            disabled={runningBulk}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand text-white text-[13px] font-medium hover:opacity-90 disabled:opacity-50"
          >
            {runningBulk ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {runningBulk ? 'Running…' : 'Run all'}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-ink-muted" />
        <span className="text-[12px] text-ink-muted">Status:</span>
        {['all', 'good', 'warning', 'critical'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-2.5 py-1 rounded-lg text-[12px] font-medium ${
              filterStatus === status
                ? status === 'all'
                  ? 'bg-brand text-white'
                  : statusColors[status]
                    ? `${statusColors[status].bg} ${statusColors[status].color}`
                    : 'bg-black/10 text-ink dark:bg-white/10 dark:text-white'
                : 'bg-surface-3 text-ink-muted hover:bg-black/10 dark:hover:bg-white/10'
            }`}
          >
            {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-xl bg-surface border border-hairline p-8 text-center text-ink-muted">
          Loading…
        </div>
      ) : (
        <div className="rounded-xl bg-surface backdrop-blur-xl border border-hairline overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-hairline">
                  <th className="text-left py-3 px-4 text-[11px] font-medium text-ink-muted uppercase tracking-wide">Client</th>
                  <th className="text-left py-3 px-4 text-[11px] font-medium text-ink-muted uppercase tracking-wide">Manager</th>
                  <th className="text-left py-3 px-4 text-[11px] font-medium text-ink-muted uppercase tracking-wide">Status</th>
                  <th className="text-left py-3 px-4 text-[11px] font-medium text-ink-muted uppercase tracking-wide">Score</th>
                  <th className="text-left py-3 px-4 text-[11px] font-medium text-ink-muted uppercase tracking-wide">Insight</th>
                  <th className="text-left py-3 px-4 text-[11px] font-medium text-ink-muted uppercase tracking-wide">As of</th>
                  <th className="text-left py-3 px-4 text-[11px] font-medium text-ink-muted uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => {
                  const snap = snapshots[client.id];
                  const style = snap?.status ? statusColors[snap.status] : null;
                  const managerLabel = !client.assignedManager || (client.assignedManager || '').trim() === ''
                    ? 'Unassigned'
                    : (() => {
                        const raw = (client.assignedManager || '').trim();
                        const resolved = assignedUserByKey[raw.toLowerCase()] || assignedUserByKey[raw];
                        return resolved?.label && resolved.label !== '—' ? resolved.label : (raw.includes('@') ? raw : 'Unknown');
                      })();
                  return (
                    <tr
                      key={client.id}
                      onClick={() => setReportClient({ client, snap })}
                      className="border-b border-black/5 dark:border-white/5 hover:bg-black/[0.02] dark:hover:bg-white/5 cursor-pointer"
                    >
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <ClientLink client={client} showId />
                      </td>
                      <td className="py-3 px-4 text-[12px]">
                        {managerLabel === 'Unassigned' ? (
                          <span className="text-warning font-medium">Unassigned</span>
                        ) : (
                          <span className="text-positive font-medium">{managerLabel}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {snap ? (
                          <span className={`text-[11px] px-2 py-1 rounded-md font-medium ${style ? style.bg + ' ' + style.color : ''}`}>
                            {snap.status === 'good' ? 'Healthy' : snap.status === 'warning' ? 'Watch' : 'At risk'}
                          </span>
                        ) : (
                          <span className="text-[11px] text-ink-muted">No snapshot</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[12px] text-ink font-medium">
                        {snap?.healthScore != null ? `${snap.healthScore}/100` : '—'}
                      </td>
                      <td className="py-3 px-4 text-[12px] text-ink max-w-[200px] truncate" title={snap?.reason}>
                        {snap?.reason || '—'}
                      </td>
                      <td className="py-3 px-4 text-[11px] text-ink-muted">
                        {snap?.timestamp ? format(new Date(snap.timestamp), 'MMM d, yyyy') : '—'}
                      </td>
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => refreshOne(client)}
                          disabled={!!refreshingId}
                          className="p-1.5 rounded-lg bg-surface-3 text-ink-muted hover:bg-hairline-strong disabled:opacity-50"
                          title="Refresh this client (on-demand prediction)"
                        >
                          <RefreshCw className={`w-4 h-4 ${refreshingId === client.id ? 'animate-spin' : ''}`} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredClients.length === 0 && (
            <div className="p-8 text-center text-ink-muted text-[13px]">
              No clients match the filter.
            </div>
          )}
        </div>
      )}

      {/* Health Report Modal */}
      {reportClient && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setReportClient(null)}
        >
          <div
            className="bg-surface rounded-xl border border-hairline-strong shadow-lg w-full max-w-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-hairline">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  reportClient.snap?.status === 'good' ? 'bg-positive/10' :
                  reportClient.snap?.status === 'warning' ? 'bg-warning/10' :
                  reportClient.snap?.status === 'critical' ? 'bg-danger/10' : 'bg-surface-3'
                }`}>
                  <FileText className={`w-5 h-5 ${
                    reportClient.snap?.status === 'good' ? 'text-positive' :
                    reportClient.snap?.status === 'warning' ? 'text-warning' :
                    reportClient.snap?.status === 'critical' ? 'text-danger' : 'text-ink-muted'
                  }`} />
                </div>
                <div>
                  <h2 className="text-[18px] font-semibold text-ink">Health Report</h2>
                  <p className="text-[13px] text-ink-muted">{reportClient.client.clientName || reportClient.client.name || 'Client'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReportClient(null)}
                className="w-8 h-8 rounded-full hover:bg-surface-3 flex items-center justify-center text-ink-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-[13px]">
                <div>
                  <p className="text-ink-muted mb-0.5">Manager</p>
                  <p className="font-medium text-ink">
                    {!reportClient.client.assignedManager || (reportClient.client.assignedManager || '').trim() === '' ? (
                      <span className="text-warning">Unassigned</span>
                    ) : (() => {
                      const raw = (reportClient.client.assignedManager || '').trim();
                      const resolved = assignedUserByKey[raw.toLowerCase()] || assignedUserByKey[raw];
                      return resolved?.label && resolved.label !== '—' ? resolved.label : raw;
                    })()}
                  </p>
                </div>
                <div>
                  <p className="text-ink-muted mb-0.5">Status</p>
                  <p className="font-medium">
                    {reportClient.snap ? (
                      <span className={reportClient.snap.status ? statusColors[reportClient.snap.status]?.color : ''}>
                        {reportClient.snap.status === 'good' ? 'Healthy' : reportClient.snap.status === 'warning' ? 'Watch' : reportClient.snap.status === 'critical' ? 'At risk' : '—'}
                      </span>
                    ) : (
                      <span className="text-ink-muted">No snapshot</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-ink-muted mb-0.5">Score</p>
                  <p className="font-medium text-ink">
                    {reportClient.snap?.healthScore != null ? `${reportClient.snap.healthScore}/100` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-ink-muted mb-0.5">As of</p>
                  <p className="font-medium text-ink">
                    {reportClient.snap?.timestamp ? format(new Date(reportClient.snap.timestamp), 'MMM d, yyyy') : '—'}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-ink-muted text-[12px] font-medium uppercase tracking-wide mb-1.5">Insight</p>
                <p className="text-[14px] text-ink leading-relaxed">
                  {reportClient.snap?.reason || 'No insight available.'}
                </p>
              </div>
              {reportClient.snap?.action && (
                <div>
                  <p className="text-ink-muted text-[12px] font-medium uppercase tracking-wide mb-1.5">Recommended action</p>
                  <p className="text-[14px] text-ink leading-relaxed">
                    {reportClient.snap.action}
                  </p>
                </div>
              )}
            </div>
            <div className="px-6 py-3 border-t border-hairline flex justify-end">
              <button
                type="button"
                onClick={() => setReportClient(null)}
                className="px-4 py-2 rounded-xl bg-surface-3 text-ink text-[13px] font-medium hover:bg-hairline-strong"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientHealthPage;
