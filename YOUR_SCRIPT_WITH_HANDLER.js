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
    
    // ⬇️ ADD THIS BLOCK HERE ⬇️
    // Handle Google Drive folder access actions (don't need spreadsheet)
    if (action === 'grantDriveFolderAccess') {
      return grantDriveFolderAccess(e.parameter);
    } else if (action === 'revokeDriveFolderAccess') {
      return revokeDriveFolderAccess(e.parameter);
    }
    // ⬆️ END OF ADDED BLOCK ⬆️
    
    // Get the spreadsheet
    const spreadsheetId = '10MGYVVpccxgCsvcYIBeWNtu3xWvlT8GlXNecv8LAQ6g';
    
    console.log('🔍 Opening spreadsheet:', spreadsheetId);
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    console.log('📋 Spreadsheet title:', spreadsheet.getName());
    
    // ... rest of your code stays the same ...

