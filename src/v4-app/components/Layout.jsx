import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, Users, Calendar, TrendingUp, Instagram, BarChart3,
  Palette, Bell, Settings, LogOut, Menu, X, ChevronLeft, Sun, Moon,
  Briefcase, UserCheck, Clock,
} from 'lucide-react';

const NAV = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/v4/dashboard' },
  { label: 'Clients', icon: Users, to: '/v4/clients' },
  { label: 'Content Calendar', icon: Calendar, to: '/v4/content-calendar' },
  { label: 'Instagram Reports', icon: Instagram, to: '/v4/instagram-reports' },
  { label: 'CRM', icon: TrendingUp, to: '/v4/crm' },
  { label: 'Analytics', icon: BarChart3, to: '/v4/analytics' },
  { label: 'Design Projects', icon: Palette, to: '/v4/design-projects' },
  { label: 'Team', icon: UserCheck, to: '/v4/team' },
  { label: 'Workload', icon: Briefcase, to: '/v4/workload' },
  { label: 'Time Off', icon: Clock, to: '/v4/time-off' },
];

export default function Layout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('v4DarkMode', next);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/v4/login');
  };

  const sidebar = (
    <aside className={`flex flex-col h-full bg-white dark:bg-[#1c1c1e] border-r border-gray-200 dark:border-white/5 transition-all duration-300 ${collapsed ? 'w-[72px]' : 'w-[240px]'}`}>
      {/* Logo */}
      <div className={`h-[64px] flex items-center border-b border-gray-100 dark:border-white/5 px-4 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && (
          <span className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white truncate">
            Luxury Listings
          </span>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="hidden lg:flex w-8 h-8 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
        >
          <ChevronLeft className={`w-4 h-4 text-[#86868b] transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {NAV.map(({ label, icon: Icon, to }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-[#0071e3] text-white shadow-sm shadow-[#0071e3]/30'
                  : 'text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-gray-100 dark:hover:bg-white/5'
              }`
            }
          >
            <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${collapsed ? 'mx-auto' : ''}`} strokeWidth={1.5} />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-2 py-4 border-t border-gray-100 dark:border-white/5 space-y-1">
        <button
          onClick={toggleDark}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          title={collapsed ? 'Toggle theme' : undefined}
        >
          {dark ? <Sun className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.5} /> : <Moon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.5} />}
          {!collapsed && (dark ? 'Light Mode' : 'Dark Mode')}
        </button>
        <NavLink
          to="/v4/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors ${isActive ? 'bg-gray-100 dark:bg-white/10' : 'text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-gray-100 dark:hover:bg-white/5'}`
          }
          title={collapsed ? 'Settings' : undefined}
        >
          <Settings className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.5} />
          {!collapsed && 'Settings'}
        </NavLink>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
          title={collapsed ? 'Sign out' : undefined}
        >
          <LogOut className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.5} />
          {!collapsed && 'Sign Out'}
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f5f7] dark:bg-[#111112]">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-shrink-0">{sidebar}</div>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <>
          <div className="lg:hidden fixed inset-0 bg-black/30 z-40" onClick={() => setMobileOpen(false)} />
          <div className="lg:hidden fixed left-0 top-0 h-full z-50 w-[240px]">{sidebar}</div>
        </>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-[60px] bg-white dark:bg-[#1c1c1e] border-b border-gray-200 dark:border-white/5 flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
            <Menu className="w-5 h-5 text-[#1d1d1f]" />
          </button>

          <div className="flex items-center gap-2 ml-auto">
            <NavLink
              to="/v4/notifications"
              className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              <Bell className="w-[18px] h-[18px] text-[#86868b]" strokeWidth={1.5} />
            </NavLink>

            <NavLink
              to="/v4/settings/profile"
              className="flex items-center gap-2 pl-2 pr-3 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-[#0071e3] flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
                {(profile?.full_name || 'U')[0].toUpperCase()}
              </div>
              <span className="text-[13px] font-medium text-[#1d1d1f] dark:text-white hidden sm:inline">
                {profile?.full_name || 'Account'}
              </span>
            </NavLink>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
