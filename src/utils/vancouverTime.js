/**
 * Site-wide timezone: Vancouver, Canada (America/Vancouver).
 * All "today", date comparisons, and displayed dates/times use Vancouver time.
 */

export const VANCOUVER_TZ = 'America/Vancouver';

/**
 * Get the current date in Vancouver as yyyy-MM-dd
 */
export function getVancouverToday() {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: VANCOUVER_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = dtf.formatToParts(new Date());
  const obj = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${obj.year}-${obj.month}-${obj.day}`;
}

/**
 * Get a Date object representing midnight on the given date string (yyyy-MM-dd) in Vancouver.
 * Used for local date comparisons (today, yesterday, etc.) in Vancouver.
 */
export function vancouverDateToLocalMidnight(dateString) {
  if (!dateString || !/^\d{4}-\d{2}-\d{2}/.test(dateString)) return null;
  const [y, m, d] = dateString.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Get "today" in Vancouver as a Date at midnight (for comparisons).
 * Uses Vancouver's current date, then creates a local Date at midnight so getTime() comparisons work.
 */
export function getVancouverTodayMidnight() {
  const todayStr = getVancouverToday();
  return vancouverDateToLocalMidnight(todayStr);
}

/**
 * Format a date/time for display in Vancouver timezone.
 * @param {Date|string|number} dateValue - Date, ISO string, or timestamp
 * @param {Intl.DateTimeFormatOptions} [options] - e.g. { dateStyle: 'short' }, { timeStyle: 'short' }
 */
export function formatInVancouver(dateValue, options = { dateStyle: 'medium' }) {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: VANCOUVER_TZ,
    ...options
  }).format(date);
}

/**
 * Current day of week in Vancouver (0 = Sunday, 5 = Friday)
 */
export function getVancouverDayOfWeek() {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: VANCOUVER_TZ,
    weekday: 'short'
  });
  const short = dtf.format(new Date()).toLowerCase();
  const map = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
  return map[short] ?? new Date().getDay();
}

/**
 * Current hour (0-23) in Vancouver
 */
export function getVancouverHour() {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: VANCOUVER_TZ,
    hour: '2-digit',
    hour12: false
  });
  return parseInt(dtf.format(new Date()), 10);
}

/**
 * Is today Friday in Vancouver?
 */
export function isVancouverFriday() {
  return getVancouverDayOfWeek() === 5;
}

/**
 * Start and end of the current week (Mon–Sun) in Vancouver.
 * Returns { start: Date (midnight local for that Monday), end: Date (end of Sunday) }
 */
export function getVancouverWeekBounds() {
  const todayStr = getVancouverToday();
  const [y, m, d] = todayStr.split('-').map(Number);
  const today = new Date(y, m - 1, d);
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const start = new Date(today);
  start.setDate(today.getDate() + mondayOffset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Is the current Vancouver date in the last 7 days of the month?
 */
export function isVancouverLastWeekOfMonth() {
  const todayStr = getVancouverToday();
  const [y, m] = todayStr.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const day = parseInt(todayStr.split('-')[2], 10);
  return day > lastDay - 7;
}

/**
 * Vancouver month key yyyy-MM
 */
export function getVancouverMonthKey() {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: VANCOUVER_TZ,
    year: 'numeric',
    month: '2-digit'
  });
  const parts = dtf.formatToParts(new Date());
  const obj = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${obj.year}-${obj.month}`;
}

// ============================================================================
// LEAVE REQUEST NOTIFICATIONS – only these admins get email + in-app for new requests
// ============================================================================
export const LEAVE_REQUEST_NOTIFY_ADMIN_EMAILS = [
  'michelle@luxury-listings.com',
  'matthew@luxury-listings.com'
].map((e) => e.toLowerCase());

/** Approved vacation/sick leave events are only added to these calendars: requester + these two admins. */
export const LEAVE_CALENDAR_SYNC_EMAILS = [...LEAVE_REQUEST_NOTIFY_ADMIN_EMAILS];

/**
 * Parse "YYYY-MM-DD" as that calendar day (noon Vancouver to avoid DST edge cases).
 * Use for consistent calendar-day and work-day counts regardless of server/user timezone.
 */
export function parseDateStringVancouver(dateString) {
  if (!dateString || !/^\d{4}-\d{2}-\d{2}/.test(dateString)) return null;
  const [y, m, d] = dateString.split('-').map(Number);
  // Noon Vancouver on that date → safe for DST
  const str = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T12:00:00`;
  const date = new Date(str);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

/**
 * Calendar days between start and end (inclusive). Uses Vancouver date interpretation.
 */
export function calendarDaysBetweenVancouver(startDateStr, endDateStr) {
  const start = parseDateStringVancouver(startDateStr);
  const end = parseDateStringVancouver(endDateStr);
  if (!start || !end || end < start) return 0;
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((end - start) / msPerDay) + 1;
}

/**
 * BC statutory holidays (Vancouver) – returns set of "YYYY-MM-DD" for the given year.
 * Work week: Mon 9am–Fri 5pm; only weekdays outside this list count as work days.
 */
function getBCStatHolidaysForYear(year) {
  const y = Number(year);
  const set = new Set();
  set.add(`${y}-01-01`);
  set.add(`${y}-12-25`);
  set.add(`${y}-12-26`);
  set.add(`${y}-07-01`);
  set.add(`${y}-11-11`);
  set.add(getFamilyDayBC(y));
  set.add(getGoodFridayBC(y));
  set.add(getVictoriaDayBC(y));
  set.add(getBCDay(y));
  const labour = getNthWeekdayInMonth(y, 9, 1, 1);   // September = 9
  const thanksgiving = getNthWeekdayInMonth(y, 10, 1, 2); // October = 10
  if (labour) set.add(labour);
  if (thanksgiving) set.add(thanksgiving);
  return set;
}

function getFamilyDayBC(year) {
  const feb = new Date(Date.UTC(year, 1, 1));
  let mondays = 0;
  for (let d = 1; d <= 28; d++) {
    feb.setUTCDate(d);
    if (feb.getUTCDay() === 1) {
      mondays++;
      if (mondays === 3) return `${year}-02-${String(d).padStart(2, '0')}`;
    }
  }
  return null;
}

function getGoodFridayBC(year) {
  const easter = getEasterSunday(year);
  const gf = new Date(easter);
  gf.setUTCDate(gf.getUTCDate() - 2);
  return `${year}-${String(gf.getUTCMonth() + 1).padStart(2, '0')}-${String(gf.getUTCDate()).padStart(2, '0')}`;
}

function getVictoriaDayBC(year) {
  const may25 = new Date(Date.UTC(year, 4, 25));
  const dow = may25.getUTCDay();
  const vd = dow === 0 ? 18 : dow === 1 ? 24 : 25 - (dow - 1);
  return `${year}-05-${String(vd).padStart(2, '0')}`;
}

function getBCDay(year) {
  const aug = new Date(Date.UTC(year, 7, 1));
  for (let d = 1; d <= 7; d++) {
    aug.setUTCDate(d);
    if (aug.getUTCDay() === 1) return `${year}-08-${String(d).padStart(2, '0')}`;
  }
  return null;
}

function getEasterSunday(year) {
  const y = year;
  const a = y % 19;
  const b = Math.floor(y / 100);
  const c = y % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(y, month - 1, day));
}

function getNthWeekdayInMonth(year, month, weekday, n) {
  const d = new Date(Date.UTC(year, month - 1, 1));
  let count = 0;
  for (let i = 1; i <= 31; i++) {
    d.setUTCDate(i);
    if (d.getUTCMonth() !== month - 1) break;
    if (d.getUTCDay() === weekday) {
      count++;
      if (count === n) {
        return `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      }
    }
  }
  return null;
}

/** Work days = Mon–Fri in Vancouver, excluding BC stat holidays. */
export function countWorkDaysVancouver(startDateStr, endDateStr) {
  const n = calendarDaysBetweenVancouver(startDateStr, endDateStr);
  if (n <= 0) return 0;
  const [sy, sm, sd] = startDateStr.split('-').map(Number);
  const years = new Set();
  for (let i = 0; i < n; i++) {
    const d = new Date(Date.UTC(sy, sm - 1, sd + i));
    years.add(d.getUTCFullYear());
  }
  const holidaysByYear = {};
  years.forEach((y) => {
    holidaysByYear[y] = getBCStatHolidaysForYear(y);
  });
  let count = 0;
  for (let i = 0; i < n; i++) {
    const d = new Date(Date.UTC(sy, sm - 1, sd + i));
    const dow = d.getUTCDay();
    if (dow === 0 || dow === 6) continue;
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    if (holidaysByYear[d.getUTCFullYear()] && holidaysByYear[d.getUTCFullYear()].has(key)) continue;
    count++;
  }
  return count;
}
