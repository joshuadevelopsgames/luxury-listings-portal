import React from 'react';

/**
 * GlassCard - Apple-style glassmorphism card component
 * Inspired by 21st.dev modern card designs
 */
const GlassCard = ({ 
  children, 
  className = '', 
  hover = true,
  glow = false,
  padding = 'p-6',
  ...props 
}) => {
  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl
        bg-white/70 dark:bg-zinc-900/70
        backdrop-blur-xl backdrop-saturate-150
        border border-white/20 dark:border-white/10
        shadow-[0_8px_32px_rgba(0,0,0,0.08)]
        dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)]
        ${hover ? 'transition-all duration-300 hover:shadow-[0_16px_48px_rgba(0,0,0,0.12)] hover:scale-[1.01] hover:border-white/30' : ''}
        ${glow ? 'before:absolute before:inset-0 before:bg-gradient-to-br before:from-indigo-500/10 before:via-purple-500/10 before:to-pink-500/10 before:opacity-0 hover:before:opacity-100 before:transition-opacity' : ''}
        ${padding}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};

export default GlassCard;
