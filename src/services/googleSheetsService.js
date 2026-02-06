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
   * Wait for Google API libraries to load
   */
  async waitForGoogleLibraries() {
    console.log('⏳ Waiting for Google API libraries...');
    
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds total
      
      const checkLibraries = () => {
        attempts++;
        
        if (window.gapi && window.google?.accounts?.oauth2) {
          console.log('✅ Google libraries loaded');
          resolve();
          return;
        }
        
        if (attempts >= maxAttempts) {
          reject(new Error('Google API libraries failed to load. Please refresh the page.'));
          return;
        }
        
        setTimeout(checkLibraries, 100);
      };
      
      checkLibraries();
    });
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
      // Wait for Google libraries to load
      await this.waitForGoogleLibraries();

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
   * List all sheets (tabs) in a spreadsheet
   * @param {string} spreadsheetId - The spreadsheet ID or URL
   * @returns {Promise<{ spreadsheetTitle: string, sheets: Array<{ title: string, sheetId: number }> }>}
   */
  async listSheets(spreadsheetId) {
    if (!this.isAuthorized) {
      throw new Error('Not authorized. Please call requestAuthorization() first.');
    }
    const sheetId = this.extractSpreadsheetId(spreadsheetId);
    const metadataResponse = await window.gapi.client.sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    });
    const spreadsheetTitle = metadataResponse.result.properties?.title || 'Spreadsheet';
    const sheets = (metadataResponse.result.sheets || []).map((s) => ({
      title: s.properties?.title || 'Sheet',
      sheetId: s.properties?.sheetId,
    }));
    return { spreadsheetTitle, spreadsheetId: sheetId, sheets };
  }

  /**
   * Fetch data from a Google Sheet
   * @param {string} spreadsheetId - The spreadsheet ID or URL
   * @param {string} sheetTitleOrRange - Optional. Sheet tab title (e.g. "March 2026") or full range (e.g. "Sheet1!A1:Z100"). Defaults to first sheet.
   */
  async fetchSheetData(spreadsheetId, sheetTitleOrRange = null) {
    console.log('📥 Fetching sheet data...', { spreadsheetId, sheetTitleOrRange });

    if (!this.isAuthorized) {
      throw new Error('Not authorized. Please call requestAuthorization() first.');
    }

    try {
      const sheetId = this.extractSpreadsheetId(spreadsheetId);

      let range = sheetTitleOrRange;
      let sheetTitle = sheetTitleOrRange;
      let spreadsheetTitle = '';

      if (!range || !range.includes('!')) {
        const metadataResponse = await window.gapi.client.sheets.spreadsheets.get({
          spreadsheetId: sheetId,
        });
        spreadsheetTitle = metadataResponse.result.properties?.title || 'Spreadsheet';
        const sheets = metadataResponse.result.sheets || [];
        const target = sheetTitleOrRange
          ? sheets.find((s) => (s.properties?.title || '') === sheetTitleOrRange)
          : sheets[0];
        if (!target) {
          throw new Error(sheetTitleOrRange ? `Tab "${sheetTitleOrRange}" not found.` : 'Spreadsheet has no sheets.');
        }
        sheetTitle = target.properties.title;
        range = `${sheetTitle}!A1:Z1000`;
        console.log('📋 Using sheet:', sheetTitle);
      }

      const response = await window.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range,
      });

      const values = response.result.values;

      if (!values || values.length === 0) {
        if (!spreadsheetTitle) {
          const meta = await this.listSheets(spreadsheetId);
          spreadsheetTitle = meta.spreadsheetTitle;
        }
        return { headers: [], rows: [], spreadsheetTitle, sheetTitle };
      }

      // Detect header row: many agency sheets have a title row (e.g. "March 2026") then "Date", "Content Type", "Caption"...
      const headerKeywords = ['date', 'caption', 'content type', 'platform', 'image', 'video', 'content link', 'post date', 'content topic', 'email confirmation'];
      let headerRowIndex = 0;
      for (let r = 0; r < Math.min(10, values.length); r++) {
        const row = values[r];
        const cells = (row || []).map((c) => String(c || '').toLowerCase().trim());
        const looksLikeHeader = cells.some((cell) => headerKeywords.some((kw) => cell.includes(kw) || cell === kw));
        if (looksLikeHeader) {
          headerRowIndex = r;
          break;
        }
      }
      const headerRow = values[headerRowIndex] || [];
      const maxCols = Math.max(headerRow.length, ...values.slice(headerRowIndex + 1).map((r) => (r || []).length));
      const headers = Array.from({ length: maxCols }, (_, i) => String(headerRow[i] ?? '').trim());
      const rows = values.slice(headerRowIndex + 1).map((r) => {
        const arr = r || [];
        return Array.from({ length: maxCols }, (_, i) => (arr[i] !== undefined && arr[i] !== null ? arr[i] : ''));
      });
      if (!spreadsheetTitle) {
        const meta = await this.listSheets(spreadsheetId);
        spreadsheetTitle = meta.spreadsheetTitle;
      }
      console.log('✅ Sheet data fetched:', { spreadsheetTitle, sheetTitle, rowCount: rows.length });

      return {
        headers,
        rows,
        spreadsheetId: sheetId,
        spreadsheetTitle,
        sheetTitle,
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

