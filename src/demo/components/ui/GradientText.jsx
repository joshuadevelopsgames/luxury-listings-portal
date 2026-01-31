import React from 'react';

/**
 * GradientText - Apple-style gradient text component
 * Inspired by 21st.dev text components
 */
const GradientText = ({ 
  children, 
  className = '',
  variant = 'default',
  as: Component = 'span',
  ...props 
}) => {
  const variants = {
    default: 'from-zinc-900 via-zinc-700 to-zinc-900 dark:from-white dark:via-zinc-300 dark:to-white',
    purple: 'from-indigo-600 via-purple-600 to-pink-600',
    blue: 'from-blue-600 via-cyan-500 to-teal-500',
    sunset: 'from-orange-500 via-pink-500 to-purple-600',
    ocean: 'from-blue-400 via-blue-600 to-indigo-700',
    aurora: 'from-green-400 via-cyan-500 to-blue-600',
  };

  return (
    <Component
      className={`
        bg-gradient-to-r ${variants[variant]}
        bg-clip-text text-transparent
        ${className}
      `}
      {...props}
    >
      {children}
    </Component>
  );
};

export default GradientText;
