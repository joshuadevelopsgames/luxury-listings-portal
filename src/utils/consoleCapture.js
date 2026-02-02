/**
 * Console Capture Utility
 * 
 * Captures console logs, errors, and warnings in memory
 * for inclusion in error reports.
 */

const MAX_LOGS = 100;
const capturedLogs = [];

// Store original console methods
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info,
};

/**
 * Initialize console capture
 * Call this early in app initialization
 */
export function initConsoleCapture() {
  // Override console.log
  console.log = (...args) => {
    captureLine('log', args);
    originalConsole.log.apply(console, args);
  };

  // Override console.warn
  console.warn = (...args) => {
    captureLine('warn', args);
    originalConsole.warn.apply(console, args);
  };

  // Override console.error
  console.error = (...args) => {
    captureLine('error', args);
    originalConsole.error.apply(console, args);
  };

  // Override console.info
  console.info = (...args) => {
    captureLine('info', args);
    originalConsole.info.apply(console, args);
  };

  // Capture unhandled errors
  window.addEventListener('error', (event) => {
    captureLine('uncaught', [`${event.message} at ${event.filename}:${event.lineno}:${event.colno}`]);
  });

  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    captureLine('rejection', [event.reason?.message || String(event.reason)]);
  });
}

/**
 * Capture a console line
 */
function captureLine(level, args) {
  const timestamp = new Date().toISOString();
  const message = args.map(arg => {
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg, null, 2);
      } catch {
        return String(arg);
      }
    }
    return String(arg);
  }).join(' ');

  capturedLogs.push({
    timestamp,
    level,
    message: message.substring(0, 1000) // Limit message length
  });

  // Keep only the last MAX_LOGS entries
  if (capturedLogs.length > MAX_LOGS) {
    capturedLogs.shift();
  }
}

/**
 * Get captured logs
 */
export function getCapturedLogs() {
  return [...capturedLogs];
}

/**
 * Get logs as formatted string
 */
export function getLogsAsString() {
  return capturedLogs
    .map(log => `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`)
    .join('\n');
}

/**
 * Clear captured logs
 */
export function clearCapturedLogs() {
  capturedLogs.length = 0;
}

/**
 * Get system info for error reports
 */
export function getSystemInfo() {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    screenSize: `${window.screen.width}x${window.screen.height}`,
    viewportSize: `${window.innerWidth}x${window.innerHeight}`,
    url: window.location.href,
    timestamp: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

export default {
  initConsoleCapture,
  getCapturedLogs,
  getLogsAsString,
  clearCapturedLogs,
  getSystemInfo,
};
