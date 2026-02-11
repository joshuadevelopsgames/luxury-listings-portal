/**
 * Post Log Reminder Service (SMM post logging)
 *
 * Weekly target = monthly posts remaining / 4 (required posts this week).
 * - User: On Friday, remind SMMs when they haven’t met the weekly target (posts this week < required).
 * - Admin: (A) <50% of weekly target logged; (B) last week of month and ≤30% of monthly posts logged (70%+ not logged).
 */

import { startOfWeek, endOfWeek, getDay, endOfMonth, differenceInDays } from 'date-fns';
import { firestoreService } from './firestoreService';

const USER_REMINDER_STORAGE_KEY = 'post_log_reminder_week_sent';
const ADMIN_REMINDER_STORAGE_KEY = 'post_log_admin_reminder_week_sent';
const ADMIN_MONTH_KEY = 'post_log_admin_reminder_month_sent';
const WEEK_STARTS_ON = 1; // Monday

function getWeekKey(date = new Date()) {
  const start = startOfWeek(date, { weekStartsOn: WEEK_STARTS_ON });
  const y = start.getFullYear();
  const m = String(start.getMonth() + 1).padStart(2, '0');
  const d = String(start.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getMonthKey(date = new Date()) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function parseCompletedDate(completedDate) {
  if (!completedDate) return null;
  const str = typeof completedDate === 'string' ? completedDate.split('T')[0] : null;
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

class PostLogReminderService {
  constructor() {
    this.hasCheckedUserThisSession = false;
    this.hasCheckedAdminThisSession = false;
  }

  isFriday() {
    return getDay(new Date()) === 5;
  }

  isLastWeekOfMonth() {
    const now = new Date();
    const lastDay = endOfMonth(now);
    return differenceInDays(lastDay, now) <= 6;
  }

  getWeekBounds(date = new Date()) {
    return {
      start: startOfWeek(date, { weekStartsOn: WEEK_STARTS_ON }),
      end: endOfWeek(date, { weekStartsOn: WEEK_STARTS_ON })
    };
  }

  async getAssignedClients(userEmail, userId) {
    try {
      const allClients = await firestoreService.getClients();
      const normalizedEmail = (userEmail || '').trim().toLowerCase();
      const normalizedUid = (userId || '').trim().toLowerCase();
      return allClients.filter(client => {
        const am = (client.assignedManager || '').trim().toLowerCase();
        if (!am) return false;
        return am === normalizedEmail || (normalizedUid && am === normalizedUid);
      });
    } catch (error) {
      console.error('Post log reminder: getAssignedClients', error);
      return [];
    }
  }

  /** Post-log tasks this week for this user, grouped by clientId. Uses getTasksByUser and filters in memory. */
  async getPostsThisWeekByClient(userEmail) {
    const { start, end } = this.getWeekBounds();
    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);
    try {
      const tasks = await firestoreService.getTasksByUser(userEmail);
      const byClient = {};
      for (const task of tasks) {
        if (task.task_type !== 'post_log' && !task.labels?.includes('client-post')) continue;
        const clientId = task.clientId || (task.labels?.find(l => l.startsWith('client-') && l !== 'client-post')?.replace('client-', ''));
        if (!clientId) continue;
        const d = parseCompletedDate(task.completed_date);
        if (!d || d < start || d > end) continue;
        byClient[clientId] = (byClient[clientId] || 0) + 1;
      }
      return byClient;
    } catch (error) {
      console.error('Post log reminder: getPostsThisWeekByClient', error);
      return {};
    }
  }

  /** Required posts this week = monthly posts remaining / 4 (SMM post logging only). */
  getRequiredPostsThisWeek(client) {
    const remaining = Math.max(0, Number(client?.postsRemaining) ?? 0);
    return remaining / 4;
  }

  /** Clients behind weekly target: postsRemaining > 0 and posts this week < (threshold * required). threshold 1.0 = user/banner, 0.5 = admin. */
  async getClientsBehindWeeklyTarget(userEmail, userId, threshold = 0.5) {
    const clients = await this.getAssignedClients(userEmail, userId);
    const postsByClient = await this.getPostsThisWeekByClient(userEmail);
    const behind = [];
    for (const client of clients) {
      const required = this.getRequiredPostsThisWeek(client);
      if (required <= 0) continue;
      const logged = postsByClient[client.id] || 0;
      if (logged < threshold * required) {
        behind.push({ ...client, postsThisWeek: logged, requiredThisWeek: required });
      }
    }
    return behind;
  }

  /** Clients where ≤30% of monthly posts logged in last week of month (70%+ not logged). */
  async getClientsBehindMonthlyTarget(userEmail, userId) {
    if (!this.isLastWeekOfMonth()) return [];
    const clients = await this.getAssignedClients(userEmail, userId);
    const packageSize = (c) => Math.max(0, Number(c?.packageSize) ?? 0);
    const postsUsed = (c) => Math.max(0, Number(c?.postsUsed) ?? 0);
    return clients.filter(c => {
      const pkg = packageSize(c);
      if (pkg === 0) return false;
      return postsUsed(c) / pkg <= 0.30;
    });
  }

  wasUserReminderSentThisWeek(userEmail) {
    try {
      return localStorage.getItem(`${USER_REMINDER_STORAGE_KEY}_${userEmail}`) === getWeekKey();
    } catch {
      return false;
    }
  }

  markUserReminderSentThisWeek(userEmail) {
    try {
      localStorage.setItem(`${USER_REMINDER_STORAGE_KEY}_${userEmail}`, getWeekKey());
    } catch (e) {
      console.warn('postLogReminder: markUserReminderSent', e);
    }
  }

  wasAdminReminderSentThisWeek() {
    try {
      return localStorage.getItem(ADMIN_REMINDER_STORAGE_KEY) === getWeekKey();
    } catch {
      return false;
    }
  }

  markAdminReminderSentThisWeek() {
    try {
      localStorage.setItem(ADMIN_REMINDER_STORAGE_KEY, getWeekKey());
    } catch (e) {
      console.warn('postLogReminder: markAdminReminderSent', e);
    }
  }

  wasAdminMonthReminderSentThisMonth() {
    try {
      return localStorage.getItem(ADMIN_MONTH_KEY) === getMonthKey();
    } catch {
      return false;
    }
  }

  markAdminMonthReminderSent() {
    try {
      localStorage.setItem(ADMIN_MONTH_KEY, getMonthKey());
    } catch (e) {
      console.warn('postLogReminder: markAdminMonthReminderSent', e);
    }
  }

  /** For banner: run on Friday. Returns { show, clientNames } for clients that haven’t met weekly target (posts this week < postsRemaining/4). */
  async getBannerState(userEmail, userId) {
    if (!this.isFriday() || !userEmail) return { show: false, clientNames: [] };
    const behind = await this.getClientsBehindWeeklyTarget(userEmail, userId, 1.0);
    const clientNames = behind.map(c => c.clientName || c.name || 'Unnamed client');
    return { show: clientNames.length > 0, clientNames };
  }

  /** Send in-app notification to SMM (once per week, on Friday). */
  async sendUserReminderNotification(userEmail, clientNames) {
    if (!userEmail || clientNames.length === 0) return false;
    const message =
      clientNames.length === 1
        ? `Weekly post target not met for ${clientNames[0]}. Consider logging posts.`
        : `Weekly post target not met for: ${clientNames.slice(0, 5).join(', ')}${clientNames.length > 5 ? ` and ${clientNames.length - 5} more` : ''}. Consider logging posts.`;
    try {
      await firestoreService.createNotification({
        userEmail,
        type: 'post_log_reminder_week',
        title: 'Log your posts',
        message,
        link: '/my-clients',
        read: false,
        metadata: { clientCount: clientNames.length }
      });
      return true;
    } catch (error) {
      console.error('Post log reminder: sendUserReminderNotification', error);
      return false;
    }
  }

  /** Check and send user reminder (Friday, once per week). Call when SMM loads dashboard. */
  async checkAndSendUserReminder(userEmail, userId) {
    if (!userEmail || !this.isFriday()) return { sent: false, clientNames: [] };
    if (this.hasCheckedUserThisSession) return { sent: false, clientNames: [] };
    if (this.wasUserReminderSentThisWeek(userEmail)) return { sent: false, clientNames: [] };
    this.hasCheckedUserThisSession = true;
    const behind = await this.getClientsBehindWeeklyTarget(userEmail, userId, 1.0);
    const clientNames = behind.map(c => c.clientName || c.name || 'Unnamed client');
    if (clientNames.length === 0) return { sent: false, clientNames: [] };
    const sent = await this.sendUserReminderNotification(userEmail, clientNames);
    if (sent) this.markUserReminderSentThisWeek(userEmail);
    return { sent, clientNames };
  }

  /** Get team members who need support: (A) <50% weekly posts, (B) last week of month and ≤50% monthly. */
  async getTeamMembersNeedingSupport() {
    const users = await firestoreService.getApprovedUsers();
    const admins = await firestoreService.getTimeOffAdmins();
    const adminEmails = new Set((admins || []).map(a => (a.email || a.id || '').toLowerCase()).filter(Boolean));
    const list = [];
    for (const user of users || []) {
      const email = (user.email || user.id || '').trim().toLowerCase();
      if (!email || adminEmails.has(email)) continue;
      const behindWeekly = await this.getClientsBehindWeeklyTarget(email, user.uid);
      const behindMonthly = await this.getClientsBehindMonthlyTarget(email, user.uid);
      if (behindWeekly.length === 0 && behindMonthly.length === 0) continue;
      const displayName = user.displayName || user.email || email;
      list.push({
        teamMemberEmail: email,
        displayName,
        behindWeekly: behindWeekly.map(c => ({ id: c.id, name: c.clientName || c.name, postsThisWeek: c.postsThisWeek, requiredThisWeek: c.requiredThisWeek })),
        behindMonthly: behindMonthly.map(c => ({ id: c.id, name: c.clientName || c.name }))
      });
    }
    return list;
  }

  /** Notify all time-off admins about team members needing support. */
  async notifyAdminsTeamNeedsSupport(entries) {
    if (!entries || entries.length === 0) return { notified: 0 };
    const admins = await firestoreService.getTimeOffAdmins();
    if (!admins?.length) return { notified: 0 };
    const parts = entries.map(e => {
      const weekly = e.behindWeekly.length ? `${e.displayName}: <50% of weekly target (posts remaining ÷ 4) for ${e.behindWeekly.map(c => c.name).join(', ')}` : null;
      const monthly = e.behindMonthly.length ? `${e.displayName}: ≤30% of monthly posts logged, 70%+ not logged (last week of month) for ${e.behindMonthly.map(c => c.name).join(', ')}` : null;
      return [weekly, monthly].filter(Boolean).join('. ');
    });
    const message = parts.join('\n');
    const title = 'Team members may need support (post logging)';
    try {
      for (const admin of admins) {
        const to = admin.email || admin.id;
        if (!to) continue;
        await firestoreService.createNotification({
          userEmail: to,
          type: 'team_post_log_support',
          title,
          message,
          link: '/team',
          read: false,
          metadata: { entryCount: entries.length }
        });
      }
      return { notified: admins.length };
    } catch (error) {
      console.error('Post log reminder: notifyAdminsTeamNeedsSupport', error);
      return { notified: 0 };
    }
  }

  /** Run on admin dashboard load: Friday = weekly check; last week of month = monthly check. Once per week/month. */
  async checkAndSendAdminReminders() {
    if (this.hasCheckedAdminThisSession) return { sent: false };
    const isFriday = this.isFriday();
    const isLastWeek = this.isLastWeekOfMonth();
    if (!isFriday && !isLastWeek) return { sent: false };
    const weekSent = this.wasAdminReminderSentThisWeek();
    const monthSent = this.wasAdminMonthReminderSentThisMonth();
    if (isFriday && weekSent && (!isLastWeek || monthSent)) return { sent: false };
    if (isLastWeek && !isFriday && monthSent) return { sent: false };
    this.hasCheckedAdminThisSession = true;
    const entries = await this.getTeamMembersNeedingSupport();
    if (entries.length === 0) return { sent: false };
    const { notified } = await this.notifyAdminsTeamNeedsSupport(entries);
    if (isFriday) this.markAdminReminderSentThisWeek();
    if (isLastWeek) this.markAdminMonthReminderSent();
    return { sent: notified > 0, notified };
  }

  resetSessionChecks() {
    this.hasCheckedUserThisSession = false;
    this.hasCheckedAdminThisSession = false;
  }
}

export const postLogReminderService = new PostLogReminderService();
export default postLogReminderService;
