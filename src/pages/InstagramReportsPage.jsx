import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/PermissionsContext';
import { useViewAs } from '../contexts/ViewAsContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { toast } from 'react-hot-toast';
import { firestoreService } from '../services/firestoreService';
import { openaiService } from '../services/openaiService';
import { cloudVisionOCRService } from '../services/cloudVisionOCRService';
// Fallback to browser-based OCR if Cloud Vision and AI extraction fail
import { instagramOCRService } from '../services/instagramOCRService';
import { getStorage, ref, deleteObject } from 'firebase/storage';
import { 
  Instagram, 
  Plus, 
  Upload, 
  Link as LinkIcon, 
  Copy, 
  Check, 
  Trash2, 
  Eye, 
  Edit, 
  X,
  Image,
  Calendar,
  User,
  ExternalLink,
  BarChart3,
  AlertCircle,
  Loader2,
  FileText,
  ChevronDown,
  ChevronUp,
  Sparkles,
  MapPin,
  Users,
  TrendingUp,
  Heart,
  MousePointer,
  MessageCircle,
  UserPlus,
  UserMinus,
  Activity,
  Clock,
  ChevronLeft,
  ChevronRight,
  Building2,
  FolderOpen,
  CalendarDays,
  FileBarChart
} from 'lucide-react';
import { format, startOfQuarter, endOfQuarter, startOfYear, endOfYear, getQuarter, getYear, parseISO, isWithinInterval } from 'date-fns';
import { getInstagramEmbedUrl } from '../utils/instagramEmbed';
import ClientLink from '../components/ui/ClientLink';

// Normalize percentage for display (OCR sometimes loses decimal or misreads)
const formatPercent = (value) => {
  if (value == null || value === '') return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  const normalized = n > 100 && n < 1000 ? n / 10 : n;
  return Math.min(100, Math.max(0, normalized)).toFixed(1);
};

// Non-followers %: if stored value is invalid (>100), use complement of followers so they add to 100%
const nonFollowersPercent = (followersPercent, storedNonFollowers) => {
  const followers = followersPercent != null ? Number(followersPercent) : null;
  const stored = storedNonFollowers != null ? Number(storedNonFollowers) : null;
  if (stored != null && stored <= 100 && !Number.isNaN(stored)) return formatPercent(stored);
  if (followers != null && !Number.isNaN(followers)) return formatPercent(100 - followers);
  return formatPercent(stored);
};

// Admins see all Instagram reports (must match PermissionsContext + Firestore rules)
const INSTAGRAM_ADMIN_EMAILS = ['jrsschroeder@gmail.com', 'demo@luxurylistings.app'];

const InstagramReportsPage = () => {
  const { currentUser } = useAuth();
  const { isSystemAdmin } = usePermissions();
  const { isViewingAs, viewingAsUser } = useViewAs();
  const { confirm } = useConfirm();
  
  // Get effective user (View As support)
  const effectiveUser = isViewingAs && viewingAsUser ? viewingAsUser : currentUser;
  // System admins always see all reports. Use email check so demo sees all even if PermissionsContext is slow.
  const effectiveIsAdmin = isSystemAdmin || INSTAGRAM_ADMIN_EMAILS.includes((currentUser?.email || '').toLowerCase());
  
  const [reports, setReports] = useState([]);
  const [allClients, setAllClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [copiedLink, setCopiedLink] = useState(null);
  const [expandedClient, setExpandedClient] = useState(null);
  const [expandedReport, setExpandedReport] = useState(null);
  const [preSelectedClientId, setPreSelectedClientId] = useState(null);
  
  // Aggregated report generation state
  const [generatingReport, setGeneratingReport] = useState(null); // { clientId, type: 'quarterly' | 'yearly' }
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState(getQuarter(new Date()));

  // Load reports - admins see all reports, others see only their own. Re-subscribe when auth is ready.
  useEffect(() => {
    if (!currentUser?.uid) {
      setReports([]);
      setLoading(false);
      return () => {};
    }
    const unsubscribe = firestoreService.onInstagramReportsChange((data) => {
      setReports(data);
      setLoading(false);
    }, { loadAll: effectiveIsAdmin });
    return () => unsubscribe();
  }, [currentUser?.uid, effectiveIsAdmin]);

  // Load clients
  useEffect(() => {
    const loadClients = async () => {
      try {
        const clientsList = await firestoreService.getClients();
        setAllClients(clientsList.sort((a, b) => (a.clientName || '').localeCompare(b.clientName || '')));
      } catch (error) {
        console.error('Error loading clients:', error);
      }
    };
    loadClients();
  }, []);

  // Filter clients: admins see all, others see only assigned clients
  const isAssignedToMe = (client) => {
    const am = (client.assignedManager || '').trim().toLowerCase();
    if (!am) return false;
    const email = (effectiveUser?.email || '').trim().toLowerCase();
    const uid = (effectiveUser?.uid || '').trim().toLowerCase();
    return am === email || (uid && am === uid);
  };

  const myClients = useMemo(() => {
    if (effectiveIsAdmin) {
      return allClients;
    }
    return allClients.filter(isAssignedToMe);
  }, [allClients, effectiveUser?.email, effectiveUser?.uid, effectiveIsAdmin]);

  // Group reports by client
  const clientsWithReports = useMemo(() => {
    const clientMap = new Map();
    
    // Initialize with my clients (even if they have no reports)
    myClients.forEach(client => {
      clientMap.set(client.id, {
        client,
        reports: []
      });
    });
    
    // Add reports to their respective clients
    reports.forEach(report => {
      if (report.clientId) {
        if (clientMap.has(report.clientId)) {
          // Client exists in our list
          clientMap.get(report.clientId).reports.push(report);
        } else if (effectiveIsAdmin) {
          // Admin: create placeholder for reports with unknown/deleted clientId
          clientMap.set(report.clientId, {
            client: { id: report.clientId, clientName: report.clientName || 'Unknown Client' },
            reports: [report]
          });
        }
      }
    });
    
    // Sort reports within each client by date (newest first)
    clientMap.forEach(entry => {
      entry.reports.sort((a, b) => {
        const dateA = a.startDate?.toDate?.() || a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.startDate?.toDate?.() || b.createdAt?.toDate?.() || new Date(0);
        return dateB - dateA;
      });
    });
    
    // Convert to array and sort by client name
    return Array.from(clientMap.values())
      .sort((a, b) => (a.client.clientName || '').localeCompare(b.client.clientName || ''));
  }, [myClients, reports, effectiveIsAdmin]);

  // Unlinked reports (reports without clientId) - only visible to admins
  const unlinkedReports = useMemo(() => {
    if (!effectiveIsAdmin) return [];
    return reports.filter(r => !r.clientId).sort((a, b) => {
      const dateA = a.startDate?.toDate?.() || a.createdAt?.toDate?.() || new Date(0);
      const dateB = b.startDate?.toDate?.() || b.createdAt?.toDate?.() || new Date(0);
      return dateB - dateA;
    });
  }, [reports, effectiveIsAdmin]);

  // Get reports for a specific time period
  const getReportsForPeriod = (clientId, startDate, endDate) => {
    return reports.filter(r => {
      if (r.clientId !== clientId) return false;
      const reportStart = r.startDate?.toDate?.() || r.createdAt?.toDate?.();
      if (!reportStart) return false;
      return isWithinInterval(reportStart, { start: startDate, end: endDate });
    });
  };

  // Aggregate metrics from multiple reports
  const aggregateMetrics = (reportsToAggregate) => {
    if (!reportsToAggregate.length) return null;
    
    const aggregated = {
      views: 0,
      interactions: 0,
      profileVisits: 0,
      followers: null,
      followerChange: 0,
      reportCount: reportsToAggregate.length
    };
    
    reportsToAggregate.forEach(r => {
      const m = r.metrics || {};
      if (m.views) aggregated.views += Number(m.views) || 0;
      if (m.interactions) aggregated.interactions += Number(m.interactions) || 0;
      if (m.profileVisits) aggregated.profileVisits += Number(m.profileVisits) || 0;
      if (m.followerChange) aggregated.followerChange += Number(m.followerChange) || 0;
      // Take latest followers count
      if (m.followers) aggregated.followers = Number(m.followers);
    });
    
    return aggregated;
  };

  // Generate quarterly report
  const handleGenerateQuarterlyReport = async (clientId, year, quarter) => {
    const client = allClients.find(c => c.id === clientId);
    if (!client) return;
    
    const qStart = startOfQuarter(new Date(year, (quarter - 1) * 3, 1));
    const qEnd = endOfQuarter(qStart);
    const periodReports = getReportsForPeriod(clientId, qStart, qEnd);
    
    if (!periodReports.length) {
      toast.error(`No monthly reports found for Q${quarter} ${year}. Create monthly reports first.`);
      return;
    }
    
    const metrics = aggregateMetrics(periodReports);
    const reportData = {
      clientId,
      clientName: client.clientName || client.name,
      title: `Q${quarter} ${year} Instagram Report`,
      dateRange: `Q${quarter} ${year} (${format(qStart, 'MMM d')} - ${format(qEnd, 'MMM d, yyyy')})`,
      startDate: qStart,
      endDate: qEnd,
      reportType: 'quarterly',
      metrics,
      notes: `Aggregated from ${periodReports.length} monthly report(s).\n\nTotal Views: ${metrics.views.toLocaleString()}\nTotal Interactions: ${metrics.interactions.toLocaleString()}\nProfile Visits: ${metrics.profileVisits.toLocaleString()}\nNet Follower Change: ${metrics.followerChange >= 0 ? '+' : ''}${metrics.followerChange}`,
      sourceReportIds: periodReports.map(r => r.id)
    };
    
    try {
      await firestoreService.createInstagramReport(reportData);
      setGeneratingReport(null);
    } catch (error) {
      console.error('Error creating quarterly report:', error);
      toast.error('Failed to create quarterly report.');
    }
  };

  // Generate yearly report
  const handleGenerateYearlyReport = async (clientId, year) => {
    const client = allClients.find(c => c.id === clientId);
    if (!client) return;
    
    const yStart = startOfYear(new Date(year, 0, 1));
    const yEnd = endOfYear(yStart);
    const periodReports = getReportsForPeriod(clientId, yStart, yEnd);
    
    if (!periodReports.length) {
      toast.error(`No reports found for ${year}. Create monthly reports first.`);
      return;
    }
    
    const metrics = aggregateMetrics(periodReports);
    
    // Calculate quarterly breakdowns
    const quarterlyBreakdown = [1, 2, 3, 4].map(q => {
      const qStart = startOfQuarter(new Date(year, (q - 1) * 3, 1));
      const qEnd = endOfQuarter(qStart);
      const qReports = periodReports.filter(r => {
        const d = r.startDate?.toDate?.() || r.createdAt?.toDate?.();
        return d && isWithinInterval(d, { start: qStart, end: qEnd });
      });
      return {
        quarter: q,
        metrics: aggregateMetrics(qReports),
        reportCount: qReports.length
      };
    });
    
    let notes = `Yearly Summary for ${year}\nAggregated from ${periodReports.length} report(s).\n\n`;
    notes += `YEARLY TOTALS:\n`;
    notes += `• Total Views: ${metrics.views.toLocaleString()}\n`;
    notes += `• Total Interactions: ${metrics.interactions.toLocaleString()}\n`;
    notes += `• Profile Visits: ${metrics.profileVisits.toLocaleString()}\n`;
    notes += `• Net Follower Change: ${metrics.followerChange >= 0 ? '+' : ''}${metrics.followerChange}\n\n`;
    notes += `QUARTERLY BREAKDOWN:\n`;
    quarterlyBreakdown.forEach(q => {
      if (q.metrics) {
        notes += `\nQ${q.quarter} (${q.reportCount} reports):\n`;
        notes += `  Views: ${q.metrics.views.toLocaleString()}\n`;
        notes += `  Interactions: ${q.metrics.interactions.toLocaleString()}\n`;
        notes += `  Profile Visits: ${q.metrics.profileVisits.toLocaleString()}\n`;
      } else {
        notes += `\nQ${q.quarter}: No data\n`;
      }
    });
    
    const reportData = {
      clientId,
      clientName: client.clientName || client.name,
      title: `${year} Annual Instagram Report`,
      dateRange: `${year} (Jan 1 - Dec 31)`,
      startDate: yStart,
      endDate: yEnd,
      reportType: 'yearly',
      metrics,
      quarterlyBreakdown,
      notes,
      sourceReportIds: periodReports.map(r => r.id)
    };
    
    try {
      await firestoreService.createInstagramReport(reportData);
      setGeneratingReport(null);
    } catch (error) {
      console.error('Error creating yearly report:', error);
      toast.error('Failed to create yearly report.');
    }
  };

  const handleCopyLink = (publicLinkId) => {
    const link = `${window.location.origin}/report/${publicLinkId}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(publicLinkId);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleDeleteReport = async (report) => {
    const confirmed = await confirm({
      title: 'Delete Report',
      message: `Are you sure you want to delete "${report.title}"? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger'
    });
    if (!confirmed) return;
    
    try {
      const storage = getStorage();
      for (const screenshot of report.screenshots || []) {
        if (!screenshot.path) continue;
        try {
          const imageRef = ref(storage, screenshot.path);
          await deleteObject(imageRef);
        } catch (e) {
          console.warn('Error deleting screenshot:', e);
        }
      }
      await firestoreService.deleteInstagramReport(report.id);
      toast.success('Report deleted');
    } catch (error) {
      console.error('Error deleting report:', error);
      toast.error('Failed to delete report. Please try again.');
    }
  };

  // Create report for specific client
  const handleCreateForClient = (clientId) => {
    setPreSelectedClientId(clientId);
    setShowCreateModal(true);
  };

  // Report card component
  const ReportCard = ({ report, compact = false }) => (
    <div className={`rounded-xl bg-white dark:bg-[#2c2c2e] border border-black/5 dark:border-white/10 overflow-hidden ${compact ? '' : 'hover:shadow-md'} transition-all`}>
      <div className={`${compact ? 'p-3' : 'p-4'} flex items-center justify-between gap-3`}>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`${compact ? 'w-8 h-8' : 'w-10 h-10'} rounded-lg bg-gradient-to-br from-[#833AB4] to-[#E1306C] flex items-center justify-center flex-shrink-0`}>
            {report.reportType === 'quarterly' ? (
              <CalendarDays className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} text-white`} />
            ) : report.reportType === 'yearly' ? (
              <FileBarChart className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} text-white`} />
            ) : (
              <BarChart3 className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} text-white`} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className={`${compact ? 'text-[13px]' : 'text-[14px]'} font-medium text-[#1d1d1f] dark:text-white truncate`}>
                {report.title}
              </h4>
              {report.reportType && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                  report.reportType === 'yearly' 
                    ? 'bg-[#5856d6]/10 text-[#5856d6]' 
                    : 'bg-[#34c759]/10 text-[#34c759]'
                }`}>
                  {report.reportType === 'yearly' ? 'Annual' : 'Quarterly'}
                </span>
              )}
            </div>
            <p className={`${compact ? 'text-[11px]' : 'text-[12px]'} text-[#86868b] truncate`}>
              {report.dateRange}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => handleCopyLink(report.publicLinkId)}
            className={`${compact ? 'p-1.5' : 'p-2'} rounded-lg bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15 transition-colors`}
            title="Copy link"
          >
            {copiedLink === report.publicLinkId ? (
              <Check className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-[#34c759]`} />
            ) : (
              <Copy className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
            )}
          </button>
          <button
            onClick={() => window.open(`/report/${report.publicLinkId}`, '_blank')}
            className={`${compact ? 'p-1.5' : 'p-2'} rounded-lg bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15 transition-colors`}
            title="Preview"
          >
            <ExternalLink className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
          </button>
          <button
            onClick={() => setEditingReport(report)}
            className={`${compact ? 'p-1.5' : 'p-2'} rounded-lg bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15 transition-colors`}
            title="Edit"
          >
            <Edit className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
          </button>
          <button
            onClick={() => handleDeleteReport(report)}
            className={`${compact ? 'p-1.5' : 'p-2'} rounded-lg bg-[#ff3b30]/10 text-[#ff3b30] hover:bg-[#ff3b30]/20 transition-colors`}
            title="Delete"
          >
            <Trash2 className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
          </button>
        </div>
      </div>
    </div>
  );

  // Stats summary - only count reports for MY clients
  const myClientIds = new Set(myClients.map(c => c.id));
  const myReports = reports.filter(r => r.clientId && myClientIds.has(r.clientId));
  const totalReports = myReports.length;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-[24px] sm:text-[34px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em] flex items-center gap-2 sm:gap-3">
            <img src="/Luxury-listings-logo-CLR.png" alt="Luxury Listings" className="w-7 h-7 sm:w-8 sm:h-8 object-contain" />
            Instagram Analytics
          </h1>
          <p className="text-[13px] sm:text-[15px] text-[#86868b] mt-1">
            {effectiveIsAdmin ? 'Manage analytics reports for all clients' : `Analytics reports for your ${myClients.length} assigned client${myClients.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#833AB4] via-[#E1306C] to-[#F77737] text-white text-[13px] sm:text-[14px] font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          New Report
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 sm:p-4 rounded-xl bg-white dark:bg-[#2c2c2e] border border-black/5 dark:border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-4 h-4 text-[#0071e3]" />
            <span className="text-[11px] sm:text-[12px] text-[#86868b]">Clients</span>
          </div>
          <p className="text-[20px] sm:text-[24px] font-semibold text-[#1d1d1f] dark:text-white">{myClients.length}</p>
        </div>
        <div className="p-3 sm:p-4 rounded-xl bg-white dark:bg-[#2c2c2e] border border-black/5 dark:border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-[#E1306C]" />
            <span className="text-[11px] sm:text-[12px] text-[#86868b]">Reports</span>
          </div>
          <p className="text-[20px] sm:text-[24px] font-semibold text-[#1d1d1f] dark:text-white">{totalReports}</p>
        </div>
        <div className="p-3 sm:p-4 rounded-xl bg-white dark:bg-[#2c2c2e] border border-black/5 dark:border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays className="w-4 h-4 text-[#34c759]" />
            <span className="text-[11px] sm:text-[12px] text-[#86868b]">This Quarter</span>
          </div>
          <p className="text-[20px] sm:text-[24px] font-semibold text-[#1d1d1f] dark:text-white">
            {myReports.filter(r => {
              const d = r.startDate?.toDate?.();
              return d && isWithinInterval(d, { 
                start: startOfQuarter(new Date()), 
                end: endOfQuarter(new Date()) 
              });
            }).length}
          </p>
        </div>
        <div className="p-3 sm:p-4 rounded-xl bg-white dark:bg-[#2c2c2e] border border-black/5 dark:border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-[#ff9500]" />
            <span className="text-[11px] sm:text-[12px] text-[#86868b]">This Year</span>
          </div>
          <p className="text-[20px] sm:text-[24px] font-semibold text-[#1d1d1f] dark:text-white">
            {myReports.filter(r => {
              const d = r.startDate?.toDate?.();
              return d && getYear(d) === new Date().getFullYear();
            }).length}
          </p>
        </div>
      </div>

      {/* Client-centric Reports */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-[#E1306C] border-t-transparent rounded-full animate-spin" />
          <span className="ml-3 text-[14px] text-[#86868b]">Loading...</span>
        </div>
      ) : myClients.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-black/10 dark:border-white/10 p-12 text-center">
          <Users className="w-16 h-16 mx-auto text-[#86868b] opacity-50 mb-4" />
          <h3 className="text-[17px] font-medium text-[#1d1d1f] dark:text-white">No clients assigned</h3>
          <p className="text-[14px] text-[#86868b] mt-2">
            {effectiveIsAdmin ? 'No clients exist in the system yet.' : 'Contact your admin to get clients assigned to you.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {clientsWithReports.map(({ client, reports: clientReports }) => {
            const isExpanded = expandedClient === client.id;
            const monthlyReports = clientReports.filter(r => !r.reportType || r.reportType === 'monthly');
            const quarterlyReports = clientReports.filter(r => r.reportType === 'quarterly');
            const yearlyReports = clientReports.filter(r => r.reportType === 'yearly');
            
            return (
              <div 
                key={client.id}
                className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 overflow-hidden"
              >
                {/* Client Header */}
                <button
                  onClick={() => setExpandedClient(isExpanded ? null : client.id)}
                  className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors text-left"
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden bg-gradient-to-br from-[#833AB4] to-[#E1306C] flex items-center justify-center flex-shrink-0">
                      {client.profilePhoto || client.logo || client.profilePic || client.image ? (
                        <img 
                          src={client.profilePhoto || client.logo || client.profilePic || client.image} 
                          alt={client.clientName || client.name} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-white font-semibold text-lg">
                          {(client.clientName || client.name || '?').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[15px] sm:text-[17px] font-semibold truncate">
                        <ClientLink client={client} showId className="text-[#1d1d1f] dark:text-white" />
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-0.5">
                        <span className="text-[11px] sm:text-[12px] text-[#86868b] flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {clientReports.length} report{clientReports.length !== 1 ? 's' : ''}
                        </span>
                        {client.instagramHandle && (
                          <span className="text-[11px] sm:text-[12px] text-[#E1306C] flex items-center gap-1">
                            <Instagram className="w-3 h-3" />
                            @{client.instagramHandle}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[12px] px-2 py-1 rounded-lg font-medium ${
                      clientReports.length > 0 
                        ? 'bg-[#34c759]/10 text-[#34c759]' 
                        : 'bg-[#86868b]/10 text-[#86868b]'
                    }`}>
                      {clientReports.length > 0 ? `${clientReports.length} reports` : 'No reports'}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-[#86868b]" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-[#86868b]" />
                    )}
                  </div>
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-black/5 dark:border-white/10">
                    {/* Action Buttons */}
                    <div className="p-4 bg-black/[0.02] dark:bg-white/[0.03] flex flex-wrap items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCreateForClient(client.id); }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-[#833AB4] to-[#E1306C] text-white text-[12px] font-medium hover:opacity-90 transition-opacity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        New Monthly Report
                      </button>
                      <button
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setGeneratingReport({ clientId: client.id, type: 'quarterly' });
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#34c759] text-white text-[12px] font-medium hover:opacity-90 transition-opacity"
                      >
                        <CalendarDays className="w-3.5 h-3.5" />
                        Generate Quarterly
                      </button>
                      <button
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setGeneratingReport({ clientId: client.id, type: 'yearly' });
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#5856d6] text-white text-[12px] font-medium hover:opacity-90 transition-opacity"
                      >
                        <FileBarChart className="w-3.5 h-3.5" />
                        Generate Yearly
                      </button>
                    </div>

                    {/* Reports List */}
                    <div className="p-4 space-y-4">
                      {clientReports.length === 0 ? (
                        <div className="text-center py-6">
                          <FolderOpen className="w-10 h-10 mx-auto text-[#86868b] opacity-50 mb-2" />
                          <p className="text-[13px] text-[#86868b]">No reports yet for this client</p>
                          <button
                            onClick={() => handleCreateForClient(client.id)}
                            className="mt-3 text-[13px] text-[#E1306C] font-medium hover:underline"
                          >
                            Create first report →
                          </button>
                        </div>
                      ) : (
                        <>
                          {/* Yearly Reports */}
                          {yearlyReports.length > 0 && (
                            <div>
                              <h4 className="text-[12px] font-semibold text-[#5856d6] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                <FileBarChart className="w-3.5 h-3.5" />
                                Annual Reports ({yearlyReports.length})
                              </h4>
                              <div className="space-y-2">
                                {yearlyReports.map(report => (
                                  <ReportCard key={report.id} report={report} compact />
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Quarterly Reports */}
                          {quarterlyReports.length > 0 && (
                            <div>
                              <h4 className="text-[12px] font-semibold text-[#34c759] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                <CalendarDays className="w-3.5 h-3.5" />
                                Quarterly Reports ({quarterlyReports.length})
                              </h4>
                              <div className="space-y-2">
                                {quarterlyReports.map(report => (
                                  <ReportCard key={report.id} report={report} compact />
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Monthly Reports */}
                          {monthlyReports.length > 0 && (
                            <div>
                              <h4 className="text-[12px] font-semibold text-[#E1306C] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                <BarChart3 className="w-3.5 h-3.5" />
                                Monthly Reports ({monthlyReports.length})
                              </h4>
                              <div className="space-y-2">
                                {monthlyReports.map(report => (
                                  <ReportCard key={report.id} report={report} compact />
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Unlinked Reports (Admin only) */}
          {effectiveIsAdmin && unlinkedReports.length > 0 && (
            <div className="rounded-2xl bg-[#ff9500]/5 dark:bg-[#ff9500]/10 border border-[#ff9500]/20 overflow-hidden">
              <button
                onClick={() => setExpandedClient(expandedClient === 'unlinked' ? null : 'unlinked')}
                className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-[#ff9500]/5 transition-colors text-left"
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#ff9500] flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-[15px] sm:text-[17px] font-semibold text-[#1d1d1f] dark:text-white">
                      Unlinked Reports
                    </h3>
                    <p className="text-[11px] sm:text-[12px] text-[#ff9500]">
                      {unlinkedReports.length} report{unlinkedReports.length !== 1 ? 's' : ''} not linked to any client
                    </p>
                  </div>
                </div>
                {expandedClient === 'unlinked' ? (
                  <ChevronUp className="w-5 h-5 text-[#86868b]" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[#86868b]" />
                )}
              </button>
              {expandedClient === 'unlinked' && (
                <div className="border-t border-[#ff9500]/20 p-4 space-y-2">
                  {unlinkedReports.map(report => (
                    <ReportCard key={report.id} report={report} compact />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingReport) && (
        <ReportModal
          report={editingReport}
          preSelectedClientId={preSelectedClientId}
          onClose={() => {
            setShowCreateModal(false);
            setEditingReport(null);
            setPreSelectedClientId(null);
          }}
          onSave={() => {
            setShowCreateModal(false);
            setEditingReport(null);
            setPreSelectedClientId(null);
          }}
        />
      )}

      {/* Generate Report Modal */}
      {generatingReport && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white flex items-center gap-2">
                {generatingReport.type === 'quarterly' ? (
                  <>
                    <CalendarDays className="w-5 h-5 text-[#34c759]" />
                    Generate Quarterly Report
                  </>
                ) : (
                  <>
                    <FileBarChart className="w-5 h-5 text-[#5856d6]" />
                    Generate Yearly Report
                  </>
                )}
              </h2>
              <button
                onClick={() => setGeneratingReport(null)}
                className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-[#86868b]" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-[13px] text-[#86868b]">
                This will aggregate data from existing monthly reports to create a {generatingReport.type} summary report.
              </p>

              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                  Year
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full h-11 px-4 rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white text-[14px] focus:outline-none focus:ring-2 focus:ring-[#E1306C]"
                >
                  {[...Array(5)].map((_, i) => {
                    const year = new Date().getFullYear() - i;
                    return <option key={year} value={year}>{year}</option>;
                  })}
                </select>
              </div>

              {generatingReport.type === 'quarterly' && (
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                    Quarter
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map(q => (
                      <button
                        key={q}
                        onClick={() => setSelectedQuarter(q)}
                        className={`h-11 rounded-xl text-[14px] font-medium transition-colors ${
                          selectedQuarter === q
                            ? 'bg-[#34c759] text-white'
                            : 'bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15'
                        }`}
                      >
                        Q{q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setGeneratingReport(null)}
                  className="flex-1 h-11 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[14px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (generatingReport.type === 'quarterly') {
                      handleGenerateQuarterlyReport(generatingReport.clientId, selectedYear, selectedQuarter);
                    } else {
                      handleGenerateYearlyReport(generatingReport.clientId, selectedYear);
                    }
                  }}
                  className={`flex-1 h-11 rounded-xl text-white text-[14px] font-medium hover:opacity-90 transition-opacity ${
                    generatingReport.type === 'quarterly' ? 'bg-[#34c759]' : 'bg-[#5856d6]'
                  }`}
                >
                  Generate Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Report Create/Edit Modal Component
const ReportModal = ({ report, preSelectedClientId, onClose, onSave }) => {
  // Parse existing dates if editing
  const parseExistingDate = (dateField) => {
    if (!dateField) return '';
    // Firestore Timestamp
    if (dateField?.toDate) return dateField.toDate().toISOString().split('T')[0];
    // Date object
    if (dateField instanceof Date) return dateField.toISOString().split('T')[0];
    // String date
    if (typeof dateField === 'string') {
      const d = new Date(dateField);
      return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
    }
    return '';
  };

  const [formData, setFormData] = useState({
    clientId: report?.clientId || preSelectedClientId || '',
    clientName: report?.clientName || '',
    title: report?.title || '',
    startDate: parseExistingDate(report?.startDate),
    endDate: parseExistingDate(report?.endDate),
    dateRange: report?.dateRange || '',
    notes: report?.notes || '',
    screenshots: [], // OCR only (not saved); editing loads no screenshots
    postLinks: report?.postLinks || [],
    metrics: report?.metrics || null
  });
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState({ current: 0, total: 0, status: '' });
  const [metricsSectionCollapsed, setMetricsSectionCollapsed] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef(null);
  const hasAutoExtractedRef = useRef(false);

  // Load clients for dropdown
  useEffect(() => {
    const loadClients = async () => {
      try {
        const clientsList = await firestoreService.getClients();
        const sortedClients = clientsList.sort((a, b) => (a.clientName || '').localeCompare(b.clientName || ''));
        setClients(sortedClients);
        
        // If preSelectedClientId is set, update clientName
        if (preSelectedClientId && !formData.clientName) {
          const selectedClient = sortedClients.find(c => c.id === preSelectedClientId);
          if (selectedClient) {
            setFormData(prev => ({
              ...prev,
              clientName: selectedClient.clientName || selectedClient.name || ''
            }));
          }
        }
      } catch (error) {
        console.error('Error loading clients:', error);
      } finally {
        setLoadingClients(false);
      }
    };
    loadClients();
  }, [preSelectedClientId]);

  // Auto-generate dateRange string when dates change
  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const formatDate = (d) => `${months[d.getMonth()]} ${d.getDate()}`;
        const year = end.getFullYear();
        const sameYear = start.getFullYear() === year;
        const dateRangeStr = sameYear
          ? `${formatDate(start)} - ${formatDate(end)}, ${year}`
          : `${formatDate(start)}, ${start.getFullYear()} - ${formatDate(end)}, ${year}`;
        setFormData(prev => ({ ...prev, dateRange: dateRangeStr }));
      }
    }
  }, [formData.startDate, formData.endDate]);

  // Handle client selection
  const handleClientSelect = (clientId) => {
    const selectedClient = clients.find(c => c.id === clientId);
    setFormData(prev => ({
      ...prev,
      clientId: clientId,
      clientName: selectedClient?.clientName || selectedClient?.name || ''
    }));
  };

  // Reset auto-extract ref when opening create modal (new report)
  useEffect(() => {
    if (!report) hasAutoExtractedRef.current = false;
  }, [report]);

  // Auto-run extraction when screenshots are added
  useEffect(() => {
    if (
      formData.screenshots.length === 0 ||
      extracting ||
      hasAutoExtractedRef.current
    ) return;
    hasAutoExtractedRef.current = true;
    runExtraction();
  }, [formData.screenshots.length, extracting]);

  const runExtraction = async () => {
    if (formData.screenshots.length === 0) return;
    setExtracting(true);
    setExtractionProgress({ current: 0, total: formData.screenshots.length, status: 'Analyzing screenshots...' });
    try {
      const images = formData.screenshots.map(s => ({ localFile: s.localFile, url: s.previewUrl }));
      const imageFiles = formData.screenshots.map(s => s.localFile || s.previewUrl);
      let metrics;
      
      // Try AI extraction first (OpenRouter → OpenAI fallback, then Cloud Vision)
      try {
        metrics = await openaiService.extractInstagramMetrics(
          imageFiles,
          (current, total, status) => {
            setExtractionProgress({ current, total, status: status || 'Analyzing with AI...' });
          }
        );
        console.log('✅ AI extraction successful');
      } catch (gptError) {
        console.warn('AI extraction failed, trying Cloud Vision:', gptError);
        
        // Fallback to Cloud Vision OCR
        try {
          setExtractionProgress({ current: 0, total: formData.screenshots.length, status: 'Trying Cloud Vision...' });
          metrics = await cloudVisionOCRService.processScreenshots(
            images,
            (current, total, status) => {
              setExtractionProgress({ current, total, status: status || `Processing screenshot ${current} of ${total}...` });
            }
          );
        } catch (cloudError) {
          console.warn('Cloud Vision failed, falling back to browser OCR:', cloudError);
          
          // Final fallback to browser-based Tesseract OCR
          setExtractionProgress({ current: 0, total: formData.screenshots.length, status: 'Reading screenshots…' });
          metrics = await instagramOCRService.processScreenshots(
            imageFiles,
            (current, total, status) => {
              setExtractionProgress({ current, total, status: status || `Processing screenshot ${current} of ${total}...` });
            }
          );
          await instagramOCRService.terminate();
        }
      }
      setFormData(prev => {
        // Revoke object URLs so we don't leak memory, then dump screenshots (OCR-only)
        (prev.screenshots || []).forEach((s) => { if (s.previewUrl) URL.revokeObjectURL(s.previewUrl); });
        
        // Handle structured dates from OCR
        let newStartDate = prev.startDate;
        let newEndDate = prev.endDate;
        if (metrics.startDate instanceof Date && !isNaN(metrics.startDate.getTime())) {
          newStartDate = metrics.startDate.toISOString().split('T')[0];
        }
        if (metrics.endDate instanceof Date && !isNaN(metrics.endDate.getTime())) {
          newEndDate = metrics.endDate.toISOString().split('T')[0];
        }
        
        return {
          ...prev,
          startDate: newStartDate,
          endDate: newEndDate,
          dateRange: metrics.dateRange ?? prev.dateRange,
          metrics: { ...(prev.metrics || {}), ...metrics },
          screenshots: []
        };
      });
    } catch (error) {
      console.error('Error extracting metrics:', error);
      hasAutoExtractedRef.current = false;
      // Dump screenshots even on error so user can re-add if needed
      setFormData(prev => {
        (prev.screenshots || []).forEach((s) => { if (s.previewUrl) URL.revokeObjectURL(s.previewUrl); });
        return { ...prev, screenshots: [] };
      });
    } finally {
      setExtracting(false);
    }
  };

  const handleFileUpload = async (files) => {
    if (!files?.length) return;

    setUploading(true);
    const newScreenshots = [];

    try {
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue;
        newScreenshots.push({
          localFile: file,
          name: file.name,
          previewUrl: URL.createObjectURL(file)
        });
      }

      setFormData(prev => ({
        ...prev,
        screenshots: [...prev.screenshots, ...newScreenshots]
      }));
    } catch (error) {
      console.error('Error adding screenshots:', error);
      toast.error('Failed to add some files. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const handleRemoveScreenshot = (index) => {
    const screenshot = formData.screenshots[index];
    if (screenshot.previewUrl) URL.revokeObjectURL(screenshot.previewUrl);

    setFormData(prev => ({
      ...prev,
      screenshots: prev.screenshots.filter((_, i) => i !== index)
    }));
  };

  const handleUpdateCaption = (index, caption) => {
    setFormData(prev => ({
      ...prev,
      screenshots: prev.screenshots.map((s, i) => 
        i === index ? { ...s, caption } : s
      )
    }));
  };

  // Update a specific metric value
  const updateMetric = (key, value) => {
    setFormData(prev => ({
      ...prev,
      metrics: {
        ...prev.metrics,
        [key]: value
      }
    }));
  };

  // Update nested metric (like gender.men)
  const updateNestedMetric = (parent, key, value) => {
    setFormData(prev => ({
      ...prev,
      metrics: {
        ...prev.metrics,
        [parent]: {
          ...(prev.metrics?.[parent] || {}),
          [key]: value
        }
      }
    }));
  };

  // Update array item (like topCities[0].percentage)
  const updateArrayMetric = (arrayKey, index, field, value) => {
    setFormData(prev => {
      const arr = [...(prev.metrics?.[arrayKey] || [])];
      if (arr[index]) {
        arr[index] = { ...arr[index], [field]: value };
      }
      return {
        ...prev,
        metrics: {
          ...prev.metrics,
          [arrayKey]: arr
        }
      };
    });
  };

  // Add new item to array
  const addArrayItem = (arrayKey, template) => {
    setFormData(prev => ({
      ...prev,
      metrics: {
        ...prev.metrics,
        [arrayKey]: [...(prev.metrics?.[arrayKey] || []), template]
      }
    }));
  };

  // Remove item from array
  const removeArrayItem = (arrayKey, index) => {
    setFormData(prev => ({
      ...prev,
      metrics: {
        ...prev.metrics,
        [arrayKey]: (prev.metrics?.[arrayKey] || []).filter((_, i) => i !== index)
      }
    }));
  };

  const handleSave = async () => {
    if (!formData.title || !formData.startDate || !formData.endDate) {
      toast.error('Please fill in Report Title and Date Range (start and end dates)');
      return;
    }

    setSaving(true);

    try {
      // Build payload with only serializable data. Never include formData.screenshots (they hold File objects for OCR only).
      const clientId = formData.clientId || null;
      const clientName = String(formData.clientName ?? '');
      const title = String(formData.title ?? '');
      const startDate = formData.startDate ? new Date(formData.startDate) : null;
      const endDate = formData.endDate ? new Date(formData.endDate) : null;
      const dateRange = String(formData.dateRange ?? '');
      const notes = String(formData.notes ?? '');
      const postLinks = (formData.postLinks || []).map((l) => ({ url: String(l?.url ?? ''), label: String(l?.label ?? ''), comment: String(l?.comment ?? '') }));
      const metrics = formData.metrics ? JSON.parse(JSON.stringify(formData.metrics)) : null;

      if (report) {
        await firestoreService.updateInstagramReport(report.id, { clientId, clientName, title, startDate, endDate, dateRange, notes, postLinks, metrics });
      } else {
        await firestoreService.createInstagramReport({ clientId, clientName, title, startDate, endDate, dateRange, notes, postLinks, metrics });
      }
      onSave();
    } catch (error) {
      console.error('Error saving report:', error);
      toast.error('Failed to save report. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {report ? 'Edit Report' : 'Create New Report'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-6">
            {/* Unlinked Report Alert */}
            {report && !report.clientId && (
              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-amber-800 dark:text-amber-200">Unlinked Report</h4>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      This report isn't linked to a client. Select a client below to enable filtering and comparison features.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Basic Info Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Client
                </label>
                <select
                  value={formData.clientId}
                  onChange={(e) => handleClientSelect(e.target.value)}
                  disabled={loadingClients}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                >
                  <option value="">
                    {loadingClients ? 'Loading clients...' : 'Select a client (optional)'}
                  </option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.clientName || client.name || 'Unnamed Client'}
                    </option>
                  ))}
                </select>
                {!formData.clientId && formData.clientName && (
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                    Using custom name: {formData.clientName}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Report Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Monthly Performance"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Date Range Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Date *
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date Range Display
                </label>
                <input
                  type="text"
                  value={formData.dateRange}
                  onChange={(e) => setFormData(prev => ({ ...prev, dateRange: e.target.value }))}
                  placeholder="Auto-generated or custom"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Auto-generated from dates, or customize
                </p>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Report Highlights / Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add insights, highlights, and recommendations for the client..."
                rows={3}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
            </div>

            {/* Screenshots for reading numbers only (not attached to report) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Screenshots (optional — for reading numbers only, not attached)
              </label>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
                  ${dragOver 
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                    : 'border-gray-300 dark:border-white/20 hover:border-purple-400 hover:bg-gray-50 dark:hover:bg-white/5'
                  }
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="hidden"
                />
                {uploading ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                    <span className="ml-3 text-gray-600 dark:text-gray-400">Adding...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-3">
                    <Upload className="w-6 h-6 text-gray-400" />
                    <p className="text-gray-600 dark:text-gray-400">
                      Drop screenshots to read numbers from them (optional)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Screenshots + extraction progress */}
            {formData.screenshots.length > 0 && (
              <div className="space-y-4">
                {extracting && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Sparkles className="w-5 h-5 text-amber-600" />
                      <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                        {extractionProgress.status}
                      </span>
                    </div>
                    <div className="w-full bg-amber-200 dark:bg-amber-800 rounded-full h-2">
                      <div 
                        className="bg-amber-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${extractionProgress.total ? (extractionProgress.current / extractionProgress.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Uploaded Screenshots ({formData.screenshots.length}){extracting ? ' — reading numbers from your screenshots…' : ''}
                  </h4>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                  {formData.screenshots.map((screenshot, index) => (
                    <div key={index} className="relative group border border-gray-200 dark:border-white/10 rounded-lg overflow-hidden">
                      <img
                        src={screenshot.previewUrl || screenshot.url}
                        alt={screenshot.name}
                        className="w-full h-28 object-cover"
                      />
                      {!extracting && (
                        <button
                          onClick={() => handleRemoveScreenshot(index)}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Metrics section — always visible; manual entry for missing fields */}
            <div className="border border-purple-200 dark:border-purple-800 rounded-xl overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white">
                    <BarChart3 className="w-5 h-5" />
                    <span className="font-medium">Metrics</span>
                    <span className="px-2 py-0.5 rounded-md bg-white/20 text-white text-xs">Add or edit any field below</span>
                  </div>
                  <button
                    onClick={() => setMetricsSectionCollapsed((c) => !c)}
                    className="text-white/80 hover:text-white"
                  >
                    {metricsSectionCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                  </button>
                </div>
                
                {!metricsSectionCollapsed && (
                <div className="p-4 bg-purple-50 dark:bg-purple-900/10 space-y-6">
                  {/* Key Metrics — manual entry for missing fields */}
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                      <Eye className="w-4 h-4" /> Key Metrics
                    </h5>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                      Numbers are read from your screenshots when possible; add or edit any field below.
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="text-xs text-gray-500">Views</label>
                        <input
                          type="number"
                          value={formData.metrics?.views || ''}
                          onChange={(e) => updateMetric('views', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="16493"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Followers</label>
                        <input
                          type="number"
                          value={formData.metrics?.followers || ''}
                          onChange={(e) => updateMetric('followers', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="6649"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Interactions</label>
                        <input
                          type="number"
                          value={formData.metrics?.interactions || ''}
                          onChange={(e) => updateMetric('interactions', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="25"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Profile Visits</label>
                        <input
                          type="number"
                          value={formData.metrics?.profileVisits || ''}
                          onChange={(e) => updateMetric('profileVisits', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="907"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Accounts Reached</label>
                        <input
                          type="number"
                          value={formData.metrics?.accountsReached || ''}
                          onChange={(e) => updateMetric('accountsReached', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="858"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Likes</label>
                        <input
                          type="number"
                          value={formData.metrics?.likes || ''}
                          onChange={(e) => updateMetric('likes', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="764"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Comments</label>
                        <input
                          type="number"
                          value={formData.metrics?.comments || ''}
                          onChange={(e) => updateMetric('comments', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="37"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Reposts</label>
                        <input
                          type="number"
                          value={formData.metrics?.reposts || ''}
                          onChange={(e) => updateMetric('reposts', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="20"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Reach</label>
                        <input
                          type="number"
                          value={formData.metrics?.reach || ''}
                          onChange={(e) => updateMetric('reach', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="Optional"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Impressions</label>
                        <input
                          type="number"
                          value={formData.metrics?.impressions || ''}
                          onChange={(e) => updateMetric('impressions', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="Optional"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Saves</label>
                        <input
                          type="number"
                          value={formData.metrics?.saves || ''}
                          onChange={(e) => updateMetric('saves', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="Optional"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Shares</label>
                        <input
                          type="number"
                          value={formData.metrics?.shares || ''}
                          onChange={(e) => updateMetric('shares', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="Optional"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                      <div>
                        <label className="text-xs text-gray-500">Views from Followers %</label>
                        <input
                          type="number"
                          step="0.1"
                          value={formData.metrics?.viewsFollowerPercent || ''}
                          onChange={(e) => updateMetric('viewsFollowerPercent', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="52.9"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Follower Change</label>
                        <input
                          type="number"
                          value={formData.metrics?.followerChange || ''}
                          onChange={(e) => updateMetric('followerChange', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="-37"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Profile Visits Change</label>
                        <input
                          type="text"
                          value={formData.metrics?.profileVisitsChange || ''}
                          onChange={(e) => updateMetric('profileVisitsChange', e.target.value)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="+147.1%"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Interactions from Followers %</label>
                        <input
                          type="number"
                          step="0.1"
                          value={formData.metrics?.interactionsFollowerPercent || ''}
                          onChange={(e) => updateMetric('interactionsFollowerPercent', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="94.5"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Accounts Reached Change</label>
                        <input
                          type="text"
                          value={formData.metrics?.accountsReachedChange || ''}
                          onChange={(e) => updateMetric('accountsReachedChange', e.target.value)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="-34.3%"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Engagement Rate %</label>
                        <input
                          type="number"
                          step="0.1"
                          value={formData.metrics?.engagementRatePercent || ''}
                          onChange={(e) => updateMetric('engagementRatePercent', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="Optional"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Gender */}
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4" /> Gender Split
                    </h5>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500">Men %</label>
                        <input
                          type="number"
                          step="0.1"
                          value={formData.metrics?.gender?.men || ''}
                          onChange={(e) => updateNestedMetric('gender', 'men', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="52"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Women %</label>
                        <input
                          type="number"
                          step="0.1"
                          value={formData.metrics?.gender?.women || ''}
                          onChange={(e) => updateNestedMetric('gender', 'women', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="48"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Growth */}
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" /> Follower Growth
                    </h5>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-gray-500">Net Change</label>
                        <input
                          type="number"
                          value={formData.metrics?.growth?.overall || ''}
                          onChange={(e) => updateNestedMetric('growth', 'overall', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="-37"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">New Follows</label>
                        <input
                          type="number"
                          value={formData.metrics?.growth?.follows || ''}
                          onChange={(e) => updateNestedMetric('growth', 'follows', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="6724"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Unfollows</label>
                        <input
                          type="number"
                          value={formData.metrics?.growth?.unfollows || ''}
                          onChange={(e) => updateNestedMetric('growth', 'unfollows', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="6761"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Top Cities */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <MapPin className="w-4 h-4" /> Top Cities
                      </h5>
                      <button
                        onClick={() => addArrayItem('topCities', { name: '', percentage: 0 })}
                        className="text-xs text-purple-600 hover:text-purple-700"
                      >
                        + Add City
                      </button>
                    </div>
                    <div className="space-y-2">
                      {(formData.metrics?.topCities || []).map((city, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={city.name}
                            onChange={(e) => updateArrayMetric('topCities', idx, 'name', e.target.value)}
                            className="flex-1 px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                            placeholder="City name"
                          />
                          <input
                            type="number"
                            step="0.1"
                            value={city.percentage}
                            onChange={(e) => updateArrayMetric('topCities', idx, 'percentage', parseFloat(e.target.value) || 0)}
                            className="w-20 px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                            placeholder="%"
                          />
                          <button
                            onClick={() => removeArrayItem('topCities', idx)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Age Ranges */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Users className="w-4 h-4" /> Age Distribution
                      </h5>
                      <button
                        onClick={() => addArrayItem('ageRanges', { range: '', percentage: 0 })}
                        className="text-xs text-purple-600 hover:text-purple-700"
                      >
                        + Add Range
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {(formData.metrics?.ageRanges || []).map((age, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={age.range}
                            onChange={(e) => updateArrayMetric('ageRanges', idx, 'range', e.target.value)}
                            className="w-24 px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                            placeholder="18-24"
                          />
                          <input
                            type="number"
                            step="0.1"
                            value={age.percentage}
                            onChange={(e) => updateArrayMetric('ageRanges', idx, 'percentage', parseFloat(e.target.value) || 0)}
                            className="w-20 px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                            placeholder="%"
                          />
                          <button
                            onClick={() => removeArrayItem('ageRanges', idx)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Content Breakdown */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Heart className="w-4 h-4" /> Content Breakdown
                      </h5>
                      <button
                        onClick={() => addArrayItem('contentBreakdown', { type: '', percentage: 0 })}
                        className="text-xs text-purple-600 hover:text-purple-700"
                      >
                        + Add Type
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {(formData.metrics?.contentBreakdown || []).map((content, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={content.type}
                            onChange={(e) => updateArrayMetric('contentBreakdown', idx, 'type', e.target.value)}
                            className="flex-1 px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                            placeholder="Posts"
                          />
                          <input
                            type="number"
                            step="0.1"
                            value={content.percentage}
                            onChange={(e) => updateArrayMetric('contentBreakdown', idx, 'percentage', parseFloat(e.target.value) || 0)}
                            className="w-16 px-2 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                            placeholder="%"
                          />
                          <button
                            onClick={() => removeArrayItem('contentBreakdown', idx)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                )}
              </div>

            {/* Instagram post links (shown on report as previews) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Social media post previews
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Add Instagram post links and a comment about each piece of content for the report.
              </p>
              {(formData.postLinks || []).map((link, idx) => (
                <div key={idx} className="border border-gray-200 dark:border-white/20 rounded-lg p-3 mb-3 space-y-2">
                  <div className="flex gap-2 items-center">
                    <input
                      type="url"
                      value={link.url || ''}
                      onChange={(e) => {
                        const next = [...(formData.postLinks || [])];
                        next[idx] = { ...next[idx], url: e.target.value };
                        setFormData(prev => ({ ...prev, postLinks: next }));
                      }}
                      placeholder="https://www.instagram.com/p/..."
                      className="flex-1 px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                    />
                    <input
                      type="text"
                      value={link.label || ''}
                      onChange={(e) => {
                        const next = [...(formData.postLinks || [])];
                        next[idx] = { ...next[idx], label: e.target.value };
                        setFormData(prev => ({ ...prev, postLinks: next }));
                      }}
                      placeholder="Label (optional)"
                      className="w-28 px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, postLinks: (prev.postLinks || []).filter((_, i) => i !== idx) }))}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea
                    value={link.comment || ''}
                    onChange={(e) => {
                      const next = [...(formData.postLinks || [])];
                      next[idx] = { ...next[idx], comment: e.target.value };
                      setFormData(prev => ({ ...prev, postLinks: next }));
                    }}
                    placeholder="Comment about this post (e.g. insight, performance note)"
                    rows={2}
                    className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm resize-none"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, postLinks: [...(prev.postLinks || []), { url: '', label: '', comment: '' }] }))}
                className="text-sm text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Add link
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-white/10 flex items-center justify-between">
          <button
            onClick={() => setShowPreview(true)}
            disabled={!formData.title || !formData.clientName}
            className="flex items-center px-4 py-2 rounded-xl border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 text-[14px] font-medium hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors disabled:opacity-50"
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview Report
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-black/10 dark:border-white/20 text-[#1d1d1f] dark:text-white text-[14px] font-medium hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || uploading || extracting}
              className="flex items-center px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-[14px] font-medium transition-colors disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  {report ? 'Save Changes' : 'Create Report'}
                </>
              )}
            </button>
          </div>
        </div>
        </div>
      </div>
      {/* Live Preview Modal */}
      {showPreview && (
        <ReportPreviewModal
          report={formData}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  );
};

// Report Preview Modal - Shows live preview of the report being created/edited
const ReportPreviewModal = ({ report, onClose }) => {
  const [lightboxImage, setLightboxImage] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const screenshots = report.screenshots || [];
  const openLightbox = (index) => {
    if (screenshots[index]) {
      setLightboxIndex(index);
      setLightboxImage(screenshots[index]);
    }
  };

  const closeLightbox = () => {
    setLightboxImage(null);
  };

  const navigateLightbox = (direction) => {
    const newIndex = lightboxIndex + direction;
    if (newIndex >= 0 && newIndex < screenshots.length) {
      setLightboxIndex(newIndex);
      setLightboxImage(screenshots[newIndex]);
    }
  };

  // Handle keyboard navigation in lightbox
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (lightboxImage) {
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') navigateLightbox(-1);
        if (e.key === 'ArrowRight') navigateLightbox(1);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxImage, lightboxIndex]);

  const isQuarterly = report.reportType === 'quarterly';
  const isYearly = report.reportType === 'yearly';
  const isAggregated = isQuarterly || isYearly;
  const sourceCount = report.sourceReportIds?.length;

  return (
    <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Preview Header — type-specific colors */}
        <div className={`px-6 py-3 border-b border-gray-200 flex items-center justify-between text-white ${
          isYearly ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600' :
          isQuarterly ? 'bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500' :
          'bg-gradient-to-r from-purple-600 to-pink-600'
        }`}>
          <div className="flex items-center gap-3">
            {isYearly ? <FileBarChart className="w-5 h-5" /> : isQuarterly ? <CalendarDays className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            <span className="font-medium">Report Preview</span>
            {isYearly && <span className="px-2 py-0.5 rounded-md bg-white/20 text-xs">Annual</span>}
            {isQuarterly && <span className="px-2 py-0.5 rounded-md bg-white/20 text-xs">Quarterly</span>}
            {!isAggregated && <span className="px-2 py-0.5 rounded-md bg-white/20 text-xs">Live</span>}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preview Content - Scrollable */}
        <div className={`flex-1 overflow-y-auto ${
          isYearly ? 'bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50' :
          isQuarterly ? 'bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50' :
          'bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50'
        }`}>
          {/* Hero Section — type-specific gradient */}
          <div className="relative overflow-hidden">
            <div className={`absolute inset-0 ${
              isYearly ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500' :
              isQuarterly ? 'bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500' :
              'bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500'
            }`} />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzLTItMi00LTJjLTItNC00LTItNC0ycy0yIDItMiA0YzAgMiAyIDQgMiA0czIgMiA0IDJjMiA0IDQgMiA0IDJzMi0yIDItNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-10" />
            
            <div className="relative max-w-4xl mx-auto px-6 py-12 sm:py-16 pb-20 sm:pb-24">
              <div className="text-center text-white">
                <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm font-medium">{report.dateRange || 'Date Range'}</span>
                  </div>
                  {isYearly && <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-sm font-medium">Annual Report</span>}
                  {isQuarterly && <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-sm font-medium">Quarterly Report</span>}
                </div>
                
                <h1 className="text-3xl sm:text-4xl font-bold mb-3">
                  {report.title || 'Report Title'}
                </h1>
                
                <div className="flex flex-col items-center gap-1 text-white/90 mb-6">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    <span className="text-lg">{report.clientName || 'Client Name'}</span>
                  </div>
                  {isAggregated && sourceCount != null && sourceCount > 0 && (
                    <p className="text-sm text-white/80">Aggregated from {sourceCount} monthly report{sourceCount !== 1 ? 's' : ''}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Wave Decoration */}
            <div className="absolute bottom-0 left-0 right-0">
              <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 80L60 70C120 60 240 40 360 30C480 20 600 20 720 25C840 30 960 40 1080 45C1200 50 1320 50 1380 50L1440 50V80H1380C1320 80 1200 80 1080 80C960 80 840 80 720 80C600 80 480 80 360 80C240 80 120 80 60 80H0Z" fill={isYearly ? 'rgb(238, 242, 255)' : isQuarterly ? 'rgb(236, 253, 245)' : 'rgb(250, 245, 255)'} />
              </svg>
            </div>
          </div>

          {/* Key Metrics Overview — match public report layout */}
          {report.metrics && (
            <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-8 relative z-10">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { 
                    icon: Eye, 
                    label: 'Total Views', 
                    value: report.metrics.views?.toLocaleString() || '—', 
                    color: 'from-purple-500 to-purple-600',
                    subtext: (report.metrics.views != null && report.metrics.viewsFollowerPercent != null) ? `${report.metrics.viewsFollowerPercent}% from followers` : null
                  },
                  { 
                    icon: Users, 
                    label: 'Followers', 
                    value: report.metrics.followers?.toLocaleString() || '—', 
                    color: 'from-pink-500 to-pink-600',
                    subtext: report.metrics.followerChange != null ? `${report.metrics.followerChange > 0 ? '+' : ''}${report.metrics.followerChange}` : null,
                    subtextColor: report.metrics.followerChange > 0 ? 'text-green-600' : 'text-red-500'
                  },
                  { 
                    icon: Heart, 
                    label: 'Interactions', 
                    value: report.metrics.interactions?.toLocaleString() || '—', 
                    color: 'from-orange-500 to-orange-600',
                    subtext: (report.metrics.interactions != null && report.metrics.interactionsFollowerPercent != null) ? `${report.metrics.interactionsFollowerPercent}% from followers` : null
                  },
                  { 
                    icon: MousePointer, 
                    label: 'Profile Visits', 
                    value: report.metrics.profileVisits?.toLocaleString() || '—', 
                    color: 'from-blue-500 to-blue-600',
                    subtext: (report.metrics.profileVisits != null && report.metrics.profileVisitsChange) ? `${report.metrics.profileVisitsChange}` : null,
                    subtextColor: report.metrics.profileVisitsChange?.startsWith?.('+') ? 'text-green-600' : 'text-red-500'
                  },
                ].map((stat, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-2xl shadow-lg p-5"
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
                      <stat.icon className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                    {stat.subtext && (
                      <p className={`text-xs mt-1 ${stat.subtextColor || 'text-gray-400'}`}>{stat.subtext}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quarterly breakdown — yearly reports only */}
          {isYearly && report.quarterlyBreakdown && report.quarterlyBreakdown.length > 0 && (
            <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-8">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-500" />
                    Quarterly breakdown
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">Performance by quarter</p>
                </div>
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {report.quarterlyBreakdown.map((q) => {
                    const m = q.metrics;
                    const hasData = m && (m.views != null || m.interactions != null || m.profileVisits != null);
                    return (
                      <div
                        key={q.quarter}
                        className={`rounded-xl border-2 p-4 ${
                          hasData ? 'bg-gray-50/80 border-indigo-100' : 'bg-gray-50/50 border-gray-100'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-bold text-indigo-600">Q{q.quarter}</span>
                          {q.reportCount != null && <span className="text-xs text-gray-500">{q.reportCount} report{q.reportCount !== 1 ? 's' : ''}</span>}
                        </div>
                        {hasData ? (
                          <div className="space-y-2 text-sm">
                            {m.views != null && <div className="flex justify-between"><span className="text-gray-500">Views</span><span className="font-medium">{m.views.toLocaleString()}</span></div>}
                            {m.interactions != null && <div className="flex justify-between"><span className="text-gray-500">Interactions</span><span className="font-medium">{m.interactions.toLocaleString()}</span></div>}
                            {m.profileVisits != null && <div className="flex justify-between"><span className="text-gray-500">Profile visits</span><span className="font-medium">{m.profileVisits.toLocaleString()}</span></div>}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400">No data</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Notes Section — match public report */}
          {report.notes && (
            <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-12">
              <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-purple-500" />
                  Report Highlights
                </h2>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {report.notes}
                </p>
              </div>
            </div>
          )}

          {/* Insights — match public report layout */}
          {report.metrics && (
            <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-10">
              <div className="rounded-2xl overflow-hidden bg-white border border-gray-200 text-gray-900 shadow-lg">
                <div className="p-6 sm:p-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Insights</h2>
                  <p className="text-sm text-gray-500 mb-6">{report.dateRange}</p>

                  {/* Circular bars: Views & Interactions. Single circle = centered; two = grid. Top cities beside Views. */}
                  {(() => {
                    const hasViews = report.metrics.views != null || report.metrics.viewsFollowerPercent != null;
                    const hasInteractions = report.metrics.interactions != null;
                    const hasTopCities = report.metrics.topCities && report.metrics.topCities.length > 0;
                    const oneCircle = [hasViews, hasInteractions].filter(Boolean).length === 1;
                    return (
                      <div className={oneCircle ? 'flex justify-center mb-10' : 'grid grid-cols-1 sm:grid-cols-2 gap-10 sm:gap-12 mb-10'}>
                        {hasViews && (
                          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8">
                            <div className="flex flex-col items-center flex-shrink-0">
                              <div className="relative w-[200px] h-[200px]">
                                <svg width="200" height="200" viewBox="0 0 200 200" className="transform -rotate-90 w-full h-full">
                                  <circle cx="100" cy="100" r="78" fill="none" stroke="#e5e7eb" strokeWidth="28" />
                                  <circle cx="100" cy="100" r="78" fill="none" stroke="#9C27B0" strokeWidth="28" strokeDasharray={`${(report.metrics.viewsFollowerPercent ?? 50) * 4.9} 490`} strokeLinecap="round" />
                                  <circle cx="100" cy="100" r="78" fill="none" stroke="#E040FB" strokeWidth="28" strokeDasharray={`${(100 - (report.metrics.viewsFollowerPercent ?? 50)) * 4.9} 490`} strokeDashoffset={`-${(report.metrics.viewsFollowerPercent ?? 50) * 4.9}`} strokeLinecap="round" />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                  <span className="text-gray-500 text-sm font-medium">Views</span>
                                  <span className="text-3xl font-bold text-gray-900 mt-0.5">{report.metrics.views != null ? report.metrics.views.toLocaleString() : '—'}</span>
                                </div>
                              </div>
                              <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="w-3 h-3 rounded-full bg-[#9C27B0]" />
                                  <span className="text-sm text-gray-600">Followers</span>
                                  <span className="text-sm font-semibold text-gray-900">{formatPercent(report.metrics.viewsFollowerPercent)}%</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="w-3 h-3 rounded-full bg-[#E040FB]" />
                                  <span className="text-sm text-gray-600">Non-followers</span>
                                  <span className="text-sm font-semibold text-gray-900">{nonFollowersPercent(report.metrics.viewsFollowerPercent, report.metrics.nonFollowerPercent)}%</span>
                                </div>
                              </div>
                            </div>
                            {hasTopCities && (
                              <div className="min-w-0 flex-1 max-w-xs sm:max-w-sm">
                                <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                  <MapPin className="w-4 h-4 text-purple-500 flex-shrink-0" />
                                  Top locations
                                </h3>
                                <div className="space-y-3">
                                  {report.metrics.topCities.map((city, idx) => {
                                    const maxPct = report.metrics.topCities[0]?.percentage || 100;
                                    const barPct = Math.min(100, (city.percentage / maxPct) * 100);
                                    return (
                                      <div key={idx} className="flex items-center gap-3">
                                        <span className="text-sm text-gray-700 w-28 flex-shrink-0 truncate">{city.name}</span>
                                        <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden min-w-0">
                                          <div className="h-full rounded-full bg-[#E040FB] transition-all duration-500" style={{ width: `${barPct}%` }} />
                                        </div>
                                        <span className="text-sm font-medium text-gray-900 w-12 text-right flex-shrink-0">{city.percentage}%</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        {hasInteractions && (
                          <div className="flex flex-col items-center flex-shrink-0">
                            <div className="relative w-[200px] h-[200px]">
                              <svg width="200" height="200" viewBox="0 0 200 200" className="transform -rotate-90 w-full h-full">
                                <circle cx="100" cy="100" r="78" fill="none" stroke="#e5e7eb" strokeWidth="28" />
                                <circle cx="100" cy="100" r="78" fill="none" stroke="#E040FB" strokeWidth="28" strokeDasharray={`${((report.metrics.interactionsFollowerPercent ?? report.metrics.viewsFollowerPercent) ?? 50) * 4.9} 490`} strokeLinecap="round" />
                                <circle cx="100" cy="100" r="78" fill="none" stroke="#7C4DFF" strokeWidth="28" strokeDasharray={`${(100 - ((report.metrics.interactionsFollowerPercent ?? report.metrics.viewsFollowerPercent) ?? 50)) * 4.9} 490`} strokeDashoffset={`-${((report.metrics.interactionsFollowerPercent ?? report.metrics.viewsFollowerPercent) ?? 50) * 4.9}`} strokeLinecap="round" />
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-gray-500 text-sm font-medium">Interactions</span>
                                <span className="text-3xl font-bold text-gray-900 mt-0.5">{report.metrics.interactions.toLocaleString()}</span>
                              </div>
                            </div>
                            <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-1">
                              <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-[#E040FB]" />
                                <span className="text-sm text-gray-600">Followers</span>
                                <span className="text-sm font-semibold text-gray-900">{formatPercent(report.metrics.interactionsFollowerPercent ?? report.metrics.viewsFollowerPercent)}%</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-[#7C4DFF]" />
                                <span className="text-sm text-gray-600">Non-followers</span>
                                <span className="text-sm font-semibold text-gray-900">{nonFollowersPercent(report.metrics.interactionsFollowerPercent ?? report.metrics.viewsFollowerPercent, null)}%</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Top locations (standalone when no Views circle) */}
                  {report.metrics.topCities && report.metrics.topCities.length > 0 && (report.metrics.views == null && report.metrics.viewsFollowerPercent == null) && (
                    <div className="mt-8">
                      <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-purple-500" />
                        Top locations
                      </h3>
                      <div className="space-y-3">
                        {report.metrics.topCities.map((city, idx) => {
                          const maxPct = report.metrics.topCities[0]?.percentage || 100;
                          const barPct = Math.min(100, (city.percentage / maxPct) * 100);
                          return (
                            <div key={idx} className="flex items-center gap-3">
                              <span className="text-sm text-gray-700 w-28 flex-shrink-0">{city.name}</span>
                              <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-[#E040FB] transition-all duration-500" style={{ width: `${barPct}%` }} />
                              </div>
                              <span className="text-sm font-medium text-gray-900 w-12 text-right">{city.percentage}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Age range */}
                  {report.metrics.ageRanges && report.metrics.ageRanges.length > 0 && (
                    <div className="mt-8">
                      <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Users className="w-4 h-4 text-purple-500" />
                        Age range
                      </h3>
                      <div className="space-y-3">
                        {report.metrics.ageRanges.map((range, idx) => {
                          const maxPct = report.metrics.ageRanges[0]?.percentage || 100;
                          const barPct = Math.min(100, (range.percentage / maxPct) * 100);
                          return (
                            <div key={idx} className="flex items-center gap-3">
                              <span className="text-sm text-gray-700 w-16 flex-shrink-0">{range.range}</span>
                              <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-[#E040FB] transition-all duration-500" style={{ width: `${barPct}%` }} />
                              </div>
                              <span className="text-sm font-medium text-gray-900 w-12 text-right">{range.percentage}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* By content type */}
                  {report.metrics.contentBreakdown && report.metrics.contentBreakdown.length > 0 && (
                    <div className="mt-8">
                      <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-purple-500" />
                        By content type
                      </h3>
                      <div className="space-y-3">
                        {report.metrics.contentBreakdown.map((item, idx) => {
                          const maxPct = report.metrics.contentBreakdown[0]?.percentage || 100;
                          const barPct = Math.min(100, (item.percentage / maxPct) * 100);
                          return (
                            <div key={idx} className="flex items-center gap-3">
                              <span className="text-sm text-gray-700 w-16 flex-shrink-0">{item.type}</span>
                              <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-[#E040FB] transition-all duration-500" style={{ width: `${barPct}%` }} />
                              </div>
                              <span className="text-sm font-medium text-gray-900 w-12 text-right">{item.percentage}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Gender */}
                  {report.metrics.gender && (report.metrics.gender.men != null || report.metrics.gender.women != null) && (
                    <div className="mt-8">
                      <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-purple-500" />
                        Gender
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-600">Men</span>
                            <span className="font-medium text-gray-900">{report.metrics.gender.men ?? 0}%</span>
                          </div>
                          <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-[#E040FB]" style={{ width: `${report.metrics.gender.men ?? 0}%` }} />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-600">Women</span>
                            <span className="font-medium text-gray-900">{report.metrics.gender.women ?? 0}%</span>
                          </div>
                          <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-[#9C27B0]" style={{ width: `${report.metrics.gender.women ?? 0}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Growth */}
                  {report.metrics.growth && (report.metrics.growth.follows != null || report.metrics.growth.unfollows != null || report.metrics.growth.overall !== undefined) && (
                    <div className="mt-6">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <TrendingUp className="w-3.5 h-3.5 text-purple-500" />
                        Growth
                      </h3>
                      {(() => {
                        const follows = report.metrics.growth.follows ?? 0;
                        const unfollows = report.metrics.growth.unfollows ?? 0;
                        const netChange = report.metrics.growth.overall !== undefined ? report.metrics.growth.overall : (follows - unfollows);
                        return (
                          <div className="grid grid-cols-3 gap-3">
                            <div className="bg-gray-100 rounded-lg p-3 text-center">
                              <div className={`text-lg font-bold ${netChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{netChange >= 0 ? '+' : ''}{netChange.toLocaleString()}</div>
                              <p className="text-[10px] text-gray-500 mt-0.5">Overall</p>
                            </div>
                            <div className="bg-gray-100 rounded-lg p-3 text-center">
                              <div className="text-lg font-bold text-emerald-600">{follows.toLocaleString()}</div>
                              <p className="text-[10px] text-gray-500 mt-0.5">Follows</p>
                            </div>
                            <div className="bg-gray-100 rounded-lg p-3 text-center">
                              <div className="text-lg font-bold text-red-600">{unfollows.toLocaleString()}</div>
                              <p className="text-[10px] text-gray-500 mt-0.5">Unfollows</p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Engagement: likes, comments, shares, saves, reposts */}
                  {(report.metrics.likes != null || report.metrics.comments != null || report.metrics.shares != null || report.metrics.saves != null || report.metrics.reposts != null) && (
                    <div className="mt-6">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Heart className="w-3.5 h-3.5 text-purple-500" />
                        By interaction
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {report.metrics.likes != null && (
                          <div className="bg-gray-100 rounded-lg p-3 text-center">
                            <div className="text-lg font-bold text-gray-900">{report.metrics.likes.toLocaleString()}</div>
                            <p className="text-[10px] text-gray-500 mt-0.5">Likes</p>
                          </div>
                        )}
                        {report.metrics.comments != null && (
                          <div className="bg-gray-100 rounded-lg p-3 text-center">
                            <div className="text-lg font-bold text-gray-900">{report.metrics.comments.toLocaleString()}</div>
                            <p className="text-[10px] text-gray-500 mt-0.5">Comments</p>
                          </div>
                        )}
                        {report.metrics.shares != null && (
                          <div className="bg-gray-100 rounded-lg p-3 text-center">
                            <div className="text-lg font-bold text-gray-900">{report.metrics.shares.toLocaleString()}</div>
                            <p className="text-[10px] text-gray-500 mt-0.5">Shares</p>
                          </div>
                        )}
                        {report.metrics.saves != null && (
                          <div className="bg-gray-100 rounded-lg p-3 text-center">
                            <div className="text-lg font-bold text-gray-900">{report.metrics.saves.toLocaleString()}</div>
                            <p className="text-[10px] text-gray-500 mt-0.5">Saves</p>
                          </div>
                        )}
                        {report.metrics.reposts != null && (
                          <div className="bg-gray-100 rounded-lg p-3 text-center">
                            <div className="text-lg font-bold text-gray-900">{report.metrics.reposts.toLocaleString()}</div>
                            <p className="text-[10px] text-gray-500 mt-0.5">Reposts</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Most active times */}
                  {report.metrics.activeTimes && report.metrics.activeTimes.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-purple-500" />
                        Most active times
                      </h3>
                      <div className="flex items-end justify-between gap-0.5 h-20">
                        {report.metrics.activeTimes.map((time, idx) => (
                          <div key={idx} className="flex-1 flex flex-col items-center min-w-0">
                            <div className="w-full max-w-[16px] mx-auto bg-[#E040FB] rounded-t transition-all duration-300" style={{ height: `${Math.max(4, time.activity || 0)}%` }} />
                            <span className="text-[9px] text-gray-500 mt-1 truncate w-full text-center">{time.hour}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Detailed Metrics Section — match public report */}
          {report.metrics && (
            <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                
                {/* Content Performance */}
                {report.metrics.contentBreakdown && report.metrics.contentBreakdown.length > 0 && (
                  <div className="bg-white rounded-xl shadow-lg p-5">
                    <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-purple-500" />
                      Content Performance
                    </h3>
                    <div className="space-y-3">
                      {report.metrics.contentBreakdown.map((item, idx) => (
                        <div key={idx}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">{item.type}</span>
                            <span className="font-medium text-gray-900">{item.percentage}%</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div 
                              className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top Locations */}
                {report.metrics.topCities && report.metrics.topCities.length > 0 && (
                  <div className="bg-white rounded-xl shadow-lg p-5">
                    <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-pink-500" />
                      Top Locations
                    </h3>
                    <div className="space-y-2">
                      {report.metrics.topCities.map((city, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">{city.name}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-gray-100 rounded-full h-2">
                              <div 
                                className="h-2 rounded-full bg-gradient-to-r from-pink-500 to-orange-500"
                                style={{ width: `${(city.percentage / (report.metrics.topCities[0]?.percentage || 100)) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-gray-900 w-10 text-right">{city.percentage}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Age Demographics */}
                {report.metrics.ageRanges && report.metrics.ageRanges.length > 0 && (
                  <div className="bg-white rounded-xl shadow-lg p-5">
                    <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-500" />
                      Age Distribution
                    </h3>
                    <div className="space-y-2">
                      {report.metrics.ageRanges.map((range, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">{range.range}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-gray-100 rounded-full h-2">
                              <div 
                                className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                                style={{ width: `${(range.percentage / (report.metrics.ageRanges[0]?.percentage || 100)) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-gray-900 w-10 text-right">{range.percentage}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Gender Split */}
                {report.metrics.gender && (report.metrics.gender.men || report.metrics.gender.women) && (
                  <div className="bg-white rounded-xl shadow-lg p-5">
                    <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-orange-500" />
                      Audience Gender
                    </h3>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-600">Men</span>
                          <span className="font-medium text-gray-900">{report.metrics.gender.men}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-3">
                          <div 
                            className="h-3 rounded-full bg-gradient-to-r from-blue-400 to-blue-600"
                            style={{ width: `${report.metrics.gender.men}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-600">Women</span>
                          <span className="font-medium text-gray-900">{report.metrics.gender.women}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-3">
                          <div 
                            className="h-3 rounded-full bg-gradient-to-r from-pink-400 to-pink-600"
                            style={{ width: `${report.metrics.gender.women}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Growth Metrics */}
                {report.metrics.growth && (report.metrics.growth.overall !== undefined || report.metrics.growth.follows || report.metrics.growth.unfollows) && (
                  <div className="bg-white rounded-xl shadow-lg p-5 lg:col-span-2">
                    <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      Follower Growth
                    </h3>
                    {(() => {
                      // Auto-calculate net change if we have follows and unfollows
                      const follows = report.metrics.growth.follows || 0;
                      const unfollows = report.metrics.growth.unfollows || 0;
                      const netChange = report.metrics.growth.overall !== undefined && report.metrics.growth.overall !== 0
                        ? report.metrics.growth.overall 
                        : (follows - unfollows);
                      
                      return (
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <div className={`text-2xl font-bold ${netChange >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                              {netChange >= 0 ? '+' : ''}{netChange.toLocaleString()}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Net Change</p>
                          </div>
                          <div className="text-center p-3 bg-green-50 rounded-lg">
                            <div className="flex items-center justify-center gap-1">
                              <UserPlus className="w-4 h-4 text-green-600" />
                              <span className="text-2xl font-bold text-green-600">{follows.toLocaleString()}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">New Follows</p>
                          </div>
                          <div className="text-center p-3 bg-red-50 rounded-lg">
                            <div className="flex items-center justify-center gap-1">
                              <UserMinus className="w-4 h-4 text-red-500" />
                              <span className="text-2xl font-bold text-red-500">{unfollows.toLocaleString()}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Unfollows</p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Instagram Content - embedded posts (match public report) */}
          {report.postLinks && report.postLinks.length > 0 && (
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Instagram Content
                </h2>
                <p className="text-gray-600 text-sm">
                  Featured posts and reels from this period
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                {report.postLinks.map((link, index) => {
                  const embedUrl = getInstagramEmbedUrl(link.url);
                  return (
                    <div
                      key={index}
                      className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden flex flex-col"
                    >
                      {embedUrl ? (
                        <div className="w-full max-w-[400px] mx-auto">
                          <div className="rounded-t-2xl overflow-hidden bg-gray-100">
                            <iframe
                              src={embedUrl}
                              title={link.label || `Instagram post ${index + 1}`}
                              className="w-full border-0"
                              style={{ minHeight: 480 }}
                              allow="encrypted-media"
                              loading="lazy"
                            />
                          </div>
                        </div>
                      ) : (
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex items-center gap-4 p-5 flex-shrink-0"
                        >
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                            <Instagram className="w-6 h-6 text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 truncate group-hover:text-purple-600">
                              {link.label || 'View post'}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{link.url}</p>
                          </div>
                          <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        </a>
                      )}
                      {(link.label && embedUrl) && (
                        <p className="px-5 pt-2 text-sm font-medium text-gray-900">{link.label}</p>
                      )}
                      {link.comment && (
                        <p className="p-5 pt-2 text-sm text-gray-600 whitespace-pre-wrap border-t border-gray-100">
                          {link.comment}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Legacy screenshots gallery */}
          {report.screenshots && report.screenshots.length > 0 && (
            <div className="max-w-4xl mx-auto px-6 py-8">
              <div className="grid grid-cols-2 gap-4">
                {report.screenshots.map((screenshot, index) => (
                  <div
                    key={index}
                    onClick={() => openLightbox(index)}
                    className="group bg-white rounded-xl shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <img
                        src={screenshot.url}
                        alt={screenshot.caption || `Screenshot ${index + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    {screenshot.caption && (
                      <div className="p-3">
                        <p className="text-sm text-gray-700">{screenshot.caption}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state when no post links and no screenshots */}
          {(!report.postLinks || report.postLinks.length === 0) && (!report.screenshots || report.screenshots.length === 0) && (
            <div className="max-w-4xl mx-auto px-6 py-8">
              <div className="text-center py-12 bg-white/50 rounded-xl border-2 border-dashed border-gray-200">
                <LinkIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No post links added</p>
              </div>
            </div>
          )}

          {/* Footer */}
          <footer className="bg-white border-t border-gray-200 mt-8">
            <div className="max-w-4xl mx-auto px-6 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img 
                    src="/Luxury-listings-logo-CLR.png" 
                    alt="Luxury Listings" 
                    className="h-6 w-auto"
                  />
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Luxury Listings</p>
                    <p className="text-xs text-gray-500">Social Media Management</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Preview generated {format(new Date(), 'MMMM d, yyyy')}
                </p>
              </div>
            </div>
          </footer>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 bg-black/95 z-[70] flex items-center justify-center"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          {screenshots.length > 0 && lightboxIndex > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); navigateLightbox(-1); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}
          
          {screenshots.length > 0 && lightboxIndex < screenshots.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); navigateLightbox(1); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}

          <div 
            className="max-w-[90vw] max-h-[85vh] relative"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxImage.url}
              alt={lightboxImage.caption || 'Screenshot'}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
            <p className="text-white text-sm">
              {lightboxIndex + 1} / {screenshots.length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstagramReportsPage;
