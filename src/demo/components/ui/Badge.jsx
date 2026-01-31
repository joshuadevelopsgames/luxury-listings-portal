import React from 'react';

/**
 * Badge - Apple-style badge component
 * Inspired by 21st.dev badge components
 */
const Badge = ({ 
  children, 
  variant = 'default',
  size = 'default',
  icon: Icon = null,
  className = ''
}) => {
  const variants = {
    default: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300',
    primary: 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300',
    success: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300',
    warning: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300',
    danger: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300',
    gradient: 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white',
    glass: 'bg-white/20 dark:bg-white/10 backdrop-blur-xl text-zinc-900 dark:text-white border border-white/20',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    default: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        font-medium rounded-full
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
    >
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </span>
  );
};

export default Badge;
