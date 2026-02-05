import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Clock, CheckCircle2, UserPlus, Users, X, Check, Inbox, Flag, Calendar, CalendarIcon, TrendingUp, Sparkles, Filter, Trash2, LayoutGrid, List, GripVertical, Palette, Loader2, Send, Bell, Archive, ArchiveRestore } from 'lucide-react';
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
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { useViewAs } from '../contexts/ViewAsContext';
import { toast } from 'react-hot-toast';
import { DailyTask } from '../entities/DailyTask';
import { firestoreService } from '../services/firestoreService';
import { reminderService } from '../services/reminderService';
import { format } from 'date-fns';
import { PERMISSIONS } from '../entities/Permissions';
import { parseNaturalLanguageDate } from '../utils/dateParser';

// Shared: parse YYYY-MM-DD for filter logic (module-level to avoid stale closure)
const parseLocalDateForFilter = (dateString) => {
  if (!dateString) return null;
  const [y, m, d] = dateString.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const taskMatchesSmartFilter = (task, criteria) => {
  if (!criteria) return true;
  const priorityMap = {
    urgent: ['urgent', 'p1'], p1: ['urgent', 'p1'],
    high: ['high', 'p2'], p2: ['high', 'p2'],
    medium: ['medium', 'p3'], p3: ['medium', 'p3'],
    low: ['low', 'p4'], p4: ['low', 'p4']
  };
  if (criteria.priorities?.length > 0) {
    const ok = criteria.priorities.some(fp => (priorityMap[fp] || [fp]).includes(task.priority));
    if (!ok) return false;
  }
  if (criteria.labels?.length > 0) {
    if (!task.labels || !criteria.labels.some(l => task.labels.includes(l))) return false;
  }
  if (criteria.categories?.length > 0 && !criteria.categories.includes(task.category)) return false;
  if (criteria.dueWithinDays) {
    if (!task.due_date) return false;
    const due = parseLocalDateForFilter(task.due_date);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const max = new Date(today); max.setDate(today.getDate() + criteria.dueWithinDays);
    if (!due || due > max || due < today) return false;
  }
  if (criteria.estimatedTimeMax != null && (task.estimated_time == null || task.estimated_time > criteria.estimatedTimeMax)) return false;
  if (criteria.hasSubtasks && (!task.subtasks || task.subtasks.length === 0)) return false;
  if (criteria.hasReminders && (!task.reminders || task.reminders.length === 0)) return false;
  if (criteria.isRecurring && !task.recurring) return false;
  return true;
};

// Graphic team members for project requests
const GRAPHIC_TEAM = [
  { email: 'jasmine@smmluxurylistings.com', name: 'Jasmine' },
  { email: 'jone@smmluxurylistings.com', name: 'Jone' }
];

// Sortable Task Card Wrapper
const SortableTaskCard = ({ task, isSelected, onToggleSelect, bulkMode, ...props }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="relative group">
      {bulkMode && (
        <div className="absolute top-2 left-2 z-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(task.id)}
            className="h-5 w-5 rounded-md border-black/20 dark:border-white/20 text-[#0071e3] focus:ring-[#0071e3] cursor-pointer accent-[#0071e3]"
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
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="relative group">
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser, hasPermission, getCurrentRolePermissions } = useAuth();
  const { confirm } = useConfirm();
  const { isViewingAs, viewingAsUser } = useViewAs();
  const rolePerms = getCurrentRolePermissions?.()?.permissions || {};
  
  // Get effective user - when viewing as another user, show their tasks
  const effectiveUser = isViewingAs && viewingAsUser ? viewingAsUser : currentUser;
  
  // If user can access the Tasks page (module enabled), they can create tasks
  // No separate feature permission needed - module access = full access
  const canCreateTasks = true;
  const canAssignTasks = rolePerms.canAssignTasks === true || hasPermission(PERMISSIONS.ASSIGN_TASKS);
  const canViewAllTasks = rolePerms.canViewAllTasks === true || hasPermission(PERMISSIONS.VIEW_ALL_TASKS);
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
  
  // Project request state (for graphic design requests)
  const [showProjectRequestModal, setShowProjectRequestModal] = useState(false);
  const [projectRequestForm, setProjectRequestForm] = useState({
    toUserEmail: '',
    client: '',
    task: '',
    priority: 'medium',
    deadline: '',
    notes: ''
  });
  const [submittingProjectRequest, setSubmittingProjectRequest] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState(null);
  const [declineRequestModal, setDeclineRequestModal] = useState({ open: false, request: null, reason: '' });
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
  // Default to grid (card) view on mobile, list on desktop
  const [viewMode, setViewMode] = useState(() => 
    typeof window !== 'undefined' && window.innerWidth < 640 ? 'grid' : 'list'
  );
  const filterButtonRef = useRef(null);
  const [completionToast, setCompletionToast] = useState(null);
  const [lastCompletedTask, setLastCompletedTask] = useState(null);
  // Outbox: tasks the user requested others to do
  const [sentRequests, setSentRequests] = useState([]);
  const [outboxTaskMap, setOutboxTaskMap] = useState({}); // requestId -> task
  const [outboxLoading, setOutboxLoading] = useState(false);
  const [outboxUnreadCount, setOutboxUnreadCount] = useState(0);
  const [archivedTaskIds, setArchivedTaskIds] = useState(new Set());
  const [archivedRequestIds, setArchivedRequestIds] = useState(new Set());
  const [showArchivedTasks, setShowArchivedTasks] = useState(false);
  const [showArchivedOutbox, setShowArchivedOutbox] = useState(false);
  const outboxRequestRef = useRef(null);

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

  // Clear selection (keeps bulk mode active)
  const clearSelection = () => {
    setSelectedTasks([]);
  };
  
  // Exit bulk mode completely
  const exitBulkMode = () => {
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
      exitBulkMode();
    } catch (error) {
      console.error('Error bulk completing tasks:', error);
      toast.error('Failed to complete tasks');
    }
  };

  // Bulk delete tasks
  const bulkDeleteTasks = async () => {
    const confirmed = await confirm({
      title: 'Delete Tasks',
      message: `Delete ${selectedTasks.length} tasks? This cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger'
    });
    if (!confirmed) return;

    try {
      await Promise.all(
        selectedTasks.map(taskId => DailyTask.delete(taskId))
      );
      await refreshTasks();
      toast.success(`Deleted ${selectedTasks.length} tasks`);
      exitBulkMode();
    } catch (error) {
      console.error('Error bulk deleting tasks:', error);
      toast.error('Failed to delete tasks');
    }
  };

  // Drag and drop sensors with activation constraints
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    }),
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
        setShowProjectRequestModal(false);
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

  // Helper function to check if task was completed more than 24 hours ago
  const isCompletedMoreThan24HoursAgo = (completedDateString) => {
    if (!completedDateString) return false;
    const completedDate = new Date(completedDateString);
    const now = new Date();
    const hoursSinceCompletion = (now - completedDate) / (1000 * 60 * 60); // Convert to hours
    return hoursSinceCompletion > 24;
  };

  // Helper function to build full datetime from due_date and due_time
  const getTaskDateTime = (task) => {
    if (!task.due_date) return null;
    
    const taskDate = parseLocalDate(task.due_date);
    if (!taskDate) return null;
    
    // If task has a due_time, combine it with due_date
    if (task.due_time) {
      const [hours, minutes] = task.due_time.split(':').map(Number);
      taskDate.setHours(hours || 0, minutes || 0, 0, 0);
    } else {
      // Default to end of day if no time specified
      taskDate.setHours(23, 59, 59, 999);
    }
    
    return taskDate;
  };

  // Helper function to check if task is due today (considering time)
  const isDueToday = (task) => {
    if (!task.due_date) return false;
    
    const taskDateTime = getTaskDateTime(task);
    if (!taskDateTime) return false;
    
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    return taskDateTime >= todayStart && taskDateTime <= todayEnd;
  };

  // Helper function to check if task is overdue (considering time)
  const isOverdue = (task) => {
    if (!task.due_date) return false;
    if (task.status === 'completed') return false;
    
    const taskDateTime = getTaskDateTime(task);
    if (!taskDateTime) return false;
    
    const now = new Date();
    return taskDateTime < now;
  };

  // Helper function to check if task is due in the future (considering time)
  const isDueInFuture = (task) => {
    if (!task.due_date) return false;
    
    const taskDateTime = getTaskDateTime(task);
    if (!taskDateTime) return false;
    
    const now = new Date();
    return taskDateTime > now;
  };

  // Load available users (use same source as User Management)
  useEffect(() => {
    const loadUsers = async () => {
      try {
        console.log('👥 Loading users for task requests...');
        const approvedUsers = await firestoreService.getApprovedUsers();
        console.log('👥 Total approved users from Firestore:', approvedUsers.length, approvedUsers);
        
        // Filter out current user
        const others = approvedUsers.filter(user => user.email !== currentUser.email);
        console.log('👥 Available users (excluding self):', others.length, others);
        setAvailableUsers(others);
      } catch (error) {
        console.error('❌ Error loading users:', error);
      }
    };

    if (currentUser?.email) {
      console.log('👤 Current user:', currentUser.email);
      loadUsers();
    }
  }, [currentUser?.email]);

  // Log when Request Task modal opens
  useEffect(() => {
    if (showRequestModal) {
      console.log('🚀 Request Task modal opened');
      console.log('👥 Available users at modal open:', availableUsers.length, availableUsers);
      console.log('👤 Current user:', currentUser?.email);
    }
  }, [showRequestModal]);

  // Load task requests once (no real-time listener for performance)
  useEffect(() => {
    if (!currentUser?.email) return;

    const loadTaskRequests = async () => {
      try {
        const requests = await firestoreService.getTaskRequests(currentUser.email);
        const pendingRequests = (requests || []).filter(r => r.status === 'pending');
        setTaskRequests(pendingRequests);
      } catch (error) {
        console.error('Error loading task requests:', error);
      }
    };

    loadTaskRequests();
  }, [currentUser?.email]);

  // Load sent request count for Outbox tab (lightweight)
  useEffect(() => {
    if (!effectiveUser?.email) return;
    firestoreService.getSentTaskRequests(effectiveUser.email).then((r) => setSentRequests(r || []));
  }, [effectiveUser?.email]);

  // Load full outbox (sent requests + task statuses) when user opens Outbox tab
  useEffect(() => {
    if (!effectiveUser?.email || activeFilter !== 'outbox') return;

    const loadOutboxDetails = async () => {
      setOutboxLoading(true);
      try {
        const requests = await firestoreService.getSentTaskRequests(effectiveUser.email);
        setSentRequests(requests || []);
        const map = {};
        await Promise.all(
          (requests || [])
            .filter((r) => r.status === 'accepted' && r.taskId)
            .map(async (r) => {
              const task = await firestoreService.getTaskById(r.taskId);
              if (task) map[r.id] = task;
            })
        );
        setOutboxTaskMap(map);
      } catch (error) {
        console.error('Error loading outbox:', error);
      } finally {
        setOutboxLoading(false);
      }
    };

    loadOutboxDetails();
  }, [effectiveUser?.email, activeFilter]);

  // Sync URL ?tab=outbox&requestId= with activeFilter and scroll to request
  useEffect(() => {
    const tab = searchParams.get('tab');
    const requestId = searchParams.get('requestId');
    if (tab === 'outbox') {
      setActiveFilter('outbox');
    }
    if (requestId && tab === 'outbox') {
      outboxRequestRef.current = requestId;
    }
  }, [searchParams]);

  // Scroll to outbox request when list is ready
  useEffect(() => {
    if (activeFilter !== 'outbox' || !outboxRequestRef.current || sentRequests.length === 0) return;
    const id = outboxRequestRef.current;
    outboxRequestRef.current = null;
    requestAnimationFrame(() => {
      const el = document.getElementById(`outbox-request-${id}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }, [activeFilter, sentRequests.length]);

  // Load archived task and request ids (per-user, local)
  useEffect(() => {
    if (!effectiveUser?.email) return;
    Promise.all([
      firestoreService.getArchivedTaskIds(effectiveUser.email),
      firestoreService.getArchivedRequestIds(effectiveUser.email)
    ]).then(([taskIds, requestIds]) => {
      setArchivedTaskIds(new Set(taskIds || []));
      setArchivedRequestIds(new Set(requestIds || []));
    });
  }, [effectiveUser?.email]);

  // Unread count for outbox-related notifications (task_accepted, task_completed)
  useEffect(() => {
    if (!currentUser?.email) return;

    const loadUnread = async () => {
      try {
        const notifs = await firestoreService.getNotifications(currentUser.email);
        const outboxTypes = ['task_accepted', 'task_completed'];
        const unread = (notifs || []).filter(
          (n) => !n.read && outboxTypes.includes(n.type)
        ).length;
        setOutboxUnreadCount(unread);
      } catch (error) {
        console.error('Error loading notification count:', error);
      }
    };

    loadUnread();
    const interval = setInterval(loadUnread, 30000);
    return () => clearInterval(interval);
  }, [currentUser?.email]);

  // Refresh tasks function - call after create/edit/delete actions
  const refreshTasks = async () => {
    try {
      const tasksData = await DailyTask.filter({ assigned_to: effectiveUser.email }, '-due_date');
      setTasks(tasksData);
    } catch (error) {
      console.error('Error refreshing tasks:', error);
    }
  };

  // Load initial data once (no real-time listener for performance)
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const tasksData = await DailyTask.filter({ assigned_to: effectiveUser.email }, '-due_date');
        setTasks(tasksData);
      } catch (error) {
        console.error('Error loading tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [effectiveUser?.email]);

  // Force re-filter every minute to auto-hide tasks that pass 24-hour mark
  const [timeTick, setTimeTick] = useState(0);
  
  useEffect(() => {
    // Update every minute to check if tasks have passed 24-hour mark
    const interval = setInterval(() => {
      setTimeTick(prev => prev + 1);
    }, 60000); // 60 seconds = 1 minute

    return () => clearInterval(interval);
  }, []);

  // Filter tasks: run logic inside effect so we always use current state (no stale closure)
  useEffect(() => {
    let filtered = [...tasks];
    switch (activeFilter) {
      case 'inbox':
        filtered = tasks.filter(t => t.status !== 'completed' && !t.due_date);
        break;
      case 'today': {
        const overdue = tasks.filter(t => t.status !== 'completed' && isOverdue(t));
        const today = tasks.filter(t => t.status !== 'completed' && isDueToday(t) && !isOverdue(t));
        filtered = [...overdue, ...today];
        break;
      }
      case 'upcoming':
        filtered = tasks.filter(t => t.status !== 'completed' && t.due_date && isDueInFuture(t) && !isDueToday(t));
        break;
      case 'overdue':
        filtered = tasks.filter(t => t.status !== 'completed' && isOverdue(t) && !isDueToday(t));
        break;
      case 'completed':
        filtered = tasks.filter(t => t.status === 'completed' && !isCompletedMoreThan24HoursAgo(t.completed_date) && (showArchivedTasks || !archivedTaskIds.has(t.id)));
        break;
      default:
        break;
    }
    if (activeFilter !== 'outbox' && activeFilter !== 'completed') {
      filtered = filtered.filter(t => !archivedTaskIds.has(t.id));
    }
    if (activeSmartFilter?.criteria) {
      filtered = filtered.filter(t => taskMatchesSmartFilter(t, activeSmartFilter.criteria));
    }
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1, p1: 4, p2: 3, p3: 2, p4: 1 };
    setFilteredTasks([...filtered].sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
      return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
    }));
  }, [activeFilter, tasks, activeSmartFilter, timeTick, archivedTaskIds, showArchivedTasks]);

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

  // Outbox list with same smart filter as main list (filter by linked task when filter is active)
  const displayedOutboxRequests = useMemo(() => {
    const base = showArchivedOutbox ? sentRequests : sentRequests.filter((r) => !archivedRequestIds.has(r.id));
    if (!activeSmartFilter?.criteria) return base;
    return base.filter((r) => {
      const task = outboxTaskMap[r.id];
      return task && taskMatchesSmartFilter(task, activeSmartFilter.criteria);
    });
  }, [sentRequests, showArchivedOutbox, archivedRequestIds, activeSmartFilter, outboxTaskMap]);

  const createTask = async (taskData) => {
    try {
      console.log('Creating task with data:', taskData);
      // No due date + self-assigned (quick add) → default to today so it shows in Today; Inbox is for requested tasks
      const dueDate = taskData.dueDate || format(new Date(), 'yyyy-MM-dd');

      await DailyTask.create({
        title: taskData.title,
        description: taskData.description,
        category: taskData.category,
        priority: taskData.priority,
        due_date: dueDate,
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
        const { pattern, interval } = taskData.recurring;
        let repeatText = '';
        if (pattern === 'daily') {
          repeatText = interval === 1 ? 'daily' : `every ${interval} days`;
        } else if (pattern === 'weekly') {
          repeatText = interval === 1 ? 'weekly' : interval === 2 ? 'biweekly' : `every ${interval} weeks`;
        } else if (pattern === 'monthly') {
          repeatText = interval === 1 ? 'monthly' : `every ${interval} months`;
        } else if (pattern === 'yearly') {
          repeatText = interval === 1 ? 'yearly' : `every ${interval} years`;
        }
        toast.success(`✓ Recurring task created! Will repeat ${repeatText}`);
      } else {
        toast.success('✓ Task created!');
      }
      
      // Refresh tasks after creation
      await refreshTasks();
      setShowForm(false);
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error('Failed to create task. Please try again.');
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
      
      // Show custom toast notification when completing a task
      if (newStatus === 'completed') {
        setLastCompletedTask({ id: taskId, title: task.title });
        setCompletionToast({ message: '1 task completed', taskId, taskTitle: task.title });
        
        // Auto-hide toast after 5 seconds
        setTimeout(() => {
          setCompletionToast(null);
          setLastCompletedTask(null);
        }, 5000);
      }
      
      // If task is completed and has recurring pattern, create next instance
      if (newStatus === 'completed' && task?.recurring) {
        try {
          const taskInstance = new DailyTask(task);
          const nextInstance = await taskInstance.generateNextRecurringInstance();
          
          if (nextInstance) {
            console.log(`✓ Task completed! Next instance scheduled for ${nextInstance.due_date}`);
          } else {
            console.log('✓ Task completed! (Recurring ended)');
          }
        } catch (error) {
          console.error('Error creating next recurring instance:', error);
        }
      }
      
      // Refresh tasks after status update
      await refreshTasks();
    } catch (error) {
      console.error("Error updating task status:", error);
      toast.error('Failed to update task status. Please try again.');
    }
  };
  
  // Undo task completion
  const undoTaskCompletion = async () => {
    if (!lastCompletedTask) return;
    
    try {
      await DailyTask.update(lastCompletedTask.id, { 
        status: 'pending',
        completed_date: null
      });
      
      setCompletionToast(null);
      setLastCompletedTask(null);
      toast.success('Task restored');
      await refreshTasks();
    } catch (error) {
      console.error("Error undoing task completion:", error);
      toast.error("Failed to undo");
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
      // Build update object, only including defined values
      const updates = {
        title: updatedTask.title,
        description: updatedTask.description,
        category: updatedTask.category,
        priority: updatedTask.priority
      };
      
      // Handle due_date - use due_date if present, otherwise dueDate, convert empty string to null
      const dueDate = updatedTask.due_date !== undefined ? updatedTask.due_date : updatedTask.dueDate;
      if (dueDate !== undefined) {
        updates.due_date = dueDate || null;
      }
      
      // Handle estimated_time
      if (updatedTask.estimated_time !== undefined || updatedTask.estimatedTime !== undefined) {
        updates.estimated_time = updatedTask.estimated_time !== undefined 
          ? updatedTask.estimated_time 
          : updatedTask.estimatedTime;
      }
      
      await DailyTask.update(updatedTask.id, updates);

      // Refresh tasks after update
      await refreshTasks();
      setShowEditModal(false);
      setEditingTask(null);

      // If this task is linked to an outbox request, refresh outbox so sender sees updated status
      if (updatedTask.taskRequestId && effectiveUser?.email) {
        const requests = await firestoreService.getSentTaskRequests(effectiveUser.email);
        setSentRequests(requests || []);
        const map = {};
        await Promise.all(
          (requests || [])
            .filter((r) => r.status === 'accepted' && r.taskId)
            .map(async (r) => {
              const t = await firestoreService.getTaskById(r.taskId);
              if (t) map[r.id] = t;
            })
        );
        setOutboxTaskMap(map);
      }
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error('Failed to update task. Please try again.');
    }
  };

  // Handle delete task
  const handleDeleteTask = async (task) => {
    try {
      await DailyTask.delete(task.id);
      
      // Refresh tasks after delete
      await refreshTasks();
      setShowEditModal(false);
      setEditingTask(null);
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error('Failed to delete task. Please try again.');
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

      toast.success('Task request sent successfully!');
      setShowRequestModal(false);
      setRequestForm({
        toUserEmail: '',
        taskTitle: '',
        taskDescription: '',
        taskPriority: 'medium',
        taskDueDate: ''
      });
      // Refresh outbox count
      const sent = await firestoreService.getSentTaskRequests(currentUser.email);
      setSentRequests(sent || []);
    } catch (error) {
      console.error('❌ Error sending task request:', error);
      toast.error('Failed to send task request. Please try again.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  // Accept task request
  const handleAcceptRequest = async (request) => {
    if (processingRequestId) return; // Prevent double-clicks
    
    try {
      setProcessingRequestId(request.id);
      await firestoreService.acceptTaskRequest(request.id, request);
      
      // Remove from local state immediately
      setTaskRequests(prev => prev.filter(r => r.id !== request.id));
      
      // Refresh tasks to show the new task
      await refreshTasks();
      
      toast.success('Task request accepted! Check your tasks.');
    } catch (error) {
      console.error('❌ Error accepting task request:', error);
      toast.error('Failed to accept task request. Please try again.');
    } finally {
      setProcessingRequestId(null);
    }
  };

  // Reject task request (reason from decline modal)
  const handleRejectRequest = async (request, reason = '') => {
    if (processingRequestId) return;
    try {
      setProcessingRequestId(request.id);
      setDeclineRequestModal(prev => ({ ...prev, open: false, request: null }));
      await firestoreService.rejectTaskRequest(request.id, request, reason || '');
      setTaskRequests(prev => prev.filter(r => r.id !== request.id));
      toast.success('Task request declined.');
    } catch (error) {
      console.error('❌ Error rejecting task request:', error);
      toast.error('Failed to reject task request. Please try again.');
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleArchiveTask = async (taskId) => {
    if (!effectiveUser?.email) return;
    try {
      await firestoreService.archiveTaskForUser(effectiveUser.email, taskId);
      setArchivedTaskIds((prev) => new Set([...prev, taskId]));
      toast.success('Task archived');
    } catch (error) {
      console.error('Error archiving task:', error);
      toast.error('Failed to archive');
    }
  };

  const handleUnarchiveTask = async (taskId) => {
    if (!effectiveUser?.email) return;
    try {
      await firestoreService.unarchiveTaskForUser(effectiveUser.email, taskId);
      setArchivedTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
      toast.success('Task restored from archive');
    } catch (error) {
      console.error('Error unarchiving task:', error);
      toast.error('Failed to unarchive');
    }
  };

  const handleArchiveRequest = async (requestId) => {
    if (!effectiveUser?.email) return;
    try {
      await firestoreService.archiveRequestForUser(effectiveUser.email, requestId);
      setArchivedRequestIds((prev) => new Set([...prev, requestId]));
      toast.success('Request archived');
    } catch (error) {
      console.error('Error archiving request:', error);
      toast.error('Failed to archive');
    }
  };

  const handleUnarchiveRequest = async (requestId) => {
    if (!effectiveUser?.email) return;
    try {
      await firestoreService.unarchiveRequestForUser(effectiveUser.email, requestId);
      setArchivedRequestIds((prev) => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
      const requests = await firestoreService.getSentTaskRequests(effectiveUser.email);
      setSentRequests(requests || []);
      toast.success('Request restored from archive');
    } catch (error) {
      console.error('Error unarchiving request:', error);
      toast.error('Failed to unarchive');
    }
  };

  // Submit graphic project request
  const handleSubmitProjectRequest = async (e) => {
    e.preventDefault();
    
    if (!projectRequestForm.deadline) {
      toast.error('Deadline is required');
      return;
    }
    
    if (!projectRequestForm.toUserEmail) {
      toast.error('Please select a designer');
      return;
    }
    
    setSubmittingProjectRequest(true);
    try {
      const designer = GRAPHIC_TEAM.find(m => m.email === projectRequestForm.toUserEmail);
      
      await firestoreService.createProjectRequest({
        fromUserEmail: currentUser.email,
        fromUserName: currentUser.displayName || `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email,
        toUserEmail: projectRequestForm.toUserEmail,
        toUserName: designer?.name || projectRequestForm.toUserEmail,
        client: projectRequestForm.client,
        task: projectRequestForm.task,
        priority: projectRequestForm.priority,
        deadline: projectRequestForm.deadline,
        notes: projectRequestForm.notes
      });
      
      toast.success(`Project request sent to ${designer?.name || 'designer'}!`);
      setShowProjectRequestModal(false);
      setProjectRequestForm({
        toUserEmail: '',
        client: '',
        task: '',
        priority: 'medium',
        deadline: '',
        notes: ''
      });
    } catch (error) {
      console.error('Error sending project request:', error);
      toast.error('Failed to send request');
    } finally {
      setSubmittingProjectRequest(false);
    }
  };

  const getTaskCounts = () => {
    const overdueTasks = tasks.filter(task => 
      task.status !== 'completed' && isOverdue(task) && !isDueToday(task)
    );
    
    const todayTasksOnly = tasks.filter(task => 
      task.status !== 'completed' && isDueToday(task) && !isOverdue(task)
    );
    
    return {
      inbox: tasks.filter(task => task.status !== 'completed' && !task.due_date).length,
      today: overdueTasks.length + todayTasksOnly.length,
      upcoming: tasks.filter(task => 
        task.status !== 'completed' && 
        task.due_date && 
        isDueInFuture(task) &&
        !isDueToday(task)
      ).length,
      overdue: overdueTasks.length,
      completed: tasks.filter(task => 
        task.status === 'completed' && 
        !isCompletedMoreThan24HoursAgo(task.completed_date) &&
        !archivedTaskIds.has(task.id)
      ).length
    };
  };

  const counts = getTaskCounts();

  if (loading) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <div className="h-8 bg-black/5 dark:bg-white/10 rounded-xl animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-black/5 dark:bg-white/10 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] sm:text-[34px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em]">Daily Tasks</h1>
          <p className="text-[15px] text-[#86868b] mt-1">
            Stay on top of your onboarding activities
            <span className="ml-3 text-[11px] text-[#86868b]">
              Press <kbd className="px-1.5 py-0.5 bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/20 rounded text-[#1d1d1f] dark:text-white">⌘K</kbd> to quick add
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <button 
              ref={filterButtonRef}
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-colors ${
                activeSmartFilter 
                  ? 'bg-[#0071e3]/10 text-[#0071e3]' 
                  : 'bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {activeSmartFilter && (
                <span className="flex items-center gap-1.5 ml-1 px-2 py-0.5 bg-[#0071e3] text-white text-[11px] rounded-md">
                  <span>{activeSmartFilter.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      applySmartFilter(null);
                    }}
                    className="hover:bg-[#0077ed] rounded-sm p-0.5 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </button>
            <FilterDropdown
              isOpen={showFilterDropdown}
              onClose={() => setShowFilterDropdown(false)}
              onApplyFilter={applySmartFilter}
              currentUser={currentUser}
              activeFilter={activeSmartFilter}
              buttonRef={filterButtonRef}
            />
          </div>
          <button 
            onClick={() => setShowTemplateSelector(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#34c759]/10 text-[#34c759] text-[13px] font-medium hover:bg-[#34c759]/20 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Templates
          </button>
          <button 
            onClick={() => setShowProductivityStats(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#af52de]/10 text-[#af52de] text-[13px] font-medium hover:bg-[#af52de]/20 transition-colors"
          >
            <TrendingUp className="w-4 h-4" />
            Stats
          </button>
          {taskRequests.length > 0 && (
            <button 
              onClick={() => setShowRequestsPanel(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[13px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
            >
              <Users className="w-4 h-4" />
              Task Requests
              <span className="px-1.5 py-0.5 bg-[#ff3b30] text-white text-[11px] rounded-md">{taskRequests.length}</span>
            </button>
          )}
          <button 
            onClick={() => setShowRequestModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0071e3]/10 text-[#0071e3] text-[13px] font-medium hover:bg-[#0071e3]/20 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Request Task
          </button>
          <button 
            onClick={() => canCreateTasks ? setShowForm(true) : toast.error('You need CREATE_TASKS permission')} 
            disabled={!canCreateTasks}
            title={!canCreateTasks ? 'You need CREATE_TASKS permission' : ''}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0071e3] text-white text-[13px] font-medium hover:bg-[#0077ed] transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-1 p-1 bg-black/5 dark:bg-white/5 rounded-xl">
          {[
            { value: 'inbox', icon: Inbox, label: 'Inbox', count: counts.inbox },
            { value: 'today', icon: Calendar, label: 'Today', count: counts.today },
            { value: 'upcoming', icon: Clock, label: 'Upcoming', count: counts.upcoming },
            { value: 'completed', icon: CheckCircle2, label: 'Completed', count: counts.completed },
            { value: 'outbox', icon: Send, label: 'Outbox', count: sentRequests.length, badge: outboxUnreadCount }
          ].map(tab => (
            <button
              key={tab.value}
              onClick={() => setActiveFilter(tab.value)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-medium transition-colors ${
                activeFilter === tab.value
                  ? 'bg-white dark:bg-[#2c2c2e] text-[#0071e3] shadow-sm'
                  : 'text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label} ({tab.count})
              {tab.badge > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-[#ff3b30] text-white text-[10px] font-medium rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center bg-black/5 dark:bg-white/10 rounded-xl overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 transition-colors ${
                viewMode === 'grid' ? 'bg-[#0071e3]/10 text-[#0071e3]' : 'text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 transition-colors ${
                viewMode === 'list' ? 'bg-[#0071e3]/10 text-[#0071e3]' : 'text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          
          <button
            onClick={() => setShowCalendarView(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#5856d6]/10 text-[#5856d6] text-[13px] font-medium hover:bg-[#5856d6]/20 transition-colors"
          >
            <CalendarIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Calendar</span>
          </button>
          <button
            onClick={() => setBulkActionMode(!bulkActionMode)}
            className={`px-3 py-2 rounded-xl text-[13px] font-medium transition-colors ${
              bulkActionMode 
                ? 'bg-[#0071e3]/10 text-[#0071e3]' 
                : 'bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15'
            }`}
          >
            {bulkActionMode ? 'Cancel' : 'Select'}
          </button>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {bulkActionMode && (
        <div className="sticky top-0 z-30 bg-[#0071e3] text-white p-4 rounded-2xl shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-[14px] font-medium">
                {selectedTasks.length > 0 
                  ? `${selectedTasks.length} task${selectedTasks.length !== 1 ? 's' : ''} selected`
                  : 'Select tasks or use Select All'
                }
              </span>
              <button
                onClick={selectedTasks.length === filteredTasks.length ? clearSelection : selectAllTasks}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/20 text-white text-[12px] font-medium hover:bg-white/30 transition-colors"
              >
                {selectedTasks.length === filteredTasks.length ? (
                  <>
                    <X className="w-3.5 h-3.5" />
                    Deselect All
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Select All ({filteredTasks.length})
                  </>
                )}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={bulkCompleteTasks}
                disabled={selectedTasks.length === 0}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#34c759] text-white text-[12px] font-medium hover:bg-[#2db14e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Complete
              </button>
              <button
                onClick={bulkDeleteTasks}
                disabled={selectedTasks.length === 0}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#ff3b30] text-white text-[12px] font-medium hover:bg-[#e5342b] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
              <button
                onClick={() => setBulkActionMode(false)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/20 text-white text-[12px] font-medium hover:bg-white/30 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Cancel
              </button>
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

      {/* Edit Task Modal - when on outbox tab, pass outbox tasks so modal can open/edit linked tasks */}
      <TaskEditModal
        task={editingTask}
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        tasks={activeFilter === 'outbox' ? Object.values(outboxTaskMap) : filteredTasks}
        onNavigate={(newTask) => setEditingTask(newTask)}
      />

      {/* Outbox: tasks you requested others to do */}
      {activeFilter === 'outbox' ? (
        <div className="bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden">
          <div className="p-4 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
            <p className="text-[13px] text-[#86868b]">
              Tasks you requested from others. You’ll get a notification when someone accepts or completes them.
            </p>
            {outboxUnreadCount > 0 && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#ff3b30]/10 text-[#ff3b30] text-[12px] font-medium">
                <Bell className="w-3.5 h-3.5" />
                {outboxUnreadCount} new
              </span>
            )}
          </div>
          {outboxLoading ? (
            <div className="p-12 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-[#0071e3] animate-spin" />
            </div>
          ) : sentRequests.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-black/5 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8 text-[#86868b]" />
              </div>
              <p className="text-[15px] text-[#86868b] font-medium">No requested tasks yet</p>
              <p className="text-[13px] text-[#86868b] mt-1">Use “Request Task” to ask someone else to do a task</p>
            </div>
          ) : displayedOutboxRequests.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[15px] text-[#86868b] font-medium">No outbox items match the current filter</p>
              <p className="text-[13px] text-[#86868b] mt-1">Clear the filter or add requests that match</p>
            </div>
          ) : (
            <>
              {sentRequests.some((r) => archivedRequestIds.has(r.id)) && (
                <div className="px-4 py-2 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
                  <span className="text-[12px] text-[#86868b]">Archived is local to you</span>
                  <button
                    type="button"
                    onClick={() => setShowArchivedOutbox(!showArchivedOutbox)}
                    className="text-[12px] font-medium text-[#0071e3] hover:underline"
                  >
                    {showArchivedOutbox ? 'Hide archived' : 'Show archived'}
                  </button>
                </div>
              )}
              <ul className="divide-y divide-black/5 dark:divide-white/10">
              {displayedOutboxRequests.map((req) => {
                const task = outboxTaskMap[req.id];
                const statusLabel = req.status === 'pending' ? 'Pending' : req.status === 'accepted' ? (task?.status === 'completed' ? 'Completed' : 'In progress') : 'Declined';
                const statusColor = req.status === 'pending' ? 'text-[#ff9500]' : req.status === 'accepted' ? (task?.status === 'completed' ? 'text-[#34c759]' : 'text-[#0071e3]') : 'text-[#ff3b30]';
                const isArchived = archivedRequestIds.has(req.id);
                const canOpenTask = task && (req.status === 'accepted');
                return (
                  <li
                    key={req.id}
                    id={`outbox-request-${req.id}`}
                    role={canOpenTask ? 'button' : undefined}
                    onClick={canOpenTask ? () => { setEditingTask(task); setShowEditModal(true); } : undefined}
                    className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${canOpenTask ? 'cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.06]' : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'} transition-colors`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-[#1d1d1f] dark:text-white">{req.taskTitle}</p>
                      <p className="text-[12px] text-[#86868b] mt-0.5">
                        To: {req.toUserName || req.toUserEmail}
                        {req.taskDueDate && ` · Due ${format(new Date(req.taskDueDate), 'MMM d, yyyy')}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <span className={`text-[12px] font-medium ${statusColor}`}>{statusLabel}</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); isArchived ? handleUnarchiveRequest(req.id) : handleArchiveRequest(req.id); }}
                        className="p-1.5 rounded-lg text-[#86868b] hover:bg-black/5 dark:hover:bg-white/10 hover:text-[#1d1d1f] dark:hover:text-white"
                        title={isArchived ? 'Restore from archive' : 'Archive (only you)'}
                      >
                        {isArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                      </button>
                    </div>
                  </li>
                );
              })}
              </ul>
            </>
          )}
        </div>
      ) : (
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
              <div className="w-16 h-16 bg-black/5 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                {activeFilter === "completed" ? (
                  <CheckCircle2 className="w-8 h-8 text-[#34c759]" />
                ) : (
                  <Clock className="w-8 h-8 text-[#86868b]" />
                )}
              </div>
              <p className="text-[15px] text-[#86868b] font-medium">
                {activeFilter === "inbox" && "No tasks in inbox"}
                {activeFilter === "today" && "No tasks scheduled for today"}
                {activeFilter === "upcoming" && "No upcoming tasks"}
                {activeFilter === "overdue" && "No overdue tasks"}
                {activeFilter === "completed" && (showArchivedTasks ? "No archived tasks" : "No completed tasks yet")}
              </p>
              {activeFilter === "completed" && tasks.some((t) => t.status === 'completed' && archivedTaskIds.has(t.id)) && (
                <button type="button" onClick={() => setShowArchivedTasks(!showArchivedTasks)} className="mt-2 text-[13px] font-medium text-[#0071e3] hover:underline">
                  {showArchivedTasks ? 'Hide archived' : 'Show archived'}
                </button>
              )}
            </div>
          ) : (
            <>
              {activeFilter === 'completed' && tasks.some((t) => t.status === 'completed' && archivedTaskIds.has(t.id)) && (
                <div className="mb-3 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/10 flex items-center justify-between">
                  <span className="text-[12px] text-[#86868b]">Archived is local to you</span>
                  <button type="button" onClick={() => setShowArchivedTasks(!showArchivedTasks)} className="text-[12px] font-medium text-[#0071e3] hover:underline">
                    {showArchivedTasks ? 'Hide archived' : 'Show archived'}
                  </button>
                </div>
              )}
              {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  showArchiveButton={activeFilter === 'completed'}
                  onArchive={handleArchiveTask}
                  onUnarchive={handleUnarchiveTask}
                  isArchived={archivedTaskIds.has(task.id)}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden">
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
                  showArchiveButton={activeFilter === 'completed'}
                  onArchive={handleArchiveTask}
                  onUnarchive={handleUnarchiveTask}
                  isArchived={archivedTaskIds.has(task.id)}
                />
              ))}
            </div>
          )}
            </>
          )}
        </SortableContext>
      </DndContext>
      )}

      {/* Task Request Modal */}
      {showRequestModal && createPortal(
        <div className="modal-overlay bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl max-w-lg w-full border border-black/10 dark:border-white/10 shadow-2xl">
            <div className="border-b border-black/5 dark:border-white/10 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">Request Task from Team Member</h2>
                <button onClick={() => setShowRequestModal(false)} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                  <X className="w-5 h-5 text-[#86868b]" />
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmitTaskRequest} className="p-6 space-y-4">
              {/* Debug info */}
              {availableUsers.length === 0 && (
                <div className="bg-[#ff9500]/10 border border-[#ff9500]/20 rounded-xl p-3 text-[13px] text-[#ff9500]">
                  ⚠️ No other team members found. Total employees: {availableUsers.length}
                </div>
              )}
              
              {/* Select User */}
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                  Assign To * ({availableUsers.length} available)
                </label>
                <select
                  value={requestForm.toUserEmail}
                  onChange={(e) => setRequestForm({...requestForm, toUserEmail: e.target.value})}
                  className="w-full h-11 px-3 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  required
                >
                  <option value="">Select a team member...</option>
                  {availableUsers.map((user) => (
                    <option key={user.email} value={user.email}>
                      {user.firstName} {user.lastName}{user.department ? ` - ${user.department}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Task Title */}
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                  Task Title *
                </label>
                <input
                  type="text"
                  value={requestForm.taskTitle}
                  onChange={(e) => setRequestForm({...requestForm, taskTitle: e.target.value})}
                  placeholder="What needs to be done?"
                  className="w-full h-11 px-4 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                  Description
                </label>
                <textarea
                  value={requestForm.taskDescription}
                  onChange={(e) => setRequestForm({...requestForm, taskDescription: e.target.value})}
                  placeholder="Add details about this task..."
                  rows={3}
                  className="w-full px-4 py-3 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none"
                />
              </div>

              {/* Priority & Due Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">Priority</label>
                  <select
                    value={requestForm.taskPriority}
                    onChange={(e) => setRequestForm({...requestForm, taskPriority: e.target.value})}
                    className="w-full h-11 px-3 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">Due Date</label>
                  <input
                    type="date"
                    value={requestForm.taskDueDate}
                    onChange={(e) => setRequestForm({...requestForm, taskDueDate: e.target.value})}
                    className="w-full h-11 px-3 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-black/5 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  disabled={submittingRequest}
                  className="px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[14px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submittingRequest}
                  className="px-4 py-2.5 rounded-xl bg-[#0071e3] text-white text-[14px] font-medium hover:bg-[#0077ed] transition-colors disabled:opacity-50"
                >
                  {submittingRequest ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Task Requests Panel */}
      {showRequestsPanel && createPortal(
        <div className="modal-overlay bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-black/10 dark:border-white/10 shadow-2xl">
            <div className="border-b border-black/5 dark:border-white/10 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">Task Requests ({taskRequests.length})</h2>
                <button onClick={() => setShowRequestsPanel(false)} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                  <X className="w-5 h-5 text-[#86868b]" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {taskRequests.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-[#86868b] mx-auto mb-3 opacity-50" />
                  <p className="text-[15px] text-[#86868b]">No pending task requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {taskRequests.map((request) => (
                    <div key={request.id} className="rounded-xl border border-[#0071e3]/20 bg-[#0071e3]/5 p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white">{request.taskTitle}</h3>
                        <span className={`text-[11px] px-2 py-1 rounded-md font-medium ${
                          request.taskPriority === 'high' ? 'bg-[#ff3b30]/10 text-[#ff3b30]' :
                          request.taskPriority === 'medium' ? 'bg-[#ff9500]/10 text-[#ff9500]' :
                          'bg-black/5 dark:bg-white/10 text-[#86868b]'
                        }`}>
                          {request.taskPriority}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <p className="text-[12px] font-medium text-[#86868b]">Requested by:</p>
                          <p className="text-[13px] text-[#1d1d1f] dark:text-white">{request.fromUserName}</p>
                        </div>
                        {request.taskDescription && (
                          <div>
                            <p className="text-[12px] font-medium text-[#86868b]">Description:</p>
                            <p className="text-[13px] text-[#1d1d1f] dark:text-white">{request.taskDescription}</p>
                          </div>
                        )}
                        {request.taskDueDate && (
                          <div>
                            <p className="text-[12px] font-medium text-[#86868b]">Due Date:</p>
                            <p className="text-[13px] text-[#1d1d1f] dark:text-white">
                              {format(new Date(request.taskDueDate), 'MMMM dd, yyyy')}
                            </p>
                          </div>
                        )}
                        <p className="text-[11px] text-[#86868b]">
                          Sent {request.createdAt?.toDate ? format(request.createdAt.toDate(), 'MMM dd, h:mm a') : 'recently'}
                        </p>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-3 border-t border-[#0071e3]/20">
                          <button
                            onClick={() => handleAcceptRequest(request)}
                            disabled={processingRequestId === request.id}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#34c759] text-white text-[13px] font-medium hover:bg-[#2db14e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {processingRequestId === request.id ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Accepting...
                              </>
                            ) : (
                              <>
                                <Check className="w-4 h-4" />
                                Accept
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => setDeclineRequestModal({ open: true, request, reason: '' })}
                            disabled={processingRequestId === request.id}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#ff3b30]/10 text-[#ff3b30] text-[13px] font-medium hover:bg-[#ff3b30]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <X className="w-4 h-4" />
                            Decline
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Decline task request reason modal */}
      {declineRequestModal.open && declineRequestModal.request && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl max-w-md w-full border border-black/10 dark:border-white/10 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">Decline task request</h3>
              <button type="button" onClick={() => setDeclineRequestModal({ open: false, request: null, reason: '' })} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10">
                <X className="w-5 h-5 text-[#86868b]" />
              </button>
            </div>
            <p className="text-[13px] text-[#86868b] dark:text-gray-400 mb-3">Why are you declining this task? (Optional)</p>
            <textarea
              value={declineRequestModal.reason}
              onChange={(e) => setDeclineRequestModal(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Reason for declining..."
              className="w-full px-3 py-2 border border-black/10 dark:border-white/10 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white placeholder-[#86868b] min-h-[80px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              autoFocus
            />
            <div className="flex gap-2 mt-4">
              <button type="button" onClick={() => setDeclineRequestModal({ open: false, request: null, reason: '' })} className="flex-1 px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[14px] font-medium hover:bg-black/10 dark:hover:bg-white/15">Cancel</button>
              <button type="button" onClick={() => handleRejectRequest(declineRequestModal.request, declineRequestModal.reason)} className="flex-1 px-4 py-2.5 rounded-xl bg-[#ff3b30] text-white text-[14px] font-medium hover:bg-[#e5342b]">Decline</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Project Request Modal */}
      {showProjectRequestModal && createPortal(
        <div className="modal-overlay bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl max-w-lg w-full border border-black/10 dark:border-white/10 shadow-2xl">
            <div className="border-b border-black/5 dark:border-white/10 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#5856d6]/10 flex items-center justify-center">
                    <Palette className="w-5 h-5 text-[#5856d6]" />
                  </div>
                  <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">Request a Project</h2>
                </div>
                <button onClick={() => setShowProjectRequestModal(false)} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                  <X className="w-5 h-5 text-[#86868b]" />
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmitProjectRequest} className="p-6 space-y-4">
              {/* Designer Selection */}
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                  Request From <span className="text-[#ff3b30]">*</span>
                </label>
                <select
                  value={projectRequestForm.toUserEmail}
                  onChange={(e) => setProjectRequestForm(prev => ({ ...prev, toUserEmail: e.target.value }))}
                  required
                  className="w-full h-11 px-4 rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[14px] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5856d6]"
                >
                  <option value="">Select a designer...</option>
                  {GRAPHIC_TEAM.map(member => (
                    <option key={member.email} value={member.email}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Client */}
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                  Client <span className="text-[#ff3b30]">*</span>
                </label>
                <input
                  type="text"
                  value={projectRequestForm.client}
                  onChange={(e) => setProjectRequestForm(prev => ({ ...prev, client: e.target.value }))}
                  placeholder="e.g., Agency Cayman Island"
                  required
                  className="w-full h-11 px-4 rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[14px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#5856d6]"
                />
              </div>
              
              {/* Project Description */}
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                  Project Description <span className="text-[#ff3b30]">*</span>
                </label>
                <input
                  type="text"
                  value={projectRequestForm.task}
                  onChange={(e) => setProjectRequestForm(prev => ({ ...prev, task: e.target.value }))}
                  placeholder="e.g., Social Media Graphics Package"
                  required
                  className="w-full h-11 px-4 rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[14px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#5856d6]"
                />
              </div>
              
              {/* Priority & Deadline */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                    Priority
                  </label>
                  <select
                    value={projectRequestForm.priority}
                    onChange={(e) => setProjectRequestForm(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full h-11 px-4 rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[14px] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5856d6]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                    Deadline <span className="text-[#ff3b30]">*</span>
                  </label>
                  <input
                    type="date"
                    value={projectRequestForm.deadline}
                    onChange={(e) => setProjectRequestForm(prev => ({ ...prev, deadline: e.target.value }))}
                    required
                    min={format(new Date(), 'yyyy-MM-dd')}
                    className="w-full h-11 px-4 rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[14px] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5856d6]"
                  />
                </div>
              </div>
              
              {/* Notes */}
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                  Additional Notes
                </label>
                <textarea
                  value={projectRequestForm.notes}
                  onChange={(e) => setProjectRequestForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any additional details or requirements..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[14px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#5856d6] resize-none"
                />
              </div>
              
              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-black/5 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowProjectRequestModal(false)}
                  disabled={submittingProjectRequest}
                  className="px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[14px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submittingProjectRequest}
                  className="px-4 py-2.5 rounded-xl bg-[#5856d6] text-white text-[14px] font-medium hover:bg-[#4e4bc7] transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {submittingProjectRequest && <Loader2 className="w-4 h-4 animate-spin" />}
                  Send Request
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
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
          onTasksCreated={refreshTasks}
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

      {/* Calendar View Modal - use filtered tasks so tab + smart filter apply; outbox tab uses outbox tasks */}
      {showCalendarView && (
        <CalendarView 
          tasks={activeFilter === 'outbox' ? Object.values(outboxTaskMap) : filteredTasks}
          sentRequests={sentRequests}
          outboxTaskMap={outboxTaskMap}
          onClose={() => setShowCalendarView(false)}
          onTaskClick={(task) => {
            setEditingTask(task);
            setShowEditModal(true);
          }}
        />
      )}

      {/* Toast Notification - Bottom Left */}
      {completionToast && (
        <div className="fixed bottom-6 left-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
          <div className="bg-[#1d1d1f] text-white rounded-xl shadow-2xl px-4 py-3 flex items-center gap-4 min-w-[280px] border border-white/10">
            <span className="text-[13px] font-medium">{completionToast.message}</span>
            <button
              onClick={undoTaskCompletion}
              className="text-[#ff3b30] hover:text-[#ff453a] text-[13px] font-semibold transition-colors"
            >
              Undo
            </button>
            <button
              onClick={() => setCompletionToast(null)}
              className="ml-auto text-white/60 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TasksPage;

