# Step 2: Exact Location to Add Handler Code

## Your Current Code Structure

In your `doGet` function, you currently have something like this:

```javascript
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
    
    // Get the spreadsheet
    const spreadsheetId = '10MGYVVpccxgCsvcYIBeWNtu3xWvlT8GlXNecv8LAQ6g';
    
    console.log('🔍 Opening spreadsheet:', spreadsheetId);
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    // ... rest of code
```

## What to Change

**Find these two lines:**
```javascript
console.log('Parsed action:', action);
console.log('Parsed clientData:', clientData);
```

**Add this code RIGHT AFTER those two lines:**

```javascript
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
```

## Visual Guide

```
✅ KEEP THIS:
    console.log('Parsed action:', action);
    console.log('Parsed clientData:', clientData);

➕ ADD THIS:
    // Handle Google Drive folder access actions (don't need spreadsheet)
    if (action === 'grantDriveFolderAccess') {
      return grantDriveFolderAccess(e.parameter);
    } else if (action === 'revokeDriveFolderAccess') {
      return revokeDriveFolderAccess(e.parameter);
    }

✅ KEEP THIS:
    // Get the spreadsheet
    const spreadsheetId = '10MGYVVpccxgCsvcYIBeWNtu3xWvlT8GlXNecv8LAQ6g';
```

## Why Here?

- **Before** getting the spreadsheet (because Drive actions don't need spreadsheet access)
- **After** parsing the action (so we know what action to handle)
- This way, if someone calls `grantDriveFolderAccess`, it returns immediately without trying to open a spreadsheet

## Complete Example

Here's what that section should look like:

```javascript
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
```

## Troubleshooting

**Q: I can't find those exact lines**
- Look for `console.log('Parsed action:', action);`
- Or search for `const action = e.parameter.action`
- Add the handler code right after parsing the action

**Q: Where exactly in the file?**
- It should be near the top of your `doGet` function
- After parsing parameters
- Before getting the spreadsheet

**Q: What if I put it in the wrong place?**
- The code will still work, but it's more efficient to check Drive actions before opening the spreadsheet
- If you're unsure, put it right after `console.log('Parsed clientData:', clientData);`

