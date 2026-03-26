import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/PermissionsContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { toast } from 'react-hot-toast';
import { supabaseService } from '../services/supabaseService';
import { openaiService } from '../services/openaiService';
import { cloudVisionOCRService } from '../services/cloudVisionOCRService';
// Fallback to browser-based OCR if Cloud Vision and AI extraction fail
import { instagramOCRService } from '../services/instagramOCRService';
import { getInstagramEmbedUrl } from '../utils/instagramEmbed';
import ClientLink from '../components/ui/ClientLink';
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
  TrendingDown,
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
  Archive,
  Search,
  GitCompare,
  CheckCircle2,
  AlertTriangle,
  XCircle,
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

// Parse the START date from a dateRange string like "Feb 24 - Mar 2, 2025", "Feb 24th - March 2nd",
// "Dec 28, 2024 - Jan 3, 2025", "MARCH 3RD - MARCH 9TH", etc.
const MONTH_MAP = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  january: 0, february: 1, march: 2, april: 3, june: 5, july: 6, august: 7, september: 8, october: 9, november: 10, december: 11 };
function parseDateFromRange(dateRange) {
  if (!dateRange || typeof dateRange !== 'string') return null;
  // Extract start portion (before the dash separator)
  const parts = dateRange.split(/\s*[-–—]\s*/);
  const startPart = (parts[0] || '').trim();
  // Also grab the end portion to find a year if start doesn't have one
  const endPart = (parts.slice(1).join('-') || '').trim();
  // Find month name
  const monthMatch = startPart.match(/([a-zA-Z]+)/);
  if (!monthMatch) return null;
  const monthKey = monthMatch[1].toLowerCase().replace(/\.$/, '');
  const monthIdx = MONTH_MAP[monthKey] ?? MONTH_MAP[monthKey.slice(0, 3)];
  if (monthIdx == null) return null;
  // Find day number (strip ordinal suffixes)
  const dayMatch = startPart.match(/(\d+)/);
  if (!dayMatch) return null;
  const day = parseInt(dayMatch[1], 10);
  // Find year: check startPart first, then endPart, then dateRange as a whole
  let year = null;
  const yearMatch = startPart.match(/\b(20\d{2})\b/) || endPart.match(/\b(20\d{2})\b/) || dateRange.match(/\b(20\d{2})\b/);
  if (yearMatch) year = parseInt(yearMatch[1], 10);
  else year = new Date().getFullYear(); // fallback to current year
  return new Date(year, monthIdx, day);
}

// Get the sorting date for a report: prefer parsing the dateRange (the period it covers),
// then try startDate field, then createdAt as last resort
function getReportSortDate(report) {
  // 1) Parse the dateRange string first — this is the most reliable indicator of the period
  const parsed = parseDateFromRange(report.dateRange);
  if (parsed && !isNaN(parsed.getTime())) return parsed;
  // 2) Fall back to startDate (period_start from DB)
  if (report.startDate) {
    const d = typeof report.startDate === 'string' ? new Date(report.startDate + (report.startDate.includes('T') ? '' : 'T12:00:00'))
      : report.startDate?.toDate?.() || new Date(report.startDate);
    if (!isNaN(d.getTime())) return d;
  }
  // 3) Fall back to createdAt
  if (report.createdAt) {
    const d = typeof report.createdAt === 'string' ? new Date(report.createdAt)
      : report.createdAt?.toDate?.() || new Date(report.createdAt);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date(0);
}

// Build a Date at noon UTC for YYYY-MM-DD so the calendar day is correct in Vancouver (and elsewhere)
function dateFromYYYYMMDD(yyyyMmDd) {
  if (!yyyyMmDd || typeof yyyyMmDd !== 'string') return null;
  const d = new Date(yyyyMmDd + 'T12:00:00.000Z');
  return isNaN(d.getTime()) ? null : d;
}

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
  if (!report || typeof report !== 'object') return 0;
  if (report.year != null && !Number.isNaN(Number(report.year))) return Number(report.year);
  const d = getReportSortDate(report);
  return d ? getYear(d) : 0;
};
const getReportMonth = (report) => {
  if (!report || typeof report !== 'object') return 0;
  if (report.month != null && report.month >= 1 && report.month <= 12) return report.month;
  const d = getReportSortDate(report);
  return d ? getMonth(d) + 1 : 0;
};

// Group reports by year then month. Returns { year, month, reports }[] sorted year desc, month desc.
const groupReportsByYearMonth = (reportList) => {
  const byYearMonth = new Map();
  (reportList || []).forEach((r) => {
    if (r == null) return;
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

// ─── Report completion helper ───────────────────────────────────────────────
const getReportCompletionStatus = (metrics) => {
  if (!metrics || typeof metrics !== 'object') return 'incomplete';
  const keyFields = ['followers', 'accountsReached', 'interactions', 'followerChange'];
  const filled = keyFields.filter(f => metrics[f] != null && metrics[f] !== '').length;
  if (filled >= 4) return 'complete';
  if (filled >= 2) return 'partial';
  return 'incomplete';
};

// ─── Compact number formatter (50000 → "50K", 1200000 → "1.2M") ────────────
const formatCompact = (value) => {
  if (value == null) return '—';
  const n = Number(value);
  if (isNaN(n)) return '—';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    const m = abs / 1_000_000;
    return `${sign}${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  if (abs >= 10_000) {
    const k = abs / 1_000;
    return `${sign}${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K`;
  }
  return n.toLocaleString();
};

// ─── Tiny SVG sparkline with trend arrow ────────────────────────────────────
let _sparklineId = 0;
const Sparkline = ({ values, width = 64, height = 22 }) => {
  if (!values || values.length < 2) return null;
  const nums = values.map(Number).filter(n => !isNaN(n));
  if (nums.length < 2) return null;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const range = max - min || 1;
  const pad = 3;
  const arrowW = 8; // reserve space on right for arrow tip
  const chartW = width - arrowW;
  const pts = nums.map((v, i) => ({
    x: pad + (i / (nums.length - 1)) * (chartW - pad * 2),
    y: pad + ((max - v) / range) * (height - pad * 2),
  }));
  const trend = nums[nums.length - 1] - nums[0];
  const lineColor = trend >= 0 ? '#34c759' : '#ff3b30';
  const gradId = `spk-${++_sparklineId}`;

  // Build smooth path (catmull-rom → cubic bezier for smoothness)
  const linePath = pts.map((p, i) => (i === 0 ? `M ${p.x.toFixed(1)},${p.y.toFixed(1)}` : `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`)).join(' ');
  const areaPath = linePath + ` L ${pts[pts.length - 1].x.toFixed(1)},${height} L ${pts[0].x.toFixed(1)},${height} Z`;

  // Arrow tip at end of line
  const last = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  const angle = Math.atan2(last.y - prev.y, last.x - prev.x);
  const tipX = last.x + 6;
  const tipY = last.y + Math.sin(angle) * 6;
  const a1 = angle + Math.PI * 0.78;
  const a2 = angle - Math.PI * 0.78;
  const arrowSize = 4.5;

  return (
    <svg width={width} height={height} className="overflow-visible flex-shrink-0" aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {/* gradient area fill */}
      <path d={areaPath} fill={`url(#${gradId})`} />
      {/* line */}
      <path d={linePath} fill="none" stroke={lineColor} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {/* small dots at each data point */}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)}
          r={1.2}
          fill={lineColor}
          opacity={i === 0 || i === pts.length - 1 ? 1 : 0.4}
        />
      ))}
      {/* arrowhead at end */}
      <polygon
        points={`${tipX.toFixed(1)},${tipY.toFixed(1)} ${(tipX + Math.cos(a1) * arrowSize).toFixed(1)},${(tipY + Math.sin(a1) * arrowSize).toFixed(1)} ${(tipX + Math.cos(a2) * arrowSize).toFixed(1)},${(tipY + Math.sin(a2) * arrowSize).toFixed(1)}`}
        fill={lineColor}
      />
    </svg>
  );
};

// ─── Delta badge ─────────────────────────────────────────────────────────────
const Delta = ({ current, previous, label, prefix = '' }) => {
  if (current == null || previous == null) return null;
  const curr = Number(current);
  const prev = Number(previous);
  if (isNaN(curr) || isNaN(prev)) return null;
  const diff = curr - prev;
  const pct = prev !== 0 ? ((diff / Math.abs(prev)) * 100).toFixed(1) : null;
  const isPos = diff > 0;
  const isZero = diff === 0;
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-black/5 dark:border-white/5 last:border-0">
      <span className="text-[12px] text-[#86868b]">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-[12px] font-medium text-[#1d1d1f] dark:text-white">{prefix}{formatCompact(curr)}</span>
        {!isZero && (
          <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${isPos ? 'bg-[#34c759]/10 text-[#1a7a2e] dark:text-[#34c759]' : 'bg-[#ff3b30]/10 text-[#cc2200] dark:text-[#ff3b30]'}`}>
            {isPos ? '+' : ''}{formatCompact(diff)}{pct ? ` (${pct}%)` : ''}
          </span>
        )}
        {isZero && <span className="text-[11px] text-[#86868b]">—</span>}
      </div>
    </div>
  );
};

// Who sees all reports: system admin OR the "See All Reports" permission on Users & Permissions.
const InstagramReportsPage = () => {
  const { currentUser, realUser, isViewingAs } = useAuth();
  const { isSystemAdmin, loading: permissionsLoading } = usePermissions();
  const { confirm } = useConfirm();
  // Admin role users AND system admins can see all clients on this page
  const effectiveIsAdmin = isSystemAdmin || currentUser?.role === 'admin';
  
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
  
  // Share link popup after save
  const [sharePopupLink, setSharePopupLink] = useState(null); // publicLinkId string

  // Aggregated report generation state
  const [generatingReport, setGeneratingReport] = useState(null); // { clientId, type: 'quarterly' | 'yearly' }
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState(getQuarter(new Date()));

  // Search/filter
  const [searchQuery, setSearchQuery] = useState('');

  // Load reports - admins see all, others see only their own; when View As, load by effective user.
  useEffect(() => {
    const uid = currentUser?.uid;
    if (!uid || permissionsLoading) {
      if (!uid) { setReports([]); setLoading(false); }
      return () => {};
    }
    const unsubscribe = supabaseService.onInstagramReportsChange((data) => {
      setReports(data);
      setLoading(false);
    }, { loadAll: effectiveIsAdmin, userId: isViewingAs ? currentUser?.uid : undefined });
    return () => unsubscribe();
  }, [currentUser?.uid, effectiveIsAdmin, isViewingAs, permissionsLoading]);

  // Load archived reports (system admin only)
  useEffect(() => {
    if (!effectiveIsAdmin) {
      setArchivedReports([]);
      return () => {};
    }
    setArchiveLoading(true);
    const unsubscribe = supabaseService.onInstagramReportsChange((data) => {
      setArchivedReports(data);
      setArchiveLoading(false);
    }, { archived: true });
    return () => unsubscribe();
  }, [effectiveIsAdmin]);

  // Load clients
  useEffect(() => {
    const loadClients = async () => {
      try {
        const clientsList = await supabaseService.getClients();
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

  const myClientsOnly = useMemo(() => myClients.filter(c => !c.isInternal), [myClients]);
  const myInternalAccounts = useMemo(() => myClients.filter(c => c.isInternal), [myClients]);

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
      if (!report || !report.clientId) return;
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
    return reports.filter(r => r != null && !r.clientId).sort((a, b) => {
      const dateA = a.startDate?.toDate?.() || a.createdAt?.toDate?.() || new Date(0);
      const dateB = b.startDate?.toDate?.() || b.createdAt?.toDate?.() || new Date(0);
      return dateB - dateA;
    });
  }, [reports, effectiveIsAdmin]);

  // List for current tab: clients (non-internal) or internal accounts only
  const clientsWithReportsForTab = useMemo(() => {
    if (activeTab === 'internal') {
      return clientsWithReports.filter(({ client }) => !!client.isInternal);
    }
    return clientsWithReports.filter(({ client }) => !client.isInternal);
  }, [clientsWithReports, activeTab]);

  // Apply search filter on top of the tab filter
  const filteredClientsForTab = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return clientsWithReportsForTab;
    return clientsWithReportsForTab.filter(({ client }) =>
      (client.clientName || client.name || '').toLowerCase().includes(q)
    );
  }, [clientsWithReportsForTab, searchQuery]);

  // Get reports for a specific time period
  const getReportsForPeriod = (clientId, periodStart, periodEnd) => {
    return reports.filter(r => {
      if (r.clientId !== clientId) return false;
      if (r.reportType && r.reportType !== 'monthly') return false; // only aggregate monthly reports
      const reportDate = getReportSortDate(r);
      if (!reportDate || isNaN(reportDate.getTime())) return false;
      return isWithinInterval(reportDate, { start: periodStart, end: periodEnd });
    });
  };

  // Aggregate metrics from multiple reports — sums additive metrics, takes latest snapshot values
  const aggregateMetrics = (reportsToAggregate) => {
    if (!reportsToAggregate.length) return null;

    // Sort by date range so "latest" = last in array
    const sorted = [...reportsToAggregate].sort((a, b) => getReportSortDate(a) - getReportSortDate(b));

    const aggregated = {
      views: 0,
      interactions: 0,
      profileVisits: 0,
      accountsReached: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      reposts: 0,
      followers: null,
      followerChange: 0,
      reportCount: sorted.length
    };

    sorted.forEach(r => {
      const m = r.metrics || {};
      // Additive metrics — sum across all reports in the period
      aggregated.views += Number(m.views) || 0;
      aggregated.interactions += Number(m.interactions) || 0;
      aggregated.profileVisits += Number(m.profileVisits) || 0;
      aggregated.accountsReached += Number(m.accountsReached) || 0;
      aggregated.likes += Number(m.likes) || 0;
      aggregated.comments += Number(m.comments) || 0;
      aggregated.shares += Number(m.shares) || 0;
      aggregated.saves += Number(m.saves) || 0;
      aggregated.reposts += Number(m.reposts) || 0;
      if (m.followerChange != null) aggregated.followerChange += parseInt(m.followerChange) || 0;
      // Snapshot metric — take the latest value (last in sorted order)
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
      notes: `Aggregated from ${periodReports.length} monthly report(s).\n\nTotal Views: ${metrics.views.toLocaleString()}\nAccounts Reached: ${metrics.accountsReached.toLocaleString()}\nTotal Interactions: ${metrics.interactions.toLocaleString()}\nProfile Visits: ${metrics.profileVisits.toLocaleString()}\nLikes: ${metrics.likes.toLocaleString()} | Comments: ${metrics.comments.toLocaleString()} | Shares: ${metrics.shares.toLocaleString()} | Saves: ${metrics.saves.toLocaleString()} | Reposts: ${metrics.reposts.toLocaleString()}\nFollowers: ${metrics.followers?.toLocaleString() || 'N/A'}\nNet Follower Change: ${metrics.followerChange >= 0 ? '+' : ''}${metrics.followerChange}`,
      sourceReportIds: periodReports.map(r => r.id)
    };
    
    try {
      await supabaseService.createInstagramReport(reportData);
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
        const d = getReportSortDate(r);
        return d && !isNaN(d.getTime()) && isWithinInterval(d, { start: qStart, end: qEnd });
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
      await supabaseService.createInstagramReport(reportData);
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
      message: `Are you sure you want to delete "${report.title || report.reportTitle || 'this report'}"? It will be removed from your view.`,
      confirmText: 'Delete',
      variant: 'danger'
    });
    if (!confirmed) return;
    try {
      await supabaseService.deleteInstagramReport(report.id);
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

  // Report card component. archiveMode: hide Edit/Delete. compareWith: previous report for MoM panel.
  const ReportCard = ({ report, compact = false, archiveMode = false, compareWith = null }) => {
    const [showCompare, setShowCompare] = useState(false);
    const completionStatus = getReportCompletionStatus(report.metrics);
    const isMonthly = !report.reportType || report.reportType === 'monthly';

    const CompletionBadge = () => {
      if (completionStatus === 'complete') return (
        <span className="flex items-center gap-1 text-[10px] font-medium text-[#1a7a2e] dark:text-[#34c759] bg-[#34c759]/10 px-1.5 py-0.5 rounded-md whitespace-nowrap">
          <CheckCircle2 className="w-3 h-3" strokeWidth={2} />Complete
        </span>
      );
      if (completionStatus === 'partial') return (
        <span className="flex items-center gap-1 text-[10px] font-medium text-[#b45309] dark:text-[#ff9500] bg-[#ff9500]/10 px-1.5 py-0.5 rounded-md whitespace-nowrap">
          <AlertTriangle className="w-3 h-3" strokeWidth={2} />Partial
        </span>
      );
      return (
        <span className="flex items-center gap-1 text-[10px] font-medium text-[#cc2200] dark:text-[#ff3b30] bg-[#ff3b30]/10 px-1.5 py-0.5 rounded-md whitespace-nowrap">
          <XCircle className="w-3 h-3" strokeWidth={2} />No data
        </span>
      );
    };

    return (
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
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className={`${compact ? 'text-[13px]' : 'text-[14px]'} font-medium text-[#1d1d1f] dark:text-white truncate`}>
                  {report.title || report.reportTitle}
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
                <CompletionBadge />
              </div>
              <p className={`${compact ? 'text-[11px]' : 'text-[12px]'} text-[#86868b] truncate`}>
                {report.dateRange}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isMonthly && compareWith && (
              <button
                type="button"
                onClick={() => setShowCompare(v => !v)}
                className={`${compact ? 'p-1.5' : 'p-2'} rounded-lg transition-colors ${showCompare ? 'bg-[#0071e3]/10 text-[#0071e3]' : 'bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15'}`}
                title="Compare with previous"
              >
                <GitCompare className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
              </button>
            )}
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
              onClick={() => window.open(`${window.location.origin}/report/${report.publicLinkId}`, '_blank')}
              className={`${compact ? 'p-1.5' : 'p-2'} rounded-lg bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15 transition-colors`}
              title="Preview"
            >
              <ExternalLink className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
            </button>
            {!archiveMode && (
              <>
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
              </>
            )}
          </div>
        </div>

        {/* MoM Comparison Panel */}
        {showCompare && compareWith && (
          <div className="border-t border-black/5 dark:border-white/10 px-4 py-3 bg-[#f5f5f7] dark:bg-[#1c1c1e]">
            <p className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <GitCompare className="w-3.5 h-3.5" />
              vs. {compareWith.title || compareWith.dateRange || 'Previous Report'}
            </p>
            <Delta current={report.metrics?.followers} previous={compareWith.metrics?.followers} label="Followers" />
            <Delta current={report.metrics?.followerChange} previous={compareWith.metrics?.followerChange} label="Net Growth" prefix="+" />
            <Delta current={report.metrics?.accountsReached} previous={compareWith.metrics?.accountsReached} label="Accounts Reached" />
            <Delta current={report.metrics?.interactions} previous={compareWith.metrics?.interactions} label="Interactions" />
            <Delta current={report.metrics?.profileVisits} previous={compareWith.metrics?.profileVisits} label="Profile Visits" />
            <Delta current={report.metrics?.views} previous={compareWith.metrics?.views} label="Views" />
          </div>
        )}
      </div>
    );
  };

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
            <span className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-[#833AB4] via-[#E1306C] to-[#F77737] text-white">
              <Instagram className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2} />
            </span>
            Instagram Analytics
          </h1>
          <p className="text-[13px] sm:text-[15px] text-[#86868b] mt-1">
            {effectiveIsAdmin ? 'Manage analytics reports for all clients' : `Analytics reports for your ${myClients.length} assigned client${myClients.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {activeTab !== 'archive' && (
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#833AB4] via-[#E1306C] to-[#F77737] text-white text-[13px] sm:text-[14px] font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            New Report
          </button>
        )}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3 sm:p-4 rounded-xl bg-white dark:bg-[#2c2c2e] border border-black/5 dark:border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-4 h-4 text-[#0071e3]" />
            <span className="text-[11px] sm:text-[12px] text-[#86868b]">Clients</span>
          </div>
          <p className="text-[20px] sm:text-[24px] font-semibold text-[#1d1d1f] dark:text-white">{myClientsOnly.length}</p>
        </div>
        <div className="p-3 sm:p-4 rounded-xl bg-white dark:bg-[#2c2c2e] border border-black/5 dark:border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <FolderOpen className="w-4 h-4 text-[#8e8e93]" />
            <span className="text-[11px] sm:text-[12px] text-[#86868b]">Internal Accounts</span>
          </div>
          <p className="text-[20px] sm:text-[24px] font-semibold text-[#1d1d1f] dark:text-white">{myInternalAccounts.length}</p>
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

      {/* Search / Filter */}
      {activeTab !== 'archive' && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search clients…"
            className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/10 text-[14px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 transition-all"
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Tabs: Clients | Internal Accounts */}
      <div className="flex gap-1 p-1 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('clients')}
          className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-colors ${activeTab === 'clients' ? 'bg-white dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-white shadow-sm' : 'text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'}`}
        >
          Clients ({myClientsOnly.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('internal')}
          className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-colors ${activeTab === 'internal' ? 'bg-white dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-white shadow-sm' : 'text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'}`}
        >
          Internal Accounts ({myInternalAccounts.length})
        </button>
        {true && (
          <button
            type="button"
            onClick={() => setActiveTab('archive')}
            className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-colors ${activeTab === 'archive' ? 'bg-white dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-white shadow-sm' : 'text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'}`}
          >
            Archive ({archivedReports.length})
          </button>
        )}
      </div>

      {/* Archive tab: system admin only */}
      {activeTab === 'archive' && (
        <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 overflow-hidden">
          <div className="p-4 border-b border-black/5 dark:border-white/10 flex items-center gap-2">
            <Archive className="w-5 h-5 text-[#86868b]" />
            <h3 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white">Archived reports</h3>
            <span className="text-[12px] text-[#86868b]">Deleted by users; visible here only to system admins.</span>
          </div>
          <div className="p-4">
            {archiveLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-[#E1306C] border-t-transparent rounded-full animate-spin" />
                <span className="ml-3 text-[14px] text-[#86868b]">Loading archive...</span>
              </div>
            ) : archivedReports.length === 0 ? (
              <div className="text-center py-12 text-[#86868b] text-[14px]">No archived reports.</div>
            ) : (
              <div className="space-y-2">
                {archivedReports.map((report) => (
                  <ReportCard key={report.id} report={report} compact archiveMode />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Client-centric Reports (hidden on Archive tab) */}
      {activeTab !== 'archive' && (loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-[#E1306C] border-t-transparent rounded-full animate-spin" />
          <span className="ml-3 text-[14px] text-[#86868b]">Loading...</span>
        </div>
      ) : (activeTab === 'internal' && myInternalAccounts.length === 0) ? (
        <div className="rounded-2xl border-2 border-dashed border-black/10 dark:border-white/10 p-12 text-center">
          <Building2 className="w-16 h-16 mx-auto text-[#86868b] opacity-50 mb-4" />
          <h3 className="text-[17px] font-medium text-[#1d1d1f] dark:text-white">No internal accounts</h3>
          <p className="text-[14px] text-[#86868b] mt-2">
            Add internal accounts in Clients to create analytics reports for them here.
          </p>
        </div>
      ) : myClients.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-black/10 dark:border-white/10 p-12 text-center">
          <Users className="w-16 h-16 mx-auto text-[#86868b] opacity-50 mb-4" />
          <h3 className="text-[17px] font-medium text-[#1d1d1f] dark:text-white">No clients assigned</h3>
          <p className="text-[14px] text-[#86868b] mt-2">
            {effectiveIsAdmin ? 'No clients exist in the system yet.' : 'Contact your admin to get clients assigned to you.'}
          </p>
        </div>
      ) : filteredClientsForTab.length === 0 && searchQuery ? (
        <div className="rounded-2xl border-2 border-dashed border-black/10 dark:border-white/10 p-10 text-center">
          <Search className="w-12 h-12 mx-auto text-[#86868b] opacity-30 mb-3" />
          <h3 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">No results for "{searchQuery}"</h3>
          <button type="button" onClick={() => setSearchQuery('')} className="mt-3 text-[13px] font-medium text-[#0071e3] hover:underline">
            Clear search
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredClientsForTab.map(({ client, reports: clientReports }) => {
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
                            @{(client.instagramHandle || '').replace(/^@+/, '')}
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
                    {/* Follower sparkline */}
                    {(() => {
                      const monthlyOnly = clientReports.filter(r => !r.reportType || r.reportType === 'monthly');
                      const followerVals = [...monthlyOnly].reverse().map(r => r.metrics?.followers).filter(v => v != null && !isNaN(Number(v)));
                      return followerVals.length >= 2 ? (
                        <div className="hidden sm:flex flex-col items-end gap-0.5 mr-1">
                          <Sparkline values={followerVals} width={56} height={20} />
                          <span className="text-[10px] text-[#86868b]">followers</span>
                        </div>
                      ) : null;
                    })()}
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
                          {/* Yearly Reports – grouped by year */}
                          {yearlyReports.length > 0 && (
                            <div>
                              <h4 className="text-[12px] font-semibold text-[#5856d6] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                <FileBarChart className="w-3.5 h-3.5" />
                                Annual Reports ({yearlyReports.length})
                              </h4>
                              {groupReportsByYearMonth(yearlyReports).map(({ year, month, reports: groupReports }) => (
                                <div key={`y-${year}-${month}`} className="mb-4">
                                  <p className="text-[11px] font-medium text-[#86868b] mb-1.5">{year}</p>
                                  <div className="space-y-2">
                                    {groupReports.map(report => (
                                      <ReportCard key={report.id} report={report} compact />
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Quarterly Reports – grouped by year then month */}
                          {quarterlyReports.length > 0 && (
                            <div>
                              <h4 className="text-[12px] font-semibold text-[#34c759] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                <CalendarDays className="w-3.5 h-3.5" />
                                Quarterly Reports ({quarterlyReports.length})
                              </h4>
                              {groupReportsByYearMonth(quarterlyReports).map(({ year, month, reports: groupReports }) => (
                                <div key={`q-${year}-${month}`} className="mb-4">
                                  <p className="text-[11px] font-medium text-[#86868b] mb-1.5">
                                    {format(new Date(year, month - 1, 1), 'MMMM yyyy')}
                                  </p>
                                  <div className="space-y-2">
                                    {groupReports.map(report => (
                                      <ReportCard key={report.id} report={report} compact />
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Monthly Reports – grouped by year then month */}
                          {monthlyReports.length > 0 && (
                            <div>
                              <h4 className="text-[12px] font-semibold text-[#E1306C] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                <BarChart3 className="w-3.5 h-3.5" />
                                Monthly Reports ({monthlyReports.length})
                              </h4>
                              {(() => {
                                // Sort by the report's date range (period covered), not creation time
                                const sortedMonthly = [...monthlyReports].sort((a, b) => getReportSortDate(a) - getReportSortDate(b));
                                console.log('[COMPARE_DEBUG_V3] sortedMonthly order:', sortedMonthly.map(r => ({
                                  title: r.title, dateRange: r.dateRange, startDate: r.startDate,
                                  parsedFromRange: parseDateFromRange(r.dateRange)?.toISOString?.(),
                                  sortDate: getReportSortDate(r)?.toISOString?.(), id: r.id
                                })));
                                const findPrev = (report) => {
                                  const idx = sortedMonthly.findIndex(r => r.id === report.id);
                                  const prev = idx > 0 ? sortedMonthly[idx - 1] : null;
                                  console.log('[COMPARE_DEBUG_V3] findPrev for', report.title, '→ idx=', idx, '→ prev=', prev?.title || 'NULL');
                                  return prev;
                                };
                                return groupReportsByYearMonth(monthlyReports).map(({ year, month, reports: groupReports }) => {
                                  // Newest report first within each month group
                                  const sortedGroup = [...groupReports].sort((a, b) => getReportSortDate(b) - getReportSortDate(a));
                                  return (
                                    <div key={`m-${year}-${month}`} className="mb-4">
                                      <p className="text-[11px] font-medium text-[#86868b] mb-1.5">
                                        {format(new Date(year, month - 1, 1), 'MMMM yyyy')}
                                      </p>
                                      <div className="space-y-2">
                                        {sortedGroup.map(report => (
                                          <ReportCard key={report.id} report={report} compact compareWith={findPrev(report)} />
                                        ))}
                                      </div>
                                    </div>
                                  );
                                });
                              })()}
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

          {/* Unlinked Reports (Admin only, Clients tab only) */}
          {activeTab === 'clients' && effectiveIsAdmin && unlinkedReports.length > 0 && (
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
      ))}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingReport) && (
        <ReportModal
          report={editingReport}
          preSelectedClientId={preSelectedClientId}
          clientList={(!editingReport && !preSelectedClientId && activeTab === 'internal') ? myInternalAccounts : myClients}
          onClose={() => {
            setShowCreateModal(false);
            setEditingReport(null);
            setPreSelectedClientId(null);
          }}
          onSave={(publicLinkId) => {
            setShowCreateModal(false);
            setEditingReport(null);
            setPreSelectedClientId(null);
            if (publicLinkId) setSharePopupLink(publicLinkId);
          }}
        />
      )}

      {/* Share Link Popup — shown after creating or saving a report */}
      {sharePopupLink && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-2xl max-w-md w-full p-6 border border-black/5 dark:border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                <LinkIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Report saved!</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Share this link with your client</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 mb-4">
              <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">
                {`${window.location.origin}/report/${sharePopupLink}`}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/report/${sharePopupLink}`);
                  toast.success('Link copied!');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium transition-colors flex-shrink-0"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => window.open(`${window.location.origin}/report/${sharePopupLink}`, '_blank')}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/20 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Preview
              </button>
              <button
                onClick={() => setSharePopupLink(null)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-sm font-medium transition-colors"
              >
                <Check className="w-4 h-4" />
                Done
              </button>
            </div>
          </div>
        </div>
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
const ReportModal = ({ report, preSelectedClientId, clientList, onClose, onSave }) => {
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
  const [slowExtraction, setSlowExtraction] = useState(false);
  const slowExtractionTimerRef = useRef(null);
  const [metricsSectionCollapsed, setMetricsSectionCollapsed] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const fileInputRef = useRef(null);
  const hasAutoExtractedRef = useRef(false);

  const hasMetricsForSummary = formData.metrics && typeof formData.metrics === 'object' && Object.keys(formData.metrics).length > 0;

  const handleGenerateSummary = async () => {
    if (!hasMetricsForSummary || generatingSummary) return;
    setGeneratingSummary(true);
    try {
      const summary = await openaiService.generateReportSummary(formData.metrics, {
        dateRange: formData.dateRange || '',
        clientName: formData.clientName || ''
      });
      setFormData(prev => ({ ...prev, notes: summary }));
      toast.success('Summary generated. You can edit it below.');
    } catch (err) {
      console.error('Generate summary error:', err);
      toast.error(err.message || 'Could not generate summary. Try again.');
    } finally {
      setGeneratingSummary(false);
    }
  };

  // Load clients for dropdown: use clientList (filtered by assignment for non-admins) when provided
  useEffect(() => {
    if (clientList !== undefined) {
      const sorted = [...(clientList || [])].sort((a, b) => (a.clientName || '').localeCompare(b.clientName || ''));
      setClients(sorted);
      setLoadingClients(false);
      if (preSelectedClientId && !formData.clientName) {
        const selectedClient = sorted.find(c => c.id === preSelectedClientId);
        if (selectedClient) {
          setFormData(prev => ({ ...prev, clientName: selectedClient.clientName || selectedClient.name || '' }));
        }
      }
      return;
    }
    const loadClients = async () => {
      try {
        const clientsList = await supabaseService.getClients();
        const sortedClients = clientsList.sort((a, b) => (a.clientName || '').localeCompare(b.clientName || ''));
        setClients(sortedClients);
        if (preSelectedClientId && !formData.clientName) {
          const selectedClient = sortedClients.find(c => c.id === preSelectedClientId);
          if (selectedClient) {
            setFormData(prev => ({ ...prev, clientName: selectedClient.clientName || selectedClient.name || '' }));
          }
        }
      } catch (error) {
        console.error('Error loading clients:', error);
      } finally {
        setLoadingClients(false);
      }
    };
    loadClients();
  }, [preSelectedClientId, clientList]);

  // Auto-generate dateRange string from selected dates (Vancouver-friendly: no timezone shift, display matches selection)
  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      const dateRangeStr = formatDateRangeDisplay(formData.startDate, formData.endDate);
      if (dateRangeStr) setFormData(prev => ({ ...prev, dateRange: dateRangeStr }));
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
    setSlowExtraction(false);
    slowExtractionTimerRef.current = setTimeout(() => setSlowExtraction(true), 15000);
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
        
        // Merge only defined extraction values so we never overwrite views/profileVisits with undefined when AI/OCR omits them
        const dateKeys = ['startDate', 'endDate', 'dateRange'];
        const extractedMetrics = {};
        for (const [k, v] of Object.entries(metrics)) {
          if (v !== undefined && v !== null && !dateKeys.includes(k)) extractedMetrics[k] = v;
        }
        return {
          ...prev,
          startDate: newStartDate,
          endDate: newEndDate,
          dateRange: metrics.dateRange ?? prev.dateRange,
          metrics: { ...(prev.metrics || {}), ...extractedMetrics },
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
      clearTimeout(slowExtractionTimerRef.current);
      setSlowExtraction(false);
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
      const startDate = dateFromYYYYMMDD(formData.startDate);
      const endDate = dateFromYYYYMMDD(formData.endDate);
      const dateRange = String(formData.dateRange ?? '');
      const notes = String(formData.notes ?? '');
      const postLinks = (formData.postLinks || []).map((l) => ({ url: String(l?.url ?? ''), label: String(l?.label ?? ''), comment: String(l?.comment ?? '') }));
      const metrics = formData.metrics ? JSON.parse(JSON.stringify(formData.metrics)) : null;

      let savedPublicLinkId;
      if (report) {
        await supabaseService.updateInstagramReport(report.id, { clientId, clientName, title, startDate, endDate, dateRange, notes, postLinks, metrics });
        savedPublicLinkId = report.publicLinkId;
      } else {
        const result = await supabaseService.createInstagramReport({ clientId, clientName, title, startDate, endDate, dateRange, notes, postLinks, metrics });
        savedPublicLinkId = result?.publicLinkId;
      }
      onSave(savedPublicLinkId);
    } catch (error) {
      console.error('Error saving report:', error);
      const msg = error?.message || '';
      if (msg.includes('503') || msg.toLowerCase().includes('service unavailable')) {
        toast.error('Supabase is temporarily unavailable (503). Please wait a moment and try again.');
      } else if (msg.includes('413') || msg.toLowerCase().includes('too large') || msg.toLowerCase().includes('payload')) {
        toast.error('Report data is too large to save. Try removing some screenshots and retry.');
      } else {
        toast.error(msg || 'Failed to save report. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
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
                  onChange={(e) => {
                    const newStart = e.target.value;
                    setFormData(prev => {
                      // Auto-fill the title if it is blank (new report)
                      let newTitle = prev.title;
                      if (!prev.title && newStart) {
                        const d = new Date(newStart + 'T12:00:00');
                        if (!isNaN(d)) {
                          const month = d.toLocaleString('en-US', { month: 'long' });
                          const year = d.getFullYear();
                          newTitle = `Performance Report - ${month} ${year}`;
                        }
                      }
                      return { ...prev, startDate: newStart, title: newTitle };
                    });
                  }}
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

            {/* Notes / Summary */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Report Highlights / Notes
                </label>
                <button
                  type="button"
                  onClick={handleGenerateSummary}
                  disabled={!hasMetricsForSummary || generatingSummary}
                  title={!hasMetricsForSummary ? 'Add or extract metrics above to generate an AI summary' : undefined}
                  className="
                    inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-white text-sm
                    bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500
                    hover:from-violet-500 hover:via-fuchsia-500 hover:to-cyan-400
                    focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:ring-offset-2 focus:ring-offset-gray-900
                    disabled:opacity-60 disabled:cursor-not-allowed
                    transition-all duration-300
                    shadow-[0_0_20px_-4px_rgba(139,92,246,0.5),0_0_24px_-6px_rgba(6,182,212,0.35)]
                    hover:shadow-[0_0_28px_-4px_rgba(139,92,246,0.6),0_0_32px_-4px_rgba(6,182,212,0.45)]
                    hover:scale-[1.02] active:scale-[0.98]
                  "
                >
                  {generatingSummary ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating…</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate analytics summary</span>
                    </>
                  )}
                </button>
              </div>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add insights, highlights, and recommendations for the client — or use the button above to generate an AI summary from your metrics."
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
                      <Sparkles className="w-5 h-5 text-amber-600 animate-pulse" />
                      <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                        {extractionProgress.status}
                      </span>
                    </div>
                    {slowExtraction && (
                      <p className="text-xs text-amber-700 dark:text-amber-300 mb-2 italic">
                        ⏳ Thinking longer than usual — the AI is processing multiple images. Hang tight…
                      </p>
                    )}
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
                          placeholder="—"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Followers</label>
                        <input
                          type="number"
                          value={formData.metrics?.followers || ''}
                          onChange={(e) => updateMetric('followers', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="—"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Interactions</label>
                        <input
                          type="number"
                          value={formData.metrics?.interactions || ''}
                          onChange={(e) => updateMetric('interactions', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="—"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Profile Visits</label>
                        <input
                          type="number"
                          value={formData.metrics?.profileVisits || ''}
                          onChange={(e) => updateMetric('profileVisits', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="—"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Accounts Reached</label>
                        <input
                          type="number"
                          value={formData.metrics?.accountsReached || ''}
                          onChange={(e) => updateMetric('accountsReached', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="—"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Likes</label>
                        <input
                          type="number"
                          value={formData.metrics?.likes || ''}
                          onChange={(e) => updateMetric('likes', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="—"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Comments</label>
                        <input
                          type="number"
                          value={formData.metrics?.comments || ''}
                          onChange={(e) => updateMetric('comments', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="—"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Reposts</label>
                        <input
                          type="number"
                          value={formData.metrics?.reposts || ''}
                          onChange={(e) => updateMetric('reposts', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="—"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Reach</label>
                        <input
                          type="number"
                          value={formData.metrics?.reach || ''}
                          onChange={(e) => updateMetric('reach', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="—"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Impressions</label>
                        <input
                          type="number"
                          value={formData.metrics?.impressions || ''}
                          onChange={(e) => updateMetric('impressions', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="—"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Saves</label>
                        <input
                          type="number"
                          value={formData.metrics?.saves || ''}
                          onChange={(e) => updateMetric('saves', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="—"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Shares</label>
                        <input
                          type="number"
                          value={formData.metrics?.shares || ''}
                          onChange={(e) => updateMetric('shares', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="—"
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
                          placeholder="—"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Follower Change</label>
                        <input
                          type="number"
                          value={formData.metrics?.followerChange ?? ''}
                          onChange={(e) => { const v = parseInt(e.target.value); updateMetric('followerChange', isNaN(v) ? null : v); }}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="—"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Profile Visits Change</label>
                        <input
                          type="text"
                          value={formData.metrics?.profileVisitsChange || ''}
                          onChange={(e) => updateMetric('profileVisitsChange', e.target.value)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="—"
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
                          placeholder="—"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Accounts Reached Change</label>
                        <input
                          type="text"
                          value={formData.metrics?.accountsReachedChange || ''}
                          onChange={(e) => updateMetric('accountsReachedChange', e.target.value)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="—"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">External Link Taps</label>
                        <input
                          type="number"
                          value={formData.metrics?.externalLinkTaps ?? ''}
                          onChange={(e) => { const v = parseInt(e.target.value); updateMetric('externalLinkTaps', isNaN(v) ? null : v); }}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="—"
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
                          placeholder="—"
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
                          placeholder="—"
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
                          placeholder="—"
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
                          placeholder="—"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">New Follows</label>
                        <input
                          type="number"
                          value={formData.metrics?.growth?.follows || ''}
                          onChange={(e) => updateNestedMetric('growth', 'follows', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="—"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Unfollows</label>
                        <input
                          type="number"
                          value={formData.metrics?.growth?.unfollows || ''}
                          onChange={(e) => updateNestedMetric('growth', 'unfollows', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="—"
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

                  {/* Top Countries */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <MapPin className="w-4 h-4" /> Top Countries
                      </h5>
                      <button
                        onClick={() => addArrayItem('topCountries', { name: '', percentage: 0 })}
                        className="text-xs text-purple-600 hover:text-purple-700"
                      >
                        + Add Country
                      </button>
                    </div>
                    <div className="space-y-2">
                      {(formData.metrics?.topCountries || []).map((country, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={country.name}
                            onChange={(e) => updateArrayMetric('topCountries', idx, 'name', e.target.value)}
                            className="flex-1 px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                            placeholder="Country name"
                          />
                          <input
                            type="number"
                            step="0.1"
                            value={country.percentage}
                            onChange={(e) => updateArrayMetric('topCountries', idx, 'percentage', parseFloat(e.target.value) || 0)}
                            className="w-20 px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                            placeholder="%"
                          />
                          <button
                            onClick={() => removeArrayItem('topCountries', idx)}
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
      </div>,
        document.body
      )}
      {/* Live Preview Modal */}
      {showPreview && createPortal(
        <ReportPreviewModal
          report={formData}
          onClose={() => setShowPreview(false)}
        />,
        document.body
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
  const closeLightbox = () => setLightboxImage(null);
  const navigateLightbox = (direction) => {
    const newIndex = lightboxIndex + direction;
    if (newIndex >= 0 && newIndex < screenshots.length) {
      setLightboxIndex(newIndex);
      setLightboxImage(screenshots[newIndex]);
    }
  };

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

  const fmtPct = (value) => {
    if (value == null || value === '') return '—';
    const n = Number(value);
    if (Number.isNaN(n)) return '—';
    const normalized = n > 100 && n < 1000 ? n / 10 : n;
    return Math.min(100, Math.max(0, normalized)).toFixed(1);
  };
  const nonFollowersPct = (followersPercent, storedNonFollowers) => {
    const followers = followersPercent != null ? Number(followersPercent) : null;
    const stored = storedNonFollowers != null ? Number(storedNonFollowers) : null;
    if (stored != null && stored <= 100 && !Number.isNaN(stored)) return fmtPct(stored);
    if (followers != null && !Number.isNaN(followers)) return fmtPct(100 - followers);
    return fmtPct(stored);
  };

  const displayTitle = (() => {
    const t = (report.title || '').trim();
    if (!t || t.toLowerCase() === 'monthly report' || t.toLowerCase() === 'instagram report') {
      if (report.dateRange) {
        const match = report.dateRange.match(/([A-Za-z]+)\s+\d+/);
        if (match) return `Performance Report — ${match[1]}`;
      }
      return 'Performance Report';
    }
    return t;
  })();

  const accentColor = isYearly ? '#818cf8' : isQuarterly ? '#34d399' : '#c084fc';
  const m = report.metrics || {};

  return (
    <div className="fixed inset-0 z-[200] flex flex-col" style={{ background: 'rgba(0,0,0,0.85)' }}>
      {/* Thin preview banner */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-[#0d0d14] border-b border-white/10">
        <div className="flex items-center gap-2 text-white/60 text-xs font-medium uppercase tracking-widest">
          <Eye className="w-3.5 h-3.5" />
          Live Preview — this is how the report will look to your client
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable report content — mirrors PublicInstagramReportPage exactly */}
      <div className="flex-1 overflow-y-auto" style={{ background: '#f8f7ff' }}>

        {/* Header */}
        <header className="bg-white/90 backdrop-blur-lg border-b border-gray-200/60 sticky top-0 z-30 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center gap-3">
              <img src="/Luxury-listings-logo-CLR.png" alt="Luxury Listings" className="h-8 w-auto object-contain" />
              <div>
                <p className="text-sm font-semibold text-gray-900 leading-tight">Luxury Listings</p>
                <p className="text-xs text-gray-400 leading-tight">Instagram Analytics Report</p>
              </div>
            </div>
          </div>
        </header>

        {/* Hero */}
        <div className="relative overflow-hidden" style={{ background: '#0d0d14' }}>
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }} />
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-20 blur-[80px]"
            style={{ background: `radial-gradient(ellipse, ${accentColor} 0%, transparent 70%)` }} />
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 pb-36 sm:pb-44">
            <div className="text-center text-white">
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] mb-1.5" style={{ color: accentColor }}>Prepared for</p>
                <p className="text-2xl sm:text-3xl font-bold text-white">{report.clientName || 'Client Name'}</p>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white/95 mb-5 tracking-tight">{displayTitle}</h1>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm">
                  <Calendar className="w-3.5 h-3.5 text-white/70" />
                  <span className="text-sm text-white/90">{report.dateRange || 'Date Range'}</span>
                </div>
                {isYearly && <span className="inline-flex items-center px-3 py-1.5 rounded-full border border-indigo-400/30 bg-indigo-500/20 text-sm text-indigo-200 font-medium">Annual Report</span>}
                {isQuarterly && <span className="inline-flex items-center px-3 py-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/20 text-sm text-emerald-200 font-medium">Quarterly Report</span>}
                {isAggregated && sourceCount > 0 && <span className="text-xs text-white/50 px-2">Aggregated from {sourceCount} monthly report{sourceCount !== 1 ? 's' : ''}</span>}
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
              <path d="M0 80L60 70C120 60 240 40 360 30C480 20 600 20 720 25C840 30 960 40 1080 45C1200 50 1320 50 1380 50L1440 50V80H0Z" fill="#f8f7ff" />
            </svg>
          </div>
        </div>

        {/* Key Metrics cards */}
        {report.metrics && (() => {
          const followerChangeVal = (() => { const fc = m.followerChange; if (fc == null) return null; const n = parseInt(fc); return isNaN(n) ? String(fc) : `${n > 0 ? '+' : ''}${n}`; })();
          const followerChangePosNeg = (() => { const fc = m.followerChange; const n = parseInt(fc); return !isNaN(n) ? n : Number(fc); })();
          const cards = [
            m.accountsReached != null ? { icon: Users, label: 'Accounts Reached', value: formatCompact(m.accountsReached), badge: m.accountsReachedChange, badgePos: m.accountsReachedChange?.startsWith('+'), iconGradient: 'from-violet-600 to-purple-700' } : null,
            m.followers != null ? { icon: Users, label: 'Total Followers', value: formatCompact(m.followers), badge: followerChangeVal, badgePos: followerChangePosNeg >= 0, iconGradient: 'from-pink-600 to-rose-700' } : null,
            m.views != null ? { icon: Eye, label: 'Total Views', value: formatCompact(m.views), badge: m.viewsFollowerPercent != null ? `${m.viewsFollowerPercent}% followers` : null, badgeNeutral: true, iconGradient: 'from-violet-500 to-indigo-600' } : null,
            m.interactions != null ? { icon: Heart, label: 'Interactions', value: formatCompact(m.interactions), badge: null, iconGradient: 'from-orange-500 to-red-600' } : (m.profileVisits != null ? { icon: MousePointer, label: 'Profile Visits', value: formatCompact(m.profileVisits), badge: m.profileVisitsChange, badgePos: m.profileVisitsChange?.startsWith('+'), iconGradient: 'from-blue-500 to-indigo-600' } : null),
          ].filter(Boolean);
          return (
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 relative z-10">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {cards.map((card, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-purple-100/60 p-5 flex flex-col" style={{ boxShadow: '0 8px 30px rgba(124,58,237,0.09), 0 2px 8px rgba(0,0,0,0.05)' }}>
                    <div className="flex items-center gap-2 mb-4">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${card.iconGradient} flex items-center justify-center flex-shrink-0`}>
                        <card.icon className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-xs font-medium text-gray-400 leading-tight">{card.label}</span>
                    </div>
                    <p className="text-4xl font-black text-gray-900 tracking-tight leading-none mb-2" style={{ fontVariantNumeric: 'tabular-nums' }}>{card.value}</p>
                    {card.badge && (
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold w-fit px-2 py-0.5 rounded-full ${card.badgeNeutral ? 'bg-violet-50 text-violet-700' : card.badgePos ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                        {!card.badgeNeutral && (card.badgePos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />)}
                        {card.badge}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Quarterly breakdown — yearly only */}
        {isYearly && report.quarterlyBreakdown && report.quarterlyBreakdown.length > 0 && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-indigo-500" />Quarterly breakdown</h2>
                <p className="text-sm text-gray-500 mt-0.5">Performance by quarter</p>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {report.quarterlyBreakdown.map((q) => {
                  const qm = q.metrics;
                  const hasData = qm && (qm.views != null || qm.interactions != null || qm.profileVisits != null);
                  return (
                    <div key={q.quarter} className={`rounded-xl border-2 p-4 ${hasData ? 'bg-gray-50/80 border-indigo-100' : 'bg-gray-50/50 border-gray-100'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-indigo-600">Q{q.quarter}</span>
                        {q.reportCount != null && <span className="text-xs text-gray-500">{q.reportCount} report{q.reportCount !== 1 ? 's' : ''}</span>}
                      </div>
                      {hasData ? (
                        <div className="space-y-2 text-sm">
                          {qm.views != null && <div className="flex justify-between"><span className="text-gray-500">Views</span><span className="font-medium">{formatCompact(qm.views)}</span></div>}
                          {qm.interactions != null && <div className="flex justify-between"><span className="text-gray-500">Interactions</span><span className="font-medium">{formatCompact(qm.interactions)}</span></div>}
                          {qm.profileVisits != null && <div className="flex justify-between"><span className="text-gray-500">Profile visits</span><span className="font-medium">{formatCompact(qm.profileVisits)}</span></div>}
                        </div>
                      ) : <p className="text-xs text-gray-400">No data</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Notes / Report Highlights */}
        {report.notes && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
            <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-purple-500" />
                Report Highlights
              </h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{report.notes}</p>
            </div>
          </div>
        )}

        {/* Insights */}
        {report.metrics && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
            <div className="rounded-2xl overflow-hidden bg-white border border-gray-200 text-gray-900 shadow-lg">
              <div className="p-6 sm:p-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Insights</h2>
                <p className="text-sm text-gray-500 mb-6">{report.dateRange}</p>

                {/* Views & Interactions circles */}
                {(() => {
                  const hasViews = m.views != null || m.viewsFollowerPercent != null;
                  const hasInteractions = m.interactions != null;
                  const hasTopCities = m.topCities && m.topCities.length > 0;
                  const oneCircle = [hasViews, hasInteractions].filter(Boolean).length === 1;
                  return (
                    <div className={oneCircle ? 'flex justify-center mb-10' : 'grid grid-cols-1 sm:grid-cols-2 gap-10 sm:gap-12 mb-10'}>
                      {hasViews && (
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8">
                          <div className="flex flex-col items-center flex-shrink-0">
                            <div className="relative w-[200px] h-[200px]">
                              <svg width="200" height="200" viewBox="0 0 200 200" className="transform -rotate-90 w-full h-full">
                                <circle cx="100" cy="100" r="78" fill="none" stroke="#e5e7eb" strokeWidth="28" />
                                <circle cx="100" cy="100" r="78" fill="none" stroke="#9C27B0" strokeWidth="28" strokeDasharray={`${(m.viewsFollowerPercent ?? 50) * 4.9} 490`} strokeLinecap="round" />
                                <circle cx="100" cy="100" r="78" fill="none" stroke="#E040FB" strokeWidth="28" strokeDasharray={`${(100 - (m.viewsFollowerPercent ?? 50)) * 4.9} 490`} strokeDashoffset={`-${(m.viewsFollowerPercent ?? 50) * 4.9}`} strokeLinecap="round" />
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-gray-500 text-sm font-medium">Views</span>
                                <span className="text-3xl font-bold text-gray-900 mt-0.5">{formatCompact(m.views)}</span>
                              </div>
                            </div>
                            <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-1">
                              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#9C27B0]" /><span className="text-sm text-gray-600">Followers</span><span className="text-sm font-semibold text-gray-900">{fmtPct(m.viewsFollowerPercent)}%</span></div>
                              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#E040FB]" /><span className="text-sm text-gray-600">Non-followers</span><span className="text-sm font-semibold text-gray-900">{nonFollowersPct(m.viewsFollowerPercent, m.nonFollowerPercent)}%</span></div>
                            </div>
                          </div>
                          {hasTopCities && (
                            <div className="min-w-0 flex-1 max-w-xs sm:max-w-sm">
                              <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2"><MapPin className="w-4 h-4 text-purple-500 flex-shrink-0" />Top locations</h3>
                              <div className="space-y-3">
                                {m.topCities.map((city, idx) => {
                                  const maxPct = m.topCities[0]?.percentage || 100;
                                  const barPct = Math.min(100, (city.percentage / maxPct) * 100);
                                  return (
                                    <div key={idx} className="flex items-center gap-3">
                                      <span className="text-sm text-gray-700 w-28 flex-shrink-0 truncate">{city.name}</span>
                                      <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden min-w-0"><div className="h-full rounded-full bg-[#E040FB] transition-all duration-500" style={{ width: `${barPct}%` }} /></div>
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
                              <circle cx="100" cy="100" r="78" fill="none" stroke="#E040FB" strokeWidth="28" strokeDasharray={`${((m.interactionsFollowerPercent ?? m.viewsFollowerPercent) ?? 50) * 4.9} 490`} strokeLinecap="round" />
                              <circle cx="100" cy="100" r="78" fill="none" stroke="#7C4DFF" strokeWidth="28" strokeDasharray={`${(100 - ((m.interactionsFollowerPercent ?? m.viewsFollowerPercent) ?? 50)) * 4.9} 490`} strokeDashoffset={`-${((m.interactionsFollowerPercent ?? m.viewsFollowerPercent) ?? 50) * 4.9}`} strokeLinecap="round" />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                              <span className="text-gray-500 text-sm font-medium">Interactions</span>
                              <span className="text-3xl font-bold text-gray-900 mt-0.5">{formatCompact(m.interactions)}</span>
                            </div>
                          </div>
                          <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-1">
                            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#E040FB]" /><span className="text-sm text-gray-600">Followers</span><span className="text-sm font-semibold text-gray-900">{fmtPct(m.interactionsFollowerPercent ?? m.viewsFollowerPercent)}%</span></div>
                            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#7C4DFF]" /><span className="text-sm text-gray-600">Non-followers</span><span className="text-sm font-semibold text-gray-900">{nonFollowersPct(m.interactionsFollowerPercent ?? m.viewsFollowerPercent, null)}%</span></div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Top cities standalone */}
                {m.topCities && m.topCities.length > 0 && (m.views == null && m.viewsFollowerPercent == null) && (
                  <div className="mt-8">
                    <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2"><MapPin className="w-4 h-4 text-purple-500" />Top locations</h3>
                    <div className="space-y-3">
                      {m.topCities.map((city, idx) => {
                        const maxPct = m.topCities[0]?.percentage || 100;
                        const barPct = Math.min(100, (city.percentage / maxPct) * 100);
                        return (
                          <div key={idx} className="flex items-center gap-3">
                            <span className="text-sm text-gray-700 w-28 flex-shrink-0">{city.name}</span>
                            <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden"><div className="h-full rounded-full bg-[#E040FB] transition-all duration-500" style={{ width: `${barPct}%` }} /></div>
                            <span className="text-sm font-medium text-gray-900 w-12 text-right">{city.percentage}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Top countries */}
                {m.topCountries && m.topCountries.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2"><MapPin className="w-4 h-4 text-purple-500" />Top countries</h3>
                    <div className="space-y-3">
                      {m.topCountries.map((country, idx) => {
                        const maxPct = m.topCountries[0]?.percentage || 100;
                        const barPct = Math.min(100, (country.percentage / maxPct) * 100);
                        return (
                          <div key={idx} className="flex items-center gap-3">
                            <span className="text-sm text-gray-700 w-28 flex-shrink-0">{country.name}</span>
                            <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden"><div className="h-full rounded-full bg-[#9C27B0] transition-all duration-500" style={{ width: `${barPct}%` }} /></div>
                            <span className="text-sm font-medium text-gray-900 w-12 text-right">{country.percentage}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Age range */}
                {m.ageRanges && m.ageRanges.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-purple-500" />Age range</h3>
                    <div className="space-y-3">
                      {m.ageRanges.map((range, idx) => {
                        const barPct = Math.min(100, range.percentage ?? 0);
                        return (
                          <div key={idx} className="flex items-center gap-3">
                            <span className="text-sm text-gray-700 w-16 flex-shrink-0">{range.range}</span>
                            <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden"><div className="h-full rounded-full bg-[#E040FB] transition-all duration-500" style={{ width: `${barPct}%` }} /></div>
                            <span className="text-sm font-medium text-gray-900 w-12 text-right">{range.percentage}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Content breakdown */}
                {m.contentBreakdown && m.contentBreakdown.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-purple-500" />By content type</h3>
                    <div className="space-y-3">
                      {m.contentBreakdown.map((item, idx) => {
                        const barPct = Math.min(100, item.percentage ?? 0);
                        return (
                          <div key={idx} className="flex items-center gap-3">
                            <span className="text-sm text-gray-700 w-20 flex-shrink-0">{item.type}</span>
                            <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden"><div className="h-full rounded-full bg-[#E040FB] transition-all duration-500" style={{ width: `${barPct}%` }} /></div>
                            <span className="text-sm font-medium text-gray-900 w-12 text-right">{item.percentage}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Gender */}
                {m.gender && (m.gender.men != null || m.gender.women != null) && (
                  <div className="mt-8">
                    <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-purple-500" />Gender</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2"><span className="text-gray-600">Men</span><span className="font-medium text-gray-900">{m.gender.men ?? 0}%</span></div>
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden"><div className="h-full rounded-full bg-[#E040FB]" style={{ width: `${m.gender.men ?? 0}%` }} /></div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-2"><span className="text-gray-600">Women</span><span className="font-medium text-gray-900">{m.gender.women ?? 0}%</span></div>
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden"><div className="h-full rounded-full bg-[#9C27B0]" style={{ width: `${m.gender.women ?? 0}%` }} /></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Growth */}
                {m.growth && (m.growth.follows != null || m.growth.unfollows != null || m.growth.overall !== undefined) && (
                  <div className="mt-8">
                    <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-purple-500" />Growth</h3>
                    {(() => {
                      const follows = m.growth.follows ?? 0;
                      const unfollows = m.growth.unfollows ?? 0;
                      const netChange = m.growth.overall != null ? m.growth.overall : (follows - unfollows);
                      return (
                        <div className="grid grid-cols-3 gap-4">
                          <div className="bg-gray-100 rounded-xl p-4 text-center">
                            <div className={`text-xl font-bold ${netChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{netChange >= 0 ? '+' : ''}{Number(netChange).toLocaleString()}</div>
                            <p className="text-xs text-gray-500 mt-1">Overall</p>
                          </div>
                          <div className="bg-gray-100 rounded-xl p-4 text-center">
                            <div className="text-xl font-bold text-emerald-600">{follows.toLocaleString()}</div>
                            <p className="text-xs text-gray-500 mt-1">Follows</p>
                          </div>
                          <div className="bg-gray-100 rounded-xl p-4 text-center">
                            <div className="text-xl font-bold text-red-600">{unfollows.toLocaleString()}</div>
                            <p className="text-xs text-gray-500 mt-1">Unfollows</p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* By interaction */}
                {(m.likes != null || m.comments != null || m.shares != null || m.saves != null || m.reposts != null) && (
                  <div className="mt-8">
                    <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2"><Heart className="w-4 h-4 text-purple-500" />By interaction</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                      {m.likes != null && <div className="bg-gray-100 rounded-xl p-4 text-center"><div className="text-xl font-bold text-gray-900">{formatCompact(m.likes)}</div><p className="text-xs text-gray-500 mt-1">Likes</p></div>}
                      {m.comments != null && <div className="bg-gray-100 rounded-xl p-4 text-center"><div className="text-xl font-bold text-gray-900">{formatCompact(m.comments)}</div><p className="text-xs text-gray-500 mt-1">Comments</p></div>}
                      {m.shares != null && <div className="bg-gray-100 rounded-xl p-4 text-center"><div className="text-xl font-bold text-gray-900">{formatCompact(m.shares)}</div><p className="text-xs text-gray-500 mt-1">Shares</p></div>}
                      {m.saves != null && <div className="bg-gray-100 rounded-xl p-4 text-center"><div className="text-xl font-bold text-gray-900">{formatCompact(m.saves)}</div><p className="text-xs text-gray-500 mt-1">Saves</p></div>}
                      {m.reposts != null && <div className="bg-gray-100 rounded-xl p-4 text-center"><div className="text-xl font-bold text-gray-900">{formatCompact(m.reposts)}</div><p className="text-xs text-gray-500 mt-1">Reposts</p></div>}
                    </div>
                  </div>
                )}

                {/* Most active times */}
                {m.activeTimes && m.activeTimes.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-purple-500" />Most active times</h3>
                    <div className="flex items-end justify-between gap-1 h-28">
                      {m.activeTimes.map((time, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center min-w-0">
                          <div className="w-full max-w-[24px] mx-auto bg-[#E040FB] rounded-t transition-all duration-300" style={{ height: `${Math.max(4, time.activity || 0)}%` }} />
                          <span className="text-[10px] text-gray-500 mt-2 truncate w-full text-center">{time.hour}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Screenshots Gallery */}
        {screenshots.length > 0 && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {screenshots.map((screenshot, index) => (
                <div key={index} onClick={() => openLightbox(index)} className="group bg-white rounded-2xl shadow-lg overflow-hidden cursor-pointer transform hover:-translate-y-2 transition-all duration-300 hover:shadow-xl">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img src={screenshot.url} alt={screenshot.caption || `Screenshot ${index + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute bottom-4 left-4 right-4 text-white transform translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <p className="text-sm font-medium">Click to enlarge</p>
                    </div>
                  </div>
                  {screenshot.caption && <div className="p-5"><p className="text-gray-700 font-medium">{screenshot.caption}</p></div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instagram Post Links */}
        {report.postLinks && report.postLinks.filter(l => l.url).length > 0 && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Instagram Content</h2>
              <p className="text-gray-600 text-sm">Featured posts and reels from this period</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {report.postLinks.filter(l => l.url).map((link, index) => (
                <div key={index} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden flex flex-col">
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 p-5 flex-shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                      <Instagram className="w-6 h-6 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate group-hover:text-purple-600">{link.label || 'View post'}</p>
                      <p className="text-xs text-gray-500 truncate">{link.url}</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  </a>
                  {link.comment && <p className="p-5 pt-2 text-sm text-gray-600 whitespace-pre-wrap border-t border-gray-100">{link.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <footer style={{ background: '#0d0d14' }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex flex-col items-center text-center gap-4">
              <img src="/Luxury-listings-logo-WHT.png" alt="Luxury Listings" className="h-10 w-auto object-contain opacity-80" />
              <div>
                <p className="text-sm font-semibold text-white/80 tracking-wide">Luxury Listings</p>
                <p className="text-xs text-white/40 mt-0.5">Social Media Management</p>
              </div>
              <div className="w-12 h-px bg-white/10 my-1" />
              <p className="text-xs text-white/30">Preview — not yet published</p>
            </div>
          </div>
        </footer>
      </div>

      {/* Lightbox */}
      {lightboxImage && (
        <div className="fixed inset-0 bg-black/95 z-[210] flex items-center justify-center" onClick={closeLightbox}>
          <button onClick={closeLightbox} className="absolute top-4 right-4 p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"><X className="w-6 h-6" /></button>
          {lightboxIndex > 0 && (
            <button onClick={(e) => { e.stopPropagation(); navigateLightbox(-1); }} className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"><ChevronLeft className="w-8 h-8" /></button>
          )}
          {lightboxIndex < screenshots.length - 1 && (
            <button onClick={(e) => { e.stopPropagation(); navigateLightbox(1); }} className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"><ChevronRight className="w-8 h-8" /></button>
          )}
          <div className="max-w-[90vw] max-h-[85vh] relative" onClick={(e) => e.stopPropagation()}>
            <img src={lightboxImage.url} alt={lightboxImage.caption || 'Screenshot'} className="max-w-full max-h-[85vh] object-contain rounded-lg" />
            {lightboxImage.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 rounded-b-lg">
                <p className="text-white text-center">{lightboxImage.caption}</p>
              </div>
            )}
          </div>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
            <p className="text-white text-sm">{lightboxIndex + 1} / {screenshots.length}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstagramReportsPage;