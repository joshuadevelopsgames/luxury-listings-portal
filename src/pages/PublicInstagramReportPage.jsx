import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabaseService } from '../services/supabaseService';
import { 
  Instagram, 
  Calendar, 
  User, 
  Image as ImageIcon,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Heart,
  MessageCircle,
  Users,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  AlertCircle,
  ExternalLink,
  Eye,
  MousePointer,
  MapPin,
  Clock,
  UserPlus,
  UserMinus,
  Activity,
  CalendarDays,
  FileBarChart
} from 'lucide-react';
import { format } from 'date-fns';
import { getInstagramEmbedUrl } from '../utils/instagramEmbed';

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

const PublicInstagramReportPage = () => {
  const { publicLinkId } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    const loadReport = async () => {
      try {
        const data = await supabaseService.getInstagramReportByPublicLink(publicLinkId);
        if (data) {
          setReport(data);
        } else {
          setError('Report not found');
        }
      } catch (err) {
        console.error('Error loading report:', err);
        setError('Failed to load report');
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [publicLinkId]);

  const openLightbox = (index) => {
    setLightboxIndex(index);
    setLightboxImage(report.screenshots[index]);
  };

  const closeLightbox = () => {
    setLightboxImage(null);
  };

  const navigateLightbox = (direction) => {
    const newIndex = lightboxIndex + direction;
    if (newIndex >= 0 && newIndex < report.screenshots.length) {
      setLightboxIndex(newIndex);
      setLightboxImage(report.screenshots[newIndex]);
    }
  };

  // Handle keyboard navigation in lightbox
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!lightboxImage) return;
      
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') navigateLightbox(-1);
      if (e.key === 'ArrowRight') navigateLightbox(1);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxImage, lightboxIndex]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f8f7ff' }}>
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-purple-500 mx-auto" />
          <p className="mt-4 text-gray-500 text-sm">Loading your report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#f8f7ff' }}>
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-50 flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Report Not Found</h1>
          <p className="text-gray-500 text-sm">
            This report may have been removed or the link is invalid.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#f8f7ff' }}>
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

      {/* Hero Section — dark premium style */}
      {(() => {
        const isQuarterly = report.reportType === 'quarterly';
        const isYearly = report.reportType === 'yearly';
        const isAggregated = isQuarterly || isYearly;
        const sourceCount = report.sourceReportIds?.length;
        // Derive a display title: if the stored title is blank or a generic placeholder, format a nice one
        const displayTitle = (() => {
          const t = (report.title || '').trim();
          if (!t || t.toLowerCase() === 'monthly report' || t.toLowerCase() === 'instagram report') {
            // Try to derive from dateRange e.g. "Jan 1 - Jan 31" → "Performance Report — January 2025"
            if (report.dateRange) {
              const match = report.dateRange.match(/([A-Za-z]+)\s+\d+/);
              if (match) return `Performance Report — ${match[1]}`;
            }
            return 'Performance Report';
          }
          return t;
        })();
        const accentColor = isYearly ? '#818cf8' : isQuarterly ? '#34d399' : '#c084fc';
        return (
      <div className="relative overflow-hidden" style={{ background: '#0d0d14' }}>
        {/* Subtle noise texture overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }} />
        {/* Accent gradient orb */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-20 blur-[80px]"
          style={{ background: `radial-gradient(ellipse, ${accentColor} 0%, transparent 70%)` }} />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 pb-36 sm:pb-44">
          <div className="text-center text-white">

            {/* "Prepared for" label */}
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] mb-1.5" style={{ color: accentColor }}>
                Prepared for
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-white">
                {report.clientName}
              </p>
            </div>

            {/* Main title */}
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white/95 mb-5 tracking-tight">
              {displayTitle}
            </h1>

            {/* Badges row */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm">
                <Calendar className="w-3.5 h-3.5 text-white/70" />
                <span className="text-sm text-white/90">{report.dateRange}</span>
              </div>
              {isYearly && (
                <span className="inline-flex items-center px-3 py-1.5 rounded-full border border-indigo-400/30 bg-indigo-500/20 text-sm text-indigo-200 font-medium">Annual Report</span>
              )}
              {isQuarterly && (
                <span className="inline-flex items-center px-3 py-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/20 text-sm text-emerald-200 font-medium">Quarterly Report</span>
              )}
              {isAggregated && sourceCount != null && sourceCount > 0 && (
                <span className="text-xs text-white/50 px-2">
                  Aggregated from {sourceCount} monthly report{sourceCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Wave Decoration */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <path d="M0 80L60 70C120 60 240 40 360 30C480 20 600 20 720 25C840 30 960 40 1080 45C1200 50 1320 50 1380 50L1440 50V80H0Z" fill="#f8f7ff" />
          </svg>
        </div>
      </div>
        );
      })()}

      {/* Key Metrics — 4 equal hero-style cards */}
      {report.metrics && (() => {
        const m = report.metrics;
        const followerChangeVal = (() => { const fc = m.followerChange; if (fc == null) return null; const n = parseInt(fc); return isNaN(n) ? String(fc) : `${n > 0 ? '+' : ''}${n}`; })();
        const followerChangePosNeg = (() => { const fc = m.followerChange; const n = parseInt(fc); return !isNaN(n) ? n : Number(fc); })();

        const cards = [
          m.accountsReached != null ? {
            icon: Users, label: 'Accounts Reached',
            value: formatCompact(m.accountsReached),
            badge: m.accountsReachedChange,
            badgePos: m.accountsReachedChange?.startsWith('+'),
            iconGradient: 'from-violet-600 to-purple-700',
          } : null,
          m.followers != null ? {
            icon: Users, label: 'Total Followers',
            value: formatCompact(m.followers),
            badge: followerChangeVal,
            badgePos: followerChangePosNeg >= 0,
            iconGradient: 'from-pink-600 to-rose-700',
          } : null,
          m.views != null ? {
            icon: Eye, label: 'Total Views',
            value: formatCompact(m.views),
            badge: m.viewsFollowerPercent != null ? `${m.viewsFollowerPercent}% followers` : null,
            badgeNeutral: true,
            iconGradient: 'from-violet-500 to-indigo-600',
          } : null,
          m.interactions != null ? {
            icon: Heart, label: 'Interactions',
            value: formatCompact(m.interactions),
            badge: null,
            iconGradient: 'from-orange-500 to-red-600',
          } : (m.profileVisits != null ? {
            icon: MousePointer, label: 'Profile Visits',
            value: formatCompact(m.profileVisits),
            badge: m.profileVisitsChange,
            badgePos: m.profileVisitsChange?.startsWith('+'),
            iconGradient: 'from-blue-500 to-indigo-600',
          } : null),
        ].filter(Boolean);

        return (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 relative z-10">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {cards.map((card, i) => (
                <div key={i} className="bg-white rounded-2xl border border-purple-100/60 p-5 flex flex-col"
                  style={{ boxShadow: '0 8px 30px rgba(124,58,237,0.09), 0 2px 8px rgba(0,0,0,0.05)' }}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${card.iconGradient} flex items-center justify-center flex-shrink-0`}>
                      <card.icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-xs font-medium text-gray-400 leading-tight">{card.label}</span>
                  </div>
                  <p className="text-4xl font-black text-gray-900 tracking-tight leading-none mb-2"
                    style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {card.value}
                  </p>
                  {card.badge && (
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold w-fit px-2 py-0.5 rounded-full ${
                      card.badgeNeutral ? 'bg-violet-50 text-violet-700' :
                      card.badgePos ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                    }`}>
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

      {/* Quarterly breakdown — yearly reports only */}
      {report.reportType === 'yearly' && report.quarterlyBreakdown && report.quarterlyBreakdown.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
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
                    className={`rounded-xl border-2 p-4 ${hasData ? 'bg-gray-50/80 border-indigo-100' : 'bg-gray-50/50 border-gray-100'}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-indigo-600">Q{q.quarter}</span>
                      {q.reportCount != null && <span className="text-xs text-gray-500">{q.reportCount} report{q.reportCount !== 1 ? 's' : ''}</span>}
                    </div>
                    {hasData ? (
                      <div className="space-y-2 text-sm">
                        {m.views != null && <div className="flex justify-between"><span className="text-gray-500">Views</span><span className="font-medium">{formatCompact(m.views)}</span></div>}
                        {m.interactions != null && <div className="flex justify-between"><span className="text-gray-500">Interactions</span><span className="font-medium">{formatCompact(m.interactions)}</span></div>}
                        {m.profileVisits != null && <div className="flex justify-between"><span className="text-gray-500">Profile visits</span><span className="font-medium">{formatCompact(m.profileVisits)}</span></div>}
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

      {/* Fallback Stats if no metrics */}
      {!report.metrics && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: ImageIcon, label: 'Screenshots', value: report.screenshots?.length || 0, color: 'from-purple-500 to-purple-600' },
              { icon: TrendingUp, label: 'Performance', value: 'Insights', color: 'from-pink-500 to-pink-600' },
              { icon: Heart, label: 'Engagement', value: 'Metrics', color: 'from-orange-500 to-orange-600' },
              { icon: Users, label: 'Audience', value: 'Analytics', color: 'from-red-500 to-red-600' },
            ].map((stat, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl shadow-lg p-5 transform hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes Section (if exists) */}
      {report.notes && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
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

      {/* Insights (light theme to match page) */}
      {report.metrics && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
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
                              <span className="text-3xl font-bold text-gray-900 mt-0.5">{formatCompact(report.metrics.views)}</span>
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
                            <span className="text-3xl font-bold text-gray-900 mt-0.5">{formatCompact(report.metrics.interactions)}</span>
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
                      const barPct = Math.min(100, range.percentage ?? 0);
                      return (
                        <div key={idx} className="flex items-center gap-3">
                          <span className="text-sm text-gray-700 w-16 flex-shrink-0">{range.range}</span>
                          <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#E040FB] transition-all duration-500"
                              style={{ width: `${barPct}%` }}
                            />
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
                      const barPct = Math.min(100, item.percentage ?? 0);
                      return (
                        <div key={idx} className="flex items-center gap-3">
                          <span className="text-sm text-gray-700 w-20 flex-shrink-0">{item.type}</span>
                          <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#E040FB] transition-all duration-500"
                              style={{ width: `${barPct}%` }}
                            />
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">Men</span>
                        <span className="font-medium text-gray-900">{report.metrics.gender.men ?? 0}%</span>
                      </div>
                      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-[#E040FB]" style={{ width: `${report.metrics.gender.men ?? 0}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">Women</span>
                        <span className="font-medium text-gray-900">{report.metrics.gender.women ?? 0}%</span>
                      </div>
                      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-[#9C27B0]" style={{ width: `${report.metrics.gender.women ?? 0}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Growth */}
              {report.metrics.growth && (report.metrics.growth.follows != null || report.metrics.growth.unfollows != null || report.metrics.growth.overall !== undefined) && (
                <div className="mt-8">
                  <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-500" />
                    Growth
                  </h3>
                  {(() => {
                    const follows = report.metrics.growth.follows ?? 0;
                    const unfollows = report.metrics.growth.unfollows ?? 0;
                    const netChange = (report.metrics.growth.overall != null ? report.metrics.growth.overall : (follows - unfollows)) ?? 0;
                    return (
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-gray-100 rounded-xl p-4 text-center">
                          <div className={`text-xl font-bold ${netChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {netChange >= 0 ? '+' : ''}{Number(netChange).toLocaleString()}
                          </div>
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

              {/* By interaction: likes, comments, shares, saves, reposts */}
              {(report.metrics.likes != null || report.metrics.comments != null || report.metrics.shares != null || report.metrics.saves != null || report.metrics.reposts != null) && (
                <div className="mt-8">
                  <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Heart className="w-4 h-4 text-purple-500" />
                    By interaction
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    {report.metrics.likes != null && (
                      <div className="bg-gray-100 rounded-xl p-4 text-center">
                        <div className="text-xl font-bold text-gray-900">{formatCompact(report.metrics.likes)}</div>
                        <p className="text-xs text-gray-500 mt-1">Likes</p>
                      </div>
                    )}
                    {report.metrics.comments != null && (
                      <div className="bg-gray-100 rounded-xl p-4 text-center">
                        <div className="text-xl font-bold text-gray-900">{formatCompact(report.metrics.comments)}</div>
                        <p className="text-xs text-gray-500 mt-1">Comments</p>
                      </div>
                    )}
                    {report.metrics.shares != null && (
                      <div className="bg-gray-100 rounded-xl p-4 text-center">
                        <div className="text-xl font-bold text-gray-900">{formatCompact(report.metrics.shares)}</div>
                        <p className="text-xs text-gray-500 mt-1">Shares</p>
                      </div>
                    )}
                    {report.metrics.saves != null && (
                      <div className="bg-gray-100 rounded-xl p-4 text-center">
                        <div className="text-xl font-bold text-gray-900">{formatCompact(report.metrics.saves)}</div>
                        <p className="text-xs text-gray-500 mt-1">Saves</p>
                      </div>
                    )}
                    {report.metrics.reposts != null && (
                      <div className="bg-gray-100 rounded-xl p-4 text-center">
                        <div className="text-xl font-bold text-gray-900">{formatCompact(report.metrics.reposts)}</div>
                        <p className="text-xs text-gray-500 mt-1">Reposts</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Most active times */}
              {report.metrics.activeTimes && report.metrics.activeTimes.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-500" />
                    Most active times
                  </h3>
                  <div className="flex items-end justify-between gap-1 h-28">
                    {report.metrics.activeTimes.map((time, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center min-w-0">
                        <div
                          className="w-full max-w-[24px] mx-auto bg-[#E040FB] rounded-t transition-all duration-300"
                          style={{ height: `${Math.max(4, time.activity || 0)}%` }}
                        />
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
      {report.screenshots && report.screenshots.length > 0 && (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {report.screenshots?.map((screenshot, index) => (
            <div
              key={index}
              onClick={() => openLightbox(index)}
              className="group bg-white rounded-2xl shadow-lg overflow-hidden cursor-pointer transform hover:-translate-y-2 transition-all duration-300 hover:shadow-xl"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={screenshot.url}
                  alt={screenshot.caption || `Analytics Screenshot ${index + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-4 left-4 right-4 text-white transform translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <p className="text-sm font-medium">Click to enlarge</p>
                </div>
              </div>
              {screenshot.caption && (
                <div className="p-5">
                  <p className="text-gray-700 font-medium">{screenshot.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      )}

      {/* Instagram Content - embedded posts */}
      {report.postLinks && report.postLinks.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
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

      {/* Footer */}
      <footer style={{ background: '#0d0d14' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col items-center text-center gap-4">
            <img
              src="/Luxury-listings-logo-WHT.png"
              alt="Luxury Listings"
              className="h-10 w-auto object-contain opacity-80"
            />
            <div>
              <p className="text-sm font-semibold text-white/80 tracking-wide">Luxury Listings</p>
              <p className="text-xs text-white/40 mt-0.5">Social Media Management</p>
            </div>
            <div className="w-12 h-px bg-white/10 my-1" />
            <p className="text-xs text-white/30">
              Report generated {report.createdAt?.toDate ? format(report.createdAt.toDate(), 'MMMM d, yyyy') : ''}
            </p>
          </div>
        </div>
      </footer>

      {/* Lightbox */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Navigation Arrows */}
          {lightboxIndex > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); navigateLightbox(-1); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}
          
          {lightboxIndex < report.screenshots.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); navigateLightbox(1); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}

          {/* Image Container */}
          <div 
            className="max-w-[90vw] max-h-[85vh] relative"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxImage.url}
              alt={lightboxImage.caption || 'Screenshot'}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
            {lightboxImage.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 rounded-b-lg">
                <p className="text-white text-center">{lightboxImage.caption}</p>
              </div>
            )}
          </div>

          {/* Image Counter */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
            <p className="text-white text-sm">
              {lightboxIndex + 1} / {report.screenshots.length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicInstagramReportPage;
