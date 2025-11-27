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

