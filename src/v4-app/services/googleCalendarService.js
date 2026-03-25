/**
 * Google Calendar Service stub for V4.
 * V3 uses direct Google Calendar API via OAuth tokens.
 * In V4 this can be reimplemented via edge functions if needed.
 */

export const googleCalendarService = {
  async isConnected() { return false; },
  async getEvents() { return []; },
  async createEvent() { console.warn('[V4] Google Calendar not yet connected'); return null; },
  async updateEvent() { return null; },
  async deleteEvent() { return null; },
  async getCalendarList() { return []; },
};

export default googleCalendarService;
