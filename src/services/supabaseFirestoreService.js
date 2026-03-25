/**
 * supabaseFirestoreService.js
 * Drop-in replacement for firestoreService.js — same class, same method signatures, same return shapes.
 * Backed by Supabase instead of Firestore.
 *
 * Usage (swap the import in any file):
 *   import { firestoreService } from './supabaseFirestoreService';
 */

import { supabase } from '../lib/supabase';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ts = () => new Date().toISOString();

/** Normalize any timestamp value to ISO string */
const normalizeTs = (val) => {
  if (!val) return null;
  if (typeof val === 'string') return val;
  if (val instanceof Date) return val.toISOString();
  if (val?.toDate) return val.toDate().toISOString(); // Firestore Timestamp compat
  return String(val);
};

/** Strip undefined values from an object */
const clean = (obj) => {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
};

// ─── Simple TTL cache ────────────────────────────────────────────────────────
// Eliminates redundant refetches on navigation — entries expire after 5 min.
// Write operations call cacheInvalidate() for the affected table.
// Realtime subscriptions also call cacheInvalidate() on any live change,
// so stale data is never served after an actual write — only on read-only pages.
const _cache = new Map();
const CACHE_TTL = 300_000; // 5 minutes
const CACHE_MAX_SIZE = 200; // evict oldest entry when limit is reached

// ─── In-flight deduplication ─────────────────────────────────────────────────
// If two listeners subscribe simultaneously (empty cache), only one fetch fires.
const _inFlight = new Map(); // cacheKey → Promise<data>

function cacheGet(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.exp) { _cache.delete(key); return null; }
  return entry.data;
}
function _cacheEvictOldest() {
  let oldestKey = null;
  let oldestExp = Infinity;
  for (const [k, v] of _cache.entries()) {
    if (v.exp < oldestExp) { oldestExp = v.exp; oldestKey = k; }
  }
  if (oldestKey) _cache.delete(oldestKey);
}
function cacheSet(key, data, ttl = CACHE_TTL) {
  if (_cache.size >= CACHE_MAX_SIZE) _cacheEvictOldest();
  _cache.set(key, { data, exp: Date.now() + ttl });
  return data;
}
function cacheInvalidate(prefix) {
  for (const k of _cache.keys()) {
    if (k.startsWith(prefix)) _cache.delete(k);
  }
  for (const k of _inFlight.keys()) {
    if (k.startsWith(prefix)) _inFlight.delete(k);
  }
}

// ─── Shared per-table realtime channels ─────────────────────────────────────
// Instead of one WebSocket per listener, all listeners for the same table
// share a single channel. Reduces 22 WebSocket connections to ~10.
const _tableChannels = new Map(); // table → { channel, listeners: Set<fn> }

function getTableChannel(table) {
  if (_tableChannels.has(table)) return _tableChannels.get(table);
  const listeners = new Set();
  const channel = supabase
    .channel(`shared-${table}`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
      cacheInvalidate(table); // bust cache on any change
      listeners.forEach(fn => fn(payload));
    })
    .subscribe();
  const entry = { channel, listeners };
  _tableChannels.set(table, entry);
  return entry;
}

/** Realtime: fetch + subscribe pattern. Returns unsubscribe fn.
 *  All callers for the same table share one WebSocket channel.
 *  In-flight dedup: if two listeners subscribe simultaneously with an empty
 *  cache, only one network request fires; both callbacks receive the result. */
function realtimeListener(table, _filter, fetcher, callback) {
  // Serve from cache if fresh
  const cacheKey = `${table}:${_filter || 'all'}`;
  const cached = cacheGet(cacheKey);
  if (cached) {
    callback(cached);
  } else {
    // Reuse any in-flight request for this exact key
    let promise = _inFlight.get(cacheKey);
    if (!promise) {
      promise = fetcher()
        .then(data => { cacheSet(cacheKey, data); _inFlight.delete(cacheKey); return data; })
        .catch(() => { _inFlight.delete(cacheKey); return []; });
      _inFlight.set(cacheKey, promise);
    }
    promise.then(data => callback(data));
  }

  // Register on shared table channel with debounce to collapse rapid-fire updates
  const entry = getTableChannel(table);
  let debounceTimer = null;
  const handler = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      try {
        const data = await fetcher();
        cacheSet(cacheKey, data);
        callback(data);
      } catch (err) {
        // Don't call callback([]) — that wipes permissions/data to empty.
        // Only deliver stale cache if available; otherwise silently skip.
        const stale = cacheGet(cacheKey);
        if (stale) callback(stale);
        else console.warn(`realtimeListener: fetch failed for ${cacheKey}, skipping callback`, err);
      }
    }, 300);
  };
  entry.listeners.add(handler);

  return () => {
    clearTimeout(debounceTimer);
    entry.listeners.delete(handler);
    // Don't remove the channel itself — other listeners may still use it
  };
}

// ─── SupabaseService ──────────────────────────────────────────────────────────

class SupabaseService {
  collections = {
    USERS: 'users', PENDING_USERS: 'pending_users', APPROVED_USERS: 'approved_users',
    TASKS: 'tasks', TASK_TEMPLATES: 'task_templates', SMART_FILTERS: 'smart_filters',
    SYSTEM_CONFIG: 'system_config', EMPLOYEES: 'employees', LEAVE_REQUESTS: 'leave_requests',
    CLIENTS: 'clients', CRM: 'crm', SUPPORT_TICKETS: 'support_tickets',
    TICKET_COMMENTS: 'ticket_comments', NOTIFICATIONS: 'notifications',
    TASK_REQUESTS: 'task_requests', USER_TASK_ARCHIVES: 'user_task_archives',
    CLIENT_MESSAGES: 'client_messages', CLIENT_REPORTS: 'client_reports',
    PENDING_CLIENTS: 'pending_clients', CLIENT_CONTRACTS: 'client_contracts',
    INSTAGRAM_REPORTS: 'instagram_reports', CLIENT_MOVEMENTS: 'client_movements',
    CLIENT_HEALTH_SNAPSHOTS: 'client_health_snapshots', ERROR_REPORTS: 'error_reports',
    USER_DASHBOARD_PREFERENCES: 'user_dashboard_preferences',
    GRAPHIC_PROJECTS: 'graphic_projects', PROJECT_REQUESTS: 'project_requests',
    FEEDBACK: 'feedback', FEEDBACK_CHATS: 'feedback_chats', CUSTOM_ROLES: 'custom_roles',
    SYSTEM: 'system', POST_LOG_MONTHLY: 'post_log_monthly', USAGE_EVENTS: 'usage_events',
    CONTENT_CALENDARS: 'content_calendars', CONTENT_ITEMS: 'content_items',
    CANVASES: 'canvases', CANVAS_FORM_RESPONSES: 'canvas_form_responses'
  };

  // ===== CONNECTION TEST =====

  async testConnection() {
    try {
      const { error } = await supabase.from('profiles').select('id').limit(1);
      if (error) throw error;
      return { success: true, message: 'Supabase connection successful' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ===== USER MANAGEMENT =====

  async addPendingUser(userData) {
    try {
      const { id: _ignored, ...safe } = userData || {};
      const { data, error } = await supabase.from('pending_users').insert([clean({
        email: (safe.email || '').toLowerCase().trim(),
        name: safe.name || safe.displayName || null,
        role: safe.role || 'team_member',
        status: 'pending',
        meta: JSON.stringify(safe),
        created_at: ts()
      })]).select().single();
      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('❌ Error adding pending user:', error);
      throw error;
    }
  }

  async getPendingUsers() {
    try {
      const { data, error } = await supabase.from('pending_users').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(r => ({ id: r.id, email: r.email, name: r.name, role: r.role, status: r.status, createdAt: r.created_at, ...(r.meta || {}) }));
    } catch { return []; }
  }

  async removePendingUser(userId) {
    try {
      const { error } = await supabase.from('pending_users').delete().eq('id', userId);
      if (error) throw error;
    } catch (error) {
      console.error('❌ Error removing pending user:', error);
      throw error;
    }
  }

  async updatePendingUser(userId, updates) {
    try {
      const { id: _ignored, ...safe } = updates || {};
      const { error } = await supabase.from('pending_users').update(clean({ ...safe, updated_at: ts() })).eq('id', userId);
      if (error) throw error;
    } catch (error) {
      console.error('❌ Error updating pending user:', error);
      throw error;
    }
  }

  /** Move pending user to approved_users (profiles table). Cleans up all pending docs for that email. */
  async approveUser(userId, userData) {
    try {
      const emailKey = (userData.email || '').trim().toLowerCase();
      await this.addApprovedUser({ ...userData, email: emailKey });
      // Remove all pending entries for this email
      const { data: pending } = await supabase.from('pending_users').select('id').ilike('email', emailKey);
      for (const p of pending || []) {
        await supabase.from('pending_users').delete().eq('id', p.id);
      }
    } catch (error) {
      console.error('❌ Error approving user:', error);
      throw error;
    }
  }

  /** Map a profiles row → V3 approved_user shape */
  _profileToApprovedUser(p) {
    return {
      id: p.email || p.id,
      email: p.email || '',
      name: p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email,
      displayName: p.full_name || p.email,
      firstName: p.first_name || '',
      lastName: p.last_name || '',
      role: p.role || 'team_member',
      isApproved: p.is_approved !== false,
      approvedAt: normalizeTs(p.approved_at),
      createdAt: normalizeTs(p.created_at),
      updatedAt: normalizeTs(p.updated_at),
      lastSeenAt: normalizeTs(p.last_seen_at),
      position: p.position || '',
      department: p.department || '',
      phone: p.phone || '',
      bio: p.bio || '',
      avatar: p.avatar_url || '',
      avatar_url: p.avatar_url || '',
      pagePermissions: Array.isArray(p.page_permissions) ? p.page_permissions : [],
      featurePermissions: Array.isArray(p.feature_permissions) ? p.feature_permissions : [],
      customPermissions: Array.isArray(p.custom_permissions) ? p.custom_permissions : [],
      // Merged capabilities: single source of truth for all action permissions
      capabilities: [...new Set([
        ...(Array.isArray(p.feature_permissions) ? p.feature_permissions : []),
        ...(Array.isArray(p.custom_permissions) ? p.custom_permissions : []),
      ])],
      leaveBalances: p.leave_balances || {},
      isTimeOffAdmin: p.is_time_off_admin || false,
      onboardingCompleted: p.onboarding_completed || false,
      startDate: p.start_date || null,
      skills: p.skills || [],
      isRemote: p.is_remote || false,
      slackUserId: p.slack_user_id || null,
      slackWorkspaceId: p.slack_workspace_id || null,
      permissionsVersion: p.permissions_version || 0,
    };
  }

  async getApprovedUsers() {
    const key = 'profiles:all';
    const cached = cacheGet(key);
    if (cached) return cached;
    try {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      return cacheSet(key, (data || []).map(p => this._profileToApprovedUser(p)));
    } catch (error) {
      console.error('❌ Error getting approved users:', error);
      return [];
    }
  }

  async getApprovedUserByEmail(email) {
    if (!email) return null;
    const lower = email.trim().toLowerCase();
    const key = `profiles:email:${lower}`;
    const cached = cacheGet(key);
    if (cached !== null) return cached;
    try {
      const { data, error } = await supabase.from('profiles').select('*').ilike('email', lower).maybeSingle();
      if (error) throw error;
      const result = data ? this._profileToApprovedUser(data) : null;
      return cacheSet(key, result);
    } catch { return null; }
  }

  /** Bust the cached profile for a specific user — call before auth sign-in
   *  so that handleUserSignIn always reads fresh permissions from the DB. */
  clearProfileCache(email) {
    if (!email) return;
    const lower = email.trim().toLowerCase();
    cacheInvalidate(`profiles:email:${lower}`);
    cacheInvalidate('profiles:all');
  }

  async addApprovedUser(userData) {
    try {
      const emailKey = (userData.email || '').trim().toLowerCase();
      const { data: existing } = await supabase.from('profiles').select('id').ilike('email', emailKey).maybeSingle();
      const payload = clean({
        email: emailKey,
        full_name: userData.name || userData.displayName || userData.full_name || null,
        first_name: userData.firstName || null,
        last_name: userData.lastName || null,
        role: userData.role || 'team_member',
        position: userData.position || null,
        department: userData.department || null,
        phone: userData.phone || null,
        bio: userData.bio || null,
        avatar_url: userData.avatar_url || userData.photoURL || null,
        is_approved: true,
        approved_at: ts(),
        page_permissions: userData.pagePermissions || [],
        feature_permissions: userData.featurePermissions || [],
        custom_permissions: userData.customPermissions || [],
        leave_balances: userData.leaveBalances || null,
        is_time_off_admin: userData.isTimeOffAdmin || false,
        onboarding_completed: userData.onboardingCompleted || false,
        start_date: userData.startDate || null,
        skills: userData.skills || [],
        updated_at: ts(),
      });

      if (existing) {
        const { error } = await supabase.from('profiles').update(payload).eq('id', existing.id);
        if (error) throw error;
      } else {
        // profiles.id must match auth.users.id — but for approved users without auth, use email-based UUID
        // We insert without an id and let the trigger create it, or upsert by email
        const { error } = await supabase.from('profiles').upsert({ ...payload, created_at: ts() }, { onConflict: 'email' });
        if (error) throw error;
      }
      cacheInvalidate('profiles:');
    } catch (error) {
      console.error('❌ Error adding approved user:', error);
      throw error;
    }
  }

  async removeApprovedUser(email) {
    try {
      const { error } = await supabase.from('profiles').delete().ilike('email', email.toLowerCase().trim());
      if (error) throw error;
    } catch (error) {
      console.error('❌ Error removing approved user:', error);
      throw error;
    }
  }

  async updateApprovedUser(email, updates) {
    try {
      const { id: _ignored, ...safe } = updates || {};
      if (!Object.keys(safe).length) return;
      const emailKey = (email || '').trim().toLowerCase();

      // Safety: log when permission fields are being modified — helps trace accidental overwrites
      const permFields = ['pagePermissions', 'featurePermissions', 'customPermissions', 'role', 'isApproved'];
      const touchedPerms = permFields.filter(f => safe[f] !== undefined);
      if (touchedPerms.length) {
        console.warn(`⚠️ updateApprovedUser(${emailKey}): modifying permission fields [${touchedPerms.join(', ')}]`);
      }
      const payload = clean({
        ...(safe.name || safe.displayName ? { full_name: safe.name || safe.displayName } : {}),
        ...(safe.firstName ? { first_name: safe.firstName } : {}),
        ...(safe.lastName ? { last_name: safe.lastName } : {}),
        ...(safe.role ? { role: safe.role } : {}),
        ...(safe.position !== undefined ? { position: safe.position } : {}),
        ...(safe.department !== undefined ? { department: safe.department } : {}),
        ...(safe.phone !== undefined ? { phone: safe.phone } : {}),
        ...(safe.bio !== undefined ? { bio: safe.bio } : {}),
        ...(safe.avatar_url !== undefined || safe.avatar !== undefined ? { avatar_url: safe.avatar_url || safe.avatar } : {}),
        ...(safe.pagePermissions !== undefined ? { page_permissions: safe.pagePermissions } : {}),
        ...(safe.featurePermissions !== undefined ? { feature_permissions: safe.featurePermissions } : {}),
        ...(safe.customPermissions !== undefined ? { custom_permissions: safe.customPermissions } : {}),
        ...(safe.leaveBalances !== undefined ? { leave_balances: safe.leaveBalances } : {}),
        ...(safe.isTimeOffAdmin !== undefined ? { is_time_off_admin: safe.isTimeOffAdmin } : {}),
        ...(safe.onboardingCompleted !== undefined ? { onboarding_completed: safe.onboardingCompleted } : {}),
        ...(safe.startDate !== undefined ? { start_date: safe.startDate } : {}),
        ...(safe.skills !== undefined ? { skills: safe.skills } : {}),
        ...(safe.isApproved !== undefined ? { is_approved: safe.isApproved } : {}),
        ...(safe.slackUserId !== undefined ? { slack_user_id: safe.slackUserId } : {}),
        ...(safe.slackWorkspaceId !== undefined ? { slack_workspace_id: safe.slackWorkspaceId } : {}),
        updated_at: ts(),
      });
      const { error } = await supabase.from('profiles').update(payload).ilike('email', emailKey);
      if (error) throw error;
      cacheInvalidate('profiles:');
    } catch (error) {
      console.error('❌ Error updating approved user:', error);
      throw error;
    }
  }

  async ensureEmailLowerClaim() { /* no-op for Supabase — claims not used */ }

  async updateLastSeen(userEmail) {
    if (!userEmail) return;
    try {
      await supabase.from('profiles').update({ last_seen_at: ts() }).ilike('email', userEmail.trim().toLowerCase());
    } catch { /* non-fatal */ }
  }

  onApprovedUserChange(email, callback) {
    if (!email) return () => {};
    const lower = email.trim().toLowerCase();
    return realtimeListener('profiles', lower, async () => {
      const { data } = await supabase.from('profiles').select('*').ilike('email', lower).maybeSingle();
      return data ? this._profileToApprovedUser(data) : null;
    }, (result) => { if (result) callback(result); });
  }

  async deleteApprovedUser(email) {
    return this.removeApprovedUser(email);
  }

  // ===== TASK MANAGEMENT =====

  async addTask(taskData) {
    try {
      const { data, error } = await supabase.from('tasks').insert([clean({
        title: taskData.title || 'Untitled Task',
        description: taskData.description || null,
        status: taskData.status || 'todo',
        priority: taskData.priority ?? 2,
        source: taskData.source || 'task',
        assigned_to: taskData.assigned_to || null,
        assigned_by: taskData.assigned_by || null,
        task_type: taskData.task_type || null,
        client_id_legacy: taskData.clientId || null,
        task_request_id: taskData.taskRequestId || null,
        due_date: taskData.due_date || null,
        due_time: taskData.due_time || null,
        completed_date: taskData.completed_date || null,
        post_date: taskData.post_date || null,
        platform: taskData.platform || null,
        post_url: taskData.post_url || null,
        meta: clean({ ...taskData }),
        created_at: ts(),
      })]).select().single();
      if (error) throw error;
      cacheInvalidate('tasks:');
      return data.id;
    } catch (error) {
      console.error('❌ Error adding task:', error);
      throw error;
    }
  }

  _mapTask(row) {
    const meta = row.meta || {};
    return {
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      source: row.source,
      assigned_to: row.assigned_to,
      assigned_by: row.assigned_by,
      task_type: row.task_type,
      clientId: row.client_id_legacy,
      taskRequestId: row.task_request_id,
      due_date: row.due_date,
      due_time: row.due_time,
      completed_date: row.completed_date,
      post_date: row.post_date,
      platform: row.platform,
      post_url: row.post_url,
      createdAt: normalizeTs(row.created_at),
      updatedAt: normalizeTs(row.updated_at),
      ...meta,
      id: row.id, // spread last so meta.id cannot clobber the real row id
    };
  }

  async getTasks() {
    const key = 'tasks:all';
    const cached = cacheGet(key);
    if (cached) return cached;
    try {
      const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return cacheSet(key, (data || []).map(r => this._mapTask(r)));
    } catch (error) {
      console.error('❌ Error getting tasks:', error);
      return [];
    }
  }

  async getTasksByUser(userEmail) {
    const key = `tasks:user:${(userEmail || '').toLowerCase()}`;
    const cached = cacheGet(key);
    if (cached) return cached;
    try {
      const { data, error } = await supabase.from('tasks').select('*').eq('assigned_to', userEmail).order('created_at', { ascending: false });
      if (error) throw error;
      return cacheSet(key, (data || []).map(r => this._mapTask(r)));
    } catch (error) {
      console.error('❌ Error getting user tasks:', error);
      return [];
    }
  }

  async getPostLogTasksByClient(clientId, options = {}) {
    const { limit: max = 200 } = options;
    if (!clientId) return [];
    try {
      const { data, error } = await supabase.from('tasks').select('*')
        .eq('task_type', 'post_log').eq('client_id_legacy', clientId)
        .order('completed_date', { ascending: false }).limit(max);
      if (error) throw error;
      return (data || []).map(r => this._mapTask(r));
    } catch { return []; }
  }

  async getPostLogMonthlyHistory(clientId, options = {}) {
    const { limit: max = 24 } = options;
    if (!clientId) return [];
    try {
      const { data, error } = await supabase.from('post_log_monthly').select('*')
        .eq('client_id', clientId).order('year_month', { ascending: false }).limit(max);
      if (error) throw error;
      return (data || []).map(r => ({ id: r.id, clientId: r.client_id, yearMonth: r.year_month, postsLogged: r.posts_logged, clientName: r.client_name, postsByPlatform: r.posts_by_platform }));
    } catch { return []; }
  }

  async getLastPostsResetMonth() {
    try {
      const { data } = await supabase.from('system_config').select('value').eq('key', 'posts_reset').maybeSingle();
      return data?.value?.lastYearMonth || null;
    } catch { return null; }
  }

  async runMonthlyPostsReset() {
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const last = await this.getLastPostsResetMonth();
    if (last && last >= currentYearMonth) return { didReset: false, reason: 'already reset this month' };
    const clients = await this.getClients();
    const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const previousYearMonth = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}`;
    for (const c of clients) {
      const packageSize = Math.max(0, Number(c.packageSize) || 0);
      const postsLogged = Math.max(0, Number(c.postsUsed) || 0);
      await supabase.from('post_log_monthly').upsert({ client_id: c.id, year_month: previousYearMonth, posts_logged: postsLogged, client_name: c.clientName || c.name || null }, { onConflict: 'client_id,year_month' });
      await this.updateClient(c.id, { postsUsed: 0, postsRemaining: packageSize });
    }
    await supabase.from('system_config').upsert({ key: 'posts_reset', value: { lastYearMonth: currentYearMonth }, updated_at: ts() }, { onConflict: 'key' });
    return { didReset: true, clientCount: clients.length, yearMonth: currentYearMonth };
  }

  async updateTask(taskId, updates) {
    const clean2 = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined) continue;
      if ((key === 'due_date' || key === 'due_time') && value === '') { clean2[key] = null; }
      else { clean2[key] = value; }
    }
    try {
      if (updates.status === 'completed') {
        const task = await this.getTaskById(taskId);
        if (task?.assigned_by) {
          const link = task.taskRequestId ? `/tasks?tab=outbox&requestId=${task.taskRequestId}` : '/tasks?tab=outbox';
          await this.createNotification({ userEmail: task.assigned_by, type: 'task_completed', title: 'Task completed', message: `A task you requested was completed: ${task.title || 'Task'}`, link, taskRequestId: task.taskRequestId, read: false });
        }
      }
      const payload = {};
      if (clean2.title !== undefined) payload.title = clean2.title;
      if (clean2.description !== undefined) payload.description = clean2.description;
      if (clean2.status !== undefined) payload.status = clean2.status;
      if (clean2.priority !== undefined) payload.priority = clean2.priority;
      if (clean2.assigned_to !== undefined) payload.assigned_to = clean2.assigned_to;
      if (clean2.assigned_by !== undefined) payload.assigned_by = clean2.assigned_by;
      if (clean2.task_type !== undefined) payload.task_type = clean2.task_type;
      if (clean2.clientId !== undefined) payload.client_id_legacy = clean2.clientId;
      if (clean2.due_date !== undefined) payload.due_date = clean2.due_date;
      if (clean2.due_time !== undefined) payload.due_time = clean2.due_time;
      if (clean2.completed_date !== undefined) payload.completed_date = clean2.completed_date;
      if (clean2.post_date !== undefined) payload.post_date = clean2.post_date;
      if (clean2.platform !== undefined) payload.platform = clean2.platform;
      if (clean2.post_url !== undefined) payload.post_url = clean2.post_url;
      payload.updated_at = ts();
      // Merge remaining fields into meta
      const { data: existing } = await supabase.from('tasks').select('meta').eq('id', taskId).maybeSingle();
      payload.meta = { ...(existing?.meta || {}), ...clean2 };
      const { error } = await supabase.from('tasks').update(payload).eq('id', taskId);
      if (error) throw error;
      cacheInvalidate('tasks:');
    } catch (error) {
      console.error('❌ Error updating task:', error);
      throw error;
    }
  }

  async getTaskById(taskId) {
    try {
      const { data, error } = await supabase.from('tasks').select('*').eq('id', taskId).maybeSingle();
      if (error) throw error;
      return data ? this._mapTask(data) : null;
    } catch { return null; }
  }

  async deleteTask(taskId) {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
      cacheInvalidate('tasks:');
    } catch (error) {
      console.error('❌ Error deleting task:', error);
      throw error;
    }
  }

  async getSentTaskRequests(userEmail) {
    try {
      const { data, error } = await supabase.from('task_requests').select('*').eq('from_user_email', userEmail).order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(r => ({ id: r.id, fromUserEmail: r.from_user_email, toUserEmail: r.to_user_email, title: r.title, description: r.description, priority: r.priority, dueDate: r.due_date, dueTime: r.due_time, status: r.status, rejectionReason: r.rejection_reason, taskId: r.task_id, createdAt: normalizeTs(r.created_at) }));
    } catch { return []; }
  }

  _archiveDocId(userEmail, refType, refId) {
    return `${String(userEmail).replace(/[@./]/g, '_').slice(0, 200)}__${refType}__${String(refId).replace(/[@./]/g, '_').slice(0, 200)}`;
  }

  async archiveTaskForUser(userEmail, taskId) {
    try {
      await supabase.from('user_task_archives').upsert({ user_email: userEmail, ref_type: 'task', ref_id: taskId, archived_at: ts() }, { onConflict: 'user_email,ref_type,ref_id' });
      return { success: true };
    } catch (error) { throw error; }
  }

  async archiveRequestForUser(userEmail, taskRequestId) {
    try {
      await supabase.from('user_task_archives').upsert({ user_email: userEmail, ref_type: 'request', ref_id: taskRequestId, archived_at: ts() }, { onConflict: 'user_email,ref_type,ref_id' });
      return { success: true };
    } catch (error) { throw error; }
  }

  async unarchiveTaskForUser(userEmail, taskId) {
    try {
      await supabase.from('user_task_archives').delete().eq('user_email', userEmail).eq('ref_type', 'task').eq('ref_id', taskId);
      return { success: true };
    } catch (error) { throw error; }
  }

  async unarchiveRequestForUser(userEmail, taskRequestId) {
    try {
      await supabase.from('user_task_archives').delete().eq('user_email', userEmail).eq('ref_type', 'request').eq('ref_id', taskRequestId);
      return { success: true };
    } catch (error) { throw error; }
  }

  async getArchivedTaskIds(userEmail) {
    try {
      const { data } = await supabase.from('user_task_archives').select('ref_id').eq('user_email', userEmail).eq('ref_type', 'task');
      return (data || []).map(r => r.ref_id);
    } catch { return []; }
  }

  async getArchivedRequestIds(userEmail) {
    try {
      const { data } = await supabase.from('user_task_archives').select('ref_id').eq('user_email', userEmail).eq('ref_type', 'request');
      return (data || []).map(r => r.ref_id);
    } catch { return []; }
  }

  // ===== SYSTEM CONFIGURATION =====

  async saveSystemConfig(key, value) {
    try {
      const { error } = await supabase.from('system_config').upsert({ key, value, updated_at: ts() }, { onConflict: 'key' });
      if (error) throw error;
      cacheInvalidate(`system_config:${key}`);
    } catch (error) { throw error; }
  }

  async saveSystemUptime(value) { return this.saveSystemConfig('systemUptime', value); }

  async bootstrapSystemAdmins(bootstrapEmail) {
    try {
      const { data } = await supabase.from('system_config').select('value').eq('key', 'admins').maybeSingle();
      if (!data) {
        await this.saveSystemConfig('admins', { emails: [bootstrapEmail.toLowerCase()] });
      }
    } catch (error) { console.warn('Could not bootstrap system admins:', error.message); }
  }

  async getSystemConfig(key) {
    const cacheKey = `system_config:${key}`;
    const cached = cacheGet(cacheKey);
    if (cached !== null) return cached;
    try {
      const { data } = await supabase.from('system_config').select('value').eq('key', key).maybeSingle();
      const val = data?.value ?? null;
      return cacheSet(cacheKey, val, 600_000); // config changes rarely — 10 min TTL
    } catch { return null; }
  }

  onSystemConfigChange(key, callback) {
    return realtimeListener('system_config', key, async () => {
      const { data } = await supabase.from('system_config').select('value').eq('key', key).maybeSingle();
      return data?.value ?? null;
    }, callback);
  }

  // ===== MIGRATION HELPERS =====
  async migrateFromLocalStorage() { console.log('ℹ️ migrateFromLocalStorage: no-op in Supabase mode'); }
  clearLocalStorage() {}

  // ===== REAL-TIME LISTENERS =====

  onPendingUsersChange(callback) {
    return realtimeListener('pending_users', 'all', () => this.getPendingUsers(), callback);
  }

  onApprovedUsersChange(callback) {
    return realtimeListener('profiles', 'all', () => this.getApprovedUsers(), callback);
  }

  onUserTasksChange(userEmail, callback) {
    return realtimeListener('tasks', userEmail, () => this.getTasksByUser(userEmail), callback);
  }

  // ===== EMPLOYEE MANAGEMENT =====
  // In Supabase, employees = profiles (same table, different role filter)

  async getEmployees() {
    try {
      const { data, error } = await supabase.from('profiles').select('*').order('full_name');
      if (error) throw error;
      return (data || []).map(p => this._profileToApprovedUser(p));
    } catch (error) { console.error('❌ Error fetching employees:', error); throw error; }
  }

  async getEmployeeByEmail(email) { return this.getApprovedUserByEmail(email); }

  async updateEmployee(employeeId, employeeData) {
    // employeeId is either a UUID or an email
    try {
      const email = employeeData.email || employeeId;
      if (email && email.includes('@')) {
        return this.updateApprovedUser(email, employeeData);
      }
      const { error } = await supabase.from('profiles').update(clean({ ...employeeData, updated_at: ts() })).eq('id', employeeId);
      if (error) throw error;
    } catch (error) { console.error('❌ Error updating employee:', error); throw error; }
  }

  async addEmployee(employeeData) { return this.addApprovedUser(employeeData); }

  // ===== LEAVE REQUESTS =====

  _mapLeaveRequest(r) {
    // Compute days from date range as fallback if days_requested is missing
    let days = r.days_requested;
    if (!days && r.start_date && r.end_date) {
      const start = new Date(r.start_date);
      const end = new Date(r.end_date);
      const diff = Math.round((end - start) / (1000 * 60 * 60 * 24));
      days = Math.max(1, diff + 1); // inclusive calendar days
    }
    return {
      id: r.id,
      userEmail: r.user_email,
      employeeEmail: r.user_email,
      employeeName: r.employee_name || null, // resolved by fetcher or stored on submit
      userName: r.employee_name || null,
      leaveType: r.leave_type || r.type,
      type: r.leave_type || r.type,
      startDate: r.start_date,
      endDate: r.end_date,
      daysRequested: days,
      days, // alias expected by HRCalendar.jsx
      status: r.status,
      reason: r.reason || r.notes,
      notes: r.reason || r.notes,
      reviewedBy: r.reviewed_by_email || r.reviewed_by,
      reviewedAt: normalizeTs(r.reviewed_at),
      calendarEventId: r.calendar_event_id,
      requesterCalendarEventId: r.requester_calendar_event_id,
      history: r.history || [],
      archived: r.archived || false,
      cancelledAt: normalizeTs(r.cancelled_at),
      cancelledBy: r.cancelled_by,
      cancellationReason: r.cancellation_reason,
      createdAt: normalizeTs(r.created_at),
      updatedAt: normalizeTs(r.updated_at),
    };
  }

  /** Bulk-resolve employee names for a list of leave requests from profiles cache */
  async _resolveLeaveRequestNames(requests) {
    if (!requests.length) return requests;
    // Collect unique emails that need name resolution
    const needsName = [...new Set(requests.filter(r => !r.employeeName).map(r => r.userEmail).filter(Boolean))];
    if (!needsName.length) return requests;
    // Fetch display names from profiles in one query
    const { data: profiles } = await supabase.from('profiles').select('email, full_name, first_name, last_name').in('email', needsName);
    const nameMap = {};
    (profiles || []).forEach(p => {
      const name = p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || null;
      if (name) nameMap[p.email.toLowerCase()] = name;
    });
    return requests.map(r => {
      if (r.employeeName) return r;
      const resolved = nameMap[(r.userEmail || '').toLowerCase()] || r.userEmail?.split('@')[0] || 'Unknown';
      return { ...r, employeeName: resolved, userName: resolved };
    });
  }

  async getLeaveRequestsByUser(userEmail) {
    try {
      const { data, error } = await supabase.from('time_off_requests').select('*').eq('user_email', userEmail).order('created_at', { ascending: false });
      if (error) throw error;
      const mapped = (data || []).map(r => this._mapLeaveRequest(r));
      return this._resolveLeaveRequestNames(mapped);
    } catch (error) { console.error('❌ Error getting leave requests:', error); return []; }
  }

  async getAllLeaveRequests() {
    try {
      const { data, error } = await supabase.from('time_off_requests').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      const mapped = (data || []).map(r => this._mapLeaveRequest(r));
      return this._resolveLeaveRequestNames(mapped);
    } catch { return []; }
  }

  async submitLeaveRequest(requestData) {
    try {
      const { data, error } = await supabase.from('time_off_requests').insert([clean({
        user_email: requestData.userEmail,
        employee_name: requestData.employeeName || null,
        leave_type: requestData.leaveType || requestData.type,
        type: requestData.leaveType || requestData.type,
        start_date: requestData.startDate,
        end_date: requestData.endDate,
        days_requested: requestData.daysRequested,
        status: 'pending',
        reason: requestData.reason || requestData.notes,
        history: JSON.stringify([{ action: 'submitted', at: ts(), by: requestData.userEmail }]),
        created_at: ts(),
        updated_at: ts(),
      })]).select().single();
      if (error) throw error;
      return data.id;
    } catch (error) { console.error('❌ Error submitting leave request:', error); throw error; }
  }

  async updateLeaveRequestStatus(requestId, status, reviewedBy, notes) {
    try {
      const { data: existing } = await supabase.from('time_off_requests').select('history').eq('id', requestId).maybeSingle();
      const history = [...(existing?.history || []), { action: status, at: ts(), by: reviewedBy, notes }];
      const { error } = await supabase.from('time_off_requests').update(clean({
        status,
        reviewed_by_email: reviewedBy,
        reviewed_at: ts(),
        history,
        updated_at: ts(),
      })).eq('id', requestId);
      if (error) throw error;
    } catch (error) { console.error('❌ Error updating leave request status:', error); throw error; }
  }

  async getLeaveRequests(userEmail = null) {
    if (userEmail) return this.getLeaveRequestsByUser(userEmail);
    return this.getAllLeaveRequests();
  }

  async getTeamLeaveConflicts(startDate, endDate, excludeEmail = null) {
    try {
      let q = supabase.from('time_off_requests').select('*').eq('status', 'approved').lte('start_date', endDate).gte('end_date', startDate);
      if (excludeEmail) q = q.neq('user_email', excludeEmail);
      const { data } = await q;
      const mapped = (data || []).map(r => this._mapLeaveRequest(r));
      return this._resolveLeaveRequestNames(mapped);
    } catch { return []; }
  }

  onLeaveRequestsChange(callback, userEmail = null) {
    const fetcher = () => userEmail ? this.getLeaveRequestsByUser(userEmail) : this.getAllLeaveRequests();
    return realtimeListener('time_off_requests', userEmail || 'all', fetcher, callback);
  }

  async getUserLeaveBalances(userEmail) {
    try {
      const { data } = await supabase.from('profiles').select('leave_balances').ilike('email', userEmail).maybeSingle();
      return data?.leave_balances || { vacation: { total: 15, used: 0, remaining: 15 }, sick: { total: 3, used: 0, remaining: 3 }, remote: { total: 10, used: 0, remaining: 10 } };
    } catch { return {}; }
  }

  async updateUserLeaveBalances(userEmail, balances) {
    try {
      const { error } = await supabase.from('profiles').update({ leave_balances: balances, updated_at: ts() }).ilike('email', userEmail);
      if (error) throw error;
    } catch (error) { throw error; }
  }

  async getAllUsersWithLeaveBalances() {
    try {
      const { data } = await supabase.from('profiles').select('email, full_name, leave_balances, is_time_off_admin');
      return (data || []).map(p => ({ email: p.email, name: p.full_name, leaveBalances: p.leave_balances || {}, isTimeOffAdmin: p.is_time_off_admin }));
    } catch { return []; }
  }

  async getTimeOffAdmins() {
    try {
      const { data } = await supabase.from('profiles').select('email, full_name').eq('is_time_off_admin', true);
      return (data || []).map(p => ({ email: p.email, name: p.full_name }));
    } catch { return []; }
  }

  async setTimeOffAdmin(userEmail, isAdmin) {
    try {
      const { error } = await supabase.from('profiles').update({ is_time_off_admin: isAdmin }).ilike('email', userEmail);
      if (error) throw error;
    } catch (error) { throw error; }
  }

  async isTimeOffAdmin(userEmail) {
    try {
      const { data } = await supabase.from('profiles').select('is_time_off_admin').ilike('email', userEmail).maybeSingle();
      return data?.is_time_off_admin || false;
    } catch { return false; }
  }

  async cancelLeaveRequest(requestId, cancelledBy, reason = null) {
    try {
      const { data: existing } = await supabase.from('time_off_requests').select('history').eq('id', requestId).maybeSingle();
      const history = [...(existing?.history || []), { action: 'cancelled', at: ts(), by: cancelledBy, reason }];
      const { error } = await supabase.from('time_off_requests').update({ status: 'cancelled', cancelled_at: ts(), cancelled_by: cancelledBy, cancellation_reason: reason, history, updated_at: ts() }).eq('id', requestId);
      if (error) throw error;
    } catch (error) { throw error; }
  }

  async archiveLeaveRequest(requestId, archivedBy) {
    try {
      const { error } = await supabase.from('time_off_requests').update({ archived: true, updated_at: ts() }).eq('id', requestId);
      if (error) throw error;
    } catch (error) { throw error; }
  }

  async unarchiveLeaveRequest(requestId, unarchivedBy) {
    try {
      const { error } = await supabase.from('time_off_requests').update({ archived: false, updated_at: ts() }).eq('id', requestId);
      if (error) throw error;
    } catch (error) { throw error; }
  }

  async hasOverlappingRequest(userEmail, startDate, endDate, excludeRequestId = null) {
    try {
      let q = supabase.from('time_off_requests').select('id').eq('user_email', userEmail).in('status', ['pending', 'approved']).lte('start_date', endDate).gte('end_date', startDate);
      if (excludeRequestId) q = q.neq('id', excludeRequestId);
      const { data } = await q;
      return (data || []).length > 0;
    } catch { return false; }
  }

  async addToRequestHistory(requestId, action, byEmail, notes = null) {
    try {
      const { data: existing } = await supabase.from('time_off_requests').select('history').eq('id', requestId).maybeSingle();
      const history = [...(existing?.history || []), { action, at: ts(), by: byEmail, notes }];
      await supabase.from('time_off_requests').update({ history, updated_at: ts() }).eq('id', requestId);
    } catch (error) { console.error('Error adding to request history:', error); }
  }

  async submitLeaveRequestEnhanced(requestData) { return this.submitLeaveRequest(requestData); }
  async updateLeaveRequestStatusEnhanced(requestId, status, reviewedBy, notes = null) { return this.updateLeaveRequestStatus(requestId, status, reviewedBy, notes); }

  async updateLeaveRequestApproved(requestId, updates, editedBy) {
    try {
      const { error } = await supabase.from('time_off_requests').update({ ...clean(updates), updated_at: ts() }).eq('id', requestId);
      if (error) throw error;
    } catch (error) { throw error; }
  }

  async setLeaveRequestRequesterCalendarEventId(requestId, eventId) {
    await supabase.from('time_off_requests').update({ requester_calendar_event_id: eventId }).eq('id', requestId);
  }

  async setLeaveRequestCalendarEventIdForEmail(requestId, email, eventId) {
    await supabase.from('time_off_requests').update({ calendar_event_id: eventId }).eq('id', requestId);
  }

  async deductLeaveBalance(userEmail, leaveType, days, requestId) {
    try {
      const balances = await this.getUserLeaveBalances(userEmail);
      const key = leaveType === 'vacation' ? 'vacation' : leaveType === 'sick' ? 'sick' : 'remote';
      if (balances[key]) {
        balances[key].used = (balances[key].used || 0) + days;
        balances[key].remaining = Math.max(0, (balances[key].remaining || 0) - days);
        await this.updateUserLeaveBalances(userEmail, balances);
      }
    } catch (error) { throw error; }
  }

  async migrateLeaveBalances() { console.log('ℹ️ migrateLeaveBalances: no-op in Supabase mode'); }

  // ===== CLIENT MANAGEMENT =====

  _mapClient(r) {
    return {
      id: r.id,
      clientName: r.client_name || r.name,
      name: r.client_name || r.name,
      clientNumber: r.client_number,
      status: r.status || 'active',
      healthStatus: r.health_status,
      healthScore: r.health_score,
      assignedManager: r.assigned_manager,
      account_manager_id: r.account_manager_id,
      platform: r.platform,
      packageSize: r.package_size || r.posts_per_month,
      postsUsed: r.posts_used || 0,
      postsRemaining: r.posts_remaining,
      postsUsedByPlatform: r.posts_used_by_platform || {},
      postsRemainingByPlatform: r.posts_remaining_by_platform || {},
      platforms: r.platforms || {},
      instagramHandle: r.instagram_handle,
      facebookPage: r.facebook_page,
      logo: r.logo_url || r.logo,
      logo_url: r.logo_url || r.logo,
      profilePhoto: r.logo_url || r.logo,
      brokerage: r.brokerage,
      email: r.email,
      phone: r.phone,
      website: r.website,
      address: r.address,
      contractValue: r.contract_value || r.monthly_value,
      monthly_value: r.monthly_value,
      notes: r.notes,
      onboardedAt: r.onboarded_at,
      contractStart: r.contract_start,
      contractEnd: r.contract_end,
      additionalPlatforms: r.additional_platforms || [],
      createdAt: normalizeTs(r.created_at),
      updatedAt: normalizeTs(r.updated_at),
      ...(r.meta || {}),
    };
  }

  async getClients() {
    const key = 'clients:all';
    const cached = cacheGet(key);
    if (cached) return cached;
    try {
      const { data, error } = await supabase.from('clients').select('*').order('client_name', { nullsLast: true });
      if (error) throw error;
      return cacheSet(key, (data || []).map(r => this._mapClient(r)));
    } catch (error) { console.error('❌ Error getting clients:', error); return []; }
  }

  async getClientById(clientId) {
    try {
      const { data, error } = await supabase.from('clients').select('*').eq('id', clientId).maybeSingle();
      if (error) throw error;
      return data ? this._mapClient(data) : null;
    } catch { return null; }
  }

  async generateClientNumber() {
    try {
      const { data } = await supabase.from('clients').select('client_number').order('client_number', { ascending: false }).limit(1);
      const max = data?.[0]?.client_number || 0;
      return max + 1;
    } catch { return Date.now(); }
  }

  async assignMissingClientNumbers() {
    try {
      const { data } = await supabase.from('clients').select('id').is('client_number', null);
      let n = await this.generateClientNumber();
      for (const c of data || []) {
        await supabase.from('clients').update({ client_number: n++ }).eq('id', c.id);
      }
    } catch (error) { console.warn('assignMissingClientNumbers:', error); }
  }

  async assignKnownClientPhotos() { /* no-op */ }

  async addClient(clientData) {
    try {
      const clientNumber = await this.generateClientNumber();
      const { data, error } = await supabase.from('clients').insert([clean({
        client_name: clientData.clientName || clientData.name,
        name: clientData.clientName || clientData.name,
        client_number: clientNumber,
        status: clientData.status || 'active',
        health_status: clientData.healthStatus || 'monitor',
        assigned_manager: clientData.assignedManager || null,
        platform: clientData.platform || 'instagram',
        package_size: clientData.packageSize || null,
        posts_used: clientData.postsUsed || 0,
        posts_remaining: clientData.postsRemaining || clientData.packageSize || null,
        platforms: clientData.platforms || null,
        instagram_handle: clientData.instagramHandle || null,
        facebook_page: clientData.facebookPage || null,
        logo: clientData.profilePhoto || clientData.logo || null,
        logo_url: clientData.profilePhoto || clientData.logo || clientData.logo_url || null,
        brokerage: clientData.brokerage || null,
        email: clientData.email || null,
        phone: clientData.phone || null,
        website: clientData.website || null,
        notes: clientData.notes || null,
        onboarded_at: clientData.onboardedAt || null,
        contract_start: clientData.contractStart || null,
        contract_end: clientData.contractEnd || null,
        monthly_value: clientData.contractValue || clientData.monthly_value || null,
        meta: clean(clientData),
        created_at: ts(),
        updated_at: ts(),
      })]).select().single();
      if (error) throw error;
      await this.logClientAdded(data.id, data.client_name || data.name, clientData.assignedManager, clientData.addedBy || null);
      cacheInvalidate('clients:all');
      return data.id;
    } catch (error) { console.error('❌ Error adding client:', error); throw error; }
  }

  async updateClient(clientId, clientData) {
    try {
      const payload = clean({
        ...(clientData.clientName !== undefined ? { client_name: clientData.clientName, name: clientData.clientName } : {}),
        ...(clientData.name !== undefined ? { name: clientData.name, client_name: clientData.name } : {}),
        ...(clientData.status !== undefined ? { status: clientData.status } : {}),
        ...(clientData.healthStatus !== undefined ? { health_status: clientData.healthStatus } : {}),
        ...(clientData.healthScore !== undefined ? { health_score: clientData.healthScore } : {}),
        ...(clientData.assignedManager !== undefined ? { assigned_manager: clientData.assignedManager } : {}),
        ...(clientData.platform !== undefined ? { platform: clientData.platform } : {}),
        ...(clientData.packageSize !== undefined ? { package_size: clientData.packageSize } : {}),
        ...(clientData.postsUsed !== undefined ? { posts_used: clientData.postsUsed } : {}),
        ...(clientData.postsRemaining !== undefined ? { posts_remaining: clientData.postsRemaining } : {}),
        ...(clientData.postsUsedByPlatform !== undefined ? { posts_used_by_platform: clientData.postsUsedByPlatform } : {}),
        ...(clientData.postsRemainingByPlatform !== undefined ? { posts_remaining_by_platform: clientData.postsRemainingByPlatform } : {}),
        ...(clientData.platforms !== undefined ? { platforms: clientData.platforms } : {}),
        ...(clientData.instagramHandle !== undefined ? { instagram_handle: clientData.instagramHandle } : {}),
        ...(clientData.profilePhoto !== undefined ? { logo: clientData.profilePhoto, logo_url: clientData.profilePhoto } : clientData.logo !== undefined ? { logo: clientData.logo, logo_url: clientData.logo } : {}),
        ...(clientData.brokerage !== undefined ? { brokerage: clientData.brokerage } : {}),
        ...(clientData.email !== undefined ? { email: clientData.email } : {}),
        ...(clientData.phone !== undefined ? { phone: clientData.phone } : {}),
        ...(clientData.notes !== undefined ? { notes: clientData.notes } : {}),
        ...(clientData.contractValue !== undefined ? { monthly_value: clientData.contractValue } : {}),
        ...(clientData.contractStart !== undefined ? { contract_start: clientData.contractStart } : {}),
        ...(clientData.contractEnd !== undefined ? { contract_end: clientData.contractEnd } : {}),
        updated_at: ts(),
      });
      const { error } = await supabase.from('clients').update(payload).eq('id', clientId);
      if (error) throw error;
      cacheInvalidate('clients:all');
    } catch (error) { console.error('❌ Error updating client:', error); throw error; }
  }

  async mergeClientInto(keepId, mergeFromId) {
    try {
      await supabase.from('tasks').update({ client_id_legacy: keepId }).eq('client_id_legacy', mergeFromId);
      await supabase.from('instagram_reports').update({ client_id_legacy: keepId }).eq('client_id_legacy', mergeFromId);
      await supabase.from('clients').delete().eq('id', mergeFromId);
      cacheInvalidate('clients:all');
    } catch (error) { console.error('❌ Error merging clients:', error); throw error; }
  }

  async logClientMovement(event) {
    try {
      await supabase.from('client_movements').insert([{ client_id: event.clientId || '', client_name: event.clientName || null, event_type: event.type || event.eventType || 'unknown', performed_by: event.performedBy || null, data: event, created_at: ts() }]);
    } catch { /* non-fatal */ }
  }

  async logClientAdded(clientId, clientName, assignedManager, performedBy) {
    return this.logClientMovement({ type: 'client_added', clientId, clientName, assignedManager, performedBy });
  }

  async logContractValueIncrease(clientId, clientName, previousValue, newValue, performedBy) {
    return this.logClientMovement({ type: 'contract_value_increased', clientId, clientName, previousValue, newValue, performedBy });
  }

  async logSocialAccountsAdded(clientId, clientName, details, performedBy) {
    return this.logClientMovement({ type: 'social_accounts_added', clientId, clientName, details, performedBy });
  }

  async logClientReassignment(clientId, clientName, previousManager, newManager, performedBy) {
    return this.logClientMovement({ type: 'client_reassigned', clientId, clientName, previousManager, newManager, performedBy });
  }

  async getClientMovements(options = {}) {
    try {
      let q = supabase.from('client_movements').select('*').order('created_at', { ascending: false });
      if (options.clientId) q = q.eq('client_id', options.clientId);
      if (options.limit) q = q.limit(options.limit);
      const { data } = await q;
      return (data || []).map(r => ({ id: r.id, type: r.event_type, clientId: r.client_id, clientName: r.client_name, performedBy: r.performed_by, createdAt: normalizeTs(r.created_at), ...r.data }));
    } catch { return []; }
  }

  async getClientHealthSnapshots() {
    try {
      const { data } = await supabase.from('client_health_snapshots').select('*').order('created_at', { ascending: false });
      return (data || []).map(r => ({ id: r.id, clientId: r.client_id, status: r.status, score: r.score, summary: r.summary, factors: r.factors, createdAt: normalizeTs(r.created_at) }));
    } catch { return []; }
  }

  onClientsChange(callback) {
    return realtimeListener('clients', 'all', () => this.getClients(), callback);
  }

  // ===== CRM =====

  static CRM_DATA_DOC_ID = 'crm_main';
  static CRM_CUSTOM_LOCATIONS_DOC_ID = 'custom_locations';

  async getCrmData() {
    try {
      const { data } = await supabase.from('crm_data').select('*').limit(1).maybeSingle();
      return { warmLeads: data?.warm_leads || [], contactedClients: data?.contacted_clients || [], coldLeads: data?.cold_leads || [] };
    } catch { return { warmLeads: [], contactedClients: [], coldLeads: [] }; }
  }

  async setCrmData(payload) {
    try {
      const { data: existing } = await supabase.from('crm_data').select('id').limit(1).maybeSingle();
      const row = { warm_leads: payload.warmLeads || [], contacted_clients: payload.contactedClients || [], cold_leads: payload.coldLeads || [], last_sync_time: new Date().toISOString(), updated_at: ts() };
      if (existing) {
        await supabase.from('crm_data').update(row).eq('id', existing.id);
      } else {
        await supabase.from('crm_data').insert([row]);
      }
    } catch (error) { console.error('setCrmData error:', error); }
  }

  onCrmDataChange(callback) {
    return realtimeListener('crm_data', 'all', () => this.getCrmData(), callback);
  }

  async getCustomLocations() {
    try {
      const { data } = await supabase.from('custom_locations').select('*').order('created_at');
      return (data || []).map(r => ({ value: r.value, createdBy: r.created_by, createdAt: normalizeTs(r.created_at) }));
    } catch { return []; }
  }

  async addCustomLocation(value, createdBy) {
    try {
      const { error } = await supabase.from('custom_locations').upsert({ value: value.trim(), created_by: createdBy, created_at: ts() }, { onConflict: 'value' });
      if (error) throw error;
    } catch (error) { throw error; }
  }

  async removeCustomLocation(value) {
    try {
      const { error } = await supabase.from('custom_locations').delete().eq('value', value);
      if (error) throw error;
    } catch (error) { throw error; }
  }

  // ===== SUPPORT TICKETS =====

  _mapTicket(r) {
    return { id: r.id, userEmail: r.user_email, title: r.title, description: r.description || r.message, category: r.category, priority: r.priority, status: r.status, message: r.message, resolutionNotes: r.resolution_notes, assignedTo: r.assigned_to_id, resolvedBy: r.resolved_by_id, resolvedAt: normalizeTs(r.resolved_at), createdAt: normalizeTs(r.created_at), ...(r.meta || {}) };
  }

  async getSupportTicketsByUser(userEmail) {
    try {
      const { data } = await supabase.from('support_tickets').select('*').eq('user_email', userEmail).order('created_at', { ascending: false });
      return (data || []).map(r => this._mapTicket(r));
    } catch { return []; }
  }

  async getAllSupportTickets() {
    try {
      const { data } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false });
      return (data || []).map(r => this._mapTicket(r));
    } catch { return []; }
  }

  async submitSupportTicket(ticketData) {
    try {
      const { data, error } = await supabase.from('support_tickets').insert([clean({ title: ticketData.title, description: ticketData.description || ticketData.message, message: ticketData.message || ticketData.description, category: ticketData.category || 'general', priority: ticketData.priority || 'medium', status: 'open', user_email: ticketData.userEmail, meta: ticketData, created_at: ts() })]).select().single();
      if (error) throw error;
      return data.id;
    } catch (error) { throw error; }
  }

  async updateSupportTicketStatus(ticketId, status, resolvedBy, notes = '') {
    try {
      const { error } = await supabase.from('support_tickets').update(clean({ status, resolution_notes: notes, resolved_at: status === 'resolved' ? ts() : null, updated_at: ts() })).eq('id', ticketId);
      if (error) throw error;
    } catch (error) { throw error; }
  }

  onSupportTicketsChange(callback, userEmail = null) {
    const fetcher = () => userEmail ? this.getSupportTicketsByUser(userEmail) : this.getAllSupportTickets();
    return realtimeListener('support_tickets', userEmail || 'all', fetcher, callback);
  }

  async addTicketComment(ticketId, commentData) {
    try {
      const { data, error } = await supabase.from('ticket_comments').insert([{ ticket_id: ticketId, body: commentData.text || commentData.body || commentData.message, created_at: ts() }]).select().single();
      if (error) throw error;
      return data.id;
    } catch (error) { throw error; }
  }

  onTicketCommentsChange(ticketId, callback) {
    return realtimeListener('ticket_comments', ticketId, async () => {
      const { data } = await supabase.from('ticket_comments').select('*').eq('ticket_id', ticketId).order('created_at');
      return (data || []).map(r => ({ id: r.id, ticketId: r.ticket_id, text: r.body, body: r.body, createdAt: normalizeTs(r.created_at) }));
    }, callback);
  }

  // ===== NOTIFICATIONS =====

  async createNotification(notificationData) {
    if (!notificationData?.userEmail) return { success: false };
    try {
      const existing = await this.getNotifications(notificationData.userEmail);
      const dup = existing.find(n => n.type === notificationData.type && !n.read);
      if (dup) {
        const { error } = await supabase.from('notifications').update({ count: (dup.count || 1) + 1, title: notificationData.title || dup.title, message: notificationData.message || dup.message, link: notificationData.link !== undefined ? notificationData.link : dup.link, updated_at: ts() }).eq('id', dup.id);
        if (error) throw error;
        return { success: true, id: dup.id };
      }
      const { data, error } = await supabase.from('notifications').insert([clean({ user_email: notificationData.userEmail, type: notificationData.type, title: notificationData.title, body: notificationData.message, message: notificationData.message, link: notificationData.link || null, read: false, count: 1, task_request_id: notificationData.taskRequestId || null, created_at: ts(), updated_at: ts() })]).select().single();
      if (error) throw error;
      return { success: true, id: data.id };
    } catch (error) { console.error('❌ Error creating notification:', error); throw error; }
  }

  async getNotifications(userEmail) {
    try {
      const { data } = await supabase.from('notifications').select('*').eq('user_email', userEmail).order('created_at', { ascending: false });
      return (data || []).map(r => ({ id: r.id, userEmail: r.user_email, type: r.type, title: r.title, message: r.message || r.body, body: r.body || r.message, link: r.link, read: r.read, count: r.count || 1, taskRequestId: r.task_request_id, createdAt: normalizeTs(r.created_at), updatedAt: normalizeTs(r.updated_at) }));
    } catch { return []; }
  }

  onNotificationsChange(userEmail, callback) {
    return realtimeListener('notifications', userEmail, () => this.getNotifications(userEmail), callback);
  }

  async markNotificationRead(notificationId) {
    try {
      const { error } = await supabase.from('notifications').update({ read: true, updated_at: ts() }).eq('id', notificationId);
      if (error) throw error;
    } catch (error) { throw error; }
  }

  async markAllNotificationsRead(userEmail) {
    try {
      const { error } = await supabase.from('notifications').update({ read: true, updated_at: ts() }).eq('user_email', userEmail).eq('read', false);
      if (error) throw error;
    } catch (error) { throw error; }
  }

  async deleteNotification(notificationId) {
    try {
      const { error } = await supabase.from('notifications').delete().eq('id', notificationId);
      if (error) throw error;
    } catch (error) { throw error; }
  }

  async deleteWorkspaceMentionNotifications(userEmail, workspaceId) {
    try {
      const list = await this.getNotifications(userEmail);
      const toDelete = list.filter(n => n.type === 'workspace_mention' && (n.link || '').includes(workspaceId));
      for (const n of toDelete) await this.deleteNotification(n.id);
    } catch { /* non-fatal */ }
  }

  // ===== CONTENT CALENDAR =====

  _normalizeContentItem(row) {
    const scheduled = row.scheduled_date;
    const scheduledDate = typeof scheduled === 'string' ? new Date(scheduled + 'T12:00:00') : (scheduled ? new Date(scheduled) : new Date());
    const media = Array.isArray(row.media) ? row.media : [];
    return { id: row.id, userEmail: row.user_email, calendarId: row.calendar_id, title: row.title || '', description: row.description || '', platform: row.platform || 'instagram', contentType: row.content_type || row.contentType || 'image', scheduledDate, status: row.status || 'draft', tags: row.tags || [], media, createdAt: normalizeTs(row.created_at) };
  }

  async getContentCalendars(userEmail) {
    if (!userEmail) return [];
    try {
      const { data } = await supabase.from('content_calendars').select('*').eq('user_email', userEmail);
      return (data || []).map(r => ({ id: r.id, userEmail: r.user_email, name: r.name || 'Calendar', description: r.description, color: r.color, createdAt: normalizeTs(r.created_at) }));
    } catch { return []; }
  }

  async getContentItems(userEmail, options = {}) {
    if (!userEmail) return [];
    try {
      let q = supabase.from('content_items').select('*').eq('user_email', userEmail).order('scheduled_date', { ascending: true });
      if (options.calendarId) q = q.eq('calendar_id', options.calendarId);
      if (options.status) q = q.eq('status', options.status);
      const { data } = await q;
      return (data || []).map(r => this._normalizeContentItem(r));
    } catch { return []; }
  }

  async getContentItem(id) {
    if (!id) return null;
    try {
      const { data } = await supabase.from('content_items').select('*').eq('id', id).maybeSingle();
      return data ? this._normalizeContentItem(data) : null;
    } catch { return null; }
  }

  async createContentCalendar(data) {
    try {
      const session = await supabase.auth.getSession();
      const userId = session?.data?.session?.user?.id || null;
      const { data: row, error } = await supabase.from('content_calendars').insert([{ user_id: userId, user_email: data.userEmail, name: data.name || 'Calendar', description: data.description || null, color: data.color || null, created_at: ts() }]).select().single();
      if (error) throw error;
      return { id: row.id, userEmail: row.user_email, name: row.name, description: row.description, color: row.color, createdAt: normalizeTs(row.created_at) };
    } catch (error) { throw error; }
  }

  async updateContentCalendar(id, data) {
    try {
      const { error } = await supabase.from('content_calendars').update(clean({ name: data.name, description: data.description, color: data.color, updated_at: ts() })).eq('id', id);
      if (error) throw error;
    } catch (error) { throw error; }
  }

  async createContentItem(data) {
    try {
      const scheduledDate = data.scheduledDate instanceof Date ? data.scheduledDate.toISOString().split('T')[0] : (data.scheduledDate ? String(data.scheduledDate).split('T')[0] : null);
      const { data: row, error } = await supabase.from('content_items').insert([clean({ user_email: data.userEmail, calendar_id: data.calendarId || null, title: data.title || '', description: data.description || null, platform: data.platform || 'instagram', content_type: data.contentType || 'image', scheduled_date: scheduledDate, status: data.status || 'draft', tags: data.tags || [], media: data.media || [], image_url: data.imageUrl || null, video_url: data.videoUrl || null, created_at: ts(), updated_at: ts() })]).select().single();
      if (error) throw error;
      return this._normalizeContentItem(row);
    } catch (error) { throw error; }
  }

  async updateContentItem(id, data) {
    try {
      const scheduledDate = data.scheduledDate instanceof Date ? data.scheduledDate.toISOString().split('T')[0] : (data.scheduledDate ? String(data.scheduledDate).split('T')[0] : undefined);
      const { error } = await supabase.from('content_items').update(clean({ title: data.title, description: data.description, platform: data.platform, content_type: data.contentType, scheduled_date: scheduledDate, status: data.status, tags: data.tags, media: data.media, image_url: data.imageUrl, video_url: data.videoUrl, updated_at: ts() })).eq('id', id);
      if (error) throw error;
    } catch (error) { throw error; }
  }

  async migrateContentCalendarFromLocalStorage(userEmail, localStorageItems, localStorageCalendars) {
    console.log('ℹ️ migrateContentCalendarFromLocalStorage: no-op in Supabase mode');
  }

  // ===== TASK REQUESTS =====

  async createTaskRequest(requestData) {
    try {
      const { data, error } = await supabase.from('task_requests').insert([clean({ from_user_email: requestData.fromUserEmail, to_user_email: requestData.toUserEmail, title: requestData.title, description: requestData.description, priority: requestData.priority || 'medium', due_date: requestData.dueDate || null, due_time: requestData.dueTime || null, status: 'pending', created_at: ts(), updated_at: ts() })]).select().single();
      if (error) throw error;
      return data.id;
    } catch (error) { throw error; }
  }

  async getTaskRequests(userEmail) {
    try {
      const { data } = await supabase.from('task_requests').select('*').eq('to_user_email', userEmail).order('created_at', { ascending: false });
      return (data || []).map(r => ({ id: r.id, fromUserEmail: r.from_user_email, toUserEmail: r.to_user_email, title: r.title, description: r.description, priority: r.priority, dueDate: r.due_date, dueTime: r.due_time, status: r.status, rejectionReason: r.rejection_reason, taskId: r.task_id, createdAt: normalizeTs(r.created_at) }));
    } catch { return []; }
  }

  onTaskRequestsChange(userEmail, callback) {
    return realtimeListener('task_requests', userEmail, () => this.getTaskRequests(userEmail), callback);
  }

  async acceptTaskRequest(requestId, requestData) {
    try {
      const taskId = await this.addTask({ ...requestData, assigned_to: requestData.toUserEmail, assigned_by: requestData.fromUserEmail, taskRequestId: requestId, status: 'todo' });
      await supabase.from('task_requests').update({ status: 'accepted', task_id: taskId, updated_at: ts() }).eq('id', requestId);
      await this.createNotification({ userEmail: requestData.fromUserEmail, type: 'task_request_accepted', title: 'Task request accepted', message: `Your request was accepted: ${requestData.title}`, link: '/tasks?tab=outbox', taskRequestId: requestId, read: false });
      return { success: true, taskId };
    } catch (error) { throw error; }
  }

  async rejectTaskRequest(requestId, requestData, rejectionReason = '') {
    try {
      await supabase.from('task_requests').update({ status: 'rejected', rejection_reason: rejectionReason, updated_at: ts() }).eq('id', requestId);
      await this.createNotification({ userEmail: requestData.fromUserEmail, type: 'task_request_rejected', title: 'Task request declined', message: `Your request was declined: ${requestData.title}${rejectionReason ? ` — ${rejectionReason}` : ''}`, link: '/tasks?tab=outbox', taskRequestId: requestId, read: false });
      return { success: true };
    } catch (error) { throw error; }
  }

  onSentTaskRequestsChange(userEmail, callback) {
    return realtimeListener('task_requests', `sent-${userEmail}`, () => this.getSentTaskRequests(userEmail), callback);
  }

  // ===== TASK TEMPLATES =====

  async getTaskTemplates(userEmail) {
    try {
      const { data } = await supabase.from('task_templates').select('*').or(`user_email.eq.${userEmail},is_default.eq.true`).order('created_at');
      return (data || []).map(r => ({ id: r.id, title: r.title, description: r.description, priority: r.priority, source: r.source, userEmail: r.user_email, isDefault: r.is_default, sharedWith: r.shared_with || [], createdAt: normalizeTs(r.created_at), ...(r.meta || {}) }));
    } catch { return []; }
  }

  async getTaskTemplate(templateId) {
    try {
      const { data } = await supabase.from('task_templates').select('*').eq('id', templateId).maybeSingle();
      return data ? { id: data.id, title: data.title, description: data.description, priority: data.priority, source: data.source, userEmail: data.user_email, isDefault: data.is_default, sharedWith: data.shared_with || [], createdAt: normalizeTs(data.created_at), ...(data.meta || {}) } : null;
    } catch { return null; }
  }

  async createTaskTemplate(templateData) {
    try {
      const { data, error } = await supabase.from('task_templates').insert([clean({ title: templateData.title, description: templateData.description, priority: templateData.priority || 2, source: templateData.source || 'task', user_email: templateData.userEmail, is_default: templateData.isDefault || false, shared_with: templateData.sharedWith || [], meta: templateData, created_at: ts() })]).select().single();
      if (error) throw error;
      return data.id;
    } catch (error) { throw error; }
  }

  async updateTaskTemplate(templateId, updates) {
    try {
      const { error } = await supabase.from('task_templates').update(clean({ title: updates.title, description: updates.description, priority: updates.priority, source: updates.source, updated_at: ts() })).eq('id', templateId);
      if (error) throw error;
    } catch (error) { throw error; }
  }

  onTaskTemplatesChange(userEmail, callback) {
    return realtimeListener('task_templates', userEmail, () => this.getTaskTemplates(userEmail), callback);
  }

  async initializeDefaultTemplates(defaultTemplates, userEmail) {
    for (const tmpl of defaultTemplates || []) {
      try { await this.createTaskTemplate({ ...tmpl, userEmail, isDefault: true }); } catch { /* skip duplicates */ }
    }
  }

  async shareTaskTemplateWith(templateId, sharedWithEmail, ownerEmail) {
    try {
      const { data } = await supabase.from('task_templates').select('shared_with').eq('id', templateId).maybeSingle();
      const sharedWith = [...new Set([...(data?.shared_with || []), sharedWithEmail])];
      await supabase.from('task_templates').update({ shared_with: sharedWith, updated_at: ts() }).eq('id', templateId);
    } catch (error) { throw error; }
  }

  // ===== SMART FILTERS =====

  async getSmartFilters(userEmail) {
    try {
      const { data } = await supabase.from('smart_filters').select('*').eq('user_email', userEmail).order('created_at');
      return (data || []).map(r => ({ id: r.id, userEmail: r.user_email, name: r.name, filters: r.filters || {}, createdAt: normalizeTs(r.created_at) }));
    } catch { return []; }
  }

  async createSmartFilter(filterData) {
    try {
      const { data, error } = await supabase.from('smart_filters').insert([{ user_email: filterData.userEmail, name: filterData.name, filters: filterData.filters || {}, created_at: ts() }]).select().single();
      if (error) throw error;
      return data.id;
    } catch (error) { throw error; }
  }

  async updateSmartFilter(filterId, updates) {
    try {
      const { error } = await supabase.from('smart_filters').update(clean({ name: updates.name, filters: updates.filters, updated_at: ts() })).eq('id', filterId);
      if (error) throw error;
    } catch (error) { throw error; }
  }

  // ===== CLIENT MESSAGES =====

  async createMessage(messageData) {
    try {
      const { data, error } = await supabase.from('client_messages').insert([{ client_id: messageData.clientId, from_email: messageData.fromEmail || messageData.userEmail, content: messageData.content || messageData.text, type: messageData.type || 'note', meta: messageData, created_at: ts() }]).select().single();
      if (error) throw error;
      return data.id;
    } catch (error) { throw error; }
  }

  async getMessagesByClient(clientId) {
    try {
      const { data } = await supabase.from('client_messages').select('*').eq('client_id', clientId).order('created_at', { ascending: true });
      return (data || []).map(r => ({ id: r.id, clientId: r.client_id, fromEmail: r.from_email, content: r.content, type: r.type, createdAt: normalizeTs(r.created_at), ...r.meta }));
    } catch { return []; }
  }

  onMessagesChange(clientId, callback) {
    return realtimeListener('client_messages', clientId, () => this.getMessagesByClient(clientId), callback);
  }

  async getReportsByClient(clientId) {
    try {
      const { data } = await supabase.from('client_reports').select('*').eq('client_id', clientId).order('created_at', { ascending: false });
      return (data || []).map(r => ({ id: r.id, clientId: r.client_id, month: r.month, createdBy: r.created_by, createdAt: normalizeTs(r.created_at), ...r.data }));
    } catch { return []; }
  }

  async createMonthlyReport(reportData) {
    try {
      const { data, error } = await supabase.from('client_reports').insert([{ client_id: reportData.clientId, month: reportData.month, data: reportData, created_by: reportData.createdBy || null, created_at: ts() }]).select().single();
      if (error) throw error;
      return data.id;
    } catch (error) { throw error; }
  }

  // ===== PENDING CLIENTS =====

  async addPendingClient(clientData) {
    try {
      const { data, error } = await supabase.from('pending_clients').insert([{ name: clientData.name || clientData.clientName, email: clientData.email || null, phone: clientData.phone || null, brokerage: clientData.brokerage || null, notes: clientData.notes || null, submitted_by: clientData.submittedBy || null, status: 'pending', meta: clientData, created_at: ts() }]).select().single();
      if (error) throw error;
      return data.id;
    } catch (error) { throw error; }
  }

  async getPendingClients() {
    try {
      const { data } = await supabase.from('pending_clients').select('*').eq('status', 'pending').order('created_at', { ascending: false });
      return (data || []).map(r => ({ id: r.id, name: r.name, email: r.email, phone: r.phone, brokerage: r.brokerage, notes: r.notes, submittedBy: r.submitted_by, status: r.status, createdAt: normalizeTs(r.created_at), ...r.meta }));
    } catch { return []; }
  }

  async removePendingClient(clientId) {
    try {
      const { error } = await supabase.from('pending_clients').delete().eq('id', clientId);
      if (error) throw error;
    } catch (error) { throw error; }
  }

  onPendingClientsChange(callback) {
    return realtimeListener('pending_clients', 'all', () => this.getPendingClients(), callback);
  }

  // ===== CLIENT CONTRACTS =====

  async getContractsByClient(clientId) {
    try {
      const { data } = await supabase.from('client_contracts').select('*').eq('client_id', clientId).order('created_at', { ascending: false });
      return (data || []).map(r => ({ id: r.id, clientId: r.client_id, title: r.title, type: r.type, status: r.status, startDate: r.start_date, endDate: r.end_date, value: r.value, fileUrl: r.file_url, notes: r.notes, signedBy: r.signed_by, signedAt: normalizeTs(r.signed_at), createdAt: normalizeTs(r.created_at) }));
    } catch { return []; }
  }

  async getContractById(contractId) {
    try {
      const { data } = await supabase.from('client_contracts').select('*').eq('id', contractId).maybeSingle();
      return data ? { id: data.id, clientId: data.client_id, title: data.title, type: data.type, status: data.status, startDate: data.start_date, value: data.value, fileUrl: data.file_url, notes: data.notes, createdAt: normalizeTs(data.created_at) } : null;
    } catch { return null; }
  }

  async addContract(contractData) {
    try {
      const { data, error } = await supabase.from('client_contracts').insert([clean({ client_id: contractData.clientId, title: contractData.title, type: contractData.type, status: contractData.status || 'active', start_date: contractData.startDate || null, end_date: contractData.endDate || null, value: contractData.value || null, file_url: contractData.fileUrl || null, notes: contractData.notes || null, created_at: ts() })]).select().single();
      if (error) throw error;
      return data.id;
    } catch (error) { throw error; }
  }

  async updateContract(contractId, updates) {
    try {
      const { error } = await supabase.from('client_contracts').update(clean({ title: updates.title, type: updates.type, status: updates.status, start_date: updates.startDate, end_date: updates.endDate, value: updates.value, file_url: updates.fileUrl, notes: updates.notes, updated_at: ts() })).eq('id', contractId);
      if (error) throw error;
    } catch (error) { throw error; }
  }

  // ===== INSTAGRAM REPORTS =====

  generatePublicLinkId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  _getCurrentUserId() {
    return supabase.auth.getUser().then(({ data }) => data?.user?.id);
  }

  _getCurrentUserEmail() {
    return supabase.auth.getUser().then(({ data }) => data?.user?.email);
  }

  async createInstagramReport(reportData) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be signed in to create an Instagram report');
      const publicLinkId = this.generatePublicLinkId();
      const startDate = reportData.startDate ? (reportData.startDate instanceof Date ? reportData.startDate : new Date(reportData.startDate)) : null;
      const endDate = reportData.endDate ? (reportData.endDate instanceof Date ? reportData.endDate : new Date(reportData.endDate)) : null;
      const { data, error } = await supabase.from('instagram_reports').insert([{
        user_id_legacy: user.id, created_by_id: user.id, user_email: user.email, client_id: reportData.clientId || null, client_id_legacy: reportData.clientId || null, client_name: reportData.clientName || '', title: reportData.title || '', date_range: reportData.dateRange || '', notes: reportData.notes || '', post_links: reportData.postLinks || [], metrics: reportData.metrics || null, report_type: reportData.reportType || null, source_report_ids: reportData.sourceReportIds || null, quarterly_breakdown: reportData.quarterlyBreakdown || null, public_link_id: publicLinkId, archived: false, year: startDate ? startDate.getFullYear() : null, month: startDate ? startDate.getMonth() + 1 : null, period_start: startDate ? startDate.toISOString().split('T')[0] : null, period_end: endDate ? endDate.toISOString().split('T')[0] : null, created_at: ts(), updated_at: ts()
      }]).select().single();
      if (error) throw error;
      cacheInvalidate('instagram_reports:');
      return { success: true, id: data.id, publicLinkId };
    } catch (error) { console.error('❌ Error creating Instagram report:', error); throw error; }
  }

  _mapReport(r) {
    // Use client_id (UUID) first, fall back to client_id_legacy (Firebase ID)
    const clientId = r.client_id || r.client_id_legacy || null;
    const userId = r.created_by_id || r.user_id_legacy || null;
    return { id: r.id, userId, userEmail: r.user_email, clientId, clientName: r.client_name, title: r.title, dateRange: r.date_range, notes: r.notes, postLinks: r.post_links || [], metrics: r.metrics || r.raw_ocr_data, reportType: r.report_type, sourceReportIds: r.source_report_ids, quarterlyBreakdown: r.quarterly_breakdown, publicLinkId: r.public_link_id, archived: r.archived || false, year: r.year, month: r.month, startDate: r.period_start, endDate: r.period_end, createdAt: normalizeTs(r.created_at), updatedAt: normalizeTs(r.updated_at) };
  }

  async getInstagramReports() {
    const key = 'instagram_reports:mine';
    const cached = cacheGet(key);
    if (cached) return cached;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      // Match by user_id_legacy OR created_by_id OR user_email (covers both
      // migrated reports where user_id_legacy may be null, and new reports)
      const { data } = await supabase.from('instagram_reports').select('*')
        .eq('archived', false)
        .or(`user_id_legacy.eq.${user.id},created_by_id.eq.${user.id},user_email.eq.${user.email}`)
        .order('created_at', { ascending: false });
      return cacheSet(key, (data || []).map(r => this._mapReport(r)));
    } catch { return []; }
  }

  async getInstagramReportsByClient(clientId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !clientId) return [];
      // Match by client_id (UUID) or client_id_legacy (Firebase ID)
      const { data } = await supabase.from('instagram_reports').select('*')
        .eq('archived', false)
        .or(`client_id.eq.${clientId},client_id_legacy.eq.${clientId}`)
        .order('created_at', { ascending: false });
      return (data || []).map(r => this._mapReport(r));
    } catch { return []; }
  }

  async getClientInstagramReportHistory(clientId, maxReports = 6) {
    try {
      const { data } = await supabase.from('instagram_reports').select('*')
        .eq('archived', false)
        .or(`client_id.eq.${clientId},client_id_legacy.eq.${clientId}`)
        .order('created_at', { ascending: false })
        .limit(maxReports);
      return (data || []).map(r => this._mapReport(r));
    } catch { return []; }
  }

  async getInstagramReportById(reportId) {
    try {
      const { data } = await supabase.from('instagram_reports').select('*').eq('id', reportId).maybeSingle();
      return data ? this._mapReport(data) : null;
    } catch { return null; }
  }

  async getInstagramReportByPublicLink(publicLinkId) {
    try {
      const { data } = await supabase.from('instagram_reports').select('*').eq('public_link_id', publicLinkId).maybeSingle();
      return data ? this._mapReport(data) : null;
    } catch { return null; }
  }

  async updateInstagramReport(reportId, updates) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be signed in');
      const processed = { ...updates, updated_at: ts() };
      if ('startDate' in updates && updates.startDate) {
        const d = updates.startDate instanceof Date ? updates.startDate : new Date(updates.startDate);
        processed.period_start = d.toISOString().split('T')[0];
        processed.year = d.getFullYear();
        processed.month = d.getMonth() + 1;
        delete processed.startDate;
      }
      if ('endDate' in updates && updates.endDate) {
        const d = updates.endDate instanceof Date ? updates.endDate : new Date(updates.endDate);
        processed.period_end = d.toISOString().split('T')[0];
        delete processed.endDate;
      }
      if (updates.postLinks !== undefined) { processed.post_links = updates.postLinks; delete processed.postLinks; }
      if (updates.reportType !== undefined) { processed.report_type = updates.reportType; delete processed.reportType; }
      const { error } = await supabase.from('instagram_reports').update(clean(processed)).eq('id', reportId);
      if (error) throw error;
      cacheInvalidate('instagram_reports:');
      return { success: true };
    } catch (error) { throw error; }
  }

  async deleteInstagramReport(reportId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be signed in');
      const { error } = await supabase.from('instagram_reports').update({ archived: true, archived_at: ts(), archived_by: user.email, updated_at: ts() }).eq('id', reportId);
      if (error) throw error;
      cacheInvalidate('instagram_reports:');
      return { success: true };
    } catch (error) { throw error; }
  }

  onInstagramReportsChange(callback, { loadAll = false, userId = null, clientIds = [], archived = false } = {}) {
    const fetcher = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const uid = userId || user?.id;
      const email = user?.email;
      let q = supabase.from('instagram_reports').select('*').order('created_at', { ascending: false });
      if (archived) {
        q = q.eq('archived', true);
      } else {
        q = q.eq('archived', false);
        // For non-loadAll, match by any user identifier (covers migrated + new reports)
        if (!loadAll && uid) {
          q = q.or(`user_id_legacy.eq.${uid},created_by_id.eq.${uid}${email ? `,user_email.eq.${email}` : ''}`);
        }
      }
      const { data } = await q;
      let results = (data || []).map(r => this._mapReport(r));
      if (!loadAll && clientIds?.length > 0) {
        results = results.filter(r => r.userId === uid || clientIds.includes(r.clientId));
      }
      return results;
    };
    return realtimeListener('instagram_reports', `${loadAll}-${archived}`, fetcher, callback);
  }

  // ===== DASHBOARD PREFERENCES =====

  async getDashboardPreferences(uid) {
    if (!uid) return null;
    try {
      // uid may be a Firebase UID (string) or Supabase UUID — try both email and id
      const { data } = await supabase.from('user_dashboard_preferences').select('*').eq('user_id', uid).maybeSingle();
      return data ? data : null;
    } catch { return null; }
  }

  async setDashboardPreferences(uid, prefs) {
    if (!uid) return;
    try {
      await supabase.from('user_dashboard_preferences').upsert({ user_id: uid, ...prefs, updated_at: ts() }, { onConflict: 'user_id' });
    } catch (error) { throw error; }
  }

  // ===== PAGE PERMISSIONS =====

  _mapPermissionsFromDoc(userData) {
    if (!userData) return { pages: [], features: [], capabilities: [], adminPermissions: false, version: 0 };
    const pages = Array.isArray(userData.pagePermissions) ? userData.pagePermissions
      : Array.isArray(userData.page_permissions) ? userData.page_permissions : [];
    const features = Array.isArray(userData.featurePermissions) ? userData.featurePermissions
      : Array.isArray(userData.feature_permissions) ? userData.feature_permissions : [];
    const customs = Array.isArray(userData.customPermissions) ? userData.customPermissions
      : Array.isArray(userData.custom_permissions) ? userData.custom_permissions : [];
    const capabilities = [...new Set([...features, ...customs])];
    return { pages, features, capabilities, adminPermissions: false, version: userData.permissionsVersion || userData.permissions_version || 0 };
  }

  /** Same shape as getUserPermissions() without extra network calls — use rows from getApprovedUsers(). */
  getPermissionsFromUserRecord(user) {
    return this._mapPermissionsFromDoc(user);
  }

  getUserPermissions(userEmail, options = {}) {
    const { subscribe: wantSubscribe, onUpdate } = options;
    const normalizedEmail = (userEmail || '').toLowerCase().trim();
    const oneShot = async () => {
      const user = await this.getApprovedUserByEmail(normalizedEmail);
      return this._mapPermissionsFromDoc(user);
    };
    if (wantSubscribe && onUpdate) {
      let unsub;
      oneShot().then(result => { if (onUpdate) onUpdate(result); }).catch(() => onUpdate({ pages: [], features: [] }));
      unsub = this.onApprovedUserChange(normalizedEmail, (user) => { if (onUpdate) onUpdate(this._mapPermissionsFromDoc(user)); });
      return { unsubscribe: unsub };
    }
    return oneShot();
  }

  async setUserPagePermissions(userEmail, pageIds, { changedBy = null } = {}) {
    // Fetch old permissions for audit trail
    const oldUser = await this.getApprovedUserByEmail(userEmail);
    const oldPages = oldUser?.pagePermissions || [];
    await this.updateApprovedUser(userEmail, { pagePermissions: pageIds });
    // Log the change
    this._logPermissionChange({
      targetEmail: userEmail,
      changedBy,
      changeType: 'page_permissions',
      oldValue: oldPages,
      newValue: pageIds,
    }).catch(() => {});
  }

  async setUserFeaturePermissions(userEmail, featureIds, { changedBy = null } = {}) {
    const oldUser = await this.getApprovedUserByEmail(userEmail);
    const oldFeatures = oldUser?.featurePermissions || [];
    await this.updateApprovedUser(userEmail, { featurePermissions: featureIds });
    this._logPermissionChange({
      targetEmail: userEmail,
      changedBy,
      changeType: 'feature_permissions',
      oldValue: oldFeatures,
      newValue: featureIds,
    }).catch(() => {});
  }

  async setUserFullPermissions(userEmail, { pages = [], features = [] } = {}, { changedBy = null } = {}) {
    const oldUser = await this.getApprovedUserByEmail(userEmail);
    const oldPages = oldUser?.pagePermissions || [];
    const oldFeatures = oldUser?.featurePermissions || [];
    await this.updateApprovedUser(userEmail, { pagePermissions: pages, featurePermissions: features });
    this._logPermissionChange({
      targetEmail: userEmail,
      changedBy,
      changeType: 'full_permissions',
      oldValue: { pages: oldPages, features: oldFeatures },
      newValue: { pages, features },
    }).catch(() => {});
  }

  /**
   * Log a permission change to the permission_audit_log table.
   * Fails silently if the table doesn't exist yet.
   */
  async _logPermissionChange({ targetEmail, changedBy, changeType, oldValue, newValue }) {
    try {
      const added = Array.isArray(newValue) && Array.isArray(oldValue)
        ? newValue.filter(p => !oldValue.includes(p))
        : [];
      const removed = Array.isArray(newValue) && Array.isArray(oldValue)
        ? oldValue.filter(p => !newValue.includes(p))
        : [];
      await supabase.from('permission_audit_log').insert([{
        target_email: (targetEmail || '').toLowerCase().trim(),
        changed_by: (changedBy || 'system').toLowerCase().trim(),
        change_type: changeType,
        old_value: oldValue,
        new_value: newValue,
        added,
        removed,
        created_at: new Date().toISOString(),
      }]).then(() => {}, () => {}); // Supabase thenable, not a Promise
    } catch (err) {
      console.warn('Permission audit log write failed (table may not exist yet):', err.message);
    }
  }

  onUserPagePermissionsChange(userEmail, callback) {
    return this.onApprovedUserChange(userEmail, (user) => callback(this._mapPermissionsFromDoc(user)));
  }

  // ===== ERROR REPORTS =====

  async submitErrorReport(reportData) {
    try {
      await supabase.auth.getUser().catch(() => ({})); // capture user context if available (unused for now)
      const { data, error } = await supabase.from('error_reports').insert([{ error_message: reportData.errorMessage || reportData.message, error_stack: reportData.errorStack || reportData.stack, url: reportData.url || (typeof window !== 'undefined' ? window.location.href : null), console_logs: reportData.consoleLogs ? JSON.stringify(reportData.consoleLogs) : null, created_at: ts() }]).select().single();
      if (error) throw error;
      return { success: true, id: data.id };
    } catch (error) { return { success: false, error: error.message }; }
  }

  async getErrorReports() {
    try {
      const { data } = await supabase.from('error_reports').select('*').order('created_at', { ascending: false });
      return (data || []).map(r => ({ id: r.id, errorMessage: r.error_message, errorStack: r.error_stack, url: r.url, consoleLogs: r.console_logs, createdAt: normalizeTs(r.created_at) }));
    } catch { return []; }
  }

  async resolveErrorReport(reportId, notes = '') {
    try {
      const { error } = await supabase.from('error_reports').delete().eq('id', reportId);
      if (error) throw error;
    } catch (error) { throw error; }
  }

  // ===== ANNOUNCEMENTS =====

  async getAnnouncements() {
    try {
      const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
      return (data || []).map(r => ({ id: r.id, title: r.title, body: r.body, type: r.type, priority: r.priority, targetRoles: r.target_roles || [], isActive: r.is_active, link: r.link, expiresAt: normalizeTs(r.expires_at), createdAt: normalizeTs(r.created_at) }));
    } catch { return []; }
  }

  async getActiveAnnouncements() {
    try {
      const { data } = await supabase.from('announcements').select('*').eq('is_active', true).order('created_at', { ascending: false });
      return (data || []).map(r => ({ id: r.id, title: r.title, body: r.body, type: r.type, priority: r.priority, targetRoles: r.target_roles || [], isActive: r.is_active, link: r.link, expiresAt: normalizeTs(r.expires_at), createdAt: normalizeTs(r.created_at) }));
    } catch { return []; }
  }

  onActiveAnnouncementsChange(callback) {
    return realtimeListener('announcements', 'active', () => this.getActiveAnnouncements(), callback);
  }

  async createAnnouncement(data) {
    try {
      const { data: row, error } = await supabase.from('announcements').insert([{ title: data.title, body: data.body || data.message, type: data.type || 'general', priority: data.priority || 'normal', target_roles: data.targetRoles || [], is_active: data.isActive !== false, link: data.link || null, expires_at: data.expiresAt || null, created_by_email: data.createdBy || null, created_at: ts() }]).select().single();
      if (error) throw error;
      return { success: true, id: row.id };
    } catch (error) { throw error; }
  }

  async updateAnnouncement(announcementId, updates) {
    try {
      const { error } = await supabase.from('announcements').update(clean({ title: updates.title, body: updates.body || updates.message, type: updates.type, priority: updates.priority, target_roles: updates.targetRoles, is_active: updates.isActive, link: updates.link, expires_at: updates.expiresAt, updated_at: ts() })).eq('id', announcementId);
      if (error) throw error;
    } catch (error) { throw error; }
  }

  async deleteAnnouncement(announcementId) {
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', announcementId);
      if (error) throw error;
      cacheInvalidate('announcements');
    } catch (error) { throw error; }
  }

  // ===== CUSTOM ROLES =====

  async getCustomRoles() {
    try {
      const { data } = await supabase.from('custom_roles').select('*').order('created_at');
      return (data || []).map(r => ({ id: r.id, name: r.name, permissions: r.permissions || {}, pagePermissions: r.page_permissions || [], featurePermissions: r.feature_permissions || [], createdBy: r.created_by, createdAt: normalizeTs(r.created_at) }));
    } catch { return []; }
  }

  async createCustomRole(roleData) {
    try {
      const { data, error } = await supabase.from('custom_roles').insert([{ name: roleData.name, permissions: roleData.permissions || {}, page_permissions: roleData.pagePermissions || [], feature_permissions: roleData.featurePermissions || [], created_by: roleData.createdBy || null, created_at: ts() }]).select().single();
      if (error) throw error;
      return { success: true, id: data.id };
    } catch (error) { throw error; }
  }

  async updateCustomRole(roleId, updates) {
    try {
      const { error } = await supabase.from('custom_roles').update(clean({ name: updates.name, permissions: updates.permissions, page_permissions: updates.pagePermissions, feature_permissions: updates.featurePermissions, updated_at: ts() })).eq('id', roleId);
      if (error) throw error;
    } catch (error) { throw error; }
  }

  onCustomRolesChange(callback) {
    return realtimeListener('custom_roles', 'all', () => this.getCustomRoles(), callback);
  }

  // ===== SLACK CONNECTIONS =====

  async setSlackConnection(userEmail, connectionData) {
    return this.updateApprovedUser(userEmail, { slackUserId: connectionData.userId, slackWorkspaceId: connectionData.workspaceId, slackAccessToken: connectionData.accessToken });
  }

  async getSlackConnection(userEmail) {
    try {
      const user = await this.getApprovedUserByEmail(userEmail);
      if (!user?.slackUserId) return null;
      return { userId: user.slackUserId, workspaceId: user.slackWorkspaceId, accessToken: user.slackAccessToken };
    } catch { return null; }
  }

  async removeSlackConnection(userEmail) {
    return this.updateApprovedUser(userEmail, { slackUserId: null, slackWorkspaceId: null });
  }

  // ===== GRAPHIC PROJECTS =====

  async getGraphicProjects() {
    try {
      const { data } = await supabase.from('graphic_projects').select('*').order('created_at', { ascending: false });
      return (data || []).map(r => ({ id: r.id, title: r.title, description: r.description, type: r.type || r.project_type, status: r.status, clientId: r.client_id_legacy || r.client_id, requestedBy: r.requested_by_email, assignedTo: r.assigned_to_email, dueDate: r.due_date, deliveredAt: normalizeTs(r.delivered_at), assetUrls: r.asset_urls || [], feedback: r.feedback, notes: r.notes, createdAt: normalizeTs(r.created_at) }));
    } catch { return []; }
  }

  async addGraphicProject(projectData) {
    try {
      const { data, error } = await supabase.from('graphic_projects').insert([clean({ title: projectData.title, description: projectData.description, type: projectData.type, project_type: projectData.type, status: projectData.status || 'requested', client_id_legacy: projectData.clientId || null, requested_by_email: projectData.requestedBy || null, assigned_to_email: projectData.assignedTo || null, due_date: projectData.dueDate || null, feedback: projectData.feedback || null, notes: projectData.notes || null, created_at: ts() })]).select().single();
      if (error) throw error;
      return data.id;
    } catch (error) { throw error; }
  }

  async updateGraphicProject(projectId, projectData) {
    try {
      const { error } = await supabase.from('graphic_projects').update(clean({ title: projectData.title, description: projectData.description, type: projectData.type, status: projectData.status, assigned_to_email: projectData.assignedTo, due_date: projectData.dueDate, delivered_at: projectData.deliveredAt, asset_urls: projectData.assetUrls, feedback: projectData.feedback, notes: projectData.notes, updated_at: ts() })).eq('id', projectId);
      if (error) throw error;
    } catch (error) { throw error; }
  }

  async bulkImportGraphicProjects(projects) {
    for (const p of projects) { try { await this.addGraphicProject(p); } catch {} }
  }

  async createProjectRequest(requestData) {
    try {
      const { data, error } = await supabase.from('project_requests').insert([clean({ from_user_email: requestData.fromUserEmail, to_user_email: requestData.toUserEmail || null, title: requestData.title, description: requestData.description, type: requestData.type, client_id: requestData.clientId || null, due_date: requestData.dueDate || null, status: 'pending', meta: requestData, created_at: ts() })]).select().single();
      if (error) throw error;
      return data.id;
    } catch (error) { throw error; }
  }

  async getProjectRequests(userEmail) {
    try {
      const { data } = await supabase.from('project_requests').select('*').or(`from_user_email.eq.${userEmail},to_user_email.eq.${userEmail}`).order('created_at', { ascending: false });
      return (data || []).map(r => ({ id: r.id, fromUserEmail: r.from_user_email, toUserEmail: r.to_user_email, title: r.title, description: r.description, type: r.type, clientId: r.client_id, dueDate: r.due_date, status: r.status, rejectionReason: r.rejection_reason, projectId: r.project_id, createdAt: normalizeTs(r.created_at) }));
    } catch { return []; }
  }

  async acceptProjectRequest(requestId, requestData) {
    try {
      const projectId = await this.addGraphicProject({ ...requestData, status: 'in_progress' });
      await supabase.from('project_requests').update({ status: 'accepted', project_id: projectId, updated_at: ts() }).eq('id', requestId);
      return { success: true, projectId };
    } catch (error) { throw error; }
  }

  async rejectProjectRequest(requestId, requestData, reason = '') {
    try {
      await supabase.from('project_requests').update({ status: 'rejected', rejection_reason: reason, updated_at: ts() }).eq('id', requestId);
      return { success: true };
    } catch (error) { throw error; }
  }

  // ===== FEEDBACK =====

  async createFeedback(feedbackData) {
    try {
      const { data, error } = await supabase.from('feedback').insert([clean({ user_email: feedbackData.userEmail, type: feedbackData.type || 'feedback', title: feedbackData.title || feedbackData.subject, description: feedbackData.description || feedbackData.message, message: feedbackData.message || feedbackData.description, priority: feedbackData.priority || 'medium', status: 'open', created_at: ts() })]).select().single();
      if (error) throw error;
      return { success: true, id: data.id };
    } catch (error) { throw error; }
  }

  async getAllFeedback() {
    try {
      const { data } = await supabase.from('feedback').select('*').eq('archived', false).order('created_at', { ascending: false });
      return (data || []).map(r => ({ id: r.id, userEmail: r.user_email, type: r.type, title: r.title, description: r.description, message: r.message, priority: r.priority, status: r.status, adminNotes: r.admin_notes, createdAt: normalizeTs(r.created_at) }));
    } catch { return []; }
  }

  async getUsageAnalytics() {
    try {
      const { data } = await supabase.from('usage_events').select('*').order('created_at', { ascending: false }).limit(500);
      return data || [];
    } catch { return []; }
  }

  async updateFeedbackStatus(feedbackId, status) {
    try {
      const { error } = await supabase.from('feedback').update({ status, updated_at: ts() }).eq('id', feedbackId);
      if (error) throw error;
    } catch (error) { throw error; }
  }

  async archiveFeedbackChat(chatId) {
    try {
      const { error } = await supabase.from('feedback_chats').update({ is_archived: true, updated_at: ts() }).eq('id', chatId);
      if (error) throw error;
    } catch (error) { throw error; }
  }

  async createFeedbackChat(chatData) {
    try {
      const { data, error } = await supabase.from('feedback_chats').insert([{ user_email: chatData.userEmail, subject: chatData.subject || chatData.title, status: 'open', is_archived: false, messages: JSON.stringify([]), created_at: ts(), updated_at: ts() }]).select().single();
      if (error) throw error;
      return data.id;
    } catch (error) { throw error; }
  }

  async getFeedbackChats(userEmail) {
    try {
      const { data } = await supabase.from('feedback_chats').select('*').eq('user_email', userEmail).eq('is_archived', false).order('updated_at', { ascending: false });
      return (data || []).map(r => ({ id: r.id, userEmail: r.user_email, subject: r.subject, status: r.status, isArchived: r.is_archived, messages: r.messages || [], userLastReadAt: normalizeTs(r.user_last_read_at), adminLastReadAt: normalizeTs(r.admin_last_read_at), createdAt: normalizeTs(r.created_at), updatedAt: normalizeTs(r.updated_at) }));
    } catch { return []; }
  }

  async getAllFeedbackChats() {
    try {
      const { data } = await supabase.from('feedback_chats').select('*').order('updated_at', { ascending: false });
      return (data || []).map(r => ({ id: r.id, userEmail: r.user_email, subject: r.subject, status: r.status, isArchived: r.is_archived, messages: r.messages || [], createdAt: normalizeTs(r.created_at), updatedAt: normalizeTs(r.updated_at) }));
    } catch { return []; }
  }

  async getFeedbackChatById(chatId) {
    try {
      const { data } = await supabase.from('feedback_chats').select('*').eq('id', chatId).maybeSingle();
      return data ? { id: data.id, userEmail: data.user_email, subject: data.subject, status: data.status, messages: data.messages || [], createdAt: normalizeTs(data.created_at) } : null;
    } catch { return null; }
  }

  subscribeToFeedbackChat(chatId, callback) {
    return realtimeListener('feedback_chats', chatId, () => this.getFeedbackChatById(chatId), callback);
  }

  async addFeedbackChatMessage(chatId, messageData) {
    try {
      const { data: existing } = await supabase.from('feedback_chats').select('messages').eq('id', chatId).maybeSingle();
      const messages = [...(existing?.messages || []), { ...messageData, createdAt: ts(), id: `msg-${Date.now()}` }];
      const { error } = await supabase.from('feedback_chats').update({ messages, updated_at: ts() }).eq('id', chatId);
      if (error) throw error;
      return { success: true };
    } catch (error) { throw error; }
  }

  async closeFeedbackChat(chatId) {
    try {
      const { error } = await supabase.from('feedback_chats').update({ status: 'closed', updated_at: ts() }).eq('id', chatId);
      if (error) throw error;
    } catch (error) { throw error; }
  }

  async updateFeedbackChatUserLastRead(chatId) {
    try {
      await supabase.from('feedback_chats').update({ user_last_read_at: ts() }).eq('id', chatId);
    } catch { /* non-fatal */ }
  }

  // ===== CANVASES =====

  async getCanvases(userId) {
    try {
      const { data } = await supabase.from('canvases').select('*').eq('user_id_legacy', userId).order('updated_at', { ascending: false });
      return (data || []).map(r => ({ id: r.id, title: r.title, content: r.content || [], userId: r.user_id_legacy, ownerId: r.owner_id, isShared: r.is_shared, sharedWith: r.shared_with || [], createdAt: normalizeTs(r.created_at), updatedAt: normalizeTs(r.updated_at) }));
    } catch { return []; }
  }

  async createCanvas(userId, canvas) {
    try {
      const { data, error } = await supabase.from('canvases').insert([{ title: canvas.title || 'Untitled', content: canvas.content || [], user_id_legacy: userId, is_shared: canvas.isShared || false, shared_with: canvas.sharedWith || [], created_at: ts(), updated_at: ts() }]).select().single();
      if (error) throw error;
      return { id: data.id, title: data.title, content: data.content, userId, isShared: data.is_shared, sharedWith: data.shared_with, createdAt: normalizeTs(data.created_at) };
    } catch (error) { throw error; }
  }

  async updateCanvas(userId, canvasId, patch) {
    try {
      const { error } = await supabase.from('canvases').update({ ...patch, updated_at: ts() }).eq('id', canvasId);
      if (error) throw error;
    } catch (error) { throw error; }
  }

  async getCanvasesSharedWith(userEmail) {
    try {
      const { data } = await supabase.from('canvases').select('*').eq('is_shared', true).order('updated_at', { ascending: false });
      return (data || []).filter(r => (r.shared_with || []).some(s => (s.email || s) === userEmail)).map(r => ({ id: r.id, title: r.title, content: r.content, userId: r.user_id_legacy, isShared: r.is_shared, sharedWith: r.shared_with, createdAt: normalizeTs(r.created_at) }));
    } catch { return []; }
  }

  async shareCanvas(ownerUserId, canvasId, { email, role = 'editor' }) {
    try {
      const { data } = await supabase.from('canvases').select('shared_with').eq('id', canvasId).maybeSingle();
      const sharedWith = [...(data?.shared_with || []).filter(s => (s.email || s) !== email), { email, role }];
      await supabase.from('canvases').update({ shared_with: sharedWith, is_shared: true, updated_at: ts() }).eq('id', canvasId);
    } catch (error) { throw error; }
  }

  async unshareCanvas(ownerUserId, canvasId, email) {
    try {
      const { data } = await supabase.from('canvases').select('shared_with').eq('id', canvasId).maybeSingle();
      const sharedWith = (data?.shared_with || []).filter(s => (s.email || s) !== email);
      await supabase.from('canvases').update({ shared_with: sharedWith, is_shared: sharedWith.length > 0, updated_at: ts() }).eq('id', canvasId);
    } catch (error) { throw error; }
  }

  async getCanvasById(canvasId) {
    try {
      const { data } = await supabase.from('canvases').select('*').eq('id', canvasId).maybeSingle();
      return data ? { id: data.id, title: data.title, content: data.content, userId: data.user_id_legacy, isShared: data.is_shared, sharedWith: data.shared_with, history: data.history || [], createdAt: normalizeTs(data.created_at) } : null;
    } catch { return null; }
  }

  async addCanvasFormResponse(canvasId, blockId, respondentEmail, respondentName, answers) {
    try {
      await supabase.from('canvas_form_responses').insert([{ canvas_id: canvasId, block_id: blockId, respondent_email: respondentEmail, respondent_name: respondentName, answers, created_at: ts() }]);
    } catch { /* non-fatal */ }
  }

  async getCanvasHistory(canvasId, limit = 50) {
    try {
      const { data } = await supabase.from('canvases').select('history').eq('id', canvasId).maybeSingle();
      const history = data?.history || [];
      return history.slice(-limit);
    } catch { return []; }
  }

  async saveCanvasHistorySnapshot(canvasId, snapshot) {
    try {
      const { data } = await supabase.from('canvases').select('history').eq('id', canvasId).maybeSingle();
      const history = [...(data?.history || []).slice(-49), { ...snapshot, savedAt: ts() }];
      await supabase.from('canvases').update({ history, updated_at: ts() }).eq('id', canvasId);
    } catch { /* non-fatal */ }
  }

  async restoreCanvasVersion(ownerUserId, canvasId, versionId) {
    try {
      const history = await this.getCanvasHistory(canvasId);
      const version = history.find(h => h.id === versionId || h.savedAt === versionId);
      if (version?.content) {
        await supabase.from('canvases').update({ content: version.content, updated_at: ts() }).eq('id', canvasId);
      }
    } catch (error) { throw error; }
  }

  async getBlockComments(canvasId, blockId) {
    try {
      const { data } = await supabase.from('canvases').select('content').eq('id', canvasId).maybeSingle();
      const block = (data?.content || []).find(b => b.id === blockId);
      return block?.comments || [];
    } catch { return []; }
  }

  async addBlockComment(canvasId, blockId, { user, userName, text }) {
    try {
      const { data } = await supabase.from('canvases').select('content').eq('id', canvasId).maybeSingle();
      const content = (data?.content || []).map(b => {
        if (b.id !== blockId) return b;
        const comments = [...(b.comments || []), { id: `c-${Date.now()}`, user, userName, text, createdAt: ts() }];
        return { ...b, comments };
      });
      await supabase.from('canvases').update({ content, updated_at: ts() }).eq('id', canvasId);
    } catch (error) { throw error; }
  }

  async toggleBlockReaction(canvasId, blockId, emoji, userId) {
    try {
      const { data } = await supabase.from('canvases').select('content').eq('id', canvasId).maybeSingle();
      const content = (data?.content || []).map(b => {
        if (b.id !== blockId) return b;
        const reactions = b.reactions || {};
        const users = reactions[emoji] || [];
        reactions[emoji] = users.includes(userId) ? users.filter(u => u !== userId) : [...users, userId];
        return { ...b, reactions };
      });
      await supabase.from('canvases').update({ content, updated_at: ts() }).eq('id', canvasId);
    } catch (error) { throw error; }
  }
}

export const firestoreService = new SupabaseService();
export default firestoreService;
