// Google Apps Script for Client Packages Management
// Deploy this as a web app to handle write operations

// Test function to manually trigger authorization
function testAuthorization() {
  try {
    console.log('🧪 Testing authorization...');
    
    // Try to access the spreadsheet
    const spreadsheetId = '1QDxr6nxOEQskXIciEeZiZBlVE-lMkGN875k8bBtKSEA';
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    
    console.log('✅ Successfully accessed spreadsheet:', spreadsheet.getName());
    console.log('✅ Authorization is working!');
    
    return {
      success: true,
      message: 'Authorization successful',
      spreadsheetName: spreadsheet.getName()
    };
  } catch (error) {
    console.error('❌ Authorization failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

function doGet(e) {
  try {
    // Log the incoming request for debugging
    console.log('Received GET request');
    console.log('Parameters:', e ? e.parameter : 'No parameters (manual run)');
    
    // Handle manual run (no parameters)
    if (!e || !e.parameter) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: true,
          message: 'Google Apps Script is running! Use testAuthorization() to authorize.'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Get action from parameters
    const action = e.parameter.action || 'test';
    const clientDataStr = e.parameter.clientData;
    
    let clientData = {};
    if (clientDataStr) {
      try {
        clientData = JSON.parse(decodeURIComponent(clientDataStr));
      } catch (error) {
        console.error('Error parsing clientData:', error);
      }
    }
    
    console.log('Parsed action:', action);
    console.log('Parsed clientData:', clientData);
    
    // Get the spreadsheet
    const spreadsheetId = '1QDxr6nxOEQskXIciEeZiZBlVE-lMkGN875k8bBtKSEA';
    
    console.log('🔍 Opening spreadsheet:', spreadsheetId);
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    console.log('📋 Spreadsheet title:', spreadsheet.getName());
    
    // For actions that need a specific sheet, we'll determine it in the individual functions
    let sheet = null;
    let sheetName = 'Social Media Packages'; // default
    
    // Only get sheet for actions that need it (email doesn't need sheet)
    if (['test', 'update', 'add', 'approve', 'delete', 'archive', 'restore', 'deleteArchived', 'addLead'].includes(action)) {
      // Determine which sheet to use based on package type
      console.log('🔍 Determining sheet based on package type:', clientData.packageType);
      if (clientData.packageType === 'Monthly') {
        sheetName = 'Monthly Recurring';
        console.log('✅ Monthly package detected - using Monthly Recurring sheet');
      } else {
        console.log('📋 Non-monthly package - using Social Media Packages sheet');
      }
      
      console.log('🔍 Getting sheet:', sheetName);
      console.log('📊 Client package type:', clientData.packageType);
      sheet = spreadsheet.getSheetByName(sheetName);
    }
    
    // Only validate sheet if the action requires it
    if (['test', 'update', 'add', 'approve', 'delete', 'archive', 'restore', 'deleteArchived', 'addLead'].includes(action)) {
      if (!sheet) {
        console.error('❌ Sheet not found:', sheetName);
        console.log('📋 Available sheets:', spreadsheet.getSheets().map(s => s.getName()));
        throw new Error(`Sheet "${sheetName}" not found`);
      }
      
      console.log('✅ Sheet found:', sheet.getName());
      console.log('📊 Sheet dimensions:', sheet.getLastRow(), 'rows x', sheet.getLastColumn(), 'columns');
    }
    
    let result = {};
    
    switch (action) {
      case 'test':
        result = { 
          success: true, 
          message: 'GET test successful', 
          receivedData: clientData,
          sheetInfo: {
            name: sheet.getName(),
            rows: sheet.getLastRow(),
            columns: sheet.getLastColumn()
          }
        };
        break;
      case 'update':
        console.log('🔄 Executing updateClient function');
        result = updateClient(sheet, clientData);
        break;
      case 'add':
        console.log('➕ Executing addClient function');
        result = addClient(sheet, clientData);
        break;
      case 'approve':
        console.log('✅ Executing approveClient function');
        console.log('✅ Client data for approve:', clientData);
        try {
          result = approveClient(sheet, clientData);
          console.log('✅ ApproveClient result:', result);
        } catch (approveError) {
          console.error('✅ Error in approveClient:', approveError);
          throw approveError;
        }
        break;
      case 'delete':
        console.log('🗑️ Executing deleteClient function');
        console.log('🗑️ Client data for delete:', clientData);
        try {
          result = deleteClient(sheet, clientData);
          console.log('🗑️ DeleteClient result:', result);
        } catch (deleteError) {
          console.error('🗑️ Error in deleteClient:', deleteError);
          throw deleteError;
        }
        break;
      case 'archive':
        result = archiveClient(sheet, clientData);
        break;
      case 'restore':
        result = restoreClient(sheet, clientData);
        break;
      case 'deleteArchived':
        result = deleteArchivedClient(sheet, clientData);
        break;
      case 'sendSupportEmail':
        console.log('📧 Executing sendSupportEmail function');
        const ticketDataStr = e.parameter.ticketData;
        let ticketData = {};
        if (ticketDataStr) {
          try {
            ticketData = JSON.parse(decodeURIComponent(ticketDataStr));
          } catch (error) {
            console.error('Error parsing ticketData:', error);
          }
        }
        result = sendSupportTicketEmail(ticketData);
        break;
      case 'addLead':
        const leadDataStr = e.parameter.leadData;
        const selectedTabsStr = e.parameter.selectedTabs;
        
        let leadData = {};
        let selectedTabs = {};
        
        if (leadDataStr) {
          try {
            leadData = JSON.parse(decodeURIComponent(leadDataStr));
          } catch (error) {
            console.error('Error parsing leadData:', error);
          }
        }
        
        if (selectedTabsStr) {
          try {
            selectedTabs = JSON.parse(decodeURIComponent(selectedTabsStr));
          } catch (error) {
            console.error('Error parsing selectedTabs:', error);
          }
        }
        
        result = addLead(leadData, selectedTabs);
        break;
        
      // Firebase Admin SDK endpoints
      case 'getApprovedUsers':
        console.log('🔄 Getting approved users from Firebase...');
        result = getFirebaseApprovedUsers();
        break;
        
      case 'getPendingUsers':
        console.log('🔄 Getting pending users from Firebase...');
        result = getFirebasePendingUsers();
        break;
        
      case 'addPendingUser':
        console.log('🔄 Adding pending user to Firebase...');
        const pendingUserDataStr = e.parameter.userData;
        let pendingUserData = {};
        if (pendingUserDataStr) {
          try {
            pendingUserData = JSON.parse(decodeURIComponent(pendingUserDataStr));
          } catch (error) {
            console.error('Error parsing pendingUserData:', error);
          }
        }
        result = addFirebasePendingUser(pendingUserData);
        break;
        
      case 'removePendingUser':
        console.log('🔄 Removing pending user from Firebase...');
        const userId = e.parameter.userId;
        result = removeFirebasePendingUser(userId);
        break;
        
      case 'addApprovedUser':
        console.log('🔄 Adding approved user to Firebase...');
        const approvedUserDataStr = e.parameter.userData;
        let approvedUserData = {};
        if (approvedUserDataStr) {
          try {
            approvedUserData = JSON.parse(decodeURIComponent(approvedUserDataStr));
          } catch (error) {
            console.error('Error parsing approvedUserData:', error);
          }
        }
        result = addFirebaseApprovedUser(approvedUserData);
        break;
        
      case 'updateApprovedUser':
        console.log('🔄 Updating approved user in Firebase...');
        const updateEmail = e.parameter.email;
        const updatesStr = e.parameter.updates;
        let updates = {};
        if (updatesStr) {
          try {
            updates = JSON.parse(decodeURIComponent(updatesStr));
          } catch (error) {
            console.error('Error parsing updates:', error);
          }
        }
        result = updateFirebaseApprovedUser(updateEmail, updates);
        break;
        
      case 'getSystemConfig':
        console.log('🔄 Getting system config from Firebase...');
        const configKey = e.parameter.key;
        result = getFirebaseSystemConfig(configKey);
        break;
        
      case 'saveSystemConfig':
        console.log('🔄 Saving system config to Firebase...');
        const saveKey = e.parameter.key;
        const saveValue = e.parameter.value;
        result = saveFirebaseSystemConfig(saveKey, saveValue);
        break;
        
      case 'getTasks':
        console.log('🔄 Getting tasks from Firebase...');
        result = getFirebaseTasks();
        break;
        
      default:
        result = { 
          success: true, 
          message: 'Google Apps Script is running', 
          timestamp: new Date().toISOString(),
          sheetInfo: {
            name: sheet.getName(),
            rows: sheet.getLastRow(),
            columns: sheet.getLastColumn()
          }
        };
    }
    
    // Return success response with CORS headers
    const output = ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
    
    // Add CORS headers for cross-origin requests
    output.setHeader('Access-Control-Allow-Origin', '*');
    output.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    output.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    return output;
      
  } catch (error) {
    // Log the error for debugging
    console.error('Error in doGet:', error.message);
    console.error('Error stack:', error.stack);
    
    // Return error response with CORS headers
    const output = ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      }))
      .setMimeType(ContentService.MimeType.JSON);
    
    // Add CORS headers
    output.setHeader('Access-Control-Allow-Origin', '*');
    output.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    output.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    return output;
  }
}

// Handle OPTIONS request for CORS preflight
function doOptions(e) {
  const output = ContentService.createTextOutput('');
  output.setHeader('Access-Control-Allow-Origin', '*');
  output.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  output.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  output.setHeader('Access-Control-Max-Age', '86400');
  return output;
}

function doPost(e) {
  // Redirect POST to GET for CORS compatibility
  return doGet(e);
}

function updateClient(sheet, clientData) {
  console.log('🔄 Starting updateClient function');
  console.log('📊 Client data received:', clientData);
  
  let rowNumber = -1; // Declare rowNumber at function scope
  
  try {
    // Find the row by client name instead of just using ID
    const clientName = clientData.clientName;
    console.log('🔍 Looking for client:', clientName);
    
    // Get all client names from column A
    const clientNames = sheet.getRange(1, 1, sheet.getLastRow(), 1).getValues().flat();
    console.log('📋 All client names:', clientNames);
    
    // Find the row number for this client
    for (let i = 0; i < clientNames.length; i++) {
      if (clientNames[i] && clientNames[i].toString().toLowerCase() === clientName.toLowerCase()) {
        rowNumber = i + 1; // +1 because array is 0-indexed but sheet rows are 1-indexed
        break;
      }
    }
    
    if (rowNumber === -1) {
      console.error('❌ Client not found:', clientName);
      throw new Error(`Client "${clientName}" not found in the sheet`);
    }
    
    console.log('📋 Found client at row:', rowNumber);
    
    // Get the current row to preserve other columns
    const currentRow = sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn()).getValues()[0];
    console.log('📋 Current row data:', currentRow);
    
    // Update only the specific columns based on the sheet type
    const currentSheetName = sheet.getName();
    
    if (currentSheetName === 'Monthly Recurring') {
      // Monthly Recurring sheet structure: Client Name, Package Type, Email, Date Added, Posted On Page, Payment Status, Approval Status, Notes, Package Size, Posts Used, Posts Remaining, Last Contact, Next Billing Date, Billing Cycle, Price Paid, Auto Renew, Overdue Posts
      currentRow[0] = clientData.clientName;     // A - Client Name
      currentRow[1] = clientData.packageType;    // B - Package Type
      currentRow[2] = clientData.clientEmail || ''; // C - Email
      // currentRow[3] = date added (preserve existing)
      currentRow[4] = clientData.postedOn;       // E - Posted On Page
      currentRow[5] = clientData.paymentStatus;  // F - Payment Status
      currentRow[6] = clientData.approvalStatus; // G - Approval Status
      currentRow[7] = clientData.notes || '';    // H - Notes
      currentRow[8] = clientData.packageSize;    // I - Package Size
      currentRow[9] = clientData.postsUsed;      // J - Posts Used
      currentRow[10] = clientData.postsRemaining; // K - Posts Remaining
      currentRow[11] = clientData.lastContact || new Date().toISOString().split('T')[0]; // L - Last Contact
      // currentRow[12] = next billing date (preserve existing)
      // currentRow[13] = billing cycle (preserve existing)
      currentRow[14] = clientData.customPrice || 0; // O - Price Paid
      // currentRow[15] = auto renew (preserve existing)
      currentRow[16] = clientData.overduePosts || 0; // Q - Overdue Posts
    } else {
      // Main Social Media Packages sheet structure
      // A=Client Name, B=Package Type, C=Email, D=Date Added, E=Posted On (Page), F=Payment Status, G=Sales Stage, H=Approval Status, I=Notes, J=Status Change Date, K=Package Size, L=Posts Used, M=Last Post Date, N=Posts Remaining, O=Package Completed, P=Approval Email Recipient, Q=Price Paid (USD), R=Post Insights Sent, S=Overdue Posts
      
      currentRow[0] = clientData.clientName;     // A - Client Name
      currentRow[1] = clientData.packageType;    // B - Package Type
      currentRow[2] = clientData.clientEmail || ''; // C - Email
      // currentRow[3] = date added (preserve existing)
      currentRow[4] = clientData.postedOn;       // E - Posted On (Page)
      currentRow[5] = clientData.paymentStatus;  // F - Payment Status
      // currentRow[6] = sales stage (preserve existing)
      currentRow[7] = clientData.approvalStatus; // H - Approval Status
      currentRow[8] = clientData.notes || '';    // I - Notes
      // currentRow[9] = status change date (preserve existing)
      currentRow[10] = clientData.packageSize;   // K - Package Size
      currentRow[11] = clientData.postsUsed;     // L - Posts Used
      // currentRow[12] = last post date (preserve existing)
      currentRow[13] = clientData.postsRemaining; // N - Posts Remaining
      // currentRow[14] = package completed (preserve existing)
      // currentRow[15] = approval email recipient (preserve existing)
      currentRow[16] = clientData.customPrice || 0; // Q - Price Paid (USD) - use custom price for custom packages
      // currentRow[17] = post insights sent (preserve existing)
      
      // Add overdue posts if column exists (column S)
      if (currentRow.length >= 19) {
        currentRow[18] = clientData.overduePosts || 0; // S - Overdue Posts (new column)
      }
    }
    
    console.log('📋 Updated row data:', currentRow);
    
    // Update the row
    const range = sheet.getRange(rowNumber, 1, 1, currentRow.length);
    range.setValues([currentRow]);
    
    console.log('✅ Row updated successfully');
  } catch (error) {
    console.error('❌ Error updating row:', error.message);
    throw error;
  }
  
  return {
    success: true,
    message: 'Client updated successfully',
    rowNumber: rowNumber
  };
}

function addClient(sheet, clientData) {
  console.log('🔄 Starting addClient function');
  console.log('📊 Client data received:', clientData);
  console.log('📋 Sheet name:', sheet.getName());
  
  let insertRow = 2; // Declare insertRow at function scope
  
  try {
    // Find the first empty row after existing data
    const lastRow = sheet.getLastRow();
    console.log('📋 Last row with data:', lastRow);
    
    // Look for the first empty row starting from row 2 (after header)
    for (let i = 2; i <= lastRow + 1; i++) {
      const cellValue = sheet.getRange(i, 1).getValue(); // Check column A (Client Name)
      if (!cellValue || cellValue.toString().trim() === '') {
        insertRow = i;
        break;
      }
    }
    
    console.log('📋 Inserting new client at row:', insertRow);
    
    // Prepare the new row data based on sheet type
    let newRow;
    const currentSheetName = sheet.getName();
    
    if (currentSheetName === 'Monthly Recurring') {
      // Monthly Recurring sheet structure: Client Name, Package Type, Email, Date Added, Posted On Page, Payment Status, Approval Status, Notes, Package Size, Posts Used, Posts Remaining, Last Contact, Next Billing Date, Billing Cycle, Price Paid, Auto Renew, Overdue Posts
      newRow = [
        clientData.clientName,     // A - Client Name
        clientData.packageType,    // B - Package Type
        clientData.clientEmail || '', // C - Email
        new Date().toISOString().split('T')[0], // D - Date Added (today)
        clientData.postedOn,       // E - Posted On Page
        clientData.paymentStatus,  // F - Payment Status
        clientData.approvalStatus, // G - Approval Status
        clientData.notes || '',    // H - Notes
        clientData.packageSize,    // I - Package Size
        clientData.postsUsed,      // J - Posts Used
        clientData.postsRemaining, // K - Posts Remaining
        clientData.lastContact || new Date().toISOString().split('T')[0], // L - Last Contact
        '',                        // M - Next Billing Date (empty for now)
        'Monthly',                 // N - Billing Cycle
        clientData.customPrice || '', // O - Price Paid
        'TRUE',                    // P - Auto Renew (default for monthly)
        clientData.overduePosts || 0 // Q - Overdue Posts
      ];
    } else {
      // Main Social Media Packages sheet structure
      newRow = [
        clientData.clientName,     // A - Client Name
        clientData.packageType,    // B - Package Type
        clientData.clientEmail || '', // C - Email
        new Date().toISOString().split('T')[0], // D - Date Added (today)
        clientData.postedOn,       // E - Posted On (Page)
        clientData.paymentStatus,  // F - Payment Status
        'Ready for Approval',      // G - Sales Stage (default)
        clientData.approvalStatus, // H - Approval Status
        clientData.notes || '',    // I - Notes
        new Date().toISOString().split('T')[0], // J - Status Change Date (today)
        clientData.packageSize,    // K - Package Size
        clientData.postsUsed,      // L - Posts Used
        '',                        // M - Last Post Date (empty)
        clientData.postsRemaining, // N - Posts Remaining
        'FALSE',                   // O - Package Completed
        '',                        // P - Approval Email Recipient
        clientData.customPrice || '', // Q - Price Paid (USD) - use custom price
        'FALSE'                    // R - Post Insights Sent
      ];
      
      // Add overdue posts column if it exists (column S)
      if (sheet.getLastColumn() >= 19) {
        newRow.push(clientData.overduePosts || 0); // S - Overdue Posts
      }
    }
    
    // Insert the new row at the found position
    sheet.insertRowBefore(insertRow);
    const range = sheet.getRange(insertRow, 1, 1, newRow.length);
    range.setValues([newRow]);
    
    console.log('✅ New client added successfully at row:', insertRow);
  } catch (error) {
    console.error('❌ Error adding client:', error.message);
    throw error;
  }
  
  return {
    success: true,
    message: 'Client added successfully',
    rowNumber: insertRow
  };
}

function approveClient(sheet, clientData) {
  console.log('✅ Starting approveClient function');
  console.log('📊 Client data received:', clientData);
  
  // Validate input data
  if (!clientData || clientData.id === undefined || clientData.id === null) {
    throw new Error('Invalid client data: id is required for approval');
  }
  
  const rowNumber = clientData.id + 1; // Add 1 for header row
  console.log('📋 Using row number:', rowNumber);
  
  // Update only the approval status (column H)
  const approvalStatus = clientData.approved ? 'Approved' : 'Rejected';
  sheet.getRange(rowNumber, 8).setValue(approvalStatus);
  
  return {
    success: true,
    message: `Client ${approvalStatus.toLowerCase()} successfully`,
    rowNumber: rowNumber,
    approvalStatus: approvalStatus
  };
}

function deleteClient(sheet, clientData) {
  console.log('🗑️ Starting deleteClient function');
  console.log('📊 Client data received:', clientData);
  
  let rowNumber = -1; // Declare at function scope
  
  try {
    // Validate input data
    if (!clientData || !clientData.clientName) {
      throw new Error('Invalid client data: clientName is required');
    }
    
    // Find the row by client name (column A)
    const lastRow = sheet.getLastRow();
    console.log('📊 Searching in sheet with', lastRow, 'rows');
    
    for (let i = 2; i <= lastRow; i++) {
      const cellValue = sheet.getRange(i, 1).getValue(); // Check column A (Client Name)
      if (cellValue && cellValue.toString().trim().toLowerCase() === clientData.clientName.toLowerCase()) {
        rowNumber = i;
        console.log('📋 Found client at row:', rowNumber);
        break;
      }
    }
    
    if (rowNumber === -1) {
      throw new Error(`Client "${clientData.clientName}" not found`);
    }
    
    console.log('📋 Deleting client at row:', rowNumber);
    
    // Delete the entire row
    sheet.deleteRow(rowNumber);
    
    console.log('✅ Client deleted successfully from row:', rowNumber);
  } catch (error) {
    console.error('❌ Error deleting client:', error.message);
    console.error('❌ Error details:', error);
    throw error;
  }
  
  return {
    success: true,
    message: 'Client deleted successfully',
    rowNumber: rowNumber
  };
}

function archiveClient(sheet, clientData) {
  console.log('📦 Starting archiveClient function');
  console.log('📊 Client data received:', clientData);
  
  let rowNumber = -1; // Declare at function scope
  
  try {
    // Get the main sheet and archive sheet
    const spreadsheet = sheet.getParent();
    let archiveSheet = spreadsheet.getSheetByName('Archived Clients');
    
    if (!archiveSheet) {
      // Create archive sheet if it doesn't exist
      archiveSheet = spreadsheet.insertSheet('Archived Clients');
      console.log('📋 Created new Archived Clients sheet');
      
      // Copy headers from main sheet
      const mainHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      archiveSheet.getRange(1, 1, 1, mainHeaders.length).setValues([mainHeaders]);
    }
    
    // Find the row by client name (column A) in main sheet
    const lastRow = sheet.getLastRow();
    
    for (let i = 2; i <= lastRow; i++) {
      const cellValue = sheet.getRange(i, 1).getValue(); // Check column A (Client Name)
      if (cellValue && cellValue.toString().trim().toLowerCase() === clientData.clientName.toLowerCase()) {
        rowNumber = i;
        break;
      }
    }
    
    if (rowNumber === -1) {
      throw new Error(`Client "${clientData.clientName}" not found`);
    }
    
    console.log('📋 Archiving client from row:', rowNumber);
    
    // Get the client data row
    const clientRow = sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Add archive date to the end
    const archivedRow = [...clientRow, new Date().toISOString().split('T')[0]];
    
    // Add to archive sheet
    archiveSheet.appendRow(archivedRow);
    
    // Delete from main sheet
    sheet.deleteRow(rowNumber);
    
    console.log('✅ Client archived successfully');
  } catch (error) {
    console.error('❌ Error archiving client:', error.message);
    throw error;
  }
  
  return {
    success: true,
    message: 'Client archived successfully'
  };
}

function restoreClient(sheet, clientData) {
  console.log('🔄 Starting restoreClient function');
  console.log('📊 Client data received:', clientData);
  
  let rowNumber = -1; // Declare at function scope
  
  try {
    // Get the main sheet and archive sheet
    const spreadsheet = sheet.getParent();
    console.log('📋 Main sheet name:', sheet.getName());
    console.log('📋 Main sheet dimensions:', sheet.getLastRow(), 'rows x', sheet.getLastColumn(), 'columns');
    
    const archiveSheet = spreadsheet.getSheetByName('Archived Clients');
    
    if (!archiveSheet) {
      throw new Error('Archive sheet "Archived Clients" not found');
    }
    
    console.log('📋 Archive sheet found:', archiveSheet.getName());
    console.log('📋 Archive sheet dimensions:', archiveSheet.getLastRow(), 'rows x', archiveSheet.getLastColumn(), 'columns');
    
    // Find the row by client name (column A) in archive sheet
    const lastRow = archiveSheet.getLastRow();
    
    for (let i = 2; i <= lastRow; i++) {
      const cellValue = archiveSheet.getRange(i, 1).getValue(); // Check column A (Client Name)
      if (cellValue && cellValue.toString().trim().toLowerCase() === clientData.clientName.toLowerCase()) {
        rowNumber = i;
        break;
      }
    }
    
    if (rowNumber === -1) {
      throw new Error(`Client "${clientData.clientName}" not found in archive`);
    }
    
    console.log('📋 Restoring client from archive row:', rowNumber);
    
    // Get the archived client data row (all 18 columns A-R)
    const archivedRow = archiveSheet.getRange(rowNumber, 1, 1, 18).getValues()[0];
    console.log('📦 Archived row data:', archivedRow);
    
    // Simply append the archived data to the main sheet
    // This preserves all the original data structure
    sheet.appendRow(archivedRow);
    
    console.log('✅ Client data appended to main sheet');
    
    // Delete from archive sheet
    archiveSheet.deleteRow(rowNumber);
    
    console.log('✅ Client restored successfully');
  } catch (error) {
    console.error('❌ Error restoring client:', error.message);
    throw error;
  }
  
  return {
    success: true,
    message: 'Client restored successfully'
  };
}

function deleteArchivedClient(sheet, clientData) {
  console.log('🗑️ Starting deleteArchivedClient function');
  console.log('📊 Client data received:', clientData);
  
  let rowNumber = -1; // Declare at function scope
  
  try {
    // Get the archive sheet
    const spreadsheet = sheet.getParent();
    const archiveSheet = spreadsheet.getSheetByName('Archived Clients');
    
    if (!archiveSheet) {
      throw new Error('Archive sheet "Archived Clients" not found');
    }
    
    // Find the row by client name (column A) in archive sheet
    const lastRow = archiveSheet.getLastRow();
    
    for (let i = 2; i <= lastRow; i++) {
      const cellValue = archiveSheet.getRange(i, 1).getValue(); // Check column A (Client Name)
      if (cellValue && cellValue.toString().trim().toLowerCase() === clientData.clientName.toLowerCase()) {
        rowNumber = i;
        break;
      }
    }
    
    if (rowNumber === -1) {
      throw new Error(`Client "${clientData.clientName}" not found in archive`);
    }
    
    console.log('📋 Deleting archived client at row:', rowNumber);
    
    // Delete the entire row from archive sheet
    archiveSheet.deleteRow(rowNumber);
    
    console.log('✅ Archived client deleted successfully');
  } catch (error) {
    console.error('❌ Error deleting archived client:', error.message);
    throw error;
  }
  
  return {
    success: true,
    message: 'Archived client deleted successfully'
  };
}

// Add new lead to CRM sheets
function addLead(leadData, selectedTabs) {
  try {
    console.log('➕ Adding new lead to CRM sheets');
    console.log('📊 Lead data:', leadData);
    console.log('📋 Selected tabs:', selectedTabs);
    
    // Get the CRM spreadsheet
    const crmSpreadsheetId = '1wM8g4bPituJoJFVp_Ndlv7o4p3NZMNEM2-WwuUnGvyE';
    const crmSpreadsheet = SpreadsheetApp.openById(crmSpreadsheetId);
    
    // Define sheet names
    const sheetNames = {
      warmLeads: 'Warm Leads',
      contactedClients: 'Have Contacted Before with Proposals',
      coldLeads: 'Cold Leads'
    };
    
    const results = [];
    
    // Add to each selected tab
    for (const [tabKey, isSelected] of Object.entries(selectedTabs)) {
      if (isSelected && sheetNames[tabKey]) {
        try {
          const sheet = crmSpreadsheet.getSheetByName(sheetNames[tabKey]);
          if (!sheet) {
            console.error(`❌ Sheet "${sheetNames[tabKey]}" not found`);
            continue;
          }
          
          // Prepare row data in the correct order: Organization, NAME, EMAIL, Instagram, PHONE, WEBSITE, NOTES
          const rowData = [
            leadData.organization || '',
            leadData.contactName || '',
            leadData.email || '',
            leadData.instagram || '',
            leadData.phone || '',
            leadData.website || '',
            leadData.notes || ''
          ];
          
          // Append the row to the sheet
          sheet.appendRow(rowData);
          
          console.log(`✅ Lead added to ${sheetNames[tabKey]}`);
          results.push({
            tab: tabKey,
            sheetName: sheetNames[tabKey],
            success: true
          });
          
        } catch (error) {
          console.error(`❌ Error adding to ${sheetNames[tabKey]}:`, error);
          results.push({
            tab: tabKey,
            sheetName: sheetNames[tabKey],
            success: false,
            error: error.message
          });
        }
      }
    }
    
    return {
      success: true,
      message: 'Lead added to CRM sheets successfully',
      results: results
    };
    
  } catch (error) {
    console.error('❌ Error adding lead to CRM:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Firebase Admin SDK Functions
// Note: These would need to be implemented with proper Firebase Admin SDK
// For now, returning mock data to test the API structure

function getFirebaseApprovedUsers() {
  try {
    console.log('🔍 Getting approved users from Firebase...');
    
    // Mock data - replace with actual Firebase Admin SDK calls
    const approvedUsers = [
      {
        id: 'aamin@luxury-listings.com',
        email: 'aamin@luxury-listings.com',
        firstName: 'Aamin',
        lastName: 'Okhovat',
        role: 'content_director',
        primaryRole: 'content_director',
        isApproved: true,
        department: 'Content & Creative',
        displayName: 'Aamin Okhovat'
      },
      {
        id: 'alberta@luxury-listings.com',
        email: 'alberta@luxury-listings.com',
        firstName: 'Alberta',
        lastName: 'K',
        role: 'content_director',
        primaryRole: 'content_director',
        isApproved: true,
        department: 'Content & Creative',
        displayName: 'Alberta K'
      },
      {
        id: 'jrsschroeder@gmail.com',
        email: 'jrsschroeder@gmail.com',
        firstName: 'Joshua',
        lastName: 'Schroeder',
        role: 'admin',
        primaryRole: 'admin',
        isApproved: true,
        department: 'Administration',
        displayName: 'Joshua Schroeder (Josh)'
      }
    ];
    
    return {
      success: true,
      users: approvedUsers
    };
  } catch (error) {
    console.error('❌ Error getting approved users:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

function getFirebasePendingUsers() {
  try {
    console.log('🔍 Getting pending users from Firebase...');
    
    // Mock data - replace with actual Firebase Admin SDK calls
    const pendingUsers = [];
    
    return {
      success: true,
      users: pendingUsers
    };
  } catch (error) {
    console.error('❌ Error getting pending users:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

function addFirebasePendingUser(userData) {
  try {
    console.log('🔍 Adding pending user to Firebase:', userData.email);
    
    // Mock implementation - replace with actual Firebase Admin SDK calls
    const userId = 'pending-' + Date.now();
    
    return {
      success: true,
      userId: userId,
      message: 'Pending user added successfully'
    };
  } catch (error) {
    console.error('❌ Error adding pending user:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

function removeFirebasePendingUser(userId) {
  try {
    console.log('🔍 Removing pending user from Firebase:', userId);
    
    // Mock implementation - replace with actual Firebase Admin SDK calls
    
    return {
      success: true,
      message: 'Pending user removed successfully'
    };
  } catch (error) {
    console.error('❌ Error removing pending user:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

function addFirebaseApprovedUser(userData) {
  try {
    console.log('🔍 Adding approved user to Firebase:', userData.email);
    
    // Mock implementation - replace with actual Firebase Admin SDK calls
    
    return {
      success: true,
      message: 'Approved user added successfully'
    };
  } catch (error) {
    console.error('❌ Error adding approved user:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

function updateFirebaseApprovedUser(email, updates) {
  try {
    console.log('🔍 Updating approved user in Firebase:', email);
    
    // Mock implementation - replace with actual Firebase Admin SDK calls
    
    return {
      success: true,
      message: 'Approved user updated successfully'
    };
  } catch (error) {
    console.error('❌ Error updating approved user:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

function getFirebaseSystemConfig(key) {
  try {
    console.log('🔍 Getting system config from Firebase:', key);
    
    // Mock implementation - replace with actual Firebase Admin SDK calls
    const mockConfigs = {
      'currentRole': 'admin',
      'systemUptime': '99.9%'
    };
    
    return {
      success: true,
      value: mockConfigs[key] || null
    };
  } catch (error) {
    console.error('❌ Error getting system config:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

function saveFirebaseSystemConfig(key, value) {
  try {
    console.log('🔍 Saving system config to Firebase:', key, value);
    
    // Mock implementation - replace with actual Firebase Admin SDK calls
    
    return {
      success: true,
      message: 'System config saved successfully'
    };
  } catch (error) {
    console.error('❌ Error saving system config:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

function getFirebaseTasks() {
  try {
    console.log('🔍 Getting tasks from Firebase...');
    
    // Mock data - replace with actual Firebase Admin SDK calls
    const tasks = [
      {
        id: 'task-1',
        title: 'Review and update your ClickUp task status',
        description: 'Update progress on all assigned tasks in the project management system',
        category: 'Administrative',
        priority: 'low',
        due_date: '2025-08-15',
        estimated_time: 20,
        assigned_to: 'joshua@luxurylistings.com',
        status: 'pending',
        created_date: '2025-08-10T10:00:00.000Z'
      },
      {
        id: 'task-2',
        title: 'Create your first luxury post using the Luxe Post Kit',
        description: 'Design a high-quality post following the brand guidelines',
        category: 'Content Creation',
        priority: 'high',
        due_date: '2025-08-14',
        estimated_time: 90,
        assigned_to: 'joshua@luxurylistings.com',
        status: 'pending',
        created_date: '2025-08-10T10:00:00.000Z'
      }
    ];
    
    return {
      success: true,
      tasks: tasks
    };
  } catch (error) {
    console.error('❌ Error getting tasks:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

function sendSupportTicketEmail(ticketData) {
  try {
    console.log('📧 Sending support ticket email notification');
    console.log('📧 Ticket data:', ticketData);
    
    const recipient = 'jrsschroeder@gmail.com';
    const subject = `🎫 New IT Support Ticket: ${ticketData.title || 'Untitled'}`;
    
    // Build email body
    let emailBody = `
A new IT support ticket has been submitted on the Luxury Listings Portal.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TICKET DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 Title: ${ticketData.title || 'N/A'}

👤 Submitted By: ${ticketData.requesterName || 'Unknown'}
📧 Email: ${ticketData.requesterEmail || 'N/A'}

🏷️ Category: ${ticketData.category || 'N/A'}
⚡ Priority: ${(ticketData.priority || 'medium').toUpperCase()}

📄 Description:
${ticketData.description || 'No description provided'}
`;

    if (ticketData.pageUrl) {
      emailBody += `\n\n🔗 Page URL:\n${ticketData.pageUrl}`;
    }

    if (ticketData.screenshotUrl) {
      emailBody += `\n\n📸 Screenshot:\n${ticketData.screenshotUrl}`;
    }

    emailBody += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
View all support tickets: https://smmluxurylistings.info/it-support
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This is an automated notification from the Luxury Listings Portal.
`;

    // Send the email
    MailApp.sendEmail({
      to: recipient,
      subject: subject,
      body: emailBody
    });
    
    console.log('✅ Support ticket email sent to:', recipient);
    
    return {
      success: true,
      message: 'Email notification sent successfully',
      recipient: recipient
    };
    
  } catch (error) {
    console.error('❌ Error sending support ticket email:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
