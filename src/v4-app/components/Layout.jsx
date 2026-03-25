import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { V4_SESSION_FIRST_PATH_KEY } from '../lib/welcomeStorage';
import {
  Home, Users, Calendar, TrendingUp, Instagram, BarChart3,
  Palette, Bell, LogOut, Menu, ChevronRight, Sun, Moon,
  Briefcase, UserCheck, Clock, Search, Command, ChevronDown,
  UserCircle, Package, ListTodo, Activity, Headphones,
  BookOpen, Sparkles, CalendarDays, PieChart, Shield, Megaphone,
  Layout as LayoutIcon, MessageSquare, Users2, CalendarClock,
  BadgeCheck, Contact, ClipboardCheck, Settings,
} from 'lucide-react';

/* ── Navigation sections (mirrors V3 grouping) ────────────────────────── */
const NAV_SECTIONS = [
  {
    title: 'Dashboard',
    items: [
      { label: 'Dashboard', icon: Home, to: '/v4/dashboard' },
      { label: 'Tasks', icon: ListTodo, to: '/v4/tasks' },
      { label: 'Settings', icon: Settings, to: '/v4/settings' },
    ],
  },
  {
    title: 'SMM',
    items: [
      { label: 'Clients', icon: Users, to: '/v4/clients' },
      { label: 'Instagram Reports', icon: Instagram, to: '/v4/instagram-reports' },
      { label: 'Content Calendar', icon: Calendar, to: '/v4/content-calendar' },
      { label: 'Posting Packages', icon: Package, to: '/v4/posting-packages' },
      { label: 'Client Health', icon: Activity, to: '/v4/client-health' },
    ],
  },
  {
    title: 'Sales',
    items: [
      { label: 'CRM', icon: TrendingUp, to: '/v4/crm' },
      { label: 'Analytics', icon: BarChart3, to: '/v4/analytics' },
    ],
  },
  {
    title: 'Design Team',
    items: [
      { label: 'Design Projects', icon: Palette, to: '/v4/design-projects' },
    ],
  },
  {
    title: 'HR',
    items: [
      { label: 'Team', icon: UserCheck, to: '/v4/team' },
      { label: 'Workload', icon: Briefcase, to: '/v4/workload' },
      { label: 'Time Off', icon: Clock, to: '/v4/time-off' },
      { label: 'HR Calendar', icon: CalendarDays, to: '/v4/hr-calendar' },
      { label: 'HR Analytics', icon: PieChart, to: '/v4/hr-analytics' },
      { label: 'My Clients', icon: Users2, to: '/v4/my-clients' },
      { label: 'My Time Off', icon: CalendarClock, to: '/v4/my-time-off' },
      { label: 'Self Service', icon: BadgeCheck, to: '/v4/self-service' },
      { label: 'Team Directory', icon: Contact, to: '/v4/team-directory' },
      { label: 'Onboarding', icon: ClipboardCheck, to: '/v4/onboarding' },
    ],
  },
  {
    title: 'Workspace',
    items: [
      { label: 'Canvas', icon: LayoutIcon, to: '/v4/canvas' },
      { label: 'Resources', icon: BookOpen, to: '/v4/resources' },
      { label: 'Features', icon: Sparkles, to: '/v4/features' },
    ],
  },
  {
    title: 'Support',
    items: [
      { label: 'IT Support', icon: Headphones, to: '/v4/it-support' },
      { label: 'Feedback', icon: MessageSquare, to: '/v4/feedback' },
    ],
  },
  {
    title: 'Administration',
    items: [
      { label: 'Permissions', icon: Shield, to: '/v4/permissions' },
      { label: 'Announcements', icon: Megaphone, to: '/v4/announcements' },
    ],
  },
];

/* ── Vancouver time helpers (dark from 5 PM to 6 AM) ──────────────────── */
const getVancouverHour = () => {
  const vt = new Date().toLocaleString('en-US', { timeZone: 'America/Vancouver' });
  return new Date(vt).getHours();
};
const isAfter5PMVancouver = () => {
  const h = getVancouverHour();
  return h >= 17 || h < 6;
};
const msUntilNextSwitch = () => {
  const h = getVancouverHour();
  let hrs = 0;
  if (h < 6) hrs = 6 - h;
  else if (h < 17) hrs = 17 - h;
  else hrs = (24 - h) + 6;
  return hrs * 3600000;
};

export default function Layout() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  // First authenticated V4 pathname this session (welcome splash only if this was dashboard)
  useEffect(() => {
    try {
      if (!sessionStorage.getItem(V4_SESSION_FIRST_PATH_KEY)) {
        sessionStorage.setItem(V4_SESSION_FIRST_PATH_KEY, location.pathname);
      }
    } catch {
      /* ignore */
    }
  }, [location.pathname]);

  /* ── Dark mode with Vancouver time auto-switch ────────────────────── */
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('darkModeOverride');
    if (stored) {
      const { darkMode, expiresAt } = JSON.parse(stored);
      if (Date.now() < expiresAt) return darkMode;
      localStorage.removeItem('darkModeOverride');
    }
    return isAfter5PMVancouver();
  });

  const [overrideUntil, setOverrideUntil] = useState(() => {
    const stored = localStorage.getItem('darkModeOverride');
    if (stored) {
      const { expiresAt } = JSON.parse(stored);
      if (Date.now() < expiresAt) return expiresAt;
    }
    return null;
  });

  const toggleDark = () => {
    const next = !dark;
    const expiresAt = Date.now() + msUntilNextSwitch();
    setDark(next);
    setOverrideUntil(expiresAt);
    localStorage.setItem('darkModeOverride', JSON.stringify({ darkMode: next, expiresAt }));
  };

  // Auto-switch check every minute
  useEffect(() => {
    const check = () => {
      const now = Date.now();
      if (overrideUntil != null && now >= overrideUntil) {
        setOverrideUntil(null);
        setDark(isAfter5PMVancouver());
        localStorage.removeItem('darkModeOverride');
      } else if (overrideUntil == null) {
        setDark(isAfter5PMVancouver());
      }
    };
    const id = setInterval(check, 60000);
    return () => clearInterval(id);
  }, [overrideUntil]);

  // Sync <html> dark class + theme-color meta
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    const meta = document.querySelector('meta[name="theme-color"]:not([media])');
    if (meta) meta.setAttribute('content', dark ? '#161617' : '#f5f5f7');
  }, [dark]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/v4/login');
  };

  const handleNav = useCallback((path) => {
    setMobileOpen(false);
    setProfileMenuOpen(false);
    navigate(path);
  }, [navigate]);

  const displayName = profile?.full_name || user?.user_metadata?.full_name || 'User';
  const roleLabel = (profile?.role ?? 'team_member').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  return (
    <div className={`min-h-screen ${dark ? 'dark' : ''}`}>
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[#f5f5f7] dark:bg-[#161617]" />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-purple-50/20 dark:from-blue-950/10 dark:via-transparent dark:to-purple-950/5" />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <aside className={`
        fixed top-0 left-0 h-full z-40
        transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]
        ${collapsed ? 'w-[72px]' : 'w-[260px]'}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-full bg-[#ffffff] dark:bg-[#1c1c1e]/95 dark:backdrop-blur-2xl dark:backdrop-saturate-200 border-r border-gray-200 dark:border-white/5 flex flex-col">
          {/* Logo */}
          <div className={`h-[72px] flex items-center border-b border-black/5 dark:border-white/5 ${collapsed ? 'px-2 justify-center' : 'px-4 justify-between'}`}>
            {collapsed ? (
              <div className="flex flex-col items-center gap-2">
                <button onClick={() => handleNav('/v4/dashboard')} className="w-10 h-10 flex items-center justify-center">
                  <img
                    src="/Luxury-listings-logo-CLR.png"
                    alt="Luxury Listings"
                    className={`h-8 w-auto ${dark ? 'brightness-0 invert' : ''}`}
                  />
                </button>
                <button
                  onClick={() => setCollapsed(false)}
                  className="hidden lg:flex w-8 h-8 items-center justify-center rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
                  title="Expand sidebar"
                >
                  <ChevronRight className="w-4 h-4 text-[#86868b]" />
                </button>
              </div>
            ) : (
              <>
                <button onClick={() => handleNav('/v4/dashboard')} className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
                    <img
                      src="/Luxury-listings-logo-CLR.png"
                      alt="Luxury Listings"
                      className={`h-9 w-auto ${dark ? 'brightness-0 invert' : ''}`}
                    />
                  </div>
                  <div className="min-w-0">
                    <h1 className="font-semibold text-[15px] text-[#1d1d1f] dark:text-white tracking-[-0.01em] leading-tight">
                      Luxury Listings
                    </h1>
                    <p className="text-[11px] text-[#86868b] font-medium mt-0.5">Portal</p>
                  </div>
                </button>
                <button
                  onClick={() => setCollapsed(true)}
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
            {NAV_SECTIONS.map((section, i) => (
              <div key={i} className="mb-6">
                {!collapsed && (
                  <p className="px-3 mb-2 text-[11px] font-semibold text-[#86868b] uppercase tracking-wider">
                    {section.title}
                  </p>
                )}
                <div className="space-y-1">
                  {section.items.map(({ label, icon: Icon, to }) => (
                    <NavLink
                      key={to}
                      to={to}
                      title={collapsed ? label : undefined}
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) => `
                        w-full flex items-center gap-3 px-3 py-2 rounded-lg
                        transition-all duration-200 ease-out text-left
                        ${isActive
                          ? 'bg-[#0071e3] text-white shadow-sm shadow-[#0071e3]/30'
                          : 'text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-black/5 dark:hover:bg-white/5'
                        }
                      `}
                    >
                      <Icon className={`w-[18px] h-[18px] shrink-0 ${collapsed ? 'mx-auto' : ''}`} strokeWidth={1.5} />
                      {!collapsed && <span className="text-[13px] font-medium truncate">{label}</span>}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {/* Bottom */}
          <div className="px-3 py-4 border-t border-black/5 dark:border-white/5">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[#ff3b30] hover:bg-[#ff3b30]/10 transition-all duration-200"
            >
              <LogOut className={`w-[18px] h-[18px] ${collapsed ? 'mx-auto' : ''}`} strokeWidth={1.5} />
              {!collapsed && <span className="text-[13px] font-medium">Sign Out</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ───────────────────────────────────────────────── */}
      <div className={`min-h-screen transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] ${collapsed ? 'lg:ml-[72px]' : 'lg:ml-[260px]'} bg-[#f5f5f7] dark:bg-[#161617]`}>
        {/* Header */}
        <header className="sticky top-0 z-30 h-[60px] bg-[#ffffff] dark:bg-[#1c1c1e]/95 dark:backdrop-blur-2xl dark:backdrop-saturate-200 border-b border-gray-200 dark:border-white/5">
          <div className="h-full flex items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-4">
              {/* Mobile menu */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
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
              {/* Dark mode toggle */}
              <button
                onClick={toggleDark}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                {dark
                  ? <Sun className="w-[18px] h-[18px] text-[#f5f5f7]" strokeWidth={1.5} />
                  : <Moon className="w-[18px] h-[18px] text-[#1d1d1f]" strokeWidth={1.5} />
                }
              </button>

              {/* Notifications */}
              <NavLink
                to="/v4/notifications"
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <Bell className="w-[18px] h-[18px] text-[#86868b]" strokeWidth={1.5} />
              </NavLink>

              {/* Profile dropdown */}
              <div className="relative ml-2 pl-4 border-l border-black/5 dark:border-white/5">
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                >
                  <div className="text-right hidden sm:block">
                    <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                      {displayName}
                    </p>
                    <p className="text-[11px] text-[#86868b]">{roleLabel}</p>
                  </div>
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="w-9 h-9 rounded-full object-cover shadow-sm"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#0071e3] to-[#5856d6] flex items-center justify-center text-white text-[13px] font-semibold shadow-sm">
                      {displayName.charAt(0)}
                    </div>
                  )}
                  <ChevronDown className="w-4 h-4 text-[#86868b] hidden sm:block" />
                </button>

                {/* Dropdown */}
                {profileMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setProfileMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-56 py-2 bg-[#ffffff] dark:bg-[#2c2c2e] rounded-xl shadow-xl border border-gray-200 dark:border-white/10 z-50">
                      <div className="px-4 py-2 border-b border-black/5 dark:border-white/5">
                        <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">{displayName}</p>
                        <p className="text-[12px] text-[#86868b]">{roleLabel}</p>
                        <p className="text-[12px] text-[#86868b] truncate">{user?.email}</p>
                      </div>
                      <div className="py-1">
                        <button className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-[#1d1d1f] dark:text-white hover:bg-black/5 dark:hover:bg-white/5 text-left" onClick={() => handleNav('/v4/settings')}>
                          <UserCircle className="w-4 h-4" strokeWidth={1.5} />
                          My Profile
                        </button>
                        <button className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-[#1d1d1f] dark:text-white hover:bg-black/5 dark:hover:bg-white/5 text-left" onClick={() => handleNav('/v4/my-time-off')}>
                          <Clock className="w-4 h-4" strokeWidth={1.5} />
                          My Time Off
                        </button>
                        <button className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-[#1d1d1f] dark:text-white hover:bg-black/5 dark:hover:bg-white/5 text-left" onClick={() => handleNav('/v4/notifications')}>
                          <Bell className="w-4 h-4" strokeWidth={1.5} />
                          Notifications
                        </button>
                      </div>
                      <div className="py-1 border-t border-black/5 dark:border-white/5">
                        <button className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-red-600 dark:text-red-400 hover:bg-black/5 dark:hover:bg-white/5 text-left" onClick={() => { setProfileMenuOpen(false); handleSignOut(); }}>
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

        {/* Page content */}
        <main className="p-4 lg:p-8">
          <div className="max-w-[1600px] mx-auto">
            <Outlet />
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
}
