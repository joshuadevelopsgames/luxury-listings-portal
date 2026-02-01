import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useViewAs } from '../../contexts/ViewAsContext';
import { usePermissions } from '../../contexts/PermissionsContext';
import { firestoreService } from '../../services/firestoreService';
import { USER_ROLES } from '../../entities/UserRoles';
import NotificationsCenter from '../../components/NotificationsCenter';
import { 
  Home, 
  CheckSquare, 
  Users, 
  Calendar, 
  Settings,
  LogOut,
  Menu,
  Bell,
  Search,
  Moon,
  Sun,
  Command,
  User,
  Wrench,
  BookOpen,
  FileText,
  Clock,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Target,
  TrendingUp,
  Briefcase,
  UserCircle,
  Eye,
  X,
  Instagram
} from 'lucide-react';

/**
 * V3 Layout - Apple Design System with Real Firestore Data
 * Full sidebar navigation with permission-based pages
 */
const V3Layout = ({ children }) => {
  const { currentUser, currentRole, logout } = useAuth();
  const { viewingAsUser, isViewingAs, stopViewingAs } = useViewAs();
  const { permissions: userPermissions, isSystemAdmin } = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();
  // #region agent log
  fetch('http://127.0.0.1:7247/ingest/5f481a4f-2c53-40ee-be98-e77cffd69946',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Layout.jsx:V3Layout',message:'V3Layout render',data:{pathname:location.pathname},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H3'})}).catch(()=>{});
  // #endregion
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Vancouver time: dark from 5 PM to 6 AM (switches at 6:00 and 17:00)
  const getVancouverHour = () => {
    const vancouverTime = new Date().toLocaleString('en-US', { timeZone: 'America/Vancouver' });
    return new Date(vancouverTime).getHours();
  };
  const isAfter5PMVancouver = () => {
    const hour = getVancouverHour();
    return hour >= 17 || hour < 6;
  };

  // Manual toggle overrides time-of-day until the next 6 AM or 5 PM Vancouver
  const getMsUntilNextTimeOfDaySwitch = () => {
    const hour = getVancouverHour();
    let hoursUntil = 0;
    if (hour < 6) hoursUntil = 6 - hour;
    else if (hour < 17) hoursUntil = 17 - hour;
    else hoursUntil = (24 - hour) + 6;
    return hoursUntil * 60 * 60 * 1000;
  };

  const [darkMode, setDarkMode] = useState(() => isAfter5PMVancouver());
  const [manualOverrideUntil, setManualOverrideUntil] = useState(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [viewAsPermissions, setViewAsPermissions] = useState([]);

  const handleDarkModeToggle = () => {
    const next = !darkMode;
    setDarkMode(next);
    setManualOverrideUntil(Date.now() + getMsUntilNextTimeOfDaySwitch());
  };

  // Auto-switch dark mode at 6 AM / 5 PM Vancouver; manual toggle overrides until next switch
  useEffect(() => {
    const checkTime = () => {
      const now = Date.now();
      if (manualOverrideUntil != null && now >= manualOverrideUntil) {
        setManualOverrideUntil(null);
        setDarkMode(isAfter5PMVancouver());
      } else if (manualOverrideUntil == null) {
        setDarkMode(isAfter5PMVancouver());
      }
    };

    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, [manualOverrideUntil]);

  // Load permissions for the user being viewed as
  useEffect(() => {
    if (!isViewingAs || !viewingAsUser?.email) {
      setViewAsPermissions([]);
      return;
    }

    const loadViewAsPermissions = async () => {
      try {
        const permissions = await firestoreService.getUserPagePermissions(viewingAsUser.email);
        setViewAsPermissions(permissions || []);
      } catch (error) {
        console.error('Error loading view-as permissions:', error);
        setViewAsPermissions([]);
      }
    };

    loadViewAsPermissions();
  }, [isViewingAs, viewingAsUser?.email]);

  // All available pages with their icons
  const allPages = {
    'dashboard': { name: 'Dashboard', icon: Home, path: '/dashboard' },
    'tasks': { name: 'Tasks', icon: CheckSquare, path: '/tasks' },
    'clients': { name: 'Clients', icon: User, path: '/clients' },
    'client-packages': { name: 'Client Packages', icon: Briefcase, path: '/client-packages' },
    'pending-clients': { name: 'Pending Clients', icon: Clock, path: '/pending-clients' },
    'content-calendar': { name: 'Content Calendar', icon: Calendar, path: '/content-calendar' },
    'crm': { name: 'CRM', icon: Target, path: '/crm' },
    'hr-calendar': { name: 'HR Calendar', icon: Calendar, path: '/hr-calendar' },
    'team': { name: 'Team Management', icon: Users, path: '/team' },
    'hr-analytics': { name: 'HR Analytics', icon: TrendingUp, path: '/hr-analytics' },
    'permissions': { name: 'Users & Permissions', icon: Settings, path: '/permissions' },
    'instagram-reports': { name: 'Instagram Reports', icon: Instagram, path: '/instagram-reports' },
    'it-support': { name: 'IT Support', icon: Wrench, path: '/it-support' },
    'tutorials': { name: 'Tutorials', icon: BookOpen, path: '/tutorials' },
    'resources': { name: 'Resources', icon: FileText, path: '/resources' },
  };

  // Navigation sections based on role/permissions
  const getNavSections = () => {
    // When viewing as another user, show their permissions
    if (isViewingAs && viewAsPermissions.length > 0) {
      return [{
        title: 'Menu',
        items: viewAsPermissions.filter(id => allPages[id])
      }];
    }

    // System admins see everything organized (when not viewing as someone else)
    if (isSystemAdmin && !isViewingAs) {
      return [
        {
          title: 'Main',
          items: ['dashboard', 'tasks']
        },
        {
          title: 'Clients',
          items: ['clients', 'client-packages', 'pending-clients', 'instagram-reports', 'content-calendar', 'crm']
        },
        {
          title: 'Team',
          items: ['team', 'hr-calendar', 'hr-analytics']
        },
        {
          title: 'Admin',
          items: ['permissions', 'it-support']
        },
        {
          title: 'Resources',
          items: ['tutorials', 'resources']
        }
      ];
    }

    // Permission-based navigation
    if (userPermissions.length > 0) {
      return [{
        title: 'Menu',
        items: userPermissions.filter(id => allPages[id])
      }];
    }

    // Role-based fallback
    const roleNavs = {
      [USER_ROLES.ADMIN]: ['dashboard', 'tasks', 'it-support'],
      [USER_ROLES.CONTENT_DIRECTOR]: ['dashboard', 'tasks', 'client-packages', 'content-calendar'],
      [USER_ROLES.SOCIAL_MEDIA_MANAGER]: ['dashboard', 'tasks', 'clients', 'content-calendar'],
      [USER_ROLES.HR_MANAGER]: ['dashboard', 'tasks', 'hr-calendar', 'team', 'hr-analytics'],
      [USER_ROLES.SALES_MANAGER]: ['dashboard', 'tasks', 'crm'],
    };

    return [{
      title: 'Menu',
      items: roleNavs[currentRole] || ['dashboard', 'tasks']
    }];
  };

  const navSections = getNavSections();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[#f5f5f7] dark:bg-[#161617]" />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-purple-50/20 dark:from-blue-950/10 dark:via-transparent dark:to-purple-950/5" />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full z-40
        transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]
        ${sidebarCollapsed ? 'w-[72px]' : 'w-[260px]'}
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-full bg-[#ffffff] dark:bg-[#1c1c1e]/95 dark:backdrop-blur-2xl dark:backdrop-saturate-200 border-r border-gray-200 dark:border-white/5 flex flex-col">
          {/* Logo */}
          <div className="h-[72px] px-4 flex items-center justify-between border-b border-black/5 dark:border-white/5">
            <Link to="/dashboard" className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
                <img 
                  src="/Luxury-listings-logo-CLR.png"
                  alt="Luxury Listings" 
                  className={`h-9 w-auto ${darkMode ? 'brightness-0 invert' : ''}`}
                />
              </div>
              {!sidebarCollapsed && (
                <div className="animate-in fade-in slide-in-from-left-2 duration-200 min-w-0">
                  <h1 className="font-semibold text-[15px] text-[#1d1d1f] dark:text-white tracking-[-0.01em] leading-tight">
                    Luxury Listings
                  </h1>
                  <p className="text-[11px] text-[#86868b] font-medium mt-0.5">Portal</p>
                </div>
              )}
            </Link>
            {!sidebarCollapsed && (
              <button 
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hidden lg:flex w-7 h-7 items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10 flex-shrink-0"
              >
                <ChevronRight className={`w-4 h-4 text-[#86868b] transition-transform ${sidebarCollapsed ? '' : 'rotate-180'}`} />
              </button>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 overflow-y-auto">
            {navSections.map((section, sIdx) => (
              <div key={sIdx} className="mb-6">
                {!sidebarCollapsed && (
                  <p className="px-3 mb-2 text-[11px] font-semibold text-[#86868b] uppercase tracking-wider">
                    {section.title}
                  </p>
                )}
                <div className="space-y-1">
                  {section.items.filter(id => allPages[id]).map((pageId) => {
                    const page = allPages[pageId];
                    const Icon = page.icon;
                    const active = isActive(page.path);
                    
                    return (
                      <Link
                        key={pageId}
                        to={page.path}
                        title={sidebarCollapsed ? page.name : undefined}
                        onClick={() => setSidebarOpen(false)}
                        className={`
                          flex items-center gap-3 px-3 py-2 rounded-lg
                          transition-all duration-200 ease-out
                          ${active
                            ? 'bg-[#0071e3] text-white shadow-sm shadow-[#0071e3]/30'
                            : 'text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-black/5 dark:hover:bg-white/5'
                          }
                        `}
                      >
                        <Icon className={`w-[18px] h-[18px] shrink-0 ${sidebarCollapsed ? 'mx-auto' : ''}`} strokeWidth={1.5} />
                        {!sidebarCollapsed && (
                          <span className="text-[13px] font-medium truncate">{page.name}</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Bottom Section */}
          <div className="px-3 py-4 border-t border-black/5 dark:border-white/5">
            <Link
              to="/classic/dashboard"
              onClick={() => setSidebarOpen(false)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[#86868b] hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-200 mb-2"
            >
              {!sidebarCollapsed && <span className="text-[13px] font-medium">Switch to Classic</span>}
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[#ff3b30] hover:bg-[#ff3b30]/10 transition-all duration-200"
            >
              <LogOut className={`w-[18px] h-[18px] ${sidebarCollapsed ? 'mx-auto' : ''}`} strokeWidth={1.5} />
              {!sidebarCollapsed && <span className="text-[13px] font-medium">Sign Out</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`min-h-screen bg-[#f5f5f7] dark:bg-[#161617] transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] ${sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-[260px]'}`}>
        {/* View As Banner */}
        {isViewingAs && viewingAsUser && (
          <div className="sticky top-0 z-40 bg-gradient-to-r from-[#ff9500] to-[#ff3b30] text-white px-4 py-2">
            <div className="flex items-center justify-between max-w-[1600px] mx-auto">
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5" />
                <span className="text-[13px] font-medium">
                  Viewing as: <span className="font-semibold">{viewingAsUser.displayName || viewingAsUser.email}</span>
                </span>
                <span className="text-[12px] opacity-80">
                  ({viewAsPermissions.length} pages)
                </span>
              </div>
              <button
                onClick={stopViewingAs}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-[13px] font-medium"
              >
                <X className="w-4 h-4" />
                Exit View Mode
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <header className={`sticky ${isViewingAs ? 'top-[44px]' : 'top-0'} z-30 h-[60px] bg-[#ffffff] dark:bg-[#1c1c1e]/95 dark:backdrop-blur-2xl dark:backdrop-saturate-200 border-b border-gray-200 dark:border-white/5`}>
          <div className="h-full flex items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-4">
              {/* Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <Menu className="w-[18px] h-[18px] text-[#1d1d1f] dark:text-[#f5f5f7]" strokeWidth={1.5} />
              </button>
              
              {/* Search */}
              <div className={`
                relative hidden md:flex items-center
                transition-all duration-300
                ${searchFocused ? 'w-80' : 'w-64'}
              `}>
                <Search className="absolute left-3 w-4 h-4 text-[#86868b]" strokeWidth={1.5} />
                <input
                  type="text"
                  placeholder="Search"
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  className="w-full h-9 pl-9 pr-12 rounded-lg bg-black/5 dark:bg-white/5 border-0 text-[13px] text-[#1d1d1f] dark:text-[#f5f5f7] placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50 transition-all"
                />
                <div className="absolute right-3 flex items-center gap-0.5 text-[#86868b]">
                  <Command className="w-3 h-3" />
                  <span className="text-[11px] font-medium">K</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Dark Mode Toggle */}
              <button
                onClick={handleDarkModeToggle}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                {darkMode ? (
                  <Sun className="w-[18px] h-[18px] text-[#f5f5f7]" strokeWidth={1.5} />
                ) : (
                  <Moon className="w-[18px] h-[18px] text-[#1d1d1f]" strokeWidth={1.5} />
                )}
              </button>

              {/* Notifications */}
              <NotificationsCenter />

              {/* Profile Dropdown */}
              <div className="relative ml-2 pl-4 border-l border-black/5 dark:border-white/5">
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                >
                  <div className="text-right hidden sm:block">
                    <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                      {currentUser?.displayName || 'User'}
                    </p>
                    <p className="text-[11px] text-[#86868b] capitalize">{currentRole?.replace('_', ' ') || 'Member'}</p>
                  </div>
                  {currentUser?.avatar || currentUser?.photoURL ? (
                    <img 
                      src={currentUser.avatar || currentUser.photoURL} 
                      alt={currentUser.displayName || 'User'} 
                      className="w-9 h-9 rounded-full object-cover shadow-sm"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#0071e3] to-[#5856d6] flex items-center justify-center text-white text-[13px] font-semibold shadow-sm">
                      {currentUser?.displayName?.charAt(0) || 'U'}
                    </div>
                  )}
                  <ChevronDown className="w-4 h-4 text-[#86868b] hidden sm:block" />
                </button>

                {/* Dropdown Menu */}
                {profileMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setProfileMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-56 py-2 bg-[#ffffff] dark:bg-[#2c2c2e] rounded-xl shadow-xl border border-gray-200 dark:border-white/10 z-50">
                      <div className="px-4 py-2 border-b border-black/5 dark:border-white/5">
                        <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">{currentUser?.displayName}</p>
                        <p className="text-[12px] text-[#86868b] truncate">{currentUser?.email}</p>
                      </div>
                      <div className="py-1">
                        <Link to="/self-service" className="flex items-center gap-3 px-4 py-2 text-[13px] text-[#1d1d1f] dark:text-white hover:bg-black/5 dark:hover:bg-white/5" onClick={() => setProfileMenuOpen(false)}>
                          <UserCircle className="w-4 h-4" strokeWidth={1.5} />
                          My Profile
                        </Link>
                        <Link to="/my-time-off" className="flex items-center gap-3 px-4 py-2 text-[13px] text-[#1d1d1f] dark:text-white hover:bg-black/5 dark:hover:bg-white/5" onClick={() => setProfileMenuOpen(false)}>
                          <Clock className="w-4 h-4" strokeWidth={1.5} />
                          My Time Off
                        </Link>
                        <Link to="/resources" className="flex items-center gap-3 px-4 py-2 text-[13px] text-[#1d1d1f] dark:text-white hover:bg-black/5 dark:hover:bg-white/5" onClick={() => setProfileMenuOpen(false)}>
                          <FileText className="w-4 h-4" strokeWidth={1.5} />
                          Resources
                        </Link>
                      </div>
                      <div className="py-1 border-t border-black/5 dark:border-white/5">
                        <Link to="/classic/dashboard" className="flex items-center gap-3 px-4 py-2 text-[13px] text-[#86868b] hover:bg-black/5 dark:hover:bg-white/5" onClick={() => setProfileMenuOpen(false)}>
                          Switch to Classic View
                        </Link>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-8">
          <div className="max-w-[1600px] mx-auto">
            {/* Apple-style content wrapper */}
            <div className="v3-content-wrapper">
              {children}
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="py-6 px-8 text-center border-t border-black/5 dark:border-white/5">
          <p className="text-[12px] text-[#86868b]">
            © 2026 Luxury Listings. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default V3Layout;
