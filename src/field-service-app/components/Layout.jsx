import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  Calendar,
  Users,
  FileStack,
  Receipt,
  Wrench,
  DollarSign,
  Megaphone,
  Clock,
  LayoutGrid,
  Gift,
  Settings,
  LogOut,
  Menu,
  Search,
  Moon,
  Sun,
  ChevronDown,
  ChevronRight,
  Plus,
  HelpCircle,
} from 'lucide-react';

const BASE = '/field-service';

const navItems = [
  { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, path: `${BASE}/dashboard` },
  { id: 'schedule', name: 'Schedule', icon: Calendar, path: `${BASE}/schedule` },
  { id: 'clients', name: 'Clients', icon: Users, path: `${BASE}/clients` },
  { id: 'requests', name: 'Requests', icon: FileStack, path: `${BASE}/requests` },
  { id: 'quotes', name: 'Quotes', icon: Receipt, path: `${BASE}/quotes` },
  { id: 'jobs', name: 'Jobs', icon: Wrench, path: `${BASE}/jobs` },
  { id: 'invoices', name: 'Invoices', icon: DollarSign, path: `${BASE}/invoices` },
  { id: 'marketing', name: 'Marketing', icon: Megaphone, path: `${BASE}/marketing`, hasDropdown: true },
  { id: 'timesheets', name: 'Timesheets', icon: Clock, path: `${BASE}/timesheets` },
  { id: 'apps', name: 'Apps', icon: LayoutGrid, path: `${BASE}/apps` },
  { id: 'refer', name: 'Refer and Earn', icon: Gift, path: `${BASE}/refer` },
];

const FieldServiceLayout = () => {
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('fsDarkMode');
    return stored ? JSON.parse(stored) : false;
  });
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('fsDarkMode', JSON.stringify(darkMode));
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const handleNavigation = useCallback((path) => {
    setSidebarOpen(false);
    navigate(path);
  }, [navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path || (path === `${BASE}/dashboard` && location.pathname === BASE);

  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[#f5f5f7] dark:bg-[#161617]" />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-purple-50/20 dark:from-blue-950/10 dark:via-transparent dark:to-purple-950/5" />
      </div>

      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-30" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`
        fixed top-0 left-0 h-full z-40 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]
        ${sidebarCollapsed ? 'w-[72px]' : 'w-[260px]'}
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-full bg-[#ffffff] dark:bg-[#1c1c1e]/95 dark:backdrop-blur-2xl border-r border-gray-200 dark:border-white/5 flex flex-col">
          <div className={`h-[72px] flex items-center border-b border-black/5 dark:border-white/5 ${sidebarCollapsed ? 'px-2 justify-center' : 'px-4 justify-between'}`}>
            {sidebarCollapsed ? (
              <div className="flex flex-col items-center gap-2">
                <Link to={`${BASE}/dashboard`} className="w-10 h-10 flex items-center justify-center">
                  <img src="/Luxury-listings-logo-CLR.png" alt="Field Service" className={`h-8 w-auto ${darkMode ? 'brightness-0 invert' : ''}`} />
                </Link>
                <button onClick={() => setSidebarCollapsed(false)} className="hidden lg:flex w-8 h-8 items-center justify-center rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10" title="Expand sidebar">
                  <ChevronRight className="w-4 h-4 text-[#86868b]" />
                </button>
              </div>
            ) : (
              <>
                <Link to={`${BASE}/dashboard`} className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
                    <img src="/Luxury-listings-logo-CLR.png" alt="Field Service" className={`h-9 w-auto ${darkMode ? 'brightness-0 invert' : ''}`} />
                  </div>
                  <div className="min-w-0">
                    <h1 className="font-semibold text-[15px] text-[#1d1d1f] dark:text-white tracking-[-0.01em] truncate">Field Service</h1>
                    <p className="text-[11px] text-[#86868b] font-medium">Jobber replacement</p>
                  </div>
                </Link>
                <button onClick={() => setSidebarCollapsed(true)} className="hidden lg:flex w-7 h-7 items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10 flex-shrink-0" title="Collapse sidebar">
                  <ChevronRight className="w-4 h-4 text-[#86868b] rotate-180" />
                </button>
              </>
            )}
          </div>

          {!sidebarCollapsed && (
            <div className="px-3 pt-4 pb-2">
              <button
                onClick={() => handleNavigation(`${BASE}/clients`)}
                className="w-full flex items-center justify-center gap-2 h-9 rounded-lg bg-[#34c759] hover:bg-[#30b350] text-white text-[13px] font-semibold transition-colors"
              >
                <Plus className="w-4 h-4" strokeWidth={2.5} />
                Create
              </button>
            </div>
          )}
          {sidebarCollapsed && (
            <div className="px-2 pt-4 pb-2 flex justify-center">
              <button onClick={() => handleNavigation(`${BASE}/clients`)} className="w-9 h-9 rounded-lg bg-[#34c759] hover:bg-[#30b350] text-white flex items-center justify-center" title="Create">
                <Plus className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </div>
          )}

          <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <button
                  key={item.id}
                  type="button"
                  title={sidebarCollapsed ? item.name : undefined}
                  onClick={() => !item.hasDropdown && handleNavigation(item.path)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ease-out text-left
                    ${active ? 'bg-[#0071e3] text-white shadow-sm shadow-[#0071e3]/30' : 'text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-black/5 dark:hover:bg-white/5'}
                  `}
                >
                  <Icon className={`w-[18px] h-[18px] shrink-0 ${sidebarCollapsed ? 'mx-auto' : ''}`} strokeWidth={1.5} />
                  {!sidebarCollapsed && (
                    <>
                      <span className="text-[13px] font-medium truncate flex-1">{item.name}</span>
                      {item.hasDropdown && <ChevronDown className="w-4 h-4 text-[#86868b] shrink-0" />}
                    </>
                  )}
                </button>
              );
            })}
          </nav>

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

      <div className={`min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-[260px]'}`}>
        <header className="sticky top-0 z-30 h-[60px] bg-[#ffffff] dark:bg-[#1c1c1e]/95 dark:backdrop-blur-2xl border-b border-gray-200 dark:border-white/5">
          <div className="h-full flex items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5">
                <Menu className="w-[18px] h-[18px] text-[#1d1d1f] dark:text-[#f5f5f7]" strokeWidth={1.5} />
              </button>
              <p className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white truncate">
                {currentUser?.displayName || 'Company'} Inc.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button className="hidden md:flex items-center gap-2 px-3 h-9 rounded-lg bg-black/5 dark:bg-white/5 text-[13px] text-[#86868b]">
                <Search className="w-4 h-4" /> Search <span className="text-[11px] opacity-70">/</span>
              </button>
              <button onClick={() => setDarkMode((d) => !d)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5" title="Theme">
                {darkMode ? <Sun className="w-[18px] h-[18px] text-[#f5f5f7]" /> : <Moon className="w-[18px] h-[18px] text-[#1d1d1f]" />}
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5" title="Help">
                <HelpCircle className="w-[18px] h-[18px] text-[#86868b]" strokeWidth={1.5} />
              </button>
              <button onClick={() => handleNavigation(`${BASE}/settings`)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5" title="Settings">
                <Settings className="w-[18px] h-[18px] text-[#86868b]" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-8">
          <div className="max-w-[1600px] mx-auto">
            <Outlet />
          </div>
        </main>

        <footer className="py-6 px-8 text-center border-t border-black/5 dark:border-white/5">
          <p className="text-[12px] text-[#86868b]">Field Service · Replaces GetJobber</p>
        </footer>
      </div>
    </div>
  );
};

export default FieldServiceLayout;
