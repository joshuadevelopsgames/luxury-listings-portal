import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  X, 
  Save, 
  Calendar,
  Clock,
  Target,
  FileText,
  AlertCircle,
  Tag,
  Plus,
  CheckSquare,
  Trash2,
  Repeat,
  Bell
} from 'lucide-react';
import { parseNaturalLanguageDate, parseRecurringPattern } from '../../utils/dateParser';

const TaskForm = ({ onSubmit, onCancel, initialData = null, mode = 'create' }) => {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    category: initialData?.category || 'Training',
    priority: initialData?.priority || 'medium',
    dueDate: initialData?.dueDate || '',
    estimatedTime: initialData?.estimatedTime || 30,
    notes: initialData?.notes || '',
    labels: initialData?.labels || [],
    subtasks: initialData?.subtasks || [],
    recurring: initialData?.recurring || null,
    project: initialData?.project || '',
    section: initialData?.section || ''
  });

  const [errors, setErrors] = useState({});

  // Common projects
  const projects = [
    { name: 'Client Work', sections: ['Onboarding', 'Follow-ups', 'Delivery'] },
    { name: 'Marketing', sections: ['Social Media', 'Content Creation', 'Campaigns'] },
    { name: 'Operations', sections: ['Admin', 'HR', 'IT Support'] },
    { name: 'Sales', sections: ['Prospecting', 'Meetings', 'Proposals'] },
    { name: 'Personal', sections: ['Learning', 'Professional Development'] }
  ];

  const selectedProject = projects.find(p => p.name === formData.project);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [naturalDateInput, setNaturalDateInput] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newSubtask, setNewSubtask] = useState('');
  const [recurringInput, setRecurringInput] = useState('');
  const [showRecurring, setShowRecurring] = useState(false);
  const [showReminders, setShowReminders] = useState(false);

  const categories = [
    'Training', 'IT Setup', 'Meetings', 'Development', 'Documentation', 'Compliance', 'Other'
  ];

  const priorities = [
    { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-800' },
    { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-800' },
    { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
    { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' }
  ];

  const timeOptions = [
    { value: 15, label: '15 minutes' },
    { value: 30, label: '30 minutes' },
    { value: 45, label: '45 minutes' },
    { value: 60, label: '1 hour' },
    { value: 90, label: '1.5 hours' },
    { value: 120, label: '2 hours' },
    { value: 180, label: '3 hours' },
    { value: 240, label: '4 hours' },
    { value: 300, label: '5 hours' }
  ];

  // Handle natural language date input
  const handleNaturalDateChange = (value) => {
    setNaturalDateInput(value);
    const parsedDate = parseNaturalLanguageDate(value);
    if (parsedDate) {
      handleInputChange('dueDate', parsedDate);
    }
  };

  // Handle adding labels
  const handleAddLabel = () => {
    if (newLabel.trim() && !formData.labels.includes(newLabel.trim())) {
      handleInputChange('labels', [...formData.labels, newLabel.trim()]);
      setNewLabel('');
    }
  };

  const handleRemoveLabel = (labelToRemove) => {
    handleInputChange('labels', formData.labels.filter(l => l !== labelToRemove));
  };

  // Handle adding subtasks
  const handleAddSubtask = () => {
    if (newSubtask.trim()) {
      const subtask = {
        id: Date.now().toString(),
        text: newSubtask.trim(),
        completed: false,
        order: formData.subtasks.length
      };
      handleInputChange('subtasks', [...formData.subtasks, subtask]);
      setNewSubtask('');
    }
  };

  const handleRemoveSubtask = (subtaskId) => {
    handleInputChange('subtasks', formData.subtasks.filter(st => st.id !== subtaskId));
  };

  // Handle recurring pattern
  const handleRecurringChange = (value) => {
    setRecurringInput(value);
    const pattern = parseRecurringPattern(value);
    if (pattern) {
      handleInputChange('recurring', pattern);
    }
  };

  // Handle adding reminders
  const handleAddReminder = (reminderType, value) => {
    const newReminder = {
      id: Date.now().toString(),
      type: reminderType, // 'relative' or 'absolute'
      ...value
    };
    const updatedReminders = [...(formData.reminders || []), newReminder];
    handleInputChange('reminders', updatedReminders);
  };

  const handleRemoveReminder = (reminderId) => {
    const updatedReminders = (formData.reminders || []).filter(r => r.id !== reminderId);
    handleInputChange('reminders', updatedReminders);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Task title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Task description is required';
    }

    if (formData.title.length > 100) {
      newErrors.title = 'Title must be less than 100 characters';
    }

    if (formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }

    // Fix date validation to handle same-day dates properly
    if (formData.dueDate) {
      // Parse the date string as a local date, not UTC
      const [year, month, day] = formData.dueDate.split('-').map(Number);
      const selectedDateOnly = new Date(year, month - 1, day); // month is 0-indexed
      
      const today = new Date();
      const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      // Debug logging to see what's happening
      console.log('Date Validation Debug:', {
        selectedDate: formData.dueDate,
        parsedYear: year,
        parsedMonth: month,
        parsedDay: day,
        selectedDateOnly: selectedDateOnly,
        today: today,
        todayOnly: todayOnly,
        comparison: selectedDateOnly < todayOnly
      });
      
      if (selectedDateOnly < todayOnly) {
        newErrors.dueDate = 'Due date cannot be in the past';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onSubmit({
        ...formData,
        estimatedTime: parseInt(formData.estimatedTime),
        dueDate: formData.dueDate || null
      });
    } catch (error) {
      console.error('Error submitting task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const getMinDate = () => {
    const today = new Date();
    // Ensure we're working with the local date, not UTC
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto py-8 px-4">
      <Card className="w-full max-w-2xl mb-8">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold">
              {mode === 'create' ? 'Create New Task' : 'Edit Task'}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Task Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.title ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter task title"
                maxLength={100}
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.title}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {formData.title.length}/100 characters
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.description ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Describe what needs to be done"
                maxLength={500}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.description}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {formData.description.length}/500 characters
              </p>
            </div>

            {/* Project and Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Target className="w-4 h-4 inline mr-1" />
                  Project
                </label>
                <select
                  value={formData.project}
                  onChange={(e) => {
                    handleInputChange('project', e.target.value);
                    handleInputChange('section', ''); // Reset section when project changes
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No Project</option>
                  {projects.map(project => (
                    <option key={project.name} value={project.name}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              {formData.project && selectedProject && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Section
                  </label>
                  <select
                    value={formData.section}
                    onChange={(e) => handleInputChange('section', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No Section</option>
                    {selectedProject.sections.map(section => (
                      <option key={section} value={section}>
                        {section}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Category and Priority */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category (Legacy)
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {priorities.map(priority => (
                    <button
                      key={priority.value}
                      type="button"
                      onClick={() => handleInputChange('priority', priority.value)}
                      className={`p-2 text-xs font-medium rounded-md border transition-colors ${
                        formData.priority === priority.value
                          ? 'border-blue-300 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {priority.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Due Date and Estimated Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Due Date
                </label>
                {/* Natural language input */}
                <input
                  type="text"
                  value={naturalDateInput}
                  onChange={(e) => handleNaturalDateChange(e.target.value)}
                  placeholder="e.g., tomorrow, next monday, in 3 days"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                />
                
                {/* Quick date suggestions */}
                {!formData.dueDate && (
                  <div className="mb-2">
                    <p className="text-xs text-gray-500 mb-2">Quick select:</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: 'Today', value: 'today' },
                        { label: 'Tomorrow', value: 'tomorrow' },
                        { label: 'Next Week', value: 'next week' },
                        { label: 'No Date', value: '' }
                      ].map((dateOption) => (
                        <Badge
                          key={dateOption.label}
                          variant="outline"
                          className="text-xs px-2 py-1 bg-gray-50 text-gray-600 border-gray-300 cursor-pointer hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-colors"
                          onClick={() => {
                            if (dateOption.value) {
                              handleNaturalDateChange(dateOption.value);
                              setNaturalDateInput(dateOption.value);
                            } else {
                              handleInputChange('dueDate', '');
                              setNaturalDateInput('');
                            }
                          }}
                        >
                          {dateOption.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Date picker fallback */}
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => handleInputChange('dueDate', e.target.value)}
                  min={getMinDate()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formData.dueDate && (
                  <p className="mt-1 text-xs text-green-600">
                    ✓ Due: {new Date(formData.dueDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </p>
                )}
                {errors.dueDate && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.dueDate}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Estimated Time
                </label>
                <select
                  value={formData.estimatedTime}
                  onChange={(e) => handleInputChange('estimatedTime', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {timeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 inline mr-1" />
                Additional Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Any additional information or context"
              />
            </div>

            {/* Labels */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Tag className="w-4 h-4 inline mr-1" />
                Labels
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLabel())}
                  placeholder="Add a label..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button
                  type="button"
                  onClick={handleAddLabel}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Suggested Labels */}
              {formData.labels.length === 0 && (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-2">Quick add:</p>
                  <div className="flex flex-wrap gap-2">
                    {['urgent', 'client-work', 'marketing', 'follow-up', 'important', 'quick-win', 'personal'].map((suggestion) => (
                      <Badge
                        key={suggestion}
                        variant="outline"
                        className="text-xs px-2 py-1 bg-gray-50 text-gray-600 border-gray-300 cursor-pointer hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300 transition-colors"
                        onClick={() => {
                          if (!formData.labels.includes(suggestion)) {
                            handleInputChange('labels', [...formData.labels, suggestion]);
                          }
                        }}
                      >
                        {suggestion}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {formData.labels.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.labels.map((label, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="text-xs px-2 py-1 bg-purple-50 text-purple-700 border-purple-200 flex items-center gap-1"
                    >
                      {label}
                      <X
                        className="w-3 h-3 cursor-pointer hover:text-purple-900"
                        onClick={() => handleRemoveLabel(label)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Subtasks */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <CheckSquare className="w-4 h-4 inline mr-1" />
                Subtasks
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSubtask())}
                  placeholder="Add a subtask..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button
                  type="button"
                  onClick={handleAddSubtask}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {formData.subtasks.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {formData.subtasks.map((subtask) => (
                    <div
                      key={subtask.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200"
                    >
                      <span className="text-sm">{subtask.text}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveSubtask(subtask.id)}
                        className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recurring Task */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  <Repeat className="w-4 h-4 inline mr-1" />
                  Recurring Task
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRecurring(!showRecurring)}
                >
                  {showRecurring ? 'Hide' : 'Show'}
                </Button>
              </div>
              {showRecurring && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500">Select a pattern:</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                      { label: 'Daily', pattern: 'daily' },
                      { label: 'Weekly', pattern: 'weekly' },
                      { label: 'Monthly', pattern: 'monthly' },
                      { label: 'Yearly', pattern: 'yearly' }
                    ].map((option) => (
                      <Badge
                        key={option.label}
                        variant="outline"
                        className={`text-xs px-3 py-2 cursor-pointer transition-colors text-center ${
                          formData.recurring?.pattern === option.pattern
                            ? 'bg-green-50 text-green-700 border-green-300'
                            : 'bg-gray-50 text-gray-600 border-gray-300 hover:bg-green-50 hover:text-green-700 hover:border-green-300'
                        }`}
                        onClick={() => handleInputChange('recurring', { 
                          pattern: option.pattern, 
                          interval: formData.recurring?.interval || 1
                        })}
                      >
                        {option.label}
                      </Badge>
                    ))}
                  </div>
                  
                  {/* Interval selector */}
                  {formData.recurring && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-2">
                        Repeat every:
                      </label>
                      <select
                        value={formData.recurring?.interval || 1}
                        onChange={(e) => handleInputChange('recurring', {
                          ...formData.recurring,
                          interval: parseInt(e.target.value)
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 10, 14, 30].map((num) => (
                          <option key={num} value={num}>
                            {num} {formData.recurring?.pattern === 'daily' && (num === 1 ? 'day' : 'days')}
                            {formData.recurring?.pattern === 'weekly' && (num === 1 ? 'week' : 'weeks')}
                            {formData.recurring?.pattern === 'monthly' && (num === 1 ? 'month' : 'months')}
                            {formData.recurring?.pattern === 'yearly' && (num === 1 ? 'year' : 'years')}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  {/* Day of week options for weekly */}
                  {formData.recurring?.pattern === 'weekly' && (
                    <div>
                      <p className="text-xs text-gray-500 mb-2">Repeat on:</p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { label: 'Mon', day: 1 },
                          { label: 'Tue', day: 2 },
                          { label: 'Wed', day: 3 },
                          { label: 'Thu', day: 4 },
                          { label: 'Fri', day: 5 },
                          { label: 'Sat', day: 6 },
                          { label: 'Sun', day: 0 }
                        ].map((dayOption) => (
                          <Badge
                            key={dayOption.label}
                            variant="outline"
                            className={`text-xs px-2 py-1 cursor-pointer transition-colors ${
                              formData.recurring?.daysOfWeek?.includes(dayOption.day)
                                ? 'bg-green-50 text-green-700 border-green-300'
                                : 'bg-gray-50 text-gray-600 border-gray-300 hover:bg-green-50 hover:text-green-700 hover:border-green-300'
                            }`}
                            onClick={() => {
                              const currentDays = formData.recurring?.daysOfWeek || [];
                              const newDays = currentDays.includes(dayOption.day)
                                ? currentDays.filter(d => d !== dayOption.day)
                                : [...currentDays, dayOption.day];
                              handleInputChange('recurring', {
                                ...formData.recurring,
                                daysOfWeek: newDays.length > 0 ? newDays : undefined
                              });
                            }}
                          >
                            {dayOption.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Clear recurring */}
                  {formData.recurring && (
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-green-600">
                        ✓ Repeats: {formData.recurring.pattern}
                        {formData.recurring.daysOfWeek && ` on ${formData.recurring.daysOfWeek.map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', ')}`}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleInputChange('recurring', null)}
                        className="text-red-600 hover:text-red-700 text-xs"
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Reminders */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  <Bell className="w-4 h-4 inline mr-1" />
                  Reminders
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowReminders(!showReminders)}
                >
                  {showReminders ? 'Hide' : 'Show'}
                </Button>
              </div>
              {showReminders && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500">Add a reminder:</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {[
                      { label: 'At due time', minutes: 0 },
                      { label: '15 min before', minutes: 15 },
                      { label: '30 min before', minutes: 30 },
                      { label: '1 hour before', minutes: 60 },
                      { label: '1 day before', minutes: 1440 },
                      { label: '1 week before', minutes: 10080 }
                    ].map((option) => (
                      <Badge
                        key={option.label}
                        variant="outline"
                        className="text-xs px-3 py-2 cursor-pointer transition-colors text-center bg-gray-50 text-gray-600 border-gray-300 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
                        onClick={() => handleAddReminder('relative', { minutes: option.minutes, label: option.label })}
                      >
                        {option.label}
                      </Badge>
                    ))}
                  </div>
                  
                  {/* Active reminders */}
                  {formData.reminders && formData.reminders.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500">Active reminders:</p>
                      <div className="space-y-2">
                        {formData.reminders.map((reminder) => (
                          <div
                            key={reminder.id}
                            className="flex items-center justify-between p-2 bg-blue-50 rounded border border-blue-200"
                          >
                            <div className="flex items-center gap-2">
                              <Bell className="w-4 h-4 text-blue-600" />
                              <span className="text-sm text-blue-700">
                                {reminder.label || `${reminder.minutes} minutes before`}
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveReminder(reminder.id)}
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Priority Preview */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Task Preview</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Priority:</span>
                  <Badge 
                    variant="outline" 
                    className={priorities.find(p => p.value === formData.priority)?.color}
                  >
                    {priorities.find(p => p.value === formData.priority)?.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Category:</span>
                  <span className="text-sm font-medium">{formData.category}</span>
                </div>
                {formData.dueDate && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Due:</span>
                    <span className="text-sm font-medium">
                      {new Date(formData.dueDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Task' : 'Update Task'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default TaskForm;
