import React, { useState } from 'react';
import { Check } from 'lucide-react';

const Checkbox = React.forwardRef(({ className, checked, onCheckedChange, disabled, ...props }, ref) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    if (disabled || !onCheckedChange) return;
    
    // Trigger animation
    setIsAnimating(true);
    
    // Wait for animation, then update state
    setTimeout(() => {
      onCheckedChange(!checked);
      setIsAnimating(false);
    }, 200);
  };

  return (
    <div className="flex items-center space-x-2" data-no-drag>
      <div className="relative inline-flex items-center justify-center">
        <input
          type="checkbox"
          className="sr-only"
          ref={ref}
          checked={checked}
          disabled={disabled}
          {...props}
        />
        <div
          onClick={handleClick}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
            disabled
              ? 'cursor-not-allowed opacity-50'
              : 'cursor-pointer'
          } ${
            checked
              ? 'bg-blue-600 dark:bg-blue-500 border-blue-600 dark:border-blue-500'
              : 'border-gray-300 dark:border-white/40 hover:border-blue-400 dark:hover:border-blue-500 bg-white dark:bg-white/10'
          } ${
            isAnimating ? 'scale-125' : 'scale-100'
          } ${className || ''}`}
        >
          {checked ? (
            <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
          ) : isHovered && !disabled ? (
            <Check className="w-3.5 h-3.5 text-gray-300 dark:text-white/40 stroke-[3]" />
          ) : null}
        </div>
      </div>
    </div>
  );
});
Checkbox.displayName = "Checkbox";

export { Checkbox };

