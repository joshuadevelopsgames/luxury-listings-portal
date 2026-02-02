import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { firestoreService } from '../services/firestoreService';
import { USER_ROLES } from '../entities/UserRoles';
import NotificationsCenter from './NotificationsCenter';
import RoleSwitcher from './ui/role-switcher';
import ChatWidget from './ui/chat-widget';
import { 
  Home, 
  CheckSquare, 
  Users, 
  Calendar, 
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
  Target,
  TrendingUp,
  Briefcase,
  UserCircle,
  Instagram
} from 'lucide-react';

// Import Apple-style CSS
import '../v3-app/styles/globals.css';

/**
 * Apple Layout - Production Apple-styled layout with real Firestore data
 * This is the main layout for the production site
 */
const AppleLayout = ({ children }) => {
  const { currentUser, currentRole, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [userPermissions, setUserPermissions] = useState([]);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  // Check if user is system admin
  const isSystemAdmin = currentUser?.email === 'jrsschroeder@gmail.com';

  // Load user's page permissions
  useEffect(() => {
    if (!currentUser?.email) return;

    let isMounted = true;

    const loadPermissions = async () => {
      try {
        const permissions = await firestoreService.getUserPagePermissions(currentUser.email);
        if (isMounted) {
          setUserPermissions(permissions || []);
        }
      } catch (error) {
        console.error('Error loading permissions:', error);
        if (isMounted) {
          setUserPermissions([]);
        }
      }
    };

    loadPermissions();

    return () => { isMounted = false; };
  }, [currentUser?.email]);

  // All available pages with their icons
  const allPages = {
    'dashboard': { name: 'Dashboard', icon: Home, path: '/dashboard' },
    'tasks': { name: 'Tasks', icon: CheckSquare, path: '/tasks' },
    'clients': { name: 'Clients', icon: User, path: '/clients' },
    'client-packages': { name: 'Client Packages', icon: Briefcase, path: '/client-packages' },
    'pending-clients': { name: 'Pending Clients', icon: Clock, path: '/pending-clients' },
    'instagram-reports': { name: 'Instagram Analytics', icon: Instagram, path: '/instagram-reports' },
    'content-calendar': { name: 'Content Calendar', icon: Calendar, path: '/content-calendar' },
    'crm': { name: 'CRM', icon: Target, path: '/crm' },
    'hr-calendar': { name: 'HR Calendar', icon: Calendar, path: '/hr-calendar' },
    'team': { name: 'Team Management', icon: Users, path: '/team' },
    'hr-analytics': { name: 'HR Analytics', icon: TrendingUp, path: '/hr-analytics' },
    'it-support': { name: 'IT Support', icon: Wrench, path: '/it-support' },
    'tutorials': { name: 'Tutorials', icon: BookOpen, path: '/tutorials' },
    'resources': { name: 'Resources', icon: FileText, path: '/resources' },
  };

  // Navigation sections based on role/permissions
  const getNavSections = () => {
    // System admins see everything organized
    if (isSystemAdmin) {
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
          items: ['it-support']
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
        <div className="absolute inset-0 bg-[#f5f5f7] dark:bg-[#1d1d1f]" />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-purple-50/30 dark:from-blue-950/20 dark:via-transparent dark:to-purple-950/10" />
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
        <div className="h-full bg-white/80 dark:bg-[#2d2d2d]/80 backdrop-blur-2xl backdrop-saturate-200 border-r border-black/5 dark:border-white/5 flex flex-col">
          {/* Logo */}
          <div className="h-[60px] px-5 flex items-center justify-between border-b border-black/5 dark:border-white/5">
            <Link to="/dashboard" className="flex items-center gap-3">
              <img 
                src="/Luxury-listings-logo-CLR.png" 
                alt="Luxury Listings" 
                className="h-8 w-auto"
              />
              {!sidebarCollapsed && (
                <div className="animate-in fade-in slide-in-from-left-2 duration-200">
                  <h1 className="font-semibold text-[15px] text-[#1d1d1f] dark:text-white tracking-[-0.01em]">
                    Luxury Listings
                  </h1>
                  <p className="text-[11px] text-[#86868b] font-medium">Portal</p>
                </div>
              )}
            </Link>
            <button 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex w-6 h-6 items-center justify-center rounded hover:bg-black/5 dark:hover:bg-white/5"
            >
              <ChevronRight className={`w-4 h-4 text-[#86868b] transition-transform ${sidebarCollapsed ? '' : 'rotate-180'}`} />
            </button>
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
      <div className={`transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] ${sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-[260px]'}`}>
        {/* Header */}
        <header className="sticky top-0 z-30 h-[60px] bg-white/80 dark:bg-[#2d2d2d]/80 backdrop-blur-2xl backdrop-saturate-200 border-b border-black/5 dark:border-white/5">
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
                onClick={() => setDarkMode(!darkMode)}
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
              
              {/* Role Switcher */}
              <RoleSwitcher />

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
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#0071e3] to-[#5856d6] flex items-center justify-center text-white text-[13px] font-semibold shadow-sm">
                    {currentUser?.displayName?.charAt(0) || 'U'}
                  </div>
                  <ChevronDown className="w-4 h-4 text-[#86868b] hidden sm:block" />
                </button>

                {/* Dropdown Menu */}
                {profileMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setProfileMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-56 py-2 bg-white dark:bg-[#2d2d2d] rounded-xl shadow-xl border border-black/5 dark:border-white/10 z-50">
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

        {/* Page Content - key forces remount when path changes so view updates with URL */}
        <main className="p-4 lg:p-8" key={location.pathname}>
          <div className="max-w-[1600px] mx-auto">
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

      {/* AI Chat Widget */}
      <ChatWidget />
    </div>
  );
};

export default AppleLayout;
