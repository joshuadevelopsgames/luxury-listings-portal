/**
 * MyClientsPage - Account manager's view of their assigned clients
 * 
 * Shows clients assigned to the current user with:
 * - Client overview cards
 * - Package utilization
 * - Deliverable status
 * - Quick actions
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuth } from '../../../contexts/AuthContext';
import { useViewAs } from '../../../contexts/ViewAsContext';
import { firestoreService } from '../../../services/firestoreService';
import PlatformIcons from '../../../components/PlatformIcons';
import ClientLink from '../../../components/ui/ClientLink';
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
  Linkedin
} from 'lucide-react';

const MyClientsPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { isViewingAs, viewingAsUser, getEffectiveUser } = useViewAs();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedClient, setSelectedClient] = useState(null);
  const [detailClient, setDetailClient] = useState(null); // For detail modal
  const [logPostClient, setLogPostClient] = useState(null);
  const [logPlatform, setLogPlatform] = useState('instagram');
  const [logSaving, setLogSaving] = useState(false);

  // Get the effective user (viewed-as user or current user)
  const effectiveUser = getEffectiveUser(currentUser);

  // Match client to effective user: assignedManager can be email or uid (normalize and trim)
  const isAssignedToMe = (client) => {
    const am = (client.assignedManager || '').trim().toLowerCase();
    if (!am) return false;
    const email = (effectiveUser?.email || '').trim().toLowerCase();
    const uid = (effectiveUser?.uid || '').trim().toLowerCase();
    return am === email || (uid && am === uid);
  };

  useEffect(() => {
    const loadClients = async () => {
      if (!effectiveUser?.email && !effectiveUser?.uid) return;

      try {
        const allClients = await firestoreService.getClients();
        const myClients = allClients.filter(isAssignedToMe);
        setClients(myClients);
        console.log(`📋 Loaded ${myClients.length} clients for ${effectiveUser?.email}${isViewingAs ? ' (View As mode)' : ''}`);
      } catch (error) {
        console.error('Error loading clients:', error);
      } finally {
        setLoading(false);
      }
    };

    loadClients();
  }, [effectiveUser?.email, effectiveUser?.uid, isViewingAs]);

  const getHealthStatus = (client) => {
    const postsRemaining = client.postsRemaining || 0;
    const packageSize = client.packageSize || 10;
    const percentage = (postsRemaining / packageSize) * 100;
    
    if (percentage <= 20) return { status: 'critical', color: 'text-[#ff3b30]', bgColor: 'bg-[#ff3b30]/10', label: 'Low Posts' };
    if (percentage <= 50) return { status: 'warning', color: 'text-[#ff9500]', bgColor: 'bg-[#ff9500]/10', label: 'Medium' };
    return { status: 'good', color: 'text-[#34c759]', bgColor: 'bg-[#34c759]/10', label: 'On Track' };
  };

  const getPaymentStatusStyle = (status) => {
    if (status === 'Paid') return 'text-[#34c759] bg-[#34c759]/10';
    if (status === 'Pending') return 'text-[#ff9500] bg-[#ff9500]/10';
    return 'text-[#ff3b30] bg-[#ff3b30]/10';
  };

  const logPostPlatformIcons = { instagram: Instagram, youtube: Youtube, facebook: Facebook, linkedin: Linkedin };

  const handleLogPostForClient = async () => {
    if (!logPostClient || !effectiveUser?.email) return;
    setLogSaving(true);
    try {
      const now = new Date();
      const taskData = {
        title: `Post for ${logPostClient.clientName}`,
        description: `${logPlatform.charAt(0).toUpperCase() + logPlatform.slice(1)} post completed`,
        assigned_to: effectiveUser.email,
        assignedBy: effectiveUser.email,
        status: 'completed',
        priority: 'medium',
        due_date: format(now, 'yyyy-MM-dd'),
        created_date: now.toISOString(),
        completed_date: now.toISOString(),
        labels: ['client-post', `client-${logPostClient.id}`, logPlatform],
        task_type: 'post_log'
      };
      await firestoreService.addTask(taskData);
      const newPostsUsed = (logPostClient.postsUsed || 0) + 1;
      const newPostsRemaining = Math.max((logPostClient.postsRemaining || 0) - 1, 0);
      await firestoreService.updateClient(logPostClient.id, { postsUsed: newPostsUsed, postsRemaining: newPostsRemaining });
      setClients(prev => prev.map(c => c.id === logPostClient.id ? { ...c, postsUsed: newPostsUsed, postsRemaining: newPostsRemaining } : c));
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
    postsUsed: clients.reduce((sum, c) => sum + (c.postsUsed || 0), 0)
  };

  if (loading) {
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
            const health = getHealthStatus(client);
            const postsUsed = client.postsUsed || 0;
            const packageSize = client.packageSize || 10;
            const progress = (postsUsed / packageSize) * 100;
            
            return (
              <div 
                key={client.id}
                className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-5 border border-black/5 dark:border-white/10 hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => setSelectedClient(selectedClient?.id === client.id ? null : client)}
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
                    <span className={`px-2 py-1 rounded-lg text-[11px] font-medium ${health.color} ${health.bgColor}`}>
                      {health.label}
                    </span>
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

                {/* Expanded Details */}
                {selectedClient?.id === client.id && (
                  <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/5 space-y-3">
                    {client.notes && (
                      <div className="text-[12px] text-[#86868b]">
                        <p className="font-medium text-[#1d1d1f] dark:text-white mb-1">Notes</p>
                        <p>{client.notes}</p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailClient(client);
                        }}
                        className="flex-1 px-3 py-2 rounded-xl bg-[#0071e3] text-white text-[12px] font-medium hover:bg-[#0077ed] transition-colors"
                      >
                        View Details
                      </button>
                      <button 
                        onClick={(e) => e.stopPropagation()}
                        className="px-3 py-2 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[12px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                )}
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

      {/* Client Detail Modal */}
      {detailClient && createPortal(
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setDetailClient(null)}
        >
          <div 
            className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-gradient-to-r from-[#0071e3] to-[#5856d6]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/20 flex items-center justify-center">
                  {detailClient.logo ? (
                    <img src={detailClient.logo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-5 h-5 text-white" />
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {detailClient.clientName || 'Unnamed Client'}
                  </h2>
                  <p className="text-sm text-white/70">Client Details</p>
                </div>
              </div>
              <button
                onClick={() => setDetailClient(null)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] space-y-6">
              {/* Contact Info */}
              <div>
                <h3 className="text-[13px] font-semibold text-[#86868b] uppercase tracking-wide mb-3">Contact Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {detailClient.clientEmail && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-black/[0.02] dark:bg-white/5">
                      <Mail className="w-4 h-4 text-[#0071e3]" />
                      <div>
                        <p className="text-[11px] text-[#86868b]">Email</p>
                        <a href={`mailto:${detailClient.clientEmail}`} className="text-[13px] text-[#1d1d1f] dark:text-white hover:text-[#0071e3]">
                          {detailClient.clientEmail}
                        </a>
                      </div>
                    </div>
                  )}
                  {detailClient.phone && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-black/[0.02] dark:bg-white/5">
                      <Phone className="w-4 h-4 text-[#34c759]" />
                      <div>
                        <p className="text-[11px] text-[#86868b]">Phone</p>
                        <a href={`tel:${detailClient.phone}`} className="text-[13px] text-[#1d1d1f] dark:text-white hover:text-[#0071e3]">
                          {detailClient.phone}
                        </a>
                      </div>
                    </div>
                  )}
                  {detailClient.website && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-black/[0.02] dark:bg-white/5">
                      <Globe className="w-4 h-4 text-[#5856d6]" />
                      <div>
                        <p className="text-[11px] text-[#86868b]">Website</p>
                        <a href={detailClient.website} target="_blank" rel="noopener noreferrer" className="text-[13px] text-[#0071e3] hover:underline flex items-center gap-1">
                          {detailClient.website.replace(/^https?:\/\//, '')}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  )}
                  {detailClient.instagramHandle && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-black/[0.02] dark:bg-white/5">
                      <Instagram className="w-4 h-4 text-[#E1306C]" />
                      <div>
                        <p className="text-[11px] text-[#86868b]">Instagram</p>
                        <a href={`https://instagram.com/${detailClient.instagramHandle}`} target="_blank" rel="noopener noreferrer" className="text-[13px] text-[#E1306C] hover:underline flex items-center gap-1">
                          @{detailClient.instagramHandle}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Package Info */}
              <div>
                <h3 className="text-[13px] font-semibold text-[#86868b] uppercase tracking-wide mb-3">Package Information</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-[#0071e3]/5">
                    <p className="text-[11px] text-[#86868b] mb-1">Package Type</p>
                    <p className="text-[15px] font-semibold text-[#0071e3]">{detailClient.packageType || '—'}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#34c759]/5">
                    <p className="text-[11px] text-[#86868b] mb-1">Package Size</p>
                    <p className="text-[15px] font-semibold text-[#34c759]">{detailClient.packageSize || 0} posts</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#ff9500]/5">
                    <p className="text-[11px] text-[#86868b] mb-1">Posts Remaining</p>
                    <p className="text-[15px] font-semibold text-[#ff9500]">{detailClient.postsRemaining ?? detailClient.packageSize ?? 0}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#5856d6]/5">
                    <p className="text-[11px] text-[#86868b] mb-1">Payment Status</p>
                    <p className={`text-[15px] font-semibold ${
                      detailClient.paymentStatus === 'Paid' ? 'text-[#34c759]' : 
                      detailClient.paymentStatus === 'Pending' ? 'text-[#ff9500]' : 'text-[#86868b]'
                    }`}>
                      {detailClient.paymentStatus || '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Platforms */}
              {detailClient.platforms && Object.values(detailClient.platforms).some(v => v) && (
                <div>
                  <h3 className="text-[13px] font-semibold text-[#86868b] uppercase tracking-wide mb-3">Active Platforms</h3>
                  <div className="flex flex-wrap gap-2">
                    <PlatformIcons platforms={detailClient.platforms} size="md" showLabels />
                  </div>
                </div>
              )}

              {/* Notes */}
              {detailClient.notes && (
                <div>
                  <h3 className="text-[13px] font-semibold text-[#86868b] uppercase tracking-wide mb-3">Notes</h3>
                  <div className="p-4 rounded-xl bg-black/[0.02] dark:bg-white/5">
                    <p className="text-[13px] text-[#1d1d1f] dark:text-white whitespace-pre-wrap">{detailClient.notes}</p>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2 pt-2">
                {detailClient.clientEmail && (
                  <a
                    href={`mailto:${detailClient.clientEmail}`}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0071e3] text-white text-[13px] font-medium hover:bg-[#0077ed] transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    Send Email
                  </a>
                )}
                {detailClient.phone && (
                  <a
                    href={`tel:${detailClient.phone}`}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#34c759] text-white text-[13px] font-medium hover:bg-[#30d158] transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    Call
                  </a>
                )}
                <button
                  onClick={() => {
                    navigate(`/instagram-reports`);
                    setDetailClient(null);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#833AB4] to-[#E1306C] text-white text-[13px] font-medium hover:opacity-90 transition-opacity"
                >
                  <Instagram className="w-4 h-4" />
                  View Analytics
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default MyClientsPage;
