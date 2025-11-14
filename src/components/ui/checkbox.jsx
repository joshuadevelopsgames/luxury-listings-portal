import React from 'react';
import { Check } from 'lucide-react';

const Checkbox = React.forwardRef(({ className, checked, onCheckedChange, disabled, ...props }, ref) => {
  const handleChange = (e) => {
    if (onCheckedChange && !disabled) {
      onCheckedChange(e.target.checked);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <div className="relative inline-flex items-center justify-center">
        <input
          type="checkbox"
          className="sr-only"
          ref={ref}
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          {...props}
        />
        <div
          onClick={() => !disabled && onCheckedChange && onCheckedChange(!checked)}
          className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${
            disabled
              ? 'cursor-not-allowed opacity-50'
              : 'cursor-pointer'
          } ${
            checked
              ? 'bg-blue-600 border-blue-600'
              : 'border-gray-300 hover:border-blue-400 bg-white'
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

