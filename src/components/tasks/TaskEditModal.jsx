import React, { useState, useEffect, useRef } from 'react';
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

const TaskEditModal = ({ task, isOpen, onClose, onSave, onDelete, tasks = [], onNavigate }) => {
  const { currentUser } = useAuth();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'medium',
    dueDate: '',
    dueTime: '',
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

  const projectDropdownRef = useRef(null);
  const datePickerRef = useRef(null);
  const priorityDropdownRef = useRef(null);
  const labelInputRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedInsideProject = projectDropdownRef.current?.contains(event.target);
      const clickedInsideDate = datePickerRef.current?.contains(event.target);
      const clickedInsidePriority = priorityDropdownRef.current?.contains(event.target);
      const clickedInsideLabel = labelInputRef.current?.contains(event.target);
      
      if (!clickedInsideProject && !clickedInsideDate && !clickedInsidePriority && !clickedInsideLabel) {
        setShowProjectDropdown(false);
        setShowDatePicker(false);
        setShowPriorityDropdown(false);
        setShowLabelInput(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  useEffect(() => {
    if (task && isOpen) {
      setEditForm({
        title: task.title || '',
        description: task.description || '',
        category: task.category || '',
        priority: task.priority || 'medium',
        dueDate: task.due_date || '',
        dueTime: task.due_time || '',
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
      due_date: editForm.dueDate || null,
      due_time: editForm.dueTime || null,
      estimated_time: editForm.estimatedTime || null,
      project: editForm.project || 'Inbox',
      labels: editForm.labels || [],
      reminders: editForm.reminders || [],
      subtasks: editForm.subtasks || []
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

  const handleAddLabel = async () => {
    if (!newLabel.trim()) return;
    
    const updatedLabels = [...(editForm.labels || []), newLabel.trim()];
    setEditForm(prev => ({
      ...prev,
      labels: updatedLabels
    }));
    
    await DailyTask.update(task.id, { labels: updatedLabels });
    setNewLabel('');
    setShowLabelInput(false);
  };

  const removeLabel = async (labelToRemove) => {
    const updatedLabels = (editForm.labels || []).filter(l => l !== labelToRemove);
    setEditForm(prev => ({
      ...prev,
      labels: updatedLabels
    }));
    
    await DailyTask.update(task.id, { labels: updatedLabels });
  };

  const handleDateChange = (newDate) => {
    setEditForm(prev => ({ ...prev, dueDate: newDate }));
    DailyTask.update(task.id, { due_date: newDate || null });
  };

  const handleTimeChange = (newTime) => {
    setEditForm(prev => ({ ...prev, dueTime: newTime }));
    DailyTask.update(task.id, { due_time: newTime || null });
  };

  const removeDate = () => {
    setEditForm(prev => ({ ...prev, dueDate: '', dueTime: '' }));
    DailyTask.update(task.id, { due_date: null, due_time: null });
    setShowDatePicker(false);
  };

  // Close all dropdowns
  const closeAllDropdowns = () => {
    setShowPriorityDropdown(false);
    setShowProjectDropdown(false);
    setShowDatePicker(false);
    setShowLabelInput(false);
  };

  // Open one dropdown and close others
  const openDropdown = (dropdownSetter) => {
    closeAllDropdowns();
    dropdownSetter(true);
  };

  // Navigate to next task
  const goToNextTask = () => {
    if (!tasks || tasks.length === 0) return;
    const currentIndex = tasks.findIndex(t => t.id === task.id);
    const nextIndex = (currentIndex + 1) % tasks.length;
    onNavigate(tasks[nextIndex]);
  };

  // Navigate to previous task
  const goToPreviousTask = () => {
    if (!tasks || tasks.length === 0) return;
    const currentIndex = tasks.findIndex(t => t.id === task.id);
    const prevIndex = currentIndex - 1 < 0 ? tasks.length - 1 : currentIndex - 1;
    onNavigate(tasks[prevIndex]);
  };

  // Duplicate task
  const duplicateTask = async () => {
    if (!currentUser?.email) {
      alert('You must be logged in to duplicate tasks');
      return;
    }

    const duplicatedTask = {
      title: editForm.title,
      description: editForm.description || '',
      category: editForm.category || '',
      priority: editForm.priority || 'medium',
      due_date: editForm.dueDate || null,
      due_time: editForm.dueTime || null,
      estimated_time: editForm.estimatedTime || null,
      project: editForm.project || null,
      section: editForm.section || null,
      labels: editForm.labels || [],
      subtasks: (editForm.subtasks || []).map(st => ({ ...st, completed: false })),
      recurring: null, // Don't duplicate recurring pattern
      reminders: [], // Don't duplicate reminders
      status: 'pending',
      assigned_to: currentUser.email, // CRITICAL: Must assign to current user
      createdBy: currentUser.email
    };
    
    try {
      console.log('Duplicating task with data:', duplicatedTask);
      const newTask = await DailyTask.create(duplicatedTask);
      console.log('✅ Task duplicated successfully:', newTask);
      alert('Task duplicated successfully!');
      setShowMoreMenu(false);
    } catch (error) {
      console.error('❌ Error duplicating task:', error);
      alert(`Failed to duplicate task: ${error.message}`);
    }
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
        className="bg-white w-full max-w-6xl shadow-2xl overflow-y-auto rounded-lg max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Bar */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2 text-gray-600">
            <Inbox className="w-4 h-4" />
            <span className="text-sm">{editForm.project}</span>
          </div>
          <div className="flex items-center gap-1 relative">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                goToNextTask();
              }}
              title="Next task (→)"
              disabled={!tasks || tasks.length <= 1}
              className="relative group"
            >
              <ChevronRight className="w-4 h-4" />
              <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                Next task
              </span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                goToPreviousTask();
              }}
              title="Previous task (←)"
              disabled={!tasks || tasks.length <= 1}
              className="relative group"
            >
              <ChevronDown className="w-4 h-4" />
              <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                Previous task
              </span>
            </Button>
            <div className="relative">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMoreMenu(!showMoreMenu);
                }}
                title="More options"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
              
              {showMoreMenu && (
                <div className="absolute top-full right-0 mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-20">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateTask();
                      setShowMoreMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-sm text-left text-gray-900"
                  >
                    <CheckSquare className="w-4 h-4" />
                    Duplicate task
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`mailto:?subject=${encodeURIComponent(editForm.title)}&body=${encodeURIComponent(editForm.description)}`, '_blank');
                      setShowMoreMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-sm text-left text-gray-900"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Share via email
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const taskText = `${editForm.title}\n${editForm.description}\nPriority: ${editForm.priority}\nDue: ${editForm.dueDate || 'No date'}`;
                      navigator.clipboard.writeText(taskText);
                      alert('Task details copied to clipboard!');
                      setShowMoreMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-sm text-left text-gray-900"
                  >
                    <Paperclip className="w-4 h-4" />
                    Copy task details
                  </button>
                </div>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }} 
              title="Close"
            >
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
                <div className="flex flex-col gap-0.5">
                  <div className="w-3 h-0.5 bg-gray-400 rounded"></div>
                  <div className="w-3 h-0.5 bg-gray-400 rounded"></div>
                  <div className="w-3 h-0.5 bg-gray-400 rounded"></div>
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
          <div className="w-80 border-l border-gray-200 px-6 py-6 space-y-4 flex-shrink-0">
            {/* Project */}
            <div className="relative" ref={projectDropdownRef}>
              <div className="py-2 px-2">
                <span className="text-sm font-medium text-gray-700">Project</span>
              </div>
              <button
                onClick={() => openDropdown(setShowProjectDropdown)}
                className="w-full flex items-center gap-2 text-sm text-gray-600 px-2 mt-1 hover:bg-gray-50 py-1 rounded"
              >
                <Inbox className="w-4 h-4" />
                <span>{editForm.project}</span>
              </button>
              
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
            <div className="relative" ref={datePickerRef}>
              <div className="flex items-center justify-between py-2 px-2">
                <span className="text-sm font-medium text-gray-700">Date</span>
                {!editForm.dueDate && (
                  <button 
                    onClick={() => openDropdown(setShowDatePicker)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>
              {editForm.dueDate ? (
                <div className="flex items-center justify-between px-2 mt-1 group">
                  <button
                    onClick={() => openDropdown(setShowDatePicker)}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:bg-gray-50 px-2 py-1 rounded flex-1"
                  >
                    <Calendar className="w-4 h-4" />
                    <div className="flex flex-col items-start">
                      <span>{new Date(editForm.dueDate + 'T00:00:00').toLocaleDateString()}</span>
                      {editForm.dueTime && (
                        <span className="text-xs text-gray-500">
                          {new Date(`2000-01-01T${editForm.dueTime}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
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
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                  />
                  
                  {/* Time picker */}
                  {editForm.dueDate && (
                    <div className="mb-2">
                      <label className="text-xs text-gray-600 mb-1 block">Time (optional)</label>
                      <input
                        type="time"
                        value={editForm.dueTime}
                        onChange={(e) => handleTimeChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                  
                  <div className="space-y-1 border-t border-gray-200 pt-2">
                    {[
                      { label: 'Today', value: new Date().toISOString().split('T')[0] },
                      { label: 'Tomorrow', value: new Date(Date.now() + 86400000).toISOString().split('T')[0] },
                      { label: 'Next week', value: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0] }
                    ].map((option) => (
                      <button
                        key={option.label}
                        onClick={() => {
                          handleDateChange(option.value);
                          setShowDatePicker(false);
                        }}
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
            <div className="relative" ref={priorityDropdownRef}>
              <div className="py-2 px-2">
                <span className="text-sm font-medium text-gray-700">Priority</span>
              </div>
              <button
                onClick={() => openDropdown(setShowPriorityDropdown)}
                className="w-full flex items-center gap-2 text-sm px-2 mt-1 hover:bg-gray-50 py-1 rounded"
              >
                {currentPriority.icon}
                <span className="text-gray-600">{currentPriority.label.replace('Priority ', 'P')}</span>
              </button>

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
            <div className="relative" ref={labelInputRef}>
              <div className="flex items-center justify-between py-2 px-2">
                <span className="text-sm font-medium text-gray-700">Labels</span>
                <button 
                  onClick={() => openDropdown(setShowLabelInput)}
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
                      className="group text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded flex items-center gap-1 hover:bg-purple-200"
                    >
                      {label}
                      <button
                        onClick={() => removeLabel(label)}
                        className="opacity-0 group-hover:opacity-100 hover:text-purple-900 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
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
