import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
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
  CheckSquare
} from 'lucide-react';

const TaskCard = ({ task, onStatusChange, onEdit, onDelete, canEdit = true, canDelete = true }) => {
  const [showActions, setShowActions] = useState(false);

  // Helper function to parse dates as local dates (same as TasksPage)
  const parseLocalDate = (dateString) => {
    if (!dateString) return null;
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day); // month is 0-indexed
  };

  // Helper function to check if date is today (local date comparison)
  const isTodayLocal = (dateString) => {
    if (!dateString) return false;
    const taskDate = parseLocalDate(dateString);
    const today = new Date();
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return taskDate.getTime() === todayOnly.getTime();
  };

  // Helper function to check if date is in the past (local date comparison)
  const isPastLocal = (dateString) => {
    if (!dateString) return false;
    const taskDate = parseLocalDate(dateString);
    const today = new Date();
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return taskDate < todayOnly;
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'urgent':
        return <Zap className="w-4 h-4 text-red-500" />;
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'medium':
        return <TrendingUp className="w-4 h-4 text-blue-500" />;
      case 'low':
        return <Clock className="w-4 h-4 text-gray-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'border-red-300 bg-red-50 text-red-700';
      case 'high':
        return 'border-orange-300 bg-orange-50 text-orange-700';
      case 'medium':
        return 'border-blue-300 bg-blue-50 text-blue-700';
      case 'low':
        return 'border-gray-300 bg-gray-50 text-gray-700';
      default:
        return 'border-gray-300 bg-gray-50 text-gray-700';
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
        return 'border-green-300 bg-green-50 text-green-700';
      case 'in_progress':
        return 'border-blue-300 bg-blue-50 text-blue-700';
      case 'pending':
        return 'border-gray-300 bg-gray-50 text-gray-700';
      default:
        return 'border-gray-300 bg-gray-50 text-gray-700';
    }
  };

  const getDueDateStatus = (dueDate) => {
    if (!dueDate) return { text: 'No due date', color: 'text-gray-500' };
    
    if (isTodayLocal(dueDate)) {
      return { text: 'Due today', color: 'text-orange-600' };
    } else if (isPastLocal(dueDate)) {
      return { text: 'Overdue', color: 'text-red-600' };
    } else {
      const taskDate = parseLocalDate(dueDate);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[taskDate.getMonth()];
      const day = taskDate.getDate();
      return { text: `Due ${month} ${day}`, color: 'text-gray-600' };
    }
  };

  const handleStatusChange = (newStatus) => {
    onStatusChange(task.id, newStatus);
  };

  const isCompleted = task.status === 'completed';
  const dueDateStatus = getDueDateStatus(task.due_date);
  const isOverdue = task.due_date && isPastLocal(task.due_date) && !isTodayLocal(task.due_date) && task.status !== 'completed';

  return (
    <Card className={`h-full transition-all duration-200 hover:shadow-md ${
      isCompleted 
        ? 'border-green-200 bg-green-50/30' 
        : isOverdue
        ? 'border-red-200 bg-red-50/30'
        : 'border-gray-200 hover:border-blue-300'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className={`text-lg font-semibold mb-2 line-clamp-2 ${
              isCompleted ? 'line-through text-gray-500' : 'text-gray-900'
            }`}>
              {task.title}
            </CardTitle>
            
            <div className="flex items-center gap-2 mb-3">
              {/* Todoist-style Priority Flag */}
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded ${task.priorityFlag.bgColor}`}>
                <Flag className={`w-3.5 h-3.5 ${task.priorityFlag.color} fill-current`} />
                <span className={`text-xs font-semibold ${task.priorityFlag.color}`}>
                  {task.priorityFlag.label}
                </span>
              </div>
              
              <Badge 
                variant="outline" 
                className={`text-xs font-medium ${getStatusColor(task.status)}`}
              >
                {getStatusText(task.status)}
              </Badge>
              
              {/* Show subtask progress if exists */}
              {task.subtasks && task.subtasks.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <CheckSquare className="w-3 h-3" />
                  <span>{task.subtaskProgress}</span>
                </div>
              )}
              
              {/* Show comment count if exists */}
              {task.comments && task.comments.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <MessageSquare className="w-3 h-3" />
                  <span>{task.comments.length}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setShowActions(!showActions)}
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
            
            {showActions && (
              <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <div className="py-1">
                  <button
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    onClick={() => {
                      setShowActions(false);
                      onEdit(task);
                    }}
                  >
                    <Edit className="w-3 h-3" />
                    Edit
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    onClick={() => {
                      setShowActions(false);
                      onDelete(task);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <p className={`text-sm line-clamp-3 ${
          isCompleted ? 'text-gray-400' : 'text-gray-600'
        }`}>
          {task.description}
        </p>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            {/* Contextual date display (Todoist-style) */}
            {task.formattedDueDate ? (
              <div className="flex items-center gap-1.5">
                <Calendar className={`w-3 h-3 ${task.formattedDueDate.color}`} />
                <span className={`font-medium ${task.formattedDueDate.color}`}>
                  {task.formattedDueDate.text}
                </span>
              </div>
            ) : (
              <span className="text-gray-400">No due date</span>
            )}
            {task.estimated_time && (
              <span className="text-gray-500">
                ⏱ {task.formattedTime}
              </span>
            )}
          </div>
          
          {task.category && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Target className="w-3 h-3" />
              <span>Category: {task.category}</span>
            </div>
          )}
          
          {/* Labels display */}
          {task.labels && task.labels.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {task.labels.map((label, index) => (
                <Badge 
                  key={index} 
                  variant="outline"
                  className="text-xs px-2 py-0.5 bg-purple-50 text-purple-700 border-purple-200"
                >
                  {label}
                </Badge>
              ))}
            </div>
          )}
          
          {task.assignedBy && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>Assigned by: {task.assignedBy}</span>
            </div>
          )}
        </div>
        
        {/* Subtasks display */}
        {task.subtasks && task.subtasks.length > 0 && (
          <div className="pt-3 border-t border-gray-100">
            <div className="text-xs font-medium text-gray-600 mb-2 flex items-center justify-between">
              <span>Subtasks ({task.subtaskProgress})</span>
              <div className="flex-1 mx-2 bg-gray-200 rounded-full h-1.5">
                <div 
                  className="bg-blue-600 h-1.5 rounded-full transition-all"
                  style={{ width: `${task.subtaskPercentage}%` }}
                ></div>
              </div>
            </div>
            <div className="space-y-1.5 max-h-24 overflow-y-auto">
              {task.subtasks.slice(0, 3).map((subtask) => (
                <div key={subtask.id} className="flex items-center gap-2 text-xs">
                  <Checkbox
                    checked={subtask.completed}
                    disabled
                    className="h-3 w-3"
                  />
                  <span className={subtask.completed ? 'line-through text-gray-400' : 'text-gray-600'}>
                    {subtask.text}
                  </span>
                </div>
              ))}
              {task.subtasks.length > 3 && (
                <p className="text-xs text-gray-400">
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
              <Button
                onClick={() => handleStatusChange('in_progress')}
                variant={task.status === 'in_progress' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                disabled={task.status === 'in_progress'}
              >
                {task.status === 'in_progress' ? 'In Progress' : 'Start'}
              </Button>
              
              <Button
                onClick={() => handleStatusChange('completed')}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Complete
              </Button>
            </>
          ) : (
            <Button
              onClick={() => handleStatusChange('pending')}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <Clock className="w-4 h-4 mr-1" />
              Reopen
            </Button>
          )}
        </div>
        
        {/* Quick checkbox for completion */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
          <Checkbox
            checked={isCompleted}
            onCheckedChange={(checked) => handleStatusChange(checked ? 'completed' : 'pending')}
            className="mt-1"
          />
          <span className="text-sm text-gray-600">
            Mark as {isCompleted ? 'incomplete' : 'complete'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default TaskCard;
