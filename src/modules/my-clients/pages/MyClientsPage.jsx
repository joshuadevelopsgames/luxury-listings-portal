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
import { supabaseService } from '../../../services/supabaseService';
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
  const canManageAllClients = isSystemAdmin;
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
    () => allClients.filter(isAssignedToMe).filter((c) => !c.isInternal),
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
        const snapshots = await supabaseService.getClientHealthSnapshots();
        setClientHealthSnapshots(snapshots);
        console.log(`📋 Loaded health snapshots for ${currentUser?.email}${isViewingAs ? ' (View As mode)' : ''}`);
      } catch (error) {
        console.error('Error loading health snapshots:', error);
      }
    };
    loadSnapshots();
  }, [currentUser?.email, currentUser?.uid, isViewingAs]);

  useEffect(() => {
    supabaseService.getApprovedUsers().then(setEmployees).catch(() => {});
  }, []);

  useEffect(() => {
    if (!editPostsClient?.id || !isSystemAdmin) {
      setPostLogHistory([]);
      return;
    }
    let cancelled = false;
    setPostLogHistoryLoading(true);
    supabaseService.getPostLogTasksByClient(editPostsClient.id, { limit: 500 })
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
    postLogHistory.forEach(task => {
      const date = task.completedAt?.toDate?.() || (task.completedAt ? new Date(task.completedAt) : null);
      if (!date) return;
      const monthKey = format(date, 'MMMM yyyy');
      if (!byMonth.has(monthKey)) byMonth.set(monthKey, []);
      byMonth.get(monthKey).push(task);
    });
    return Array.from(byMonth.entries()).sort((a, b) => {
      const dateA = new Date(a[0]);
      const dateB = new Date(b[0]);
      return dateB - dateA;
    });
  }, [postLogHistory]);

  const handleLogPost = async (client, platform) => {
    if (logSaving) return;
    try {
      setLogSaving(true);
      const update = getPostLogUpdate(platform);
      await supabaseService.updateClient(client.id, update);
      
      // Also create a task for history
      await supabaseService.addTask({
        title: `Logged ${platform} post`,
        clientId: client.id,
        clientName: client.clientName,
        status: 'completed',
        completedAt: new Date(),
        completedBy: currentUser.email,
        type: 'post_log',
        platform
      });

      toast.success(`Logged ${platform} post for ${client.clientName}`);
      setLogPostClient(null);
    } catch (error) {
      console.error('Error logging post:', error);
      toast.error('Failed to log post');
    } finally {
      setLogSaving(false);
    }
  };

  const fetchAiHealthPrediction = async (client) => {
    if (loadingAiHealth[client.id]) return;
    
    setLoadingAiHealth(prev => ({ ...prev, [client.id]: true }));
    try {
      const prediction = await openaiService.predictClientHealth(client);
      setAiHealthPredictions(prev => ({
        ...prev,
        [client.id]: {
          ...prediction,
          timestamp: new Date().toISOString()
        }
      }));
    } catch (error) {
      console.error('Error fetching AI health prediction:', error);
    } finally {
      setLoadingAiHealth(prev => ({ ...prev, [client.id]: false }));
    }
  };

  const getClientHealth = (client) => {
    // 1. Check for manual override
    if (client.healthStatus) {
      const status = client.healthStatus.toLowerCase();
      if (status === 'good') return { label: 'Good', color: 'text-positive', bgColor: 'bg-positive/10' };
      if (status === 'at_risk') return { label: 'At Risk', color: 'text-warning', bgColor: 'bg-warning/10' };
      if (status === 'churned') return { label: 'Churned', color: 'text-danger', bgColor: 'bg-danger/10' };
    }

    // 2. Check for AI prediction (real-time)
    const prediction = aiHealthPredictions[client.id];
    if (prediction) {
      const status = prediction.status.toLowerCase();
      return { 
        label: status === 'good' ? 'Good' : status === 'at_risk' ? 'At Risk' : 'Churned',
        color: status === 'good' ? 'text-positive' : status === 'at_risk' ? 'text-warning' : 'text-danger',
        bgColor: status === 'good' ? 'bg-positive/10' : status === 'at_risk' ? 'bg-warning/10' : 'bg-danger/10',
        aiEnhanced: true,
        churnRisk: prediction.churnRisk,
        healthScore: prediction.healthScore,
        reason: prediction.reason,
        action: prediction.recommendedAction
      };
    }

    // 3. Check for AI snapshot (monthly)
    const snapshot = clientHealthSnapshots[client.id];
    if (snapshot) {
      const status = snapshot.status.toLowerCase();
      return {
        label: status === 'good' ? 'Good' : status === 'at_risk' ? 'At Risk' : 'Churned',
        color: status === 'good' ? 'text-positive' : status === 'at_risk' ? 'text-warning' : 'text-danger',
        bgColor: status === 'good' ? 'bg-positive/10' : status === 'at_risk' ? 'bg-warning/10' : 'bg-danger/10',
        aiEnhanced: true,
        churnRisk: snapshot.churnRisk,
        healthScore: snapshot.healthScore,
        reason: snapshot.reason,
        action: snapshot.action
      };
    }

    // 4. Default to Good
    return { label: 'Good', color: 'text-positive', bgColor: 'bg-positive/10' };
  };

  if (clientsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-6 h-6 text-brand animate-spin" />
      </div>
    );
  }

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         client.brokerage?.toLowerCase().includes(searchQuery.toLowerCase());
    const health = getClientHealth(client);
    const matchesStatus = filterStatus === 'all' || health.label.toLowerCase().replace(' ', '_') === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-[1200px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <h1 className="text-[34px] font-semibold text-ink tracking-[-0.02em]">My Clients</h1>
          <p className="text-[17px] text-ink-muted mt-1">Managing {clients.length} active partnerships</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
            <input
              type="text"
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-surface-3 border-none rounded-xl text-[14px] w-64 focus:ring-2 focus:ring-brand transition-all"
            />
          </div>
          <div className="flex items-center gap-1 p-1 bg-surface-3 rounded-xl">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all ${filterStatus === 'all' ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink dark:hover:text-white'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus('at_risk')}
              className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all ${filterStatus === 'at_risk' ? 'bg-surface text-warning shadow-sm' : 'text-ink-muted hover:text-warning'}`}
            >
              At Risk
            </button>
          </div>
        </div>
      </div>

      {postLogBanner.show && (
        <PostLogReminderBanner clientNames={postLogBanner.clientNames} />
      )}

      {/* Clients Grid */}
      {filteredClients.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => {
            const health = getClientHealth(client);
            const isLoadingAi = loadingAiHealth[client.id];
            const packageSize = client.packageSize || 0;
            const postsUsed = getPostsUsed(client, 'instagram');
            const progress = packageSize > 0 ? Math.min(100, (postsUsed / packageSize) * 100) : 0;
            const isCritical = progress >= 90;

            return (
              <div 
                key={client.id}
                onClick={() => openClientCard(client)}
                className="group bg-surface rounded-[24px] border border-black/5 dark:border-white/5 p-6 hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer"
              >
                {/* Header */}
                <div className="flex flex-col gap-4 mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0">
                      {client.profilePhoto ? (
                        <img src={client.profilePhoto} alt="" className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-brand to-brand flex items-center justify-center text-white text-[15px] font-semibold">
                          {client.clientName?.charAt(0) || 'C'}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-[15px] font-semibold">
                        <ClientLink client={client} showId />
                      </h3>
                      {client.brokerage ? (
                        <p className="text-[12px] text-ink-muted">{client.brokerage}</p>
                      ) : (
                        <p className="text-[12px] text-ink-muted">{client.packageType || 'Standard'} Package</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/my-clients/${client.id}`);
                      }}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-brand/10 text-brand hover:bg-brand/20 text-[12px] font-medium transition-colors shadow-sm whitespace-nowrap"
                    >
                      <Building2 className="w-4 h-4" strokeWidth={2} />
                      Workspace
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setLogPostClient(client); setLogPlatform('instagram'); }}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-positive text-white hover:bg-[#2db84e] text-[12px] font-medium transition-colors shadow-sm whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4" strokeWidth={2} />
                      Log post
                    </button>
                    {canManageAllClients && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditPostsClient(client); setShowEditPostsModal(true); }}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-3 text-ink-muted hover:bg-hairline-strong text-[12px] font-medium transition-colors whitespace-nowrap"
                      >
                        <Pencil className="w-4 h-4" strokeWidth={2} />
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
                        className={`px-3 py-2 rounded-xl text-[12px] font-medium inline-flex items-center gap-1.5 whitespace-nowrap ${health.color} ${health.bgColor} hover:opacity-80 transition-opacity`}
                      >
                        {isLoadingAi ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : health.aiEnhanced ? (
                          <Sparkles className="w-4 h-4" />
                        ) : null}
                        {health.label}
                      </button>

                      {/* AI Health Tooltip */}
                      {showAiTooltip === client.id && health.aiEnhanced && (
                        <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-surface rounded-xl shadow-lg border border-hairline-strong z-20">
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-4 h-4 text-brand" />
                            <span className="text-[12px] font-semibold text-ink">AI Health Analysis</span>
                          </div>
                          <div className="space-y-2 text-[11px]">
                            <div className="flex items-center justify-between">
                              <span className="text-ink-muted">Churn Risk</span>
                              <span className={`font-medium ${(health.healthScore ?? (100 - (health.churnRisk ?? 50))) < 40 ? 'text-danger' : (health.healthScore ?? (100 - (health.churnRisk ?? 50))) < 70 ? 'text-warning' : 'text-positive'}`}>
                                {health.healthScore != null ? `${health.healthScore}/100` : `${health.churnRisk}% risk`}
                              </span>
                            </div>
                            {health.reason && (
                              <div>
                                <span className="text-ink-muted block mb-1">Insight</span>
                                <p className="text-ink">{health.reason}</p>
                              </div>
                            )}
                            {health.action && (
                              <div className="pt-2 border-t border-hairline">
                                <span className="text-ink-muted block mb-1">Recommended Action</span>
                                <p className="text-brand font-medium">{health.action}</p>
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
                    <span className="text-[12px] text-ink-muted">Posts Used</span>
                    <span className="text-[12px] font-medium text-ink">
                      {postsUsed} / {packageSize}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-3 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${isCritical ? 'bg-danger' : 'bg-brand'}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-surface-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-3.5 h-3.5 text-ink-muted" />
                      <span className="text-[11px] text-ink-muted">Last Post</span>
                    </div>
                    <p className="text-[13px] font-medium text-ink">
                      {client.lastInstagramPostDate ? format(parseISO(client.lastInstagramPostDate), 'MMM d') : 'Never'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-surface-3">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-3.5 h-3.5 text-ink-muted" />
                      <span className="text-[11px] text-ink-muted">Status</span>
                    </div>
                    <p className="text-[13px] font-medium text-positive">Active</p>
                  </div>
                </div>

                {/* Account Manager (Only if viewing all) */}
                {canManageAllClients && client.assignedManager && (
                  <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/5 flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-[10px] font-bold">
                      {client.assignedManager.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[11px] text-ink-muted">Managed by {client.assignedManager}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-surface rounded-[32px] border border-black/5 dark:border-white/5">
          <div className="w-20 h-20 bg-surface-3 rounded-full flex items-center justify-center mb-6">
            <Users className="w-10 h-10 text-ink-muted" />
          </div>
          <h2 className="text-[24px] font-semibold text-ink">No clients found</h2>
          <p className="text-[17px] text-ink-muted mt-2 text-center max-w-md px-6">
            {searchQuery ? `We couldn't find any clients matching "${searchQuery}"` : "You haven't been assigned any clients yet."}
          </p>
        </div>
      )}

      {/* Modals */}
      {clientForModal && (
        <ClientDetailModal
          client={clientForModal}
          onClose={closeClientCard}
          onUpdate={async (updates) => {
            await supabaseService.updateClient(clientForModal.id, updates);
            toast.success('Client updated');
          }}
        />
      )}

      {showEditPostsModal && editPostsClient && (
        <EditPostsLoggedModal
          isOpen={showEditPostsModal}
          onClose={() => { setShowEditPostsModal(false); setEditPostsClient(null); }}
          client={editPostsClient}
          history={postLogHistory}
          loading={postLogHistoryLoading}
          onUpdate={async (taskId, updates) => {
            await supabaseService.updateTask(taskId, updates);
            // Refresh history
            const tasks = await supabaseService.getPostLogTasksByClient(editPostsClient.id, { limit: 500 });
            setPostLogHistory(tasks);
          }}
          onDelete={async (taskId) => {
            await supabaseService.deleteTask(taskId);
            // Refresh history
            const tasks = await supabaseService.getPostLogTasksByClient(editPostsClient.id, { limit: 500 });
            setPostLogHistory(tasks);
          }}
        />
      )}

      {/* Log Post Confirmation Modal */}
      {logPostClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-surface rounded-[24px] w-full max-w-md p-6 shadow-lg border border-black/5 dark:border-white/5">
            <h2 className="text-[20px] font-semibold mb-2">Log Instagram Post</h2>
            <p className="text-[15px] text-ink-muted mb-6">
              Confirm you want to log an Instagram post for <strong>{logPostClient.clientName}</strong>. This will decrement their remaining post count.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setLogPostClient(null)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-surface-3 text-[15px] font-medium hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleLogPost(logPostClient, logPlatform)}
                disabled={logSaving}
                className="flex-1 px-4 py-2.5 rounded-xl bg-brand text-white text-[15px] font-medium hover:bg-brand-hover transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {logSaving ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Confirm Log'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyClientsPage;
