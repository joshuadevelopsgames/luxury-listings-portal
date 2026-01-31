import React, { useState } from 'react';

/**
 * Tooltip - Apple-style tooltip component
 * Inspired by 21st.dev tooltip components
 */
const Tooltip = ({ 
  children, 
  content,
  position = 'top',
  delay = 200,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState(null);

  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowPositions = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-zinc-900 dark:border-t-white border-x-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-zinc-900 dark:border-b-white border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-zinc-900 dark:border-l-white border-y-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-zinc-900 dark:border-r-white border-y-transparent border-l-transparent',
  };

  const handleMouseEnter = () => {
    const id = setTimeout(() => setIsVisible(true), delay);
    setTimeoutId(id);
  };

  const handleMouseLeave = () => {
    if (timeoutId) clearTimeout(timeoutId);
    setIsVisible(false);
  };

  return (
    <div 
      className={`relative inline-block ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && (
        <div className={`
          absolute z-50 ${positions[position]}
          px-3 py-2 rounded-lg
          bg-zinc-900 dark:bg-white
          text-white dark:text-zinc-900
          text-xs font-medium
          whitespace-nowrap
          shadow-lg
          animate-in fade-in-0 zoom-in-95 duration-200
        `}>
          {content}
          <div className={`
            absolute border-4 ${arrowPositions[position]}
          `} />
        </div>
      )}
    </div>
  );
};

export default Tooltip;
