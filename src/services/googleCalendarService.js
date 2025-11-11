// Google Calendar Integration Service
// Configured with API credentials for calendar sync
class GoogleCalendarService {
  constructor() {
    this.apiKey = process.env.REACT_APP_GOOGLE_API_KEY;
    this.clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    this.discoveryDocs = ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'];
    this.scopes = 'https://www.googleapis.com/auth/calendar.readonly';
    this.isInitialized = false;
  }

  // Initialize Google Calendar API
  async initialize() {
    console.log('🔍 GoogleCalendarService.initialize() called');
    console.log('🔍 Already initialized?', this.isInitialized);
    console.log('🔍 API Key:', this.apiKey ? 'Present' : 'MISSING');
    console.log('🔍 Client ID:', this.clientId ? 'Present' : 'MISSING');
    
    if (this.isInitialized) {
      console.log('✅ Already initialized, returning true');
      return true;
    }

    if (!this.apiKey || !this.clientId) {
      console.error('❌ Missing Google API credentials');
      throw new Error('Google Calendar API credentials are not configured. Please add REACT_APP_GOOGLE_API_KEY and REACT_APP_GOOGLE_CLIENT_ID to your environment variables.');
    }

    try {
      console.log('📦 Loading Google API client...');
      // Load Google API client
      await this.loadGoogleAPI();
      console.log('✅ Google API client loaded');
      
      console.log('⚙️ Initializing Google client...');
      console.log('🔑 API Key (first 10 chars):', this.apiKey?.substring(0, 10) + '...');
      console.log('🔑 Client ID (last 20 chars):', '...' + this.clientId?.substring(this.clientId.length - 20));
      console.log('📚 Discovery docs:', this.discoveryDocs);
      console.log('🔐 Scopes:', this.scopes);
      
      // Initialize the client
      try {
        await window.gapi.client.init({
          apiKey: this.apiKey,
          clientId: this.clientId,
          discoveryDocs: this.discoveryDocs,
          scope: this.scopes
        });
        console.log('✅ Google client initialized');
      } catch (initError) {
        console.error('❌ gapi.client.init() failed');
        console.error('❌ Init error (raw):', initError);
        console.error('❌ Init error (stringified):', JSON.stringify(initError, null, 2));
        
        // Try to extract error details from Google API error format
        if (initError?.error) {
          console.error('❌ Google API error details:', initError.error);
        }
        if (initError?.details) {
          console.error('❌ Error details:', initError.details);
        }
        
        throw new Error(`Google API initialization failed. Please check: 1) API is enabled in Google Cloud Console, 2) Authorized origins include https://smmluxurylistings.info, 3) OAuth consent screen is configured`);
      }

      console.log('🔐 Checking sign-in status...');
      // Check if user is already signed in
      const isSignedIn = window.gapi.auth2.getAuthInstance().isSignedIn.get();
      console.log('🔐 User signed in?', isSignedIn);
      
      if (!isSignedIn) {
        console.log('🔐 Prompting user to sign in...');
        await window.gapi.auth2.getAuthInstance().signIn();
        console.log('✅ User signed in successfully');
      }

      this.isInitialized = true;
      console.log('✅ Google Calendar initialized successfully!');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Google Calendar:', error);
      console.error('❌ Error name:', error.name);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      return false;
    }
  }

  // Load Google API script
  loadGoogleAPI() {
    return new Promise((resolve, reject) => {
      if (window.gapi) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        window.gapi.load('client:auth2', resolve);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // Get calendar events
  async getEvents(calendarId = 'primary', timeMin = null, timeMax = null, maxResults = 100) {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) throw new Error('Failed to initialize Google Calendar');
    }

    try {
      const now = new Date();
      const startTime = timeMin || new Date(now.getFullYear(), now.getMonth(), 1);
      const endTime = timeMax || new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const response = await window.gapi.client.calendar.events.list({
        calendarId: calendarId,
        timeMin: startTime.toISOString(),
        timeMax: endTime.toISOString(),
        maxResults: maxResults,
        singleEvents: true,
        orderBy: 'startTime'
      });

      return this.formatEvents(response.result.items);
    } catch (error) {
      console.error('Failed to fetch calendar events:', error);
      throw error;
    }
  }

  // Format events for our calendar component
  formatEvents(events) {
    return events.map(event => ({
      id: event.id,
      title: event.summary || 'No Title',
      description: event.description || '',
      start: new Date(event.start.dateTime || event.start.date),
      end: new Date(event.end.dateTime || event.end.date),
      location: event.location || '',
      attendees: event.attendees || [],
      type: this.categorizeEvent(event),
      time: this.formatEventTime(event),
      isAllDay: !event.start.dateTime,
      googleEventId: event.id,
      htmlLink: event.htmlLink
    }));
  }

  // Categorize events based on title, description, or attendees
  categorizeEvent(event) {
    const title = event.summary?.toLowerCase() || '';
    const description = event.description?.toLowerCase() || '';
    
    if (title.includes('leave') || title.includes('vacation') || title.includes('sick')) {
      return 'leave';
    }
    if (title.includes('training') || title.includes('workshop') || title.includes('seminar')) {
      return 'training';
    }
    if (title.includes('meeting') || title.includes('1:1') || title.includes('review')) {
      return 'meeting';
    }
    if (title.includes('interview') || title.includes('hiring')) {
      return 'hr';
    }
    
    return 'other';
  }

  // Format event time for display
  formatEventTime(event) {
    if (event.start.dateTime) {
      const start = new Date(event.start.dateTime);
      const end = new Date(event.end.dateTime);
      
      if (start.toDateString() === end.toDateString()) {
        return `${start.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        })} - ${end.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        })}`;
      } else {
        return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
      }
    } else {
      return 'All Day';
    }
  }

  // Create a new calendar event
  async createEvent(calendarId = 'primary', eventData) {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) throw new Error('Failed to initialize Google Calendar');
    }

    try {
      const event = {
        summary: eventData.title,
        description: eventData.description,
        start: {
          dateTime: eventData.start.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: eventData.end.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        location: eventData.location,
        attendees: eventData.attendees?.map(email => ({ email })) || []
      };

      const response = await window.gapi.client.calendar.events.insert({
        calendarId: calendarId,
        resource: event
      });

      return response.result;
    } catch (error) {
      console.error('Failed to create calendar event:', error);
      throw error;
    }
  }

  // Update an existing event
  async updateEvent(calendarId = 'primary', eventId, eventData) {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) throw new Error('Failed to initialize Google Calendar');
    }

    try {
      const event = {
        summary: eventData.title,
        description: eventData.description,
        start: {
          dateTime: eventData.start.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: eventData.end.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        location: eventData.location,
        attendees: eventData.attendees?.map(email => ({ email })) || []
      };

      const response = await window.gapi.client.calendar.events.update({
        calendarId: calendarId,
        eventId: eventId,
        resource: event
      });

      return response.result;
    } catch (error) {
      console.error('Failed to update calendar event:', error);
      throw error;
    }
  }

  // Delete an event
  async deleteEvent(calendarId = 'primary', eventId) {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) throw new Error('Failed to initialize Google Calendar');
    }

    try {
      await window.gapi.client.calendar.events.delete({
        calendarId: calendarId,
        eventId: eventId
      });

      return true;
    } catch (error) {
      console.error('Failed to delete calendar event:', error);
      throw error;
    }
  }

  // Get user's calendar list
  async getCalendarList() {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) throw new Error('Failed to initialize Google Calendar');
    }

    try {
      const response = await window.gapi.client.calendar.calendarList.list();
      return response.result.items;
    } catch (error) {
      console.error('Failed to fetch calendar list:', error);
      throw error;
    }
  }

  // Check if user is authenticated
  isAuthenticated() {
    return this.isInitialized && window.gapi?.auth2?.getAuthInstance()?.isSignedIn?.get();
  }

  // Sign out
  async signOut() {
    if (this.isInitialized && window.gapi?.auth2?.getAuthInstance()) {
      await window.gapi.auth2.getAuthInstance().signOut();
      this.isInitialized = false;
    }
  }
}

// Create singleton instance
const googleCalendarService = new GoogleCalendarService();

export default googleCalendarService;
