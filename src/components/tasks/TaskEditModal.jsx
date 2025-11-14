import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { 
  X, 
  Trash2,
  Calendar,
  Flag,
  Tag,
  Bell,
  Plus,
  ChevronRight,
  Inbox,
  ChevronDown,
  CheckSquare,
  MessageSquare,
  Paperclip,
  MoreHorizontal
} from 'lucide-react';
import { DailyTask } from '../../entities/DailyTask';
import { useAuth } from '../../contexts/AuthContext';

const TaskEditModal = ({ task, isOpen, onClose, onSave, onDelete }) => {
  const { currentUser } = useAuth();
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'medium',
    dueDate: '',
    estimatedTime: '',
    project: 'Inbox',
    labels: [],
    reminders: [],
    subtasks: []
  });
  const [newSubtask, setNewSubtask] = useState('');
  const [newComment, setNewComment] = useState('');
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showLabelInput, setShowLabelInput] = useState(false);
  const [newLabel, setNewLabel] = useState('');

  useEffect(() => {
    if (task && isOpen) {
      setEditForm({
        title: task.title || '',
        description: task.description || '',
        category: task.category || '',
        priority: task.priority || 'medium',
        dueDate: task.due_date || '',
        estimatedTime: task.estimated_time || '',
        project: task.project || 'Inbox',
        labels: task.labels || [],
        reminders: task.reminders || [],
        subtasks: task.subtasks || []
      });
    }
  }, [task, isOpen]);

  const handleSubmit = async () => {
    await onSave({
      ...task,
      title: editForm.title,
      description: editForm.description,
      category: editForm.category,
      priority: editForm.priority,
      due_date: editForm.dueDate,
      estimated_time: editForm.estimatedTime,
      project: editForm.project,
      labels: editForm.labels,
      reminders: editForm.reminders,
      subtasks: editForm.subtasks
    });
  };

  const handleDelete = () => {
    if (window.confirm(`Delete "${task.title}"?`)) {
      onDelete(task);
    }
  };

  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return;
    
    const subtask = {
      id: Date.now(),
      text: newSubtask.trim(),
      completed: false
    };
    
    setEditForm(prev => ({
      ...prev,
      subtasks: [...prev.subtasks, subtask]
    }));
    setNewSubtask('');
  };

  const toggleSubtask = async (subtaskId) => {
    const updatedSubtasks = editForm.subtasks.map(st => 
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    
    setEditForm(prev => ({
      ...prev,
      subtasks: updatedSubtasks
    }));
    
    // Auto-save subtask change
    await DailyTask.update(task.id, { subtasks: updatedSubtasks });
  };

  const handleAddLabel = () => {
    if (!newLabel.trim()) return;
    
    const updatedLabels = [...editForm.labels, newLabel.trim()];
    setEditForm(prev => ({
      ...prev,
      labels: updatedLabels
    }));
    
    DailyTask.update(task.id, { labels: updatedLabels });
    setNewLabel('');
    setShowLabelInput(false);
  };

  const removeLabel = (labelToRemove) => {
    const updatedLabels = editForm.labels.filter(l => l !== labelToRemove);
    setEditForm(prev => ({
      ...prev,
      labels: updatedLabels
    }));
    
    DailyTask.update(task.id, { labels: updatedLabels });
  };

  const handleDateChange = (newDate) => {
    setEditForm(prev => ({ ...prev, dueDate: newDate }));
    DailyTask.update(task.id, { due_date: newDate });
    setShowDatePicker(false);
  };

  const removeDate = () => {
    setEditForm(prev => ({ ...prev, dueDate: '' }));
    DailyTask.update(task.id, { due_date: null });
  };

  const priorities = [
    { value: 'urgent', label: 'Priority 1', icon: <Flag className="w-4 h-4 fill-red-600 stroke-red-600" /> },
    { value: 'high', label: 'Priority 2', icon: <Flag className="w-4 h-4 fill-orange-500 stroke-orange-500" /> },
    { value: 'medium', label: 'Priority 3', icon: <Flag className="w-4 h-4 fill-blue-500 stroke-blue-500" /> },
    { value: 'low', label: 'Priority 4', icon: <Flag className="w-4 h-4 stroke-gray-400" /> }
  ];

  const projects = ['Inbox', 'Client Work', 'Marketing', 'Operations', 'Sales', 'Personal'];

  if (!isOpen || !task) return null;

  const currentPriority = priorities.find(p => p.value === editForm.priority) || priorities[2];

  return createPortal(
    <div className="modal-overlay bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white w-full max-w-4xl shadow-2xl overflow-y-auto rounded-lg max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Bar */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2 text-gray-600">
            <Inbox className="w-4 h-4" />
            <span className="text-sm">{editForm.project}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <ChevronDown className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex">
          {/* Left Panel - Main Content */}
          <div className="flex-1 px-8 py-6">
            {/* Task Title with Checkbox */}
            <div className="flex items-start gap-3 mb-6">
              <div className="pt-1" data-no-drag>
                <Checkbox
                  checked={task.status === 'completed'}
                  onCheckedChange={(checked) => {
                    onSave({
                      ...task,
                      status: checked ? 'completed' : 'pending'
                    });
                  }}
                />
              </div>
              <input
                type="text"
                value={editForm.title}
                onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                onBlur={handleSubmit}
                className="flex-1 text-lg font-semibold border-none outline-none focus:ring-0 p-0"
                placeholder="Task name"
              />
            </div>

            {/* Description */}
            <div className="mb-6">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <div className="flex items-center gap-1">
                  <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                  <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                  <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                </div>
                <span className="text-sm">Description</span>
              </div>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                onBlur={handleSubmit}
                className="w-full text-sm border-none outline-none focus:ring-0 p-0 resize-none placeholder-gray-400"
                placeholder="Add description..."
                rows={3}
              />
            </div>

            {/* Sub-tasks */}
            <div className="mb-6">
              {editForm.subtasks && editForm.subtasks.length > 0 && (
                <div className="space-y-2 mb-3">
                  {editForm.subtasks.map((subtask) => (
                    <div key={subtask.id} className="flex items-center gap-3">
                      <Checkbox
                        checked={subtask.completed}
                        onCheckedChange={() => toggleSubtask(subtask.id)}
                      />
                      <span className={`text-sm ${subtask.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                        {subtask.text}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddSubtask()}
                  placeholder="Add sub-task"
                  className="flex-1 text-sm border-none outline-none focus:ring-0 p-0 placeholder-gray-400"
                />
              </div>
            </div>

            {/* Comments */}
            <div className="mt-8">
              <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                  {currentUser?.firstName?.[0] || 'U'}
                </div>
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Comment"
                  className="flex-1 text-sm border-none outline-none focus:ring-0 p-0 placeholder-gray-400"
                />
                <button className="text-gray-400 hover:text-gray-600">
                  <Paperclip className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Properties */}
          <div className="w-64 border-l border-gray-200 px-6 py-6 space-y-4 flex-shrink-0">
            {/* Project */}
            <div className="relative">
              <button
                onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                className="w-full flex items-center justify-between py-2 hover:bg-gray-50 rounded px-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Project</span>
                </div>
              </button>
              <div className="flex items-center gap-2 text-sm text-gray-600 px-2 mt-1">
                <Inbox className="w-4 h-4" />
                <span>{editForm.project}</span>
              </div>
              
              {showProjectDropdown && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-20">
                  {projects.map((project) => (
                    <button
                      key={project}
                      onClick={() => {
                        setEditForm(prev => ({ ...prev, project }));
                        setShowProjectDropdown(false);
                        DailyTask.update(task.id, { project });
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-sm text-left"
                    >
                      <Inbox className="w-4 h-4" />
                      <span>{project}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Date */}
            <div className="relative">
              <div className="flex items-center justify-between py-2 px-2">
                <span className="text-sm font-medium text-gray-700">Date</span>
                {!editForm.dueDate && (
                  <button 
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>
              {editForm.dueDate ? (
                <div className="flex items-center justify-between px-2 mt-1 group">
                  <button
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:bg-gray-50 px-2 py-1 rounded flex-1"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(editForm.dueDate + 'T00:00:00').toLocaleDateString()}</span>
                  </button>
                  <button
                    onClick={removeDate}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 p-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : null}
              
              {showDatePicker && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-lg shadow-xl border border-gray-200 p-3 z-20">
                  <input
                    type="date"
                    value={editForm.dueDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="mt-2 space-y-1">
                    {[
                      { label: 'Today', value: new Date().toISOString().split('T')[0] },
                      { label: 'Tomorrow', value: new Date(Date.now() + 86400000).toISOString().split('T')[0] },
                      { label: 'Next week', value: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0] }
                    ].map((option) => (
                      <button
                        key={option.label}
                        onClick={() => handleDateChange(option.value)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded text-sm"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Priority */}
            <div className="relative">
              <button
                onClick={() => setShowPriorityDropdown(!showPriorityDropdown)}
                className="w-full flex items-center justify-between py-2 hover:bg-gray-50 rounded px-2"
              >
                <span className="text-sm font-medium text-gray-700">Priority</span>
              </button>
              <div className="flex items-center gap-2 text-sm px-2 mt-1">
                {currentPriority.icon}
                <span className="text-gray-600">{currentPriority.label.replace('Priority ', 'P')}</span>
              </div>

              {showPriorityDropdown && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-20">
                  {priorities.map((priority) => (
                    <button
                      key={priority.value}
                      onClick={() => {
                        setEditForm(prev => ({ ...prev, priority: priority.value }));
                        setShowPriorityDropdown(false);
                        handleSubmit();
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-sm text-left"
                    >
                      {priority.icon}
                      <span>{priority.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Labels */}
            <div className="relative">
              <div className="flex items-center justify-between py-2 px-2">
                <span className="text-sm font-medium text-gray-700">Labels</span>
                <button 
                  onClick={() => setShowLabelInput(!showLabelInput)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              
              {showLabelInput && (
                <div className="px-2 mb-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddLabel()}
                      placeholder="Label name..."
                      className="flex-1 text-sm px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <Button
                      onClick={handleAddLabel}
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      Add
                    </Button>
                  </div>
                </div>
              )}
              
              {editForm.labels && editForm.labels.length > 0 && (
                <div className="flex flex-wrap gap-1 px-2 mt-1">
                  {editForm.labels.map((label, idx) => (
                    <span 
                      key={idx} 
                      className="group text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded flex items-center gap-1 hover:bg-purple-200 cursor-pointer"
                      onClick={() => removeLabel(label)}
                    >
                      {label}
                      <X className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Reminders */}
            <div>
              <div className="flex items-center justify-between py-2 px-2">
                <span className="text-sm font-medium text-gray-700">Reminders</span>
                <button className="text-gray-400 hover:text-gray-600">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Delete Button at Bottom */}
            <div className="pt-8 mt-auto">
              <Button
                onClick={handleDelete}
                variant="ghost"
                className="w-full text-red-600 hover:bg-red-50 hover:text-red-700 justify-start"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete task
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default TaskEditModal;
