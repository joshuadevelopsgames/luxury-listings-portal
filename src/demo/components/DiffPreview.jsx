import React, { useState } from 'react';
import { Minus, Plus, Code2, Split, AlignJustify } from 'lucide-react';
import GlassCard from './ui/GlassCard';
import ModernButton from './ui/ModernButton';
import Badge from './ui/Badge';

/**
 * DiffPreview Component - Apple-style diff visualization
 * Redesigned with 21st.dev inspired components
 */
const DiffPreview = ({ oldCode, newCode, fileName, language = 'javascript', unified = false }) => {
  const [viewMode, setViewMode] = useState(unified ? 'unified' : 'split');

  // Simple line-by-line diff algorithm
  const computeDiff = (oldLines, newLines) => {
    const diff = [];
    let i = 0, j = 0;
    
    while (i < oldLines.length || j < newLines.length) {
      if (i >= oldLines.length) {
        diff.push({ type: 'add', line: newLines[j], oldLine: null, newLine: j + 1 });
        j++;
      } else if (j >= newLines.length) {
        diff.push({ type: 'remove', line: oldLines[i], oldLine: i + 1, newLine: null });
        i++;
      } else if (oldLines[i] === newLines[j]) {
        diff.push({ type: 'equal', line: oldLines[i], oldLine: i + 1, newLine: j + 1 });
        i++;
        j++;
      } else {
        if (i + 1 < oldLines.length && oldLines[i + 1] === newLines[j]) {
          diff.push({ type: 'remove', line: oldLines[i], oldLine: i + 1, newLine: null });
          i++;
        } else if (j + 1 < newLines.length && oldLines[i] === newLines[j + 1]) {
          diff.push({ type: 'add', line: newLines[j], oldLine: null, newLine: j + 1 });
          j++;
        } else {
          diff.push({ type: 'remove', line: oldLines[i], oldLine: i + 1, newLine: null });
          diff.push({ type: 'add', line: newLines[j], oldLine: null, newLine: j + 1 });
          i++;
          j++;
        }
      }
    }
    return diff;
  };

  const oldLines = oldCode.split('\n');
  const newLines = newCode.split('\n');
  const diff = computeDiff(oldLines, newLines);

  const additions = diff.filter(d => d.type === 'add').length;
  const deletions = diff.filter(d => d.type === 'remove').length;

  return (
    <GlassCard padding="p-0" className="overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-50/50 dark:bg-zinc-800/50 border-b border-zinc-200/50 dark:border-zinc-700/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-zinc-500" />
            <span className="text-sm font-mono text-zinc-700 dark:text-zinc-300">{fileName}</span>
          </div>
          <Badge variant="glass" size="sm">{language}</Badge>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-green-600 dark:text-green-400 font-medium">+{additions}</span>
            <span className="text-red-600 dark:text-red-400 font-medium">-{deletions}</span>
          </div>
          <div className="flex items-center rounded-lg bg-zinc-200/50 dark:bg-zinc-700/50 p-1">
            <button
              onClick={() => setViewMode('split')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'split' 
                  ? 'bg-white dark:bg-zinc-600 text-zinc-900 dark:text-white shadow-sm' 
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <Split className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('unified')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'unified' 
                  ? 'bg-white dark:bg-zinc-600 text-zinc-900 dark:text-white shadow-sm' 
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <AlignJustify className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="overflow-x-auto bg-zinc-950 dark:bg-black">
        {viewMode === 'unified' ? (
          <div className="min-w-full">
            {diff.map((item, idx) => (
              <div
                key={idx}
                className={`flex font-mono text-sm ${
                  item.type === 'add' 
                    ? 'bg-green-500/10 border-l-2 border-green-500' 
                    : item.type === 'remove'
                      ? 'bg-red-500/10 border-l-2 border-red-500'
                      : 'border-l-2 border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 w-20 px-3 py-1 text-zinc-500 bg-zinc-900/50 shrink-0">
                  {item.type === 'add' && <Plus className="w-3 h-3 text-green-500" />}
                  {item.type === 'remove' && <Minus className="w-3 h-3 text-red-500" />}
                  {item.type === 'equal' && <span className="w-3" />}
                  <span className="text-xs">{item.oldLine || item.newLine}</span>
                </div>
                <code className={`flex-1 px-4 py-1 ${
                  item.type === 'add' 
                    ? 'text-green-400' 
                    : item.type === 'remove'
                      ? 'text-red-400'
                      : 'text-zinc-400'
                }`}>
                  {item.line}
                </code>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 divide-x divide-zinc-800">
            {/* Old Code */}
            <div>
              <div className="px-4 py-2 bg-zinc-900/50 border-b border-zinc-800 text-xs font-semibold text-zinc-500">
                Original
              </div>
              <div className="font-mono text-sm">
                {oldLines.map((line, idx) => {
                  const diffItem = diff.find(d => d.oldLine === idx + 1);
                  const isRemoved = diffItem?.type === 'remove';
                  return (
                    <div
                      key={idx}
                      className={`flex ${isRemoved ? 'bg-red-500/10 border-l-2 border-red-500' : 'border-l-2 border-transparent'}`}
                    >
                      <span className="w-12 px-3 py-1 text-xs text-zinc-600 bg-zinc-900/50 text-right">{idx + 1}</span>
                      <code className={`flex-1 px-4 py-1 ${isRemoved ? 'text-red-400' : 'text-zinc-400'}`}>
                        {line}
                      </code>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* New Code */}
            <div>
              <div className="px-4 py-2 bg-zinc-900/50 border-b border-zinc-800 text-xs font-semibold text-zinc-500">
                Updated
              </div>
              <div className="font-mono text-sm">
                {newLines.map((line, idx) => {
                  const diffItem = diff.find(d => d.newLine === idx + 1);
                  const isAdded = diffItem?.type === 'add';
                  return (
                    <div
                      key={idx}
                      className={`flex ${isAdded ? 'bg-green-500/10 border-l-2 border-green-500' : 'border-l-2 border-transparent'}`}
                    >
                      <span className="w-12 px-3 py-1 text-xs text-zinc-600 bg-zinc-900/50 text-right">{idx + 1}</span>
                      <code className={`flex-1 px-4 py-1 ${isAdded ? 'text-green-400' : 'text-zinc-400'}`}>
                        {line}
                      </code>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
};

export default DiffPreview;
