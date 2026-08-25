/**
 * PostsLoggedWidget - Dashboard widget showing posts logged today
 * Allows SMMs to quickly log completed posts for their clients
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle2, 
  Plus, 
  Minus,
  Instagram, 
  Youtube, 
  Facebook, 
  Linkedin,
  X
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useClients } from '../../../contexts/ClientsContext';
import { supabaseService } from '../../../services/supabaseService';
import { getPostLogUpdate, getPostsRemaining } from '../../../utils/clientPostsUtils';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

// Custom icons for platforms not in lucide-react
const TikTokIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const XIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const platformIcons = {
  instagram: Instagram,
  youtube: Youtube,
  facebook: Facebook,
  linkedin: Linkedin,
  tiktok: TikTokIcon,
  x: XIcon
};

const platformColors = {
  instagram: '#E4405F',
  youtube: '#FF0000',
  facebook: '#1877F2',
  linkedin: '#0A66C2',
  tiktok: '#000000',
  x: '#000000'
};

const PLATFORM_KEYS = ['instagram', 'facebook', 'linkedin', 'youtube', 'tiktok', 'x'];

const getAssignedPlatforms = (client) =>
  PLATFORM_KEYS.filter(p => client.platforms?.[p]);

const PostsLoggedWidget = () => {
  const { currentUser } = useAuth();
  const { clients: allClients, loading: clientsContextLoading } = useClients();
  const [loading, setLoading] = useState(true);
  const [postsToday, setPostsToday] = useState([]);
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('instagram');
  const [logging, setLogging] = useState(false);

  const email = (currentUser?.email || '').trim().toLowerCase();
  const uid = (currentUser?.uid || '').trim().toLowerCase();
  const clients = useMemo(() => allClients.filter(c => {
    const am = (c.assignedManager || '').trim().toLowerCase();
    if (!am) return false;
    return am === email || (uid && am === uid);
  }), [allClients, email, uid]);

  useEffect(() => {
    const loadPostsToday = async () => {
      if (!currentUser?.email) return;
      const myClientIds = new Set(clients.map(c => c.id));
      try {
        const allTasks = await supabaseService.getTasksByUser(currentUser.email);
        const today = format(new Date(), 'yyyy-MM-dd');
        const todaysPosts = allTasks.filter(task => {
          const isClientPost = task.labels?.includes('client-post');
          const completedToday = task.completed_date?.startsWith(today);
          if (!isClientPost || task.status !== 'completed' || !completedToday) return false;
          const clientLabel = task.labels?.find(l => l.startsWith('client-') && l !== 'client-post');
          const clientId = clientLabel ? clientLabel.replace('client-', '') : null;
          return clientId && myClientIds.has(clientId);
        });
        setPostsToday(todaysPosts);
      } catch (error) {
        console.error('Error loading posts:', error);
      } finally {
        setLoading(false);
      }
    };
    loadPostsToday();
  }, [currentUser?.email, clients]);

  const loadingWidget = clientsContextLoading || loading;

  const postsByClient = useMemo(() => {
    const map = {};
    postsToday.forEach(task => {
      const label = task.labels?.find(l => l.startsWith('client-') && l !== 'client-post');
      const id = label ? label.replace('client-', '') : null;
      if (id) map[id] = (map[id] || 0) + 1;
    });
    return map;
  }, [postsToday]);

  const postsByClientPlatform = useMemo(() => {
    const map = {};
    postsToday.forEach(task => {
      const clientLabel = task.labels?.find(l => l.startsWith('client-') && l !== 'client-post');
      const clientId = clientLabel ? clientLabel.replace('client-', '') : null;
      const platform = task.labels?.find(l => PLATFORM_KEYS.includes(l));
      if (clientId && platform) {
        const key = `${clientId}|${platform}`;
        if (!map[key]) map[key] = [];
        map[key].push(task);
      }
    });
    return map;
  }, [postsToday]);

  const doLogPost = async (client, platform) => {
    const now = new Date();
    const taskData = {
      title: `Post for ${client.clientName}`,
      description: `${platform.charAt(0).toUpperCase() + platform.slice(1)} post completed`,
      assigned_to: currentUser.email,
      assignedBy: currentUser.email,
      status: 'completed',
      priority: 'medium',
      due_date: format(now, 'yyyy-MM-dd'),
      created_date: now.toISOString(),
      completed_date: now.toISOString(),
      labels: ['client-post', `client-${client.id}`, platform],
      task_type: 'post_log',
      clientId: client.id
    };
    const taskId = await supabaseService.addTask(taskData);
    const update = getPostLogUpdate(client, platform, 1);
    await supabaseService.updateClient(client.id, update);
    setPostsToday(prev => [...prev, { ...taskData, id: taskId }]);
    return client.clientName;
  };

  const handleRemovePost = async (clientId, platform) => {
    const key = `${clientId}|${platform}`;
    const tasks = postsByClientPlatform[key] || [];
    const task = tasks[0];
    if (!task?.id) return;
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    setLogging(true);
    try {
      await supabaseService.deleteTask(task.id);
      const update = getPostLogUpdate(client, platform, -1);
      await supabaseService.updateClient(clientId, update);
      setPostsToday(prev => prev.filter(t => t.id !== task.id));
      toast.success(`Removed 1 ${platform} post for ${client.clientName}`);
    } catch (error) {
      console.error('Error removing post:', error);
      toast.error('Failed to remove post');
    } finally {
      setLogging(false);
    }
  };

  const handleQuickLog = async (clientId, platform) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    setLogging(true);
    try {
      const name = await doLogPost(client, platform);
      toast.success(`+1 ${platform} for ${name}`);
    } catch (error) {
      console.error('Error logging post:', error);
      toast.error('Failed to log post');
    } finally {
      setLogging(false);
    }
  };

  const handleLogPost = async () => {
    if (!selectedClient) {
      toast.error('Please select a client');
      return;
    }
    const client = clients.find(c => c.id === selectedClient);
    if (!client) return;
    setLogging(true);
    try {
      await doLogPost(client, selectedPlatform);
      toast.success(`Post logged for ${client.clientName}!`);
      setShowLogModal(false);
      setSelectedClient('');
      setSelectedPlatform('instagram');
    } catch (error) {
      console.error('Error logging post:', error);
      toast.error('Failed to log post');
    } finally {
      setLogging(false);
    }
  };

  if (loadingWidget) {
    return (
      <div className="min-h-[320px] sm:min-h-[380px] widget-scroll overflow-auto bg-surface backdrop-blur-xl rounded-xl p-4 sm:p-6 border border-hairline animate-pulse">
        <div className="h-5 w-32 bg-black/10 dark:bg-white/10 rounded mb-4" />
        <div className="space-y-3">
          <div className="h-10 w-full bg-surface-3 rounded" />
          <div className="h-10 w-full bg-surface-3 rounded" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-[320px] sm:min-h-[380px] widget-scroll overflow-auto bg-surface backdrop-blur-xl rounded-xl p-4 sm:p-6 border border-hairline">
        {/* Header: big tally total */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-positive to-positive flex items-center justify-center shadow-lg shadow-positive/20">
              <CheckCircle2 className="w-6 h-6 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="font-semibold text-[17px] text-ink">Posts Today</h3>
              <p className="text-2xl sm:text-3xl font-semibold tabular-nums text-ink">{postsToday.length}</p>
              <p className="text-[11px] text-ink-muted">logged</p>
            </div>
          </div>
          <button
            onClick={() => setShowLogModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-3 text-ink text-[12px] font-medium hover:bg-hairline-strong transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Log (other)
          </button>
        </div>

        {/* Per client: only assigned platforms, round − and + per platform */}
        <div className="space-y-3">
          <p className="text-[11px] font-medium text-ink-muted uppercase tracking-wide mb-2">By client & platform</p>
          {clients.length === 0 ? (
            <p className="text-[13px] text-ink-muted">No clients assigned</p>
          ) : (
            clients.map(client => {
              const assigned = getAssignedPlatforms(client);
              if (assigned.length === 0) {
                return (
                  <div
                    key={client.id}
                    className="flex items-center gap-3 py-2 px-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02]"
                  >
                    <span className="text-[13px] font-medium text-ink truncate flex-1">
                      {client.clientName}
                    </span>
                    <span className="text-[11px] text-ink-muted">No platforms assigned</span>
                  </div>
                );
              }
              return (
                <div
                  key={client.id}
                  className="rounded-xl bg-black/[0.02] dark:bg-white/[0.02] overflow-hidden"
                >
                  <div className="px-3 py-2 border-b border-black/5 dark:border-white/5">
                    <span className="text-[13px] font-medium text-ink">
                      {client.clientName}
                    </span>
                  </div>
                  <div className="p-2 flex flex-wrap gap-2">
                    {assigned.map(platform => {
                      const key = `${client.id}|${platform}`;
                      const tasks = postsByClientPlatform[key] || [];
                      const count = tasks.length;
                      const Icon = platformIcons[platform];
                      const color = platformColors[platform] || '#666';
                      return (
                        <div
                          key={platform}
                          className="flex items-center gap-1.5 px-2 py-1.5 rounded-full bg-white dark:bg-white/10 border border-hairline-strong shadow-sm"
                        >
                          <Icon className="w-4 h-4 shrink-0" style={{ color }} />
                          <span className="tabular-nums text-[12px] font-medium text-ink min-w-[1rem] text-center">
                            {count}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemovePost(client.id, platform)}
                            disabled={logging || count === 0}
                            className="w-7 h-7 rounded-full bg-black/10 dark:bg-white/10 text-ink flex items-center justify-center hover:bg-black/20 dark:hover:bg-white/20 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                            title={`Remove 1 ${platform} post`}
                          >
                            <Minus className="w-3.5 h-3.5" strokeWidth={2.5} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickLog(client.id, platform)}
                            disabled={logging}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                            style={{ backgroundColor: color }}
                            title={`Log 1 ${platform} post`}
                          >
                            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Log Post Modal */}
      {showLogModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl w-full max-w-sm overflow-hidden border border-hairline-strong shadow-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b border-hairline">
              <h3 className="text-[17px] font-semibold text-ink">Log Completed Post</h3>
              <button
                onClick={() => setShowLogModal(false)}
                className="w-8 h-8 rounded-full hover:bg-surface-3 flex items-center justify-center"
              >
                <X className="w-5 h-5 text-ink-muted" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              {/* Client Select */}
              <div>
                <label className="block text-[13px] font-medium text-ink mb-2">
                  Client
                </label>
                <select
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl bg-surface border border-hairline-strong text-[14px] text-ink focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  <option value="">Select a client...</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.clientName} ({getPostsRemaining(client)} remaining)
                    </option>
                  ))}
                </select>
              </div>

              {/* Platform Select: only assigned when client selected */}
              <div>
                <label className="block text-[13px] font-medium text-ink mb-2">
                  Platform
                </label>
                <div className="flex flex-wrap gap-2">
                  {(selectedClient
                    ? (() => {
                        const c = clients.find(x => x.id === selectedClient);
                        const a = c ? getAssignedPlatforms(c) : [];
                        return a.length ? a : PLATFORM_KEYS;
                      })()
                    : PLATFORM_KEYS
                  ).map(platform => {
                    const Icon = platformIcons[platform];
                    return (
                      <button
                        key={platform}
                        onClick={() => setSelectedPlatform(platform)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-medium transition-colors ${
                          selectedPlatform === platform
                            ? 'bg-brand text-white'
                            : 'bg-surface-3 text-ink hover:bg-hairline-strong'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="capitalize">{platform}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex gap-3 px-5 py-4 border-t border-hairline">
              <button
                onClick={() => setShowLogModal(false)}
                className="flex-1 h-11 rounded-xl bg-surface-3 text-ink text-[14px] font-medium hover:bg-hairline-strong transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogPost}
                disabled={logging || !selectedClient}
                className="flex-1 h-11 rounded-xl bg-positive text-white text-[14px] font-medium hover:bg-positive transition-colors disabled:opacity-50"
              >
                {logging ? 'Logging...' : 'Log Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PostsLoggedWidget;
