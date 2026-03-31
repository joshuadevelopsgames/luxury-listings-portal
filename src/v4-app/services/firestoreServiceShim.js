/**
 * firestoreServiceShim.js
 *
 * Drop-in replacement for V3 supabaseService.
 * Same method names & return shapes, backed by Supabase instead of Firestore.
 *
 * Usage in V4 pages:
 *   import { supabaseService } from '../../services/supabaseService';
 */

import { supabase } from '../lib/supabase';
import { normalizeTaskPriorityToInt, taskPriorityToLabel } from '../../utils/taskPriority';

// ─── Helpers ────────────────────────────────────────────────

const uid = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
};

const currentUserEmail = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email?.toLowerCase();
};

/** Look up a profile UUID by email (case-insensitive). */
const profileIdByEmail = async (email) => {
  if (!email) return null;
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email.toLowerCase())
    .maybeSingle();
  return data?.id ?? null;
};

/** Full profile record by email. */
const profileByEmail = async (email) => {
  if (!email) return null;
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email.toLowerCase())
    .maybeSingle();
  return data ? profileToUser(data) : null;
};

/** Convert a Supabase profiles row → V3 approved_user shape. */
const profileToUser = (p) => {
  if (!p) return null;
  return {
    id: p.email?.toLowerCase() || p.id, // V3 uses email as doc id
    odId: p.id, // keep Supabase UUID available
    email: p.email?.toLowerCase() || '',
    name: p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim(),
    full_name: p.full_name,
    firstName: p.first_name || '',
    lastName: p.last_name || '',
    displayName: p.full_name || p.email || '',
    position: p.position || '',
    role: p.role || 'team_member',
    department: p.department || '',
    avatar: p.avatar_url || '',
    avatar_url: p.avatar_url || '',
    bio: p.bio || '',
    phone: p.phone || '',
    startDate: p.start_date || '',
    skills: p.skills || [],
    isApproved: p.is_approved ?? false,
    onboardingCompleted: p.onboarding_completed ?? false,
    pagePermissions: p.page_permissions || [],
    featurePermissions: p.feature_permissions || [],
    customPermissions: p.custom_permissions || [],
    leaveBalances: p.leave_balances || { vacation: { total: 15, used: 0, remaining: 15 }, sick: { total: 3, used: 0, remaining: 3 }, remote: { total: 10, used: 0, remaining: 10 } },
    isTimeOffAdmin: p.is_time_off_admin || false,
    lastSeenAt: p.last_seen_at,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
};

/** Convert a Supabase row to add { id, ...fields } like Firestore docs. */
const row = (r) => r; // Supabase already returns id field

/** Noop unsubscribe for stubs. */
const noop = () => {};

/** Subscribe to a Supabase Realtime channel and return an unsubscribe fn. */
const realtimeListen = (table, filter, callback, opts = {}) => {
  const channelName = `${table}_${filter || 'all'}_${Date.now()}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table, filter: filter || undefined },
      async () => {
        // Re-fetch on any change (simple but correct)
        if (opts.fetcher) {
          const data = await opts.fetcher();
          callback(data);
        }
      }
    )
    .subscribe();

  // Do initial fetch
  if (opts.fetcher) {
    opts.fetcher().then((data) => callback(data));
  }

  return () => supabase.removeChannel(channel);
};

// ════════════════════════════════════════════════════════════
// firestoreService
// ════════════════════════════════════════════════════════════

export const firestoreService = {

  // ──────────────────────────────────────────────────────────
  // USER MANAGEMENT
  // ──────────────────────────────────────────────────────────

  async addPendingUser(userData) {
    const { data, error } = await supabase
      .from('pending_users')
      .insert({ email: userData.email?.toLowerCase(), full_name: userData.name, role: userData.role, status: 'pending' })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  },

  async getPendingUsers() {
    const { data, error } = await supabase.from('pending_users').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((r) => ({ ...r, name: r.full_name }));
  },

  async removePendingUser(userId) {
    await supabase.from('pending_users').delete().eq('id', userId);
  },

  async updatePendingUser(userId, updates) {
    await supabase.from('pending_users').update({ ...updates, full_name: updates.name || updates.full_name }).eq('id', userId);
  },

  async approveUser(userId, userData) {
    // Remove from pending
    await supabase.from('pending_users').delete().eq('id', userId);
    // Update profile — find by email
    const email = (userData.email || '').toLowerCase();
    const pid = await profileIdByEmail(email);
    if (pid) {
      await supabase.from('profiles').update({ is_approved: true, role: userData.role || 'team_member' }).eq('id', pid);
    }
  },

  async getApprovedUsers() {
    const { data, error } = await supabase.from('profiles').select('*').eq('is_approved', true);
    if (error) throw error;
    return (data || []).map(profileToUser);
  },

  async getApprovedUserByEmail(email) {
    return profileByEmail(email);
  },

  async addApprovedUser(userData) {
    const email = (userData.email || '').toLowerCase();
    const pid = await profileIdByEmail(email);
    if (pid) {
      await supabase.from('profiles').update({ is_approved: true, role: userData.role || 'team_member', full_name: userData.name || userData.full_name }).eq('id', pid);
    }
  },

  async removeApprovedUser(email) {
    const pid = await profileIdByEmail(email);
    if (pid) {
      await supabase.from('profiles').update({ is_approved: false }).eq('id', pid);
    }
  },

  async updateApprovedUser(email, updates) {
    const pid = await profileIdByEmail(email);
    if (!pid) return;
    const patch = {};
    if (updates.name !== undefined) patch.full_name = updates.name;
    if (updates.role !== undefined) patch.role = updates.role;
    if (updates.department !== undefined) patch.department = updates.department;
    if (updates.position !== undefined) patch.position = updates.position;
    if (updates.avatar !== undefined) patch.avatar_url = updates.avatar;
    if (updates.bio !== undefined) patch.bio = updates.bio;
    if (updates.phone !== undefined) patch.phone = updates.phone;
    if (updates.startDate !== undefined) patch.start_date = updates.startDate;
    if (updates.skills !== undefined) patch.skills = updates.skills;
    if (updates.onboardingCompleted !== undefined) patch.onboarding_completed = updates.onboardingCompleted;
    if (updates.pagePermissions !== undefined) patch.page_permissions = updates.pagePermissions;
    if (updates.featurePermissions !== undefined) patch.feature_permissions = updates.featurePermissions;
    if (updates.customPermissions !== undefined) patch.custom_permissions = updates.customPermissions;
    if (updates.leaveBalances !== undefined) patch.leave_balances = updates.leaveBalances;
    if (updates.isTimeOffAdmin !== undefined) patch.is_time_off_admin = updates.isTimeOffAdmin;
    if (updates.firstName !== undefined) patch.first_name = updates.firstName;
    if (updates.lastName !== undefined) patch.last_name = updates.lastName;
    if (Object.keys(patch).length > 0) {
      await supabase.from('profiles').update(patch).eq('id', pid);
    }
  },

  async deleteApprovedUser(email) {
    return this.removeApprovedUser(email);
  },

  async updateLastSeen(userEmail) {
    try {
      const pid = await profileIdByEmail(userEmail);
      if (pid) await supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', pid);
    } catch { /* non-fatal */ }
  },

  onApprovedUserChange(email, callback) {
    const emailLower = email?.toLowerCase();
    return realtimeListen('profiles', `email=eq.${emailLower}`, (rows) => {
      callback(rows?.[0] ? profileToUser(rows[0]) : null);
    }, {
      fetcher: async () => {
        const { data } = await supabase.from('profiles').select('*').eq('email', emailLower);
        return data;
      }
    });
  },

  onApprovedUsersChange(callback) {
    return realtimeListen('profiles', 'is_approved=eq.true', callback, {
      fetcher: async () => {
        const { data } = await supabase.from('profiles').select('*').eq('is_approved', true);
        return (data || []).map(profileToUser);
      }
    });
  },

  async ensureEmailLowerClaim() { /* no-op in Supabase */ },

  // ──────────────────────────────────────────────────────────
  // TASK MANAGEMENT
  // ──────────────────────────────────────────────────────────

  async addTask(taskData) {
    const userId = await uid();
    const assignedId = taskData.assigned_to ? await profileIdByEmail(taskData.assigned_to) : null;
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: taskData.title,
        description: taskData.description,
        status: taskData.status || 'todo',
        priority: normalizeTaskPriorityToInt(taskData.priority, 2),
        assigned_to_id: assignedId,
        created_by_id: userId,
        due_date: taskData.due_date || null,
        client_id: taskData.clientId || null,
      })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  },

  async getTasks() {
    const { data, error } = await supabase
      .from('tasks')
      .select('*, assigned_to:profiles!tasks_assigned_to_id_fkey(email, full_name), created_by:profiles!tasks_created_by_id_fkey(email, full_name)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((t) => ({
      ...t,
      priority: taskPriorityToLabel(t.priority),
      assigned_to: t.assigned_to?.email || '',
      assigned_to_name: t.assigned_to?.full_name || '',
      assigned_by: t.created_by?.email || '',
      createdAt: t.created_at,
    }));
  },

  async getTasksByUser(userEmail) {
    const pid = await profileIdByEmail(userEmail);
    if (!pid) return [];
    const { data, error } = await supabase
      .from('tasks')
      .select('*, assigned_to:profiles!tasks_assigned_to_id_fkey(email, full_name), created_by:profiles!tasks_created_by_id_fkey(email, full_name)')
      .eq('assigned_to_id', pid)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((t) => ({
      ...t,
      priority: taskPriorityToLabel(t.priority),
      assigned_to: t.assigned_to?.email || '',
      assigned_by: t.created_by?.email || '',
      createdAt: t.created_at,
    }));
  },

  async getTaskById(taskId) {
    const { data, error } = await supabase.from('tasks').select('*').eq('id', taskId).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return { ...data, priority: taskPriorityToLabel(data.priority) };
  },

  async updateTask(taskId, updates) {
    const patch = { ...updates };
    if (updates.assigned_to) {
      patch.assigned_to_id = await profileIdByEmail(updates.assigned_to);
      delete patch.assigned_to;
    }
    if (updates.status === 'completed') patch.completed_at = new Date().toISOString();
    if (patch.priority !== undefined) patch.priority = normalizeTaskPriorityToInt(patch.priority, 2);
    delete patch.createdAt;
    delete patch.assigned_by;
    await supabase.from('tasks').update(patch).eq('id', taskId);
  },

  async deleteTask(taskId) {
    await supabase.from('tasks').delete().eq('id', taskId);
  },

  async getSentTaskRequests(userEmail) {
    const pid = await profileIdByEmail(userEmail);
    if (!pid) return [];
    const { data } = await supabase
      .from('task_requests')
      .select('*, to_user:profiles!task_requests_to_user_id_fkey(email, full_name)')
      .eq('from_user_id', pid)
      .order('created_at', { ascending: false });
    return (data || []).map((r) => ({ ...r, toUserEmail: r.to_user?.email, toUserName: r.to_user?.full_name, createdAt: r.created_at }));
  },

  async getPostLogTasksByClient(clientId, options = {}) {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('source', 'post_log')
      .eq('client_id', clientId)
      .order('completed_at', { ascending: false })
      .limit(options.limit || 200);
    return data || [];
  },

  async getPostLogMonthlyHistory(clientId) {
    const { data } = await supabase
      .from('post_log_monthly')
      .select('*')
      .eq('client_id', clientId)
      .order('year_month', { ascending: false });
    return data || [];
  },

  async getLastPostsResetMonth() {
    const { data } = await supabase.from('system_config').select('value').eq('key', 'posts_reset').maybeSingle();
    return data?.value?.lastYearMonth || null;
  },

  async runMonthlyPostsReset() {
    // Complex operation — stub for now, implement as edge function
    console.warn('[shim] runMonthlyPostsReset: not yet implemented — use edge function');
    return { didReset: false, reason: 'Not implemented in V4 shim yet' };
  },

  async archiveTaskForUser(userEmail, taskId) {
    const pid = await profileIdByEmail(userEmail);
    if (!pid) return { success: false };
    await supabase.from('user_task_archives').upsert({ user_id: pid, task_id: taskId, type: 'task' }, { onConflict: 'user_id,task_id,type' });
    return { success: true };
  },

  async unarchiveTaskForUser(userEmail, taskId) {
    const pid = await profileIdByEmail(userEmail);
    if (!pid) return { success: false };
    await supabase.from('user_task_archives').delete().eq('user_id', pid).eq('task_id', taskId).eq('type', 'task');
    return { success: true };
  },

  async getArchivedTaskIds(userEmail) {
    const pid = await profileIdByEmail(userEmail);
    if (!pid) return [];
    const { data } = await supabase.from('user_task_archives').select('task_id').eq('user_id', pid).eq('type', 'task');
    return (data || []).map((r) => r.task_id);
  },

  async archiveRequestForUser(userEmail, taskRequestId) {
    const pid = await profileIdByEmail(userEmail);
    if (!pid) return { success: false };
    await supabase.from('user_task_archives').upsert({ user_id: pid, task_id: taskRequestId, type: 'request' }, { onConflict: 'user_id,task_id,type' });
    return { success: true };
  },

  async unarchiveRequestForUser(userEmail, taskRequestId) {
    const pid = await profileIdByEmail(userEmail);
    if (!pid) return { success: false };
    await supabase.from('user_task_archives').delete().eq('user_id', pid).eq('task_id', taskRequestId).eq('type', 'request');
    return { success: true };
  },

  async getArchivedRequestIds(userEmail) {
    const pid = await profileIdByEmail(userEmail);
    if (!pid) return [];
    const { data } = await supabase.from('user_task_archives').select('task_id').eq('user_id', pid).eq('type', 'request');
    return (data || []).map((r) => r.task_id);
  },

  onUserTasksChange(userEmail, callback) {
    return realtimeListen('tasks', null, callback, {
      fetcher: async () => {
        const result = await supabaseService.getTasksByUser(userEmail);
        return result;
      }
    });
  },

  // ──────────────────────────────────────────────────────────
  // EMPLOYEE MANAGEMENT
  // ──────────────────────────────────────────────────────────

  async getEmployees() {
    const { data } = await supabase.from('profiles').select('*').eq('is_approved', true);
    return (data || []).map(profileToUser);
  },

  async getEmployeeByEmail(email) {
    return profileByEmail(email);
  },

  async updateEmployee(employeeId, employeeData) {
    // employeeId may be email (V3) or UUID
    const pid = employeeId.includes('@') ? await profileIdByEmail(employeeId) : employeeId;
    if (!pid) return { success: false };
    const patch = {};
    if (employeeData.name !== undefined) patch.full_name = employeeData.name;
    if (employeeData.role !== undefined) patch.role = employeeData.role;
    if (employeeData.department !== undefined) patch.department = employeeData.department;
    if (employeeData.position !== undefined) patch.position = employeeData.position;
    if (employeeData.phone !== undefined) patch.phone = employeeData.phone;
    if (employeeData.bio !== undefined) patch.bio = employeeData.bio;
    if (employeeData.avatar !== undefined) patch.avatar_url = employeeData.avatar;
    if (employeeData.startDate !== undefined) patch.start_date = employeeData.startDate;
    if (employeeData.skills !== undefined) patch.skills = employeeData.skills;
    if (Object.keys(patch).length > 0) await supabase.from('profiles').update(patch).eq('id', pid);
    return { success: true };
  },

  async addEmployee(employeeData) {
    // In Supabase, employees = approved profiles. We can update an existing profile.
    const email = (employeeData.email || '').toLowerCase();
    const pid = await profileIdByEmail(email);
    if (pid) {
      await supabase.from('profiles').update({ is_approved: true, full_name: employeeData.name, role: employeeData.role || 'team_member', department: employeeData.department, position: employeeData.position }).eq('id', pid);
      return { success: true, id: pid };
    }
    return { success: false, error: 'Profile not found' };
  },

  // ──────────────────────────────────────────────────────────
  // LEAVE REQUEST MANAGEMENT
  // ──────────────────────────────────────────────────────────

  async submitLeaveRequest(requestData) {
    const pid = await profileIdByEmail(requestData.employeeEmail);
    const { data, error } = await supabase
      .from('time_off_requests')
      .insert({
        user_id: pid,
        type: requestData.type,
        start_date: requestData.startDate,
        end_date: requestData.endDate,
        reason: requestData.reason || requestData.notes,
        status: 'pending',
        history: [{ action: 'submitted', by: requestData.employeeEmail, timestamp: new Date().toISOString() }],
      })
      .select('id')
      .single();
    if (error) throw error;
    return { success: true, id: data.id };
  },

  async getLeaveRequestsByUser(userEmail) {
    const pid = await profileIdByEmail(userEmail);
    if (!pid) return [];
    const { data } = await supabase
      .from('time_off_requests')
      .select('*, user:profiles!time_off_requests_user_id_fkey(email, full_name)')
      .eq('user_id', pid)
      .order('created_at', { ascending: false });
    return (data || []).map(leaveToV3);
  },

  async getAllLeaveRequests() {
    const { data } = await supabase
      .from('time_off_requests')
      .select('*, user:profiles!time_off_requests_user_id_fkey(email, full_name)')
      .order('created_at', { ascending: false });
    return (data || []).map(leaveToV3);
  },

  async updateLeaveRequestStatus(requestId, status, reviewedBy) {
    const reviewerId = await profileIdByEmail(reviewedBy);
    await supabase.from('time_off_requests').update({
      status,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    }).eq('id', requestId);
    return { success: true };
  },

  async getLeaveRequests(userEmail = null) {
    if (userEmail) return this.getLeaveRequestsByUser(userEmail);
    return this.getAllLeaveRequests();
  },

  async deleteLeaveRequest(requestId) {
    await supabase.from('time_off_requests').delete().eq('id', requestId);
    return { success: true };
  },

  async submitLeaveRequestEnhanced(requestData) {
    return this.submitLeaveRequest(requestData);
  },

  async updateLeaveRequestStatusEnhanced(requestId, status, reviewedBy, notes) {
    const reviewerId = await profileIdByEmail(reviewedBy);
    // Get current history
    const { data: current } = await supabase.from('time_off_requests').select('history').eq('id', requestId).single();
    const history = [...(current?.history || []), { action: status, by: reviewedBy, timestamp: new Date().toISOString(), notes }];
    await supabase.from('time_off_requests').update({ status, reviewed_by: reviewerId, reviewed_at: new Date().toISOString(), manager_notes: notes, history }).eq('id', requestId);
    return { success: true };
  },

  async updateLeaveRequestApproved(requestId, updates) {
    await supabase.from('time_off_requests').update(updates).eq('id', requestId);
    return { success: true };
  },

  async setLeaveRequestRequesterCalendarEventId() { return { success: true }; },
  async setLeaveRequestCalendarEventIdForEmail() { return { success: true }; },

  async addToRequestHistory(requestId, action, byEmail, notes) {
    const { data: current } = await supabase.from('time_off_requests').select('history').eq('id', requestId).single();
    const history = [...(current?.history || []), { action, by: byEmail, timestamp: new Date().toISOString(), notes }];
    await supabase.from('time_off_requests').update({ history }).eq('id', requestId);
    return { success: true };
  },

  async getTeamLeaveConflicts(startDate, endDate, excludeEmail) {
    const { data } = await supabase
      .from('time_off_requests')
      .select('*, user:profiles!time_off_requests_user_id_fkey(email, full_name)')
      .in('status', ['pending', 'approved'])
      .lte('start_date', endDate)
      .gte('end_date', startDate);
    return (data || [])
      .filter((r) => r.user?.email?.toLowerCase() !== excludeEmail?.toLowerCase())
      .map((r) => ({
        employeeName: r.user?.full_name || '',
        employeeEmail: r.user?.email || '',
        startDate: r.start_date,
        endDate: r.end_date,
        type: r.type,
        status: r.status,
      }));
  },

  async hasOverlappingRequest(userEmail, startDate, endDate, excludeRequestId) {
    const pid = await profileIdByEmail(userEmail);
    if (!pid) return false;
    let q = supabase.from('time_off_requests').select('id').eq('user_id', pid).in('status', ['pending', 'approved']).lte('start_date', endDate).gte('end_date', startDate);
    if (excludeRequestId) q = q.neq('id', excludeRequestId);
    const { data } = await q;
    return (data || []).length > 0;
  },

  async getUserLeaveBalances(userEmail) {
    const p = await profileByEmail(userEmail);
    return p?.leaveBalances || { vacation: { total: 15, used: 0, remaining: 15 }, sick: { total: 3, used: 0, remaining: 3 }, remote: { total: 10, used: 0, remaining: 10 } };
  },

  async updateUserLeaveBalances(userEmail, balances) {
    const pid = await profileIdByEmail(userEmail);
    if (pid) await supabase.from('profiles').update({ leave_balances: balances }).eq('id', pid);
    return { success: true };
  },

  async getAllUsersWithLeaveBalances() {
    const { data } = await supabase.from('profiles').select('*').eq('is_approved', true).not('leave_balances', 'is', null);
    return (data || []).map(profileToUser);
  },

  async deductLeaveBalance(userEmail, leaveType, days) {
    const p = await profileByEmail(userEmail);
    if (!p) return { success: false };
    const balances = { ...p.leaveBalances };
    if (balances[leaveType]) {
      balances[leaveType].used = (balances[leaveType].used || 0) + days;
      balances[leaveType].remaining = balances[leaveType].total - balances[leaveType].used;
    }
    return this.updateUserLeaveBalances(userEmail, balances);
  },

  async getTimeOffAdmins() {
    const { data } = await supabase.from('profiles').select('*').eq('is_time_off_admin', true);
    return (data || []).map(profileToUser);
  },

  async setTimeOffAdmin(userEmail, isAdmin) {
    const pid = await profileIdByEmail(userEmail);
    if (pid) await supabase.from('profiles').update({ is_time_off_admin: isAdmin }).eq('id', pid);
    return { success: true };
  },

  async isTimeOffAdmin(userEmail) {
    const p = await profileByEmail(userEmail);
    return p?.isTimeOffAdmin || false;
  },

  async cancelLeaveRequest(requestId, cancelledBy) {
    const pid = await profileIdByEmail(cancelledBy);
    await supabase.from('time_off_requests').update({ status: 'cancelled', cancelled_at: new Date().toISOString(), cancelled_by: pid }).eq('id', requestId);
    return { success: true };
  },

  async archiveLeaveRequest(requestId) {
    await supabase.from('time_off_requests').update({ archived: true }).eq('id', requestId);
    return { success: true };
  },

  async unarchiveLeaveRequest(requestId) {
    await supabase.from('time_off_requests').update({ archived: false }).eq('id', requestId);
    return { success: true };
  },

  onLeaveRequestsChange(callback, userEmail) {
    return realtimeListen('time_off_requests', null, callback, {
      fetcher: async () => (userEmail ? supabaseService.getLeaveRequestsByUser(userEmail) : supabaseService.getAllLeaveRequests()),
    });
  },

  // ──────────────────────────────────────────────────────────
  // CLIENT MANAGEMENT
  // ──────────────────────────────────────────────────────────

  async getClients() {
    const { data, error } = await supabase
      .from('clients')
      .select('*, manager:profiles!clients_account_manager_id_fkey(email, full_name)');
    if (error) throw error;
    return (data || []).map(clientToV3);
  },

  async getClientById(clientId) {
    const { data, error } = await supabase
      .from('clients')
      .select('*, manager:profiles!clients_account_manager_id_fkey(email, full_name)')
      .eq('id', clientId)
      .maybeSingle();
    if (error) throw error;
    return data ? clientToV3(data) : null;
  },

  async addClient(clientData) {
    const managerId = clientData.assignedManager ? await profileIdByEmail(clientData.assignedManager) : null;
    const { data, error } = await supabase
      .from('clients')
      .insert({
        name: clientData.clientName || clientData.name,
        client_name: clientData.clientName || clientData.name,
        status: clientData.status || 'active',
        account_manager_id: managerId,
        assigned_manager_email: clientData.assignedManager,
        platform: clientData.platform,
        posts_per_month: clientData.packageSize || clientData.posts_per_month,
        package_size: clientData.packageSize,
        instagram_handle: clientData.instagram_handle || clientData.instagramHandle,
        monthly_value: clientData.monthlyValue || clientData.monthly_value,
        notes: clientData.notes,
        platforms: clientData.platforms,
        profile_photo: clientData.profilePhoto,
      })
      .select('id, client_number')
      .single();
    if (error) throw error;
    return { success: true, id: data.id, clientNumber: `CLT-${data.client_number}` };
  },

  async updateClient(clientId, clientData) {
    const patch = {};
    if (clientData.clientName !== undefined) { patch.name = clientData.clientName; patch.client_name = clientData.clientName; }
    if (clientData.name !== undefined) { patch.name = clientData.name; patch.client_name = clientData.name; }
    if (clientData.status !== undefined) patch.status = clientData.status;
    if (clientData.assignedManager !== undefined) {
      patch.assigned_manager_email = clientData.assignedManager;
      patch.account_manager_id = await profileIdByEmail(clientData.assignedManager);
    }
    if (clientData.platform !== undefined) patch.platform = clientData.platform;
    if (clientData.packageSize !== undefined) { patch.package_size = clientData.packageSize; patch.posts_per_month = clientData.packageSize; }
    if (clientData.instagram_handle !== undefined) patch.instagram_handle = clientData.instagram_handle;
    if (clientData.instagramHandle !== undefined) patch.instagram_handle = clientData.instagramHandle;
    if (clientData.monthlyValue !== undefined) patch.monthly_value = clientData.monthlyValue;
    if (clientData.monthly_value !== undefined) patch.monthly_value = clientData.monthly_value;
    if (clientData.notes !== undefined) patch.notes = clientData.notes;
    if (clientData.platforms !== undefined) patch.platforms = clientData.platforms;
    if (clientData.postsUsed !== undefined) patch.posts_used = clientData.postsUsed;
    if (clientData.postsRemaining !== undefined) patch.posts_remaining = clientData.postsRemaining;
    if (clientData.postsUsedByPlatform !== undefined) patch.posts_used_by_platform = clientData.postsUsedByPlatform;
    if (clientData.postsRemainingByPlatform !== undefined) patch.posts_remaining_by_platform = clientData.postsRemainingByPlatform;
    if (clientData.profilePhoto !== undefined) patch.profile_photo = clientData.profilePhoto;
    if (clientData.health_status !== undefined) patch.health_status = clientData.health_status;
    if (clientData.health_score !== undefined) patch.health_score = clientData.health_score;
    if (clientData.contract_start !== undefined) patch.contract_start = clientData.contract_start;
    if (clientData.contract_end !== undefined) patch.contract_end = clientData.contract_end;
    if (clientData.facebook_page !== undefined) patch.facebook_page = clientData.facebook_page;
    if (clientData.onboarded_at !== undefined) patch.onboarded_at = clientData.onboarded_at;
    if (clientData.logo_url !== undefined) patch.logo_url = clientData.logo_url;
    if (Object.keys(patch).length > 0) await supabase.from('clients').update(patch).eq('id', clientId);
    return { success: true };
  },

  async deleteClient(clientId) {
    // Soft-delete: archive instead of permanently removing
    const { data: existing } = await supabase.from('clients').select('meta').eq('id', clientId).maybeSingle();
    const meta = { ...(existing?.meta || {}), approvalStatus: 'Archived', archivedAt: new Date().toISOString() };
    await supabase.from('clients').update({ status: 'archived', meta, updated_at: new Date().toISOString() }).eq('id', clientId);
    return { success: true };
  },

  async generateClientNumber() {
    const { data } = await supabase.from('clients').select('client_number').order('client_number', { ascending: false }).limit(1);
    const next = (data?.[0]?.client_number || 0) + 1;
    return `CLT-${next}`;
  },

  async assignMissingClientNumbers() {
    // No-op: Supabase uses SERIAL for client_number
    return { updated: 0 };
  },

  async assignKnownClientPhotos() { return { updated: 0 }; },

  async mergeClientInto(keepId, mergeFromId) {
    try {
      // Reassign tasks
      await supabase.from('tasks').update({ client_id: keepId }).eq('client_id', mergeFromId);
      // Reassign instagram reports
      await supabase.from('instagram_reports').update({ client_id: keepId }).eq('client_id', mergeFromId);
      // Reassign messages
      await supabase.from('client_messages').update({ client_id: keepId }).eq('client_id', mergeFromId);
      // Delete merged client
      await supabase.from('clients').delete().eq('id', mergeFromId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async logClientMovement(event) {
    try {
      await supabase.from('client_movements').insert({
        type: event.type,
        client_id: event.clientId,
        client_name: event.clientName,
        performed_by: event.performedBy,
        details: event.details || {},
      });
    } catch { /* non-fatal */ }
  },

  async logClientAdded(clientId, clientName, assignedManager, performedBy) {
    return this.logClientMovement({ type: 'client_added', clientId, clientName, performedBy, details: { assignedManager } });
  },

  async logContractValueIncrease(clientId, clientName, previousValue, newValue, performedBy) {
    return this.logClientMovement({ type: 'contract_value_increased', clientId, clientName, performedBy, details: { previousValue, newValue } });
  },

  async logClientReassignment(clientId, clientName, previousManager, newManager, performedBy) {
    return this.logClientMovement({ type: 'client_reassigned', clientId, clientName, performedBy, details: { previousManager, newManager } });
  },

  async logSocialAccountsAdded(clientId, clientName, details, performedBy) {
    return this.logClientMovement({ type: 'social_accounts_added', clientId, clientName, performedBy, details });
  },

  async getClientMovements(options = {}) {
    let q = supabase.from('client_movements').select('*').order('created_at', { ascending: false });
    if (options.type) q = q.eq('type', options.type);
    if (options.limit) q = q.limit(options.limit);
    const { data } = await q;
    return (data || []).map((r) => ({ ...r, timestamp: r.created_at }));
  },

  async getClientHealthSnapshots() {
    const { data } = await supabase.from('client_health_snapshots').select('*');
    const map = {};
    (data || []).forEach((r) => { map[r.client_id] = r; });
    return map;
  },

  onClientsChange(callback) {
    return realtimeListen('clients', null, callback, {
      fetcher: () => supabaseService.getClients(),
    });
  },

  // ──────────────────────────────────────────────────────────
  // CRM DATA
  // ──────────────────────────────────────────────────────────

  async getCrmData() {
    const { data } = await supabase.from('crm_data').select('*').eq('id', 'shared').maybeSingle();
    return {
      warmLeads: data?.warm_leads || [],
      contactedClients: data?.contacted_clients || [],
      coldLeads: data?.cold_leads || [],
    };
  },

  async setCrmData(payload) {
    await supabase.from('crm_data').upsert({
      id: 'shared',
      warm_leads: payload.warmLeads,
      contacted_clients: payload.contactedClients,
      cold_leads: payload.coldLeads,
      last_sync_time: new Date().toISOString(),
    });
  },

  onCrmDataChange(callback) {
    return realtimeListen('crm_data', null, callback, {
      fetcher: () => supabaseService.getCrmData(),
    });
  },

  async getCustomLocations() {
    const { data } = await supabase.from('crm_custom_locations').select('*').order('created_at');
    return data || [];
  },

  async addCustomLocation(value, createdBy) {
    const titleCase = value.charAt(0).toUpperCase() + value.slice(1);
    await supabase.from('crm_custom_locations').upsert({ value: titleCase, created_by: createdBy }, { onConflict: 'value' });
  },

  async removeCustomLocation(value) {
    await supabase.from('crm_custom_locations').delete().ilike('value', value);
  },

  // ──────────────────────────────────────────────────────────
  // SUPPORT TICKETS
  // ──────────────────────────────────────────────────────────

  async submitSupportTicket(ticketData) {
    const userId = await uid();
    const { data, error } = await supabase
      .from('support_tickets')
      .insert({ user_id: userId, title: ticketData.title, description: ticketData.description, category: ticketData.category, priority: ticketData.priority, status: 'open' })
      .select('id')
      .single();
    if (error) throw error;
    return { success: true, id: data.id };
  },

  async getSupportTicketsByUser(userEmail) {
    const pid = await profileIdByEmail(userEmail);
    if (!pid) return [];
    const { data } = await supabase.from('support_tickets').select('*').eq('user_id', pid).order('created_at', { ascending: false });
    return (data || []).map(ticketToV3);
  },

  async getAllSupportTickets() {
    const { data } = await supabase.from('support_tickets').select('*, user:profiles!support_tickets_user_id_fkey(email, full_name)').order('created_at', { ascending: false });
    return (data || []).map((t) => ({ ...ticketToV3(t), requesterEmail: t.user?.email, requesterName: t.user?.full_name }));
  },

  async updateSupportTicketStatus(ticketId, status, resolvedBy, notes) {
    const patch = { status };
    if (resolvedBy) {
      patch.resolved_by_id = await profileIdByEmail(resolvedBy);
      patch.resolved_at = new Date().toISOString();
    }
    await supabase.from('support_tickets').update(patch).eq('id', ticketId);
    return { success: true };
  },

  async deleteSupportTicket(ticketId) {
    await supabase.from('support_tickets').delete().eq('id', ticketId);
    return { success: true };
  },

  onSupportTicketsChange(callback, userEmail) {
    return realtimeListen('support_tickets', null, callback, {
      fetcher: async () => (userEmail ? supabaseService.getSupportTicketsByUser(userEmail) : supabaseService.getAllSupportTickets()),
    });
  },

  async addTicketComment(ticketId, commentData) {
    const userId = await uid();
    const { data, error } = await supabase
      .from('ticket_comments')
      .insert({ ticket_id: ticketId, user_id: userId, body: commentData.body || commentData.text })
      .select('*')
      .single();
    if (error) throw error;
    return { success: true, id: data.id };
  },

  onTicketCommentsChange(ticketId, callback) {
    return realtimeListen('ticket_comments', `ticket_id=eq.${ticketId}`, callback, {
      fetcher: async () => {
        const { data } = await supabase.from('ticket_comments').select('*, user:profiles!ticket_comments_user_id_fkey(email, full_name)').eq('ticket_id', ticketId).order('created_at');
        return (data || []).map((c) => ({ ...c, userEmail: c.user?.email, userName: c.user?.full_name, createdAt: c.created_at }));
      },
    });
  },

  // ──────────────────────────────────────────────────────────
  // NOTIFICATIONS
  // ──────────────────────────────────────────────────────────

  async createNotification(notificationData) {
    const toId = await profileIdByEmail(notificationData.userEmail);
    if (!toId) return { success: false };
    const { data, error } = await supabase
      .from('notifications')
      .insert({ user_id: toId, type: notificationData.type, title: notificationData.title, body: notificationData.message, link: notificationData.link })
      .select('id')
      .single();
    if (error) throw error;
    return { success: true, id: data.id };
  },

  async getNotifications(userEmail) {
    const pid = await profileIdByEmail(userEmail);
    if (!pid) return [];
    const { data } = await supabase.from('notifications').select('*').eq('user_id', pid).order('created_at', { ascending: false });
    return (data || []).map(notifToV3);
  },

  onNotificationsChange(userEmail, callback) {
    return realtimeListen('notifications', null, callback, {
      fetcher: () => supabaseService.getNotifications(userEmail),
    });
  },

  async markNotificationRead(notificationId) {
    await supabase.from('notifications').update({ read: true }).eq('id', notificationId);
  },

  async markAllNotificationsRead(userEmail) {
    const pid = await profileIdByEmail(userEmail);
    if (pid) await supabase.from('notifications').update({ read: true }).eq('user_id', pid).eq('read', false);
  },

  async deleteNotification(notificationId) {
    await supabase.from('notifications').delete().eq('id', notificationId);
  },

  async deleteWorkspaceMentionNotifications(userEmail, workspaceId) {
    const pid = await profileIdByEmail(userEmail);
    if (pid) await supabase.from('notifications').delete().eq('user_id', pid).eq('type', 'workspace_mention');
  },

  // ──────────────────────────────────────────────────────────
  // CONTENT CALENDAR
  // ──────────────────────────────────────────────────────────

  async getContentCalendars(userEmail) {
    const pid = await profileIdByEmail(userEmail);
    if (!pid) return [];
    const { data } = await supabase.from('content_calendars').select('*').eq('user_id', pid).order('created_at');
    return data || [];
  },

  async createContentCalendar(calendarData) {
    const pid = await profileIdByEmail(calendarData.userEmail) || await uid();
    const { data, error } = await supabase
      .from('content_calendars')
      .insert({ user_id: pid, name: calendarData.name, description: calendarData.description, color: calendarData.color })
      .select('id')
      .single();
    if (error) throw error;
    return { id: data.id };
  },

  async updateContentCalendar(id, calendarData) {
    const patch = {};
    if (calendarData.name !== undefined) patch.name = calendarData.name;
    if (calendarData.description !== undefined) patch.description = calendarData.description;
    if (calendarData.color !== undefined) patch.color = calendarData.color;
    await supabase.from('content_calendars').update(patch).eq('id', id);
  },

  async deleteContentCalendar(id) {
    await supabase.from('content_calendars').delete().eq('id', id);
  },

  async getContentItems(userEmail, options = {}) {
    const pid = await profileIdByEmail(userEmail);
    if (!pid) return [];
    let q = supabase.from('content_items').select('*').eq('user_id', pid).order('scheduled_date');
    if (options.calendarId) q = q.eq('calendar_id', options.calendarId);
    if (options.status) q = q.eq('status', options.status);
    const { data } = await q;
    return data || [];
  },

  async getContentItem(id) {
    const { data } = await supabase.from('content_items').select('*').eq('id', id).maybeSingle();
    return data;
  },

  async createContentItem(itemData) {
    const pid = await profileIdByEmail(itemData.userEmail) || await uid();
    const { data, error } = await supabase
      .from('content_items')
      .insert({ user_id: pid, calendar_id: itemData.calendarId, title: itemData.title, description: itemData.description, platform: itemData.platform, status: itemData.status || 'draft', scheduled_date: itemData.scheduledDate, media_urls: (itemData.media || []).slice(0, 15), tags: itemData.tags })
      .select('id')
      .single();
    if (error) throw error;
    return { id: data.id };
  },

  async updateContentItem(id, itemData) {
    const patch = {};
    if (itemData.title !== undefined) patch.title = itemData.title;
    if (itemData.description !== undefined) patch.description = itemData.description;
    if (itemData.platform !== undefined) patch.platform = itemData.platform;
    if (itemData.status !== undefined) patch.status = itemData.status;
    if (itemData.scheduledDate !== undefined) patch.scheduled_date = itemData.scheduledDate;
    if (itemData.media !== undefined) patch.media_urls = itemData.media.slice(0, 15);
    if (itemData.tags !== undefined) patch.tags = itemData.tags;
    await supabase.from('content_items').update(patch).eq('id', id);
  },

  async deleteContentItem(id) {
    await supabase.from('content_items').delete().eq('id', id);
  },

  async migrateContentCalendarFromLocalStorage() { return { calendarsCreated: 0, itemsCreated: 0 }; },

  // ──────────────────────────────────────────────────────────
  // TASK REQUESTS / DELEGATION
  // ──────────────────────────────────────────────────────────

  async createTaskRequest(requestData) {
    const fromId = await profileIdByEmail(requestData.fromUserEmail);
    const toId = await profileIdByEmail(requestData.toUserEmail);
    const { data, error } = await supabase
      .from('task_requests')
      .insert({ from_user_id: fromId, to_user_id: toId, title: requestData.title, description: requestData.description, priority: normalizeTaskPriorityToInt(requestData.priority, 2), status: 'pending' })
      .select('id')
      .single();
    if (error) throw error;
    // Create notification
    await supabaseService.createNotification({ userEmail: requestData.toUserEmail, type: 'task_request', title: 'New Task Request', message: `You received a task request: ${requestData.title}`, link: '/v4/tasks' });
    return { success: true, id: data.id };
  },

  async getTaskRequests(userEmail) {
    const pid = await profileIdByEmail(userEmail);
    if (!pid) return [];
    const { data } = await supabase
      .from('task_requests')
      .select('*, from_user:profiles!task_requests_from_user_id_fkey(email, full_name)')
      .eq('to_user_id', pid)
      .order('created_at', { ascending: false });
    return (data || []).map((r) => ({ ...r, fromUserEmail: r.from_user?.email, fromUserName: r.from_user?.full_name, createdAt: r.created_at }));
  },

  onTaskRequestsChange(userEmail, callback) {
    return realtimeListen('task_requests', null, callback, {
      fetcher: () => supabaseService.getTaskRequests(userEmail),
    });
  },

  async acceptTaskRequest(requestId, requestData) {
    // Create a task from the request
    const taskId = await supabaseService.addTask({
      title: requestData.title,
      description: requestData.description,
      assigned_to: requestData.toUserEmail || requestData.assigned_to,
      priority: requestData.priority,
    });
    await supabase.from('task_requests').update({ status: 'accepted', created_task_id: taskId }).eq('id', requestId);
    return { success: true, taskId };
  },

  async rejectTaskRequest(requestId, requestData, rejectionReason) {
    await supabase.from('task_requests').update({ status: 'rejected', rejection_reason: rejectionReason }).eq('id', requestId);
    return { success: true };
  },

  async deleteTaskRequest(requestId) {
    await supabase.from('task_requests').delete().eq('id', requestId);
    return { success: true };
  },

  onSentTaskRequestsChange(userEmail, callback) {
    return realtimeListen('task_requests', null, callback, {
      fetcher: () => supabaseService.getSentTaskRequests(userEmail),
    });
  },

  // ──────────────────────────────────────────────────────────
  // TASK TEMPLATES
  // ──────────────────────────────────────────────────────────

  async getTaskTemplates(userEmail) {
    const { data } = await supabase.from('task_templates').select('*').order('created_at', { ascending: false });
    return (data || []).map((t) => ({ ...t, createdAt: t.created_at }));
  },

  async getTaskTemplate(templateId) {
    const { data } = await supabase.from('task_templates').select('*').eq('id', templateId).maybeSingle();
    return data;
  },

  async createTaskTemplate(templateData) {
    const userId = await uid();
    const { data, error } = await supabase
      .from('task_templates')
      .insert({ title: templateData.title, description: templateData.description, priority: normalizeTaskPriorityToInt(templateData.priority, 2), source: templateData.source || 'task', created_by_id: userId })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  },

  async updateTaskTemplate(templateId, updates) {
    const patch = { ...updates };
    if (patch.priority !== undefined) patch.priority = normalizeTaskPriorityToInt(patch.priority, 2);
    await supabase.from('task_templates').update(patch).eq('id', templateId);
  },

  async deleteTaskTemplate(templateId) {
    await supabase.from('task_templates').delete().eq('id', templateId);
  },

  onTaskTemplatesChange(userEmail, callback) {
    // Poll-based (matches V3 behavior which also polls)
    const fetcher = () => supabaseService.getTaskTemplates(userEmail);
    fetcher().then(callback);
    const interval = setInterval(() => fetcher().then(callback), 5000);
    return () => clearInterval(interval);
  },

  async initializeDefaultTemplates(defaultTemplates, userEmail) {
    const existing = await supabaseService.getTaskTemplates(userEmail);
    if (existing.length > 0) return;
    for (const t of defaultTemplates) {
      await supabaseService.createTaskTemplate({ ...t, ownerEmail: userEmail });
    }
  },

  async shareTaskTemplateWith() { /* stub */ },

  // ──────────────────────────────────────────────────────────
  // SMART FILTERS
  // ──────────────────────────────────────────────────────────

  async getSmartFilters(userEmail) {
    const pid = await profileIdByEmail(userEmail);
    if (!pid) return [];
    const { data } = await supabase.from('smart_filters').select('*').eq('user_id', pid);
    return data || [];
  },

  async createSmartFilter(filterData) {
    const pid = await profileIdByEmail(filterData.userEmail) || await uid();
    const { data, error } = await supabase
      .from('smart_filters')
      .insert({ user_id: pid, name: filterData.name, filters: filterData.filters || filterData })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  },

  async updateSmartFilter(filterId, updates) {
    await supabase.from('smart_filters').update({ name: updates.name, filters: updates.filters || updates }).eq('id', filterId);
  },

  async deleteSmartFilter(filterId) {
    await supabase.from('smart_filters').delete().eq('id', filterId);
  },

  // ──────────────────────────────────────────────────────────
  // CLIENT MESSAGING
  // ──────────────────────────────────────────────────────────

  async createMessage(messageData) {
    const userId = await uid();
    const { data, error } = await supabase
      .from('client_messages')
      .insert({ client_id: messageData.clientId, user_id: userId, body: messageData.body || messageData.text || messageData.message })
      .select('id')
      .single();
    if (error) throw error;
    return { success: true, id: data.id };
  },

  async getMessagesByClient(clientId) {
    const { data } = await supabase.from('client_messages').select('*, user:profiles!client_messages_user_id_fkey(email, full_name)').eq('client_id', clientId).order('created_at');
    return (data || []).map((m) => ({ ...m, userEmail: m.user?.email, userName: m.user?.full_name, createdAt: m.created_at }));
  },

  onMessagesChange(clientId, callback) {
    return realtimeListen('client_messages', `client_id=eq.${clientId}`, callback, {
      fetcher: () => supabaseService.getMessagesByClient(clientId),
    });
  },

  // ──────────────────────────────────────────────────────────
  // CLIENT REPORTS
  // ──────────────────────────────────────────────────────────

  async getReportsByClient(clientId) {
    const { data } = await supabase.from('client_reports').select('*').eq('client_id', clientId).order('date', { ascending: false });
    return data || [];
  },

  async createMonthlyReport(reportData) {
    const userId = await uid();
    const { data, error } = await supabase
      .from('client_reports')
      .insert({ client_id: reportData.clientId, title: reportData.title, date: reportData.date, body: reportData.body, created_by_id: userId })
      .select('id')
      .single();
    if (error) throw error;
    return { success: true, id: data.id };
  },

  // ──────────────────────────────────────────────────────────
  // PENDING CLIENTS
  // ──────────────────────────────────────────────────────────

  async addPendingClient(clientData) {
    const userId = await uid();
    const { data, error } = await supabase
      .from('pending_clients')
      .insert({ name: clientData.name || clientData.clientName, details: clientData, submitted_by_id: userId })
      .select('id')
      .single();
    if (error) throw error;
    return { success: true, id: data.id };
  },

  async getPendingClients() {
    const { data } = await supabase.from('pending_clients').select('*').order('created_at', { ascending: false });
    return (data || []).map((r) => ({ ...r, ...r.details, createdAt: r.created_at }));
  },

  async removePendingClient(clientId) {
    await supabase.from('pending_clients').delete().eq('id', clientId);
  },

  onPendingClientsChange(callback) {
    return realtimeListen('pending_clients', null, callback, {
      fetcher: () => supabaseService.getPendingClients(),
    });
  },

  // ──────────────────────────────────────────────────────────
  // CLIENT CONTRACTS
  // ──────────────────────────────────────────────────────────

  async getContractsByClient(clientId) {
    const { data } = await supabase.from('client_contracts').select('*').eq('client_id', clientId).order('created_at', { ascending: false });
    return data || [];
  },

  async getContractById(contractId) {
    const { data } = await supabase.from('client_contracts').select('*').eq('id', contractId).maybeSingle();
    return data;
  },

  async addContract(contractData) {
    const { data, error } = await supabase
      .from('client_contracts')
      .insert({ client_id: contractData.clientId, title: contractData.title, value: contractData.value, start_date: contractData.startDate, end_date: contractData.endDate, status: contractData.status, details: contractData })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  },

  async updateContract(contractId, updates) {
    const patch = {};
    if (updates.title !== undefined) patch.title = updates.title;
    if (updates.value !== undefined) patch.value = updates.value;
    if (updates.startDate !== undefined) patch.start_date = updates.startDate;
    if (updates.endDate !== undefined) patch.end_date = updates.endDate;
    if (updates.status !== undefined) patch.status = updates.status;
    await supabase.from('client_contracts').update(patch).eq('id', contractId);
  },

  async deleteContract(contractId) {
    await supabase.from('client_contracts').delete().eq('id', contractId);
  },

  // ──────────────────────────────────────────────────────────
  // INSTAGRAM REPORTS
  // ──────────────────────────────────────────────────────────

  async createInstagramReport(reportData) {
    const userId = await uid();
    const startDate = reportData.startDate;
    const endDate = reportData.endDate;
    const { data, error } = await supabase
      .from('instagram_reports')
      .insert({
        client_id: reportData.clientId,
        created_by_id: userId,
        period_start: startDate,
        period_end: endDate,
        title: reportData.title,
        year: reportData.year || new Date(startDate).getFullYear(),
        month: reportData.month || new Date(startDate).getMonth() + 1,
        metrics: reportData.metrics || {},
        post_links: reportData.postLinks || [],
        screenshot_urls: reportData.screenshots || [],
        notes: reportData.notes,
      })
      .select('id, public_link_id')
      .single();
    if (error) throw error;
    return { success: true, id: data.id, publicLinkId: data.public_link_id };
  },

  async getInstagramReports() {
    const userId = await uid();
    const { data } = await supabase
      .from('instagram_reports')
      .select('*, client:clients(name, client_name)')
      .eq('created_by_id', userId)
      .eq('archived', false)
      .order('created_at', { ascending: false });
    return (data || []).map(igReportToV3);
  },

  async getInstagramReportsByClient(clientId) {
    const { data } = await supabase
      .from('instagram_reports')
      .select('*')
      .eq('client_id', clientId)
      .eq('archived', false)
      .order('period_start', { ascending: false });
    return (data || []).map(igReportToV3);
  },

  async getClientInstagramReportHistory(clientId, maxReports = 6) {
    const { data } = await supabase
      .from('instagram_reports')
      .select('*')
      .eq('client_id', clientId)
      .order('period_start', { ascending: false })
      .limit(maxReports);
    return (data || []).map(igReportToV3);
  },

  async getInstagramReportById(reportId) {
    const { data } = await supabase.from('instagram_reports').select('*, client:clients(name, client_name)').eq('id', reportId).maybeSingle();
    return data ? igReportToV3(data) : null;
  },

  async getInstagramReportByPublicLink(publicLinkId) {
    const id = publicLinkId != null ? String(publicLinkId).trim() : '';
    if (!id) return null;
    const { data, error } = await supabase.rpc('get_instagram_report_by_public_link', {
      p_public_link_id: id,
    });
    if (error) return null;
    const row = Array.isArray(data) ? data[0] : data;
    return row ? igReportToV3(row) : null;
  },

  async updateInstagramReport(reportId, updates) {
    const patch = {};
    if (updates.title !== undefined) patch.title = updates.title;
    if (updates.startDate !== undefined) patch.period_start = updates.startDate;
    if (updates.endDate !== undefined) patch.period_end = updates.endDate;
    if (updates.metrics !== undefined) patch.metrics = updates.metrics;
    if (updates.postLinks !== undefined) patch.post_links = updates.postLinks;
    if (updates.screenshots !== undefined) patch.screenshot_urls = updates.screenshots;
    if (updates.notes !== undefined) patch.notes = updates.notes;
    if (updates.clientId !== undefined) patch.client_id = updates.clientId;
    if (updates.is_public !== undefined) patch.is_public = updates.is_public;
    await supabase.from('instagram_reports').update(patch).eq('id', reportId);
    return { success: true };
  },

  async deleteInstagramReport(reportId) {
    // Soft delete
    await supabase.from('instagram_reports').update({ archived: true }).eq('id', reportId);
    return { success: true };
  },

  onInstagramReportsChange(callback, options = {}) {
    return realtimeListen('instagram_reports', null, callback, {
      fetcher: async () => {
        if (options.loadAll) {
          const { data } = await supabase.from('instagram_reports').select('*, client:clients(name, client_name)').order('created_at', { ascending: false });
          return (data || []).map(igReportToV3);
        }
        return supabaseService.getInstagramReports();
      },
    });
  },

  // ──────────────────────────────────────────────────────────
  // DASHBOARD PREFERENCES
  // ──────────────────────────────────────────────────────────

  async getDashboardPreferences(userId) {
    const { data } = await supabase.from('user_dashboard_preferences').select('*').eq('user_id', userId).maybeSingle();
    if (!data) return null;
    return { widgetOrder: data.widget_order, hiddenWidgets: data.hidden_widgets, layout: data.layout };
  },

  async setDashboardPreferences(userId, prefs) {
    await supabase.from('user_dashboard_preferences').upsert({
      user_id: userId,
      widget_order: prefs.widgetOrder || prefs.widget_order || [],
      hidden_widgets: prefs.hiddenWidgets || prefs.hidden_widgets || [],
      layout: prefs.layout || {},
    }, { onConflict: 'user_id' });
  },

  // ──────────────────────────────────────────────────────────
  // PERMISSIONS
  // ──────────────────────────────────────────────────────────

  async getUserPermissions(userEmail, options = {}) {
    const profile = await profileByEmail(userEmail);
    const result = {
      pages: profile?.pagePermissions || [],
      features: profile?.featurePermissions || [],
      adminPermissions: profile?.customPermissions || [],
    };

    if (options.subscribe && options.onUpdate) {
      // Return an object with unsubscribe
      const unsub = supabaseService.onApprovedUserChange(userEmail, (user) => {
        options.onUpdate({
          pages: user?.pagePermissions || [],
          features: user?.featurePermissions || [],
          adminPermissions: user?.customPermissions || [],
        });
      });
      return { ...result, unsubscribe: unsub };
    }

    return result;
  },

  async setUserPagePermissions(userEmail, pageIds) {
    const pid = await profileIdByEmail(userEmail);
    if (pid) await supabase.from('profiles').update({ page_permissions: pageIds }).eq('id', pid);
  },

  async setUserFeaturePermissions(userEmail, featureIds) {
    const pid = await profileIdByEmail(userEmail);
    if (pid) await supabase.from('profiles').update({ feature_permissions: featureIds }).eq('id', pid);
  },

  async setUserFullPermissions(userEmail, { pages, features }) {
    const pid = await profileIdByEmail(userEmail);
    if (pid) await supabase.from('profiles').update({ page_permissions: pages, feature_permissions: features }).eq('id', pid);
  },

  onUserPagePermissionsChange(userEmail, callback) {
    return supabaseService.onApprovedUserChange(userEmail, (user) => {
      callback(user?.pagePermissions || []);
    });
  },

  // ──────────────────────────────────────────────────────────
  // ERROR REPORTING
  // ──────────────────────────────────────────────────────────

  async submitErrorReport(reportData) {
    const userId = await uid();
    const { data, error } = await supabase
      .from('error_reports')
      .insert({ user_id: userId, error_message: reportData.errorMessage || reportData.message, error_stack: reportData.errorStack || reportData.stack, url: reportData.url, console_logs: reportData.consoleLogs })
      .select('id')
      .single();
    if (error) throw error;
    return { success: true, id: data.id };
  },

  async getErrorReports() {
    const { data } = await supabase.from('error_reports').select('*').order('created_at', { ascending: false });
    return data || [];
  },

  async resolveErrorReport(reportId, notes) {
    await supabase.from('error_reports').update({ error_message: `[RESOLVED] ${notes}` }).eq('id', reportId);
    return { success: true };
  },

  async deleteErrorReport(reportId) {
    await supabase.from('error_reports').delete().eq('id', reportId);
    return { success: true };
  },

  // ──────────────────────────────────────────────────────────
  // ANNOUNCEMENTS
  // ──────────────────────────────────────────────────────────

  async getAnnouncements() {
    const { data } = await supabase.from('announcements').select('*').order('priority', { ascending: false });
    return (data || []).map(announcementToV3);
  },

  async getActiveAnnouncements() {
    const { data } = await supabase.from('announcements').select('*').eq('is_active', true).order('priority', { ascending: false });
    return (data || [])
      .filter((a) => !a.expires_at || new Date(a.expires_at) > new Date())
      .map(announcementToV3);
  },

  async createAnnouncement(announcementData) {
    const userId = await uid();
    const { data, error } = await supabase
      .from('announcements')
      .insert({
        title: announcementData.title,
        body: announcementData.body || announcementData.message,
        priority: announcementData.priority || 'normal',
        target_roles: announcementData.targetRoles || [],
        is_active: announcementData.active !== false,
        published_by: userId,
        expires_at: announcementData.expiresAt || null,
      })
      .select('id')
      .single();
    if (error) throw error;
    return { id: data.id };
  },

  async updateAnnouncement(announcementId, updates) {
    const patch = {};
    if (updates.title !== undefined) patch.title = updates.title;
    if (updates.body !== undefined) patch.body = updates.body;
    if (updates.message !== undefined) patch.body = updates.message;
    if (updates.priority !== undefined) patch.priority = updates.priority;
    if (updates.active !== undefined) patch.is_active = updates.active;
    if (updates.targetRoles !== undefined) patch.target_roles = updates.targetRoles;
    if (updates.expiresAt !== undefined) patch.expires_at = updates.expiresAt;
    await supabase.from('announcements').update(patch).eq('id', announcementId);
  },

  async deleteAnnouncement(announcementId) {
    await supabase.from('announcements').delete().eq('id', announcementId);
  },

  onActiveAnnouncementsChange(callback) {
    return realtimeListen('announcements', null, callback, {
      fetcher: () => supabaseService.getActiveAnnouncements(),
    });
  },

  // ──────────────────────────────────────────────────────────
  // CUSTOM ROLES
  // ──────────────────────────────────────────────────────────

  async getCustomRoles() {
    const { data } = await supabase.from('custom_roles').select('*').order('created_at');
    return data || [];
  },

  async createCustomRole(roleData) {
    const { data, error } = await supabase
      .from('custom_roles')
      .insert({ name: roleData.name, permissions: roleData.permissions || [], created_by: roleData.createdBy })
      .select('id')
      .single();
    if (error) throw error;
    return { success: true, id: data.id };
  },

  async updateCustomRole(roleId, updates) {
    await supabase.from('custom_roles').update({ name: updates.name, permissions: updates.permissions }).eq('id', roleId);
    return { success: true };
  },

  async deleteCustomRole(roleId) {
    await supabase.from('custom_roles').delete().eq('id', roleId);
    return { success: true };
  },

  onCustomRolesChange(callback) {
    return realtimeListen('custom_roles', null, callback, {
      fetcher: () => supabaseService.getCustomRoles(),
    });
  },

  // ──────────────────────────────────────────────────────────
  // SLACK CONNECTIONS
  // ──────────────────────────────────────────────────────────

  async setSlackConnection(userEmail, connectionData) {
    await supabase.from('slack_connections').upsert({ user_email: userEmail.toLowerCase(), ...connectionData }, { onConflict: 'user_email' });
    return { success: true };
  },

  async getSlackConnection(userEmail) {
    const { data } = await supabase.from('slack_connections').select('*').eq('user_email', userEmail.toLowerCase()).maybeSingle();
    return data;
  },

  async removeSlackConnection(userEmail) {
    await supabase.from('slack_connections').delete().eq('user_email', userEmail.toLowerCase());
    return { success: true };
  },

  // ──────────────────────────────────────────────────────────
  // GRAPHIC PROJECTS
  // ──────────────────────────────────────────────────────────

  async getGraphicProjects() {
    const { data } = await supabase.from('graphic_projects').select('*, client:clients(name, client_name), assignee:profiles!graphic_projects_assigned_to_id_fkey(email, full_name), requester:profiles!graphic_projects_requested_by_id_fkey(email, full_name)').order('created_at', { ascending: false });
    return (data || []).map((p) => ({
      ...p,
      clientName: p.client?.name || p.client?.client_name || '',
      assignedTo: p.assignee?.email || '',
      assignedToName: p.assignee?.full_name || '',
      requestedBy: p.requester?.email || '',
      requestedByName: p.requester?.full_name || '',
      startDate: p.created_at,
      createdAt: p.created_at,
    }));
  },

  async addGraphicProject(projectData) {
    const assigneeId = projectData.assignedTo ? await profileIdByEmail(projectData.assignedTo) : null;
    const requesterId = projectData.requestedBy ? await profileIdByEmail(projectData.requestedBy) : await uid();
    const { data, error } = await supabase
      .from('graphic_projects')
      .insert({
        client_id: projectData.clientId || projectData.client_id,
        title: projectData.title,
        description: projectData.description,
        type: projectData.type,
        status: projectData.status || 'requested',
        assigned_to_id: assigneeId,
        requested_by_id: requesterId,
        due_date: projectData.dueDate || projectData.due_date,
      })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  },

  async updateGraphicProject(projectId, projectData) {
    const patch = {};
    if (projectData.title !== undefined) patch.title = projectData.title;
    if (projectData.description !== undefined) patch.description = projectData.description;
    if (projectData.type !== undefined) patch.type = projectData.type;
    if (projectData.status !== undefined) patch.status = projectData.status;
    if (projectData.dueDate !== undefined) patch.due_date = projectData.dueDate;
    if (projectData.due_date !== undefined) patch.due_date = projectData.due_date;
    if (projectData.feedback !== undefined) patch.feedback = projectData.feedback;
    if (projectData.asset_urls !== undefined) patch.asset_urls = projectData.asset_urls;
    if (projectData.assignedTo !== undefined) patch.assigned_to_id = await profileIdByEmail(projectData.assignedTo);
    if (Object.keys(patch).length > 0) await supabase.from('graphic_projects').update(patch).eq('id', projectId);
    return { success: true };
  },

  async deleteGraphicProject(projectId) {
    await supabase.from('graphic_projects').delete().eq('id', projectId);
    return { success: true };
  },

  async bulkImportGraphicProjects(projects) {
    const ids = [];
    for (const p of projects) {
      const id = await supabaseService.addGraphicProject(p);
      ids.push(id);
    }
    return ids;
  },

  // ──────────────────────────────────────────────────────────
  // PROJECT REQUESTS
  // ──────────────────────────────────────────────────────────

  async createProjectRequest(requestData) {
    const fromId = await profileIdByEmail(requestData.fromUserEmail) || await uid();
    const toId = await profileIdByEmail(requestData.toUserEmail);
    const { data, error } = await supabase
      .from('project_requests')
      .insert({ from_user_id: fromId, to_user_id: toId, title: requestData.title, description: requestData.description, client_id: requestData.clientId, status: 'pending' })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  },

  async getProjectRequests(userEmail) {
    const pid = await profileIdByEmail(userEmail);
    if (!pid) return [];
    const { data } = await supabase.from('project_requests').select('*, from_user:profiles!project_requests_from_user_id_fkey(email, full_name)').eq('to_user_id', pid).order('created_at', { ascending: false });
    return (data || []).map((r) => ({ ...r, fromUserEmail: r.from_user?.email, fromUserName: r.from_user?.full_name, createdAt: r.created_at }));
  },

  async acceptProjectRequest(requestId, requestData) {
    const projectId = await supabaseService.addGraphicProject(requestData);
    await supabase.from('project_requests').update({ status: 'accepted', created_project_id: projectId }).eq('id', requestId);
    return projectId;
  },

  async rejectProjectRequest(requestId, requestData, reason) {
    await supabase.from('project_requests').update({ status: 'rejected', rejection_reason: reason }).eq('id', requestId);
  },

  // ──────────────────────────────────────────────────────────
  // FEEDBACK & SUPPORT
  // ──────────────────────────────────────────────────────────

  async createFeedback(feedbackData) {
    const userId = await uid();
    const { data, error } = await supabase
      .from('feedback')
      .insert({ user_id: userId, type: feedbackData.type || 'bug', title: feedbackData.title, description: feedbackData.description, priority: feedbackData.priority })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  },

  async getAllFeedback() {
    const { data } = await supabase.from('feedback').select('*, user:profiles!feedback_user_id_fkey(email, full_name)').order('created_at', { ascending: false });
    return (data || []).map((f) => ({ ...f, userEmail: f.user?.email, userName: f.user?.full_name, createdAt: f.created_at }));
  },

  async updateFeedbackStatus(feedbackId, status) {
    await supabase.from('feedback').update({ status }).eq('id', feedbackId);
  },

  async deleteFeedback(feedbackId) {
    await supabase.from('feedback').delete().eq('id', feedbackId);
  },

  async createFeedbackChat(chatData) {
    const userId = await uid();
    const { data, error } = await supabase
      .from('feedback_chats')
      .insert({ feedback_id: chatData.feedbackId, user_id: userId, message: chatData.message || chatData.text })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  },

  async getFeedbackChats(userEmail) {
    const pid = await profileIdByEmail(userEmail);
    if (!pid) return [];
    const { data } = await supabase.from('feedback_chats').select('*').eq('user_id', pid).order('created_at', { ascending: false });
    return data || [];
  },

  async getAllFeedbackChats() {
    const { data } = await supabase.from('feedback_chats').select('*, user:profiles!feedback_chats_user_id_fkey(email, full_name)').order('created_at', { ascending: false });
    return (data || []).map((c) => ({ ...c, userEmail: c.user?.email, userName: c.user?.full_name }));
  },

  async getFeedbackChatById(chatId) {
    const { data } = await supabase.from('feedback_chats').select('*').eq('id', chatId).maybeSingle();
    return data;
  },

  subscribeToFeedbackChat(chatId, callback) {
    return realtimeListen('feedback_chats', `id=eq.${chatId}`, callback, {
      fetcher: () => supabaseService.getFeedbackChatById(chatId),
    });
  },

  async addFeedbackChatMessage(chatId, messageData) {
    const userId = await uid();
    await supabase.from('feedback_chats').insert({ feedback_id: chatId, user_id: userId, message: messageData.text || messageData.message });
  },

  async closeFeedbackChat() { /* handled via feedback status */ },
  async archiveFeedbackChat() { /* handled via feedback status */ },

  async deleteFeedbackChat(chatId) {
    await supabase.from('feedback_chats').delete().eq('id', chatId);
  },

  async updateFeedbackChatUserLastRead() { /* stub */ },

  async getUsageAnalytics() {
    // Analytics not stored in Supabase yet — return empty
    return [];
  },

  // ──────────────────────────────────────────────────────────
  // CANVASES
  // ──────────────────────────────────────────────────────────

  async getCanvases(userId) {
    const { data } = await supabase
      .from('canvases')
      .select('*')
      .eq('owner_id', userId)
      .order('updated_at', { ascending: false });
    return (data || []).map(canvasToV3);
  },

  async createCanvas(userId, canvas) {
    const { data, error } = await supabase
      .from('canvases')
      .insert({ owner_id: userId, title: canvas.title || 'Untitled', emoji: canvas.emoji || '📝', content: canvas.blocks || [] })
      .select('*')
      .single();
    if (error) throw error;
    return canvasToV3(data);
  },

  async updateCanvas(userId, canvasId, patch) {
    const updates = {};
    if (patch.title !== undefined) updates.title = patch.title;
    if (patch.emoji !== undefined) updates.emoji = patch.emoji;
    if (patch.blocks !== undefined) updates.content = patch.blocks;
    if (patch.sharedWithEmails !== undefined) updates.shared_with_emails = patch.sharedWithEmails;
    if (patch.sharedWith !== undefined) updates.shared_with = patch.sharedWith;
    await supabase.from('canvases').update(updates).eq('id', canvasId);
  },

  async deleteCanvas(userId, canvasId) {
    await supabase.from('canvases').delete().eq('id', canvasId);
  },

  async getCanvasById(canvasId) {
    const { data } = await supabase.from('canvases').select('*').eq('id', canvasId).maybeSingle();
    return data ? canvasToV3(data) : null;
  },

  async getCanvasesSharedWith(userEmail) {
    const emailLower = userEmail.toLowerCase();
    const { data } = await supabase.from('canvases').select('*').contains('shared_with_emails', [emailLower]);
    return (data || []).map(canvasToV3);
  },

  async shareCanvas(ownerUserId, canvasId, { email, role }) {
    const { data: canvas } = await supabase.from('canvases').select('shared_with, shared_with_emails').eq('id', canvasId).single();
    const emails = [...(canvas.shared_with_emails || []), email.toLowerCase()];
    const shared = [...(canvas.shared_with || []), { email: email.toLowerCase(), role }];
    await supabase.from('canvases').update({ shared_with_emails: [...new Set(emails)], shared_with: shared }).eq('id', canvasId);
  },

  async unshareCanvas(ownerUserId, canvasId, email) {
    const { data: canvas } = await supabase.from('canvases').select('shared_with, shared_with_emails').eq('id', canvasId).single();
    const emailLower = email.toLowerCase();
    await supabase.from('canvases').update({
      shared_with_emails: (canvas.shared_with_emails || []).filter((e) => e !== emailLower),
      shared_with: (canvas.shared_with || []).filter((s) => s.email !== emailLower),
    }).eq('id', canvasId);
  },

  async getCanvasHistory(canvasId, limit = 50) {
    const { data } = await supabase
      .from('canvas_history')
      .select('*')
      .eq('canvas_id', canvasId)
      .order('created_at', { ascending: false })
      .limit(limit);
    return (data || []).map((h) => ({ ...h, updated: h.created_at, createdBy: h.created_by }));
  },

  async saveCanvasHistorySnapshot(canvasId, snapshot) {
    const { data, error } = await supabase
      .from('canvas_history')
      .insert({ canvas_id: canvasId, blocks: snapshot.blocks, title: snapshot.title, created_by: snapshot.createdBy })
      .select('id')
      .single();
    if (error) throw error;
    // Prune old versions (keep 50)
    const { data: old } = await supabase.from('canvas_history').select('id').eq('canvas_id', canvasId).order('created_at', { ascending: false }).range(50, 999);
    if (old?.length) {
      await supabase.from('canvas_history').delete().in('id', old.map((r) => r.id));
    }
    return data.id;
  },

  async restoreCanvasVersion(ownerUserId, canvasId, versionId) {
    const { data: version } = await supabase.from('canvas_history').select('blocks').eq('id', versionId).single();
    await supabase.from('canvases').update({ content: version.blocks }).eq('id', canvasId);
    return { blocks: version.blocks };
  },

  async getBlockComments(canvasId, blockId) {
    const { data } = await supabase.from('canvas_block_comments').select('*').eq('canvas_id', canvasId).eq('block_id', blockId).maybeSingle();
    return { comments: data?.comments || [], reactions: data?.reactions || [] };
  },

  async addBlockComment(canvasId, blockId, comment) {
    const newComment = { ...comment, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    const { data: existing } = await supabase.from('canvas_block_comments').select('comments').eq('canvas_id', canvasId).eq('block_id', blockId).maybeSingle();
    if (existing) {
      await supabase.from('canvas_block_comments').update({ comments: [...(existing.comments || []), newComment] }).eq('canvas_id', canvasId).eq('block_id', blockId);
    } else {
      await supabase.from('canvas_block_comments').insert({ canvas_id: canvasId, block_id: blockId, comments: [newComment] });
    }
    return newComment;
  },

  async toggleBlockReaction(canvasId, blockId, emoji, userId) {
    const { data: existing } = await supabase.from('canvas_block_comments').select('reactions').eq('canvas_id', canvasId).eq('block_id', blockId).maybeSingle();
    let reactions = existing?.reactions || [];
    const idx = reactions.findIndex((r) => r.emoji === emoji && r.userId === userId);
    if (idx >= 0) reactions.splice(idx, 1);
    else reactions.push({ emoji, userId, createdAt: new Date().toISOString() });
    if (existing) {
      await supabase.from('canvas_block_comments').update({ reactions }).eq('canvas_id', canvasId).eq('block_id', blockId);
    } else {
      await supabase.from('canvas_block_comments').insert({ canvas_id: canvasId, block_id: blockId, reactions });
    }
  },

  // ──────────────────────────────────────────────────────────
  // SYSTEM CONFIG
  // ──────────────────────────────────────────────────────────

  async saveSystemConfig(key, value) {
    await supabase.from('system_config').upsert({ key, value: { value }, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  },

  async saveSystemUptime(value) {
    return supabaseService.saveSystemConfig('systemUptime', value);
  },

  async bootstrapSystemAdmins() { /* handled via profiles.role */ },

  async getSystemConfig(key) {
    const { data } = await supabase.from('system_config').select('value').eq('key', key).maybeSingle();
    return data?.value?.value ?? data?.value ?? null;
  },

  onSystemConfigChange(key, callback) {
    return realtimeListen('system_config', `key=eq.${key}`, callback, {
      fetcher: async () => {
        const val = await supabaseService.getSystemConfig(key);
        return val;
      },
    });
  },

  // ──────────────────────────────────────────────────────────
  // MIGRATIONS & HELPERS
  // ──────────────────────────────────────────────────────────

  async migrateFromLocalStorage() { /* no-op */ },
  async migrateLeaveBalances() { return { success: true, updated: 0, skipped: 0 }; },

  async testConnection() {
    try {
      const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      return { success: true, message: 'Connected to Supabase', databaseName: 'supabase', documentsCount: count };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },
};

// ════════════════════════════════════════════════════════════
// Data Shape Transformers
// ════════════════════════════════════════════════════════════

function leaveToV3(r) {
  return {
    id: r.id,
    employeeEmail: r.user?.email || '',
    employeeName: r.user?.full_name || '',
    startDate: r.start_date,
    endDate: r.end_date,
    type: r.type,
    status: r.status,
    reason: r.reason,
    notes: r.reason,
    history: r.history || [],
    managerNotes: r.manager_notes,
    submittedDate: r.created_at,
    reviewedDate: r.reviewed_at,
    cancelledAt: r.cancelled_at,
    archived: r.archived || false,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function clientToV3(c) {
  return {
    id: c.id,
    clientName: c.client_name || c.name,
    name: c.name,
    clientNumber: c.client_number ? `CLT-${c.client_number}` : '',
    status: c.status,
    assignedManager: c.assigned_manager_email || c.manager?.email || '',
    assignedManagerName: c.manager?.full_name || '',
    platform: c.platform,
    packageSize: c.package_size || c.posts_per_month,
    postsPerMonth: c.posts_per_month,
    postsUsed: c.posts_used || 0,
    postsRemaining: c.posts_remaining || 0,
    postsUsedByPlatform: c.posts_used_by_platform || {},
    postsRemainingByPlatform: c.posts_remaining_by_platform || {},
    platforms: c.platforms || {},
    instagramHandle: c.instagram_handle || '',
    instagram_handle: c.instagram_handle || '',
    facebookPage: c.facebook_page || '',
    monthlyValue: c.monthly_value,
    monthly_value: c.monthly_value,
    notes: c.notes,
    profilePhoto: c.profile_photo || c.logo_url,
    logo_url: c.logo_url,
    health_status: c.health_status,
    health_score: c.health_score,
    contract_start: c.contract_start,
    contract_end: c.contract_end,
    onboarded_at: c.onboarded_at,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}

function ticketToV3(t) {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    category: t.category,
    priority: t.priority,
    status: t.status,
    submittedDate: t.created_at,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    resolvedAt: t.resolved_at,
  };
}

function notifToV3(n) {
  return {
    id: n.id,
    userEmail: '', // Not stored directly, but user_id lookup available
    type: n.type,
    title: n.title,
    message: n.body,
    link: n.link,
    read: n.read,
    count: 1,
    createdAt: n.created_at,
    updatedAt: n.created_at,
  };
}

function igReportToV3(r) {
  return {
    id: r.id,
    clientId: r.client_id,
    clientName: r.client?.name || r.client?.client_name || r.client_name || '',
    userId: r.created_by_id,
    publicLinkId: r.public_link_id,
    title: r.title || '',
    startDate: r.period_start,
    endDate: r.period_end,
    year: r.year,
    month: r.month,
    metrics: r.metrics || {},
    postLinks: r.post_links || [],
    screenshots: r.screenshot_urls || [],
    archived: r.archived || false,
    is_public: r.is_public || false,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function canvasToV3(c) {
  return {
    id: c.id,
    userId: c.owner_id,
    title: c.title,
    emoji: c.emoji || '📝',
    blocks: c.content || [],
    sharedWith: c.shared_with || [],
    sharedWithEmails: c.shared_with_emails || [],
    created: c.created_at,
    updated: c.updated_at,
  };
}

function announcementToV3(a) {
  return {
    id: a.id,
    title: a.title,
    body: a.body,
    message: a.body,
    priority: a.priority,
    active: a.is_active,
    dismissible: true,
    targetRoles: a.target_roles || [],
    expiresAt: a.expires_at,
    createdAt: a.created_at,
    updatedAt: a.updated_at,
  };
}

export default firestoreService;
