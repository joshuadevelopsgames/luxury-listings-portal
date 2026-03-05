import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/PermissionsContext';
import { FEATURE_PERMISSIONS } from '../contexts/PermissionsContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { toast } from 'react-hot-toast';
import { firestoreService } from '../services/firestoreService';
import { openaiService } from '../services/openaiService';
import { cloudVisionOCRService } from '../services/cloudVisionOCRService';
// Fallback to browser-based OCR if Cloud Vision and AI extraction fail
import { instagramOCRService } from '../services/instagramOCRService';
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
  FileBarChart,
  Archive
} from 'lucide-react';
import { format, startOfQuarter, endOfQuarter, startOfYear, endOfYear, getQuarter, getYear, getMonth, parseISO, isWithinInterval } from 'date-fns';

// Vancouver-friendly: parse YYYY-MM-DD as calendar date (no UTC shift). Month names for display.
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function formatDateRangeDisplay(startYYYYMMDD, endYYYYMMDD) {
  const parse = (s) => {
    if (!s || typeof s !== 'string') return null;
    const parts = s.trim().split('-').map(Number);
    if (parts.length !== 3) return null;
    const [y, m, d] = parts;
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    return { year: y, month: m, day: d };
  };
  const start = parse(startYYYYMMDD);
  const end = parse(endYYYYMMDD);
  if (!start || !end) return null;
  const fmt = (p) => `${MONTH_NAMES[p.month - 1]} ${p.day}`;
  return start.year === end.year
    ? `${fmt(start)} - ${fmt(end)}, ${end.year}`
    : `${fmt(start)}, ${start.year} - ${fmt(end)}, ${end.year}`;
}

// Build a Date at noon UTC for YYYY-MM-DD so the calendar day is correct in Vancouver (and elsewhere)
function dateFromYYYYMMDD(yyyyMmDd) {
  if (!yyyyMmDd || typeof yyyyMmDd !== 'string') return null;
  const d = new Date(yyyyMmDd + 'T12:00:00.000Z');
  return isNaN(d.getTime()) ? null : d;
}
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

// Year/month from report date (user input). Uses stored year/month if present, else derives from startDate/createdAt.
const getReportYear = (report) => {
  if (report.year != null && !Number.isNaN(Number(report.year))) return Number(report.year);
  const d = report.startDate?.toDate?.() || report.createdAt?.toDate?.();
  return d ? getYear(d) : 0;
};
const getReportMonth = (report) => {
  if (report.month != null && report.month >= 1 && report.month <= 12) return report.month;
  const d = report.startDate?.toDate?.() || report.createdAt?.toDate?.();
  return d ? getMonth(d) + 1 : 0;
};

// Group reports by year then month. Returns { year, month, reports }[] sorted year desc, month desc.
const groupReportsByYearMonth = (reportList) => {
  const byYearMonth = new Map();
  reportList.forEach((r) => {
    const y = getReportYear(r);
    const m = getReportMonth(r);
    const key = `${y}-${String(m).padStart(2, '0')}`;
    if (!byYearMonth.has(key)) byYearMonth.set(key, { year: y, month: m, reports: [] });
    byYearMonth.get(key).reports.push(r);
  });
  return Array.from(byYearMonth.values()).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });
};

// Who sees all reports: system admin OR the "See All Reports" permission on Users & Permissions.
const InstagramReportsPage = () => {
  const { currentUser, realUser, isViewingAs } = useAuth();
  const { isSystemAdmin, hasFeaturePermission } = usePermissions();
  const { confirm } = useConfirm();
  const effectiveIsAdmin = isSystemAdmin || hasFeaturePermission(FEATURE_PERMISSIONS.VIEW_ALL_REPORTS);
  
  const [reports, setReports] = useState([]);
  const [allClients, setAllClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [copiedLink, setCopiedLink] = useState(null);
  const [expandedClient, setExpandedClient] = useState(null);
  const [expandedReport, setExpandedReport] = useState(null);
  const [preSelectedClientId, setPreSelectedClientId] = useState(null);
  const [activeTab, setActiveTab] = useState('clients'); // 'clients' | 'internal' | 'archive'
  const [archivedReports, setArchivedReports] = useState([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Aggregated report generation state
  const [generatingReport, setGeneratingReport] = useState(null); // { clientId, type: 'quarterly' | 'yearly' }
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState(getQuarter(new Date()));

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

  // Filter clients: admins see all, others see only assigned clients (currentUser is effective when View As)
  const isAssignedToMe = (client) => {
    const am = (client.assignedManager || '').trim().toLowerCase();
    if (!am) return false;
    const email = (currentUser?.email || '').trim().toLowerCase();
    const uid = (currentUser?.uid || '').trim().toLowerCase();
    return am === email || (uid && am === uid);
  };

  const myClients = useMemo(() => {
    if (effectiveIsAdmin) {
      return allClients;
    }
    return allClients.filter(isAssignedToMe);
  }, [allClients, currentUser?.email, currentUser?.uid, effectiveIsAdmin]);

  // Load reports - admins see all, others see only their own; when View As, load by effective user.
  useEffect(() => {
    const uid = currentUser?.uid;
    if (!uid) {
      setReports([]);
      setLoading(false);
      return () => {};
    }
    // Get list of assigned client IDs to pass to the listener
    const assignedClientIds = effectiveIsAdmin ? [] : (myClients || []).map(c => c.id).filter(Boolean);
    const unsubscribe = firestoreService.onInstagramReportsChange((data) => {
      setReports(data);
      setLoading(false);
    }, { loadAll: effectiveIsAdmin, userId: isViewingAs ? currentUser?.uid : undefined, clientIds: assignedClientIds });
    return () => unsubscribe();
  }, [currentUser?.uid, effectiveIsAdmin, isViewingAs, myClients]);

  // Load archived reports (system admin only)
  useEffect(() => {
    if (!hasFeaturePermission(FEATURE_PERMISSIONS.MANAGE_INSTAGRAM_REPORTS)) {
      setArchivedReports([]);
      return () => {};
    }
    setArchiveLoading(true);
    const unsubscribe = firestoreService.onInstagramReportsChange((data) => {
      setArchivedReports(data);
      setArchiveLoading(false);
    }, { archived: true });
    return () => unsubscribe();
  }, [isSystemAdmin]);

  // Memoize client IDs for report filtering
  const myClientIds = useMemo(() => (myClients || []).map(c => c.id).filter(Boolean), [myClients]);
  const myClientsOnly = useMemo(() => (myClients || []).filter(c => !c.isInternal), [myClients]);
  const myInternalAccounts = useMemo(() => (myClients || []).filter(c => c.isInternal), [myClients]);

  // Group reports by client
  const clientsWithReports = useMemo(() => {
    const clientMap = new Map();
    
    // Initialize with my clients (even if they have no reports)
    (myClients || []).forEach(client => {
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
    const unlinked = reports.filter(r => !r.clientId);
    return groupReportsByYearMonth(unlinked);
  }, [reports]);

  // Archived reports (system admin only)
  const archivedReportsGrouped = useMemo(() => {
    return groupReportsByYearMonth(archivedReports);
  }, [archivedReports]);

  // Filtered reports for current client
  const clientReports = useMemo(() => {
    if (!expandedClient) return [];
    const reportsForClient = reports.filter(r => r.clientId === expandedClient.client.id);
    return groupReportsByYearMonth(reportsForClient);
  }, [reports, expandedClient]);

  // Get list of available years for aggregated reports
  const availableYears = useMemo(() => {
    const years = new Set();
    reports.forEach(r => {
      const year = getReportYear(r);
      if (year) years.add(year);
    });
    // Add current year if not present
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [reports]);

  // Get list of available quarters for aggregated reports in selected year
  const availableQuarters = useMemo(() => {
    const quarters = new Set();
    reports.forEach(r => {
      const year = getReportYear(r);
      if (year === selectedYear) {
        const d = r.startDate?.toDate?.() || r.createdAt?.toDate?.();
        if (d) quarters.add(getQuarter(d));
      }
    });
    // Add current quarter if not present
    if (selectedYear === new Date().getFullYear()) {
      quarters.add(getQuarter(new Date()));
    }
    return Array.from(quarters).sort((a, b) => a - b);
  }, [reports, selectedYear]);

  // Generate aggregated report (quarterly/yearly)
  const generateAggregatedReport = async (clientId, type) => {
    setGeneratingReport({ clientId, type });
    try {
      const client = allClients.find(c => c.id === clientId);
      if (!client) {
        toast.error('Client not found');
        return;
      }

      let filteredReports = [];
      let reportTitle = '';
      let reportPeriod = '';

      if (type === 'quarterly') {
        const quarterStart = startOfQuarter(new Date(selectedYear, (selectedQuarter - 1) * 3, 1));
        const quarterEnd = endOfQuarter(new Date(selectedYear, (selectedQuarter - 1) * 3, 1));
        filteredReports = reports.filter(r => {
          const reportDate = r.startDate?.toDate?.() || r.createdAt?.toDate?.();
          return r.clientId === clientId && reportDate && isWithinInterval(reportDate, { start: quarterStart, end: quarterEnd });
        });
        reportTitle = `${client.clientName} Q${selectedQuarter} ${selectedYear} Instagram Report`;
        reportPeriod = `Q${selectedQuarter} ${selectedYear}`;
      } else if (type === 'yearly') {
        const yearStart = startOfYear(new Date(selectedYear, 0, 1));
        const yearEnd = endOfYear(new Date(selectedYear, 0, 1));
        filteredReports = reports.filter(r => {
          const reportDate = r.startDate?.toDate?.() || r.createdAt?.toDate?.();
          return r.clientId === clientId && reportDate && isWithinInterval(reportDate, { start: yearStart, end: yearEnd });
        });
        reportTitle = `${client.clientName} ${selectedYear} Annual Instagram Report`;
        reportPeriod = `${selectedYear}`;
      }

      if (filteredReports.length === 0) {
        toast.error(`No reports found for ${client.clientName} in ${reportPeriod}`);
        return;
      }

      // Sort reports by date ascending for chronological summary
      filteredReports.sort((a, b) => {
        const dateA = a.startDate?.toDate?.() || a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.startDate?.toDate?.() || b.createdAt?.toDate?.() || new Date(0);
        return dateA - dateB;
      });

      // Aggregate data
      const aggregatedData = {
        totalPosts: 0,
        totalReach: 0,
        totalImpressions: 0,
        totalEngagements: 0,
        totalFollowersGained: 0,
        totalFollowersLost: 0,
        totalProfileViews: 0,
        totalWebsiteTaps: 0,
        totalEmailTaps: 0,
        totalCallTaps: 0,
        avgReachPerPost: 0,
        avgImpressionsPerPost: 0,
        avgEngagementsPerPost: 0,
        avgFollowersGainedPerPost: 0,
        avgFollowersLostPerPost: 0,
        avgProfileViewsPerPost: 0,
        avgWebsiteTapsPerPost: 0,
        avgEmailTapsPerPost: 0,
        avgCallTapsPerPost: 0,
        topPosts: [],
        growthMetrics: [], // { date, followers, reach, impressions, engagements }
        audienceDemographics: { // Sum of latest demographics
          ageRanges: { '13-17': 0, '18-24': 0, '25-34': 0, '35-44': 0, '45-54': 0, '55-64': 0, '65+': 0 },
          genders: { 'male': 0, 'female': 0, 'unknown': 0 },
          cities: [],
          countries: [],
          followersOnline: [],
        },
        latestFollowers: 0,
        latestNonFollowersPercent: 0,
        latestFollowersPercent: 0,
      };

      let lastReport = null;
      let firstReport = null;

      for (const report of filteredReports) {
        aggregatedData.totalPosts += 1;
        aggregatedData.totalReach += (report.reach || 0);
        aggregatedData.totalImpressions += (report.impressions || 0);
        aggregatedData.totalEngagements += (report.engagements || 0);
        aggregatedData.totalFollowersGained += (report.followersGained || 0);
        aggregatedData.totalFollowersLost += (report.followersLost || 0);
        aggregatedData.totalProfileViews += (report.profileViews || 0);
        aggregatedData.totalWebsiteTaps += (report.websiteTaps || 0);
        aggregatedData.totalEmailTaps += (report.emailTaps || 0);
        aggregatedData.totalCallTaps += (report.callTaps || 0);

        // Collect top posts (based on engagements for now)
        if (report.topPosts && Array.isArray(report.topPosts)) {
          aggregatedData.topPosts.push(...report.topPosts);
        }

        // Collect growth metrics
        const reportDate = report.startDate?.toDate?.() || report.createdAt?.toDate?.();
        if (reportDate) {
          aggregatedData.growthMetrics.push({
            date: format(reportDate, 'yyyy-MM-dd'),
            followers: report.followers || 0,
            reach: report.reach || 0,
            impressions: report.impressions || 0,
            engagements: report.engagements || 0,
          });
        }

        // Keep track of first and last report for overall growth and latest demographics
        if (!firstReport || reportDate < (firstReport.startDate?.toDate?.() || firstReport.createdAt?.toDate?.())) {
          firstReport = report;
        }
        if (!lastReport || reportDate > (lastReport.startDate?.toDate?.() || lastReport.createdAt?.toDate?.())) {
          lastReport = report;
        }
      }

      // Calculate averages
      if (aggregatedData.totalPosts > 0) {
        aggregatedData.avgReachPerPost = aggregatedData.totalReach / aggregatedData.totalPosts;
        aggregatedData.avgImpressionsPerPost = aggregatedData.totalImpressions / aggregatedData.totalPosts;
        aggregatedData.avgEngagementsPerPost = aggregatedData.totalEngagements / aggregatedData.totalPosts;
        aggregatedData.avgFollowersGainedPerPost = aggregatedData.totalFollowersGained / aggregatedData.totalPosts;
        aggregatedData.avgFollowersLostPerPost = aggregatedData.totalFollowersLost / aggregatedData.totalPosts;
        aggregatedData.avgProfileViewsPerPost = aggregatedData.totalProfileViews / aggregatedData.totalPosts;
        aggregatedData.avgWebsiteTapsPerPost = aggregatedData.totalWebsiteTaps / aggregatedData.totalPosts;
        aggregatedData.avgEmailTapsPerPost = aggregatedData.totalEmailTaps / aggregatedData.totalPosts;
        aggregatedData.avgCallTapsPerPost = aggregatedData.totalCallTaps / aggregatedData.totalPosts;
      }

      // Use latest report for demographics and current follower count
      if (lastReport) {
        aggregatedData.latestFollowers = lastReport.followers || 0;
        aggregatedData.latestNonFollowersPercent = lastReport.nonFollowersPercent || 0;
        aggregatedData.latestFollowersPercent = lastReport.followersPercent || 0;

        // Simple sum/merge for demographics (can be improved with weighted averages or more sophisticated merging)
        if (lastReport.audienceDemographics) {
          if (lastReport.audienceDemographics.ageRanges) {
            for (const key in lastReport.audienceDemographics.ageRanges) {
              aggregatedData.audienceDemographics.ageRanges[key] = (aggregatedData.audienceDemographics.ageRanges[key] || 0) + (lastReport.audienceDemographics.ageRanges[key] || 0);
            }
          }
          if (lastReport.audienceDemographics.genders) {
            for (const key in lastReport.audienceDemographics.genders) {
              aggregatedData.audienceDemographics.genders[key] = (aggregatedData.audienceDemographics.genders[key] || 0) + (lastReport.audienceDemographics.genders[key] || 0);
            }
          }
          // For cities and countries, just take from the latest report for simplicity
          aggregatedData.audienceDemographics.cities = lastReport.audienceDemographics.cities || [];
          aggregatedData.audienceDemographics.countries = lastReport.audienceDemographics.countries || [];
          aggregatedData.audienceDemographics.followersOnline = lastReport.audienceDemographics.followersOnline || [];
        }
      }

      // Generate AI summary
      const prompt = `Generate a concise, professional, and insightful summary for the following Instagram performance report data for ${client.clientName} for the period ${reportPeriod}. Focus on key metrics, growth trends, and actionable insights. Highlight significant changes or achievements. The summary should be suitable for a client-facing report. Data: ${JSON.stringify(aggregatedData)}`;
      const aiSummary = await openaiService.getChatCompletion(prompt);

      // Create a new report entry in Firestore
      const newReport = {
        clientId: client.id,
        clientName: client.clientName,
        type: `${type}_aggregated`,
        reportTitle,
        reportPeriod,
        startDate: filteredReports[0].startDate,
        endDate: filteredReports[filteredReports.length - 1].endDate,
        aiSummary: aiSummary.content,
        aggregatedData,
        createdAt: new Date(),
        createdBy: currentUser?.email,
        status: 'published',
      };

      await firestoreService.addInstagramReport(newReport);
      toast.success('Aggregated report generated successfully!');
    } catch (error) {
      console.error('Error generating aggregated report:', error);
      toast.error('Failed to generate aggregated report');
    } finally {
      setGeneratingReport(null);
    }
  };

  // Handle report actions
  const handleEditReport = (report) => {
    setEditingReport(report);
    setShowCreateModal(true);
  };

  const handleDeleteReport = async (report) => {
    if (await confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
      try {
        await firestoreService.deleteInstagramReport(report.id);
        toast.success('Report deleted successfully');
      } catch (error) {
        console.error('Error deleting report:', error);
        toast.error('Failed to delete report');
      }
    }
  };

  const handleArchiveReport = async (report) => {
    if (await confirm('Are you sure you want to archive this report? It will no longer be visible in the main list.')) {
      try {
        await firestoreService.updateInstagramReport(report.id, { archived: true });
        toast.success('Report archived successfully');
      } catch (error) {
        console.error('Error archiving report:', error);
        toast.error('Failed to archive report');
      }
    }
  };

  const handleUnarchiveReport = async (report) => {
    if (await confirm('Are you sure you want to unarchive this report? It will be visible in the main list again.')) {
      try {
        await firestoreService.updateInstagramReport(report.id, { archived: false });
        toast.success('Report unarchived successfully');
      } catch (error) {
        console.error('Error unarchiving report:', error);
        toast.error('Failed to unarchive report');
      }
    }
  };

  const handleCopyLink = (reportId) => {
    const link = `${window.location.origin}/report/${reportId}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(reportId);
    toast.success('Report link copied to clipboard!');
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleOpenReport = (reportId) => {
    window.open(`${window.location.origin}/report/${reportId}`, '_blank');
  };

  // Filter clients for display based on active tab
  const displayClients = useMemo(() => {
    if (activeTab === 'internal') {
      return myInternalAccounts;
    } else if (activeTab === 'clients') {
      return myClientsOnly;
    }
    return [];
  }, [activeTab, myClientsOnly, myInternalAccounts]);

  // Sort display clients by name
  const sortedDisplayClients = useMemo(() => {
    return [...displayClients].sort((a, b) => (a.clientName || '').localeCompare(b.clientName || ''));
  }, [displayClients]);

  // Search functionality
  const filteredClients = useMemo(() => {
    if (!searchTerm) return sortedDisplayClients;
    return sortedDisplayClients.filter(client =>
      client.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.clientEmail?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, sortedDisplayClients]);

  // Filter archived reports by search term
  const filteredArchivedReports = useMemo(() => {
    if (!searchTerm) return archivedReportsGrouped;
    return archivedReportsGrouped.map(yearMonthGroup => ({
      ...yearMonthGroup,
      reports: yearMonthGroup.reports.filter(report =>
        report.reportTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.clientName?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    })).filter(group => group.reports.length > 0);
  }, [searchTerm, archivedReportsGrouped]);

  // Check if current user can manage Instagram reports (archive/delete)
  const canManageInstagramReports = hasFeaturePermission(FEATURE_PERMISSIONS.MANAGE_INSTAGRAM_REPORTS);

  // Check if current user can create new reports
  const canCreateReports = hasFeaturePermission(FEATURE_PERMISSIONS.MANAGE_INSTAGRAM_REPORTS) || hasFeaturePermission(FEATURE_PERMISSIONS.VIEW_ALL_REPORTS);

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#1c1c1e] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-[#1d1d1f] dark:text-white">Instagram Reports</h1>
          <div className="flex items-center gap-3">
            {canCreateReports && (
              <button
                onClick={() => {
                  setEditingReport(null);
                  setShowCreateModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-[#0071e3] text-white rounded-lg shadow-md hover:bg-[#0077ed] transition-colors"
              >
                <Plus size={20} />
                New Report
              </button>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-[#2c2c2e] rounded-xl shadow-sm p-4 mb-6 flex items-center gap-4">
          <div className="flex-grow">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#86868b]" />
              <input
                type="text"
                placeholder="Search clients or reports..."
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#f5f5f7] dark:bg-[#1c1c1e] text-[#1d1d1f] dark:text-white border border-transparent focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3] outline-none transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('clients')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'clients' ? 'bg-[#0071e3] text-white' : 'bg-[#f5f5f7] dark:bg-[#1c1c1e] text-[#1d1d1f] dark:text-white hover:bg-black/5 dark:hover:bg-white/10'}`}
            >
              Clients
            </button>
            <button
              onClick={() => setActiveTab('internal')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'internal' ? 'bg-[#0071e3] text-white' : 'bg-[#f5f5f7] dark:bg-[#1c1c1e] text-[#1d1d1f] dark:text-white hover:bg-black/5 dark:hover:bg-white/10'}`}
            >
              Internal Accounts
            </button>
            {canManageInstagramReports && (
              <button
                onClick={() => setActiveTab('archive')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'archive' ? 'bg-[#0071e3] text-white' : 'bg-[#f5f5f7] dark:bg-[#1c1c1e] text-[#1d1d1f] dark:text-white hover:bg-black/5 dark:hover:bg-white/10'}`}
              >
                <Archive size={16} className="inline-block mr-1" /> Archive
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center p-8 text-[#86868b]">Loading reports...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeTab !== 'archive' ? (
              filteredClients.length > 0 ? (
                filteredClients.map((clientEntry) => (
                  <div key={clientEntry.id} className="bg-white dark:bg-[#2c2c2e] rounded-xl shadow-sm border border-black/5 dark:border-white/10 overflow-hidden">
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      onClick={() => setExpandedClient(expandedClient?.client.id === clientEntry.id ? null : clientEntry)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                          {clientEntry.profilePhoto ? (
                            <img src={clientEntry.profilePhoto} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-10 bg-gradient-to-br from-[#0071e3] to-[#5856d6] flex items-center justify-center">
                              <span className="text-white font-semibold text-lg">
                                {clientEntry.clientName?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-[#1d1d1f] dark:text-white">{clientEntry.clientName}</h3>
                          <p className="text-sm text-[#86868b]">{clientEntry.clientEmail}</p>
                        </div>
                      </div>
                      {expandedClient?.client.id === clientEntry.id ? (
                        <ChevronUp size={20} className="text-[#86868b]" />
                      ) : (
                        <ChevronDown size={20} className="text-[#86868b]" />
                      )}
                    </div>

                    {expandedClient?.client.id === clientEntry.id && (
                      <div className="border-t border-black/5 dark:border-white/10 p-4">
                        {clientReports.length > 0 ? (
                          clientReports.map((yearMonthGroup) => (
                            <div key={`${yearMonthGroup.year}-${yearMonthGroup.month}`} className="mb-4 last:mb-0">
                              <h4 className="text-sm font-semibold text-[#1d1d1f] dark:text-white mb-2">{MONTH_NAMES[yearMonthGroup.month - 1]} {yearMonthGroup.year}</h4>
                              <div className="space-y-2">
                                {yearMonthGroup.reports.map((report) => (
                                  <div key={report.id} className="flex items-center justify-between bg-[#f5f5f7] dark:bg-[#1c1c1e] rounded-lg p-3">
                                    <div>
                                      <p className="text-sm font-medium text-[#1d1d1f] dark:text-white">{report.reportTitle || `Report for ${report.clientName}`}</p>
                                      <p className="text-xs text-[#86868b]">{format(report.createdAt?.toDate?.() || new Date(), 'MMM d, yyyy')}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => handleOpenReport(report.id)}
                                        className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                        title="View Report"
                                      >
                                        <Eye size={18} className="text-[#86868b]" />
                                      </button>
                                      {canManageInstagramReports && (
                                        <button
                                          onClick={() => handleEditReport(report)}
                                          className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                          title="Edit Report"
                                        >
                                          <Edit size={18} className="text-[#86868b]" />
                                        </button>
                                      )}
                                      {canManageInstagramReports && (
                                        <button
                                          onClick={() => handleArchiveReport(report)}
                                          className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                          title="Archive Report"
                                        >
                                          <Archive size={18} className="text-[#86868b]" />
                                        </button>
                                      )}
                                      {canManageInstagramReports && (
                                        <button
                                          onClick={() => handleDeleteReport(report)}
                                          className="p-1.5 rounded-md hover:bg-red-500/10 text-red-500 transition-colors"
                                          title="Delete Report"
                                        >
                                          <Trash2 size={18} />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-[#86868b] text-center py-4">No reports for this client yet.</p>
                        )}

                        {/* Aggregated Report Generation */}
                        <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/10">
                          <h4 className="text-sm font-semibold text-[#1d1d1f] dark:text-white mb-2">Generate Aggregated Report</h4>
                          <div className="flex items-center gap-2 mb-3">
                            <select
                              className="px-3 py-1.5 rounded-lg bg-[#f5f5f7] dark:bg-[#1c1c1e] text-[#1d1d1f] dark:text-white border border-transparent focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3] outline-none transition-all text-sm"
                              value={selectedYear}
                              onChange={(e) => setSelectedYear(Number(e.target.value))}
                            >
                              {availableYears.map(year => (
                                <option key={year} value={year}>{year}</option>
                              ))}
                            </select>
                            <select
                              className="px-3 py-1.5 rounded-lg bg-[#f5f5f7] dark:bg-[#1c1c1e] text-[#1d1d1f] dark:text-white border border-transparent focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3] outline-none transition-all text-sm"
                              value={selectedQuarter}
                              onChange={(e) => setSelectedQuarter(Number(e.target.value))}
                            >
                              {availableQuarters.map(quarter => (
                                <option key={quarter} value={quarter}>Q{quarter}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => generateAggregatedReport(clientEntry.id, 'quarterly')}
                              disabled={generatingReport?.clientId === clientEntry.id && generatingReport?.type === 'quarterly'}
                              className="flex-1 px-3 py-1.5 bg-[#5856d6] text-white rounded-lg text-sm font-medium hover:bg-[#6a67d8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                              {generatingReport?.clientId === clientEntry.id && generatingReport?.type === 'quarterly' ? (
                                <><Loader2 size={16} className="animate-spin" /> Generating...</>
                              ) : (
                                'Generate Quarterly'
                              )}
                            </button>
                            <button
                              onClick={() => generateAggregatedReport(clientEntry.id, 'yearly')}
                              disabled={generatingReport?.clientId === clientEntry.id && generatingReport?.type === 'yearly'}
                              className="flex-1 px-3 py-1.5 bg-[#5856d6] text-white rounded-lg text-sm font-medium hover:bg-[#6a67d8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                              {generatingReport?.clientId === clientEntry.id && generatingReport?.type === 'yearly' ? (
                                <><Loader2 size={16} className="animate-spin" /> Generating...</>
                              ) : (
                                'Generate Yearly'
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-center p-8 text-[#86868b] col-span-full">No clients found.</p>
              )
            ) : (
              archiveLoading ? (
                <div className="text-center p-8 text-[#86868b] col-span-full">Loading archived reports...</div>
              ) : filteredArchivedReports.length > 0 ? (
                <div className="col-span-full space-y-6">
                  {filteredArchivedReports.map(yearMonthGroup => (
                    <div key={`${yearMonthGroup.year}-${yearMonthGroup.month}`} className="bg-white dark:bg-[#2c2c2e] rounded-xl shadow-sm border border-black/5 dark:border-white/10 overflow-hidden">
                      <div className="p-4 border-b border-black/5 dark:border-white/10">
                        <h3 className="font-semibold text-[#1d1d1f] dark:text-white">{MONTH_NAMES[yearMonthGroup.month - 1]} {yearMonthGroup.year} Archive</h3>
                      </div>
                      <div className="p-4 space-y-2">
                        {yearMonthGroup.reports.map(report => (
                          <div key={report.id} className="flex items-center justify-between bg-[#f5f5f7] dark:bg-[#1c1c1e] rounded-lg p-3">
                            <div>
                              <p className="text-sm font-medium text-[#1d1d1f] dark:text-white">{report.reportTitle || `Report for ${report.clientName}`}</p>
                              <p className="text-xs text-[#86868b]">{format(report.createdAt?.toDate?.() || new Date(), 'MMM d, yyyy')}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleOpenReport(report.id)}
                                className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                title="View Report"
                              >
                                <Eye size={18} className="text-[#86868b]" />
                              </button>
                              {canManageInstagramReports && (
                                <button
                                  onClick={() => handleUnarchiveReport(report)}
                                  className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                  title="Unarchive Report"
                                >
                                  <Archive size={18} className="text-[#86868b]" />
                                </button>
                              )}
                              {canManageInstagramReports && (
                                <button
                                  onClick={() => handleDeleteReport(report)}
                                  className="p-1.5 rounded-md hover:bg-red-500/10 text-red-500 transition-colors"
                                  title="Delete Report"
                                >
                                  <Trash2 size={18} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center p-8 text-[#86868b] col-span-full">No archived reports found.</p>
              )
            )}
          </div>
        )}

        {showCreateModal && (
          <CreateEditReportModal
            report={editingReport}
            onClose={() => setShowCreateModal(false)}
            onSave={() => {
              setShowCreateModal(false);
              // Refresh reports after save
              // This is handled by the Firestore listener, so no explicit refresh needed here
            }}
            clients={allClients}
            preSelectedClientId={preSelectedClientId}
          />
        )}
      </div>
    </div>
  );
};

export default InstagramReportsPage;
