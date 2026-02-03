/**
 * PostsLoggedWidget - Dashboard widget showing posts logged today
 * Allows SMMs to quickly log completed posts for their clients
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  Plus, 
  Instagram, 
  Youtube, 
  Facebook, 
  Linkedin,
  Calendar,
  X
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useViewAs } from '../../../contexts/ViewAsContext';
import { firestoreService } from '../../../services/firestoreService';
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

const PostsLoggedWidget = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { isViewingAs, viewingAsUser } = useViewAs();
  const [loading, setLoading] = useState(true);
  const [postsToday, setPostsToday] = useState([]);
  const [showLogModal, setShowLogModal] = useState(false);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('instagram');
  const [logging, setLogging] = useState(false);

  const effectiveUser = isViewingAs && viewingAsUser ? viewingAsUser : currentUser;

  // Load today's logged posts
  useEffect(() => {
    const loadPostsToday = async () => {
      if (!effectiveUser?.email) return;

      try {
        // Get logged posts from tasks with label 'client-post' completed today
        const allTasks = await firestoreService.getTasksByUser(effectiveUser.email);
        const today = format(new Date(), 'yyyy-MM-dd');
        
        const todaysPosts = allTasks.filter(task => {
          const isClientPost = task.labels?.includes('client-post');
          const completedToday = task.completed_date?.startsWith(today);
          return isClientPost && task.status === 'completed' && completedToday;
        });

        setPostsToday(todaysPosts);

        // Load clients for the log modal
        const allClients = await firestoreService.getClients();
        // Filter to clients assigned to this user or all if admin
        const myClients = allClients.filter(c => {
          const am = (c.assignedManager || '').toLowerCase();
          const email = (effectiveUser?.email || '').toLowerCase();
          return am === email || c.postsRemaining > 0;
        });
        setClients(myClients);
      } catch (error) {
        console.error('Error loading posts:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPostsToday();
  }, [effectiveUser?.email]);

  const handleLogPost = async () => {
    if (!selectedClient) {
      toast.error('Please select a client');
      return;
    }

    setLogging(true);
    try {
      const client = clients.find(c => c.id === selectedClient);
      if (!client) throw new Error('Client not found');

      // Create a completed task for the post
      const now = new Date();
      const taskData = {
        title: `Post for ${client.clientName}`,
        description: `${selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)} post completed`,
        assigned_to: effectiveUser.email,
        assignedBy: effectiveUser.email,
        status: 'completed',
        priority: 'medium',
        due_date: format(now, 'yyyy-MM-dd'),
        created_date: now.toISOString(),
        completed_date: now.toISOString(),
        labels: ['client-post', `client-${client.id}`, selectedPlatform],
        task_type: 'post_log'
      };

      await firestoreService.addTask(taskData);

      // Update client's post counts
      const newPostsUsed = (client.postsUsed || 0) + 1;
      const newPostsRemaining = Math.max((client.postsRemaining || 0) - 1, 0);
      
      await firestoreService.updateClient(client.id, {
        postsUsed: newPostsUsed,
        postsRemaining: newPostsRemaining
      });

      // Add to local state
      setPostsToday(prev => [...prev, { ...taskData, id: Date.now().toString(), clientName: client.clientName }]);
      
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

  if (loading) {
    return (
      <div className="h-[327px] min-h-[327px] widget-scroll overflow-auto bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-black/5 dark:border-white/10 animate-pulse">
        <div className="h-5 w-32 bg-black/10 dark:bg-white/10 rounded mb-4" />
        <div className="space-y-3">
          <div className="h-10 w-full bg-black/5 dark:bg-white/5 rounded" />
          <div className="h-10 w-full bg-black/5 dark:bg-white/5 rounded" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-[327px] min-h-[327px] widget-scroll overflow-auto bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-black/5 dark:border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#34c759] to-[#30d158] flex items-center justify-center shadow-lg shadow-[#34c759]/20">
              <CheckCircle2 className="w-4 h-4 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="font-semibold text-[15px] text-[#1d1d1f] dark:text-white">Posts Today</h3>
              <p className="text-[11px] text-[#86868b]">{postsToday.length} logged</p>
            </div>
          </div>
          <button
            onClick={() => setShowLogModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#34c759] text-white text-[12px] font-medium hover:bg-[#30d158] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Log Post
          </button>
        </div>

        {/* Posts List */}
        {postsToday.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-10 h-10 mx-auto mb-2 text-[#86868b] opacity-50" />
            <p className="text-[13px] text-[#86868b]">No posts logged today</p>
            <p className="text-[11px] text-[#86868b] mt-1">Click "Log Post" to record a completed post</p>
          </div>
        ) : (
          <div className="space-y-2">
            {postsToday.slice(0, 5).map((post) => {
              const platform = post.labels?.find(l => platformIcons[l]) || 'instagram';
              const PlatformIcon = platformIcons[platform] || Instagram;
              const clientLabel = post.labels?.find(l => l.startsWith('client-') && l !== 'client-post');
              
              return (
                <div 
                  key={post.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02]"
                >
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${platformColors[platform] || '#86868b'}15` }}
                  >
                    <PlatformIcon 
                      className="w-4 h-4" 
                      style={{ color: platformColors[platform] || '#86868b' }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white truncate">
                      {post.title || post.clientName || 'Post'}
                    </p>
                    <p className="text-[11px] text-[#86868b]">
                      {format(new Date(post.completed_date), 'h:mm a')}
                    </p>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-[#34c759] flex-shrink-0" />
                </div>
              );
            })}
            {postsToday.length > 5 && (
              <p className="text-[11px] text-[#86868b] text-center pt-2">
                +{postsToday.length - 5} more posts
              </p>
            )}
          </div>
        )}
      </div>

      {/* Log Post Modal */}
      {showLogModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl w-full max-w-sm overflow-hidden border border-black/10 dark:border-white/10 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/10">
              <h3 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">Log Completed Post</h3>
              <button
                onClick={() => setShowLogModal(false)}
                className="w-8 h-8 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center"
              >
                <X className="w-5 h-5 text-[#86868b]" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              {/* Client Select */}
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                  Client
                </label>
                <select
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[14px] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                >
                  <option value="">Select a client...</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.clientName} ({client.postsRemaining || 0} remaining)
                    </option>
                  ))}
                </select>
              </div>

              {/* Platform Select */}
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                  Platform
                </label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(platformIcons).map(([platform, Icon]) => (
                    <button
                      key={platform}
                      onClick={() => setSelectedPlatform(platform)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-medium transition-colors ${
                        selectedPlatform === platform
                          ? 'bg-[#0071e3] text-white'
                          : 'bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="capitalize">{platform}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 px-5 py-4 border-t border-black/5 dark:border-white/10">
              <button
                onClick={() => setShowLogModal(false)}
                className="flex-1 h-11 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[14px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogPost}
                disabled={logging || !selectedClient}
                className="flex-1 h-11 rounded-xl bg-[#34c759] text-white text-[14px] font-medium hover:bg-[#30d158] transition-colors disabled:opacity-50"
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
