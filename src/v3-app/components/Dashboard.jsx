import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { DndContext, pointerWithin } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../contexts/PermissionsContext';
import { CAPABILITIES } from '../../entities/Capabilities';
import { useClients } from '../../contexts/ClientsContext';
import { supabaseService } from '../../services/supabaseService';
import WidgetGrid from '../../components/dashboard/WidgetGrid';
import InstagramAnalyticsHero from '../../components/dashboard/InstagramAnalyticsHero';
import TimeOffHero from '../../components/dashboard/TimeOffHero';
import MyClientsStrip from '../../components/dashboard/MyClientsStrip';
import ClientLink from '../../components/ui/ClientLink';
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
// Widgets already shown higher up the page (hero row + My Clients strip) —
// hidden from "Your Modules" so they don't render twice.
const PROMOTED_WIDGET_IDS = ['recentReports', 'timeOffSummary', 'clientOverview'];

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
  const { currentUser, isViewingAs } = useAuth();
  const { permissions, isSystemAdmin } = usePermissions();
  const [loading, setLoading] = useState(true);

  const [isEditMode, setIsEditMode] = useState(false);
  const [mainContentOrder, setMainContentOrder] = useState(DEFAULT_MAIN_CONTENT_BLOCK_ORDER);
  const [widgetOrder, setWidgetOrder] = useState(null);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  // currentUser is effective user when View As; use real user for prefs load/save
  const effectivePermissions = permissions;
  const effectiveIsSystemAdmin = isViewingAs ? false : isSystemAdmin;
  
  // Get enabled modules: merge base (always) with user permissions so "Your Modules" and nav stay in sync
  const baseModuleIds = getBaseModuleIds();
  const enabledModules = effectiveIsSystemAdmin
    ? getAllModuleIds()
    : [...new Set([...baseModuleIds, ...effectivePermissions])];
  
  // Check if tasks module is enabled (affects dashboard display)
  const hasTasksModule = enabledModules.includes('tasks');
  // The two features the team actually lives in — pinned to the top of the dashboard
  const hasInstagramReports = enabledModules.includes('instagram-reports');
  const hasTimeOff = enabledModules.includes('time-off');
  const heroCount = (hasInstagramReports ? 1 : 0) + (hasTimeOff ? 1 : 0);
  // Client-related access: any of these means show Client Status / client stats
  const hasClientAccess = enabledModules.some((id) => ['my-clients', 'clients'].includes(id));
  // Full client access = can see all clients; only my-clients = see assigned count only
  const hasFullClientAccess = enabledModules.includes('clients');
  const hasOnlyMyClients = hasClientAccess && !hasFullClientAccess;

  const [tasks, setTasks] = useState([]);
  const [todaysTasks, setTodaysTasks] = useState([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);
  const { clients, loading: clientsLoading } = useClients();

  // Clients to display: exclude internal accounts (they are not clients). All if full access, else only assigned.
  const displayClients = (hasFullClientAccess
    ? clients
    : clients.filter((c) => {
        const am = (c.assignedManager || '').trim().toLowerCase();
        const email = (currentUser?.email || '').trim().toLowerCase();
        const uid = currentUser?.uid || '';
        return am === email || (uid && am === uid.toLowerCase());
      })
  ).filter((c) => !c.isInternal);
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

  // Load dashboard preferences for effective user (when viewing as, load viewed user's prefs; never save in view-as)
  useEffect(() => {
    if (!currentUser?.uid) {
      setPrefsLoaded(true);
      return;
    }
    let cancelled = false;
    supabaseService.getDashboardPreferences(currentUser.uid).then((prefs) => {
      if (cancelled) return;
      setPrefsLoaded(true);
      if (!prefs) return;
      if (prefs.mainContentOrder?.length) setMainContentOrder(prefs.mainContentOrder);
      if (prefs.widgetOrder?.length) setWidgetOrder(prefs.widgetOrder);
    });
    return () => { cancelled = true; };
  }, [currentUser?.uid]);

  const saveDashboardPreferences = useCallback(async (updates) => {
    if (!currentUser?.uid || isViewingAs) return;
    const prefs = await supabaseService.getDashboardPreferences(currentUser.uid).catch(() => null) || {};
    await supabaseService.setDashboardPreferences(currentUser.uid, { ...prefs, ...updates });
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
        supabaseService.setDashboardPreferences(currentUser.uid, { mainContentOrder: next }).catch(console.error);
      }
      return next;
    });
  }, [mainContentVisibility, currentUser?.uid, isViewingAs]);

  const handleResetToDefault = useCallback(() => {
    setMainContentOrder(DEFAULT_MAIN_CONTENT_BLOCK_ORDER);
    setWidgetOrder(null);
    if (currentUser?.uid && !isViewingAs) {
      supabaseService.setDashboardPreferences(currentUser.uid, {
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
        
        if (currentUser?.email) {
          // Try to get user's tasks first
          try {
            allTasks = await supabaseService.getTasksByUser(currentUser.email);
          } catch (e) {
            // Fallback to all tasks
            allTasks = await supabaseService.getTasks();
          }
        } else {
          allTasks = await supabaseService.getTasks();
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
  }, [currentUser?.email]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-danger/10 text-danger';
      case 'medium': return 'bg-warning/10 text-warning';
      case 'low': return 'bg-positive/10 text-positive';
      default: return 'bg-ink-muted/10 text-ink-muted';
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
    { title: 'Create Post', icon: Plus, color: 'from-brand to-brand', path: '/content-calendar', moduleId: 'content-calendar' },
    { title: 'Schedule Content', icon: Calendar, color: 'from-warning to-danger', path: '/content-calendar', moduleId: 'content-calendar' },
    { title: 'Instagram Analytics', icon: Instagram, color: 'from-positive to-positive', path: '/instagram-reports', moduleId: 'instagram-reports' },
    { title: 'Posting Packages', icon: Users, color: 'from-brand to-brand', path: '/posting-packages', moduleId: 'posting-packages' },
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
        <div className="h-12 rounded-xl skeleton-shimmer" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl skeleton-shimmer" />
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
          <div className="rounded-xl bg-surface border border-gray-200 dark:border-white/5 overflow-hidden isolate">
            <div className="flex items-center justify-between p-5 border-b border-black/5 dark:border-white/5">
              <div>
                <h2 className="text-[17px] font-semibold text-ink flex items-center gap-2">
                  <Zap className="w-5 h-5 text-warning" />
                  Today's Priorities
                </h2>
                <p className="text-[13px] text-ink-muted">
                  {todaysTasks.length > 0 ? `${todaysTasks.length} tasks due today` : 'No tasks due today'}
                </p>
              </div>
              <Link to="/tasks" className="text-[13px] text-brand font-medium hover:underline flex items-center gap-1">
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
                          <p className="text-[15px] font-medium text-ink truncate">{task.title || task.name}</p>
                          {task.priority?.toLowerCase() === 'high' && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-danger/10 text-danger uppercase">Urgent</span>
                          )}
                        </div>
                        <p className="text-[13px] text-ink-muted">
                          {task.client_name || task.category || 'Task'}
                          {task.due_time && ` • ${task.due_time}`}
                        </p>
                      </div>
                      <Link to="/tasks" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-3 transition-colors">
                        <Play className="w-4 h-4 text-brand" />
                      </Link>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center">
                  <CheckCircle2 className="w-12 h-12 text-positive mx-auto mb-3" />
                  <p className="text-[15px] font-medium text-ink">All caught up!</p>
                  <p className="text-[13px] text-ink-muted">No tasks due today</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-black/5 dark:border-white/5">
              <Link
                to="/tasks"
                className="w-full h-10 rounded-xl border-2 border-dashed border-hairline-strong text-[13px] font-medium text-ink-muted hover:border-brand hover:text-brand transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Task
              </Link>
            </div>
          </div>
        );
      case 'deliverables':
        return (
          <div className="rounded-xl bg-surface border border-gray-200 dark:border-white/5 overflow-hidden isolate">
            <div className="flex items-center justify-between p-5 border-b border-black/5 dark:border-white/5">
              <div>
                <h2 className="text-[17px] font-semibold text-ink">Monthly Deliverables</h2>
                <p className="text-[13px] text-ink-muted">Deliverables to meet this month</p>
              </div>
              <Link to={enabledModules.includes('clients') ? '/clients' : '/my-clients'} className="text-[13px] text-brand font-medium hover:underline">
                View all
              </Link>
            </div>
            <div className="divide-y divide-black/5 dark:divide-white/5">
              {clientsLoading ? (
                <div className="p-6 text-center">
                  <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : displayClients.length > 0 ? (
                displayClients.slice(0, 4).map((client) => (
                  <div key={client.id} className="p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center justify-between">
                      <ClientLink client={client} className="text-[14px] font-medium truncate" />
                      <span className="text-[12px] text-ink-muted">—</span>
                    </div>
                    <p className="text-[12px] text-ink-muted mt-0.5">From contracts (coming soon)</p>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center">
                  <Users className="w-10 h-10 text-ink-muted mx-auto mb-2" />
                  <p className="text-[13px] text-ink-muted">No clients yet</p>
                </div>
              )}
            </div>
          </div>
        );
      case 'deadlines':
        return (
          <div className="rounded-xl bg-surface border border-gray-200 dark:border-white/5 overflow-hidden isolate">
            <div className="p-5 border-b border-black/5 dark:border-white/5">
              <h2 className="text-[17px] font-semibold text-ink flex items-center gap-2">
                <Target className="w-5 h-5 text-danger" />
                Upcoming Deadlines
              </h2>
            </div>
            <div className="divide-y divide-black/5 dark:divide-white/5">
              {upcomingDeadlines.length > 0 ? (
                upcomingDeadlines.map((task) => (
                  <div key={task.id} className="p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer">
                    <p className="text-[14px] font-medium text-ink mb-1 truncate">{task.title || task.name}</p>
                    <div className="flex items-center gap-2 text-[12px] text-ink-muted">
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
                  <Calendar className="w-10 h-10 text-ink-muted mx-auto mb-2" />
                  <p className="text-[13px] text-ink-muted">No upcoming deadlines</p>
                </div>
              )}
            </div>
          </div>
        );
      case 'quickLinks':
        return (
          <div className="rounded-xl bg-surface border border-gray-200 dark:border-white/5 overflow-hidden isolate">
            <div className="flex items-center justify-between p-5 border-b border-black/5 dark:border-white/5">
              <h2 className="text-[17px] font-semibold text-ink">Quick Links</h2>
            </div>
            <div className="divide-y divide-black/5 dark:divide-white/5">
              {(enabledModules.includes('my-clients') || enabledModules.includes('clients')) && (
                <Link to={enabledModules.includes('clients') ? '/clients' : '/my-clients'} className="flex items-start gap-3 p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-brand" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-ink">View All Clients</p>
                    <p className="text-[12px] text-ink-muted">{hasFullClientAccess ? `${clientCountForDisplay} total clients` : `${clientCountForDisplay} assigned to you`}</p>
                  </div>
                </Link>
              )}
              {hasTasksModule && (
                <Link to="/tasks" className="flex items-start gap-3 p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-warning" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-ink">Task Management</p>
                    <p className="text-[12px] text-ink-muted">{tasks.filter(t => t.status !== 'completed').length} pending tasks</p>
                  </div>
                </Link>
              )}
              {enabledModules.includes('team') && (
                <Link to="/team" className="flex items-start gap-3 p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-positive/10 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-positive" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-ink">Team Directory</p>
                    <p className="text-[12px] text-ink-muted">View team members</p>
                  </div>
                </Link>
              )}
              {enabledModules.includes('resources') && (
                <Link to="/resources" className="flex items-start gap-3 p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-brand" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-ink">Resources & Docs</p>
                    <p className="text-[12px] text-ink-muted">Tutorials and guides</p>
                  </div>
                </Link>
              )}
            </div>
          </div>
        );
      case 'overview':
        return (
          <div className="rounded-xl bg-gradient-to-br from-brand to-brand p-6 text-white relative overflow-hidden">
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
    <div className="space-y-4 sm:space-y-6">
      {/* Header - Mobile Optimized */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-[20px] sm:text-[24px] font-semibold text-ink tracking-[-0.02em] flex items-center gap-2 sm:gap-3">
            {greeting()}, {currentUser?.displayName?.split(' ')[0] || currentUser?.firstName || 'there'}
            {/* Michelle's special cat icon - different for light/dark mode */}
            {currentUser?.email?.toLowerCase() === 'michelle@luxury-listings.com' && (
              <>
                <img 
                  src="/michelle-cat.png" 
                  alt="" 
                  className="w-6 h-6 sm:w-8 sm:h-8 inline-block dark:hidden"
                />
                <img 
                  src="/michelle-cat-dark.png" 
                  alt="" 
                  className="w-6 h-6 sm:w-8 sm:h-8 hidden dark:inline-block"
                />
              </>
            )}
          </h1>
          <p className="text-[13px] text-ink-muted mt-0.5">
            {format(new Date(), 'EEEE, MMMM d')}
          </p>
        </div>
        {/* Mobile: Horizontal scroll buttons, Desktop: Flex row */}
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-1 sm:pb-0 -mx-1 px-1 sm:mx-0 sm:px-0 scrollbar-hide">
          {!isViewingAs && (
            <>
              {!isEditMode ? (
                <button
                  type="button"
                  onClick={() => setIsEditMode(true)}
                  className="h-9 sm:h-10 px-3 sm:px-4 rounded-xl bg-surface-3 text-[12px] sm:text-[13px] font-medium text-ink hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex items-center gap-1.5 sm:gap-2 whitespace-nowrap flex-shrink-0"
                >
                  <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Edit Dashboard</span>
                  <span className="sm:hidden">Edit</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleResetToDefault}
                    className="h-9 sm:h-10 px-3 sm:px-4 rounded-xl bg-surface-3 text-[12px] sm:text-[13px] font-medium text-ink hover:bg-black/10 dark:hover:bg-white/10 transition-colors whitespace-nowrap flex-shrink-0"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditMode(false)}
                    className="h-9 sm:h-10 px-4 sm:px-5 rounded-xl bg-positive text-white text-[12px] sm:text-[13px] font-medium hover:bg-positive transition-all whitespace-nowrap flex-shrink-0"
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
              className="h-9 sm:h-10 px-3 sm:px-4 rounded-xl bg-surface-3 text-[12px] sm:text-[13px] font-medium text-ink hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex items-center gap-1.5 sm:gap-2 whitespace-nowrap flex-shrink-0"
            >
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {tasks.filter(t => t.status !== 'completed').length} Tasks
            </Link>
          )}
          {enabledModules.includes('time-off') && (
          <Link 
            to="/my-time-off"
            className="h-9 sm:h-10 px-4 sm:px-5 rounded-xl bg-brand text-white text-[12px] sm:text-[13px] font-medium shadow-lg shadow-brand/25 hover:bg-brand-hover transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap flex-shrink-0"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Request Time Off</span>
            <span className="sm:hidden">Time Off</span>
          </Link>
          )}
        </div>
      </div>

      {/* ── Front and centre: Instagram Analytics + Time Off ─────────────── */}
      {heroCount > 0 && (
        <div className={`grid gap-4 sm:gap-6 grid-cols-1 ${heroCount === 2 ? 'lg:grid-cols-3' : ''}`}>
          {hasInstagramReports && (
            <div className={heroCount === 2 ? 'lg:col-span-2' : ''}>
              <InstagramAnalyticsHero />
            </div>
          )}
          {hasTimeOff && (
            <div className="lg:col-span-1">
              <TimeOffHero />
            </div>
          )}
        </div>
      )}

      {/* My Clients — replaces the old quick-stat tiles */}
      {hasClientAccess && (
        <MyClientsStrip
          clientsPath={hasFullClientAccess ? '/clients' : '/my-clients'}
          showReportStatus={hasInstagramReports}
        />
      )}

      {/* Module Widgets - Dynamic based on enabled modules; drag-and-drop when Edit Dashboard is on */}
      <div>
        <h2 className="text-[15px] sm:text-[17px] font-semibold text-ink mb-3 sm:mb-4">Your Modules</h2>
        <WidgetGrid
          enabledModules={enabledModules}
          widgetOrder={widgetOrder}
          isEditMode={isEditMode}
          excludeWidgets={PROMOTED_WIDGET_IDS}
          onWidgetOrderChange={(nextOrder) => {
            setWidgetOrder(nextOrder);
            if (currentUser?.uid && !isViewingAs) {
              supabaseService.setDashboardPreferences(currentUser.uid, { widgetOrder: nextOrder }).catch(console.error);
            }
          }}
        />
      </div>

      {/* Main content - single grid; drag-and-drop when Edit Dashboard is on */}
      {isEditMode ? (
        <DndContext collisionDetection={pointerWithin} onDragEnd={handleMainContentDragEnd}>
          <SortableContext items={visibleMainContentBlocks} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 items-stretch auto-rows-auto lg:grid-auto-rows-[327px]">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 items-stretch auto-rows-auto lg:grid-auto-rows-[327px]">
          {visibleMainContentBlocks.map((blockId) => (
            <div
              key={blockId}
              className={`stagger-in min-h-0 ${DEFAULT_MAIN_CONTENT_SPANS[blockId] === 2 ? 'md:col-span-2 lg:col-span-2' : ''}`}
            >
              <div className="widget-scroll min-h-0 overflow-auto">
                {renderMainContentBlock(blockId)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Actions - only modules you have access to */}
      {(quickActionsDeduped.length > 0) && (
      <div className={`grid gap-3 sm:gap-4 grid-cols-2 ${quickActionsDeduped.length > 2 ? 'sm:grid-cols-4' : 'sm:grid-cols-2'}`}>
        {quickActionsDeduped.map((action, idx) => (
          <Link
            key={idx}
            to={action.path}
            className="stagger-in ui-transition ui-lift p-3 sm:p-5 rounded-xl bg-surface border border-gray-200 dark:border-white/5 hover:scale-[1.02] active:scale-[0.98] group isolate"
          >
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-2 sm:mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
              <action.icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" strokeWidth={1.5} />
            </div>
            <p className="text-[13px] sm:text-[15px] font-medium text-ink">{action.title}</p>
          </Link>
        ))}
      </div>
      )}
    </div>
  );
};

export default V3Dashboard;
