import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  X, 
  Calendar,
  Clock,
  Flag,
  Inbox,
  Bell,
  Repeat,
  Tag,
  ChevronDown,
  CheckSquare
} from 'lucide-react';
import { parseNaturalLanguageDate } from '../../utils/dateParser';

const TaskForm = ({ onSubmit, onCancel, initialData = null, mode = 'create' }) => {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    category: initialData?.category || 'Training',
    priority: initialData?.priority || 'medium',
    dueDate: initialData?.dueDate || '',
    dueTime: initialData?.dueTime || '',
    estimatedTime: initialData?.estimatedTime || 30,
    notes: initialData?.notes || '',
    labels: initialData?.labels || [],
    subtasks: initialData?.subtasks || [],
    recurring: initialData?.recurring || null,
    reminders: initialData?.reminders || [],
    project: initialData?.project || 'Inbox',
    section: initialData?.section || ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [showEstimatedTime, setShowEstimatedTime] = useState(false);
  const [naturalDateInput, setNaturalDateInput] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newSubtask, setNewSubtask] = useState('');

  const datePickerRef = useRef(null);
  const priorityPickerRef = useRef(null);
  const reminderPickerRef = useRef(null);
  const projectPickerRef = useRef(null);
  const labelsPickerRef = useRef(null);
  const subtasksPickerRef = useRef(null);
  const estimatedTimePickerRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
        setShowDatePicker(false);
      }
      if (priorityPickerRef.current && !priorityPickerRef.current.contains(event.target)) {
        setShowPriorityPicker(false);
      }
      if (reminderPickerRef.current && !reminderPickerRef.current.contains(event.target)) {
        setShowReminderPicker(false);
      }
      if (projectPickerRef.current && !projectPickerRef.current.contains(event.target)) {
        setShowProjectPicker(false);
      }
      if (labelsPickerRef.current && !labelsPickerRef.current.contains(event.target)) {
        setShowLabels(false);
      }
      if (subtasksPickerRef.current && !subtasksPickerRef.current.contains(event.target)) {
        setShowSubtasks(false);
      }
      if (estimatedTimePickerRef.current && !estimatedTimePickerRef.current.contains(event.target)) {
        setShowEstimatedTime(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const projects = [
    { name: 'Inbox', sections: [] },
    { name: 'Client Work', sections: ['Onboarding', 'Follow-ups', 'Delivery'] },
    { name: 'Marketing', sections: ['Social Media', 'Content Creation', 'Campaigns'] },
    { name: 'Operations', sections: ['Admin', 'HR', 'IT Support'] },
    { name: 'Sales', sections: ['Prospecting', 'Meetings', 'Proposals'] },
    { name: 'Personal', sections: ['Learning', 'Professional Development'] }
  ];

  const priorities = [
    { value: 'urgent', label: 'Priority 1', icon: <Flag className="w-4 h-4 fill-red-600 stroke-red-600" />, color: 'text-red-600' },
    { value: 'high', label: 'Priority 2', icon: <Flag className="w-4 h-4 fill-orange-500 stroke-orange-500" />, color: 'text-orange-500' },
    { value: 'medium', label: 'Priority 3', icon: <Flag className="w-4 h-4 fill-blue-500 stroke-blue-500" />, color: 'text-blue-500' },
    { value: 'low', label: 'Priority 4', icon: <Flag className="w-4 h-4 stroke-gray-400" />, color: 'text-gray-400' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!formData.title.trim()) {
      alert('Please enter a task name');
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onSubmit({
        ...formData,
        estimatedTime: parseInt(formData.estimatedTime) || 30,
        dueDate: formData.dueDate || null
      });
    } catch (error) {
      console.error('Error submitting task:', error);
      alert('Failed to create task. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNaturalDateChange = (value) => {
    setNaturalDateInput(value);
    const parsedDate = parseNaturalLanguageDate(value);
    if (parsedDate) {
      handleInputChange('dueDate', parsedDate);
    }
  };

  const selectQuickDate = (dateValue) => {
    handleNaturalDateChange(dateValue);
    setNaturalDateInput('');
    setShowDatePicker(false);
  };

  const selectPriority = (priorityValue) => {
    handleInputChange('priority', priorityValue);
    setShowPriorityPicker(false);
  };

  const selectProject = (projectName) => {
    handleInputChange('project', projectName);
    handleInputChange('section', '');
    setShowProjectPicker(false);
  };

  const addReminder = (type, value) => {
    const newReminder = {
      id: Date.now(),
      type,
      ...value
    };
    handleInputChange('reminders', [...formData.reminders, newReminder]);
  };

  const removeReminder = (reminderId) => {
    handleInputChange('reminders', formData.reminders.filter(r => r.id !== reminderId));
  };

  const handleAddLabel = () => {
    if (!newLabel.trim()) return;
    if (formData.labels.includes(newLabel.trim())) return;
    
    handleInputChange('labels', [...formData.labels, newLabel.trim()]);
    setNewLabel('');
  };

  const handleRemoveLabel = (label) => {
    handleInputChange('labels', formData.labels.filter(l => l !== label));
  };

  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return;
    
    const subtask = {
      id: Date.now(),
      text: newSubtask.trim(),
      completed: false
    };
    
    handleInputChange('subtasks', [...formData.subtasks, subtask]);
    setNewSubtask('');
  };

  const handleRemoveSubtask = (subtaskId) => {
    handleInputChange('subtasks', formData.subtasks.filter(st => st.id !== subtaskId));
  };

  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getFormattedDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getPriorityLabel = () => {
    const priority = priorities.find(p => p.value === formData.priority);
    return priority ? priority.label : 'Priority';
  };

  const getPriorityIcon = () => {
    const priority = priorities.find(p => p.value === formData.priority);
    return priority ? priority.icon : <Flag className="w-4 h-4" />;
  };

  return createPortal(
    <div className="modal-overlay bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto py-8 px-4 pb-96">
      <Card className="w-full max-w-2xl my-8 bg-white rounded-lg shadow-lg overflow-visible">
        <form onSubmit={handleSubmit} className="p-6 overflow-visible">
          {/* Title Input */}
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            className="w-full text-base font-semibold border-none outline-none focus:ring-0 px-0 py-2 placeholder-gray-400"
            placeholder="Task name"
            autoFocus
          />

          {/* Description Input */}
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={2}
            className="w-full text-sm border-none outline-none focus:ring-0 px-0 py-2 placeholder-gray-400 resize-none"
            placeholder="Description"
          />


          {/* Action Buttons Row */}
          <div className="flex items-center gap-2 mb-6 mt-4 pb-2">
            {/* Date Button */}
            <div className="relative" ref={datePickerRef}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowDatePicker(!showDatePicker);
                }}
                className={`text-xs ${formData.dueDate ? 'text-green-700 bg-green-50 hover:bg-green-100' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <Calendar className="w-4 h-4 mr-1" />
                {formData.dueDate ? getFormattedDate(formData.dueDate) : 'Date'}
              </Button>

              {/* Date Picker Dropdown */}
              {showDatePicker && (
                <div className="absolute top-full left-0 mt-1 w-72 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-[100]">
                  <input
                    type="text"
                    value={naturalDateInput}
                    onChange={(e) => handleNaturalDateChange(e.target.value)}
                    placeholder="Type a date"
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                  />
                  
                  <div className="space-y-1 mb-3">
                    {[
                      { label: 'Today', value: 'today', day: 'Thu' },
                      { label: 'Tomorrow', value: 'tomorrow', day: 'Fri' },
                      { label: 'This weekend', value: 'saturday', day: 'Sat' },
                      { label: 'Next week', value: 'next monday', day: 'Mon' }
                    ].map((option) => (
                      <button
                        key={option.label}
                        type="button"
                        onClick={() => selectQuickDate(option.value)}
                        className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 rounded text-sm text-left"
                      >
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-green-600" />
                          <span className="text-gray-900">{option.label}</span>
                        </div>
                        <span className="text-gray-500 text-xs">{option.day}</span>
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-gray-200 pt-3">
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => handleInputChange('dueDate', e.target.value)}
                      min={getTodayDate()}
                      className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                    />
                    
                    {/* Time picker - only show if date is selected */}
                    {formData.dueDate && (
                      <div>
                        <label className="text-xs text-gray-600 mb-1 block">Time (optional)</label>
                        <input
                          type="time"
                          value={formData.dueTime}
                          onChange={(e) => handleInputChange('dueTime', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowDatePicker(false);
                        // Would open recurring modal
                      }}
                      className="text-xs text-gray-600 hover:bg-gray-100"
                    >
                      <Repeat className="w-4 h-4 mr-1" />
                      Repeat
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Priority Button */}
            <div className="relative" ref={priorityPickerRef}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowPriorityPicker(!showPriorityPicker);
                }}
                className="text-xs text-gray-600 hover:bg-gray-100"
              >
                {getPriorityIcon()}
                <span className="ml-1">{getPriorityLabel()}</span>
              </Button>

              {/* Priority Picker Dropdown */}
              {showPriorityPicker && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-[100]">
                  {priorities.map((priority) => (
                    <button
                      key={priority.value}
                      type="button"
                      onClick={() => selectPriority(priority.value)}
                      className={`w-full flex items-center justify-between px-4 py-2 hover:bg-gray-50 text-sm text-left ${
                        formData.priority === priority.value ? 'bg-gray-50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {priority.icon}
                        <span className="text-gray-900">{priority.label}</span>
                      </div>
                      {formData.priority === priority.value && (
                        <X className="w-3 h-3 text-red-600" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Reminders Button */}
            <div className="relative" ref={reminderPickerRef}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowReminderPicker(!showReminderPicker);
                }}
                className={`text-xs ${formData.reminders.length > 0 ? 'text-yellow-700 bg-yellow-50 hover:bg-yellow-100' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <Bell className="w-4 h-4 mr-1" />
                Reminders
                {formData.reminders.length > 0 && (
                  <span className="ml-1">({formData.reminders.length})</span>
                )}
              </Button>

              {/* Reminders Picker Dropdown */}
              {showReminderPicker && (
                <div className="absolute top-full left-0 mt-1 w-72 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-[100]">
                  <div className="mb-3">
                    <p className="text-sm font-semibold mb-2">Reminders</p>
                  </div>
                  
                  {/* Relative reminders (if task has due date) */}
                  {formData.dueDate && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-2">Before due time:</p>
                      <div className="space-y-1">
                        {[
                          { label: 'At due time', minutes: 0 },
                          { label: '15 min before', minutes: 15 },
                          { label: '30 min before', minutes: 30 },
                          { label: '1 hour before', minutes: 60 },
                          { label: '1 day before', minutes: 1440 }
                        ].map((option) => (
                          <button
                            key={option.label}
                            type="button"
                            onClick={() => {
                              addReminder('relative', { minutes: option.minutes, label: option.label });
                              setShowReminderPicker(false);
                            }}
                            className="w-full px-3 py-2 hover:bg-gray-50 rounded text-sm text-left text-gray-900"
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Absolute time reminder */}
                  <div className="mb-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500 mb-2">At specific time:</p>
                    <div className="space-y-2">
                      <input
                        type="date"
                        id="reminder-date"
                        className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min={new Date().toISOString().split('T')[0]}
                      />
                      <input
                        type="time"
                        id="reminder-time"
                        className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const dateInput = document.getElementById('reminder-date');
                          const timeInput = document.getElementById('reminder-time');
                          
                          if (!dateInput.value || !timeInput.value) {
                            alert('Please select both date and time');
                            return;
                          }
                          
                          const reminderDateTime = new Date(`${dateInput.value}T${timeInput.value}`);
                          const now = new Date();
                          
                          if (reminderDateTime < now) {
                            alert('Reminder time must be in the future');
                            return;
                          }
                          
                          const formattedDate = reminderDateTime.toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric' 
                          });
                          const formattedTime = reminderDateTime.toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit' 
                          });
                          
                          addReminder('absolute', { 
                            datetime: reminderDateTime.toISOString(),
                            label: `${formattedDate} at ${formattedTime}`
                          });
                          
                          dateInput.value = '';
                          timeInput.value = '';
                          setShowReminderPicker(false);
                        }}
                        className="w-full px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        Add reminder
                      </button>
                    </div>
                  </div>

                  {formData.reminders.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500 mb-2">Active reminders:</p>
                      <div className="space-y-1">
                        {formData.reminders.map((reminder) => (
                          <div
                            key={reminder.id}
                            className="flex items-center justify-between px-2 py-1 bg-yellow-50 rounded text-xs"
                          >
                            <span className="text-yellow-800">{reminder.label}</span>
                            <button
                              type="button"
                              onClick={() => removeReminder(reminder.id)}
                              className="text-gray-400 hover:text-red-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Labels Button */}
            <div className="relative" ref={labelsPickerRef}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowLabels(!showLabels);
                }}
                className={`text-xs ${formData.labels.length > 0 ? 'text-purple-700 bg-purple-50 hover:bg-purple-100' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <Tag className="w-4 h-4 mr-1" />
                Labels
                {formData.labels.length > 0 && (
                  <span className="ml-1">({formData.labels.length})</span>
                )}
              </Button>

              {/* Labels Dropdown */}
              {showLabels && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-xl border border-gray-200 pt-4 pb-4 pl-4 pr-8 z-[100]">
                  <div className="mb-3">
                    <p className="text-sm font-semibold mb-2">Labels</p>
                  </div>
                  
                  {formData.labels.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {formData.labels.map((label) => (
                        <Badge key={label} variant="secondary" className="bg-purple-100 text-purple-800">
                          {label}
                          <button
                            type="button"
                            onClick={() => handleRemoveLabel(label)}
                            className="ml-2 text-purple-600 hover:text-purple-800"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  {/* Example Labels */}
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-2">Suggestions:</p>
                    <div className="flex flex-wrap gap-2">
                      {['Urgent', 'Personal', 'Work'].map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => {
                            if (!formData.labels.includes(suggestion)) {
                              handleInputChange('labels', [...formData.labels, suggestion]);
                            }
                          }}
                          disabled={formData.labels.includes(suggestion)}
                          className="px-3 py-1 text-xs border border-gray-200 rounded-md hover:bg-gray-50 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddLabel();
                          e.target.focus();
                        }
                      }}
                      placeholder="Add label"
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Button
                      type="button"
                      onClick={handleAddLabel}
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      Add
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Subtasks Button */}
            <div className="relative" ref={subtasksPickerRef}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowSubtasks(!showSubtasks);
                }}
                className={`text-xs ${formData.subtasks.length > 0 ? 'text-blue-700 bg-blue-50 hover:bg-blue-100' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <CheckSquare className="w-4 h-4 mr-1" />
                Subtasks
                {formData.subtasks.length > 0 && (
                  <span className="ml-1">({formData.subtasks.length})</span>
                )}
              </Button>

              {/* Subtasks Dropdown */}
              {showSubtasks && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-xl border border-gray-200 pt-4 pb-4 pl-4 pr-8 z-[100]">
                  <div className="mb-3">
                    <p className="text-sm font-semibold mb-2">Subtasks</p>
                  </div>
                  
                  {formData.subtasks.length > 0 && (
                    <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                      {formData.subtasks.map((subtask) => (
                        <div key={subtask.id} className="flex items-center gap-2">
                          <CheckSquare className="w-4 h-4 text-gray-400" />
                          <span className="flex-1 text-sm text-gray-700">{subtask.text}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSubtask(subtask.id)}
                            className="text-gray-400 hover:text-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newSubtask}
                      onChange={(e) => setNewSubtask(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddSubtask();
                          e.target.focus();
                        }
                      }}
                      placeholder="Add subtask"
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Button
                      type="button"
                      onClick={handleAddSubtask}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Add
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Estimated Time Button */}
            <div className="relative" ref={estimatedTimePickerRef}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowEstimatedTime(!showEstimatedTime);
                }}
                className={`text-xs ${formData.estimatedTime && formData.estimatedTime !== 30 ? 'text-orange-700 bg-orange-50 hover:bg-orange-100' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <Clock className="w-4 h-4 mr-1" />
                {formData.estimatedTime ? `${formData.estimatedTime}m` : 'Time'}
              </Button>

              {/* Estimated Time Dropdown */}
              {showEstimatedTime && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-[100]">
                  <div className="mb-3">
                    <p className="text-sm font-semibold mb-2">Estimated Time</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={formData.estimatedTime}
                      onChange={(e) => handleInputChange('estimatedTime', parseInt(e.target.value) || 0)}
                      min="0"
                      placeholder="30"
                      className="w-24 px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600">minutes</span>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: 15, label: '15m' },
                        { value: 30, label: '30m' },
                        { value: 45, label: '45m' },
                        { value: 60, label: '1hr' },
                        { value: 90, label: '1.5hrs' },
                        { value: 120, label: '2hrs' }
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            handleInputChange('estimatedTime', option.value);
                            setShowEstimatedTime(false);
                          }}
                          className="px-3 py-2 text-sm border border-gray-200 rounded-md hover:bg-gray-50 text-gray-700"
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            {/* Project Selector */}
            <div className="relative" ref={projectPickerRef}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowProjectPicker(!showProjectPicker);
                }}
                className="text-xs text-gray-600 hover:bg-gray-100"
              >
                <Inbox className="w-4 h-4 mr-1" />
                {formData.project}
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>

              {/* Project Picker Dropdown */}
              {showProjectPicker && (
                <div className="absolute bottom-full left-0 mb-1 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-[100] max-h-64 overflow-y-auto">
                  {projects.map((project) => (
                    <button
                      key={project.name}
                      type="button"
                      onClick={() => selectProject(project.name)}
                      className={`w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-sm text-left ${
                        formData.project === project.name ? 'bg-gray-50 text-blue-600' : 'text-gray-900'
                      }`}
                    >
                      <Inbox className="w-4 h-4" />
                      {project.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="text-sm text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSubmit(e);
                }}
                className="text-sm bg-red-500 hover:bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Adding...' : 'Add task'}
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </div>,
    document.body
  );
};

export default TaskForm;
