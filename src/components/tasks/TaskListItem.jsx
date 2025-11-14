import React from 'react';
import { Checkbox } from '../ui/checkbox';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Flag,
  Calendar,
  CheckSquare,
  MessageSquare,
  Repeat,
  Bell,
  MoreHorizontal,
  Target
} from 'lucide-react';

const TaskListItem = ({ task, onStatusChange, onEdit, isSelected, onToggleSelect, bulkMode }) => {
  const isCompleted = task.status === 'completed';

  return (
    <div className={`flex items-center gap-3 p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors group ${
      isCompleted ? 'bg-green-50/30' : ''
    }`}>
      {/* Bulk selection checkbox */}
      {bulkMode && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(task.id)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        />
      )}

      {/* Complete checkbox - circular */}
      <Checkbox
        checked={isCompleted}
        onCheckedChange={(checked) => onStatusChange(task.id, checked ? 'completed' : 'pending')}
        className="flex-shrink-0 rounded-full"
      />

      {/* Priority Flag */}
      <div className={`flex items-center justify-center w-6 h-6 rounded ${task.priorityFlag.bgColor} flex-shrink-0`}>
        <Flag className={`w-3.5 h-3.5 ${task.priorityFlag.color} fill-current`} />
      </div>

      {/* Task Title and Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 
            className={`font-medium text-sm truncate ${
              isCompleted ? 'line-through text-gray-500' : 'text-gray-900'
            }`}
            title={task.title}
          >
            {task.title}
          </h3>
          
          {/* Indicators */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {task.subtasks && task.subtasks.length > 0 && (
              <div className="flex items-center gap-0.5 text-xs text-gray-600">
                <CheckSquare className="w-3 h-3" />
                <span>{task.subtaskProgress}</span>
              </div>
            )}
            {task.comments && task.comments.length > 0 && (
              <div className="flex items-center gap-0.5 text-xs text-gray-600">
                <MessageSquare className="w-3 h-3" />
                <span>{task.comments.length}</span>
              </div>
            )}
            {task.recurring && (
              <Repeat className="w-3 h-3 text-green-600" />
            )}
            {task.reminders && task.reminders.length > 0 && (
              <Bell className="w-3 h-3 text-blue-600" />
            )}
          </div>
        </div>
        
        {/* Project/Labels/Description row */}
        <div className="flex items-center gap-2 text-xs">
          {task.project && (
            <div className="flex items-center gap-1 text-indigo-600">
              <Target className="w-3 h-3" />
              <span className="font-medium">{task.project}{task.section ? ` / ${task.section}` : ''}</span>
            </div>
          )}
          {task.labels && task.labels.length > 0 && (
            <div className="flex gap-1">
              {task.labels.slice(0, 2).map((label, index) => (
                <Badge 
                  key={index} 
                  variant="outline"
                  className="text-xs px-1.5 py-0 bg-purple-50 text-purple-700 border-purple-200"
                >
                  {label}
                </Badge>
              ))}
              {task.labels.length > 2 && (
                <span className="text-gray-400">+{task.labels.length - 2}</span>
              )}
            </div>
          )}
          {task.description && (
            <span className="text-gray-500 truncate max-w-xs">{task.description}</span>
          )}
        </div>
      </div>

      {/* Due Date */}
      {task.formattedDueDate && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <Calendar className={`w-3 h-3 ${task.formattedDueDate.color}`} />
          <span className={`text-xs font-medium ${task.formattedDueDate.color}`}>
            {task.formattedDueDate.text}
          </span>
        </div>
      )}

      {/* Actions */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        onClick={() => onEdit(task)}
      >
        <MoreHorizontal className="w-5 h-5" />
      </Button>
    </div>
  );
};

export default TaskListItem;

