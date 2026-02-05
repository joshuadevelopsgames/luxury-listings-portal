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
  Calendar
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
  const [filterStatus, setFilterStatus] = useState('all');
  const [refreshingId, setRefreshingId] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [clientsList, snapMap] = await Promise.all([
        firestoreService.getClients(),
        firestoreService.getClientHealthSnapshots()
      ]);
      setClients(clientsList);
      setSnapshots(snapMap);
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
        packageSize: client.packageSize ?? 10,
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
                  return (
                    <tr
                      key={client.id}
                      className="border-b border-black/5 dark:border-white/5 hover:bg-black/[0.02] dark:hover:bg-white/5"
                    >
                      <td className="py-3 px-4">
                        <ClientLink client={client} showId />
                      </td>
                      <td className="py-3 px-4 text-[12px] text-[#86868b]">{client.assignedManager || '—'}</td>
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
                      <td className="py-3 px-4">
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
    </div>
  );
};

export default ClientHealthPage;
