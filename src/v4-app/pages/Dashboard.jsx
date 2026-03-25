import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { DndContext, pointerWithin } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAuth } from '../contexts/AuthContext';
import { clientsService } from '../services/clientsService';
import { tasksService } from '../services/tasksService';
import { dashboardPreferencesService } from '../services/dashboardPreferencesService';
import { getEnabledModulesForRole } from '../lib/v4ModuleAccess';
import V4WidgetGrid from '../components/dashboard/V4WidgetGrid';
import WelcomeSplash from '../components/WelcomeSplash';
import {
  CheckCircle2,
  Clock,
  Calendar,
  ArrowRight,
  Users,
  Instagram,
  Sparkles,
  ChevronRight,
  Plus,
  Play,
  Eye,
  Edit,
  Image,
  FileText,
  Zap,
  Target,
} from 'lucide-react';
import {
  format,
  isToday,
  parseISO,
  isFuture,
  isWithinInterval,
  startOfDay,
  endOfDay,
  addWeeks,
} from 'date-fns';

const DEFAULT_MAIN_CONTENT_BLOCK_ORDER = ['priorities', 'deadlines', 'deliverables', 'quickLinks', 'overview'];
const DEFAULT_MAIN_CONTENT_SPANS = {
  priorities: 2,
  deliverables: 1,
  deadlines: 1,
  quickLinks: 1,
  overview: 1,
};

function SortableMainBlock({ id, span, isEditMode, renderBlock }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`h-full min-h-0 ${span === 2 ? 'lg:col-span-2' : ''} ${isDragging ? 'opacity-90 z-[100] scale-[0.98] shadow-lg' : ''} ${isEditMode ? 'cursor-grab active:cursor-grabbing touch-none' : ''}`}
      {...(isEditMode ? { ...attributes, ...listeners } : {})}
      onClick={isEditMode ? (e) => e.preventDefault() : undefined}
    >
      <div className="widget-scroll h-full min-h-0 overflow-auto">{renderBlock(id)}</div>
    </div>
  );
}

function parseTaskDue(task) {
  if (!task.due_date) return null;
  try {
    return typeof task.due_date === 'string' ? parseISO(task.due_date) : new Date(task.due_date);
  } catch {
    return null;
  }
}

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [mainContentOrder, setMainContentOrder] = useState(DEFAULT_MAIN_CONTENT_BLOCK_ORDER);
  const [widgetOrder, setWidgetOrder] = useState(null);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [clients, setClients] = useState([]);

  const enabledModules = useMemo(() => getEnabledModulesForRole(profile?.role), [profile?.role]);
  const hasTasksModule = enabledModules.includes('tasks');
  const hasClientAccess = enabledModules.some((id) => ['my-clients', 'clients'].includes(id));
  const hasFullClientAccess = enabledModules.includes('clients');

  const displayClients = useMemo(() => {
    const list = hasFullClientAccess
      ? clients
      : clients.filter((c) => c.account_manager_id === user?.id);
    return list;
  }, [clients, hasFullClientAccess, user?.id]);

  const clientCountForDisplay = displayClients.length;
  const clientLabelForDisplay = hasFullClientAccess ? 'Total Clients' : 'My Clients';

  const mainContentVisibility = {
    priorities: hasTasksModule,
    deliverables: hasClientAccess,
    deadlines: hasTasksModule,
    quickLinks: true,
    overview: true,
  };
  const visibleMainContentBlocks = mainContentOrder.filter((id) => mainContentVisibility[id]);

  useEffect(() => {
    if (!user?.id) {
      setPrefsLoaded(true);
      return;
    }
    let cancelled = false;
    dashboardPreferencesService
      .get(user.id)
      .then((prefs) => {
        if (cancelled) return;
        setPrefsLoaded(true);
        if (prefs.mainContentOrder?.length) setMainContentOrder(prefs.mainContentOrder);
        if (prefs.widgetOrder?.length) setWidgetOrder(prefs.widgetOrder);
      })
      .catch(() => {
        if (!cancelled) setPrefsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    const run = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [taskRows, clientRows] = await Promise.all([
          hasTasksModule ? tasksService.getAllMyTasks(user.id) : Promise.resolve([]),
          hasClientAccess ? clientsService.getAll() : Promise.resolve([]),
        ]);
        setTasks(taskRows);
        setClients(clientRows);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [user?.id, hasTasksModule, hasClientAccess]);

  const todaysTasks = useMemo(() => {
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);
    return tasks
      .filter((task) => {
        const d = parseTaskDue(task);
        if (!d || task.status === 'done') return false;
        return isWithinInterval(d, { start: todayStart, end: todayEnd });
      })
      .slice(0, 5);
  }, [tasks]);

  const upcomingDeadlines = useMemo(() => {
    const today = new Date();
    const twoWeeksFromNow = addWeeks(today, 2);
    return tasks
      .filter((task) => {
        const d = parseTaskDue(task);
        if (!d || task.status === 'done') return false;
        return isFuture(d) && !isToday(d) && d <= twoWeeksFromNow;
      })
      .sort((a, b) => parseTaskDue(a) - parseTaskDue(b))
      .slice(0, 5);
  }, [tasks]);

  const handleMainContentDragEnd = useCallback(
    (event) => {
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
        if (user?.id) {
          dashboardPreferencesService.upsert(user.id, { mainContentOrder: next }).catch(console.error);
        }
        return next;
      });
    },
    [mainContentVisibility, user?.id]
  );

  const handleResetToDefault = useCallback(() => {
    setMainContentOrder(DEFAULT_MAIN_CONTENT_BLOCK_ORDER);
    setWidgetOrder(null);
    if (user?.id) {
      dashboardPreferencesService
        .upsert(user.id, {
          mainContentOrder: DEFAULT_MAIN_CONTENT_BLOCK_ORDER,
          widgetOrder: [],
        })
        .catch(console.error);
    }
  }, [user?.id]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const roleGreeting = () => {
    const role = profile?.role;
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    const msgs = {
      admin: [
        "Everything's running smoothly. Here's your overview.",
        "Your team is on it. Here's where things stand.",
      ],
      director: [
        'High-level view ready for you.',
        "Here's the full picture for today.",
      ],
      manager: [
        "Your team has tasks in motion. Here's the summary.",
        "Check in on today's priorities below.",
      ],
      hr_manager: [
        "Team check-in time. Here's what's happening.",
        `Good ${timeOfDay}! Pending approvals are waiting below.`,
      ],
      content_manager: [
        "Content queue is moving. Here's your dashboard.",
        'Check your posting schedule and client deliverables.',
      ],
      social_media_manager: [
        'Ready to post? Your clients are lined up.',
        'Check your content calendar and client health below.',
      ],
      graphic_designer: [
        "Design queue loaded. Let's see what's due today.",
        'Your projects are below.',
      ],
      sales_manager: [
        "Pipeline looking good. Here's your daily digest.",
        'Check your leads and follow-ups below.',
      ],
      team_member: [
        "Here's your workspace for today.",
        "Let's see what's on your plate.",
      ],
    };
    const roleMsgs = msgs[role] || msgs.team_member;
    return roleMsgs[new Date().getDate() % roleMsgs.length];
  };

  const getPriorityColor = (priority) => {
    const p = typeof priority === 'number' ? (priority >= 3 ? 'high' : 'low') : String(priority || '').toLowerCase();
    if (p === 'high' || p === '3' || p === '4' || p === 'urgent') return 'bg-[#ff3b30]/10 text-[#ff3b30]';
    if (p === 'medium' || p === '2') return 'bg-[#ff9500]/10 text-[#ff9500]';
    if (p === 'low' || p === '1') return 'bg-[#34c759]/10 text-[#34c759]';
    return 'bg-[#86868b]/10 text-[#86868b]';
  };

  const getTaskIcon = (category) => {
    switch (String(category || '').toLowerCase()) {
      case 'content':
        return Edit;
      case 'review':
        return Eye;
      case 'meeting':
        return Users;
      case 'design':
        return Image;
      default:
        return CheckCircle2;
    }
  };

  const formatTaskDate = (dateValue) => {
    const d = parseTaskDue({ due_date: dateValue });
    if (!d) return 'No date';
    try {
      return format(d, 'MMM d');
    } catch {
      return 'No date';
    }
  };

  const quickActionsConfig = [
    { title: 'Create Post', icon: Plus, color: 'from-[#0071e3] to-[#5856d6]', path: '/v4/content-calendar', moduleId: 'content-calendar' },
    { title: 'Schedule Content', icon: Calendar, color: 'from-[#ff9500] to-[#ff3b30]', path: '/v4/content-calendar', moduleId: 'content-calendar' },
    { title: 'Instagram Analytics', icon: Instagram, color: 'from-[#34c759] to-[#30d158]', path: '/v4/instagram-reports', moduleId: 'instagram-reports' },
    { title: 'Posting Packages', icon: Users, color: 'from-[#5856d6] to-[#af52de]', path: '/v4/posting-packages', moduleId: 'posting-packages' },
  ];
  const quickActions = quickActionsConfig.filter((a) => enabledModules.includes(a.moduleId));
  const seenPaths = new Set();
  const quickActionsDeduped = quickActions.filter((a) => {
    if (seenPaths.has(a.path)) return false;
    seenPaths.add(a.path);
    return true;
  });

  const displayNameFirst = profile?.full_name?.split(' ')[0] || user?.user_metadata?.full_name?.split(' ')[0] || 'there';
  const atRiskClients = displayClients.filter((c) => (c.health_status || '').toLowerCase() === 'at_risk').length;

  const renderMainContentBlock = (blockId) => {
    switch (blockId) {
      case 'priorities':
        return (
          <div className="rounded-2xl bg-[#ffffff] dark:bg-[#2c2c2e] border border-gray-200 dark:border-white/5 overflow-hidden isolate">
            <div className="flex items-center justify-between p-5 border-b border-black/5 dark:border-white/5">
              <div>
                <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-[#ff9500]" />
                  Today&apos;s Priorities
                </h2>
                <p className="text-[13px] text-[#86868b]">
                  {todaysTasks.length > 0 ? `${todaysTasks.length} tasks due today` : 'No tasks due today'}
                </p>
              </div>
              <Link to="/v4/tasks" className="text-[13px] text-[#0071e3] font-medium hover:underline flex items-center gap-1">
                View all tasks <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="divide-y divide-black/5 dark:divide-white/5">
              {todaysTasks.length > 0 ? (
                todaysTasks.map((task) => {
                  const TaskIcon = getTaskIcon(task.source);
                  const pr = task.priority;
                  return (
                    <div key={task.id} className="flex items-center gap-4 p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${getPriorityColor(pr)}`}>
                        <TaskIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-[15px] font-medium text-[#1d1d1f] dark:text-white truncate">{task.title}</p>
                          {(pr >= 3 || String(pr).toLowerCase() === 'high') && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#ff3b30]/10 text-[#ff3b30] uppercase">Urgent</span>
                          )}
                        </div>
                        <p className="text-[13px] text-[#86868b]">
                          {task.client?.name || task.source || 'Task'}
                        </p>
                      </div>
                      <Link to="/v4/tasks" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
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
                to="/v4/tasks"
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
          <div className="rounded-2xl bg-[#ffffff] dark:bg-[#2c2c2e] border border-gray-200 dark:border-white/5 overflow-hidden isolate">
            <div className="flex items-center justify-between p-5 border-b border-black/5 dark:border-white/5">
              <div>
                <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">Monthly Deliverables</h2>
                <p className="text-[13px] text-[#86868b]">Clients to focus on this month</p>
              </div>
              <Link to={hasFullClientAccess ? '/v4/clients' : '/v4/my-clients'} className="text-[13px] text-[#0071e3] font-medium hover:underline">
                View all
              </Link>
            </div>
            <div className="divide-y divide-black/5 dark:divide-white/5">
              {displayClients.length > 0 ? (
                displayClients.slice(0, 4).map((client) => (
                  <div key={client.id} className="p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center justify-between">
                      <Link
                        to={hasFullClientAccess ? '/v4/clients' : '/v4/my-clients'}
                        className="text-[14px] font-medium truncate text-[#0071e3] hover:underline"
                      >
                        {client.name}
                      </Link>
                      <span className="text-[12px] text-[#86868b]">{client.posts_per_month || 12} posts/mo</span>
                    </div>
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
          <div className="rounded-2xl bg-[#ffffff] dark:bg-[#2c2c2e] border border-gray-200 dark:border-white/5 overflow-hidden isolate">
            <div className="p-5 border-b border-black/5 dark:border-white/5">
              <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-[#ff3b30]" />
                Upcoming Deadlines
              </h2>
            </div>
            <div className="divide-y divide-black/5 dark:divide-white/5">
              {upcomingDeadlines.length > 0 ? (
                upcomingDeadlines.map((task) => (
                  <div key={task.id} className="p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                    <p className="text-[14px] font-medium text-[#1d1d1f] dark:text-white mb-1 truncate">{task.title}</p>
                    <div className="flex items-center gap-2 text-[12px] text-[#86868b]">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatTaskDate(task.due_date)}</span>
                      {task.client?.name && (
                        <>
                          <span>•</span>
                          <span>{task.client.name}</span>
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
          <div className="rounded-2xl bg-[#ffffff] dark:bg-[#2c2c2e] border border-gray-200 dark:border-white/5 overflow-hidden isolate">
            <div className="flex items-center justify-between p-5 border-b border-black/5 dark:border-white/5">
              <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">Quick Links</h2>
            </div>
            <div className="divide-y divide-black/5 dark:divide-white/5">
              {(enabledModules.includes('my-clients') || enabledModules.includes('clients')) && (
                <Link to={hasFullClientAccess ? '/v4/clients' : '/v4/my-clients'} className="flex items-start gap-3 p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-[#0071e3]/10 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-[#0071e3]" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">View All Clients</p>
                    <p className="text-[12px] text-[#86868b]">
                      {hasFullClientAccess ? `${clientCountForDisplay} total clients` : `${clientCountForDisplay} assigned to you`}
                    </p>
                  </div>
                </Link>
              )}
              {hasTasksModule && (
                <Link to="/v4/tasks" className="flex items-start gap-3 p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-[#ff9500]/10 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-[#ff9500]" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">Task Management</p>
                    <p className="text-[12px] text-[#86868b]">{tasks.filter((t) => t.status !== 'done').length} pending tasks</p>
                  </div>
                </Link>
              )}
              {enabledModules.includes('team') && (
                <Link to="/v4/team" className="flex items-start gap-3 p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-[#34c759]/10 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-[#34c759]" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">Team</p>
                    <p className="text-[12px] text-[#86868b]">Roster & invites</p>
                  </div>
                </Link>
              )}
              {enabledModules.includes('resources') && (
                <Link to="/v4/resources" className="flex items-start gap-3 p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-[#5856d6]/10 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-[#5856d6]" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">Resources & Docs</p>
                    <p className="text-[12px] text-[#86868b]">Guides and links</p>
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
                    <p className="text-[28px] font-semibold">{atRiskClients}</p>
                    <p className="text-[13px] text-white/70">At-risk clients</p>
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
                    <p className="text-[28px] font-semibold">{tasks.filter((t) => t.status === 'done').length}</p>
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
                to={hasFullClientAccess ? '/v4/clients' : '/v4/my-clients'}
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

  if (!prefsLoaded || loading) {
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

  return (
    <div className="space-y-4 sm:space-y-6">
      <WelcomeSplash />

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-[24px] sm:text-[34px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em] mb-1 flex items-center gap-2 sm:gap-3 flex-wrap">
            {greeting()}, {displayNameFirst}
            {user?.email?.toLowerCase() === 'michelle@luxury-listings.com' && (
              <>
                <img src="/michelle-cat.png" alt="" className="w-6 h-6 sm:w-8 sm:h-8 inline-block dark:hidden" />
                <img src="/michelle-cat-dark.png" alt="" className="w-6 h-6 sm:w-8 sm:h-8 hidden dark:inline-block" />
              </>
            )}
          </h1>
          <p className="text-[14px] sm:text-[15px] text-[#86868b]">{format(new Date(), 'EEEE, MMMM d')} &middot; {roleGreeting()}</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-1 sm:pb-0 -mx-1 px-1 sm:mx-0 sm:px-0 scrollbar-hide">
          {!isEditMode ? (
            <button
              type="button"
              onClick={() => setIsEditMode(true)}
              className="h-9 sm:h-10 px-3 sm:px-4 rounded-xl bg-black/5 dark:bg-white/5 text-[12px] sm:text-[13px] font-medium text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex items-center gap-1.5 sm:gap-2 whitespace-nowrap flex-shrink-0"
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
                className="h-9 sm:h-10 px-3 sm:px-4 rounded-xl bg-black/5 dark:bg-white/5 text-[12px] sm:text-[13px] font-medium text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-colors whitespace-nowrap flex-shrink-0"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setIsEditMode(false)}
                className="h-9 sm:h-10 px-4 sm:px-5 rounded-xl bg-[#34c759] text-white text-[12px] sm:text-[13px] font-medium hover:bg-[#30d158] transition-all whitespace-nowrap flex-shrink-0"
              >
                Done
              </button>
            </>
          )}
          {hasTasksModule && (
            <Link
              to="/v4/tasks"
              className="h-9 sm:h-10 px-3 sm:px-4 rounded-xl bg-black/5 dark:bg-white/5 text-[12px] sm:text-[13px] font-medium text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex items-center gap-1.5 sm:gap-2 whitespace-nowrap flex-shrink-0"
            >
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {tasks.filter((t) => t.status !== 'done').length} Tasks
            </Link>
          )}
          {enabledModules.includes('time-off') && (
            <Link
              to="/v4/my-time-off"
              className="h-9 sm:h-10 px-4 sm:px-5 rounded-xl bg-[#0071e3] text-white text-[12px] sm:text-[13px] font-medium shadow-lg shadow-[#0071e3]/25 hover:bg-[#0077ed] transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap flex-shrink-0"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Request Time Off</span>
              <span className="sm:hidden">Time Off</span>
            </Link>
          )}
        </div>
      </div>

      <div
        className={`grid grid-cols-2 ${(hasTasksModule ? 2 : 0) + (hasClientAccess ? 1 : 0) > 2 ? 'sm:grid-cols-4' : 'sm:grid-cols-2'} gap-3 sm:gap-4`}
      >
        {[
          { label: clientLabelForDisplay, value: clientCountForDisplay, icon: Users, color: 'text-[#0071e3]', show: hasClientAccess },
          { label: 'Pending Tasks', value: tasks.filter((t) => t.status !== 'done').length, icon: Clock, color: 'text-[#ff9500]', show: hasTasksModule },
          { label: 'Due Today', value: todaysTasks.length, icon: Calendar, color: 'text-[#ff3b30]', show: hasTasksModule },
          { label: 'Completed', value: tasks.filter((t) => t.status === 'done').length, icon: CheckCircle2, color: 'text-[#34c759]', show: hasTasksModule },
        ]
          .filter((item) => item.show)
          .map((item, idx) => (
            <div
              key={idx}
              className="p-3 sm:p-5 rounded-2xl bg-[#ffffff] dark:bg-[#2c2c2e] border border-gray-200 dark:border-white/5 hover:shadow-md hover:shadow-black/10 dark:hover:shadow-black/30 transition-all cursor-pointer group isolate"
            >
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <item.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${item.color}`} strokeWidth={1.5} />
              </div>
              <p className="text-[22px] sm:text-[28px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em]">{item.value}</p>
              <p className="text-[11px] sm:text-[13px] text-[#86868b]">{item.label}</p>
            </div>
          ))}
      </div>

      <div>
        <h2 className="text-[15px] sm:text-[17px] font-semibold text-[#1d1d1f] dark:text-white mb-3 sm:mb-4">Your Modules</h2>
        <V4WidgetGrid
          enabledModules={enabledModules}
          widgetOrder={widgetOrder}
          isEditMode={isEditMode}
          onWidgetOrderChange={(nextOrder) => {
            setWidgetOrder(nextOrder);
            if (user?.id) {
              dashboardPreferencesService.upsert(user.id, { widgetOrder: nextOrder }).catch(console.error);
            }
          }}
        />
      </div>

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
              className={`min-h-0 ${DEFAULT_MAIN_CONTENT_SPANS[blockId] === 2 ? 'md:col-span-2 lg:col-span-2' : ''}`}
            >
              <div className="widget-scroll min-h-0 overflow-auto">{renderMainContentBlock(blockId)}</div>
            </div>
          ))}
        </div>
      )}

      {quickActionsDeduped.length > 0 && (
        <div className={`grid gap-3 sm:gap-4 grid-cols-2 ${quickActionsDeduped.length > 2 ? 'sm:grid-cols-4' : 'sm:grid-cols-2'}`}>
          {quickActionsDeduped.map((action, idx) => (
            <Link
              key={idx}
              to={action.path}
              className="p-3 sm:p-5 rounded-2xl bg-[#ffffff] dark:bg-[#2c2c2e] border border-gray-200 dark:border-white/5 hover:shadow-md hover:shadow-black/10 dark:hover:shadow-black/30 hover:scale-[1.02] active:scale-[0.98] transition-all group isolate"
            >
              <div
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-2 sm:mb-3 shadow-lg group-hover:scale-110 transition-transform`}
              >
                <action.icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" strokeWidth={1.5} />
              </div>
              <p className="text-[13px] sm:text-[15px] font-medium text-[#1d1d1f] dark:text-white">{action.title}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
