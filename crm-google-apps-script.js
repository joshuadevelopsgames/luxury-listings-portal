/**
 * CRM Google Apps Script for Luxury Listings Portal
 * This script handles adding new leads to Google Sheets
 * 
 * To use:
 * 1. Copy this code to script.google.com
 * 2. Deploy as web app
 * 3. Use the web app URL in the CRM
 */

// Configuration - Update these with your actual sheet details
const SPREADSHEET_ID = '1wM8g4bPituJoJFVp_Ndlv7o4p3NZMNEM2-WwuUnGvyE';
const SHEET_NAMES = {
  warmLeads: 'Warm Leads',
  contactedClients: 'Have Contacted Before with Proposals',
  coldLeads: 'Cold Leads'
};

// Column mapping for each sheet (0-indexed)
const COLUMN_MAPPING = {
  organization: 0,
  name: 1,
  email: 2,
  instagram: 3,
  phone: 4,
  website: 5,
  notes: 6
};

/**
 * Main function to handle web requests
 */
function doPost(e) {
  try {
    console.log('📥 Received POST request');
    
    // Parse the request data
    const requestData = JSON.parse(e.postData.contents);
    console.log('📊 Request data:', requestData);
    
    // Extract lead data and selected tabs
    const leadData = requestData.leadData;
    const selectedTabs = requestData.selectedTabs;
    
    if (!leadData || !selectedTabs) {
      throw new Error('Missing leadData or selectedTabs in request');
    }
    
    // Add lead to each selected tab
    const results = [];
    for (const [tabKey, isSelected] of Object.entries(selectedTabs)) {
      if (isSelected) {
        try {
          const result = addLeadToSheet(leadData, tabKey);
          results.push({ tab: tabKey, success: true, result });
          console.log(`✅ Lead added to ${tabKey} successfully`);
        } catch (error) {
          console.error(`❌ Error adding lead to ${tabKey}:`, error);
          results.push({ tab: tabKey, success: false, error: error.message });
        }
      }
    }
    
    // Return success response
    const response = {
      success: results.some(r => r.success),
      results: results,
      message: `Lead added to ${results.filter(r => r.success).length} tab(s)`
    };
    
    console.log('📤 Sending response:', response);
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('❌ Error in doPost:', error);
    
    // Return error response
    const errorResponse = {
      success: false,
      error: error.message,
      stack: error.stack
    };
    
    return ContentService.createTextOutput(JSON.stringify(errorResponse))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Add a lead to a specific sheet
 */
function addLeadToSheet(leadData, tabKey) {
  try {
    console.log(`🔍 Adding lead to sheet: ${tabKey}`);
    
    // Get the sheet name
    const sheetName = SHEET_NAMES[tabKey];
    if (!sheetName) {
      throw new Error(`Unknown tab key: ${tabKey}`);
    }
    
    // Open the spreadsheet and sheet
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(sheetName);
    
    if (!sheet) {
      throw new Error(`Sheet not found: ${sheetName}`);
    }
    
    console.log(`📋 Found sheet: ${sheetName}`);
    
    // Prepare the row data
    const rowData = prepareRowData(leadData);
    console.log(`📊 Row data:`, rowData);
    
    // Find the next empty row
    const lastRow = sheet.getLastRow();
    const insertRow = lastRow + 1;
    
    console.log(`📝 Inserting at row: ${insertRow}`);
    
    // Insert the new row
    const range = sheet.getRange(insertRow, 1, 1, rowData.length);
    range.setValues([rowData]);
    
    console.log(`✅ Lead added successfully to ${sheetName} at row ${insertRow}`);
    
    return {
      sheetName: sheetName,
      rowNumber: insertRow,
      message: `Lead added to ${sheetName} successfully`
    };
    
  } catch (error) {
    console.error(`❌ Error adding lead to sheet ${tabKey}:`, error);
    throw error;
  }
}

/**
 * Prepare row data in the correct column order
 */
function prepareRowData(leadData) {
  const rowData = new Array(7).fill(''); // Initialize with empty strings
  
  // Map the data to the correct columns
  if (leadData.organization) rowData[COLUMN_MAPPING.organization] = leadData.organization;
  if (leadData.contactName) rowData[COLUMN_MAPPING.name] = leadData.contactName;
  if (leadData.email) rowData[COLUMN_MAPPING.email] = leadData.email;
  if (leadData.instagram) rowData[COLUMN_MAPPING.instagram] = leadData.instagram;
  if (leadData.phone) rowData[COLUMN_MAPPING.phone] = leadData.phone;
  if (leadData.website) rowData[COLUMN_MAPPING.website] = leadData.website;
  if (leadData.notes) rowData[COLUMN_MAPPING.notes] = leadData.notes;
  
  return rowData;
}

/**
 * Test function to verify the script works
 */
function testAddLead() {
  const testLeadData = {
    contactName: 'Test Lead',
    email: 'test@example.com',
    phone: '(555) 123-4567',
    instagram: 'testuser',
    organization: 'Test Company',
    website: 'https://test.com',
    notes: 'This is a test lead'
  };
  
  const testSelectedTabs = {
    warmLeads: true,
    contactedClients: false,
    coldLeads: false
  };
  
  console.log('🧪 Testing addLeadToSheet function...');
  
  try {
    const result = addLeadToSheet(testLeadData, 'warmLeads');
    console.log('✅ Test successful:', result);
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

/**
 * Handle GET requests (for testing)
 */
function doGet(e) {
  try {
    console.log('📥 Received GET request');
    
    // Parse query parameters
    const params = e.parameter;
    const action = params.action || 'test';
    
    if (action === 'test') {
      // Run test function
      testAddLead();
      
      const response = {
        success: true,
        message: 'Test completed successfully',
        timestamp: new Date().toISOString()
      };
      
      return ContentService.createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Default response
    const response = {
      success: true,
      message: 'CRM Google Apps Script is running',
      timestamp: new Date().toISOString(),
      availableActions: ['test']
    };
    
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('❌ Error in doGet:', error);
    
    const errorResponse = {
      success: false,
      error: error.message
    };
    
    return ContentService.createTextOutput(JSON.stringify(errorResponse))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
