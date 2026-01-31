import React from 'react';

const Loader = ({ isDark = true }) => {
  return (
    <div className={`w-full min-h-screen flex items-center justify-center transition-colors duration-300 ${isDark ? 'bg-[#161617]' : 'bg-[#f5f5f7]'}`}>
      <div className="relative w-12 h-12 rotate-45">
        {[...Array(7)].map((_, i) => (
          <div
            key={i}
            className={`absolute top-0 left-0 w-3.5 h-3.5 animate-square ${
              isDark ? 'bg-white' : 'bg-[#1d1d1f]'
            }`}
            style={{
              animationDelay: `${-1.4285714286 * i}s`
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes square-animation {
          0% { left: 0; top: 0; }
          10.5% { left: 0; top: 0; }
          12.5% { left: 16px; top: 0; }
          23% { left: 16px; top: 0; }
          25% { left: 32px; top: 0; }
          35.5% { left: 32px; top: 0; }
          37.5% { left: 32px; top: 16px; }
          48% { left: 32px; top: 16px; }
          50% { left: 16px; top: 16px; }
          60.5% { left: 16px; top: 16px; }
          62.5% { left: 16px; top: 32px; }
          73% { left: 16px; top: 32px; }
          75% { left: 0; top: 32px; }
          85.5% { left: 0; top: 32px; }
          87.5% { left: 0; top: 16px; }
          98% { left: 0; top: 16px; }
          100% { left: 0; top: 0; }
        }
        
        .animate-square {
          animation: square-animation 10s ease-in-out infinite both;
        }
      `}</style>
    </div>
  );
};

export default Loader;
