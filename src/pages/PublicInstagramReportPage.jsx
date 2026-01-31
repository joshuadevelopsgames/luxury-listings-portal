import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { firestoreService } from '../services/firestoreService';
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
  Activity
} from 'lucide-react';
import { format } from 'date-fns';

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
        const data = await firestoreService.getInstagramReportByPublicLink(publicLinkId);
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading your report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Report Not Found</h1>
          <p className="text-gray-600">
            This report may have been removed or the link is invalid.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center">
                <Instagram className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-semibold text-gray-900">Instagram Analytics</h1>
                <p className="text-xs text-gray-500">Powered by Luxury Listings</p>
              </div>
            </div>
            <a
              href="https://www.smmluxurylistings.info"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
            >
              Learn More <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzLTItMi00LTJjLTItNC00LTItNC0ycy0yIDItMiA0YzAgMiAyIDQgMiA0czIgMiA0IDJjMiA0IDQgMiA0IDJzMi0yIDItNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-10" />
        
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center text-white">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm mb-6">
              <Calendar className="w-4 h-4" />
              <span className="text-sm font-medium">{report.dateRange}</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              {report.title}
            </h1>
            
            <div className="flex items-center justify-center gap-2 text-white/90">
              <User className="w-5 h-5" />
              <span className="text-lg">{report.clientName}</span>
            </div>
          </div>
        </div>

        {/* Wave Decoration */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="rgb(250, 245, 255)" />
          </svg>
        </div>
      </div>

      {/* Key Metrics Overview */}
      {report.metrics && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { 
                icon: Eye, 
                label: 'Total Views', 
                value: report.metrics.views?.toLocaleString() || '—', 
                color: 'from-purple-500 to-purple-600',
                subtext: report.metrics.viewsFollowerPercent ? `${report.metrics.viewsFollowerPercent}% from followers` : null
              },
              { 
                icon: Users, 
                label: 'Followers', 
                value: report.metrics.followers?.toLocaleString() || '—', 
                color: 'from-pink-500 to-pink-600',
                subtext: report.metrics.followerChange ? `${report.metrics.followerChange > 0 ? '+' : ''}${report.metrics.followerChange}` : null,
                subtextColor: report.metrics.followerChange > 0 ? 'text-green-600' : 'text-red-500'
              },
              { 
                icon: Heart, 
                label: 'Interactions', 
                value: report.metrics.interactions?.toLocaleString() || '—', 
                color: 'from-orange-500 to-orange-600',
                subtext: report.metrics.interactionsFollowerPercent ? `${report.metrics.interactionsFollowerPercent}% from followers` : null
              },
              { 
                icon: MousePointer, 
                label: 'Profile Visits', 
                value: report.metrics.profileVisits?.toLocaleString() || '—', 
                color: 'from-blue-500 to-blue-600',
                subtext: report.metrics.profileVisitsChange ? `${report.metrics.profileVisitsChange}` : null,
                subtextColor: report.metrics.profileVisitsChange?.startsWith('+') ? 'text-green-600' : 'text-red-500'
              },
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
                {stat.subtext && (
                  <p className={`text-xs mt-1 ${stat.subtextColor || 'text-gray-400'}`}>{stat.subtext}</p>
                )}
              </div>
            ))}
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

      {/* Detailed Metrics Section */}
      {report.metrics && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Content Performance */}
            {report.metrics.contentBreakdown && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-500" />
                  Content Performance
                </h3>
                <div className="space-y-4">
                  {report.metrics.contentBreakdown.map((item, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{item.type}</span>
                        <span className="font-medium text-gray-900">{item.percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-3">
                        <div 
                          className="h-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Audience Demographics */}
            {report.metrics.topCities && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-pink-500" />
                  Top Locations
                </h3>
                <div className="space-y-3">
                  {report.metrics.topCities.map((city, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-gray-700">{city.name}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-gray-100 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full bg-gradient-to-r from-pink-500 to-orange-500"
                            style={{ width: `${(city.percentage / (report.metrics.topCities[0]?.percentage || 100)) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-12 text-right">{city.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Age Demographics */}
            {report.metrics.ageRanges && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  Age Distribution
                </h3>
                <div className="space-y-3">
                  {report.metrics.ageRanges.map((range, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-gray-700">{range.range}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-gray-100 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                            style={{ width: `${(range.percentage / (report.metrics.ageRanges[0]?.percentage || 100)) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-12 text-right">{range.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gender Split */}
            {report.metrics.gender && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-orange-500" />
                  Audience Gender
                </h3>
                <div className="flex items-center gap-6">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Men</span>
                      <span className="font-medium text-gray-900">{report.metrics.gender.men}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-4">
                      <div 
                        className="h-4 rounded-full bg-gradient-to-r from-blue-400 to-blue-600"
                        style={{ width: `${report.metrics.gender.men}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Women</span>
                      <span className="font-medium text-gray-900">{report.metrics.gender.women}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-4">
                      <div 
                        className="h-4 rounded-full bg-gradient-to-r from-pink-400 to-pink-600"
                        style={{ width: `${report.metrics.gender.women}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Growth Metrics */}
            {report.metrics.growth && (
              <div className="bg-white rounded-2xl shadow-lg p-6 lg:col-span-2">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  Follower Growth
                </h3>
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-gray-50 rounded-xl">
                    <div className={`text-3xl font-bold ${report.metrics.growth.overall >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {report.metrics.growth.overall >= 0 ? '+' : ''}{report.metrics.growth.overall}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Net Change</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-xl">
                    <div className="flex items-center justify-center gap-2">
                      <UserPlus className="w-5 h-5 text-green-600" />
                      <span className="text-3xl font-bold text-green-600">{report.metrics.growth.follows?.toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">New Follows</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-xl">
                    <div className="flex items-center justify-center gap-2">
                      <UserMinus className="w-5 h-5 text-red-500" />
                      <span className="text-3xl font-bold text-red-500">{report.metrics.growth.unfollows?.toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Unfollows</p>
                  </div>
                </div>
              </div>
            )}

            {/* Most Active Times */}
            {report.metrics.activeTimes && (
              <div className="bg-white rounded-2xl shadow-lg p-6 lg:col-span-2">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-500" />
                  Most Active Times
                </h3>
                <div className="flex items-end justify-between gap-2 h-32">
                  {report.metrics.activeTimes.map((time, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center">
                      <div 
                        className="w-full bg-gradient-to-t from-purple-500 to-pink-500 rounded-t-lg transition-all duration-300 hover:from-purple-600 hover:to-pink-600"
                        style={{ height: `${time.activity}%` }}
                      />
                      <span className="text-xs text-gray-500 mt-2">{time.hour}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Screenshots Gallery */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            Analytics Screenshots
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Detailed performance metrics and insights from your Instagram account
          </p>
        </div>

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

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img 
                src="/Luxury-listings-logo-CLR.png" 
                alt="Luxury Listings" 
                className="h-8 w-auto"
              />
              <div>
                <p className="font-semibold text-gray-900">Luxury Listings</p>
                <p className="text-xs text-gray-500">Social Media Management</p>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              Report generated on {report.createdAt?.toDate ? format(report.createdAt.toDate(), 'MMMM d, yyyy') : 'Unknown'}
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
