import React, { useState } from 'react';
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
  Eye,
  MousePointer,
  MapPin,
  Clock,
  UserPlus,
  UserMinus,
  Activity,
  ExternalLink,
  Sparkles
} from 'lucide-react';

/**
 * Demo Instagram Report Page
 * Shows a sample report with extracted data from Instagram analytics screenshots
 * This demonstrates what the final report would look like to clients
 */
const DemoInstagramReportPage = () => {
  const [lightboxImage, setLightboxImage] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Sample data extracted from the user's screenshots
  const report = {
    title: "Monthly Instagram Performance Report",
    clientName: "Sample Client",
    dateRange: "January 1 - January 30, 2026",
    notes: "Strong month for profile visits with +147.1% growth! Posts continue to drive the majority of views (85%). Top audience is 25-34 year olds (42.6%) located primarily in Calgary. Recommend focusing on content during peak activity hours (9am-6pm) to maximize engagement.",
    metrics: {
      // Overview metrics
      views: 16493,
      viewsFollowerPercent: 52.9,
      followers: 6649,
      followerChange: -37,
      followerChangePercent: -0.6,
      interactions: 25,
      interactionsFollowerPercent: 94.5,
      profileVisits: 907,
      profileVisitsChange: "+147.1%",
      accountsReached: 858,
      accountsReachedChange: "-34.3%",
      
      // Content breakdown (by views)
      contentBreakdown: [
        { type: "Posts", percentage: 85.0 },
        { type: "Stories", percentage: 12.5 },
        { type: "Reels", percentage: 2.5 }
      ],
      
      // Interactions by content type
      interactionsByContent: [
        { type: "Stories", percentage: 74.5 },
        { type: "Posts", percentage: 20.0 },
        { type: "Reels", percentage: 5.5 }
      ],
      
      // Top cities
      topCities: [
        { name: "Calgary", percentage: 16.1 },
        { name: "Burnaby", percentage: 8.9 },
        { name: "Vancouver", percentage: 7.5 },
        { name: "Surrey", percentage: 3.1 },
        { name: "Los Angeles", percentage: 0.9 }
      ],
      
      // Age ranges
      ageRanges: [
        { range: "25-34", percentage: 42.6 },
        { range: "18-24", percentage: 39.8 },
        { range: "13-17", percentage: 2.8 },
        { range: "35-44", percentage: 12.0 },
        { range: "65+", percentage: 0.8 }
      ],
      
      // Gender split
      gender: {
        men: 52.0,
        women: 48.0
      },
      
      // Growth metrics
      growth: {
        overall: -37,
        follows: 6724,
        unfollows: 6761
      },
      
      // Most active times (relative activity levels)
      activeTimes: [
        { hour: "12a", activity: 30 },
        { hour: "3a", activity: 25 },
        { hour: "6a", activity: 55 },
        { hour: "9a", activity: 85 },
        { hour: "12p", activity: 90 },
        { hour: "3p", activity: 80 },
        { hour: "6p", activity: 75 },
        { hour: "9p", activity: 50 }
      ],
      
      // Top performing content
      topContent: [
        { date: "Jan 27", views: 518, thumbnail: "🥤" },
        { date: "Jan 5", views: 425, thumbnail: "📺" },
        { date: "Jan 1", views: 369, thumbnail: "🎤" }
      ]
    },
    screenshots: [],
    createdAt: new Date()
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      {/* Demo Banner */}
      <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white py-2 px-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-medium">Demo Preview - This is how your client reports will look with extracted data</span>
          <Sparkles className="w-4 h-4" />
        </div>
      </div>

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
              href="/instagram-reports"
              className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
            >
              Back to Reports <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzLTItMi00LTJjLTItNC00LTItNC0ycy0yIDItMiA0YzAgMiAyIDQgMiA0czIgMiA0IDJjMiA0IDQgMiA0IDJzMi0yIDItNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-10" />
        
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { 
              icon: Eye, 
              label: 'Total Views', 
              value: report.metrics.views?.toLocaleString(), 
              color: 'from-purple-500 to-purple-600',
              subtext: `${report.metrics.viewsFollowerPercent}% from followers`
            },
            { 
              icon: Users, 
              label: 'Followers', 
              value: report.metrics.followers?.toLocaleString(), 
              color: 'from-pink-500 to-pink-600',
              subtext: `${report.metrics.followerChange > 0 ? '+' : ''}${report.metrics.followerChange} (${report.metrics.followerChangePercent}%)`,
              subtextColor: report.metrics.followerChange > 0 ? 'text-green-600' : 'text-red-500'
            },
            { 
              icon: Heart, 
              label: 'Interactions', 
              value: report.metrics.interactions?.toLocaleString(), 
              color: 'from-orange-500 to-orange-600',
              subtext: `${report.metrics.interactionsFollowerPercent}% from followers`
            },
            { 
              icon: MousePointer, 
              label: 'Profile Visits', 
              value: report.metrics.profileVisits?.toLocaleString(), 
              color: 'from-blue-500 to-blue-600',
              subtext: report.metrics.profileVisitsChange,
              subtextColor: 'text-green-600'
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

      {/* Report Highlights */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-purple-500" />
            Report Highlights
          </h2>
          <p className="text-gray-700 leading-relaxed">
            {report.notes}
          </p>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Content Performance */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-500" />
              Views by Content Type
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

          {/* Interactions by Content */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-500" />
              Interactions by Content Type
            </h3>
            <div className="space-y-4">
              {report.metrics.interactionsByContent.map((item, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{item.type}</span>
                    <span className="font-medium text-gray-900">{item.percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div 
                      className="h-3 rounded-full bg-gradient-to-r from-pink-500 to-orange-500"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Locations */}
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
                        style={{ width: `${(city.percentage / report.metrics.topCities[0].percentage) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-12 text-right">{city.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Age Distribution */}
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
                        style={{ width: `${(range.percentage / report.metrics.ageRanges[0].percentage) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-12 text-right">{range.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Gender Split */}
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

          {/* Top Content */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              Top Performing Content
            </h3>
            <div className="flex gap-4">
              {report.metrics.topContent.map((content, idx) => (
                <div key={idx} className="flex-1 text-center p-4 bg-gray-50 rounded-xl">
                  <div className="text-4xl mb-2">{content.thumbnail}</div>
                  <p className="text-2xl font-bold text-gray-900">{content.views}</p>
                  <p className="text-xs text-gray-500">{content.date}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Growth Metrics */}
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
                  <span className="text-3xl font-bold text-green-600">{report.metrics.growth.follows.toLocaleString()}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">New Follows</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-xl">
                <div className="flex items-center justify-center gap-2">
                  <UserMinus className="w-5 h-5 text-red-500" />
                  <span className="text-3xl font-bold text-red-500">{report.metrics.growth.unfollows.toLocaleString()}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">Unfollows</p>
              </div>
            </div>
          </div>

          {/* Most Active Times */}
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
            <p className="text-sm text-gray-500 text-center mt-4">
              Peak activity hours: 9am - 3pm
            </p>
          </div>
        </div>
      </div>

      {/* Screenshots Section Placeholder */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            Original Screenshots
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            The uploaded Instagram analytics screenshots would appear here
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 text-center border-2 border-dashed border-gray-200">
          <ImageIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">
            Screenshots from Instagram Insights would be displayed in a gallery here,<br />
            allowing clients to view the original data alongside the extracted metrics above.
          </p>
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
              Demo Report - Generated January 31, 2026
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DemoInstagramReportPage;
