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
        return <Zap className="w-4 h-4 text-[#ff3b30]" />;
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-[#ff9500]" />;
      case 'medium':
        return <TrendingUp className="w-4 h-4 text-[#0071e3]" />;
      case 'low':
        return <Clock className="w-4 h-4 text-[#86868b]" />;
      default:
        return <Clock className="w-4 h-4 text-[#86868b]" />;
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
        return 'bg-[#34c759]/10 text-[#34c759]';
      case 'in_progress':
        return 'bg-[#0071e3]/10 text-[#0071e3]';
      case 'pending':
        return 'bg-black/5 dark:bg-white/10 text-[#86868b]';
      default:
        return 'bg-black/5 dark:bg-white/10 text-[#86868b]';
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
      className={`h-full p-4 rounded-2xl transition-all duration-200 cursor-pointer border ${
        isCompleted 
          ? 'bg-[#34c759]/5 border-[#34c759]/20' 
          : isOverdue
          ? 'bg-[#ff3b30]/5 border-[#ff3b30]/20'
          : 'bg-white dark:bg-[#1d1d1f] border-black/5 dark:border-white/10 hover:border-[#0071e3]/30 hover:shadow-lg'
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
                className="text-[15px] font-semibold mb-2 w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                autoFocus
              />
            ) : (
              <h3 
                className={`text-[15px] font-semibold mb-2 line-clamp-2 cursor-text hover:bg-black/5 dark:hover:bg-white/5 px-2 py-1 rounded-lg transition-colors ${
              isCompleted ? 'line-through text-[#86868b]' : 'text-[#1d1d1f] dark:text-white'
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
                task.priority === 'urgent' ? 'bg-[#ff3b30]/10' :
                task.priority === 'high' ? 'bg-[#ff9500]/10' :
                task.priority === 'medium' ? 'bg-[#0071e3]/10' :
                'bg-black/5 dark:bg-white/10'
              }`}>
                <Flag className={`w-3.5 h-3.5 ${
                  task.priority === 'urgent' ? 'text-[#ff3b30]' :
                  task.priority === 'high' ? 'text-[#ff9500]' :
                  task.priority === 'medium' ? 'text-[#0071e3]' :
                  'text-[#86868b]'
                } fill-current`} />
                <span className={`text-[11px] font-semibold ${
                  task.priority === 'urgent' ? 'text-[#ff3b30]' :
                  task.priority === 'high' ? 'text-[#ff9500]' :
                  task.priority === 'medium' ? 'text-[#0071e3]' :
                  'text-[#86868b]'
                }`}>
                  {task.priorityFlag?.label || task.priority}
                </span>
              </div>
              
              <span className={`text-[11px] font-medium px-2 py-1 rounded-lg ${getStatusColor(task.status)}`}>
                {getStatusText(task.status)}
              </span>
              
              {/* Show subtask progress if exists */}
              {task.subtasks && task.subtasks.length > 0 && (
                <div className="flex items-center gap-1 text-[11px] text-[#86868b]">
                  <CheckSquare className="w-3 h-3" />
                  <span>{task.subtaskProgress}</span>
                </div>
              )}
              
              {/* Show comment count if exists */}
              {task.comments && task.comments.length > 0 && (
                <div className="flex items-center gap-1 text-[11px] text-[#86868b]">
                  <MessageSquare className="w-3 h-3" />
                  <span>{task.comments.length}</span>
                </div>
              )}
              
              {/* Show recurring indicator */}
              {task.recurring && (
                <div className="flex items-center gap-1 text-[11px] text-[#34c759]">
                  <Repeat className="w-3 h-3" />
                  <span>{task.recurring.pattern}</span>
                </div>
              )}
              
              {/* Show reminder indicator */}
              {task.reminders && task.reminders.length > 0 && (
                <div className="flex items-center gap-1 text-[11px] text-[#0071e3]">
                  <Bell className="w-3 h-3" />
                  <span>{task.reminders.length}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="relative">
            <button
              className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setShowActions(!showActions);
              }}
            >
              <MoreHorizontal className="w-5 h-5 text-[#86868b]" />
            </button>
            
            {showActions && (
              <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-[#2c2c2e] border border-black/10 dark:border-white/10 rounded-xl shadow-lg z-10 overflow-hidden">
                <div className="py-1">
                  <button
                    className="w-full text-left px-3 py-2 text-[13px] text-[#1d1d1f] dark:text-white hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2"
                    onClick={() => {
                      setShowActions(false);
                      onEdit(task);
                    }}
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 text-[13px] text-[#ff3b30] hover:bg-[#ff3b30]/5 flex items-center gap-2"
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
                      className="w-full text-left px-3 py-2 text-[13px] text-[#86868b] hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2"
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
            className="text-[13px] w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none"
            rows={3}
            autoFocus
          />
        ) : (
          <p 
            className={`text-[13px] line-clamp-3 cursor-text hover:bg-black/5 dark:hover:bg-white/5 px-2 py-1 rounded-lg transition-colors ${
          isCompleted ? 'text-[#86868b]/60' : 'text-[#86868b]'
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
                  task.formattedDueDate.color?.includes('red') ? 'text-[#ff3b30]' :
                  task.formattedDueDate.color?.includes('orange') ? 'text-[#ff9500]' :
                  'text-[#86868b]'
                }`} />
                <span className={`font-medium ${
                  task.formattedDueDate.color?.includes('red') ? 'text-[#ff3b30]' :
                  task.formattedDueDate.color?.includes('orange') ? 'text-[#ff9500]' :
                  'text-[#86868b]'
                }`}>
                  {task.formattedDueDate.text}
            </span>
              </div>
            ) : (
              <span className="text-[#86868b]/60">No due date</span>
            )}
            {task.estimated_time && (
              <span className="text-[#86868b]">
                ⏱ {task.formattedTime}
              </span>
            )}
          </div>
          
          {task.project && (
            <div className="flex items-center gap-2 text-[11px] text-[#1d1d1f] dark:text-white font-medium">
              <Target className="w-3 h-3 text-[#5856d6]" />
              <span>{task.project}{task.section ? ` / ${task.section}` : ''}</span>
            </div>
          )}
          
          {!task.project && task.category && (
          <div className="flex items-center gap-2 text-[11px] text-[#86868b]">
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
                  className="text-[10px] px-2 py-0.5 rounded-md bg-[#af52de]/10 text-[#af52de]"
                >
                  {label}
                </span>
              ))}
            </div>
          )}
          
          {task.assignedBy && (
            <div className="flex items-center gap-2 text-[11px] text-[#86868b]">
              <span>Assigned by: {task.assignedBy}</span>
            </div>
          )}
        </div>
        
        {/* Subtasks display */}
        {task.subtasks && task.subtasks.length > 0 && (
          <div className="pt-3 border-t border-black/5 dark:border-white/10">
            <div className="text-[11px] font-medium text-[#86868b] mb-2 flex items-center justify-between">
              <span>Subtasks ({task.subtaskProgress})</span>
              <div className="flex-1 mx-2 bg-black/5 dark:bg-white/10 rounded-full h-1.5">
                <div 
                  className="bg-[#0071e3] h-1.5 rounded-full transition-all"
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
                    className="h-3 w-3 rounded accent-[#0071e3]"
                  />
                  <span className={subtask.completed ? 'line-through text-[#86868b]/60' : 'text-[#86868b]'}>
                    {subtask.text}
                  </span>
                </div>
              ))}
              {task.subtasks.length > 3 && (
                <p className="text-[11px] text-[#86868b]/60">
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
                    ? 'bg-[#0071e3] text-white' 
                    : 'bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15'
                } disabled:opacity-50`}
              >
                {task.status === 'in_progress' ? 'In Progress' : 'Start'}
              </button>
              
              <button
                onClick={(e) => { e.stopPropagation(); handleStatusChange('completed'); }}
                className="flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-[#34c759]/10 text-[#34c759] text-[12px] font-medium hover:bg-[#34c759]/20 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Complete
              </button>
            </>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); handleStatusChange('pending'); }}
              className="flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[12px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
            >
              <Clock className="w-3.5 h-3.5" />
              Reopen
            </button>
          )}
        </div>
        
        {/* Quick checkbox for completion - circular */}        
        <div className="flex items-center gap-2 pt-2 border-t border-black/5 dark:border-white/10">
          <div onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={showingCompleted}
              onChange={(e) => handleCheckboxChange(e.target.checked)}
              className="h-4 w-4 rounded-md accent-[#0071e3] cursor-pointer"
            />
          </div>
          <span className="text-[12px] text-[#86868b]">
            Mark as {showingCompleted ? 'incomplete' : 'complete'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
