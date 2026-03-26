/**
 * Instagram Report Reminder Service
 * All dates: Vancouver, Canada (America/Vancouver).
 *
 * During the last week of each month this service:
 *   • Creates a task (in the Tasks system) for every social_media_manager
 *     reminding them to complete Instagram reports for their assigned clients.
 *   • When a social_media_manager logs in, it creates a task scoped to that user.
 *   • When an admin logs in, it sweeps ALL social_media_manager accounts and
 *     creates/updates tasks for each one who still has outstanding reports.
 *
 * The task is only created once per month per user (tracked in localStorage).
 */

import { supabaseService } from './supabaseService';
import { getVancouverMonthKey, isVancouverLastWeekOfMonth } from '../utils/vancouverTime';

const REMINDER_STORAGE_KEY = 'instagram_report_task_created';
const SYSTEM_SENDER = 'system@luxury-listings.com';

// Roles that trigger the reminder check
const SMM_ROLE = 'social_media_manager';

class InstagramReportReminderService {
  constructor() {
    this.hasCheckedThisSession = false;
  }

  isEndOfMonth() {
    return isVancouverLastWeekOfMonth();
  }

  getCurrentMonthKey() {
    return getVancouverMonthKey();
  }

  /** yyyy-MM-dd for the last day of the current month */
  getLastDayOfMonth() {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return lastDay.toISOString().split('T')[0];
  }

  /** Return a human-readable month label like "March 2026" */
  getMonthLabel() {
    return new Date().toLocaleString('en-CA', { month: 'long', year: 'numeric', timeZone: 'America/Vancouver' });
  }

  wasTaskCreatedThisMonth(userEmail) {
    try {
      const key = `${REMINDER_STORAGE_KEY}_${userEmail}`;
      return localStorage.getItem(key) === this.getCurrentMonthKey();
    } catch { return false; }
  }

  markTaskCreated(userEmail) {
    try {
      localStorage.setItem(`${REMINDER_STORAGE_KEY}_${userEmail}`, this.getCurrentMonthKey());
    } catch (error) {
      console.warn('Could not save reminder state:', error);
    }
  }

  /** Get active clients assigned to a specific user email or uid */
  async getAssignedClients(userEmail, userId) {
    try {
      const allClients = await supabaseService.getClients();
      const normalizedEmail = (userEmail || '').trim().toLowerCase();
      const normalizedUid  = (userId  || '').trim().toLowerCase();
      return allClients.filter(client => {
        const am = (client.assignedManager || '').trim().toLowerCase();
        if (!am) return false;
        return am === normalizedEmail || (normalizedUid && am === normalizedUid);
      });
    } catch { return []; }
  }

  /** Get reports created or dated within the current calendar month */
  async getReportsThisMonth() {
    try {
      const reports  = await supabaseService.getInstagramReports();
      const now      = new Date();
      const mStart   = new Date(now.getFullYear(), now.getMonth(), 1);
      const mEnd     = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      return reports.filter(r => {
        const created = r.createdAt?.toDate?.() || new Date(r.createdAt);
        if (created >= mStart && created <= mEnd) return true;
        const start = r.startDate?.toDate?.() || (r.startDate ? new Date(r.startDate) : null);
        return start && start >= mStart && start <= mEnd;
      });
    } catch { return []; }
  }

  /** Return clients that don't have any report this month */
  async getClientsNeedingReports(userEmail, userId) {
    const [assigned, reportsThisMonth] = await Promise.all([
      this.getAssignedClients(userEmail, userId),
      this.getReportsThisMonth()
    ]);
    if (assigned.length === 0) return [];
    const covered = new Set(reportsThisMonth.map(r => r.clientId).filter(Boolean));
    return assigned.filter(c => !covered.has(c.id));
  }

  /** Build a clean list string for the task description */
  buildClientList(clients) {
    return clients.map(c => `• ${c.clientName || c.name || 'Unnamed Client'}`).join('\n');
  }

  /**
   * Create (or skip if already exists) a task for a given SMM user.
   * Returns true if a task was created.
   */
  async createReminderTask(userEmail, clientsNeeding) {
    if (!userEmail || clientsNeeding.length === 0) return false;

    const monthLabel   = this.getMonthLabel();
    const dueDate      = this.getLastDayOfMonth();
    const clientList   = this.buildClientList(clientsNeeding);
    const clientCount  = clientsNeeding.length;
    const title        = `Create Instagram Reports — ${monthLabel}`;
    const description  =
      `${clientCount} client${clientCount === 1 ? '' : 's'} still ${clientCount === 1 ? 'needs' : 'need'} an Instagram report this month:\n\n` +
      `${clientList}\n\n` +
      `Please complete all reports before the end of ${monthLabel}.`;

    try {
      await supabaseService.addTask({
        title,
        description,
        status: 'todo',
        priority: 3,           // High priority
        assigned_to: userEmail,
        assigned_by: SYSTEM_SENDER,
        task_type: 'instagram_report_reminder',
        due_date: dueDate,
        source: 'system',
      });

      // Also send a notification so it shows up in the notification bell
      await supabaseService.createNotification({
        userEmail,
        type: 'instagram_report_reminder',
        title: `Monthly Instagram Reports Due — ${monthLabel}`,
        message: `You have ${clientCount} client${clientCount === 1 ? '' : 's'} still needing Instagram reports. A task has been created for you.`,
        link: '/tasks',
        read: false,
      });

      console.log(`✅ Report reminder task created for ${userEmail} (${clientCount} clients)`);
      return true;
    } catch (error) {
      console.error('❌ Error creating reminder task:', error);
      return false;
    }
  }

  /**
   * Called when a social_media_manager logs in.
   * Creates a task for the currently logged-in user only.
   */
  async checkForSelf(userEmail, userId) {
    if (this.wasTaskCreatedThisMonth(userEmail)) {
      return { skipped: true, reason: 'Task already created this month' };
    }

    const clientsNeeding = await this.getClientsNeedingReports(userEmail, userId);
    if (clientsNeeding.length === 0) {
      this.markTaskCreated(userEmail);
      return { skipped: true, reason: 'All clients have reports this month' };
    }

    const created = await this.createReminderTask(userEmail, clientsNeeding);
    if (created) this.markTaskCreated(userEmail);
    return { created, clientsNotified: clientsNeeding.length };
  }

  /**
   * Called when an admin logs in.
   * Sweeps ALL social_media_managers and creates tasks for each who has
   * outstanding reports — even if they haven't logged in yet.
   */
  async checkForAllManagers() {
    const adminSweepKey = `${REMINDER_STORAGE_KEY}_admin_sweep`;
    if (this.wasTaskCreatedThisMonth(adminSweepKey)) {
      return { skipped: true, reason: 'Admin sweep already ran this month' };
    }

    let notified = 0;
    let skipped  = 0;

    try {
      const allUsers  = await supabaseService.getApprovedUsers();
      const allClients = await supabaseService.getClients();
      const reportsThisMonth = await this.getReportsThisMonth();
      const covered = new Set(reportsThisMonth.map(r => r.clientId).filter(Boolean));

      const managers = allUsers.filter(u => u.role === SMM_ROLE && u.email);

      for (const manager of managers) {
        const email = manager.email.trim().toLowerCase();
        const uid   = manager.uid || manager.userId || manager.id || '';

        // Find assigned clients with missing reports
        const clientsNeeding = allClients.filter(c => {
          const am = (c.assignedManager || '').trim().toLowerCase();
          const matches = am === email || (uid && am === uid);
          return matches && !covered.has(c.id);
        });

        if (clientsNeeding.length === 0) {
          skipped++;
          continue;
        }

        // Don't double-create if this specific SMM already has a task this month
        if (!this.wasTaskCreatedThisMonth(email)) {
          const created = await this.createReminderTask(email, clientsNeeding);
          if (created) {
            this.markTaskCreated(email);
            notified++;
          }
        } else {
          skipped++;
        }
      }
    } catch (error) {
      console.error('❌ Admin sweep error:', error);
    }

    this.markTaskCreated(adminSweepKey);
    return { created: notified, skipped, isAdminSweep: true };
  }

  /**
   * Main entry point — called from Dashboard on every login.
   *
   * @param {string} userEmail
   * @param {string} userId
   * @param {string} userRole  — 'social_media_manager' | 'admin' | etc.
   */
  async checkAndSendReminders(userEmail, userId, userRole) {
    // Only run once per browser session
    if (this.hasCheckedThisSession) {
      return { skipped: true, reason: 'Already checked this session' };
    }
    this.hasCheckedThisSession = true;

    // Only during the last week of the month
    if (!this.isEndOfMonth()) {
      return { skipped: true, reason: 'Not end of month' };
    }

    if (userRole === 'admin') {
      return this.checkForAllManagers();
    }

    if (userRole === SMM_ROLE) {
      return this.checkForSelf(userEmail, userId);
    }

    return { skipped: true, reason: 'Role not eligible' };
  }

  /**
   * Force-run (bypasses date check, for testing).
   */
  async forceCheck(userEmail, userId) {
    const clientsNeeding = await this.getClientsNeedingReports(userEmail, userId);
    if (clientsNeeding.length === 0) {
      return { created: false, clientsNotified: 0, message: 'All clients have reports this month' };
    }
    const created = await this.createReminderTask(userEmail, clientsNeeding);
    return { created, clientsNotified: clientsNeeding.length };
  }

  resetSessionCheck() {
    this.hasCheckedThisSession = false;
  }
}

export const instagramReportReminderService = new InstagramReportReminderService();
export default instagramReportReminderService;
