export const createPageUrl = (path, params = {}) => {
  let url = path;
  
  // Add query parameters
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.append(key, value);
    }
  });
  
  const queryString = queryParams.toString();
  if (queryString) {
    url += `?${queryString}`;
  }
  
  return url;
};

import { formatInVancouver } from './vancouverTime';

export const formatDate = (date, format = 'MMM d, yyyy') => {
  if (!date) return '';
  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return '';
    return formatInVancouver(dateObj, { dateStyle: 'medium' });
  } catch (error) {
    return '';
  }
};

export { getVancouverToday, formatInVancouver } from './vancouverTime';

export const formatTime = (minutes) => {
  if (!minutes) return 'N/A';
  
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
};

export const getInitials = (firstName, lastName) => {
  const first = firstName ? firstName.charAt(0).toUpperCase() : '';
  const last = lastName ? lastName.charAt(0).toUpperCase() : '';
  return `${first}${last}`;
};

export const classNames = (...classes) => {
  return classes.filter(Boolean).join(' ');
};

