// Google Apps Script for Client Packages Management
// Deploy this as a web app to handle write operations

function doGet(e) {
  try {
    // Log the incoming request for debugging
    console.log('Received GET request');
    console.log('Parameters:', e.parameter);
    
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
    
    // Get the spreadsheet and sheet
    const spreadsheetId = '10MGYVVpccxgCsvcYIBeWNtu3xWvlT8GlXNecv8LAQ6g';
    const sheetName = 'Social Media Packages';
    
    console.log('🔍 Opening spreadsheet:', spreadsheetId);
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    console.log('📋 Spreadsheet title:', spreadsheet.getName());
    
    console.log('🔍 Getting sheet:', sheetName);
    const sheet = spreadsheet.getSheetByName(sheetName);
    
    if (!sheet) {
      console.error('❌ Sheet not found:', sheetName);
      console.log('📋 Available sheets:', spreadsheet.getSheets().map(s => s.getName()));
      throw new Error(`Sheet "${sheetName}" not found`);
    }
    
    console.log('✅ Sheet found:', sheet.getName());
    console.log('📊 Sheet dimensions:', sheet.getLastRow(), 'rows x', sheet.getLastColumn(), 'columns');
    
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
        result = updateClient(sheet, clientData);
        break;
      case 'add':
        result = addClient(sheet, clientData);
        break;
      case 'approve':
        result = approveClient(sheet, clientData);
        break;
      case 'delete':
        result = deleteClient(sheet, clientData);
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
    
    // Return success response
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    // Log the error for debugging
    console.error('Error in doGet:', error.message);
    console.error('Error stack:', error.stack);
    
    // Return error response
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
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
    
    // Update only the specific columns based on the actual sheet structure
    // Column mapping from the actual sheet:
    // A=Client Name, B=Package Type, C=Email, D=Date Added, E=Posted On (Page), F=Payment Status, G=Sales Stage, H=Approval Status, I=Notes, J=Status Change Date, K=Package Size, L=Posts Used, M=Last Post Date, N=Posts Remaining, O=Package Completed, P=Approval Email Recipient, Q=Price Paid (USD), R=Post Insights Sent
    
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
  
  try {
    // Find the first empty row after existing data
    const lastRow = sheet.getLastRow();
    console.log('📋 Last row with data:', lastRow);
    
    // Look for the first empty row starting from row 2 (after header)
    let insertRow = 2;
    for (let i = 2; i <= lastRow + 1; i++) {
      const cellValue = sheet.getRange(i, 1).getValue(); // Check column A (Client Name)
      if (!cellValue || cellValue.toString().trim() === '') {
        insertRow = i;
        break;
      }
    }
    
    console.log('📋 Inserting new client at row:', insertRow);
    
    // Prepare the new row data matching your sheet structure
    const newRow = [
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
      '',                        // Q - Price Paid (USD)
      'FALSE'                    // R - Post Insights Sent
    ];
    
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
  const rowNumber = clientData.id + 1; // Add 1 for header row
  
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
  
  let rowNumber = -1; // Declare outside try block
  
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
  
  try {
    // Get the main sheet and archive sheet
    const spreadsheet = sheet.getParent();
    const archiveSheet = spreadsheet.getSheetByName('Archived Clients');
    
    if (!archiveSheet) {
      // Create archive sheet if it doesn't exist
      const newArchiveSheet = spreadsheet.insertSheet('Archived Clients');
      console.log('📋 Created new Archived Clients sheet');
      
      // Copy headers from main sheet
      const mainHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      newArchiveSheet.getRange(1, 1, 1, mainHeaders.length).setValues([mainHeaders]);
      
      // Set archive sheet reference
      const archiveSheet = newArchiveSheet;
    }
    
    // Find the row by client name (column A) in main sheet
    let rowNumber = -1;
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
    let rowNumber = -1;
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
  
  try {
    // Get the archive sheet
    const spreadsheet = sheet.getParent();
    const archiveSheet = spreadsheet.getSheetByName('Archived Clients');
    
    if (!archiveSheet) {
      throw new Error('Archive sheet "Archived Clients" not found');
    }
    
    // Find the row by client name (column A) in archive sheet
    let rowNumber = -1;
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
