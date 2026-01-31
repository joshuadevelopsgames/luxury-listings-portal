import React, { useState } from 'react';
import { Check, Copy, Terminal } from 'lucide-react';

/**
 * CodeBlock - Apple-style code display component
 * Inspired by 21st.dev code components
 */
const CodeBlock = ({ 
  code, 
  language = 'javascript',
  filename = null,
  showLineNumbers = true,
  maxHeight = '400px',
  className = ''
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.split('\n');

  return (
    <div className={`
      relative rounded-2xl overflow-hidden
      bg-zinc-950 dark:bg-black
      border border-zinc-800
      shadow-2xl
      ${className}
    `}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/50 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          {/* Traffic lights */}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          {filename && (
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Terminal className="w-4 h-4" />
              <span>{filename}</span>
            </div>
          )}
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-green-500" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy
            </>
          )}
        </button>
      </div>

      {/* Code content */}
      <div className="overflow-auto" style={{ maxHeight }}>
        <pre className="p-4 text-sm font-mono">
          <code>
            {lines.map((line, idx) => (
              <div key={idx} className="flex">
                {showLineNumbers && (
                  <span className="inline-block w-10 pr-4 text-right text-zinc-600 select-none">
                    {idx + 1}
                  </span>
                )}
                <span className="flex-1 text-zinc-300">{line || ' '}</span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
};

export default CodeBlock;
