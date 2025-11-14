import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Plus, Clock, CheckCircle2, UserPlus, Users, X, Check, Inbox, Flag, Calendar, CalendarIcon, TrendingUp, Sparkles, Filter, Trash2, LayoutGrid, List, GripVertical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TaskForm from '../components/tasks/TaskForm';
import TaskCard from '../components/tasks/TaskCard';
import TaskListItem from '../components/tasks/TaskListItem';
import TaskEditModal from '../components/tasks/TaskEditModal';
import ProductivityStats from '../components/tasks/ProductivityStats';
import TemplateSelector from '../components/tasks/TemplateSelector';
import TemplateEditor from '../components/tasks/TemplateEditor';
import SmartFilters from '../components/tasks/SmartFilters';
import FilterDropdown from '../components/tasks/FilterDropdown';
import CalendarView from '../components/tasks/CalendarView';
import { useAuth } from '../contexts/AuthContext';
import { DailyTask } from '../entities/DailyTask';
import { firestoreService } from '../services/firestoreService';
import { reminderService } from '../services/reminderService';
import { format } from 'date-fns';
import { PERMISSIONS } from '../entities/Permissions';
import { toast } from 'react-hot-toast';
import { parseNaturalLanguageDate } from '../utils/dateParser';

// Sortable Task Card Wrapper
const SortableTaskCard = ({ task, isSelected, onToggleSelect, bulkMode, ...props }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="relative">
      {bulkMode && (
        <div className="absolute top-2 left-2 z-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(task.id)}
            className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
      <TaskCard task={task} {...props} />
    </div>
  );
};

// Sortable Task List Item Wrapper
const SortableTaskListItem = ({ task, isSelected, onToggleSelect, bulkMode, ...props }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskListItem 
        task={task} 
        isSelected={isSelected}
        onToggleSelect={onToggleSelect}
        bulkMode={bulkMode}
        {...props} 
      />
    </div>
  );
};

const TasksPage = () => {
  console.log('🚀 TasksPage component initializing...'); // Debug log
  const { currentUser, hasPermission } = useAuth();
  
  // Check permissions
  const canCreateTasks = hasPermission(PERMISSIONS.CREATE_TASKS);
  const canAssignTasks = hasPermission(PERMISSIONS.ASSIGN_TASKS);
  const canViewAllTasks = hasPermission(PERMISSIONS.VIEW_ALL_TASKS);
  const canDeleteAnyTask = hasPermission(PERMISSIONS.DELETE_ANY_TASK);
  const [showForm, setShowForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [activeFilter, setActiveFilter] = useState('today');
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [taskRequests, setTaskRequests] = useState([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showRequestsPanel, setShowRequestsPanel] = useState(false);
  const [requestForm, setRequestForm] = useState({
    toUserEmail: '',
    taskTitle: '',
    taskDescription: '',
    taskPriority: 'medium',
    taskDueDate: ''
  });
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [showProductivityStats, setShowProductivityStats] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [showSmartFilters, setShowSmartFilters] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [activeSmartFilter, setActiveSmartFilter] = useState(null);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [bulkActionMode, setBulkActionMode] = useState(false);
  const [showCalendarView, setShowCalendarView] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'grid' or 'list' - default to list

  // Toggle task selection
  const toggleTaskSelection = (taskId) => {
    setSelectedTasks(prev => 
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  // Select all tasks
  const selectAllTasks = () => {
    setSelectedTasks(filteredTasks.map(t => t.id));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedTasks([]);
    setBulkActionMode(false);
  };

  // Bulk complete tasks
  const bulkCompleteTasks = async () => {
    try {
      await Promise.all(
        selectedTasks.map(taskId => 
          updateTaskStatus(taskId, 'completed')
        )
      );
      toast.success(`✓ Completed ${selectedTasks.length} tasks`);
      clearSelection();
    } catch (error) {
      console.error('Error bulk completing tasks:', error);
      toast.error('Failed to complete tasks');
    }
  };

  // Bulk delete tasks
  const bulkDeleteTasks = async () => {
    if (!window.confirm(`Delete ${selectedTasks.length} tasks?`)) return;

    try {
      await Promise.all(
        selectedTasks.map(taskId => DailyTask.delete(taskId))
      );
      toast.success(`✓ Deleted ${selectedTasks.length} tasks`);
      clearSelection();
    } catch (error) {
      console.error('Error bulk deleting tasks:', error);
      toast.error('Failed to delete tasks');
    }
  };

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end
  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    setFilteredTasks((items) => {
      const oldIndex = items.findIndex(task => task.id === active.id);
      const newIndex = items.findIndex(task => task.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return items;

      const newOrder = arrayMove(items, oldIndex, newIndex);
      
      // Save order to database asynchronously
      setTimeout(async () => {
        try {
          const updates = newOrder.map((task, index) => 
            DailyTask.update(task.id, { order: index })
          );
          await Promise.all(updates);
          console.log('✅ Task order saved');
        } catch (error) {
          console.error('Error saving task order:', error);
        }
      }, 0);
      
      return newOrder;
    });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd/Ctrl + K: Quick add task
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (canCreateTasks) {
          setShowForm(true);
        } else {
          toast.error('You need CREATE_TASKS permission');
        }
      }
      
      // Escape: Close modals
      if (e.key === 'Escape') {
        setShowForm(false);
        setShowEditModal(false);
        setShowRequestModal(false);
        setShowRequestsPanel(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [canCreateTasks]);

  // Start reminder checking
  useEffect(() => {
    if (currentUser?.email) {
      // Request notification permission
      reminderService.requestNotificationPermission();
      
      // Start checking for reminders
      reminderService.startReminderCheck(currentUser.email);
      
      return () => {
        reminderService.stopReminderCheck();
      };
    }
  }, [currentUser?.email]);

  // Helper function to parse dates as local dates (same as form validation)
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
  
  // Helper function to check if date is tomorrow (local date comparison)
  const isTomorrowLocal = (dateString) => {
    console.log('🔍 isTomorrowLocal called with:', dateString); // Debug log
    if (!dateString) return false;
    const taskDate = parseLocalDate(dateString);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
    return taskDate.getTime() === tomorrowOnly.getTime();
  };
  
  // Helper function to check if date is in the past (local date comparison)
  const isPastLocal = (dateString) => {
    if (!dateString) return false;
    const taskDate = parseLocalDate(dateString);
    const today = new Date();
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return taskDate < todayOnly;
  };

  // Load available users
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const employees = await firestoreService.getEmployees();
        // Filter out current user
        const others = employees.filter(emp => emp.email !== currentUser.email);
        setAvailableUsers(others);
      } catch (error) {
        console.error('Error loading users:', error);
      }
    };

    if (currentUser?.email) {
      loadUsers();
    }
  }, [currentUser?.email]);

  // Load task requests
  useEffect(() => {
    if (!currentUser?.email) return;

    const unsubscribe = firestoreService.onTaskRequestsChange(currentUser.email, (requests) => {
      const pendingRequests = requests.filter(r => r.status === 'pending');
      setTaskRequests(pendingRequests);
    });

    return () => unsubscribe();
  }, [currentUser?.email]);

  // Load initial data and set up real-time listener
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const tasksData = await DailyTask.filter({ assigned_to: currentUser.email }, '-due_date');
        setTasks(tasksData);
      } catch (error) {
        console.error('Error loading tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Set up real-time listener for user's tasks
    const unsubscribe = DailyTask.onUserTasksChange(currentUser.email, (tasksData) => {
      console.log('📡 Tasks updated via real-time listener:', tasksData);
      setTasks(tasksData);
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser.email]);

  // Filter tasks whenever activeFilter, tasks, or activeSmartFilter change
  useEffect(() => {
    filterTasks();
  }, [activeFilter, tasks, activeSmartFilter]);

  const applySmartFilter = (filter) => {
    if (filter === null) {
      // Clear filter
      setActiveSmartFilter(null);
    } else {
      setActiveSmartFilter(filter);
    }
  };

  // Listen for create filter event from dropdown
  useEffect(() => {
    const handleCreateFilter = () => {
      setShowSmartFilters(true);
    };

    window.addEventListener('create-smart-filter', handleCreateFilter);
    return () => window.removeEventListener('create-smart-filter', handleCreateFilter);
  }, []);

  const filterTasks = () => {
    let filtered = [...tasks];
    
    // Debug logging for date filtering
    console.log('Filtering tasks with activeFilter:', activeFilter);
    console.log('All tasks:', tasks.map(task => ({
      id: task.id,
      title: task.title,
      due_date: task.due_date,
      due_date_obj: new Date(task.due_date),
      status: task.status
    })));
    
    // STEP 1: Apply tab filter (inbox, today, upcoming, completed)
    switch (activeFilter) {
      case "inbox":
        // Tasks without a due date (Todoist-style inbox)
        filtered = tasks.filter(task => 
          task.status !== 'completed' && !task.due_date
        );
        break;
      case "today":
        // Overdue tasks + tasks due today (Todoist-style)
        const overdueTasks = tasks.filter(task => 
          task.status !== 'completed' && 
          task.due_date && 
          isPastLocal(task.due_date) && 
          !isTodayLocal(task.due_date)
        );
        const todayTasks = tasks.filter(task => 
          task.status !== 'completed' && 
          task.due_date && 
          isTodayLocal(task.due_date)
        );
        // Overdue tasks first, then today's tasks
        filtered = [...overdueTasks, ...todayTasks];
        break;
      case "upcoming":
        filtered = tasks.filter(task => 
          task.status !== 'completed' && 
          task.due_date && 
          (isTomorrowLocal(task.due_date) || parseLocalDate(task.due_date) > new Date()) &&
          !isPastLocal(task.due_date)
        );
        break;
      case "overdue":
        filtered = tasks.filter(task => 
          task.due_date && 
          isPastLocal(task.due_date) && 
          !isTodayLocal(task.due_date) && 
          task.status !== 'completed'
        );
        break;
      case "completed":
        filtered = tasks.filter(task => task.status === 'completed');
        break;
      default:
        filtered = tasks;
    }
    
    // STEP 2: Apply smart filter criteria on top of tab filter
    if (activeSmartFilter) {
      const criteria = activeSmartFilter.criteria;
      
      filtered = filtered.filter(task => {
        // Priority filter - normalize to handle both formats (p1/urgent, p2/high, etc.)
        if (criteria.priorities?.length > 0) {
          const priorityMap = {
            'urgent': ['urgent', 'p1'],
            'p1': ['urgent', 'p1'],
            'high': ['high', 'p2'],
            'p2': ['high', 'p2'],
            'medium': ['medium', 'p3'],
            'p3': ['medium', 'p3'],
            'low': ['low', 'p4'],
            'p4': ['low', 'p4']
          };
          
          const matchesPriority = criteria.priorities.some(filterPriority => {
            const validPriorities = priorityMap[filterPriority] || [filterPriority];
            return validPriorities.includes(task.priority);
          });
          
          if (!matchesPriority) return false;
        }
        
        // Label filter
        if (criteria.labels?.length > 0) {
          if (!task.labels || !criteria.labels.some(label => task.labels.includes(label))) {
            return false;
          }
        }
        
        // Category filter
        if (criteria.categories?.length > 0) {
          if (!criteria.categories.includes(task.category)) return false;
        }
        
        // Due within days (for "This Week" preset)
        if (criteria.dueWithinDays) {
          if (!task.due_date) return false;
          const dueDate = parseLocalDate(task.due_date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const maxDate = new Date(today);
          maxDate.setDate(today.getDate() + criteria.dueWithinDays);
          if (dueDate > maxDate || dueDate < today) return false;
        }
        
        // Estimated time max (for "Quick Wins" preset)
        if (criteria.estimatedTimeMax && task.estimated_time > criteria.estimatedTimeMax) {
          return false;
        }
        
        // Special criteria
        if (criteria.hasSubtasks && (!task.subtasks || task.subtasks.length === 0)) {
          return false;
        }
        
        if (criteria.hasReminders && (!task.reminders || task.reminders.length === 0)) {
          return false;
        }
        
        if (criteria.isRecurring && !task.recurring) {
          return false;
        }
        
        return true;
      });
    }
    
    console.log('Filtered tasks:', filtered.map(task => ({
      id: task.id,
      title: task.title,
      due_date: task.due_date,
      filter: activeFilter
    })));
    
    // Sort by manual order if it exists, otherwise by priority
    setFilteredTasks(filtered.sort((a, b) => {
      // If both have order fields, sort by order
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      // Otherwise sort by priority
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1, p1: 4, p2: 3, p3: 2, p4: 1 };
      return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
    }));
  };

  const createTask = async (taskData) => {
    try {
      console.log('Creating task with data:', taskData);
      
      await DailyTask.create({
        title: taskData.title,
        description: taskData.description,
        category: taskData.category,
        priority: taskData.priority,
        due_date: taskData.dueDate, // Map dueDate to due_date
        estimated_time: taskData.estimatedTime, // Map estimatedTime to estimated_time
        assigned_to: currentUser.email,
        status: 'pending',
        labels: taskData.labels || [],
        subtasks: taskData.subtasks || [],
        recurring: taskData.recurring || null,
        reminders: taskData.reminders || [],
        project: taskData.project || null,
        section: taskData.section || null
      });
      
      if (taskData.recurring) {
        toast.success(`✓ Recurring task created! Will repeat ${taskData.recurring.pattern}ly`);
      } else {
        toast.success('✓ Task created!');
      }
      
      // No need to reload data - real-time listener will update automatically
      setShowForm(false);
    } catch (error) {
      console.error("Error creating task:", error);
      alert('Failed to create task. Please try again.');
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      // Find the task to check if it's recurring
      const task = tasks.find(t => t.id === taskId);
      
      // Update the task status
      await DailyTask.update(taskId, { 
        status: newStatus,
        completed_date: newStatus === 'completed' ? new Date().toISOString() : null
      });
      
      // If task is completed and has recurring pattern, create next instance
      if (newStatus === 'completed' && task?.recurring) {
        try {
          const taskInstance = new DailyTask(task);
          const nextInstance = await taskInstance.generateNextRecurringInstance();
          
          if (nextInstance) {
            toast.success(`✓ Task completed! Next instance scheduled for ${nextInstance.due_date}`);
          } else {
            toast.success('✓ Task completed! (Recurring ended)');
          }
        } catch (error) {
          console.error('Error creating next recurring instance:', error);
          toast.success('✓ Task completed!');
        }
      }
      
      // No need to reload data - real-time listener will update automatically
    } catch (error) {
      console.error("Error updating task status:", error);
      alert('Failed to update task status. Please try again.');
    }
  };

  // Handle edit task
  const handleEditTask = (task) => {
    setEditingTask(task);
    setShowEditModal(true);
  };

  // Handle save edited task
  const handleSaveTask = async (updatedTask) => {
    try {
      await DailyTask.update(updatedTask.id, {
        title: updatedTask.title,
        description: updatedTask.description,
        category: updatedTask.category,
        priority: updatedTask.priority,
        due_date: updatedTask.dueDate,
        estimated_time: updatedTask.estimatedTime
      });
      
      // No need to reload data - real-time listener will update automatically
      setShowEditModal(false);
      setEditingTask(null);
    } catch (error) {
      console.error("Error updating task:", error);
      alert('Failed to update task. Please try again.');
    }
  };

  // Handle delete task
  const handleDeleteTask = async (task) => {
    try {
      await DailyTask.delete(task.id);
      
      // No need to reload data - real-time listener will update automatically
      setShowEditModal(false);
      setEditingTask(null);
    } catch (error) {
      console.error("Error deleting task:", error);
      alert('Failed to delete task. Please try again.');
    }
  };

  // Handle task request submission
  const handleSubmitTaskRequest = async (e) => {
    e.preventDefault();
    setSubmittingRequest(true);

    try {
      const toUser = availableUsers.find(u => u.email === requestForm.toUserEmail);
      
      await firestoreService.createTaskRequest({
        fromUserEmail: currentUser.email,
        fromUserName: `${currentUser.firstName} ${currentUser.lastName}`,
        toUserEmail: requestForm.toUserEmail,
        toUserName: `${toUser.firstName} ${toUser.lastName}`,
        taskTitle: requestForm.taskTitle,
        taskDescription: requestForm.taskDescription,
        taskPriority: requestForm.taskPriority,
        taskDueDate: requestForm.taskDueDate
      });

      alert('✅ Task request sent successfully!');
      setShowRequestModal(false);
      setRequestForm({
        toUserEmail: '',
        taskTitle: '',
        taskDescription: '',
        taskPriority: 'medium',
        taskDueDate: ''
      });
    } catch (error) {
      console.error('❌ Error sending task request:', error);
      alert('Failed to send task request. Please try again.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  // Accept task request
  const handleAcceptRequest = async (request) => {
    try {
      await firestoreService.acceptTaskRequest(request.id, request);
      alert('✅ Task request accepted! Check your tasks.');
    } catch (error) {
      console.error('❌ Error accepting task request:', error);
      alert('Failed to accept task request. Please try again.');
    }
  };

  // Reject task request
  const handleRejectRequest = async (request) => {
    const reason = prompt('Why are you declining this task? (Optional)');
    
    try {
      await firestoreService.rejectTaskRequest(request.id, request, reason || '');
      alert('Task request declined.');
    } catch (error) {
      console.error('❌ Error rejecting task request:', error);
      alert('Failed to reject task request. Please try again.');
    }
  };

  const getTaskCounts = () => {
    const overdueTasks = tasks.filter(task => 
      task.due_date && 
      isPastLocal(task.due_date) && 
      !isTodayLocal(task.due_date) && 
      task.status !== 'completed'
    );
    
    const todayTasksOnly = tasks.filter(task => 
      task.status !== 'completed' && 
      task.due_date && 
      isTodayLocal(task.due_date)
    );
    
    return {
      inbox: tasks.filter(task => task.status !== 'completed' && !task.due_date).length,
      today: overdueTasks.length + todayTasksOnly.length,
      upcoming: tasks.filter(task => 
        task.status !== 'completed' && 
        task.due_date && 
        (isTomorrowLocal(task.due_date) || parseLocalDate(task.due_date) > new Date()) &&
        !isPastLocal(task.due_date)
      ).length,
      overdue: overdueTasks.length,
      completed: tasks.filter(task => task.status === 'completed').length
    };
  };

  const counts = getTaskCounts();

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 bg-slate-200 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-slate-200 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Daily Tasks</h1>
          <p className="text-slate-600">
            Stay on top of your onboarding activities
            <span className="ml-3 text-xs text-slate-400">
              Press <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-slate-600">⌘K</kbd> to quick add
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Button 
              variant="outline" 
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className={`border-blue-600 text-blue-600 hover:bg-blue-50 ${
                activeSmartFilter ? 'bg-blue-50' : ''
              }`}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {activeSmartFilter && (
                <Badge className="ml-2 bg-blue-500 text-white text-xs flex items-center gap-1.5 pl-2 pr-1">
                  <span>{activeSmartFilter.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      applySmartFilter(null);
                    }}
                    className="hover:bg-blue-600 rounded-sm p-0.5 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
            </Button>
            <FilterDropdown
              isOpen={showFilterDropdown}
              onClose={() => setShowFilterDropdown(false)}
              onApplyFilter={applySmartFilter}
              currentUser={currentUser}
              activeFilter={activeSmartFilter}
            />
          </div>
          <Button 
            variant="outline" 
            onClick={() => setShowTemplateSelector(true)}
            className="border-green-600 text-green-600 hover:bg-green-50"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Templates
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowProductivityStats(true)}
            className="border-purple-600 text-purple-600 hover:bg-purple-50"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Stats
          </Button>
          {taskRequests.length > 0 && (
            <Button 
              variant="outline" 
              onClick={() => setShowRequestsPanel(true)}
              className="relative"
            >
              <Users className="w-4 h-4 mr-2" />
              Task Requests
              <Badge className="ml-2 bg-red-500 text-white">{taskRequests.length}</Badge>
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={() => setShowRequestModal(true)}
            className="border-blue-600 text-blue-600 hover:bg-blue-50"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Request Task
          </Button>
          <Button 
            onClick={() => canCreateTasks ? setShowForm(true) : toast.error('You need CREATE_TASKS permission')} 
            className="bg-blue-600 hover:bg-blue-700"
            disabled={!canCreateTasks}
            title={!canCreateTasks ? 'You need CREATE_TASKS permission' : ''}
          >
          <Plus className="w-4 h-4 mr-2" />
          Add Task
        </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Tabs value={activeFilter} onValueChange={setActiveFilter}>
          <TabsList className="bg-white/80 backdrop-blur-sm">
            <TabsTrigger value="inbox" className="flex items-center gap-2">
              <Inbox className="w-4 h-4" />
              Inbox ({counts.inbox})
            </TabsTrigger>
            <TabsTrigger value="today" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Today ({counts.today})
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Upcoming ({counts.upcoming})
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Completed ({counts.completed})
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('grid')}
              className={`rounded-none border-0 ${
                viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('list')}
              className={`rounded-none border-0 ${
                viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'
              }`}
            >
              <List className="w-4 h-4" />
            </Button>
      </div>
          
          <Button
            variant="outline"
            onClick={() => setShowCalendarView(true)}
            className="border-indigo-600 text-indigo-600 hover:bg-indigo-50"
          >
            <CalendarIcon className="w-4 h-4 mr-2" />
            Calendar View
          </Button>
          <Button
            variant="outline"
            onClick={() => setBulkActionMode(!bulkActionMode)}
            className={bulkActionMode ? "bg-blue-50 border-blue-500 text-blue-700" : ""}
          >
            {bulkActionMode ? 'Cancel Bulk Mode' : 'Select Multiple'}
          </Button>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {bulkActionMode && selectedTasks.length > 0 && (
        <div className="sticky top-0 z-30 bg-blue-600 text-white p-4 rounded-lg shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="font-semibold">{selectedTasks.length} task{selectedTasks.length !== 1 ? 's' : ''} selected</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAllTasks}
                className="text-white hover:bg-blue-700"
              >
                Select All ({filteredTasks.length})
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={bulkCompleteTasks}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Complete
              </Button>
              <Button
                onClick={bulkDeleteTasks}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
              <Button
                variant="ghost"
                onClick={clearSelection}
                className="text-white hover:bg-blue-700"
              >
                <X className="w-4 h-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <TaskForm
          onSubmit={createTask}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Edit Task Modal */}
      <TaskEditModal
        task={editingTask}
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={filteredTasks.map(t => t.id)}
          strategy={verticalListSortingStrategy}
        >
        {filteredTasks.length === 0 ? (
            <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {activeFilter === "completed" ? (
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              ) : (
                <Clock className="w-8 h-8 text-slate-400" />
              )}
            </div>
            <p className="text-slate-500 font-medium">
                {activeFilter === "inbox" && "No tasks in inbox"}
              {activeFilter === "today" && "No tasks scheduled for today"}
              {activeFilter === "upcoming" && "No upcoming tasks"}
              {activeFilter === "overdue" && "No overdue tasks"}
              {activeFilter === "completed" && "No completed tasks yet"}
            </p>
          </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTasks.map((task) => (
                <SortableTaskCard
                  key={task.id}
                  task={task}
                  isSelected={selectedTasks.includes(task.id)}
                  onToggleSelect={toggleTaskSelection}
                  bulkMode={bulkActionMode}
                  onStatusChange={updateTaskStatus}
                  onEdit={handleEditTask}
                  onDelete={handleDeleteTask}
                  canEdit={canCreateTasks}
                  canDelete={canDeleteAnyTask || task.createdBy === currentUser?.email}
                />
              ))}
          </div>
        ) : (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              {filteredTasks.map((task) => (
                <SortableTaskListItem
              key={task.id}
              task={task}
                  isSelected={selectedTasks.includes(task.id)}
                  onToggleSelect={toggleTaskSelection}
                  bulkMode={bulkActionMode}
              onStatusChange={updateTaskStatus}
              onEdit={handleEditTask}
              onDelete={handleDeleteTask}
              canEdit={canCreateTasks}
              canDelete={canDeleteAnyTask || task.createdBy === currentUser?.email}
            />
              ))}
      </div>
          )}
        </SortableContext>
      </DndContext>

      {/* Task Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 w-screen h-screen bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full">
            <div className="border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Request Task from Team Member</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowRequestModal(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
            
            <form onSubmit={handleSubmitTaskRequest} className="p-6 space-y-4">
              {/* Select User */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign To *
                </label>
                <select
                  value={requestForm.toUserEmail}
                  onChange={(e) => setRequestForm({...requestForm, toUserEmail: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a team member...</option>
                  {availableUsers.map((user) => (
                    <option key={user.email} value={user.email}>
                      {user.firstName} {user.lastName} - {user.position || user.department}
                    </option>
                  ))}
                </select>
              </div>

              {/* Task Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Task Title *
                </label>
                <input
                  type="text"
                  value={requestForm.taskTitle}
                  onChange={(e) => setRequestForm({...requestForm, taskTitle: e.target.value})}
                  placeholder="What needs to be done?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={requestForm.taskDescription}
                  onChange={(e) => setRequestForm({...requestForm, taskDescription: e.target.value})}
                  placeholder="Add details about this task..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Priority & Due Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select
                    value={requestForm.taskPriority}
                    onChange={(e) => setRequestForm({...requestForm, taskPriority: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                  <input
                    type="date"
                    value={requestForm.taskDueDate}
                    onChange={(e) => setRequestForm({...requestForm, taskDueDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowRequestModal(false)}
                  disabled={submittingRequest}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={submittingRequest}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {submittingRequest ? 'Sending...' : 'Send Request'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Requests Panel */}
      {showRequestsPanel && (
        <div className="fixed inset-0 w-screen h-screen bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Task Requests ({taskRequests.length})</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowRequestsPanel(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
            
            <div className="p-6">
              {taskRequests.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No pending task requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {taskRequests.map((request) => (
                    <Card key={request.id} className="border-2 border-blue-200 bg-blue-50">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center justify-between">
                          <span>{request.taskTitle}</span>
                          <Badge className={
                            request.taskPriority === 'high' ? 'bg-red-100 text-red-800' :
                            request.taskPriority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {request.taskPriority}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm font-medium text-gray-700">Requested by:</p>
                            <p className="text-sm text-gray-900">{request.fromUserName}</p>
                          </div>
                          {request.taskDescription && (
                            <div>
                              <p className="text-sm font-medium text-gray-700">Description:</p>
                              <p className="text-sm text-gray-900">{request.taskDescription}</p>
                            </div>
                          )}
                          {request.taskDueDate && (
                            <div>
                              <p className="text-sm font-medium text-gray-700">Due Date:</p>
                              <p className="text-sm text-gray-900">
                                {format(new Date(request.taskDueDate), 'MMMM dd, yyyy')}
                              </p>
                            </div>
                          )}
                          <div>
                            <p className="text-xs text-gray-500">
                              Sent {request.createdAt?.toDate ? format(request.createdAt.toDate(), 'MMM dd, h:mm a') : 'recently'}
                            </p>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-3 pt-3 border-t border-blue-200">
                            <Button
                              onClick={() => handleAcceptRequest(request)}
                              className="flex-1 bg-green-600 hover:bg-green-700"
                            >
                              <Check className="w-4 h-4 mr-2" />
                              Accept & Add to My Tasks
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleRejectRequest(request)}
                              className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                            >
                              <X className="w-4 h-4 mr-2" />
                              Decline
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Productivity Stats Modal */}
      {showProductivityStats && (
        <ProductivityStats 
          tasks={tasks} 
          onClose={() => setShowProductivityStats(false)} 
        />
      )}

      {/* Template Selector Modal */}
      {showTemplateSelector && (
        <TemplateSelector 
          currentUser={currentUser}
          onClose={() => setShowTemplateSelector(false)}
          onEditTemplate={() => setShowTemplateEditor(true)}
        />
      )}

      {/* Template Editor Modal */}
      {showTemplateEditor && (
        <TemplateEditor 
          onClose={() => setShowTemplateEditor(false)} 
        />
      )}

      {/* Smart Filters Modal */}
      {showSmartFilters && (
        <SmartFilters 
          currentUser={currentUser}
          onClose={() => setShowSmartFilters(false)}
          onApplyFilter={applySmartFilter}
        />
      )}

      {/* Calendar View Modal */}
      {showCalendarView && (
        <CalendarView 
          tasks={tasks}
          onClose={() => setShowCalendarView(false)}
          onTaskClick={(task) => {
            setEditingTask(task);
            setShowEditModal(true);
          }}
        />
      )}
    </div>
  );
};

export default TasksPage;

