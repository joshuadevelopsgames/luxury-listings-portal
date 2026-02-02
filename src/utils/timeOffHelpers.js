/**
 * Time Off Helper Functions
 * 
 * Utility functions for time off request validation, admin detection,
 * and date calculations.
 */

import { differenceInDays, differenceInBusinessDays, isWeekend, addDays, format } from 'date-fns';

// ============================================================================
// ADMIN DETECTION
// ============================================================================

/**
 * Check if user is a time off admin
 */
export const isTimeOffAdmin = (user) => {
  return user?.isTimeOffAdmin === true;
};

/**
 * Check if user can approve a specific request
 */
export const canApproveRequest = (user, request) => {
  return isTimeOffAdmin(user) && request?.status === 'pending';
};

/**
 * Check if user can cancel a request
 * - Admins can cancel any request
 * - Employees can only cancel their own pending requests
 */
export const canCancelRequest = (user, request) => {
  if (isTimeOffAdmin(user)) return true;
  return request?.employeeEmail === user?.email && request?.status === 'pending';
};

// ============================================================================
// DATE CALCULATIONS
// ============================================================================

/**
 * Calculate business days between two dates (excludes weekends)
 */
export const calculateBusinessDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Use date-fns if available, otherwise manual calculation
  if (typeof differenceInBusinessDays === 'function') {
    // Add 1 because we want inclusive counting (both start and end day)
    return differenceInBusinessDays(end, start) + 1;
  }
  
  // Manual fallback calculation
  let count = 0;
  let current = new Date(start);
  
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) { // Not Sunday (0) or Saturday (6)
      count++;
    }
    current = addDays(current, 1);
  }
  
  return count;
};

/**
 * Calculate total days between two dates (includes weekends)
 */
export const calculateTotalDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return differenceInDays(end, start) + 1; // +1 for inclusive counting
};

/**
 * Get days until a date from today
 */
export const getDaysUntil = (targetDate) => {
  if (!targetDate) return 0;
  const target = new Date(targetDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return differenceInDays(target, today);
};

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Minimum notice periods by leave type (in days)
 */
const MIN_NOTICE_DAYS = {
  vacation: 14,    // 2 weeks notice for vacation
  personal: 3,     // 3 days notice for personal
  sick: 0,         // Same day OK for sick
  travel: 14       // 2 weeks for travel
};

/**
 * Validate a leave request before submission
 * Returns { valid: boolean, errors: string[], warnings: string[] }
 */
export const validateLeaveRequest = (request, userBalances, existingRequests = []) => {
  const errors = [];
  const warnings = [];
  
  // Required fields check
  if (!request.startDate) {
    errors.push('Start date is required');
  }
  if (!request.endDate) {
    errors.push('End date is required');
  }
  if (!request.type) {
    errors.push('Leave type is required');
  }
  
  // If basic fields missing, return early
  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }
  
  const startDate = new Date(request.startDate);
  const endDate = new Date(request.endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Date order check
  if (endDate < startDate) {
    errors.push('End date must be after start date');
  }
  
  // Past date check (except for sick leave)
  if (startDate < today && request.type !== 'sick') {
    errors.push('Start date cannot be in the past');
  }
  
  // Calculate requested days
  const requestedDays = calculateBusinessDays(request.startDate, request.endDate);
  
  // Balance check
  const leaveType = request.type;
  if (userBalances && userBalances[leaveType]) {
    const balance = userBalances[leaveType];
    const remaining = balance.remaining ?? (balance.total - balance.used);
    
    if (requestedDays > remaining) {
      errors.push(
        `Insufficient ${leaveType} balance. You have ${remaining} days remaining but requested ${requestedDays} days.`
      );
    }
  }
  
  // Notice period check
  const daysUntilStart = getDaysUntil(request.startDate);
  const minNotice = MIN_NOTICE_DAYS[leaveType] || 0;
  
  if (daysUntilStart < minNotice && request.type !== 'sick') {
    warnings.push(
      `${leaveType.charAt(0).toUpperCase() + leaveType.slice(1)} requests typically require ${minNotice} days notice. You're requesting with ${daysUntilStart} days notice.`
    );
  }
  
  // Overlap check with existing requests
  if (existingRequests && existingRequests.length > 0) {
    const hasOverlap = existingRequests.some(existing => {
      if (existing.status === 'cancelled' || existing.status === 'rejected') {
        return false;
      }
      if (request.id && existing.id === request.id) {
        return false; // Skip self when editing
      }
      
      const existingStart = new Date(existing.startDate);
      const existingEnd = new Date(existing.endDate);
      
      return startDate <= existingEnd && endDate >= existingStart;
    });
    
    if (hasOverlap) {
      errors.push('You already have a pending or approved request that overlaps with these dates.');
    }
  }
  
  // Travel-specific validation
  if (request.isTravel) {
    if (!request.destination) {
      warnings.push('Consider adding a destination for travel requests');
    }
    if (!request.travelPurpose) {
      warnings.push('Consider adding a business purpose for travel requests');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    requestedDays
  };
};

// ============================================================================
// FORMATTING
// ============================================================================

/**
 * Format date range for display
 */
export const formatDateRange = (startDate, endDate) => {
  if (!startDate) return '';
  
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : start;
  
  if (start.getTime() === end.getTime()) {
    return format(start, 'MMM d, yyyy');
  }
  
  // Same month
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${format(start, 'MMM d')} - ${format(end, 'd, yyyy')}`;
  }
  
  // Different months
  return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
};

/**
 * Get status badge color class
 */
export const getStatusColor = (status) => {
  switch (status) {
    case 'approved':
      return 'bg-[#34c759]/10 text-[#34c759]';
    case 'pending':
      return 'bg-[#ff9500]/10 text-[#ff9500]';
    case 'rejected':
      return 'bg-[#ff3b30]/10 text-[#ff3b30]';
    case 'cancelled':
      return 'bg-[#86868b]/10 text-[#86868b]';
    default:
      return 'bg-[#86868b]/10 text-[#86868b]';
  }
};

/**
 * Get leave type display info
 */
export const getLeaveTypeInfo = (type) => {
  const types = {
    vacation: { label: 'Vacation', icon: '🏖️', color: 'text-[#0071e3]' },
    sick: { label: 'Sick Leave', icon: '🏥', color: 'text-[#ff3b30]' },
    personal: { label: 'Personal', icon: '👤', color: 'text-[#5856d6]' },
    travel: { label: 'Business Travel', icon: '✈️', color: 'text-[#ff9500]' }
  };
  return types[type] || { label: type, icon: '📅', color: 'text-[#86868b]' };
};

export default {
  isTimeOffAdmin,
  canApproveRequest,
  canCancelRequest,
  calculateBusinessDays,
  calculateTotalDays,
  getDaysUntil,
  validateLeaveRequest,
  formatDateRange,
  getStatusColor,
  getLeaveTypeInfo
};
