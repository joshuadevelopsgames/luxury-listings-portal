/**
 * MyClientsPage - Account manager's view of their assigned clients
 * 
 * Shows clients assigned to the current user with:
 * - Client overview cards
 * - Package utilization
 * - Deliverable status
 * - Quick actions
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { format, differenceInDays, parseISO, startOfMonth } from 'date-fns';
import { useAuth } from '../../../contexts/AuthContext';
import { useClients } from '../../../contexts/ClientsContext';
import { usePermissions } from '../../../contexts/PermissionsContext';
import { firestoreService } from '../../../services/firestoreService';
import { openaiService } from '../../../services/openaiService';
import PlatformIcons from '../../../components/PlatformIcons';
import ClientLink from '../../../components/ui/ClientLink';
import ClientDetailModal from '../../../components/client/ClientDetailModal';
import { useOpenClientCard } from '../../../hooks/useOpenClientCard';
import EditPostsLoggedModal from '../../../components/ui/EditPostsLoggedModal';
import PostLogReminderBanner from '../../../components/dashboard/PostLogReminderBanner';
import { postLogReminderService } from '../../../services/postLogReminderService';
import { getGmailComposeUrl } from '../../../utils/gmailCompose';
import { getPostsRemaining, getPostsUsed, getPostLogUpdate } from '../../../utils/clientPostsUtils';
import { toast } from 'react-hot-toast';
import { 
  Users, 
  Package, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle,
  Clock,
  ChevronRight,
  Search,
  Filter,
  MoreHorizontal,
  Mail,
  Phone,
  Calendar,
  FileText,
  X,
  ExternalLink,
  Building2,
  CreditCard,
  Instagram,
  Globe,
  MapPin,
  DollarSign,
  Plus,
  Youtube,
  Facebook,
  Linkedin,
  RefreshCw,
  Sparkles,
  Info,
  Pencil,
  History,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const MyClientsPage = () => {
  const navigate = useNavigate();
  const { currentUser, isViewingAs } = useAuth();
  const { isSystemAdmin } = usePermissions();
  const { clients: allClients, loading: clientsLoading, getClientById } = useClients();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const { clientForModal, openClientCard, closeClientCard } = useOpenClientCard();
  const [showEditPostsModal, setShowEditPostsModal] = useState(false);
  const [editPostsClient, setEditPostsClient] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [postLogHistory, setPostLogHistory] = useState([]);
  const [postLogHistoryLoading, setPostLogHistoryLoading] = useState(false);
  const [expandedHistoryMonth, setExpandedHistoryMonth] = useState(null);
  const [logPostClient, setLogPostClient] = useState(null);
  const [logPlatform, setLogPlatform] = useState('instagram');
  const [logSaving, setLogSaving] = useState(false);
  const [postLogBanner, setPostLogBanner] = useState({ show: false, clientNames: [] });

  // AI Health Prediction state
  const [aiHealthPredictions, setAiHealthPredictions] = useState({}); // { clientId: { status, churnRisk, reason, action, timestamp } }
  const [clientHealthSnapshots, setClientHealthSnapshots] = useState({}); // from monthly run (admin) - { clientId: { status, churnRisk, reason, action, timestamp } }
  const [loadingAiHealth, setLoadingAiHealth] = useState({}); // { clientId: boolean }
  const [showAiTooltip, setShowAiTooltip] = useState(null); // clientId to show tooltip for

  // currentUser is effective user (viewed-as when View As)
  const isAssignedToMe = (client) => {
    const am = (client.assignedManager || '').trim().toLowerCase();
    if (!am) return false;
    const email = (currentUser?.email || '').trim().toLowerCase();
    const uid = (currentUser?.uid || '').trim().toLowerCase();
    return am === email || (uid && am === uid);
  };

  const clients = useMemo(
    () => allClients.filter(isAssignedToMe),
    [allClients, currentUser?.email, currentUser?.uid]
  );

  // Friday: post-log reminder banner (SMM)
  useEffect(() => {
    if (!currentUser?.email || !postLogReminderService.isFriday()) return;
    postLogReminderService.getBannerState(currentUser.email, currentUser.uid).then((b) => {
      setPostLogBanner({ show: b.show, clientNames: b.clientNames });
    }).catch(() => {});
  }, [currentUser?.email, currentUser?.uid]);

  useEffect(() => {
    const loadSnapshots = async () => {
      if (!currentUser?.email && !currentUser?.uid) return;
      try {
        const snapshots = await firestoreService.getClientHealthSnapshots();
        setClientHealthSnapshots(snapshots);
        console.log(`📋 Loaded health snapshots for ${currentUser?.email}${isViewingAs ? ' (View As mode)' : ''}`);
      } catch (error) {
        console.error('Error loading health snapshots:', error);
      }
    };
    loadSnapshots();
  }, [currentUser?.email, currentUser?.uid, isViewingAs]);

  useEffect(() => {
    firestoreService.getApprovedUsers().then(setEmployees).catch(() => {});
  }, []);

  useEffect(() => {
    if (!editPostsClient?.id || !isSystemAdmin) {
      setPostLogHistory([]);
      return;
    }
    let cancelled = false;
    setPostLogHistoryLoading(true);
    firestoreService.getPostLogTasksByClient(editPostsClient.id, { limit: 500 })
      .then((tasks) => {
        if (cancelled) return;
        setPostLogHistory(tasks);
      })
      .catch(() => { if (!cancelled) setPostLogHistory([]); })
      .finally(() => { if (!cancelled) setPostLogHistoryLoading(false); });
    return () => { cancelled = true; };
  }, [editPostsClient?.id, isSystemAdmin]);

  const postLogByMonth = useMemo(() => {
    const byMonth = new Map();
    postLogHistory.forEach((task) => {
      const raw = task.completed_date || task.created_date || '';
      const date = raw ? (raw.slice ? parseISO(raw.split('T')[0]) : new Date(raw)) : null;
      const key = date ? format(startOfMonth(date), 'yyyy-MM') : 'unknown';
      if (!byMonth.has(key)) byMonth.set(key, { label: date ? format(date, 'MMMM yyyy') : 'Unknown', tasks: [] });
      byMonth.get(key).tasks.push(task);
    });
    return Array.from(byMonth.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, { label, tasks }]) => ({ key, label, tasks }));
  }, [postLogHistory]);

  const getHealthStatus = (client) => {
    const postsRemaining = getPostsRemaining(client);
    const packageSize = client.packageSize || 12;
    const percentage = packageSize ? (postsRemaining / packageSize) * 100 : 0;
    
    if (percentage <= 20) return { status: 'critical', color: 'text-[#ff3b30]', bgColor: 'bg-[#ff3b30]/10', label: 'Low Posts' };
    if (percentage <= 50) return { status: 'warning', color: 'text-[#ff9500]', bgColor: 'bg-[#ff9500]/10', label: 'Medium' };
    return { status: 'good', color: 'text-[#34c759]', bgColor: 'bg-[#34c759]/10', label: 'On Track' };
  };

  const getPaymentStatusStyle = (status) => {
    if (status === 'Paid') return 'text-[#34c759] bg-[#34c759]/10';
    if (status === 'Pending') return 'text-[#ff9500] bg-[#ff9500]/10';
    return 'text-[#ff3b30] bg-[#ff3b30]/10';
  };

  // Fetch AI health prediction for a client (with caching)
  // Enhanced to pull Instagram report history for trend analysis
  const fetchAiHealthPrediction = useCallback(async (client) => {
    const clientId = client.id;

    // Check cache first (24 hour expiry)
    const cached = aiHealthPredictions[clientId];
    if (cached && cached.timestamp && (Date.now() - cached.timestamp) < 24 * 60 * 60 * 1000) {
      return cached;
    }

    // Check localStorage cache
    const storageKey = `ai_health_${clientId}`;
    const storedCache = localStorage.getItem(storageKey);
    if (storedCache) {
      try {
        const parsed = JSON.parse(storedCache);
        if (parsed.timestamp && (Date.now() - parsed.timestamp) < 24 * 60 * 60 * 1000) {
          setAiHealthPredictions(prev => ({ ...prev, [clientId]: parsed }));
          return parsed;
        }
      } catch (e) {
        // Invalid cache, continue to fetch
      }
    }

    setLoadingAiHealth(prev => ({ ...prev, [clientId]: true }));

    try {
      // Prepare client data for AI
      const now = new Date();
      const lastContact = client.lastContactDate ? new Date(client.lastContactDate) : null;
      const renewalDate = client.renewalDate ? new Date(client.renewalDate) : null;

      const clientData = {
        clientName: client.clientName || 'Unknown',
        postsRemaining: getPostsRemaining(client),
        packageSize: client.packageSize || 12,
        postsUsed: getPostsUsed(client),
        paymentStatus: client.paymentStatus || 'unknown',
        packageType: client.packageType || 'Standard',
        daysSinceContact: lastContact ? differenceInDays(now, lastContact) : null,
        daysUntilRenewal: renewalDate ? differenceInDays(renewalDate, now) : null,
        createdAt: client.createdAt || null,
        lastPostDate: client.lastPostDate || null,
        notes: client.notes || ''
      };

      // Fetch Instagram report history for trend analysis (last 6 months)
      let reportHistory = null;
      try {
        const reports = await firestoreService.getClientInstagramReportHistory(clientId, 6);
        if (reports && reports.length > 0) {
          // Prepare report data for AI (only send essential metrics to reduce payload)
          reportHistory = reports.map(report => ({
            dateRange: report.dateRange || `${report.startDate} - ${report.endDate}`,
            startDate: report.startDate,
            metrics: {
              followers: report.metrics?.followers,
              views: report.metrics?.views,
              interactions: report.metrics?.interactions,
              accountsReached: report.metrics?.accountsReached,
              likes: report.metrics?.likes,
              shares: report.metrics?.shares,
              comments: report.metrics?.comments
            }
          }));
          console.log(`📊 Fetched ${reportHistory.length} reports for health analysis`);
        }
      } catch (reportError) {
        console.warn('Could not fetch report history for health analysis:', reportError);
        // Continue without report history - AI will still work with client data
      }

      const prediction = await openaiService.predictClientHealth(clientData, reportHistory);

      const result = {
        ...prediction,
        hasReportData: !!reportHistory && reportHistory.length > 0,
        reportCount: reportHistory?.length || 0,
        timestamp: Date.now()
      };

      // Update state cache
      setAiHealthPredictions(prev => ({ ...prev, [clientId]: result }));

      // Update localStorage cache
      localStorage.setItem(storageKey, JSON.stringify(result));

      return result;
    } catch (error) {
      console.error('AI health prediction failed:', error);
      return null;
    } finally {
      setLoadingAiHealth(prev => ({ ...prev, [clientId]: false }));
    }
  }, [aiHealthPredictions]);

  // Get combined health status (rule-based + AI enhanced). Prefer snapshot from monthly run, else on-demand prediction.
  const getEnhancedHealthStatus = (client) => {
    const baseHealth = getHealthStatus(client);
    const snapshot = clientHealthSnapshots[client.id];
    const aiPrediction = aiHealthPredictions[client.id];
    const source = snapshot || aiPrediction;

    if (source) {
      const statusColors = {
        good: { color: 'text-[#34c759]', bgColor: 'bg-[#34c759]/10' },
        warning: { color: 'text-[#ff9500]', bgColor: 'bg-[#ff9500]/10' },
        critical: { color: 'text-[#ff3b30]', bgColor: 'bg-[#ff3b30]/10' }
      };

      return {
        ...baseHealth,
        ...statusColors[source.status] || statusColors.warning,
        status: source.status,
        label: source.status === 'good' ? 'Healthy' : source.status === 'warning' ? 'Watch' : 'At Risk',
        aiEnhanced: true,
        churnRisk: source.churnRisk,
        healthScore: source.healthScore,
        reason: source.reason,
        action: source.action
      };
    }

    return { ...baseHealth, aiEnhanced: false };
  };

  const logPostPlatformIcons = { instagram: Instagram, youtube: Youtube, facebook: Facebook, linkedin: Linkedin };

  const handleLogPostForClient = async () => {
    if (!logPostClient || !currentUser?.email) return;
    setLogSaving(true);
    try {
      const now = new Date();
      const taskData = {
        title: `Post for ${logPostClient.clientName}`,
        description: `${logPlatform.charAt(0).toUpperCase() + logPlatform.slice(1)} post completed`,
        assigned_to: currentUser.email,
        assignedBy: currentUser.email,
        status: 'completed',
        priority: 'medium',
        due_date: format(now, 'yyyy-MM-dd'),
        created_date: now.toISOString(),
        completed_date: now.toISOString(),
        labels: ['client-post', `client-${logPostClient.id}`, logPlatform],
        task_type: 'post_log',
        clientId: logPostClient.id
      };
      await firestoreService.addTask(taskData);
      const update = getPostLogUpdate(logPostClient, logPlatform, 1);
      await firestoreService.updateClient(logPostClient.id, update);
      toast.success(`Post logged for ${logPostClient.clientName}`);
      setLogPostClient(null);
      setLogPlatform('instagram');
    } catch (err) {
      console.error(err);
      toast.error('Failed to log post');
    } finally {
      setLogSaving(false);
    }
  };

  // Filter clients
  const filteredClients = clients.filter(client => {
    const matchesSearch = !searchQuery || 
      client.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.clientEmail?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const health = getHealthStatus(client);
    const matchesFilter = filterStatus === 'all' || health.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  // Stats
  const stats = {
    total: clients.length,
    onTrack: clients.filter(c => getHealthStatus(c).status === 'good').length,
    needsAttention: clients.filter(c => getHealthStatus(c).status !== 'good').length,
    totalPosts: clients.reduce((sum, c) => sum + (c.packageSize || 0), 0),
    postsUsed: clients.reduce((sum, c) => sum + getPostsUsed(c), 0)
  };

  if (clientsLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-black/5 dark:bg-white/5 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-black/5 dark:bg-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-black/5 dark:bg-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em]">
            My Clients
          </h1>
          <p className="text-[15px] text-[#86868b] mt-1">
            {clients.length} client{clients.length !== 1 ? 's' : ''} assigned to you
          </p>
        </div>
      </div>

      {postLogBanner.show && (
        <PostLogReminderBanner clientNames={postLogBanner.clientNames} onDismiss={() => setPostLogBanner(prev => ({ ...prev, show: false }))} />
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-5 border border-black/5 dark:border-white/10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-[#0071e3]/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-[#0071e3]" strokeWidth={1.5} />
            </div>
          </div>
          <p className="text-[28px] font-semibold text-[#1d1d1f] dark:text-white">{stats.total}</p>
          <p className="text-[13px] text-[#86868b]">Total Clients</p>
        </div>

        <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-5 border border-black/5 dark:border-white/10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-[#34c759]/10 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-[#34c759]" strokeWidth={1.5} />
            </div>
          </div>
          <p className="text-[28px] font-semibold text-[#34c759]">{stats.onTrack}</p>
          <p className="text-[13px] text-[#86868b]">On Track</p>
        </div>

        <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-5 border border-black/5 dark:border-white/10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-[#ff9500]/10 flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-[#ff9500]" strokeWidth={1.5} />
            </div>
          </div>
          <p className="text-[28px] font-semibold text-[#ff9500]">{stats.needsAttention}</p>
          <p className="text-[13px] text-[#86868b]">Needs Attention</p>
        </div>

        <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-5 border border-black/5 dark:border-white/10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-[#5856d6]/10 flex items-center justify-center">
              <Package className="w-4 h-4 text-[#5856d6]" strokeWidth={1.5} />
            </div>
          </div>
          <p className="text-[28px] font-semibold text-[#1d1d1f] dark:text-white">
            {stats.postsUsed}/{stats.totalPosts}
          </p>
          <p className="text-[13px] text-[#86868b]">Posts Used</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" strokeWidth={1.5} />
          <input
            type="text"
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-black/5 dark:bg-white/5 border-0 text-[13px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'good', 'warning', 'critical'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-xl text-[13px] font-medium transition-colors ${
                filterStatus === status
                  ? 'bg-[#0071e3] text-white'
                  : 'bg-black/5 dark:bg-white/5 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/10'
              }`}
            >
              {status === 'all' ? 'All' : status === 'good' ? 'On Track' : status === 'warning' ? 'Medium' : 'Low'}
            </button>
          ))}
        </div>
      </div>

      {/* Client Grid */}
      {filteredClients.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-12 h-12 text-[#86868b] mx-auto mb-4" strokeWidth={1} />
          <h3 className="text-[17px] font-medium text-[#1d1d1f] dark:text-white mb-2">
            {clients.length === 0 ? 'No clients assigned' : 'No clients match your search'}
          </h3>
          <p className="text-[15px] text-[#86868b]">
            {clients.length === 0 
              ? 'Clients will appear here once they are assigned to you.'
              : 'Try adjusting your search or filter criteria.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => {
            const health = getEnhancedHealthStatus(client);
            const isLoadingAi = loadingAiHealth[client.id];
            const postsUsed = getPostsUsed(client);
            const packageSize = client.packageSize || 12;
            const progress = packageSize ? (postsUsed / packageSize) * 100 : 0;

            return (
              <div
                key={client.id}
                className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-5 border border-black/5 dark:border-white/10 hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => openClientCard(client)}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0">
                      {client.profilePhoto ? (
                        <img src={client.profilePhoto} alt="" className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#0071e3] to-[#5856d6] flex items-center justify-center text-white text-[15px] font-semibold">
                          {client.clientName?.charAt(0) || 'C'}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-[15px] font-semibold">
                        <ClientLink client={client} showId />
                      </h3>
                      {client.brokerage ? (
                        <p className="text-[12px] text-[#86868b]">{client.brokerage}</p>
                      ) : (
                        <p className="text-[12px] text-[#86868b]">{client.packageType || 'Standard'} Package</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); setLogPostClient(client); setLogPlatform('instagram'); }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#34c759]/15 text-[#34c759] hover:bg-[#34c759]/25 text-[11px] font-medium transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                      Log post
                    </button>
                    {isSystemAdmin && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditPostsClient(client); setShowEditPostsModal(true); }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/5 dark:bg-white/10 text-[#86868b] hover:bg-black/10 dark:hover:bg-white/15 text-[11px] font-medium transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" strokeWidth={2} />
                        Edit posts
                      </button>
                    )}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!health.aiEnhanced && !isLoadingAi) {
                            fetchAiHealthPrediction(client);
                          }
                          setShowAiTooltip(showAiTooltip === client.id ? null : client.id);
                        }}
                        className={`px-2 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 ${health.color} ${health.bgColor} hover:opacity-80 transition-opacity`}
                      >
                        {isLoadingAi ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : health.aiEnhanced ? (
                          <Sparkles className="w-3 h-3" />
                        ) : null}
                        {health.label}
                      </button>

                      {/* AI Health Tooltip */}
                      {showAiTooltip === client.id && health.aiEnhanced && (
                        <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-white dark:bg-[#2d2d2d] rounded-xl shadow-xl border border-black/10 dark:border-white/10 z-20">
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-4 h-4 text-purple-500" />
                            <span className="text-[12px] font-semibold text-[#1d1d1f] dark:text-white">AI Health Analysis</span>
                          </div>
                          <div className="space-y-2 text-[11px]">
                            <div className="flex items-center justify-between">
                              <span className="text-[#86868b]">Churn Risk</span>
                              <span className={`font-medium ${(health.healthScore ?? (100 - (health.churnRisk ?? 50))) < 40 ? 'text-[#ff3b30]' : (health.healthScore ?? (100 - (health.churnRisk ?? 50))) < 70 ? 'text-[#ff9500]' : 'text-[#34c759]'}`}>
                                {health.healthScore != null ? `${health.healthScore}/100` : `${health.churnRisk}% risk`}
                              </span>
                            </div>
                            {health.reason && (
                              <div>
                                <span className="text-[#86868b] block mb-1">Insight</span>
                                <p className="text-[#1d1d1f] dark:text-white">{health.reason}</p>
                              </div>
                            )}
                            {health.action && (
                              <div className="pt-2 border-t border-black/5 dark:border-white/10">
                                <span className="text-[#86868b] block mb-1">Recommended Action</span>
                                <p className="text-[#0071e3] font-medium">{health.action}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[12px] text-[#86868b]">Posts Used</span>
                    <span className="text-[12px] font-medium text-[#1d1d1f] dark:text-white">
                      {postsUsed} / {packageSize}
                    </span>
                  </div>
                  <div className="h-2 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        progress > 80 ? 'bg-[#ff3b30]' : progress > 50 ? 'bg-[#ff9500]' : 'bg-[#34c759]'
                      }`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Platforms */}
                {client.platforms && Object.values(client.platforms).some(Boolean) && (
                  <div className="mb-3">
                    <PlatformIcons platforms={client.platforms} compact size={14} />
                  </div>
                )}

                {/* Details */}
                <div className="space-y-2 text-[12px]">
                  {client.clientEmail && (
                    <div className="flex items-center gap-2 text-[#86868b]">
                      <Mail className="w-3.5 h-3.5" strokeWidth={1.5} />
                      <span className="truncate">{client.clientEmail}</span>
                    </div>
                  )}
                  {client.paymentStatus && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-[#86868b]" strokeWidth={1.5} />
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${getPaymentStatusStyle(client.paymentStatus)}`}>
                        {client.paymentStatus}
                      </span>
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Log post modal */}
      {logPostClient && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => !logSaving && setLogPostClient(null)}>
          <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl w-full max-w-sm shadow-2xl border border-black/10 dark:border-white/10 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-black/5 dark:border-white/10">
              <h3 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">Log post</h3>
              <p className="text-[13px] text-[#86868b] mt-0.5">{logPostClient.clientName}</p>
            </div>
            <div className="p-5">
              <p className="text-[12px] font-medium text-[#86868b] mb-2">Platform</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(logPostPlatformIcons).map(([platform, Icon]) => (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => setLogPlatform(platform)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-colors ${
                      logPlatform === platform ? 'bg-[#0071e3] text-white' : 'bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15'
                    }`}
                  >
                    <Icon className="w-4 h-4" strokeWidth={1.5} />
                    <span className="capitalize">{platform}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 px-5 py-4 border-t border-black/5 dark:border-white/10">
              <button type="button" onClick={() => setLogPostClient(null)} disabled={logSaving} className="flex-1 h-11 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[14px] font-medium hover:bg-black/10 dark:hover:bg-white/15 disabled:opacity-50">Cancel</button>
              <button type="button" onClick={handleLogPostForClient} disabled={logSaving} className="flex-1 h-11 rounded-xl bg-[#34c759] text-white text-[14px] font-medium hover:bg-[#30d158] disabled:opacity-50">
                {logSaving ? 'Logging...' : 'Log post'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Unified client card modal */}
      {clientForModal && (
        <ClientDetailModal
          client={clientForModal}
          onClose={closeClientCard}
          onClientUpdate={() => {}}
          employees={employees}
          showManagerAssignment={true}
        />
      )}

      {editPostsClient && showEditPostsModal && createPortal(
        <EditPostsLoggedModal
          client={editPostsClient}
          onClose={() => { setShowEditPostsModal(false); setEditPostsClient(null); }}
          onSaved={() => { setShowEditPostsModal(false); setEditPostsClient(null); }}
        />,
        document.body
      )}
    </div>
  );
};

export default MyClientsPage;
