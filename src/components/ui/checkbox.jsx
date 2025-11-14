import React from 'react';

const Checkbox = React.forwardRef(({ className, ...props }, ref) => (
  <div className="flex items-center space-x-2">
    <input
      type="checkbox"
      className={`h-4 w-4 rounded-full border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 ${className || ''}`}
      ref={ref}
      {...props}
    />
  </div>
));
Checkbox.displayName = "Checkbox";

export { Checkbox };

