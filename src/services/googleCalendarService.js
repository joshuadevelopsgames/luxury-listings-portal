// Google Calendar Integration Service
// Using Google Identity Services (GIS) - Modern Authentication
class GoogleCalendarService {
  constructor() {
    this.apiKey = process.env.REACT_APP_GOOGLE_API_KEY;
    this.clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    this.discoveryDocs = ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'];
    // Full calendar access scope for creating, editing, and deleting events
    this.scopes = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events';
    this.isInitialized = false;
    this.tokenClient = null;
    this.accessToken = null;
    this.currentUserEmail = null;
  }

  // Get storage keys for current user
  getStorageKeys(userEmail) {
    return {
      token: `google_calendar_token_${userEmail}`,
      expiry: `google_calendar_token_expiry_${userEmail}`
    };
  }

  // Initialize Google Calendar API with new GIS library
  async initialize(userEmail) {
    console.log('🔍 GoogleCalendarService.initialize() called');
    console.log('🔍 User email:', userEmail);
    console.log('🔍 Already initialized?', this.isInitialized);
    console.log('🔍 API Key:', this.apiKey ? 'Present' : 'MISSING');
    console.log('🔍 Client ID:', this.clientId ? 'Present' : 'MISSING');
    
    if (!userEmail) {
      console.error('❌ No user email provided');
      throw new Error('User email is required for calendar initialization');
    }

    // If switching users, reset initialization
    if (this.currentUserEmail && this.currentUserEmail !== userEmail) {
      console.log('🔄 Switching users, resetting initialization');
      this.isInitialized = false;
      this.accessToken = null;
    }

    this.currentUserEmail = userEmail;
    
    if (this.isInitialized && this.currentUserEmail === userEmail) {
      console.log('✅ Already initialized for this user, returning true');
      return true;
    }

    // Check for stored token first
    const storedToken = this.getStoredToken(userEmail);
    if (storedToken) {
      console.log('✅ Found valid stored token for user, using it');
      this.accessToken = storedToken;
      this.isInitialized = true;
      
      // Still need to load gapi client for API calls
      await this.loadGoogleAPI();
      await window.gapi.client.init({
        apiKey: this.apiKey,
        discoveryDocs: this.discoveryDocs,
      });
      
      // Set the stored token
      window.gapi.client.setToken({
        access_token: this.accessToken
      });
      
      return true;
    }

    if (!this.apiKey || !this.clientId) {
      console.error('❌ Missing Google API credentials');
      throw new Error('Google Calendar API credentials are not configured. Please add REACT_APP_GOOGLE_API_KEY and REACT_APP_GOOGLE_CLIENT_ID to your environment variables.');
    }

    try {
      console.log('📦 Loading Google API libraries...');
      
      // Load both GIS and GAPI libraries
      await Promise.all([
        this.loadGoogleIdentityServices(),
        this.loadGoogleAPI()
      ]);
      
      console.log('✅ Google libraries loaded');
      
      // Initialize gapi client with API key and discovery docs
      console.log('⚙️ Initializing gapi client...');
      await window.gapi.client.init({
        apiKey: this.apiKey,
        discoveryDocs: this.discoveryDocs,
      });
      console.log('✅ gapi client initialized');
      
      // Initialize the token client for OAuth
      console.log('🔐 Initializing OAuth token client...');
      this.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: this.clientId,
        scope: this.scopes,
        callback: (response) => {
          if (response.error) {
            console.error('❌ OAuth error:', response);
            return;
          }
          console.log('✅ Access token received in callback');
          this.accessToken = response.access_token;
          this.isInitialized = true;
        },
      });
      console.log('✅ Token client initialized');
      
      // Request access token (will trigger OAuth popup)
      console.log('🔐 Requesting access token...');
      await this.requestAccessToken();
      
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

  // Load Google Identity Services (GIS) script
  loadGoogleIdentityServices() {
    return new Promise((resolve, reject) => {
      if (window.google?.accounts?.oauth2) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // Load Google API script
  loadGoogleAPI() {
    return new Promise((resolve, reject) => {
      // If gapi and gapi.client are already loaded, resolve immediately
      if (window.gapi?.client) {
        resolve();
        return;
      }

      // If gapi exists but client isn't loaded, just load the client
      if (window.gapi) {
        window.gapi.load('client', resolve);
        return;
      }

      // Otherwise load the full script
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        window.gapi.load('client', resolve);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // Request access token (triggers OAuth flow)
  requestAccessToken() {
    return new Promise((resolve, reject) => {
      if (!this.tokenClient) {
        reject(new Error('Token client not initialized'));
        return;
      }

      if (!this.currentUserEmail) {
        reject(new Error('No user email set'));
        return;
      }

      // Store resolve/reject for the callback
      this._authResolve = resolve;
      this._authReject = reject;

      // Override the callback temporarily to handle promise
      const originalCallback = this.tokenClient.callback;
      this.tokenClient.callback = (response) => {
        if (response.error) {
          console.error('❌ OAuth error:', response);
          this._authReject(new Error(response.error));
          return;
        }
        console.log('✅ Access token received');
        this.accessToken = response.access_token;
        this.isInitialized = true;
        
        // Store the token (expires in 1 hour)
        this.storeToken(response.access_token, 3600, this.currentUserEmail);
        
        // Set the token for gapi client
        window.gapi.client.setToken({
          access_token: this.accessToken
        });
        
        this._authResolve();
        
        // Restore original callback
        this.tokenClient.callback = originalCallback;
      };

      // Request the token (opens OAuth popup)
      this.tokenClient.requestAccessToken({ prompt: '' });
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
    return this.isInitialized && !!this.accessToken;
  }

  // Sign out - revoke the token
  async signOut() {
    if (this.accessToken) {
      // Revoke the token
      window.google.accounts.oauth2.revoke(this.accessToken, () => {
        console.log('✅ Access token revoked');
      });
      
      this.accessToken = null;
      this.isInitialized = false;
      
      // Clear stored token
      this.clearStoredToken();
    }
  }

  // Manual authorization - explicitly request user permission
  async authorize(userEmail) {
    console.log('🔐 Starting manual authorization for:', userEmail);
    
    if (!userEmail) {
      throw new Error('User email is required');
    }
    
    this.currentUserEmail = userEmail;
    
    // Clear any existing token to force re-auth
    this.clearStoredToken(userEmail);
    this.accessToken = null;
    this.isInitialized = false;
    
    try {
      // Load Google libraries
      await Promise.all([
        this.loadGoogleIdentityServices(),
        this.loadGoogleAPI()
      ]);
      
      // Initialize gapi client
      await window.gapi.client.init({
        apiKey: this.apiKey,
        discoveryDocs: this.discoveryDocs,
      });
      
      // Initialize token client
      this.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: this.clientId,
        scope: this.scopes,
        callback: () => {}, // Will be overridden
      });
      
      // Request token with explicit prompt
      return new Promise((resolve, reject) => {
        this.tokenClient.callback = (response) => {
          if (response.error) {
            console.error('❌ OAuth error:', response);
            reject(new Error(response.error_description || response.error));
            return;
          }
          
          console.log('✅ Authorization successful!');
          this.accessToken = response.access_token;
          this.isInitialized = true;
          
          // Store the token
          this.storeToken(response.access_token, response.expires_in || 3600, userEmail);
          
          // Set token for API calls
          window.gapi.client.setToken({
            access_token: this.accessToken
          });
          
          resolve(true);
        };
        
        // Force consent prompt to ensure user sees permissions
        this.tokenClient.requestAccessToken({ 
          prompt: 'consent',
          login_hint: userEmail 
        });
      });
    } catch (error) {
      console.error('❌ Authorization failed:', error);
      throw error;
    }
  }

  // Create leave request event in Google Calendar
  async createLeaveEvent(leaveRequest) {
    if (!this.isInitialized || !this.accessToken) {
      throw new Error('Google Calendar not connected. Please authorize first.');
    }

    const startDate = new Date(leaveRequest.startDate);
    const endDate = new Date(leaveRequest.endDate);
    // Add one day to end date for all-day events
    endDate.setDate(endDate.getDate() + 1);

    const event = {
      summary: `${leaveRequest.employeeName || 'Team Member'} - ${leaveRequest.type?.charAt(0).toUpperCase() + leaveRequest.type?.slice(1) || 'Leave'}`,
      description: `Leave Type: ${leaveRequest.type || 'Other'}\nReason: ${leaveRequest.reason || 'N/A'}\nStatus: Approved\n\nThis event was automatically created from the Leave Management System.`,
      start: {
        date: startDate.toISOString().split('T')[0], // All-day event
      },
      end: {
        date: endDate.toISOString().split('T')[0],
      },
      colorId: this.getLeaveColorId(leaveRequest.type),
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 1440 }, // 1 day before
        ],
      },
    };

    try {
      const response = await window.gapi.client.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
      });
      
      console.log('✅ Leave event created in Google Calendar:', response.result.id);
      return response.result;
    } catch (error) {
      console.error('❌ Failed to create leave event:', error);
      throw error;
    }
  }

  // Get color ID based on leave type
  getLeaveColorId(type) {
    const colors = {
      vacation: '9',    // Blue
      sick: '11',       // Red
      personal: '3',    // Purple
      bereavement: '8', // Gray
      other: '5',       // Yellow
    };
    return colors[type] || '5';
  }

  // Check connection status without triggering auth
  getConnectionStatus() {
    return {
      isConnected: this.isInitialized && !!this.accessToken,
      userEmail: this.currentUserEmail,
      hasStoredToken: !!this.getStoredToken(this.currentUserEmail),
    };
  }

  // Store token in localStorage with expiry
  storeToken(token, expiresInSeconds, userEmail) {
    if (!userEmail) {
      console.error('❌ Cannot store token without user email');
      return;
    }
    
    const keys = this.getStorageKeys(userEmail);
    const expiryTime = Date.now() + (expiresInSeconds * 1000);
    localStorage.setItem(keys.token, token);
    localStorage.setItem(keys.expiry, expiryTime.toString());
    console.log('💾 Token stored for', userEmail, 'expires in', expiresInSeconds, 'seconds');
  }

  // Get stored token if it's still valid
  getStoredToken(userEmail) {
    if (!userEmail) {
      return null;
    }
    
    const keys = this.getStorageKeys(userEmail);
    const token = localStorage.getItem(keys.token);
    const expiry = localStorage.getItem(keys.expiry);
    
    if (!token || !expiry) {
      return null;
    }

    // Check if token has expired
    if (Date.now() > parseInt(expiry)) {
      console.log('⏰ Stored token expired for', userEmail, ', clearing it');
      this.clearStoredToken(userEmail);
      return null;
    }

    return token;
  }

  // Clear stored token
  clearStoredToken(userEmail) {
    if (!userEmail) {
      userEmail = this.currentUserEmail;
    }
    
    if (!userEmail) {
      console.warn('⚠️ Cannot clear token without user email');
      return;
    }
    
    const keys = this.getStorageKeys(userEmail);
    localStorage.removeItem(keys.token);
    localStorage.removeItem(keys.expiry);
    console.log('🗑️ Stored token cleared for', userEmail);
  }
}

// Create singleton instance
const googleCalendarService = new GoogleCalendarService();

export { googleCalendarService };
