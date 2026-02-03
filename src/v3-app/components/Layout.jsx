import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useViewAs } from '../../contexts/ViewAsContext';
import { usePermissions } from '../../contexts/PermissionsContext';
import { firestoreService } from '../../services/firestoreService';
import { USER_ROLES } from '../../entities/UserRoles';
import NotificationsCenter from '../../components/NotificationsCenter';
import SlackChatWidget from '../../components/ui/slack-chat-widget';
import { modules, getBaseModuleIds, getNavItemsForModules } from '../../modules/registry';
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
  Instagram,
  BarChart3,
  Palette
} from 'lucide-react';

/**
 * V3 Layout - Apple Design System with Real Firestore Data
 * Full sidebar navigation with permission-based pages
 */
const V3Layout = () => {
  const { currentUser, currentRole, logout } = useAuth();
  const { viewingAsUser, isViewingAs, stopViewingAs } = useViewAs();
  const { permissions: userPermissions, isSystemAdmin } = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();
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

  // Initialize dark mode from localStorage or time-based default
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('darkModeOverride');
    if (stored) {
      const { darkMode: savedMode, expiresAt } = JSON.parse(stored);
      if (Date.now() < expiresAt) {
        return savedMode;
      }
      // Expired - clear it
      localStorage.removeItem('darkModeOverride');
    }
    return isAfter5PMVancouver();
  });
  
  const [manualOverrideUntil, setManualOverrideUntil] = useState(() => {
    const stored = localStorage.getItem('darkModeOverride');
    if (stored) {
      const { expiresAt } = JSON.parse(stored);
      if (Date.now() < expiresAt) {
        return expiresAt;
      }
    }
    return null;
  });
  
  const [searchFocused, setSearchFocused] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [viewAsPermissions, setViewAsPermissions] = useState([]);

  const handleDarkModeToggle = () => {
    const next = !darkMode;
    const expiresAt = Date.now() + getMsUntilNextTimeOfDaySwitch();
    setDarkMode(next);
    setManualOverrideUntil(expiresAt);
    // Save to localStorage so it persists across refresh
    localStorage.setItem('darkModeOverride', JSON.stringify({ darkMode: next, expiresAt }));
  };

  // Auto-switch dark mode at 6 AM / 5 PM Vancouver; manual toggle overrides until next switch
  useEffect(() => {
    const checkTime = () => {
      const now = Date.now();
      if (manualOverrideUntil != null && now >= manualOverrideUntil) {
        setManualOverrideUntil(null);
        setDarkMode(isAfter5PMVancouver());
        localStorage.removeItem('darkModeOverride');
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
  // Combines hardcoded pages with module registry
  const allPages = {
    'dashboard': { name: 'Dashboard', icon: Home, path: '/dashboard' },
    // Base modules (always available)
    'time-off': { name: 'My Time Off', icon: Calendar, path: '/my-time-off' },
    'my-clients': { name: 'My Clients', icon: Users, path: '/my-clients' },
    'instagram-reports': { name: 'Instagram Analytics', icon: Instagram, path: '/instagram-reports' },
    // Upgrade modules
    'tasks': { name: 'Tasks', icon: CheckSquare, path: '/tasks' },
    'clients': { name: 'Clients List', icon: User, path: '/clients' },
    'posting-packages': { name: 'Posting Packages', icon: Briefcase, path: '/posting-packages' },
    'content-calendar': { name: 'Content Calendar', icon: Calendar, path: '/content-calendar' },
    'crm': { name: 'CRM', icon: Target, path: '/crm' },
    'hr-calendar': { name: 'HR Calendar', icon: Calendar, path: '/hr-calendar' },
    'team': { name: 'Team Management', icon: Users, path: '/team' },
    'hr-analytics': { name: 'HR Analytics', icon: TrendingUp, path: '/hr-analytics' },
    'permissions': { name: 'Users & Permissions', icon: Settings, path: '/permissions' },
    'it-support': { name: 'IT Support', icon: Wrench, path: '/it-support' },
    'tutorials': { name: 'Tutorials', icon: BookOpen, path: '/tutorials' },
    'resources': { name: 'Resources', icon: FileText, path: '/resources' },
    'workload': { name: 'Team Workload', icon: BarChart3, path: '/workload' },
    'graphic-projects': { name: 'Team Projects', icon: Palette, path: '/graphic-projects' },
  };

  // Navigation sections based on role/permissions - properly categorized
  const getNavSections = () => {
    // Determine which modules the user has access to
    // Base modules can now be disabled per-user, so we rely on explicit permissions
    let enabledModules = [];
    
    if (isViewingAs && viewAsPermissions.length > 0) {
      // When viewing as, use viewed user's explicit permissions
      enabledModules = [...viewAsPermissions];
    } else if (isViewingAs) {
      // Viewing as but no specific permissions - show nothing extra
      enabledModules = [];
    } else if (isSystemAdmin) {
      // System admins see all modules
      enabledModules = Object.keys(modules);
    } else if (userPermissions.length > 0) {
      // Use user's explicit permissions (includes base modules if enabled)
      enabledModules = [...userPermissions];
    } else {
      // No permissions - show nothing
      enabledModules = [];
    }

    // Get navigation items grouped by section from the registry
    const sectionedModules = getNavItemsForModules(enabledModules);
    
    // Define section display order and titles
    const sectionOrder = ['Main', 'SMM', 'Content Team', 'Design Team', 'Sales Team', 'HR', 'Admin', 'Resources'];
    const sectionTitles = {
      'Main': 'Main',
      'SMM': 'SMM',
      'Content Team': 'Content Team',
      'Design Team': 'Design Team',
      'Sales Team': 'Sales Team',
      'HR': 'HR',
      'Admin': 'Admin',
      'Resources': 'Resources'
    };
    
    // Build ordered sections - Dashboard always first
    const sections = [];
    
    // Always show Dashboard at the top
    sections.push({
      title: 'Dashboard',
      items: ['dashboard']
    });
    
    // Add sections in order, only if they have items
    for (const sectionKey of sectionOrder) {
      if (sectionedModules[sectionKey] && sectionedModules[sectionKey].length > 0) {
        sections.push({
          title: sectionTitles[sectionKey],
          items: sectionedModules[sectionKey].map(item => item.id)
        });
      }
    }
    
    // Add admin-only items for system admins
    if (isSystemAdmin && !isViewingAs) {
      // Add clients to SMM section if not already there
      const smmSection = sections.find(s => s.title === 'SMM');
      if (smmSection) {
        if (!smmSection.items.includes('clients')) {
          smmSection.items.unshift('clients');
        }
      }
      
      // Add permissions to Admin section
      const adminSection = sections.find(s => s.title === 'Admin');
      if (adminSection) {
        if (!adminSection.items.includes('permissions')) {
          adminSection.items.unshift('permissions');
        }
      } else {
        sections.push({
          title: 'Admin',
          items: ['permissions']
        });
      }
    }
    
    return sections;
  };

  const navSections = getNavSections();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path || (path === '/dashboard' && location.pathname === '/');

  // Navigation handler
  const handleNavigation = useCallback((path) => {
    setSidebarOpen(false);
    navigate(path);
  }, [navigate]);

  // Check if current user OR viewed-as user is Michelle for special theme
  const isMichelle = currentUser?.email?.toLowerCase() === 'michelle@luxury-listings.com' ||
    (isViewingAs && viewingAsUser?.email?.toLowerCase() === 'michelle@luxury-listings.com');

  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''} ${isMichelle ? 'michelle-theme' : ''}`}>
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
          <div className={`h-[72px] flex items-center border-b border-black/5 dark:border-white/5 ${sidebarCollapsed ? 'px-2 justify-center' : 'px-4 justify-between'}`}>
            {sidebarCollapsed ? (
              /* Collapsed: show logo and expand button stacked */
              <div className="flex flex-col items-center gap-2">
                <Link to="/dashboard" className="w-10 h-10 flex items-center justify-center">
                  <img 
                    src="/Luxury-listings-logo-CLR.png"
                    alt="Luxury Listings" 
                    className={`h-8 w-auto ${darkMode ? 'brightness-0 invert' : ''}`}
                  />
                </Link>
                <button 
                  onClick={() => setSidebarCollapsed(false)}
                  className="hidden lg:flex w-8 h-8 items-center justify-center rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
                  title="Expand sidebar"
                >
                  <ChevronRight className="w-4 h-4 text-[#86868b]" />
                </button>
              </div>
            ) : (
              /* Expanded: show full logo and collapse button */
              <>
                <Link to="/dashboard" className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
                    <img 
                      src="/Luxury-listings-logo-CLR.png"
                      alt="Luxury Listings" 
                      className={`h-9 w-auto ${darkMode ? 'brightness-0 invert' : ''}`}
                    />
                  </div>
                  <div className="animate-in fade-in slide-in-from-left-2 duration-200 min-w-0">
                    <h1 className="font-semibold text-[15px] text-[#1d1d1f] dark:text-white tracking-[-0.01em] leading-tight">
                      Luxury Listings
                    </h1>
                    <p className="text-[11px] text-[#86868b] font-medium mt-0.5">Portal</p>
                  </div>
                </Link>
                <button 
                  onClick={() => setSidebarCollapsed(true)}
                  className="hidden lg:flex w-7 h-7 items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10 flex-shrink-0"
                  title="Collapse sidebar"
                >
                  <ChevronRight className="w-4 h-4 text-[#86868b] rotate-180" />
                </button>
              </>
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
                      <button
                        key={pageId}
                        type="button"
                        title={sidebarCollapsed ? page.name : undefined}
                        onClick={() => handleNavigation(page.path)}
                        className={`
                          w-full flex items-center gap-3 px-3 py-2 rounded-lg
                          transition-all duration-200 ease-out text-left
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
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Bottom Section */}
          <div className="px-3 py-4 border-t border-black/5 dark:border-white/5">
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
          <div className="sticky top-0 z-40 bg-gradient-to-r from-[#5856d6] to-[#af52de] text-white px-4 py-2.5 shadow-lg">
            <div className="flex items-center justify-between max-w-[1600px] mx-auto">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                  <Eye className="w-4 h-4" />
                  <span className="text-[12px] font-semibold uppercase tracking-wide">View Mode</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[14px] font-semibold">
                    {viewingAsUser.displayName || viewingAsUser.email}
                  </span>
                  <span className="text-[11px] opacity-80">
                    {viewingAsUser.role || viewingAsUser.primaryRole || 'User'} • {viewingAsUser.email} • {viewAsPermissions.length} pages accessible
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] opacity-70 hidden sm:block">
                  Data shown is from this user's perspective
                </span>
                <button
                  onClick={stopViewingAs}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-white text-[#5856d6] hover:bg-white/90 transition-colors text-[13px] font-semibold shadow-sm"
                >
                  <X className="w-4 h-4" />
                  Exit
                </button>
              </div>
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
                        <button type="button" className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-[#1d1d1f] dark:text-white hover:bg-black/5 dark:hover:bg-white/5 text-left" onClick={() => { setProfileMenuOpen(false); handleNavigation('/self-service'); }}>
                          <UserCircle className="w-4 h-4" strokeWidth={1.5} />
                          My Profile
                        </button>
                        <button type="button" className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-[#1d1d1f] dark:text-white hover:bg-black/5 dark:hover:bg-white/5 text-left" onClick={() => { setProfileMenuOpen(false); handleNavigation('/my-time-off'); }}>
                          <Clock className="w-4 h-4" strokeWidth={1.5} />
                          My Time Off
                        </button>
                        <button type="button" className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-[#1d1d1f] dark:text-white hover:bg-black/5 dark:hover:bg-white/5 text-left" onClick={() => { setProfileMenuOpen(false); handleNavigation('/resources'); }}>
                          <FileText className="w-4 h-4" strokeWidth={1.5} />
                          Resources
                        </button>
                      </div>
                      <div className="py-1 border-t border-black/5 dark:border-white/5">
                        <button type="button" className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-[#1d1d1f] dark:text-white hover:bg-black/5 dark:hover:bg-white/5 text-left text-red-600 dark:text-red-400" onClick={() => { setProfileMenuOpen(false); logout(); }}>
                          <LogOut className="w-4 h-4" strokeWidth={1.5} />
                          Sign out
                        </button>
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
              <Outlet />
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

      {/* Slack Chat Widget */}
      <SlackChatWidget />
    </div>
  );
};

export default V3Layout;
