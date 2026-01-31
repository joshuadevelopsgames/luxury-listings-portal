import React from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';

/**
 * ModernButton - Apple-style button with multiple variants
 * Inspired by 21st.dev button components
 */
const ModernButton = ({ 
  children, 
  className = '',
  variant = 'default',
  size = 'default',
  loading = false,
  icon = null,
  iconPosition = 'right',
  showArrow = false,
  glow = false,
  ...props 
}) => {
  const variants = {
    default: `
      bg-zinc-900 dark:bg-white
      text-white dark:text-zinc-900
      hover:bg-zinc-800 dark:hover:bg-zinc-100
      shadow-lg shadow-zinc-900/25 dark:shadow-white/25
      hover:shadow-xl hover:shadow-zinc-900/30 dark:hover:shadow-white/30
    `,
    gradient: `
      bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500
      text-white
      shadow-lg shadow-purple-500/25
      hover:shadow-xl hover:shadow-purple-500/40
      hover:scale-[1.02]
    `,
    ghost: `
      bg-transparent
      text-zinc-900 dark:text-white
      hover:bg-zinc-100 dark:hover:bg-zinc-800
      border border-zinc-200 dark:border-zinc-700
    `,
    glass: `
      bg-white/10 dark:bg-white/5
      backdrop-blur-xl
      text-zinc-900 dark:text-white
      border border-white/20
      hover:bg-white/20 dark:hover:bg-white/10
      shadow-lg
    `,
    outline: `
      bg-transparent
      text-zinc-900 dark:text-white
      border-2 border-zinc-900 dark:border-white
      hover:bg-zinc-900 hover:text-white
      dark:hover:bg-white dark:hover:text-zinc-900
    `,
    danger: `
      bg-red-500
      text-white
      hover:bg-red-600
      shadow-lg shadow-red-500/25
    `,
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm rounded-lg',
    default: 'px-5 py-2.5 text-sm rounded-xl',
    lg: 'px-8 py-3.5 text-base rounded-xl',
    xl: 'px-10 py-4 text-lg rounded-2xl',
  };

  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2
        font-medium
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]}
        ${sizes[size]}
        ${glow ? 'relative before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-r before:from-indigo-500 before:via-purple-500 before:to-pink-500 before:blur-xl before:opacity-50 before:-z-10' : ''}
        ${className}
      `}
      disabled={loading}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {icon && iconPosition === 'left' && !loading && icon}
      {children}
      {icon && iconPosition === 'right' && !loading && icon}
      {showArrow && !loading && <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />}
    </button>
  );
};

export default ModernButton;
