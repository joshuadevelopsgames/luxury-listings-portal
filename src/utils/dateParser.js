import * as chrono from 'chrono-node';

/**
 * Parse natural language date input into a date string
 * Examples:
 * - "tomorrow" -> "2024-01-16"
 * - "next monday" -> "2024-01-22"
 * - "in 3 days" -> "2024-01-18"
 * - "jan 15" -> "2024-01-15"
 */
export function parseNaturalLanguageDate(input) {
  if (!input || typeof input !== 'string') return null;

  // If it's already a valid date string (YYYY-MM-DD), return it
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input;
  }

  try {
    const parsed = chrono.parseDate(input);
    if (parsed) {
      // Convert to YYYY-MM-DD format
      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const day = String(parsed.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch (error) {
    console.error('Error parsing date:', error);
  }

  return null;
}

/**
 * Parse recurring task pattern from natural language
 * Examples:
 * - "every day" -> { pattern: 'daily', interval: 1 }
 * - "every week" -> { pattern: 'weekly', interval: 1 }
 * - "every 2 weeks" -> { pattern: 'weekly', interval: 2 }
 * - "every monday" -> { pattern: 'weekly', interval: 1, daysOfWeek: [1] }
 */
export function parseRecurringPattern(input) {
  if (!input || typeof input !== 'string') return null;

  const text = input.toLowerCase().trim();

  // Daily patterns
  if (text.match(/every\s+day|daily/)) {
    return { pattern: 'daily', interval: 1 };
  }

  // Weekly patterns
  const weeklyMatch = text.match(/every\s+(\d+)?\s*weeks?/);
  if (weeklyMatch) {
    return { 
      pattern: 'weekly', 
      interval: weeklyMatch[1] ? parseInt(weeklyMatch[1]) : 1 
    };
  }

  // Specific days of week
  const days = {
    'monday': 1, 'mon': 1,
    'tuesday': 2, 'tue': 2, 'tues': 2,
    'wednesday': 3, 'wed': 3,
    'thursday': 4, 'thu': 4, 'thur': 4, 'thurs': 4,
    'friday': 5, 'fri': 5,
    'saturday': 6, 'sat': 6,
    'sunday': 0, 'sun': 0
  };

  for (const [dayName, dayNum] of Object.entries(days)) {
    if (text.includes(`every ${dayName}`)) {
      return { 
        pattern: 'weekly', 
        interval: 1, 
        daysOfWeek: [dayNum] 
      };
    }
  }

  // Monthly patterns
  const monthlyMatch = text.match(/every\s+(\d+)?\s*months?/);
  if (monthlyMatch) {
    return { 
      pattern: 'monthly', 
      interval: monthlyMatch[1] ? parseInt(monthlyMatch[1]) : 1 
    };
  }

  // Yearly patterns
  if (text.match(/every\s+year|annually|yearly/)) {
    return { pattern: 'yearly', interval: 1 };
  }

  return null;
}

/**
 * Format a date contextually (Todoist-style)
 */
export function formatContextualDate(dateString) {
  if (!dateString) return null;

  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  date.setHours(0, 0, 0, 0);

  if (date.getTime() === today.getTime()) {
    return { text: 'Today', color: 'text-green-600', isOverdue: false };
  } else if (date.getTime() === tomorrow.getTime()) {
    return { text: 'Tomorrow', color: 'text-orange-600', isOverdue: false };
  } else if (date.getTime() === yesterday.getTime()) {
    return { text: 'Yesterday', color: 'text-red-600', isOverdue: true };
  } else if (date < today) {
    const daysOverdue = Math.floor((today - date) / (1000 * 60 * 60 * 24));
    return { 
      text: `${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue`, 
      color: 'text-red-600', 
      isOverdue: true 
    };
  } else if (date < new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)) {
    // Within next 7 days - show day name
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return { text: days[date.getDay()], color: 'text-amber-600', isOverdue: false };
  } else if (date.getFullYear() === today.getFullYear()) {
    // This year - show month and day
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return { 
      text: `${months[date.getMonth()]} ${date.getDate()}`, 
      color: 'text-gray-600', 
      isOverdue: false 
    };
  } else {
    // Future years - show full date
    return { 
      text: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), 
      color: 'text-gray-600', 
      isOverdue: false 
    };
  }
}

/**
 * Get suggestions for date input
 */
export function getDateSuggestions() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  return [
    { label: 'Today', value: 'today', date: formatDate(today) },
    { label: 'Tomorrow', value: 'tomorrow', date: formatDate(tomorrow) },
    { label: 'Next week', value: 'next week', date: formatDate(nextWeek) },
    { label: 'No date', value: '', date: null }
  ];
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

