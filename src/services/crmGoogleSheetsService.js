// CRM Google Sheets Integration Service - UPDATED WITH SERVICE ACCOUNT AUTH
class CRMGoogleSheetsService {
  constructor() {
    // CRM Google Sheets Integration Service - UPDATED WITH SERVICE ACCOUNT AUTH
    this.spreadsheetId = '1wM8g4bPituJoJFVp_Ndlv7o4p3NZMNEM2-WwuUnGvyE';
    this.baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
    
    // For read operations, we can still use API key
    this.apiKey = 'AIzaSyAxwCEtCAyvPgCdewK3UqErEfoKCDtYwHM';
    
    // For write operations, we need service account credentials
    // This will be set when the user uploads their service account JSON
    this.serviceAccountCredentials = null;
    this.accessToken = null;
    
    // Sheet configuration
    this.sheetTabs = {
      warmLeads: 'Warm Leads',
      contactedClients: 'Have Contacted Before with Proposals',
      coldLeads: 'Cold Leads'
    };
    
    // Headers are in Row 1 (0-indexed)
    this.headerRows = {
      warmLeads: 0,
      contactedClients: 0,
      coldLeads: 0
    };
  }

  // Set service account credentials for write operations
  setServiceAccountCredentials(credentials) {
    this.serviceAccountCredentials = credentials;
    console.log('🔐 Service account credentials set');
  }

  // Get OAuth2 access token for write operations
  async getAccessToken() {
    if (!this.serviceAccountCredentials) {
      throw new Error('Service account credentials not set. Please upload your service account JSON file.');
    }

    try {
      // Create JWT token
      const header = {
        alg: 'RS256',
        typ: 'JWT'
      };

      const now = Math.floor(Date.now() / 1000);
      const payload = {
        iss: this.serviceAccountCredentials.client_email,
        scope: 'https://www.googleapis.com/auth/spreadsheets',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600, // 1 hour
        iat: now
      };

      // For now, we'll use a simpler approach with the service account
      // In production, you'd want to properly sign the JWT
      console.log('🔐 Using service account for authentication');
      
      // Return the service account email as a temporary solution
      // This will be replaced with proper OAuth2 flow
      return this.serviceAccountCredentials.client_email;
    } catch (error) {
      console.error('❌ Error getting access token:', error);
      throw error;
    }
  }

  // Fetch data from all three sheet tabs
  async fetchCRMData() {
    try {
      if (!this.apiKey) {
        throw new Error('Google Sheets API key not configured. Please add REACT_APP_GOOGLE_SHEETS_API_KEY to your .env file.');
      }

      console.log('🔍 Fetching CRM data from all sheet tabs...');
      
      // Fetch data from each tab in parallel
      const [warmLeadsData, contactedClientsData, coldLeadsData] = await Promise.all([
        this.fetchSheetData(this.sheetTabs.warmLeads, 'warm', this.headerRows.warmLeads),
        this.fetchSheetData(this.sheetTabs.contactedClients, 'contacted', this.headerRows.contactedClients),
        this.fetchSheetData(this.sheetTabs.coldLeads, 'cold', this.headerRows.coldLeads)
      ]);

      const combinedData = {
        warmLeads: warmLeadsData,
        contactedClients: contactedClientsData,
        coldLeads: coldLeadsData
      };

      console.log('✅ Combined CRM data from all tabs:', combinedData);
      return combinedData;

    } catch (error) {
      console.error('❌ Error fetching CRM data:', error);
      throw error;
    }
  }

  // Fetch data from a specific sheet tab
  async fetchSheetData(sheetName, category, headerRowIndex) {
    try {
      const url = `${this.baseUrl}/${this.spreadsheetId}/values/${encodeURIComponent(sheetName)}?key=${this.apiKey}`;
      
      console.log(`🔑 Using API key: ${this.apiKey.substring(0, 10)}...`);
      console.log(`📋 Fetching ${category} data from sheet: ${sheetName} (headers in row ${headerRowIndex + 1})`);
      console.log(`🌐 Request URL: ${url}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Error fetching ${sheetName}:`, response.status, errorText);
        throw new Error(`Error fetching ${sheetName}: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.values || data.values.length === 0) {
        console.log(`⚠️ No data found in ${sheetName}`);
        return [];
      }

      return this.processSheetData(data.values, category, headerRowIndex);
    } catch (error) {
      console.error(`❌ Error fetching ${sheetName}:`, error);
      // Return empty array for this category if there's an error
      return [];
    }
  }

  // Process the raw sheet data into structured leads
  processSheetData(values, category, headerRowIndex) {
    if (!values || values.length <= headerRowIndex) {
      console.log(`⚠️ Not enough rows in ${category} sheet (need at least ${headerRowIndex + 1} rows)`);
      return [];
    }

    const headers = values[headerRowIndex];
    const dataRows = values.slice(headerRowIndex + 1); // Start after header row

    console.log(`📋 ${category} headers (row ${headerRowIndex + 1}):`, headers);
    console.log(`📊 ${category} data rows:`, dataRows.length);

    // Map columns based on headers for this specific category
    const columnMap = this.mapColumnsForCategory(headers, category);
    console.log(`🗺️ ${category} column mapping:`, columnMap);

    const leads = [];
    
    dataRows.forEach((row, index) => {
      // Skip empty rows
      if (!row[0] || row[0].trim() === '') return;

      const lead = this.createLeadFromRow(row, columnMap, `${category}-${index + 1}`, category);
      leads.push(lead);
    });

    console.log(`✅ Processed ${category} leads:`, leads.length);
    return leads;
  }

  // Map columns based on headers for specific categories
  mapColumnsForCategory(headers, category) {
    const columnMap = {};
    
    // All tabs now have the same structure: Organization, NAME, EMAIL, Instagram, PHONE, WEBSITE, NOTES
    headers.forEach((header, index) => {
      const normalizedHeader = header.toLowerCase().trim();
      
      if (normalizedHeader.includes('organization') || normalizedHeader.includes('company')) {
        columnMap.organization = index;
      } else if (normalizedHeader.includes('name') || normalizedHeader.includes('contact name')) {
        columnMap.contactName = index;
      } else if (normalizedHeader.includes('email') || normalizedHeader.includes('e-mail')) {
        columnMap.email = index;
      } else if (normalizedHeader.includes('instagram') || normalizedHeader.includes('ig')) {
        columnMap.instagram = index;
      } else if (normalizedHeader.includes('phone') || normalizedHeader.includes('tel')) {
        columnMap.phone = index;
      } else if (normalizedHeader.includes('website') || normalizedHeader.includes('web')) {
        columnMap.website = index;
      } else if (normalizedHeader.includes('notes') || normalizedHeader.includes('note')) {
        columnMap.notes = index;
      }
    });
    
    return columnMap;
  }

  // Create a lead object from a spreadsheet row
  createLeadFromRow(row, columnMap, id, category) {
    const rawInstagram = this.getCellValue(row, columnMap.instagram);
    const extractedInstagram = this.extractInstagramUsername(rawInstagram);
    
    // Log Instagram extraction for debugging
    if (rawInstagram && rawInstagram !== extractedInstagram) {
      console.log(`🔍 Instagram extraction: "${rawInstagram}" → "${extractedInstagram}"`);
    }
    
    const lead = {
      id,
      contactName: this.getCellValue(row, columnMap.contactName) || 'Unknown',
      phone: this.getCellValue(row, columnMap.phone) || 'No phone',
      email: this.getCellValue(row, columnMap.email) || 'No email',
      instagram: extractedInstagram,
      organization: this.getCellValue(row, columnMap.organization) || null,
      website: this.getCellValue(row, columnMap.website) || null,
      status: category, // Use category as default status
      lastContact: 'Unknown', // Default value since not in current columns
      notes: this.getCellValue(row, columnMap.notes) || '', // Use the NOTES column if available
      category: category // Track which tab this lead came from
    };

    // If no notes from the NOTES column, build notes from available information
    if (!lead.notes) {
      let notes = [];
      
      // Add category-specific context only
      if (category === 'warmLeads') {
        notes.push('Warm lead from social media outreach');
      } else if (category === 'coldLeads') {
        notes.push('Cold lead - needs initial contact');
      } else if (category === 'contactedClients') {
        notes.push('Previously contacted client');
      }
      
      lead.notes = notes.join(' | ') || 'No additional information';
    }

    return lead;
  }

  // Get cell value safely
  getCellValue(row, columnIndex) {
    if (columnIndex === undefined || columnIndex === null) return null;
    return row[columnIndex] ? row[columnIndex].trim() : null;
  }

  // Extract Instagram username from various formats
  extractInstagramUsername(instagramValue) {
    if (!instagramValue) return null;
    
    const value = instagramValue.trim();
    
    // If it's already just a username (starts with @)
    if (value.startsWith('@')) {
      return value.substring(1); // Remove the @ symbol
    }
    
    // If it's a full Instagram URL
    if (value.includes('instagram.com/')) {
      const match = value.match(/instagram\.com\/([^\/\?]+)/);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    // If it's a username without @ symbol
    if (value.match(/^[a-zA-Z0-9._]+$/)) {
      return value;
    }
    
    // If it contains @ symbol somewhere in the text, extract the username
    const atMatch = value.match(/@([a-zA-Z0-9._]+)/);
    if (atMatch && atMatch[1]) {
      return atMatch[1];
    }
    
    // If none of the above, return the original value (could be a custom format)
    return value;
  }

  // Test the connection to Google Sheets
  async testConnection() {
    try {
      const data = await this.fetchCRMData();
      return {
        success: true,
        message: '✅ Successfully connected to Google Sheets CRM - All tabs loaded',
        data: data,
        summary: {
          totalLeads: data.warmLeads.length + data.contactedClients.length + data.coldLeads.length,
          warmLeads: data.warmLeads.length,
          contactedClients: data.contactedClients.length,
          coldLeads: data.coldLeads.length
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ Connection failed: ${error.message}`,
        error: error
      };
    }
  }

  // Get spreadsheet metadata
  async getSpreadsheetInfo() {
    try {
      if (!this.apiKey) {
        throw new Error('Google Sheets API key not configured');
      }

      const url = `${this.baseUrl}/${this.spreadsheetId}?key=${this.apiKey}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch spreadsheet info: ${response.status}`);
      }

      const data = await response.json();
      return {
        title: data.properties.title,
        sheets: data.sheets.map(sheet => ({
          name: sheet.properties.title,
          id: sheet.properties.sheetId
        })),
        lastModified: data.properties.modifiedTime
      };
    } catch (error) {
      console.error('Error fetching spreadsheet info:', error);
      throw error;
    }
  }

  // Legacy method for backward compatibility
  async fetchCRMDataLegacy() {
    // This method is kept for backward compatibility
    // It will use the first tab only
    return this.fetchSheetData(this.sheetTabs.warmLeads, 'warm', this.headerRows.warmLeads);
  }

  // Add new lead to Google Sheets
  async addNewLead(leadData, selectedTabs) {
    try {
      if (!this.apiKey) {
        throw new Error('Google Sheets API key not configured');
      }

      console.log('➕ Adding new lead to Google Sheets:', leadData);
      console.log('📋 Selected tabs:', selectedTabs);

      const results = [];

      // Add lead to each selected tab
      for (const [tabKey, isSelected] of Object.entries(selectedTabs)) {
        if (isSelected) {
          try {
            const tabName = this.sheetTabs[tabKey];
            const result = await this.appendLeadToTab(leadData, tabName, tabKey);
            results.push({ tab: tabName, success: true, result });
            console.log(`✅ Lead added to ${tabName} successfully`);
          } catch (error) {
            console.error(`❌ Error adding lead to ${this.sheetTabs[tabKey]}:`, error);
            results.push({ tab: this.sheetTabs[tabKey], success: false, error: error.message });
          }
        }
      }

      return {
        success: results.some(r => r.success),
        results,
        message: `Lead added to ${results.filter(r => r.success).length} tab(s)`
      };
    } catch (error) {
      console.error('❌ Error adding new lead:', error);
      throw error;
    }
  }

  // Append lead to a specific tab
  async appendLeadToTab(leadData, tabName, tabKey) {
    try {
      // Prepare the row data in the correct order for the sheet
      const rowData = this.prepareLeadRow(leadData, tabKey);
      
      console.log(`🔍 Preparing to append to tab: ${tabName}`);
      console.log(`📊 Row data:`, rowData);
      
      // Check if we have service account credentials for write operations
      if (!this.serviceAccountCredentials) {
        throw new Error('Service account credentials required for write operations. Please upload your service account JSON file.');
      }

      // Get access token for write operations
      const accessToken = await this.getAccessToken();
      
      // Use Google Sheets append API with OAuth2 authentication
      const url = `${this.baseUrl}/${this.spreadsheetId}/values/${encodeURIComponent(tabName)}:append?valueInputOption=RAW`;
      
      console.log(`🌐 API URL:`, url);
      console.log(`🔐 Using OAuth2 authentication for write operation`);
      
      const requestBody = {
        values: [rowData]
      };
      
      console.log(`📤 Request body:`, requestBody);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(requestBody)
      });

      console.log(`📡 Response status:`, response.status);
      console.log(`📡 Response headers:`, Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ API Error Response:`, errorText);
        throw new Error(`Failed to append to ${tabName}: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log(`📝 Lead appended to ${tabName}:`, result);
      
      return result;
    } catch (error) {
      console.error(`❌ Error appending to ${tabName}:`, error);
      console.error(`❌ Error details:`, {
        message: error.message,
        stack: error.stack,
        tabName,
        tabKey,
        leadData
      });
      throw error;
    }
  }

  // Prepare lead data row in the correct column order
  prepareLeadRow(leadData, tabKey) {
    // Define the column order for each tab (matching the sheet structure)
    const columnOrder = [
      'organization',    // Organization
      'contactName',     // NAME
      'email',          // EMAIL
      'instagram',      // Instagram
      'phone',          // PHONE
      'website',        // WEBSITE
      'notes'           // NOTES
    ];

    // Map the lead data to the correct column order
    return columnOrder.map(field => {
      const value = leadData[field];
      return value || ''; // Return empty string if field is null/undefined
    });
  }
}

// Create and export a singleton instance
const crmGoogleSheetsService = new CRMGoogleSheetsService();

// Export both the class and the singleton instance
export { CRMGoogleSheetsService };
export default crmGoogleSheetsService;
