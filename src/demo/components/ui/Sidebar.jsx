import React from 'react';
import { 
  FileCode, 
  ListChecks, 
  GitBranch, 
  Code2, 
  Sparkles,
  ChevronRight,
  Settings,
  HelpCircle
} from 'lucide-react';

/**
 * Sidebar - Apple-style sidebar navigation
 * Inspired by 21st.dev sidebar components
 */
const Sidebar = ({ activeTab, onTabChange, collapsed = false }) => {
  const mainItems = [
    { id: 'diff', icon: FileCode, label: 'Diff Preview', badge: null },
    { id: 'plan', icon: ListChecks, label: 'Plan Mode', badge: 'AI' },
    { id: 'changes', icon: GitBranch, label: 'Changes', badge: '2' },
    { id: 'editor', icon: Code2, label: 'Editor', badge: null },
  ];

  const bottomItems = [
    { id: 'settings', icon: Settings, label: 'Settings' },
    { id: 'help', icon: HelpCircle, label: 'Help' },
  ];

  const NavItem = ({ item, isActive, onClick }) => (
    <button
      onClick={() => onClick(item.id)}
      className={`
        w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
        transition-all duration-200
        group relative
        ${isActive 
          ? 'bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 text-zinc-900 dark:text-white' 
          : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-white'
        }
      `}
    >
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500 rounded-full" />
      )}
      <item.icon className={`w-5 h-5 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : ''}`} />
      {!collapsed && (
        <>
          <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
          {item.badge && (
            <span className={`
              px-2 py-0.5 text-xs font-medium rounded-full
              ${item.badge === 'AI' 
                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white' 
                : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
              }
            `}>
              {item.badge}
            </span>
          )}
          {isActive && <ChevronRight className="w-4 h-4 text-zinc-400" />}
        </>
      )}
    </button>
  );

  return (
    <div className={`
      flex flex-col h-full
      bg-white/50 dark:bg-zinc-900/50
      backdrop-blur-xl
      border-r border-zinc-200/50 dark:border-zinc-700/50
      ${collapsed ? 'w-16' : 'w-64'}
      transition-all duration-300
    `}>
      {/* Logo */}
      <div className="p-4 border-b border-zinc-200/50 dark:border-zinc-700/50">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-pink-500 rounded-xl blur-lg opacity-50" />
            <div className="relative w-10 h-10 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
          </div>
          {!collapsed && (
            <div>
              <h1 className="font-semibold text-zinc-900 dark:text-white">1Code Demo</h1>
              <p className="text-xs text-zinc-500">by 21st.dev</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Nav */}
      <div className="flex-1 p-3 space-y-1">
        <p className="px-3 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          {!collapsed && 'Features'}
        </p>
        {mainItems.map(item => (
          <NavItem 
            key={item.id} 
            item={item} 
            isActive={activeTab === item.id}
            onClick={onTabChange}
          />
        ))}
      </div>

      {/* Bottom Nav */}
      <div className="p-3 border-t border-zinc-200/50 dark:border-zinc-700/50 space-y-1">
        {bottomItems.map(item => (
          <NavItem 
            key={item.id} 
            item={item} 
            isActive={false}
            onClick={() => {}}
          />
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
