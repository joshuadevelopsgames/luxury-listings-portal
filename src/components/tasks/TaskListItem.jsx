import React, { useState, useEffect } from 'react';
import { 
  Flag,
  Calendar,
  CheckSquare,
  MessageSquare,
  Repeat,
  Bell,
  MoreHorizontal,
  Target,
  Archive,
  ArchiveRestore
} from 'lucide-react';

const COMPLETE_VISIBLE_MS = 450;

const TaskListItem = ({ task, onStatusChange, onEdit, isSelected, onToggleSelect, bulkMode, showArchiveButton = false, onArchive, onUnarchive, isArchived = false }) => {
  const isCompleted = task.status === 'completed';
  const [optimisticCompleted, setOptimisticCompleted] = useState(false);
  const showingCompleted = isCompleted || optimisticCompleted;

  useEffect(() => {
    if (task.status === 'completed') setOptimisticCompleted(false);
  }, [task.status]);

  const handleCheckChange = (checked) => {
    if (checked) {
      setOptimisticCompleted(true);
      setTimeout(() => onStatusChange(task.id, 'completed'), COMPLETE_VISIBLE_MS);
    } else {
      setOptimisticCompleted(false);
      onStatusChange(task.id, 'pending');
    }
  };

  return (
    <div 
      className={`flex items-center gap-3 p-3 border-b border-black/5 dark:border-white/5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group cursor-pointer ${
        showingCompleted ? 'bg-positive/5' : ''
      }`}
      onClick={() => onEdit(task)}
    >
      {/* Bulk selection checkbox */}
      {bulkMode && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(task.id)}
          className="h-4 w-4 rounded-full border-black/20 dark:border-white/20 accent-brand cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        />
      )}

      {/* Complete checkbox - circular */}
      <div onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={showingCompleted}
          onChange={(e) => handleCheckChange(e.target.checked)}
          className="h-5 w-5 rounded-full border-black/20 dark:border-white/20 accent-brand cursor-pointer flex-shrink-0"
        />
      </div>

      {/* Priority Flag */}
      <div className={`flex items-center justify-center w-6 h-6 rounded-lg flex-shrink-0 ${
        task.priority === 'urgent' ? 'bg-danger/10' :
        task.priority === 'high' ? 'bg-warning/10' :
        task.priority === 'medium' ? 'bg-brand/10' :
        'bg-surface-3'
      }`}>
        <Flag className={`w-3.5 h-3.5 fill-current ${
          task.priority === 'urgent' ? 'text-danger' :
          task.priority === 'high' ? 'text-warning' :
          task.priority === 'medium' ? 'text-brand' :
          'text-ink-muted'
        }`} />
      </div>

      {/* Task Title and Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 
            className={`font-medium text-[13px] truncate ${
              showingCompleted ? 'line-through text-ink-muted' : 'text-ink'
            }`}
            title={task.title}
          >
            {task.title}
          </h3>
          
          {/* Indicators */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {task.subtasks && task.subtasks.length > 0 && (
              <div className="flex items-center gap-0.5 text-[11px] text-ink-muted">
                <CheckSquare className="w-3 h-3" />
                <span>{task.subtaskProgress}</span>
              </div>
            )}
            {task.comments && task.comments.length > 0 && (
              <div className="flex items-center gap-0.5 text-[11px] text-ink-muted">
                <MessageSquare className="w-3 h-3" />
                <span>{task.comments.length}</span>
              </div>
            )}
            {task.recurring && (
              <Repeat className="w-3 h-3 text-positive" />
            )}
            {task.reminders && task.reminders.length > 0 && (
              <Bell className="w-3 h-3 text-brand" />
            )}
          </div>
        </div>
        
        {/* Project/Labels/Description row */}
        <div className="flex items-center gap-2 text-[11px]">
          {task.project && (
            <div className="flex items-center gap-1 text-brand">
              <Target className="w-3 h-3" />
              <span className="font-medium">{task.project}{task.section ? ` / ${task.section}` : ''}</span>
            </div>
          )}
          {task.labels && task.labels.length > 0 && (
            <div className="flex gap-1">
              {task.labels.slice(0, 2).map((label, index) => (
                <span 
                  key={index} 
                  className="text-[10px] px-1.5 py-0.5 rounded-md bg-brand/10 text-brand"
                >
                  {label}
                </span>
              ))}
              {task.labels.length > 2 && (
                <span className="text-ink-muted/60">+{task.labels.length - 2}</span>
              )}
            </div>
          )}
          {task.description && (
            <span className="text-ink-muted truncate max-w-xs">{task.description}</span>
          )}
        </div>
      </div>

      {/* Due Date */}
      {task.formattedDueDate && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <Calendar className={`w-3 h-3 ${
            task.formattedDueDate.color?.includes('red') ? 'text-danger' :
            task.formattedDueDate.color?.includes('orange') ? 'text-warning' :
            'text-ink-muted'
          }`} />
          <span className={`text-[11px] font-medium ${
            task.formattedDueDate.color?.includes('red') ? 'text-danger' :
            task.formattedDueDate.color?.includes('orange') ? 'text-warning' :
            'text-ink-muted'
          }`}>
            {task.formattedDueDate.text}
          </span>
        </div>
      )}

      {/* Actions */}
      {showArchiveButton && isCompleted && (onArchive || onUnarchive) && (
        <button
          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 hover:bg-surface-3"
          onClick={(e) => { e.stopPropagation(); isArchived ? onUnarchive?.(task.id) : onArchive?.(task.id); }}
          title={isArchived ? 'Restore from archive' : 'Archive (only you)'}
        >
          {isArchived ? <ArchiveRestore className="w-4 h-4 text-ink-muted" /> : <Archive className="w-4 h-4 text-ink-muted" />}
        </button>
      )}
      <button
        className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 hover:bg-surface-3"
        onClick={(e) => { e.stopPropagation(); onEdit(task); }}
      >
        <MoreHorizontal className="w-4 h-4 text-ink-muted" />
      </button>
    </div>
  );
};

export default TaskListItem;
