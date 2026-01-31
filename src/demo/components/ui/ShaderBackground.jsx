import React from 'react';

/**
 * ShaderBackground - Apple-style animated gradient background
 * Inspired by 21st.dev shader/background components
 */
const ShaderBackground = ({ variant = 'mesh', className = '' }) => {
  const variants = {
    mesh: (
      <>
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-pink-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-200 dark:bg-purple-900/30 rounded-full blur-3xl opacity-30 animate-pulse" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-indigo-200 dark:bg-indigo-900/30 rounded-full blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-pink-200 dark:bg-pink-900/30 rounded-full blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '2s' }} />
      </>
    ),
    grid: (
      <>
        <div className="absolute inset-0 bg-white dark:bg-zinc-950" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white dark:to-zinc-950" />
      </>
    ),
    radial: (
      <>
        <div className="absolute inset-0 bg-white dark:bg-zinc-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100 via-transparent to-transparent dark:from-indigo-950/50" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-pink-100 via-transparent to-transparent dark:from-pink-950/30" />
      </>
    ),
  };

  return (
    <div className={`fixed inset-0 -z-10 overflow-hidden ${className}`}>
      {variants[variant]}
    </div>
  );
};

export default ShaderBackground;
