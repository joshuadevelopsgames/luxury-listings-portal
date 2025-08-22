// CRM Google Sheets Integration Service - UPDATED WITH CORRECT API KEY
class CRMGoogleSheetsService {
  constructor() {
    this.spreadsheetId = '1wM8g4bPituJoJFVp_Ndlv7o4p3NZMNEM2-WwuUnGvyE';
    this.apiKey = 'AIzaSyAxwCEtCAyvPgCdewK3UqErEfoKCDtYwHM';
    this.baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
    
    // Define sheet tab names
    this.sheetTabs = {
      warmLeads: 'Warm Leads',
      contactedClients: 'Have Contacted Before with Proposals',
      coldLeads: 'Cold Leads'
    };
    
    // Define header row positions for each tab (0-indexed)
    this.headerRows = {
      warmLeads: 0,        // Row 1 (0-indexed) - Headers are in Row 1
      contactedClients: 0, // Row 1 (0-indexed) - Headers are in Row 1
      coldLeads: 0         // Row 1 (0-indexed) - Headers are in Row 1
    };
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
      if (lead.organization) notes.push(`Organization: ${lead.organization}`);
      if (lead.website) notes.push(`Website: ${lead.website}`);
      
      // Add category-specific context
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
}

// Create and export a singleton instance
const crmGoogleSheetsService = new CRMGoogleSheetsService();

// Export both the class and the singleton instance
export { CRMGoogleSheetsService };
export default crmGoogleSheetsService;
