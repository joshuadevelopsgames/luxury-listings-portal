import { firestoreService } from './firestoreService';

/**
 * Reminder Service
 * Checks for due reminders and sends notifications
 */
class ReminderService {
  constructor() {
    this.checkInterval = null;
  }

  /**
   * Start checking for due reminders
   */
  startReminderCheck(userEmail) {
    // Check every minute
    this.checkInterval = setInterval(() => {
      this.checkDueReminders(userEmail);
    }, 60000); // 60 seconds

    // Check immediately on start
    this.checkDueReminders(userEmail);
  }

  /**
   * Stop checking for reminders
   */
  stopReminderCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Check for due reminders and send notifications
   */
  async checkDueReminders(userEmail) {
    try {
      const tasks = await firestoreService.getTasksByUser(userEmail);
      const now = new Date();

      for (const task of tasks) {
        // Skip completed tasks
        if (task.status === 'completed') continue;
        
        // Skip tasks without reminders or due date
        if (!task.reminders || task.reminders.length === 0 || !task.due_date) continue;

        for (const reminder of task.reminders) {
          if (reminder.sent) continue; // Already sent

          const shouldSend = this.shouldSendReminder(task, reminder, now);
          
          if (shouldSend) {
            await this.sendReminderNotification(task, reminder, userEmail);
            
            // Mark reminder as sent
            const updatedReminders = task.reminders.map(r => 
              r.id === reminder.id ? { ...r, sent: true, sentAt: now.toISOString() } : r
            );
            
            await firestoreService.updateTask(task.id, { reminders: updatedReminders });
          }
        }
      }
    } catch (error) {
      console.error('Error checking reminders:', error);
    }
  }

  /**
   * Determine if a reminder should be sent
   */
  shouldSendReminder(task, reminder, now) {
    const dueDate = new Date(task.due_date);

    if (reminder.type === 'relative') {
      // Calculate when to send based on minutes before due date
      const sendTime = new Date(dueDate.getTime() - (reminder.minutes * 60000));
      
      // Send if current time is past send time (within 2 minute window)
      const timeDiff = now.getTime() - sendTime.getTime();
      return timeDiff >= 0 && timeDiff < 120000; // Within 2 minutes
    } else if (reminder.type === 'absolute') {
      // Send at specific time
      const reminderTime = new Date(reminder.datetime);
      const timeDiff = now.getTime() - reminderTime.getTime();
      return timeDiff >= 0 && timeDiff < 120000;
    }

    return false;
  }

  /**
   * Send reminder notification
   */
  async sendReminderNotification(task, reminder, userEmail) {
    try {
      let message = `Reminder: ${task.title}`;
      
      if (task.due_date) {
        const dueDate = new Date(task.due_date);
        if (reminder.minutes === 0) {
          message += ` is due now!`;
        } else if (reminder.minutes < 60) {
          message += ` is due in ${reminder.minutes} minutes`;
        } else if (reminder.minutes < 1440) {
          message += ` is due in ${Math.floor(reminder.minutes / 60)} hour(s)`;
        } else {
          message += ` is due in ${Math.floor(reminder.minutes / 1440)} day(s)`;
        }
      }

      // Create notification in Firestore
      await firestoreService.createNotification({
        userEmail: userEmail,
        type: 'task_reminder',
        title: '🔔 Task Reminder',
        message: message,
        link: '/tasks',
        read: false,
        taskId: task.id
      });

      // Browser notification if permission granted
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('🔔 Task Reminder', {
          body: message,
          icon: '/Luxury-listings-logo-CLR.png',
          tag: `task-${task.id}`,
          requireInteraction: false
        });
      }

      console.log('✅ Reminder sent for task:', task.id);
    } catch (error) {
      console.error('Error sending reminder:', error);
    }
  }

  /**
   * Request notification permission
   */
  async requestNotificationPermission() {
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }
      return Notification.permission === 'granted';
    }
    return false;
  }

  /**
   * Check if notifications are supported and enabled
   */
  areNotificationsEnabled() {
    return 'Notification' in window && Notification.permission === 'granted';
  }
}

export const reminderService = new ReminderService();

