import React, { useState, useEffect, useCallback, useRef, Suspense, lazy } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useViewAs } from '../../contexts/ViewAsContext';
import { usePermissions } from '../../contexts/PermissionsContext';
import { useClients } from '../../contexts/ClientsContext';
import { supabaseService } from '../../services/supabaseService';
import { USER_ROLES } from '../../entities/UserRoles';
import NotificationsCenter from '../../components/NotificationsCenter';
import AnnouncementBanner from '../../components/AnnouncementBanner';
import FeedbackButton from '../../components/ui/FeedbackButton';
import CommandPalette from '../../components/CommandPalette';
import KeyboardShortcutsOverlay from '../../components/KeyboardShortcutsOverlay';
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
  FileText,
  Clock,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  MessageSquare,
  Target,
  TrendingUp,
  Briefcase,
  UserCircle,
  Eye,
  X,
  Instagram,
  BarChart3,
  Palette,
  Sparkles,
  Bug,
  Activity,
  ShieldCheck,
  Megaphone,
  MoreHorizontal,
  GripVertical,
  Keyboard,
  SlidersHorizontal,
} from 'lucide-react';

// Lazy-load ClientProfilesList — it pulls in ClientDetailModal (~250K)
const ClientProfilesList = lazy(() =>
  import(/* webpackChunkName: "client-profiles" */ '../../components/client/ClientProfilesList')
);

/**
 * V3 Layout — Apple Design System with Real Supabase Data
 * Full sidebar navigation with permission-based pages + Cmd+K palette + customizable More section
 */
const V3Layout = ({ basePath = '' }) => {
  const { currentUser, currentRole, logout } = useAuth();
  const { viewingAsUser, isViewingAs, stopViewingAs, viewAsPermissions } = useViewAs();
  const { permissions: userPermissions, isSystemAdmin } = usePermissions();
  const { clients } = useClients();
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [announcementHeight, setAnnouncementHeight] = useState(0);

  // Command palette + keyboard shortcuts
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Sidebar "More" section state
  const [moreExpanded, setMoreExpanded] = useState(false);
  const [sidebarEditMode, setSidebarEditMode] = useState(false);

  // Per-user hidden nav items stored in localStorage
  const hiddenStorageKey = currentUser?.email
    ? `sidebarHiddenItems_${currentUser.email}`
    : null;
  const [hiddenNavItems, setHiddenNavItems] = useState(() => {
    if (!hiddenStorageKey) return [];
    try {
      return JSON.parse(localStorage.getItem(hiddenStorageKey) || '[]');
    } catch {
      return [];
    }
  });

  // Persist hidden items whenever they change
  useEffect(() => {
    if (!hiddenStorageKey) return;
    localStorage.setItem(hiddenStorageKey, JSON.stringify(hiddenNavItems));
  }, [hiddenNavItems, hiddenStorageKey]);

  const toggleHiddenNavItem = (pageId) => {
    setHiddenNavItems(prev =>
      prev.includes(pageId) ? prev.filter(id => id !== pageId) : [...prev, pageId]
    );
  };

  // Monthly posts reset for admins
  const hasCheckedMonthlyReset = useRef(false);
  useEffect(() => {
    if (!isSystemAdmin || !currentUser?.email || hasCheckedMonthlyReset.current) return;
    hasCheckedMonthlyReset.current = true;
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    supabaseService.getLastPostsResetMonth().then((last) => {
      if (last && last >= currentYearMonth) return;
      supabaseService.runMonthlyPostsReset().then((r) => {
        if (r.didReset) console.log(`📅 Monthly posts renewed for ${r.yearMonth} (${r.clientCount} clients)`);
      });
    });
  }, [isSystemAdmin, currentUser?.email]);

  // Redirect to onboarding if not completed
  useEffect(() => {
    if (!currentUser?.email || !currentUser?.isApproved) return;
    if (location.pathname === `${basePath}/onboarding` || location.pathname === '/onboarding') return;
    if (currentUser?.onboardingCompleted === true) return;
    let cancelled = false;
    supabaseService.getApprovedUserByEmail(currentUser.email).then((approved) => {
      if (cancelled) return;
      if (approved?.onboardingCompleted === true) return;
      navigate(`${basePath}/onboarding`, { replace: true });
    });
    return () => { cancelled = true; };
  }, [currentUser?.email, currentUser?.isApproved, currentUser?.onboardingCompleted, location.pathname, navigate]);

  // Vancouver dark mode auto-schedule
  const getVancouverHour = () => {
    const t = new Date().toLocaleString('en-US', { timeZone: 'America/Vancouver' });
    return new Date(t).getHours();
  };
  const isAfter5PMVancouver = () => {
    const h = getVancouverHour();
    return h >= 17 || h < 6;
  };

  const [themeMode, setThemeMode] = useState(() => localStorage.getItem('themeMode') || 'auto');
  const [darkMode, setDarkMode] = useState(() => {
    const m = localStorage.getItem('themeMode') || 'auto';
    if (m === 'dark') return true;
    if (m === 'light') return false;
    return isAfter5PMVancouver();
  });
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const handleDarkModeToggle = () => {
    const next = themeMode === 'auto' ? 'dark' : themeMode === 'dark' ? 'light' : 'auto';
    localStorage.setItem('themeMode', next);
    setThemeMode(next);
    setDarkMode(next === 'auto' ? isAfter5PMVancouver() : next === 'dark');
  };

  useEffect(() => {
    const check = () => { if (themeMode === 'auto') setDarkMode(isAfter5PMVancouver()); };
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, [themeMode]);

  useEffect(() => {
    const color = darkMode ? '#0b0b0d' : '#f7f7f8';
    const fallback = document.getElementById('theme-color-meta');
    if (fallback) fallback.setAttribute('content', color);
    document.querySelectorAll('meta[name="theme-color"]').forEach(tag => {
      if (!tag.getAttribute('media')) tag.setAttribute('content', color);
    });
    darkMode
      ? document.documentElement.classList.add('dark')
      : document.documentElement.classList.remove('dark');
  }, [darkMode]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      // Cmd/Ctrl+K → command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
        return;
      }
      // Cmd+\ → toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        setSidebarCollapsed(prev => !prev);
        return;
      }
      // ? → keyboard shortcuts overlay (not when typing in an input)
      if (
        e.key === '?' &&
        !e.metaKey && !e.ctrlKey &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)
      ) {
        setShortcutsOpen(prev => !prev);
        return;
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const p = (path) => `${basePath}${path}`;

  // All available pages — client-health intentionally excluded from nav
  const allPages = {
    'dashboard': { name: 'Dashboard', icon: Home, path: p('/dashboard') },
    'time-off': { name: 'My Time Off', icon: Calendar, path: p('/my-time-off') },
    'my-clients': { name: 'My Clients', icon: Users, path: p('/my-clients') },
    'instagram-reports': { name: 'Instagram Analytics', icon: Instagram, path: p('/instagram-reports') },
    'tasks': { name: 'Tasks', icon: CheckSquare, path: p('/tasks') },
    'canvas': { name: 'Workspaces', icon: FileText, path: p('/workspaces') },
    'clients': { name: 'Clients List', icon: User, path: p('/clients') },
    'posting-packages': { name: 'Posting Packages', icon: Briefcase, path: p('/posting-packages') },
    'content-calendar': { name: 'Content Calendar', icon: Calendar, path: p('/content-calendar') },
    'crm': { name: 'CRM', icon: Target, path: p('/crm') },
    'hr-calendar': { name: 'HR Calendar', icon: Calendar, path: p('/hr-calendar') },
    'team': { name: 'Team Management', icon: Users, path: p('/team') },
    'hr-analytics': { name: 'HR Analytics', icon: TrendingUp, path: p('/hr-analytics') },
    // 'client-health' intentionally hidden from nav per product decision
    'system-admin': { name: 'System Admin', icon: ShieldCheck, path: p('/system-admin') },
    'permissions': { name: 'Users & Permissions', icon: Settings, path: p('/permissions') },
    'announcements': { name: 'Announcements', icon: Megaphone, path: p('/announcements') },
    'it-support': { name: 'IT Support', icon: Wrench, path: p('/it-support') },
    'resources': { name: 'Resources', icon: FileText, path: p('/resources') },
    'features': { name: 'Add-ons', icon: Sparkles, path: p('/features') },
    'workload': { name: 'Team Workload', icon: BarChart3, path: p('/workload') },
    'graphic-projects': { name: 'Team Projects', icon: Palette, path: p('/graphic-projects') },
  };

  const getNavSections = () => {
    let enabledModules = [];
    if (isViewingAs && viewAsPermissions.length > 0) {
      enabledModules = [...viewAsPermissions];
    } else if (isViewingAs) {
      enabledModules = [];
    } else if (isSystemAdmin) {
      enabledModules = Object.keys(modules).filter(id => id !== 'client-health');
    } else if (userPermissions.length > 0) {
      enabledModules = userPermissions.filter(id => id !== 'client-health');
    } else {
      enabledModules = [];
    }

    const sectionedModules = getNavItemsForModules(enabledModules);
    const sectionOrder = ['Main', 'SMM', 'Content Team', 'Design Team', 'Sales Team', 'HR', 'Admin', 'Resources'];
    const sections = [];

    sections.push({ title: 'Dashboard', items: ['dashboard'] });

    for (const sectionKey of sectionOrder) {
      if (sectionedModules[sectionKey]?.length > 0) {
        sections.push({
          title: sectionKey,
          items: sectionedModules[sectionKey]
            .map(item => item.id)
            .filter(id => id !== 'client-health'),
        });
      }
    }

    if (isSystemAdmin && !isViewingAs) {
      const smmSection = sections.find(s => s.title === 'SMM');
      if (smmSection && !smmSection.items.includes('clients')) {
        smmSection.items.unshift('clients');
      }
      const adminItems = ['system-admin', 'permissions', 'announcements'];
      const adminSection = sections.find(s => s.title === 'Admin');
      if (adminSection) {
        const rest = adminSection.items.filter(id => !adminItems.includes(id));
        adminSection.items = [...adminItems, ...rest];
      } else {
        sections.push({ title: 'Admin', items: [...adminItems] });
      }
    }

    return sections;
  };

  const navSections = getNavSections();

  // Flatten all nav items to know the full set available
  const allNavPageIds = navSections.flatMap(s => s.items).filter(id => allPages[id]);

  // Split into visible vs. hidden-in-More (dashboard always visible)
  const visiblePageIds = allNavPageIds.filter(
    id => id === 'dashboard' || !hiddenNavItems.includes(id)
  );
  const morePageIds = allNavPageIds.filter(
    id => id !== 'dashboard' && hiddenNavItems.includes(id)
  );

  // Rebuild sections with only visible items
  const visibleSections = navSections
    .map(s => ({ ...s, items: s.items.filter(id => visiblePageIds.includes(id)) }))
    .filter(s => s.items.length > 0);

  const handleLogout = async () => {
    await logout();
    navigate(`${basePath}/login`);
  };

  const isActive = (path) =>
    location.pathname === path ||
    (path === `${basePath}/dashboard` &&
      (location.pathname === '/' || location.pathname === `${basePath}/`));

  const handleNavigation = useCallback((path) => {
    setSidebarOpen(false);
    navigate(path);
  }, [navigate]);

  const isMichelle =
    currentUser?.email?.toLowerCase() === 'michelle@luxury-listings.com' ||
    (isViewingAs && viewingAsUser?.email?.toLowerCase() === 'michelle@luxury-listings.com');
  const isFeaturesPage = location.pathname === p('/features');
  // Full-height, no-padding, no-footer pages that manage their own internal layout.
  const isFullHeightPage = location.pathname === '/workspaces' || location.pathname === '/analytics-template-builder';

  // ── Nav item renderer (shared for main list + More section + edit mode)
  const NavItem = ({ pageId, isInMore = false }) => {
    const page = allPages[pageId];
    if (!page) return null;
    const Icon = page.icon;
    const active = isActive(page.path);

    return (
      <div className="relative group/navitem">
        <button
          type="button"
          title={sidebarCollapsed ? page.name : undefined}
          onClick={() => handleNavigation(page.path)}
          className={`
            w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg
            transition-all duration-200 ease-out text-left
            ${active
              ? 'bg-brand-soft text-brand font-medium'
              : 'text-ink-muted hover:bg-surface-3 hover:text-ink'
            }
          `}
        >
          <Icon
            className={`w-4 h-4 shrink-0 ${sidebarCollapsed ? 'mx-auto' : ''}`}
            strokeWidth={1.5}
          />
          {!sidebarCollapsed && (
            <span className="text-[13px] font-medium truncate">{page.name}</span>
          )}
        </button>

        {/* Hover "hide/show" toggle — only shown in edit mode */}
        {sidebarEditMode && !sidebarCollapsed && pageId !== 'dashboard' && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); toggleHiddenNavItem(pageId); }}
            className={`absolute right-1 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded text-[10px] font-medium transition-all opacity-0 group-hover/navitem:opacity-100 ${
              hiddenNavItems.includes(pageId)
                ? 'bg-brand/10 text-brand'
                : 'bg-black/10 dark:bg-white/10 text-ink-muted'
            }`}
          >
            {hiddenNavItems.includes(pageId) ? 'Show' : 'Hide'}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''} ${isMichelle ? 'michelle-theme' : ''}`}>
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-surface-2 dark:bg-canvas" />
        <div className="absolute inset-0 bg-gradient-to-br from-brand-soft/30 via-transparent to-brand-soft/20 dark:from-blue-950/10 dark:via-transparent dark:to-purple-950/5" />
      </div>

      {isFeaturesPage && (
        <div className="fixed inset-0 z-0 min-h-[100vh] w-full" aria-hidden style={{ minWidth: '100vw' }}>
          <div className="absolute inset-0 bg-surface-2 dark:bg-ink" />
          <div className="absolute inset-0 bg-gradient-to-br from-brand-soft/80 via-transparent to-brand-soft/50 dark:from-blue-950/30 dark:via-transparent dark:to-purple-950/20" />
          <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] rounded-full bg-gradient-to-br from-brand/10 to-brand/10 blur-3xl" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-brand/10 to-[#ff2d55]/10 blur-3xl" />
        </div>
      )}

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className={`
        fixed top-0 left-0 h-full z-40
        transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]
        ${sidebarCollapsed ? 'w-[72px]' : 'w-[260px]'}
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-full bg-surface dark:backdrop-blur-2xl dark:backdrop-saturate-200 border-r border-gray-200 dark:border-white/5 flex flex-col">

          {/* Logo */}
          <div className={`h-[72px] flex items-center border-b border-black/5 dark:border-white/5 ${sidebarCollapsed ? 'px-2 justify-center' : 'px-4 justify-between'}`}>
            {sidebarCollapsed ? (
              <div className="flex flex-col items-center gap-2">
                <Link to={p('/dashboard')} className="w-10 h-10 flex items-center justify-center">
                  <img
                    src="/Luxury-listings-logo-CLR.png"
                    alt="Luxury Listings"
                    className={`h-8 w-auto ${darkMode ? 'brightness-0 invert' : ''}`}
                  />
                </Link>
                <button
                  onClick={() => setSidebarCollapsed(false)}
                  className="hidden lg:flex w-8 h-8 items-center justify-center rounded-lg bg-surface-3 hover:bg-hairline-strong transition-colors"
                  title="Expand sidebar"
                >
                  <ChevronRight className="w-4 h-4 text-ink-muted" />
                </button>
              </div>
            ) : (
              <>
                <Link to={p('/dashboard')} className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
                    <img
                      src="/Luxury-listings-logo-CLR.png"
                      alt="Luxury Listings"
                      className={`h-9 w-auto ${darkMode ? 'brightness-0 invert' : ''}`}
                    />
                  </div>
                  <div className="animate-in fade-in slide-in-from-left-2 duration-200 min-w-0">
                    <h1 className="font-semibold text-[15px] text-ink tracking-[-0.01em] leading-tight">
                      Luxury Listings
                    </h1>
                    <p className="text-[11px] text-ink-muted font-medium mt-0.5">Portal</p>
                  </div>
                </Link>
                <button
                  onClick={() => setSidebarCollapsed(true)}
                  className="hidden lg:flex w-7 h-7 items-center justify-center rounded-md hover:bg-surface-3 flex-shrink-0"
                  title="Collapse sidebar (⌘\)"
                >
                  <ChevronRight className="w-4 h-4 text-ink-muted rotate-180" />
                </button>
              </>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 overflow-y-auto">
            {/* Edit mode header */}
            {sidebarEditMode && !sidebarCollapsed && (
              <div className="mb-3 px-3 py-2 bg-brand/8 rounded-xl">
                <p className="text-[11px] font-medium text-brand">
                  Customizing sidebar — hover any item to show/hide it
                </p>
              </div>
            )}

            {visibleSections.map((section, sIdx) => {
              // A section header only earns its vertical space once it groups
              // something. Single-item sections ("DASHBOARD" > Dashboard) just
              // restate the item, so render the item on its own.
              const showTitle = !sidebarCollapsed && section.items.length > 1;
              // Separation belongs to the header, not the section. Otherwise a
              // titled section's bottom margin opens a gap above the untitled
              // one that follows it, which reads as a missing header.
              const spacing = sIdx === 0 ? '' : showTitle ? 'mt-5' : 'mt-1';
              return (
                <div key={sIdx} className={spacing}>
                  {showTitle && (
                    <p className="px-3 mb-1.5 text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
                      {section.title}
                    </p>
                  )}
                  <div className="space-y-1">
                    {section.items.map(pageId => (
                      <NavItem key={pageId} pageId={pageId} />
                    ))}
                  </div>
                </div>
              );
            })}

            {/* ── More section ─── */}
            {morePageIds.length > 0 && (
              <div className="mb-4">
                {!sidebarCollapsed && (
                  <p className="px-3 mb-2 text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
                    More
                  </p>
                )}
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setMoreExpanded(prev => !prev)}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-ink hover:bg-surface-3 transition-all duration-200"
                    title={sidebarCollapsed ? 'More' : undefined}
                  >
                    <MoreHorizontal
                      className={`w-4 h-4 shrink-0 ${sidebarCollapsed ? 'mx-auto' : ''}`}
                      strokeWidth={1.5}
                    />
                    {!sidebarCollapsed && (
                      <>
                        <span className="text-[13px] font-medium flex-1 text-left">More</span>
                        <span className="text-[11px] text-ink-muted mr-1">{morePageIds.length}</span>
                        {moreExpanded
                          ? <ChevronUp className="w-3.5 h-3.5 text-ink-muted" />
                          : <ChevronDown className="w-3.5 h-3.5 text-ink-muted" />
                        }
                      </>
                    )}
                  </button>
                  {moreExpanded && (
                    <div className="space-y-1 pl-1 border-l-2 border-hairline ml-3">
                      {morePageIds.filter(id => allPages[id]).map(pageId => (
                        <NavItem key={pageId} pageId={pageId} isInMore />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </nav>

          {/* ── Bottom bar ─────────────────────────────────────────────────── */}
          <div className="px-3 py-3 border-t border-black/5 dark:border-white/5 space-y-1">
            {/* Customize sidebar button */}
            {!sidebarCollapsed && (
              <button
                type="button"
                onClick={() => setSidebarEditMode(prev => !prev)}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all duration-200 text-[13px] font-medium ${
                  sidebarEditMode
                    ? 'bg-brand/10 text-brand'
                    : 'text-ink-muted hover:bg-surface-3 hover:text-ink dark:hover:text-white'
                }`}
                title="Customize which pages appear in the sidebar"
              >
                <SlidersHorizontal className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                <span>{sidebarEditMode ? 'Done customizing' : 'Customize sidebar'}</span>
              </button>
            )}

            {/* Keyboard shortcuts hint */}
            {!sidebarCollapsed && (
              <button
                type="button"
                onClick={() => setShortcutsOpen(true)}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-ink-muted hover:bg-surface-3 hover:text-ink dark:hover:text-white transition-all duration-200 text-[13px] font-medium"
              >
                <Keyboard className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                <span>Shortcuts</span>
                <kbd className="ml-auto text-[10px] px-1 py-0.5 bg-surface-3 rounded font-mono">?</kbd>
              </button>
            )}

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-danger hover:bg-danger/10 transition-all duration-200"
            >
              <svg
                className={`w-4 h-4 ${sidebarCollapsed ? 'mx-auto' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
              {!sidebarCollapsed && <span className="text-[13px] font-medium">Sign Out</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      <div className={`${isFullHeightPage ? 'h-screen overflow-hidden flex flex-col' : 'min-h-screen'} transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] ${sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-[260px]'} relative ${isFeaturesPage ? 'bg-transparent' : 'bg-surface-2 dark:bg-canvas'}`}>

        {/* View As Banner */}
        {isViewingAs && viewingAsUser && (
          <div className="sticky top-0 z-40 bg-gradient-to-r from-brand to-brand text-white px-4 py-2.5 shadow-lg">
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
                    {viewingAsUser.role || viewingAsUser.primaryRole || 'User'} · {viewingAsUser.email} · {viewAsPermissions.length} pages accessible
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] opacity-70 hidden sm:block">
                  Data shown is from this user's perspective
                </span>
                <button
                  onClick={stopViewingAs}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-white text-brand hover:bg-white/90 transition-colors text-[13px] font-semibold shadow-sm"
                >
                  <X className="w-4 h-4" />
                  Exit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Announcement Banner */}
        <AnnouncementBanner onHeightChange={setAnnouncementHeight} />

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header
          className="sticky z-30 h-[60px] bg-surface dark:backdrop-blur-2xl dark:backdrop-saturate-200 border-b border-gray-200 dark:border-white/5"
          style={{ top: (isViewingAs ? 44 : 0) + announcementHeight }}
        >
          <div className="h-full flex items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-4">
              {/* Mobile menu */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-3 transition-colors"
              >
                <Menu className="w-[18px] h-[18px] text-ink" strokeWidth={1.5} />
              </button>

              {/* Search → opens command palette */}
              <button
                type="button"
                onClick={() => setCommandPaletteOpen(true)}
                className="hidden md:flex items-center gap-2 h-9 w-64 px-3 rounded-lg bg-surface-3 text-[13px] text-ink-muted hover:bg-black/8 dark:hover:bg-white/8 transition-colors text-left"
              >
                <Search className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
                <span className="flex-1">Search</span>
                <div className="flex items-center gap-0.5 text-ink-muted">
                  <Command className="w-3 h-3" strokeWidth={1.5} />
                  <span className="text-[11px] font-medium">K</span>
                </div>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Dark mode toggle */}
              <button
                onClick={handleDarkModeToggle}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-3 transition-colors"
                title={`Theme: ${themeMode === 'auto' ? 'Auto' : themeMode === 'dark' ? 'Dark' : 'Light'}`}
              >
                {themeMode === 'auto' ? (
                  <Command className="w-[18px] h-[18px] text-ink-muted" strokeWidth={1.5} />
                ) : darkMode ? (
                  <Sun className="w-[18px] h-[18px] text-ink" strokeWidth={1.5} />
                ) : (
                  <Moon className="w-[18px] h-[18px] text-ink" strokeWidth={1.5} />
                )}
              </button>

              {/* Notifications */}
              <NotificationsCenter />

              {/* Profile dropdown */}
              <div className="relative ml-2 pl-4 border-l border-black/5 dark:border-white/5">
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                >
                  <div className="text-right hidden sm:block">
                    <p className="text-[13px] font-medium text-ink">
                      {currentUser?.displayName || 'User'}
                    </p>
                    <p className="text-[11px] text-ink-muted">
                      {currentUser?.position ||
                        (currentRole
                          ? String(currentRole).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                          : 'Member')}
                    </p>
                  </div>
                  {currentUser?.avatar || currentUser?.photoURL ? (
                    <img
                      src={currentUser.avatar || currentUser.photoURL}
                      alt={currentUser.displayName || 'User'}
                      className="w-9 h-9 rounded-full object-cover shadow-sm"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand to-brand flex items-center justify-center text-white text-[13px] font-semibold shadow-sm">
                      {currentUser?.displayName?.charAt(0) || 'U'}
                    </div>
                  )}
                  <ChevronDown className="w-4 h-4 text-ink-muted hidden sm:block" />
                </button>

                {profileMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setProfileMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-56 py-2 bg-surface rounded-xl shadow-lg border border-gray-200 dark:border-white/10 z-50">
                      <div className="px-4 py-2 border-b border-black/5 dark:border-white/5">
                        <p className="text-[13px] font-medium text-ink">{currentUser?.displayName}</p>
                        <p className="text-[12px] text-ink-muted">
                          {currentUser?.position ||
                            (currentRole
                              ? String(currentRole).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                              : 'Member')}
                        </p>
                        <p className="text-[12px] text-ink-muted truncate">{currentUser?.email}</p>
                      </div>
                      <div className="py-1">
                        <button type="button" className="w-full flex items-center gap-3 px-3.5 py-2 text-[13px] text-ink hover:bg-surface-3 text-left" onClick={() => { setProfileMenuOpen(false); handleNavigation(p('/self-service')); }}>
                          <UserCircle className="w-4 h-4" strokeWidth={1.5} />
                          My Profile
                        </button>
                        <button type="button" className="w-full flex items-center gap-3 px-3.5 py-2 text-[13px] text-ink hover:bg-surface-3 text-left" onClick={() => { setProfileMenuOpen(false); handleNavigation(p('/my-time-off')); }}>
                          <Clock className="w-4 h-4" strokeWidth={1.5} />
                          My Time Off
                        </button>
                        <button type="button" className="w-full flex items-center gap-3 px-3.5 py-2 text-[13px] text-ink hover:bg-surface-3 text-left" onClick={() => { setProfileMenuOpen(false); handleNavigation(p('/resources')); }}>
                          <FileText className="w-4 h-4" strokeWidth={1.5} />
                          Resources
                        </button>
                      </div>
                      <div className="py-1 border-t border-black/5 dark:border-white/5">
                        <button type="button" className="w-full flex items-center gap-3 px-3.5 py-2 text-[13px] text-danger dark:text-red-400 hover:bg-surface-3 text-left" onClick={() => { setProfileMenuOpen(false); logout(); }}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                          </svg>
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
        {isFullHeightPage ? (
          <main className="flex-1 flex flex-col min-h-0">
            <Outlet />
          </main>
        ) : (
          <main className="p-4 lg:p-8">
            <div className="max-w-[1600px] mx-auto">
              <div className="v3-content-wrapper">
                <Outlet />
              </div>
            </div>
          </main>
        )}

        {!isFullHeightPage && (
          <footer className="py-6 px-8 text-center border-t border-black/5 dark:border-white/5">
            <p className="text-[12px] text-ink-muted">© 2026 Luxury Listings. All rights reserved.</p>
          </footer>
        )}
      </div>

      {/* Global add-client modal (when not on Clients page) */}
      {location.pathname !== '/clients' && (
        <Suspense fallback={null}>
          <ClientProfilesList modalOnly />
        </Suspense>
      )}

      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        allPages={allPages}
        clients={clients || []}
        basePath={basePath}
      />

      {/* Keyboard Shortcuts Overlay */}
      <KeyboardShortcutsOverlay
        isOpen={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />


      {/* Feedback & Support */}
      <FeedbackButton />
    </div>
  );
};

export default V3Layout;
