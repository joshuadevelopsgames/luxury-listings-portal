import React, { useState } from 'react';
import { 
  FileCode, 
  ListChecks, 
  GitBranch, 
  Code2
} from 'lucide-react';

/**
 * FloatingDock - Apple-style dock navigation
 * Inspired by 21st.dev dock components
 */
const FloatingDock = ({ activeTab, onTabChange }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const items = [
    { id: 'diff', icon: FileCode, label: 'Diff Preview' },
    { id: 'plan', icon: ListChecks, label: 'Plan Mode' },
    { id: 'changes', icon: GitBranch, label: 'Changes' },
    { id: 'editor', icon: Code2, label: 'Editor' },
  ];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="
        flex items-end gap-2 p-2
        bg-white/80 dark:bg-zinc-900/80
        backdrop-blur-2xl backdrop-saturate-150
        border border-white/20 dark:border-white/10
        rounded-2xl
        shadow-[0_8px_32px_rgba(0,0,0,0.12)]
        dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]
      ">
        {items.map((item, index) => {
          const isActive = activeTab === item.id;
          const isHovered = hoveredIndex === index;
          const isNearHover = hoveredIndex !== null && Math.abs(hoveredIndex - index) === 1;
          
          let scale = 1;
          if (isHovered) scale = 1.4;
          else if (isNearHover) scale = 1.15;

          return (
            <div key={item.id} className="relative group">
              {/* Tooltip */}
              <div className={`
                absolute -top-10 left-1/2 -translate-x-1/2
                px-2 py-1 rounded-lg
                bg-zinc-900 dark:bg-white
                text-white dark:text-zinc-900
                text-xs font-medium whitespace-nowrap
                opacity-0 group-hover:opacity-100
                transition-opacity duration-200
                pointer-events-none
              `}>
                {item.label}
              </div>
              
              <button
                onClick={() => onTabChange(item.id)}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{ transform: `scale(${scale})` }}
                className={`
                  w-12 h-12 rounded-xl
                  flex items-center justify-center
                  transition-all duration-200 ease-out
                  ${isActive 
                    ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30' 
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }
                `}
              >
                <item.icon className="w-5 h-5" />
              </button>

              {/* Active indicator */}
              {isActive && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-zinc-400" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FloatingDock;
