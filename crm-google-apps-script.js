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
 * Handle OPTIONS request for CORS preflight
 */
function doOptions(e) {
  try {
    console.log('📥 Received OPTIONS request (CORS preflight)');
    
    // Create response with CORS headers
    const output = ContentService.createTextOutput('')
      .setMimeType(ContentService.MimeType.TEXT);
    
    // Add CORS headers for preflight
    output.setHeader('Access-Control-Allow-Origin', '*');
    output.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    output.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    output.setHeader('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours
    
    return output;
    
  } catch (error) {
    console.error('❌ Error in doOptions:', error);
    
    const output = ContentService.createTextOutput('')
      .setMimeType(ContentService.MimeType.TEXT);
    
    output.setHeader('Access-Control-Allow-Origin', '*');
    output.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    output.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    return output;
  }
}

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
    
    // Set CORS headers to allow cross-origin requests
    const output = ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
    
    // Add CORS headers using the correct method
    output.setHeader('Access-Control-Allow-Origin', '*');
    output.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    output.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    return output;
      
  } catch (error) {
    console.error('❌ Error in doPost:', error);
    
    // Return error response
    const errorResponse = {
      success: false,
      error: error.message,
      stack: error.stack
    };
    
    const output = ContentService.createTextOutput(JSON.stringify(errorResponse))
      .setMimeType(ContentService.MimeType.JSON);
    
    // Add CORS headers even for errors
    output.setHeader('Access-Control-Allow-Origin', '*');
    output.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    output.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    return output;
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
 * Handle GET requests (for testing and JSONP)
 */
function doGet(e) {
  try {
    console.log('📥 Received GET request');
    
    // Parse query parameters
    const params = e.parameter;
    const action = params.action || 'test';
    const callback = params.callback; // JSONP callback parameter
    const data = params.data; // JSONP data parameter
    
    let response;
    
    if (action === 'test') {
      // Run test function
      testAddLead();
      
      response = {
        success: true,
        message: 'Test completed successfully',
        timestamp: new Date().toISOString()
      };
    } else if (callback && data) {
      // Handle JSONP request for adding leads
      console.log('📥 JSONP request received with callback:', callback);
      console.log('📊 JSONP data:', data);
      
      try {
        const requestData = JSON.parse(data);
        const leadData = requestData.leadData;
        const selectedTabs = requestData.selectedTabs;
        
        if (!leadData || !selectedTabs) {
          throw new Error('Missing leadData or selectedTabs in JSONP request');
        }
        
        // Add lead to each selected tab
        const results = [];
        for (const [tabKey, isSelected] of Object.entries(selectedTabs)) {
          if (isSelected) {
            try {
              const result = addLeadToSheet(leadData, tabKey);
              results.push({ tab: tabKey, success: true, result });
              console.log(`✅ Lead added to ${tabKey} successfully via JSONP`);
            } catch (error) {
              console.error(`❌ Error adding lead to ${tabKey}:`, error);
              results.push({ tab: tabKey, success: false, error: error.message });
            }
          }
        }
        
        response = {
          success: results.some(r => r.success),
          results: results,
          message: `Lead added to ${results.filter(r => r.success).length} tab(s) via JSONP`
        };
        
      } catch (error) {
        console.error('❌ Error processing JSONP request:', error);
        response = {
          success: false,
          error: error.message
        };
      }
    } else if (params.action === 'addLead') {
      // Handle addLead action via GET request (like ClientPackages)
      console.log('📥 addLead action received via GET');
      
      try {
        const leadData = JSON.parse(params.leadData);
        const selectedTabs = JSON.parse(params.selectedTabs);
        
        console.log('📊 Lead data:', leadData);
        console.log('📋 Selected tabs:', selectedTabs);
        
        if (!leadData || !selectedTabs) {
          throw new Error('Missing leadData or selectedTabs in addLead request');
        }
        
        // Add lead to each selected tab
        const results = [];
        for (const [tabKey, isSelected] of Object.entries(selectedTabs)) {
          if (isSelected) {
            try {
              const result = addLeadToSheet(leadData, tabKey);
              results.push({ tab: tabKey, success: true, result });
              console.log(`✅ Lead added to ${tabKey} successfully via GET`);
            } catch (error) {
              console.error(`❌ Error adding lead to ${tabKey}:`, error);
              results.push({ tab: tabKey, success: false, error: error.message });
            }
          }
        }
        
        response = {
          success: results.some(r => r.success),
          results: results,
          message: `Lead added to ${results.filter(r => r.success).length} tab(s) via GET`
        };
        
      } catch (error) {
        console.error('❌ Error processing addLead request:', error);
        response = {
          success: false,
          error: error.message
        };
      }
    } else {
      // Default response
      response = {
        success: true,
        message: 'CRM Google Apps Script is running',
        timestamp: new Date().toISOString(),
        availableActions: ['test', 'jsonp']
      };
    }
    
    // Handle JSONP callback
    if (callback) {
      console.log('📤 Sending JSONP response with callback:', callback);
      const jsonpResponse = `${callback}(${JSON.stringify(response)})`;
      return ContentService.createTextOutput(jsonpResponse)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    
    // Regular JSON response
    console.log('📤 Sending regular JSON response:', response);
    const output = ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
    
    // Add CORS headers
    output.setHeader('Access-Control-Allow-Origin', '*');
    output.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    output.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    return output;
      
  } catch (error) {
    console.error('❌ Error in doGet:', error);
    
    const errorResponse = {
      success: false,
      error: error.message
    };
    
    // Handle JSONP callback for errors too
    const params = e.parameter;
    const callback = params.callback;
    
    if (callback) {
      const jsonpResponse = `${callback}(${JSON.stringify(errorResponse)})`;
      return ContentService.createTextOutput(jsonpResponse)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    
    const output = ContentService.createTextOutput(JSON.stringify(errorResponse))
      .setMimeType(ContentService.MimeType.JSON);
    
    // Add CORS headers
    output.setHeader('Access-Control-Allow-Origin', '*');
    output.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    output.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    return output;
  }
}
