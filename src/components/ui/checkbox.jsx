import React, { useState } from 'react';
import { Check } from 'lucide-react';

const Checkbox = React.forwardRef(({ className, checked, onCheckedChange, disabled, ...props }, ref) => {
  const [isAnimating, setIsAnimating] = useState(false);

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
          className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
            disabled
              ? 'cursor-not-allowed opacity-50'
              : 'cursor-pointer'
          } ${
            checked
              ? 'bg-blue-600 border-blue-600'
              : 'border-gray-300 hover:border-blue-400 bg-white'
          } ${
            isAnimating ? 'scale-125' : 'scale-100'
          } ${className || ''}`}
        >
          {checked && (
            <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
          )}
        </div>
      </div>
    </div>
  );
});
Checkbox.displayName = "Checkbox";

export { Checkbox };

