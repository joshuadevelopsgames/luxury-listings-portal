import React from 'react';
import { ArrowUpRight } from 'lucide-react';

/**
 * FeatureCard - Apple-style feature showcase card
 * Inspired by 21st.dev feature card components
 */
const FeatureCard = ({ 
  icon: Icon,
  title,
  description,
  gradient = 'from-indigo-500 to-purple-500',
  onClick,
  badge,
  isActive = false,
  className = ''
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        group relative w-full text-left
        p-6 rounded-2xl
        bg-white/50 dark:bg-zinc-900/50
        backdrop-blur-xl
        border border-zinc-200/50 dark:border-zinc-700/50
        shadow-sm hover:shadow-xl
        transition-all duration-300
        hover:scale-[1.02]
        overflow-hidden
        ${isActive ? 'ring-2 ring-indigo-500 shadow-xl shadow-indigo-500/10' : ''}
        ${className}
      `}
    >
      {/* Hover gradient effect */}
      <div className={`
        absolute inset-0 opacity-0 group-hover:opacity-100
        bg-gradient-to-br ${gradient}
        transition-opacity duration-300
      `} style={{ opacity: isActive ? 0.05 : undefined }} />

      {/* Icon container */}
      <div className={`
        relative w-12 h-12 mb-4 rounded-xl
        bg-gradient-to-br ${gradient}
        flex items-center justify-center
        shadow-lg
        group-hover:scale-110 group-hover:rotate-3
        transition-transform duration-300
      `}>
        <Icon className="w-6 h-6 text-white" />
      </div>

      {/* Content */}
      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="font-semibold text-zinc-900 dark:text-white">
            {title}
          </h3>
          {badge && (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
              {badge}
            </span>
          )}
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
          {description}
        </p>
      </div>

      {/* Arrow indicator */}
      <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
        <ArrowUpRight className="w-5 h-5 text-zinc-400" />
      </div>
    </button>
  );
};

export default FeatureCard;
