/**
 * Google Sheets Service
 * Handles OAuth and fetching data from Google Sheets
 */

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const GOOGLE_API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets.readonly';

class GoogleSheetsService {
  constructor() {
    this.isInitialized = false;
    this.isAuthorized = false;
    this.tokenClient = null;
    this.currentUserEmail = null;
  }

  /**
   * Initialize Google API client and OAuth
   */
  async initialize(userEmail) {
    console.log('📊 Initializing Google Sheets service...', { userEmail });

    if (this.currentUserEmail !== userEmail) {
      console.log('👤 User switched, resetting Sheets connection');
      this.currentUserEmail = userEmail;
      this.isAuthorized = false;
    }

    try {
      // Check for stored token
      const storedToken = this.getStoredToken();
      if (storedToken && this.isTokenValid(storedToken)) {
        console.log('✅ Using stored Sheets token');
        await this.loadGapiClient();
        window.gapi.client.setToken(storedToken);
        this.isAuthorized = true;
        this.isInitialized = true;
        return { success: true, needsAuth: false };
      }

      // Load Google API client
      await this.loadGapiClient();

      // Create token client for OAuth
      this.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: (response) => {
          if (response.error) {
            console.error('❌ OAuth error:', response);
            return;
          }
          console.log('✅ Received Sheets access token');
          this.storeToken(response);
          this.isAuthorized = true;
        },
      });

      this.isInitialized = true;
      return { success: true, needsAuth: true };

    } catch (error) {
      console.error('❌ Failed to initialize Sheets service:', error);
      throw error;
    }
  }

  /**
   * Load and initialize gapi client
   */
  async loadGapiClient() {
    if (!window.gapi) {
      throw new Error('Google API library (gapi) not loaded');
    }

    return new Promise((resolve, reject) => {
      window.gapi.load('client', async () => {
        try {
          await window.gapi.client.init({
            apiKey: GOOGLE_API_KEY,
            discoveryDocs: [DISCOVERY_DOC],
          });
          console.log('✅ gapi.client initialized for Sheets');
          resolve();
        } catch (error) {
          console.error('❌ gapi.client.init() failed:', error);
          reject(error);
        }
      });
    });
  }

  /**
   * Request user authorization
   */
  async requestAuthorization() {
    console.log('🔐 Requesting Sheets authorization...');
    
    if (!this.tokenClient) {
      throw new Error('Token client not initialized. Call initialize() first.');
    }

    return new Promise((resolve, reject) => {
      // Override callback for this specific request
      this.tokenClient.callback = (response) => {
        if (response.error) {
          console.error('❌ Authorization failed:', response);
          reject(response);
          return;
        }
        console.log('✅ Authorization successful');
        this.storeToken(response);
        this.isAuthorized = true;
        resolve(response);
      };

      // Check if already have a token
      const token = window.gapi.client.getToken();
      if (token === null) {
        // Prompt user to select account and consent
        this.tokenClient.requestAccessToken({ prompt: 'consent' });
      } else {
        // Skip display of account chooser and consent dialog
        this.tokenClient.requestAccessToken({ prompt: '' });
      }
    });
  }

  /**
   * Extract spreadsheet ID from URL or return as-is if already an ID
   */
  extractSpreadsheetId(urlOrId) {
    // If it's already just an ID (no slashes or special chars), return it
    if (!/[\/\?#]/.test(urlOrId)) {
      return urlOrId;
    }

    // Extract from various URL formats
    const patterns = [
      /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,  // Standard URL
      /id=([a-zA-Z0-9-_]+)/,                   // Query parameter
    ];

    for (const pattern of patterns) {
      const match = urlOrId.match(pattern);
      if (match) {
        return match[1];
      }
    }

    throw new Error('Invalid Google Sheets URL or ID. Please check the format.');
  }

  /**
   * Fetch data from a Google Sheet
   * @param {string} spreadsheetId - The spreadsheet ID or URL
   * @param {string} range - Optional range (e.g., 'Sheet1!A1:Z100'). Defaults to entire first sheet.
   */
  async fetchSheetData(spreadsheetId, range = null) {
    console.log('📥 Fetching sheet data...', { spreadsheetId, range });

    if (!this.isAuthorized) {
      throw new Error('Not authorized. Please call requestAuthorization() first.');
    }

    try {
      // Extract ID from URL if needed
      const sheetId = this.extractSpreadsheetId(spreadsheetId);

      // If no range specified, get the first sheet's data
      if (!range) {
        // First, get the spreadsheet metadata to find the first sheet name
        const metadataResponse = await window.gapi.client.sheets.spreadsheets.get({
          spreadsheetId: sheetId,
        });
        
        const firstSheet = metadataResponse.result.sheets[0];
        const sheetTitle = firstSheet.properties.title;
        range = `${sheetTitle}!A1:Z1000`; // Fetch first 1000 rows, columns A-Z
        console.log('📋 Using first sheet:', sheetTitle);
      }

      // Fetch the data
      const response = await window.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: range,
      });

      const values = response.result.values;
      
      if (!values || values.length === 0) {
        console.warn('⚠️ No data found in sheet');
        return { headers: [], rows: [] };
      }

      const headers = values[0];
      const rows = values.slice(1);

      console.log('✅ Sheet data fetched:', { headers, rowCount: rows.length });

      return {
        headers,
        rows,
        spreadsheetId: sheetId,
        range,
      };

    } catch (error) {
      console.error('❌ Error fetching sheet data:', error);
      throw error;
    }
  }

  /**
   * Get sample rows for AI analysis (first 5 rows after header)
   */
  getSampleRows(rows, count = 5) {
    return rows.slice(0, Math.min(count, rows.length));
  }

  /**
   * Store token in localStorage (user-specific)
   */
  storeToken(tokenResponse) {
    const tokenData = {
      access_token: tokenResponse.access_token,
      expires_at: Date.now() + (tokenResponse.expires_in * 1000),
    };
    const key = `google_sheets_token_${this.currentUserEmail}`;
    localStorage.setItem(key, JSON.stringify(tokenData));
    console.log('💾 Sheets token stored');
  }

  /**
   * Get stored token from localStorage
   */
  getStoredToken() {
    const key = `google_sheets_token_${this.currentUserEmail}`;
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('❌ Error parsing stored token:', error);
      return null;
    }
  }

  /**
   * Check if token is still valid
   */
  isTokenValid(tokenData) {
    if (!tokenData || !tokenData.expires_at) return false;
    return Date.now() < tokenData.expires_at - 60000; // 1 minute buffer
  }

  /**
   * Clear stored token
   */
  clearStoredToken() {
    const key = `google_sheets_token_${this.currentUserEmail}`;
    localStorage.removeItem(key);
    console.log('🗑️ Sheets token cleared');
  }

  /**
   * Disconnect (revoke authorization)
   */
  disconnect() {
    this.clearStoredToken();
    const token = window.gapi.client.getToken();
    if (token !== null) {
      window.google.accounts.oauth2.revoke(token.access_token);
      window.gapi.client.setToken('');
    }
    this.isAuthorized = false;
    console.log('🔌 Disconnected from Google Sheets');
  }
}

export const googleSheetsService = new GoogleSheetsService();

