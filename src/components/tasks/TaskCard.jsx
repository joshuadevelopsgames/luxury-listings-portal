import React, { useState, useEffect } from 'react';
import { DailyTask } from '../../entities/DailyTask';
import { getVancouverTodayMidnight } from '../../utils/vancouverTime';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  MoreHorizontal,
  Calendar,
  Target,
  Edit,
  Trash2,
  Zap,
  TrendingUp,
  Flag,
  MessageSquare,
  CheckSquare,
  Repeat,
  Bell,
  Archive,
  ArchiveRestore
} from 'lucide-react';

const COMPLETE_VISIBLE_MS = 450;

const TaskCard = ({ task, onStatusChange, onEdit, onDelete, canEdit = true, canDelete = true, showArchiveButton = false, onArchive, onUnarchive, isArchived = false }) => {
  const [showActions, setShowActions] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const [editedDescription, setEditedDescription] = useState(task.description);
  const [optimisticCompleted, setOptimisticCompleted] = useState(false);

  const handleTitleSave = async () => {
    if (editedTitle.trim() && editedTitle !== task.title) {
      try {
        await DailyTask.update(task.id, { title: editedTitle });
      } catch (error) {
        console.error('Error updating title:', error);
        setEditedTitle(task.title);
      }
    }
    setEditingTitle(false);
  };

  const handleDescriptionSave = async () => {
    if (editedDescription.trim() && editedDescription !== task.description) {
      try {
        await DailyTask.update(task.id, { description: editedDescription });
      } catch (error) {
        console.error('Error updating description:', error);
        setEditedDescription(task.description);
      }
    }
    setEditingDescription(false);
  };

  const parseLocalDate = (dateString) => {
    if (!dateString) return null;
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Vancouver timezone: today = Vancouver today
  const isTodayLocal = (dateString) => {
    if (!dateString) return false;
    const taskDate = parseLocalDate(dateString);
    const todayOnly = getVancouverTodayMidnight();
    return taskDate.getTime() === todayOnly.getTime();
  };

  const isPastLocal = (dateString) => {
    if (!dateString) return false;
    const taskDate = parseLocalDate(dateString);
    const todayOnly = getVancouverTodayMidnight();
    return taskDate < todayOnly;
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'urgent':
        return <Zap className="w-4 h-4 text-danger" />;
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      case 'medium':
        return <TrendingUp className="w-4 h-4 text-brand" />;
      case 'low':
        return <Clock className="w-4 h-4 text-ink-muted" />;
      default:
        return <Clock className="w-4 h-4 text-ink-muted" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in_progress':
        return 'In Progress';
      case 'pending':
        return 'Pending';
      default:
        return status;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-positive/10 text-positive';
      case 'in_progress':
        return 'bg-brand/10 text-brand';
      case 'pending':
        return 'bg-surface-3 text-ink-muted';
      default:
        return 'bg-surface-3 text-ink-muted';
    }
  };

  const isCompleted = task.status === 'completed';
  const showingCompleted = isCompleted || optimisticCompleted;

  useEffect(() => {
    if (task.status === 'completed') setOptimisticCompleted(false);
  }, [task.status]);

  const handleStatusChange = (newStatus) => {
    onStatusChange(task.id, newStatus);
  };

  const handleCheckboxChange = (checked) => {
    if (checked) {
      setOptimisticCompleted(true);
      setTimeout(() => onStatusChange(task.id, 'completed'), COMPLETE_VISIBLE_MS);
    } else {
      setOptimisticCompleted(false);
      onStatusChange(task.id, 'pending');
    }
  };
  const isOverdue = task.due_date && isPastLocal(task.due_date) && !isTodayLocal(task.due_date) && task.status !== 'completed';

  return (
    <div 
      className={`h-full p-4 rounded-xl transition-all duration-200 cursor-pointer border ${
        isCompleted 
          ? 'bg-positive/5 border-positive/20' 
          : isOverdue
          ? 'bg-danger/5 border-danger/20'
          : 'bg-surface border-hairline hover:border-brand/30 hover:shadow-md'
      }`}
      onClick={() => onEdit(task)}
    >
      <div className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyPress={(e) => e.key === 'Enter' && handleTitleSave()}
                className="text-[15px] font-semibold mb-2 w-full px-3 py-2 rounded-xl bg-surface border border-hairline-strong text-ink focus:outline-none focus:ring-2 focus:ring-brand"
                autoFocus
              />
            ) : (
              <h3 
                className={`text-[15px] font-semibold mb-2 line-clamp-2 cursor-text hover:bg-surface-3 px-2 py-1 rounded-lg transition-colors ${
              isCompleted ? 'line-through text-ink-muted' : 'text-ink'
                }`}
                onDoubleClick={() => canEdit && setEditingTitle(true)}
                title="Double-click to edit"
              >
              {task.title}
            </h3>
            )}
            
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {/* Todoist-style Priority Flag */}
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${
                task.priority === 'urgent' ? 'bg-danger/10' :
                task.priority === 'high' ? 'bg-warning/10' :
                task.priority === 'medium' ? 'bg-brand/10' :
                'bg-surface-3'
              }`}>
                <Flag className={`w-3.5 h-3.5 ${
                  task.priority === 'urgent' ? 'text-danger' :
                  task.priority === 'high' ? 'text-warning' :
                  task.priority === 'medium' ? 'text-brand' :
                  'text-ink-muted'
                } fill-current`} />
                <span className={`text-[11px] font-semibold ${
                  task.priority === 'urgent' ? 'text-danger' :
                  task.priority === 'high' ? 'text-warning' :
                  task.priority === 'medium' ? 'text-brand' :
                  'text-ink-muted'
                }`}>
                  {task.priorityFlag?.label || task.priority}
                </span>
              </div>
              
              <span className={`text-[11px] font-medium px-2 py-1 rounded-lg ${getStatusColor(task.status)}`}>
                {getStatusText(task.status)}
              </span>
              
              {/* Show subtask progress if exists */}
              {task.subtasks && task.subtasks.length > 0 && (
                <div className="flex items-center gap-1 text-[11px] text-ink-muted">
                  <CheckSquare className="w-3 h-3" />
                  <span>{task.subtaskProgress}</span>
                </div>
              )}
              
              {/* Show comment count if exists */}
              {task.comments && task.comments.length > 0 && (
                <div className="flex items-center gap-1 text-[11px] text-ink-muted">
                  <MessageSquare className="w-3 h-3" />
                  <span>{task.comments.length}</span>
                </div>
              )}
              
              {/* Show recurring indicator */}
              {task.recurring && (
                <div className="flex items-center gap-1 text-[11px] text-positive">
                  <Repeat className="w-3 h-3" />
                  <span>{task.recurring.pattern}</span>
                </div>
              )}
              
              {/* Show reminder indicator */}
              {task.reminders && task.reminders.length > 0 && (
                <div className="flex items-center gap-1 text-[11px] text-brand">
                  <Bell className="w-3 h-3" />
                  <span>{task.reminders.length}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="relative">
            <button
              className="p-2 rounded-lg hover:bg-surface-3 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setShowActions(!showActions);
              }}
            >
              <MoreHorizontal className="w-5 h-5 text-ink-muted" />
            </button>
            
            {showActions && (
              <div className="absolute right-0 top-full mt-1 w-32 bg-surface border border-hairline-strong rounded-xl shadow-lg z-10 overflow-hidden">
                <div className="py-1">
                  <button
                    className="w-full text-left px-3 py-2 text-[13px] text-ink hover:bg-surface-3 flex items-center gap-2"
                    onClick={() => {
                      setShowActions(false);
                      onEdit(task);
                    }}
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 text-[13px] text-danger hover:bg-danger/5 flex items-center gap-2"
                    onClick={() => {
                      setShowActions(false);
                      onDelete(task);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                  {showArchiveButton && isCompleted && (onArchive || onUnarchive) && (
                    <button
                      className="w-full text-left px-3 py-2 text-[13px] text-ink-muted hover:bg-surface-3 flex items-center gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowActions(false);
                        isArchived ? onUnarchive?.(task.id) : onArchive?.(task.id);
                      }}
                    >
                      {isArchived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                      {isArchived ? 'Restore' : 'Archive'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="space-y-3">
        {editingDescription ? (
          <textarea
            value={editedDescription}
            onChange={(e) => setEditedDescription(e.target.value)}
            onBlur={handleDescriptionSave}
            className="text-[13px] w-full px-3 py-2 rounded-xl bg-surface border border-hairline-strong text-ink focus:outline-none focus:ring-2 focus:ring-brand resize-none"
            rows={3}
            autoFocus
          />
        ) : (
          <p 
            className={`text-[13px] line-clamp-3 cursor-text hover:bg-surface-3 px-2 py-1 rounded-lg transition-colors ${
          isCompleted ? 'text-ink-muted/60' : 'text-ink-muted'
            }`}
            onDoubleClick={() => canEdit && setEditingDescription(true)}
            title="Double-click to edit"
          >
          {task.description}
        </p>
        )}
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            {/* Contextual date display (Todoist-style) */}
            {task.formattedDueDate ? (
              <div className="flex items-center gap-1.5">
                <Calendar className={`w-3 h-3 ${
                  task.formattedDueDate.color?.includes('red') ? 'text-danger' :
                  task.formattedDueDate.color?.includes('orange') ? 'text-warning' :
                  'text-ink-muted'
                }`} />
                <span className={`font-medium ${
                  task.formattedDueDate.color?.includes('red') ? 'text-danger' :
                  task.formattedDueDate.color?.includes('orange') ? 'text-warning' :
                  'text-ink-muted'
                }`}>
                  {task.formattedDueDate.text}
            </span>
              </div>
            ) : (
              <span className="text-ink-muted/60">No due date</span>
            )}
            {task.estimated_time && (
              <span className="text-ink-muted">
                ⏱ {task.formattedTime}
              </span>
            )}
          </div>
          
          {task.project && (
            <div className="flex items-center gap-2 text-[11px] text-ink font-medium">
              <Target className="w-3 h-3 text-brand" />
              <span>{task.project}{task.section ? ` / ${task.section}` : ''}</span>
            </div>
          )}
          
          {!task.project && task.category && (
          <div className="flex items-center gap-2 text-[11px] text-ink-muted">
              <Target className="w-3 h-3" />
            <span>Category: {task.category}</span>
          </div>
          )}
          
          {/* Labels display */}
          {task.labels && task.labels.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {task.labels.map((label, index) => (
                <span 
                  key={index} 
                  className="text-[10px] px-2 py-0.5 rounded-md bg-brand/10 text-brand"
                >
                  {label}
                </span>
              ))}
            </div>
          )}
          
          {task.assignedBy && (
            <div className="flex items-center gap-2 text-[11px] text-ink-muted">
              <span>Assigned by: {task.assignedBy}</span>
            </div>
          )}
        </div>
        
        {/* Subtasks display */}
        {task.subtasks && task.subtasks.length > 0 && (
          <div className="pt-3 border-t border-hairline">
            <div className="text-[11px] font-medium text-ink-muted mb-2 flex items-center justify-between">
              <span>Subtasks ({task.subtaskProgress})</span>
              <div className="flex-1 mx-2 bg-surface-3 rounded-full h-1.5">
                <div 
                  className="bg-brand h-1.5 rounded-full transition-all"
                  style={{ width: `${task.subtaskPercentage}%` }}
                ></div>
              </div>
            </div>
            <div className="space-y-1.5 max-h-24 overflow-y-auto">
              {task.subtasks.slice(0, 3).map((subtask) => (
                <div key={subtask.id} className="flex items-center gap-2 text-[11px]">
                  <input
                    type="checkbox"
                    checked={subtask.completed}
                    disabled
                    className="h-3 w-3 rounded accent-brand"
                  />
                  <span className={subtask.completed ? 'line-through text-ink-muted/60' : 'text-ink-muted'}>
                    {subtask.text}
                  </span>
                </div>
              ))}
              {task.subtasks.length > 3 && (
                <p className="text-[11px] text-ink-muted/60">
                  +{task.subtasks.length - 3} more subtasks...
                </p>
              )}
            </div>
          </div>
        )}
        
        {/* Status management */}
        <div className="flex gap-2 pt-2">
          {!isCompleted ? (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); handleStatusChange('in_progress'); }}
                disabled={task.status === 'in_progress'}
                className={`flex-1 py-2 px-3 rounded-xl text-[12px] font-medium transition-colors ${
                  task.status === 'in_progress' 
                    ? 'bg-brand text-white' 
                    : 'bg-surface-3 text-ink hover:bg-hairline-strong'
                } disabled:opacity-50`}
              >
                {task.status === 'in_progress' ? 'In Progress' : 'Start'}
              </button>
              
              <button
                onClick={(e) => { e.stopPropagation(); handleStatusChange('completed'); }}
                className="flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-positive/10 text-positive text-[12px] font-medium hover:bg-positive/20 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Complete
              </button>
            </>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); handleStatusChange('pending'); }}
              className="flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-surface-3 text-ink text-[12px] font-medium hover:bg-hairline-strong transition-colors"
            >
              <Clock className="w-3.5 h-3.5" />
              Reopen
            </button>
          )}
        </div>
        
        {/* Quick checkbox for completion - circular */}        
        <div className="flex items-center gap-2 pt-2 border-t border-hairline">
          <div onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={showingCompleted}
              onChange={(e) => handleCheckboxChange(e.target.checked)}
              className="h-4 w-4 rounded-md accent-brand cursor-pointer"
            />
          </div>
          <span className="text-[12px] text-ink-muted">
            Mark as {showingCompleted ? 'incomplete' : 'complete'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
