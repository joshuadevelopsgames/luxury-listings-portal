# Adding Drive Folder Access Functions to Your Google Apps Script

## Quick Integration Guide

You need to add **two functions** and **two lines** to your existing Client Packages Manager script.

## Step 1: Add Drive Access Functions

Add these two functions **at the end of your script** (before or after `doPost`):

```javascript
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
```

## Step 2: Add Handler in doGet Function

In your `doGet` function, **right after** you parse the `action` parameter, add this code:

```javascript
// Handle Google Drive folder access actions (don't need spreadsheet)
if (action === 'grantDriveFolderAccess') {
  return grantDriveFolderAccess(e.parameter);
} else if (action === 'revokeDriveFolderAccess') {
  return revokeDriveFolderAccess(e.parameter);
}
```

**Location**: Add this right after:
```javascript
console.log('Parsed action:', action);
console.log('Parsed clientData:', clientData);
```

**And before**:
```javascript
// Get the spreadsheet
const spreadsheetId = '10MGYVVpccxgCsvcYIBeWNtu3xWvlT8GlXNecv8LAQ6g';
```

## Step 3: Authorize Drive API

1. **Save your script**
2. **Run the function** `grantDriveFolderAccess` once (select it from dropdown and click Run)
3. **Authorize** when prompted - grant Drive API access
4. **Redeploy** if needed (Deploy → Manage deployments → Edit → Deploy)

## Step 4: Test It

Test the function by calling it directly in your browser:

```
https://YOUR_SCRIPT_URL?action=grantDriveFolderAccess&email=test@example.com&accessLevel=writer
```

You should see:
```json
{
  "success": true,
  "message": "Granted writer access to test@example.com",
  "email": "test@example.com",
  "folderId": "1ld1rW8eTnWth2UDfRBrqGywZzsEPOJJw",
  "accessLevel": "writer"
}
```

## Complete Integration Example

Here's exactly where to add the code in your `doGet` function:

```javascript
function doGet(e) {
  try {
    // ... existing code ...
    
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
    
    // ... rest of your existing code ...
  }
}
```

## That's It!

Once you've added these functions and the handler, your script will automatically grant Google Drive folder access when users are approved or added through the portal.

The system will call:
- `grantDriveFolderAccess` when a user is approved/added
- `revokeDriveFolderAccess` when a user is removed (future feature)

## Troubleshooting

### "Drive API not enabled"
- Go to Apps Script → Services → Add Drive API
- Or run the function once and authorize when prompted

### "Permission denied"
- Make sure the script owner has Editor access to the folder
- Check that the folder ID is correct: `1ld1rW8eTnWth2UDfRBrqGywZzsEPOJJw`

### "Function not found"
- Make sure you added both functions (`grantDriveFolderAccess` and `revokeDriveFolderAccess`)
- Check for typos in function names

