import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { DndContext, pointerWithin } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../contexts/PermissionsContext';
import { useViewAs } from '../../contexts/ViewAsContext';
import { firestoreService } from '../../services/firestoreService';
import WidgetGrid from '../../components/dashboard/WidgetGrid';
import { getBaseModuleIds, getAllModuleIds } from '../../modules/registry';
import {
  CheckCircle2,
  Clock,
  Calendar,
  ArrowRight,
  Users,
  TrendingUp,
  BarChart3,
  FileText,
  AlertCircle,
  ChevronRight,
  Plus,
  Play,
  Eye,
  Edit,
  Send,
  Image,
  Video,
  Instagram,
  Sparkles,
  Target,
  Bell,
  MessageSquare,
  Zap,
} from 'lucide-react';
import { format, isToday, isTomorrow, addDays, parseISO, isPast, isFuture, isWithinInterval, startOfDay, endOfDay, addWeeks } from 'date-fns';

/**
 * V3 Dashboard - Workflow-Focused with Real Data
 * 
 * All data is pulled from Firestore:
 * - Tasks (Today's Priorities, Upcoming Deadlines)
 * - Clients (Client Status, Package utilization)
 * - Overview stats
 */
// Default layout (stashed for revert) – used when user has no saved preferences
const DEFAULT_MAIN_CONTENT_BLOCK_ORDER = ['priorities', 'deadlines', 'deliverables', 'quickLinks', 'overview'];
const DEFAULT_MAIN_CONTENT_SPANS = { priorities: 2, deliverables: 1, deadlines: 1, quickLinks: 1, overview: 1 };

function SortableMainBlock({ id, span, isEditMode, renderBlock }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`h-full min-h-0 ${span === 2 ? 'lg:col-span-2' : ''} ${isDragging ? 'opacity-90 z-[100] scale-[0.98] shadow-lg' : ''} ${isEditMode ? 'cursor-grab active:cursor-grabbing touch-none' : ''}`}
      {...(isEditMode ? { ...attributes, ...listeners } : {})}
      onClick={isEditMode ? (e) => e.preventDefault() : undefined}
    >
      <div className="widget-scroll h-full min-h-0 overflow-auto">
        {renderBlock(id)}
      </div>
    </div>
  );
}

const V3Dashboard = () => {
  const { currentUser, currentRole } = useAuth();
  const { permissions, isSystemAdmin } = usePermissions();
  const { isViewingAs, viewingAsUser, viewAsPermissions } = useViewAs();
  const [loading, setLoading] = useState(true);

  // Edit Dashboard: drag-and-drop reorder; prefs loaded/saved by current user (not view-as)
  const [isEditMode, setIsEditMode] = useState(false);
  const [mainContentOrder, setMainContentOrder] = useState(DEFAULT_MAIN_CONTENT_BLOCK_ORDER);
  const [widgetOrder, setWidgetOrder] = useState(null); // null = use registry default order
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  // Get effective user - when viewing as, use that user's data
  const effectiveUser = isViewingAs && viewingAsUser ? viewingAsUser : currentUser;
  const effectivePermissions = isViewingAs ? viewAsPermissions : permissions;
  const effectiveIsSystemAdmin = isViewingAs ? false : isSystemAdmin; // When viewing as, don't use admin privileges
  
  // Get enabled modules: merge base (always) with user permissions so "Your Modules" and nav stay in sync
  const baseModuleIds = getBaseModuleIds();
  const enabledModules = effectiveIsSystemAdmin
    ? getAllModuleIds()
    : [...new Set([...baseModuleIds, ...effectivePermissions])];
  
  // Check if tasks module is enabled (affects dashboard display)
  const hasTasksModule = enabledModules.includes('tasks');
  // Client-related access: any of these means show Client Status / client stats
  const hasClientAccess = enabledModules.some((id) => ['my-clients', 'clients', 'client-packages'].includes(id));
  // Full client access = can see all clients; only my-clients = see assigned count only
  const hasFullClientAccess = enabledModules.includes('clients') || enabledModules.includes('client-packages');
  const hasOnlyMyClients = hasClientAccess && !hasFullClientAccess;

  const [tasks, setTasks] = useState([]);
  const [todaysTasks, setTodaysTasks] = useState([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);
  const [clients, setClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(true);

  // Fetch clients from Firestore
  useEffect(() => {
    const fetchClients = async () => {
      try {
        setClientsLoading(true);
        const clientsData = await firestoreService.getClients();
        setClients(clientsData || []);
      } catch (error) {
        console.error('Error fetching clients:', error);
        setClients([]);
      } finally {
        setClientsLoading(false);
      }
    };
    fetchClients();
  }, []);

  // Clients to display: all if full access, else only those assigned to effective user
  const displayClients = hasFullClientAccess
    ? clients
    : clients.filter((c) => {
        const am = (c.assignedManager || '').trim().toLowerCase();
        const email = (effectiveUser?.email || '').trim().toLowerCase();
        const uid = effectiveUser?.uid || '';
        return am === email || (uid && am === uid.toLowerCase());
      });
  const clientCountForDisplay = displayClients.length;
  const clientLabelForDisplay = hasFullClientAccess ? 'Total Clients' : 'My Clients';

  // Main content: use saved order or default; span from DEFAULT_MAIN_CONTENT_SPANS (stashed for revert)
  const mainContentVisibility = {
    priorities: hasTasksModule,
    deliverables: hasClientAccess,
    deadlines: hasTasksModule,
    quickLinks: true,
    overview: true
  };
  const visibleMainContentBlocks = mainContentOrder.filter((id) => mainContentVisibility[id]);

  // Load dashboard preferences (current user only; skip when viewing as)
  useEffect(() => {
    if (!currentUser?.uid || isViewingAs) {
      setPrefsLoaded(true);
      return;
    }
    let cancelled = false;
    firestoreService.getDashboardPreferences(currentUser.uid).then((prefs) => {
      if (cancelled) return;
      setPrefsLoaded(true);
      if (!prefs) return;
      if (prefs.mainContentOrder?.length) setMainContentOrder(prefs.mainContentOrder);
      if (prefs.widgetOrder?.length) setWidgetOrder(prefs.widgetOrder);
    });
    return () => { cancelled = true; };
  }, [currentUser?.uid, isViewingAs]);

  const saveDashboardPreferences = useCallback(async (updates) => {
    if (!currentUser?.uid || isViewingAs) return;
    const prefs = await firestoreService.getDashboardPreferences(currentUser.uid).catch(() => null) || {};
    await firestoreService.setDashboardPreferences(currentUser.uid, { ...prefs, ...updates });
  }, [currentUser?.uid, isViewingAs]);

  const handleMainContentDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setMainContentOrder((prev) => {
      const visible = prev.filter((id) => mainContentVisibility[id]);
      const oldIndex = visible.indexOf(active.id);
      const newIndex = visible.indexOf(over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const newVisible = arrayMove(visible, oldIndex, newIndex);
      let v = 0;
      const next = prev.map((id) => (mainContentVisibility[id] ? newVisible[v++] : id));
      if (currentUser?.uid && !isViewingAs) {
        firestoreService.setDashboardPreferences(currentUser.uid, { mainContentOrder: next }).catch(console.error);
      }
      return next;
    });
  }, [mainContentVisibility, currentUser?.uid, isViewingAs]);

  const handleResetToDefault = useCallback(() => {
    setMainContentOrder(DEFAULT_MAIN_CONTENT_BLOCK_ORDER);
    setWidgetOrder(null);
    if (currentUser?.uid && !isViewingAs) {
      firestoreService.setDashboardPreferences(currentUser.uid, {
        mainContentOrder: null,
        widgetOrder: null
      }).catch(console.error);
    }
  }, [currentUser?.uid, isViewingAs]);

  // Fetch real tasks from Firestore
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        
        // Get all tasks (or tasks assigned to effective user - respects View As mode)
        let allTasks = [];
        
        if (effectiveUser?.email) {
          // Try to get user's tasks first
          try {
            allTasks = await firestoreService.getTasksByUser(effectiveUser.email);
          } catch (e) {
            // Fallback to all tasks
            allTasks = await firestoreService.getTasks();
          }
        } else {
          allTasks = await firestoreService.getTasks();
        }

        setTasks(allTasks);

        // Filter for today's tasks
        const today = new Date();
        const todayStart = startOfDay(today);
        const todayEnd = endOfDay(today);

        const todayFiltered = allTasks.filter(task => {
          if (!task.due_date) return false;
          try {
            const dueDate = typeof task.due_date === 'string' 
              ? parseISO(task.due_date) 
              : task.due_date.toDate ? task.due_date.toDate() : new Date(task.due_date);
            return isWithinInterval(dueDate, { start: todayStart, end: todayEnd }) && task.status !== 'completed';
          } catch {
            return false;
          }
        }).slice(0, 5); // Limit to 5 items

        setTodaysTasks(todayFiltered);

        // Filter for upcoming deadlines (next 2 weeks, excluding today)
        const twoWeeksFromNow = addWeeks(today, 2);
        
        const upcomingFiltered = allTasks.filter(task => {
          if (!task.due_date) return false;
          try {
            const dueDate = typeof task.due_date === 'string' 
              ? parseISO(task.due_date) 
              : task.due_date.toDate ? task.due_date.toDate() : new Date(task.due_date);
            return isFuture(dueDate) && !isToday(dueDate) && dueDate <= twoWeeksFromNow && task.status !== 'completed';
          } catch {
            return false;
          }
        })
        .sort((a, b) => {
          const dateA = typeof a.due_date === 'string' ? parseISO(a.due_date) : a.due_date.toDate ? a.due_date.toDate() : new Date(a.due_date);
          const dateB = typeof b.due_date === 'string' ? parseISO(b.due_date) : b.due_date.toDate ? b.due_date.toDate() : new Date(b.due_date);
          return dateA - dateB;
        })
        .slice(0, 5); // Limit to 5 items

        setUpcomingDeadlines(upcomingFiltered);

      } catch (error) {
        console.error('Error fetching tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [effectiveUser?.email]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-[#ff3b30]/10 text-[#ff3b30]';
      case 'medium': return 'bg-[#ff9500]/10 text-[#ff9500]';
      case 'low': return 'bg-[#34c759]/10 text-[#34c759]';
      default: return 'bg-[#86868b]/10 text-[#86868b]';
    }
  };

  const getTaskIcon = (category) => {
    switch (category?.toLowerCase()) {
      case 'content': return Edit;
      case 'review': return Eye;
      case 'meeting': return Users;
      case 'design': return Image;
      default: return CheckCircle2;
    }
  };

  const formatTaskDate = (dateValue) => {
    try {
      const date = typeof dateValue === 'string' 
        ? parseISO(dateValue) 
        : dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
      return format(date, 'MMM d');
    } catch {
      return 'No date';
    }
  };

  // Quick Actions: only show for enabled modules (registry IDs)
  const quickActionsConfig = [
    { title: 'Create Post', icon: Plus, color: 'from-[#0071e3] to-[#5856d6]', path: '/content-calendar', moduleId: 'content-calendar' },
    { title: 'Schedule Content', icon: Calendar, color: 'from-[#ff9500] to-[#ff3b30]', path: '/content-calendar', moduleId: 'content-calendar' },
    { title: 'Instagram Analytics', icon: Instagram, color: 'from-[#34c759] to-[#30d158]', path: '/instagram-reports', moduleId: 'instagram-reports' },
    { title: 'Client Packages', icon: Users, color: 'from-[#5856d6] to-[#af52de]', path: '/client-packages', moduleId: 'client-packages' },
  ];
  const quickActions = quickActionsConfig.filter(
    (a) => enabledModules.includes(a.moduleId)
  );
  // Dedupe by path so "Create Post" and "Schedule Content" don't both show for content-calendar
  const seenPaths = new Set();
  const quickActionsDeduped = quickActions.filter((a) => {
    if (seenPaths.has(a.path)) return false;
    seenPaths.add(a.path);
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-12 bg-black/5 dark:bg-white/5 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-black/5 dark:bg-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Render a single main-content block by id; used by the unified grid (no empty cells).
  const renderMainContentBlock = (blockId) => {
    switch (blockId) {
      case 'priorities':
        return (
          <div className="rounded-2xl bg-[#ffffff] dark:bg-[#2c2c2e] dark:backdrop-blur-xl border border-gray-200 dark:border-white/5 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-black/5 dark:border-white/5">
              <div>
                <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-[#ff9500]" />
                  Today's Priorities
                </h2>
                <p className="text-[13px] text-[#86868b]">
                  {todaysTasks.length > 0 ? `${todaysTasks.length} tasks due today` : 'No tasks due today'}
                </p>
              </div>
              <Link to="/tasks" className="text-[13px] text-[#0071e3] font-medium hover:underline flex items-center gap-1">
                View all tasks <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="divide-y divide-black/5 dark:divide-white/5">
              {todaysTasks.length > 0 ? (
                todaysTasks.map((task) => {
                  const TaskIcon = getTaskIcon(task.category);
                  return (
                    <div key={task.id} className="flex items-center gap-4 p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${getPriorityColor(task.priority)}`}>
                        <TaskIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-[15px] font-medium text-[#1d1d1f] dark:text-white truncate">{task.title || task.name}</p>
                          {task.priority?.toLowerCase() === 'high' && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#ff3b30]/10 text-[#ff3b30] uppercase">Urgent</span>
                          )}
                        </div>
                        <p className="text-[13px] text-[#86868b]">
                          {task.client_name || task.category || 'Task'}
                          {task.due_time && ` • ${task.due_time}`}
                        </p>
                      </div>
                      <Link to="/tasks" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <Play className="w-4 h-4 text-[#0071e3]" />
                      </Link>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center">
                  <CheckCircle2 className="w-12 h-12 text-[#34c759] mx-auto mb-3" />
                  <p className="text-[15px] font-medium text-[#1d1d1f] dark:text-white">All caught up!</p>
                  <p className="text-[13px] text-[#86868b]">No tasks due today</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-black/5 dark:border-white/5">
              <Link
                to="/tasks"
                className="w-full h-10 rounded-xl border-2 border-dashed border-black/10 dark:border-white/10 text-[13px] font-medium text-[#86868b] hover:border-[#0071e3] hover:text-[#0071e3] transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Task
              </Link>
            </div>
          </div>
        );
      case 'deliverables':
        return (
          <div className="rounded-2xl bg-[#ffffff] dark:bg-[#2c2c2e] dark:backdrop-blur-xl border border-gray-200 dark:border-white/5 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-black/5 dark:border-white/5">
              <div>
                <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">Monthly Deliverables</h2>
                <p className="text-[13px] text-[#86868b]">Deliverables to meet this month</p>
              </div>
              <Link to={enabledModules.includes('clients') ? '/clients' : '/my-clients'} className="text-[13px] text-[#0071e3] font-medium hover:underline">
                View all
              </Link>
            </div>
            <div className="divide-y divide-black/5 dark:divide-white/5">
              {clientsLoading ? (
                <div className="p-6 text-center">
                  <div className="w-6 h-6 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : displayClients.length > 0 ? (
                displayClients.slice(0, 4).map((client) => (
                  <div key={client.id} className="p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <span className="text-[14px] font-medium text-[#1d1d1f] dark:text-white truncate">{client.clientName || 'Unknown Client'}</span>
                      <span className="text-[12px] text-[#86868b]">—</span>
                    </div>
                    <p className="text-[12px] text-[#86868b] mt-0.5">From contracts (coming soon)</p>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center">
                  <Users className="w-10 h-10 text-[#86868b] mx-auto mb-2" />
                  <p className="text-[13px] text-[#86868b]">No clients yet</p>
                </div>
              )}
            </div>
          </div>
        );
      case 'deadlines':
        return (
          <div className="rounded-2xl bg-[#ffffff] dark:bg-[#2c2c2e] dark:backdrop-blur-xl border border-gray-200 dark:border-white/5 overflow-hidden">
            <div className="p-5 border-b border-black/5 dark:border-white/5">
              <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-[#ff3b30]" />
                Upcoming Deadlines
              </h2>
            </div>
            <div className="divide-y divide-black/5 dark:divide-white/5">
              {upcomingDeadlines.length > 0 ? (
                upcomingDeadlines.map((task) => (
                  <div key={task.id} className="p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer">
                    <p className="text-[14px] font-medium text-[#1d1d1f] dark:text-white mb-1 truncate">{task.title || task.name}</p>
                    <div className="flex items-center gap-2 text-[12px] text-[#86868b]">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatTaskDate(task.due_date)}</span>
                      {task.client_name && (
                        <>
                          <span>•</span>
                          <span>{task.client_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center">
                  <Calendar className="w-10 h-10 text-[#86868b] mx-auto mb-2" />
                  <p className="text-[13px] text-[#86868b]">No upcoming deadlines</p>
                </div>
              )}
            </div>
          </div>
        );
      case 'quickLinks':
        return (
          <div className="rounded-2xl bg-[#ffffff] dark:bg-[#2c2c2e] dark:backdrop-blur-xl border border-gray-200 dark:border-white/5 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-black/5 dark:border-white/5">
              <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">Quick Links</h2>
            </div>
            <div className="divide-y divide-black/5 dark:divide-white/5">
              {(enabledModules.includes('my-clients') || enabledModules.includes('clients')) && (
                <Link to={enabledModules.includes('clients') ? '/clients' : '/my-clients'} className="flex items-start gap-3 p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-[#0071e3]/10 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-[#0071e3]" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">View All Clients</p>
                    <p className="text-[12px] text-[#86868b]">{hasFullClientAccess ? `${clientCountForDisplay} total clients` : `${clientCountForDisplay} assigned to you`}</p>
                  </div>
                </Link>
              )}
              {hasTasksModule && (
                <Link to="/tasks" className="flex items-start gap-3 p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-[#ff9500]/10 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-[#ff9500]" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">Task Management</p>
                    <p className="text-[12px] text-[#86868b]">{tasks.filter(t => t.status !== 'completed').length} pending tasks</p>
                  </div>
                </Link>
              )}
              {enabledModules.includes('team') && (
                <Link to="/team" className="flex items-start gap-3 p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-[#34c759]/10 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-[#34c759]" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">Team Directory</p>
                    <p className="text-[12px] text-[#86868b]">View team members</p>
                  </div>
                </Link>
              )}
              {enabledModules.includes('resources') && (
                <Link to="/resources" className="flex items-start gap-3 p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-[#5856d6]/10 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-[#5856d6]" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">Resources & Docs</p>
                    <p className="text-[12px] text-[#86868b]">Tutorials and guides</p>
                  </div>
                </Link>
              )}
            </div>
          </div>
        );
      case 'overview':
        return (
          <div className="rounded-2xl bg-gradient-to-br from-[#0071e3] to-[#5856d6] p-6 text-white relative overflow-hidden">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="w-5 h-5" />
              <h2 className="text-[17px] font-semibold">Overview</h2>
            </div>
            <div className={`grid ${hasTasksModule && hasClientAccess ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
              {hasClientAccess && (
                <>
                  <div>
                    <p className="text-[28px] font-semibold">{clientCountForDisplay}</p>
                    <p className="text-[13px] text-white/70">{clientLabelForDisplay}</p>
                  </div>
                  <div>
                    <p className="text-[28px] font-semibold">{displayClients.filter(c => c.packageType?.toLowerCase() === 'premium').length}</p>
                    <p className="text-[13px] text-white/70">Premium Clients</p>
                  </div>
                </>
              )}
              {hasTasksModule && (
                <>
                  <div>
                    <p className="text-[28px] font-semibold">{tasks.length}</p>
                    <p className="text-[13px] text-white/70">Total Tasks</p>
                  </div>
                  <div>
                    <p className="text-[28px] font-semibold">{tasks.filter(t => t.status === 'completed').length}</p>
                    <p className="text-[13px] text-white/70">Completed</p>
                  </div>
                </>
              )}
              {!hasClientAccess && !hasTasksModule && (
                <p className="text-[13px] text-white/70">Enable Clients or Tasks to see metrics here.</p>
              )}
            </div>
            {hasClientAccess && (
              <Link
                to={enabledModules.includes('clients') ? '/clients' : '/my-clients'}
                className="mt-6 w-full h-10 rounded-xl bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center gap-2 text-[13px] font-medium"
              >
                View Clients
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[34px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em] mb-1">
            {greeting()}, {effectiveUser?.displayName?.split(' ')[0] || effectiveUser?.firstName || 'there'}
          </h1>
          <p className="text-[17px] text-[#86868b]">
            {format(new Date(), 'EEEE, MMMM d')} • Here's your workflow overview
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!isViewingAs && (
            <>
              {!isEditMode ? (
                <button
                  type="button"
                  onClick={() => setIsEditMode(true)}
                  className="h-10 px-4 rounded-xl bg-black/5 dark:bg-white/5 text-[13px] font-medium text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit Dashboard
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleResetToDefault}
                    className="h-10 px-4 rounded-xl bg-black/5 dark:bg-white/5 text-[13px] font-medium text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                  >
                    Reset to default
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditMode(false)}
                    className="h-10 px-5 rounded-xl bg-[#34c759] text-white text-[13px] font-medium hover:bg-[#30d158] transition-all"
                  >
                    Done
                  </button>
                </>
              )}
            </>
          )}
          {hasTasksModule && (
            <Link 
              to="/tasks"
              className="h-10 px-4 rounded-xl bg-black/5 dark:bg-white/5 text-[13px] font-medium text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {tasks.filter(t => t.status !== 'completed').length} Tasks
            </Link>
          )}
          {enabledModules.includes('time-off') && (
          <Link 
            to="/my-time-off"
            className="h-10 px-5 rounded-xl bg-[#0071e3] text-white text-[13px] font-medium shadow-lg shadow-[#0071e3]/25 hover:bg-[#0077ed] transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Request Time Off
          </Link>
          )}
        </div>
      </div>

      {/* Quick Stats - Real Data (only show stats for enabled modules) */}
      <div className={`grid grid-cols-2 ${(hasTasksModule ? 2 : 0) + (hasClientAccess ? 1 : 0) > 2 ? 'md:grid-cols-4' : 'md:grid-cols-2'} gap-4`}>
        {[
          { label: clientLabelForDisplay, value: clientCountForDisplay, icon: Users, color: 'text-[#0071e3]', show: hasClientAccess },
          { label: 'Pending Tasks', value: tasks.filter(t => t.status !== 'completed').length, icon: Clock, color: 'text-[#ff9500]', show: hasTasksModule },
          { label: 'Due Today', value: todaysTasks.length, icon: Calendar, color: 'text-[#ff3b30]', show: hasTasksModule },
          { label: 'Completed', value: tasks.filter(t => t.status === 'completed').length, icon: CheckCircle2, color: 'text-[#34c759]', show: hasTasksModule },
        ].filter(item => item.show).map((item, idx) => (
          <div key={idx} className="p-5 rounded-2xl bg-[#ffffff] dark:bg-[#2c2c2e] dark:backdrop-blur-xl border border-gray-200 dark:border-white/5 hover:shadow-lg transition-all cursor-pointer group">
            <div className="flex items-center justify-between mb-3">
              <item.icon className={`w-5 h-5 ${item.color}`} strokeWidth={1.5} />
            </div>
            <p className="text-[28px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em]">{item.value}</p>
            <p className="text-[13px] text-[#86868b]">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Module Widgets - Dynamic based on enabled modules; drag-and-drop when Edit Dashboard is on */}
      <div>
        <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white mb-4">Your Modules</h2>
        <WidgetGrid
          enabledModules={enabledModules}
          widgetOrder={widgetOrder}
          isEditMode={isEditMode}
          onWidgetOrderChange={(nextOrder) => {
            setWidgetOrder(nextOrder);
            if (currentUser?.uid && !isViewingAs) {
              firestoreService.setDashboardPreferences(currentUser.uid, { widgetOrder: nextOrder }).catch(console.error);
            }
          }}
        />
      </div>

      {/* Main content - single grid; drag-and-drop when Edit Dashboard is on */}
      {isEditMode ? (
        <DndContext collisionDetection={pointerWithin} onDragEnd={handleMainContentDragEnd}>
          <SortableContext items={visibleMainContentBlocks} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch grid-auto-rows-[327px]">
              {visibleMainContentBlocks.map((blockId) => (
                <SortableMainBlock
                  key={blockId}
                  id={blockId}
                  span={DEFAULT_MAIN_CONTENT_SPANS[blockId] === 2 ? 2 : 1}
                  isEditMode={isEditMode}
                  renderBlock={renderMainContentBlock}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch grid-auto-rows-[327px]">
          {visibleMainContentBlocks.map((blockId) => (
            <div
              key={blockId}
              className={`h-full min-h-0 ${DEFAULT_MAIN_CONTENT_SPANS[blockId] === 2 ? 'lg:col-span-2' : ''}`}
            >
              <div className="widget-scroll h-full min-h-0 overflow-auto">
                {renderMainContentBlock(blockId)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Actions - only modules you have access to */}
      {(quickActionsDeduped.length > 0) && (
      <div className={`grid gap-4 ${quickActionsDeduped.length === 1 ? 'grid-cols-1' : quickActionsDeduped.length === 2 ? 'grid-cols-2' : quickActionsDeduped.length === 3 ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-4'}`}>
        {quickActionsDeduped.map((action, idx) => (
          <Link
            key={idx}
            to={action.path}
            className="p-5 rounded-2xl bg-[#ffffff] dark:bg-[#2c2c2e] dark:backdrop-blur-xl border border-gray-200 dark:border-white/5 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all group"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
              <action.icon className="w-5 h-5 text-white" strokeWidth={1.5} />
            </div>
            <p className="text-[15px] font-medium text-[#1d1d1f] dark:text-white">{action.title}</p>
          </Link>
        ))}
      </div>
      )}
    </div>
  );
};

export default V3Dashboard;
