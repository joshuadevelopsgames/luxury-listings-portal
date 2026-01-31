import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Home, 
  CheckSquare, 
  Users, 
  Calendar, 
  BarChart3, 
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Bell,
  Search,
  Moon,
  Sun,
  Command
} from 'lucide-react';

/**
 * Demo Layout - Apple-style layout with sidebar and header
 * Refined for maximum Apple aesthetic
 */
const DemoLayout = ({ children }) => {
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const navItems = [
    { path: '/v2/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/v2/tasks', icon: CheckSquare, label: 'Tasks', badge: '3' },
    { path: '/v2/clients', icon: Users, label: 'Clients' },
    { path: '/v2/calendar', icon: Calendar, label: 'Calendar' },
    { path: '/v2/analytics', icon: BarChart3, label: 'Analytics' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/v2/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      {/* Background - Apple style subtle gradient */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[#f5f5f7] dark:bg-[#1d1d1f]" />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-purple-50/30 dark:from-blue-950/20 dark:via-transparent dark:to-purple-950/10" />
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full z-40
        transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]
        ${sidebarOpen ? 'w-[260px]' : 'w-[72px]'}
      `}>
        <div className="h-full bg-white/80 dark:bg-[#2d2d2d]/80 backdrop-blur-2xl backdrop-saturate-200 border-r border-black/5 dark:border-white/5 flex flex-col">
          {/* Logo */}
          <div className="h-[60px] px-5 flex items-center border-b border-black/5 dark:border-white/5">
            <div className="flex items-center gap-3">
              <img 
                src="/Luxury-listings-logo-CLR.png" 
                alt="Luxury Listings" 
                className="h-8 w-auto"
              />
              {sidebarOpen && (
                <div className="animate-in fade-in slide-in-from-left-2 duration-200">
                  <h1 className="font-semibold text-[15px] text-[#1d1d1f] dark:text-white tracking-[-0.01em]">
                    Luxury Listings
                  </h1>
                  <p className="text-[11px] text-[#86868b] font-medium">v2 Preview</p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4">
            {sidebarOpen && (
              <p className="px-3 mb-2 text-[11px] font-semibold text-[#86868b] uppercase tracking-wider">
                Menu
              </p>
            )}
            <div className="space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-lg
                    transition-all duration-200 ease-out
                    ${isActive(item.path)
                      ? 'bg-[#0071e3] text-white shadow-sm'
                      : 'text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-black/5 dark:hover:bg-white/5'
                    }
                  `}
                >
                  <item.icon className={`w-[18px] h-[18px] ${sidebarOpen ? '' : 'mx-auto'}`} strokeWidth={1.5} />
                  {sidebarOpen && (
                    <>
                      <span className="flex-1 text-[13px] font-medium">{item.label}</span>
                      {item.badge && (
                        <span className={`
                          min-w-[18px] h-[18px] px-1.5 rounded-full text-[11px] font-semibold
                          flex items-center justify-center
                          ${isActive(item.path) 
                            ? 'bg-white/20 text-white' 
                            : 'bg-[#ff3b30] text-white'
                          }
                        `}>
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              ))}
            </div>
          </nav>

          {/* Bottom Section */}
          <div className="px-3 py-4 border-t border-black/5 dark:border-white/5">
            <Link
              to="/v2/settings"
              className={`
                flex items-center gap-3 px-3 py-2 rounded-lg
                text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-black/5 dark:hover:bg-white/5
                transition-all duration-200
              `}
            >
              <Settings className={`w-[18px] h-[18px] ${sidebarOpen ? '' : 'mx-auto'}`} strokeWidth={1.5} />
              {sidebarOpen && <span className="text-[13px] font-medium">Settings</span>}
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[#ff3b30] hover:bg-[#ff3b30]/10 transition-all duration-200 mt-1"
            >
              <LogOut className={`w-[18px] h-[18px] ${sidebarOpen ? '' : 'mx-auto'}`} strokeWidth={1.5} />
              {sidebarOpen && <span className="text-[13px] font-medium">Sign Out</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] ${sidebarOpen ? 'ml-[260px]' : 'ml-[72px]'}`}>
        {/* Header - Apple style */}
        <header className="sticky top-0 z-30 h-[60px] bg-white/80 dark:bg-[#2d2d2d]/80 backdrop-blur-2xl backdrop-saturate-200 border-b border-black/5 dark:border-white/5">
          <div className="h-full flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <Menu className="w-[18px] h-[18px] text-[#1d1d1f] dark:text-[#f5f5f7]" strokeWidth={1.5} />
              </button>
              
              {/* Search - Apple style */}
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
              <button className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                <Bell className="w-[18px] h-[18px] text-[#1d1d1f] dark:text-[#f5f5f7]" strokeWidth={1.5} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#ff3b30] rounded-full" />
              </button>

              {/* Profile */}
              <div className="flex items-center gap-3 ml-2 pl-4 border-l border-black/5 dark:border-white/5">
                <div className="text-right hidden sm:block">
                  <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                    {currentUser?.displayName || 'User'}
                  </p>
                  <p className="text-[11px] text-[#86868b]">Administrator</p>
                </div>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#0071e3] to-[#5856d6] flex items-center justify-center text-white text-[13px] font-semibold shadow-sm">
                  {currentUser?.displayName?.charAt(0) || 'U'}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-8 max-w-[1400px] mx-auto">
          {children}
        </main>

        {/* Footer */}
        <footer className="py-6 px-8 text-center border-t border-black/5 dark:border-white/5">
          <p className="text-[12px] text-[#86868b]">
            © 2026 Luxury Listings. All rights reserved. •{' '}
            <a href="/dashboard" className="hover:text-[#0071e3] transition-colors">
              Switch to Classic View
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
};

export default DemoLayout;
