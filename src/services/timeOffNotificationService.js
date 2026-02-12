/**
 * Time Off Notification Service
 *
 * New leave requests notify only Michelle and Matthew (email + in-app).
 */

import { firestoreService } from './firestoreService';
import { LEAVE_REQUEST_NOTIFY_ADMIN_EMAILS } from '../utils/vancouverTime';

export const timeOffNotifications = {
  /**
   * Notify only Michelle and Matthew when a new time off request is submitted (in-app).
   * Email to same two is handled by cloud function sendTimeOffRequestEmail.
   */
  async notifyNewRequest(request) {
    try {
      const admins = await firestoreService.getTimeOffAdmins();
      const notifyEmails = new Set(LEAVE_REQUEST_NOTIFY_ADMIN_EMAILS);
      const recipients = admins.filter((a) => notifyEmails.has((a.email || a.id || '').toLowerCase()));

      const promises = recipients.map((admin) =>
        firestoreService.createNotification({
          userEmail: admin.email || admin.id,
          type: 'time_off_request',
          title: 'New Time Off Request',
          message: `${request.employeeName || request.employeeEmail} requested ${request.days || '?'} days of ${request.type || 'time off'}`,
          link: '/hr-calendar',
          read: false,
          metadata: {
            requestId: request.id,
            employeeEmail: request.employeeEmail,
            requestType: request.type,
            startDate: request.startDate,
            endDate: request.endDate
          }
        })
      );

      await Promise.all(promises);
      console.log('✅ Notified', recipients.length, 'leave admins (Michelle & Matthew) of new request');
      return { success: true, notifiedCount: recipients.length };
    } catch (error) {
      console.error('❌ Error notifying admins:', error);
      return { success: false, error };
    }
  },

  /**
   * Notify employee when their request is approved
   */
  async notifyApproved(request, approvedBy) {
    try {
      await firestoreService.createNotification({
        userEmail: request.employeeEmail,
        type: 'time_off_approved',
        title: 'Time Off Approved',
        message: `Your ${request.type || 'time off'} request for ${request.startDate} to ${request.endDate} has been approved`,
        link: '/my-time-off',
        read: false,
        metadata: {
          requestId: request.id,
          approvedBy,
          requestType: request.type,
          startDate: request.startDate,
          endDate: request.endDate
        }
      });
      console.log('✅ Notified employee of approval:', request.employeeEmail);
      return { success: true };
    } catch (error) {
      console.error('❌ Error notifying employee of approval:', error);
      return { success: false, error };
    }
  },

  /**
   * Notify employee when their request is rejected
   */
  async notifyRejected(request, rejectedBy, reason = null) {
    try {
      const reasonText = reason ? ` Reason: ${reason}` : '';
      await firestoreService.createNotification({
        userEmail: request.employeeEmail,
        type: 'time_off_rejected',
        title: 'Time Off Request Rejected',
        message: `Your ${request.type || 'time off'} request for ${request.startDate} to ${request.endDate} was rejected.${reasonText}`,
        link: '/my-time-off',
        read: false,
        metadata: {
          requestId: request.id,
          rejectedBy,
          reason,
          requestType: request.type,
          startDate: request.startDate,
          endDate: request.endDate
        }
      });
      console.log('✅ Notified employee of rejection:', request.employeeEmail);
      return { success: true };
    } catch (error) {
      console.error('❌ Error notifying employee of rejection:', error);
      return { success: false, error };
    }
  },

  /**
   * Notify employee when their approved request is cancelled by admin
   */
  async notifyCancelled(request, cancelledBy, reason = null) {
    try {
      // Only notify if the employee didn't cancel it themselves
      if (request.employeeEmail === cancelledBy) {
        console.log('ℹ️ Employee cancelled own request, no notification needed');
        return { success: true, skipped: true };
      }

      const reasonText = reason ? ` Reason: ${reason}` : '';
      await firestoreService.createNotification({
        userEmail: request.employeeEmail,
        type: 'time_off_cancelled',
        title: 'Time Off Cancelled',
        message: `Your approved ${request.type || 'time off'} for ${request.startDate} to ${request.endDate} was cancelled by an administrator.${reasonText}`,
        link: '/my-time-off',
        read: false,
        metadata: {
          requestId: request.id,
          cancelledBy,
          reason,
          requestType: request.type,
          startDate: request.startDate,
          endDate: request.endDate
        }
      });
      console.log('✅ Notified employee of cancellation:', request.employeeEmail);
      return { success: true };
    } catch (error) {
      console.error('❌ Error notifying employee of cancellation:', error);
      return { success: false, error };
    }
  },

  /**
   * Notify requester when their approved leave request is edited by an admin (in-app).
   * Email is sent by cloud function on leave_requests document update.
   */
  async notifyLeaveRequestEdited(request, editedBy, changesSummary = '') {
    try {
      await firestoreService.createNotification({
        userEmail: request.employeeEmail,
        type: 'time_off_edited',
        title: 'Leave Request Updated',
        message: `Your approved leave request was updated by an administrator.${changesSummary ? ` ${changesSummary}` : ''}`,
        link: '/my-time-off',
        read: false,
        metadata: {
          requestId: request.id,
          editedBy,
          requestType: request.type,
          startDate: request.startDate,
          endDate: request.endDate,
          days: request.days
        }
      });
      console.log('✅ Notified employee of leave request edit:', request.employeeEmail);
      return { success: true };
    } catch (error) {
      console.error('❌ Error notifying employee of edit:', error);
      return { success: false, error };
    }
  },

  /**
   * Notify employee of balance change (when admin edits their balances)
   */
  async notifyBalanceChange(userEmail, changedBy, balanceType, oldValue, newValue) {
    try {
      await firestoreService.createNotification({
        userEmail,
        type: 'leave_balance_updated',
        title: 'Leave Balance Updated',
        message: `Your ${balanceType} days have been updated from ${oldValue} to ${newValue} by an administrator`,
        link: '/my-time-off',
        read: false,
        metadata: {
          changedBy,
          balanceType,
          oldValue,
          newValue
        }
      });
      console.log('✅ Notified employee of balance change:', userEmail);
      return { success: true };
    } catch (error) {
      console.error('❌ Error notifying balance change:', error);
      return { success: false, error };
    }
  }
};

export default timeOffNotifications;
