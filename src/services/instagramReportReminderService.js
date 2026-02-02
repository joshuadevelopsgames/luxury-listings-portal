/**
 * Instagram Report Reminder Service
 * 
 * On the 1st of each month, checks if users have created reports for their clients.
 * Sends a single grouped notification for all clients that need reports.
 */

import { firestoreService } from './firestoreService';

const REMINDER_STORAGE_KEY = 'instagram_report_reminder_sent';

class InstagramReportReminderService {
  constructor() {
    this.hasCheckedThisSession = false;
  }

  /**
   * Check if today is the 1st of the month
   */
  isFirstOfMonth() {
    return new Date().getDate() === 1;
  }

  /**
   * Get the current month key (e.g., "2026-02" for February 2026)
   */
  getCurrentMonthKey() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Check if reminder was already sent this month (per user)
   */
  wasReminderSentThisMonth(userEmail) {
    try {
      const key = `${REMINDER_STORAGE_KEY}_${userEmail}`;
      const stored = localStorage.getItem(key);
      return stored === this.getCurrentMonthKey();
    } catch {
      return false;
    }
  }

  /**
   * Mark reminder as sent for this month
   */
  markReminderSent(userEmail) {
    try {
      const key = `${REMINDER_STORAGE_KEY}_${userEmail}`;
      localStorage.setItem(key, this.getCurrentMonthKey());
    } catch (error) {
      console.warn('Could not save reminder state:', error);
    }
  }

  /**
   * Get clients assigned to a user
   */
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
      console.error('Error getting assigned clients:', error);
      return [];
    }
  }

  /**
   * Get clients that don't have a report for the current month
   */
  async getClientsNeedingReports(userEmail, userId) {
    const assignedClients = await this.getAssignedClients(userEmail, userId);
    if (assignedClients.length === 0) return [];

    // Get all reports for the current user
    const reports = await firestoreService.getInstagramReports();
    
    // Get current month boundaries
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Find which clients have reports created this month
    const clientsWithReportsThisMonth = new Set();
    
    for (const report of reports) {
      if (!report.clientId) continue;
      
      // Check if report was created this month
      let createdAt = report.createdAt?.toDate?.() || new Date(report.createdAt);
      if (createdAt >= monthStart && createdAt <= monthEnd) {
        clientsWithReportsThisMonth.add(report.clientId);
      }
      
      // Also check if report's date range covers this month
      let startDate = report.startDate?.toDate?.() || (report.startDate ? new Date(report.startDate) : null);
      if (startDate && startDate >= monthStart && startDate <= monthEnd) {
        clientsWithReportsThisMonth.add(report.clientId);
      }
    }

    // Return clients that don't have reports this month
    return assignedClients.filter(client => !clientsWithReportsThisMonth.has(client.id));
  }

  /**
   * Send grouped notification for clients needing reports
   */
  async sendReminderNotification(userEmail, clientsNeedingReports) {
    if (!userEmail || clientsNeedingReports.length === 0) return;

    const clientNames = clientsNeedingReports
      .map(c => c.clientName || c.name || 'Unnamed Client')
      .slice(0, 5); // Limit to first 5 for readability
    
    const extraCount = clientsNeedingReports.length - 5;
    
    let message;
    if (clientsNeedingReports.length === 1) {
      message = `${clientNames[0]} needs an Instagram report for this month.`;
    } else if (extraCount > 0) {
      message = `${clientNames.join(', ')} and ${extraCount} more client(s) need Instagram reports for this month.`;
    } else {
      message = `${clientNames.join(', ')} need Instagram reports for this month.`;
    }

    try {
      await firestoreService.createNotification({
        userEmail,
        type: 'instagram_report_reminder',
        title: 'Monthly Instagram Reports Due',
        message,
        link: '/instagram-reports',
        read: false,
        metadata: {
          clientCount: clientsNeedingReports.length,
          clientIds: clientsNeedingReports.map(c => c.id),
          month: this.getCurrentMonthKey()
        }
      });
      
      console.log(`✅ Instagram report reminder sent for ${clientsNeedingReports.length} clients`);
      return true;
    } catch (error) {
      console.error('❌ Error sending Instagram report reminder:', error);
      return false;
    }
  }

  /**
   * Main check - runs on login and checks if reminders should be sent
   */
  async checkAndSendReminders(userEmail, userId) {
    // Only run once per session
    if (this.hasCheckedThisSession) {
      return { skipped: true, reason: 'Already checked this session' };
    }
    this.hasCheckedThisSession = true;

    // Only run on the 1st of the month
    if (!this.isFirstOfMonth()) {
      return { skipped: true, reason: 'Not first of month' };
    }

    // Check if already sent this month
    if (this.wasReminderSentThisMonth(userEmail)) {
      return { skipped: true, reason: 'Already sent this month' };
    }

    // Get clients that need reports
    const clientsNeedingReports = await this.getClientsNeedingReports(userEmail, userId);
    
    if (clientsNeedingReports.length === 0) {
      // Mark as sent even if no clients need reports (to avoid re-checking)
      this.markReminderSent(userEmail);
      return { skipped: true, reason: 'No clients need reports' };
    }

    // Send the grouped notification
    const sent = await this.sendReminderNotification(userEmail, clientsNeedingReports);
    
    if (sent) {
      this.markReminderSent(userEmail);
    }

    return { 
      sent, 
      clientsNotified: clientsNeedingReports.length,
      clients: clientsNeedingReports.map(c => c.clientName || c.name)
    };
  }

  /**
   * Force check (for testing or manual trigger) - bypasses date check
   */
  async forceCheck(userEmail, userId) {
    const clientsNeedingReports = await this.getClientsNeedingReports(userEmail, userId);
    
    if (clientsNeedingReports.length === 0) {
      return { 
        sent: false, 
        clientsNotified: 0,
        message: 'All clients have reports this month'
      };
    }

    const sent = await this.sendReminderNotification(userEmail, clientsNeedingReports);
    
    return { 
      sent, 
      clientsNotified: clientsNeedingReports.length,
      clients: clientsNeedingReports.map(c => c.clientName || c.name)
    };
  }

  /**
   * Reset session check (useful for testing)
   */
  resetSessionCheck() {
    this.hasCheckedThisSession = false;
  }
}

export const instagramReportReminderService = new InstagramReportReminderService();
export default instagramReportReminderService;
