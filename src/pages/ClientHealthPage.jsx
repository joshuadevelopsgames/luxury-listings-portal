/**
 * Client Health Overview - Admin view of AI health for all clients.
 * Shows monthly snapshot (from scheduled run) and allows "Run all" to refresh.
 * Account managers still use My Clients with on-demand prediction + optional snapshot.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { firestoreService } from '../services/firestoreService';
import { openaiService } from '../services/openaiService';
import { getFunctions, httpsCallable } from 'firebase/functions';
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

const functions = getFunctions();

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
        firestoreService.getClients(),
        firestoreService.getClientHealthSnapshots(),
        firestoreService.getApprovedUsers()
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
      const runBulkFn = httpsCallable(functions, 'runBulkHealthPrediction');
      const result = await runBulkFn();
      toast.success(`Updated ${result.data?.processed ?? 0} clients`);
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
      const reports = await firestoreService.getClientInstagramReportHistory(client.id, 6);
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
    good: { color: 'text-[#34c759]', bg: 'bg-[#34c759]/10' },
    warning: { color: 'text-[#ff9500]', bg: 'bg-[#ff9500]/10' },
    critical: { color: 'text-[#ff3b30]', bg: 'bg-[#ff3b30]/10' }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-[28px] sm:text-[34px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em]">
            Client Health Overview
          </h1>
          <p className="text-[15px] text-[#86868b] mt-1">
            AI health status for all clients. Runs automatically 3 days before month end; you can run manually below.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={runBulk}
            disabled={runningBulk}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0071e3] text-white text-[13px] font-medium hover:opacity-90 disabled:opacity-50"
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
        <Filter className="w-4 h-4 text-[#86868b]" />
        <span className="text-[12px] text-[#86868b]">Status:</span>
        {['all', 'good', 'warning', 'critical'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-2.5 py-1 rounded-lg text-[12px] font-medium ${
              filterStatus === status
                ? status === 'all'
                  ? 'bg-[#0071e3] text-white'
                  : statusColors[status]
                    ? `${statusColors[status].bg} ${statusColors[status].color}`
                    : 'bg-black/10 text-[#1d1d1f] dark:bg-white/10 dark:text-white'
                : 'bg-black/5 dark:bg-white/5 text-[#86868b] hover:bg-black/10 dark:hover:bg-white/10'
            }`}
          >
            {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-2xl bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/10 p-8 text-center text-[#86868b]">
          Loading…
        </div>
      ) : (
        <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-black/5 dark:border-white/10">
                  <th className="text-left py-3 px-4 text-[11px] font-medium text-[#86868b] uppercase tracking-wide">Client</th>
                  <th className="text-left py-3 px-4 text-[11px] font-medium text-[#86868b] uppercase tracking-wide">Manager</th>
                  <th className="text-left py-3 px-4 text-[11px] font-medium text-[#86868b] uppercase tracking-wide">Status</th>
                  <th className="text-left py-3 px-4 text-[11px] font-medium text-[#86868b] uppercase tracking-wide">Churn risk</th>
                  <th className="text-left py-3 px-4 text-[11px] font-medium text-[#86868b] uppercase tracking-wide">Insight</th>
                  <th className="text-left py-3 px-4 text-[11px] font-medium text-[#86868b] uppercase tracking-wide">As of</th>
                  <th className="text-left py-3 px-4 text-[11px] font-medium text-[#86868b] uppercase tracking-wide">Actions</th>
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
                          <span className="text-[#ff9500] font-medium">Unassigned</span>
                        ) : (
                          <span className="text-[#34c759] font-medium">{managerLabel}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {snap ? (
                          <span className={`text-[11px] px-2 py-1 rounded-md font-medium ${style ? style.bg + ' ' + style.color : ''}`}>
                            {snap.status === 'good' ? 'Healthy' : snap.status === 'warning' ? 'Watch' : 'At risk'}
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#86868b]">No snapshot</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[12px] text-[#1d1d1f] dark:text-white">
                        {snap?.churnRisk != null ? `${snap.churnRisk}%` : '—'}
                      </td>
                      <td className="py-3 px-4 text-[12px] text-[#1d1d1f] dark:text-white max-w-[200px] truncate" title={snap?.reason}>
                        {snap?.reason || '—'}
                      </td>
                      <td className="py-3 px-4 text-[11px] text-[#86868b]">
                        {snap?.timestamp ? format(new Date(snap.timestamp), 'MMM d, yyyy') : '—'}
                      </td>
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => refreshOne(client)}
                          disabled={!!refreshingId}
                          className="p-1.5 rounded-lg bg-black/5 dark:bg-white/10 text-[#86868b] hover:bg-black/10 dark:hover:bg-white/15 disabled:opacity-50"
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
            <div className="p-8 text-center text-[#86868b] text-[13px]">
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
            className="bg-white dark:bg-[#1d1d1f] rounded-2xl border border-black/10 dark:border-white/10 shadow-2xl w-full max-w-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  reportClient.snap?.status === 'good' ? 'bg-[#34c759]/10' :
                  reportClient.snap?.status === 'warning' ? 'bg-[#ff9500]/10' :
                  reportClient.snap?.status === 'critical' ? 'bg-[#ff3b30]/10' : 'bg-black/5 dark:bg-white/10'
                }`}>
                  <FileText className={`w-5 h-5 ${
                    reportClient.snap?.status === 'good' ? 'text-[#34c759]' :
                    reportClient.snap?.status === 'warning' ? 'text-[#ff9500]' :
                    reportClient.snap?.status === 'critical' ? 'text-[#ff3b30]' : 'text-[#86868b]'
                  }`} />
                </div>
                <div>
                  <h2 className="text-[18px] font-semibold text-[#1d1d1f] dark:text-white">Health Report</h2>
                  <p className="text-[13px] text-[#86868b]">{reportClient.client.clientName || reportClient.client.name || 'Client'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReportClient(null)}
                className="w-8 h-8 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-[#86868b]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-[13px]">
                <div>
                  <p className="text-[#86868b] mb-0.5">Manager</p>
                  <p className="font-medium text-[#1d1d1f] dark:text-white">
                    {!reportClient.client.assignedManager || (reportClient.client.assignedManager || '').trim() === '' ? (
                      <span className="text-[#ff9500]">Unassigned</span>
                    ) : (() => {
                      const raw = (reportClient.client.assignedManager || '').trim();
                      const resolved = assignedUserByKey[raw.toLowerCase()] || assignedUserByKey[raw];
                      return resolved?.label && resolved.label !== '—' ? resolved.label : raw;
                    })()}
                  </p>
                </div>
                <div>
                  <p className="text-[#86868b] mb-0.5">Status</p>
                  <p className="font-medium">
                    {reportClient.snap ? (
                      <span className={reportClient.snap.status ? statusColors[reportClient.snap.status]?.color : ''}>
                        {reportClient.snap.status === 'good' ? 'Healthy' : reportClient.snap.status === 'warning' ? 'Watch' : reportClient.snap.status === 'critical' ? 'At risk' : '—'}
                      </span>
                    ) : (
                      <span className="text-[#86868b]">No snapshot</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-[#86868b] mb-0.5">Churn risk</p>
                  <p className="font-medium text-[#1d1d1f] dark:text-white">
                    {reportClient.snap?.churnRisk != null ? `${reportClient.snap.churnRisk}%` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[#86868b] mb-0.5">As of</p>
                  <p className="font-medium text-[#1d1d1f] dark:text-white">
                    {reportClient.snap?.timestamp ? format(new Date(reportClient.snap.timestamp), 'MMM d, yyyy') : '—'}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-[#86868b] text-[12px] font-medium uppercase tracking-wide mb-1.5">Insight</p>
                <p className="text-[14px] text-[#1d1d1f] dark:text-white leading-relaxed">
                  {reportClient.snap?.reason || 'No insight available.'}
                </p>
              </div>
              {reportClient.snap?.action && (
                <div>
                  <p className="text-[#86868b] text-[12px] font-medium uppercase tracking-wide mb-1.5">Recommended action</p>
                  <p className="text-[14px] text-[#1d1d1f] dark:text-white leading-relaxed">
                    {reportClient.snap.action}
                  </p>
                </div>
              )}
            </div>
            <div className="px-6 py-3 border-t border-black/5 dark:border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setReportClient(null)}
                className="px-4 py-2 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[13px] font-medium hover:bg-black/10 dark:hover:bg-white/15"
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
