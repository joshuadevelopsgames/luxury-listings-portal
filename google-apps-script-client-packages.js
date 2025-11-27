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
    
    // Handle Google Drive folder access actions (don't need spreadsheet)
    if (action === 'grantDriveFolderAccess') {
      return grantDriveFolderAccess(e.parameter);
    } else if (action === 'revokeDriveFolderAccess') {
      return revokeDriveFolderAccess(e.parameter);
    }
    
    // Get the spreadsheet
    const spreadsheetId = '10MGYVVpccxgCsvcYIBeWNtu3xWvlT8GlXNecv8LAQ6g';
    
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

// Grant access to a Google Drive folder
function grantDriveFolderAccess(params) {
  try {
    const email = params.email;
    const folderId = params.folderId || '1ld1rW8eTnWth2UDfRBrqGywZzsEPOJJw'; // Default contracts folder
    const accessLevel = params.accessLevel || 'reader'; // reader, writer, or owner
    
    if (!email) {
      throw new Error('Email is required');
    }
    
    console.log(`🔐 Granting ${accessLevel} access to ${email} for folder ${folderId}`);
    
    // Get the folder
    const folder = DriveApp.getFolderById(folderId);
    
    // Map access levels to Drive permission types
    let role = DriveApp.Permission.VIEWER;
    
    if (accessLevel === 'writer' || accessLevel === 'editor') {
      role = DriveApp.Permission.EDITOR;
    } else if (accessLevel === 'owner') {
      role = DriveApp.Permission.OWNER;
    } else {
      role = DriveApp.Permission.VIEWER;
    }
    
    // Check if user already has access
    const existingPermissions = folder.getEditors();
    const existingViewers = folder.getViewers();
    const hasAccess = existingPermissions.some(p => p.getEmail() === email) || 
                      existingViewers.some(p => p.getEmail() === email);
    
    if (hasAccess) {
      console.log(`ℹ️ User ${email} already has access, updating permission...`);
      // Remove existing permission first
      const allPermissions = folder.getEditors().concat(folder.getViewers());
      for (let i = 0; i < allPermissions.length; i++) {
        if (allPermissions[i].getEmail() === email) {
          folder.removeEditor(allPermissions[i]);
          folder.removeViewer(allPermissions[i]);
          break;
        }
      }
    }
    
    // Add the new permission
    if (role === DriveApp.Permission.EDITOR) {
      folder.addEditor(email);
    } else {
      folder.addViewer(email);
    }
    
    console.log(`✅ Successfully granted ${accessLevel} access to ${email}`);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: `Granted ${accessLevel} access to ${email}`,
        email: email,
        folderId: folderId,
        accessLevel: accessLevel
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('❌ Error granting folder access:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Revoke access from a Google Drive folder
function revokeDriveFolderAccess(params) {
  try {
    const email = params.email;
    const folderId = params.folderId || '1ld1rW8eTnWth2UDfRBrqGywZzsEPOJJw'; // Default contracts folder
    
    if (!email) {
      throw new Error('Email is required');
    }
    
    console.log(`🔐 Revoking access from ${email} for folder ${folderId}`);
    
    // Get the folder
    const folder = DriveApp.getFolderById(folderId);
    
    // Remove the user from both editors and viewers
    const editors = folder.getEditors();
    const viewers = folder.getViewers();
    
    let removed = false;
    
    // Remove from editors
    for (let i = 0; i < editors.length; i++) {
      if (editors[i].getEmail() === email) {
        folder.removeEditor(editors[i]);
        removed = true;
        console.log(`✅ Removed ${email} from editors`);
        break;
      }
    }
    
    // Remove from viewers
    for (let i = 0; i < viewers.length; i++) {
      if (viewers[i].getEmail() === email) {
        folder.removeViewer(viewers[i]);
        removed = true;
        console.log(`✅ Removed ${email} from viewers`);
        break;
      }
    }
    
    if (!removed) {
      console.log(`ℹ️ User ${email} did not have access to this folder`);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: `Revoked access from ${email}`,
        email: email,
        folderId: folderId,
        removed: removed
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('❌ Error revoking folder access:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ... (rest of your existing functions: updateClient, addClient, approveClient, etc.)
// I'll include a note that you should keep all your existing functions below

