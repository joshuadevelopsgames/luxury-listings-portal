import React, { useState } from 'react';
import { GitBranch, FileText, Clock, CheckCircle2, XCircle, AlertCircle, Plus, Minus, ChevronDown, ChevronRight } from 'lucide-react';
import GlassCard from './ui/GlassCard';
import ModernButton from './ui/ModernButton';
import Badge from './ui/Badge';

/**
 * ChangeTracker Component - Apple-style change tracking
 * Redesigned with 21st.dev inspired components
 */
const ChangeTracker = ({ changes = [], onStage, onCommit, onDiscard }) => {
  const [stagedFiles, setStagedFiles] = useState(new Set());
  const [expandedFiles, setExpandedFiles] = useState(new Set());
  const [commitMessage, setCommitMessage] = useState('');

  const toggleStaged = (filePath) => {
    setStagedFiles(prev => {
      const next = new Set(prev);
      if (next.has(filePath)) next.delete(filePath);
      else next.add(filePath);
      return next;
    });
    if (onStage) onStage(filePath);
  };

  const toggleExpanded = (filePath) => {
    setExpandedFiles(prev => {
      const next = new Set(prev);
      if (next.has(filePath)) next.delete(filePath);
      else next.add(filePath);
      return next;
    });
  };

  const getChangeTypeIcon = (type) => {
    switch (type) {
      case 'added': return CheckCircle2;
      case 'modified': return AlertCircle;
      case 'deleted': return XCircle;
      default: return FileText;
    }
  };

  const getChangeTypeColor = (type) => {
    switch (type) {
      case 'added': return 'text-green-500';
      case 'modified': return 'text-amber-500';
      case 'deleted': return 'text-red-500';
      default: return 'text-zinc-500';
    }
  };

  const getChangeTypeBg = (type) => {
    switch (type) {
      case 'added': return 'from-green-500 to-teal-500';
      case 'modified': return 'from-amber-500 to-orange-500';
      case 'deleted': return 'from-red-500 to-pink-500';
      default: return 'from-zinc-500 to-zinc-600';
    }
  };

  const stagedCount = stagedFiles.size;
  const totalChanges = changes.reduce((sum, change) => {
    return sum + (change.additions || 0) + (change.deletions || 0);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <GlassCard>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center shadow-lg shadow-pink-500/25">
              <GitBranch className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
                Changes
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {changes.length} files changed, {totalChanges} lines
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="success">+{changes.reduce((s, c) => s + (c.additions || 0), 0)}</Badge>
            <Badge variant="danger">-{changes.reduce((s, c) => s + (c.deletions || 0), 0)}</Badge>
          </div>
        </div>

        {/* Branch info */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
          <GitBranch className="w-4 h-4 text-indigo-500" />
          <span className="text-sm font-medium text-zinc-900 dark:text-white">main</span>
          <span className="text-sm text-zinc-500">→</span>
          <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">feature/refactor</span>
        </div>
      </GlassCard>

      {/* File List */}
      <div className="space-y-3">
        {changes.map((change, idx) => {
          const isStaged = stagedFiles.has(change.path);
          const isExpanded = expandedFiles.has(change.path);
          const Icon = getChangeTypeIcon(change.type);

          return (
            <GlassCard
              key={idx}
              padding="p-0"
              className={isStaged ? 'ring-2 ring-indigo-500' : ''}
            >
              <div className="p-4 flex items-center gap-4">
                {/* Checkbox */}
                <button
                  onClick={() => toggleStaged(change.path)}
                  className={`
                    w-5 h-5 rounded flex items-center justify-center shrink-0 transition-all
                    ${isStaged 
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white' 
                      : 'border-2 border-zinc-300 dark:border-zinc-600 hover:border-indigo-500'
                    }
                  `}
                >
                  {isStaged && <CheckCircle2 className="w-3 h-3" />}
                </button>

                {/* File Info */}
                <button
                  onClick={() => toggleExpanded(change.path)}
                  className="flex-1 flex items-center gap-3 text-left"
                >
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getChangeTypeBg(change.type)} flex items-center justify-center`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono font-medium text-zinc-900 dark:text-white truncate">
                      {change.path}
                    </p>
                    <p className="text-xs text-zinc-500 capitalize">{change.type}</p>
                  </div>
                </button>

                {/* Stats */}
                <div className="flex items-center gap-3 text-sm">
                  {change.additions > 0 && (
                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <Plus className="w-3 h-3" />
                      {change.additions}
                    </span>
                  )}
                  {change.deletions > 0 && (
                    <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                      <Minus className="w-3 h-3" />
                      {change.deletions}
                    </span>
                  )}
                  {change.timestamp && (
                    <span className="flex items-center gap-1 text-zinc-500">
                      <Clock className="w-3 h-3" />
                      {new Date(change.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  )}
                </div>
              </div>

              {/* Expanded Diff */}
              {isExpanded && change.diff && (
                <div className="border-t border-zinc-200/50 dark:border-zinc-700/50 bg-zinc-950 p-4 overflow-x-auto">
                  <pre className="text-xs font-mono text-zinc-400">{change.diff}</pre>
                </div>
              )}
            </GlassCard>
          );
        })}
      </div>

      {/* Commit Section */}
      {stagedCount > 0 && (
        <GlassCard glow>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="gradient">{stagedCount} staged</Badge>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  Ready to commit
                </span>
              </div>
            </div>

            {/* Commit Message Input */}
            <div>
              <input
                type="text"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Commit message..."
                className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              {onDiscard && (
                <ModernButton
                  variant="ghost"
                  onClick={() => {
                    setStagedFiles(new Set());
                    onDiscard();
                  }}
                >
                  Unstage All
                </ModernButton>
              )}
              {onCommit && (
                <ModernButton
                  variant="gradient"
                  onClick={() => {
                    const staged = Array.from(stagedFiles);
                    onCommit(staged);
                    setStagedFiles(new Set());
                    setCommitMessage('');
                  }}
                  disabled={!commitMessage.trim()}
                  glow
                >
                  Commit Changes
                </ModernButton>
              )}
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
};

export default ChangeTracker;
