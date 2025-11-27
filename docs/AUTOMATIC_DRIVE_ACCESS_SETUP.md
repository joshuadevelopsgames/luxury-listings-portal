# Automatic Google Drive Folder Access Setup

## Overview

The system now automatically grants Google Drive folder access to new users when they're approved or added. This eliminates the need to manually add each user to the contracts folder.

## How It Works

### 1. **User Approval/Addition**
When a user is approved or added via the User Management page:
- User is added to Firestore
- System automatically calls Google Drive service
- Google Drive service determines access level based on role
- Google Apps Script grants appropriate folder access

### 2. **Access Levels by Role**

| Role | Access Level | Can Upload? | Can Edit? |
|------|-------------|-------------|-----------|
| **Admin** | Editor (Writer) | ✅ Yes | ✅ Yes |
| **Social Media Manager** | Editor (Writer) | ✅ Yes | ✅ Yes |
| **Content Director** | Viewer (Reader) | ❌ No | ❌ No |
| **HR Manager** | None | ❌ No | ❌ No |
| **Sales Manager** | None | ❌ No | ❌ No |

### 3. **Automatic Process Flow**

```
User Approved/Added
    ↓
Check User Role
    ↓
Determine Access Level
    ↓
Call Google Apps Script
    ↓
Grant Folder Access
    ↓
User Can Now Access Folder
```

## Setup Instructions

### Step 1: Update Google Apps Script

1. **Go to [script.google.com](https://script.google.com)**
2. **Open your existing script** (the one used for Client Packages)
3. **Add the new functions** from `google-apps-script.js`:
   - `grantDriveFolderAccess()` - Grants access to a folder
   - `revokeDriveFolderAccess()` - Revokes access from a folder
4. **Save the script**
5. **Redeploy** (if needed):
   - Click "Deploy" → "Manage deployments"
   - Click the pencil icon to edit
   - Click "Deploy"

### Step 2: Authorize Drive API Access

The script needs permission to manage Drive folders:

1. **Run the test function**:
   - In Apps Script editor, select `testAuthorization()` from dropdown
   - Click "Run"
   - Authorize when prompted

2. **Or manually authorize**:
   - Click "Run" → "Run function" → `grantDriveFolderAccess`
   - Authorize Drive API access when prompted

### Step 3: Verify It Works

1. **Add a test user** via User Management
2. **Check the browser console** for:
   - `✅ Google Drive access granted`
   - Or `⚠️ Could not grant Google Drive access` (if there's an issue)

3. **Check Google Drive folder**:
   - Go to the contracts folder
   - Click "Share" → Verify the user was added

## Manual Override

If automatic access fails, you can manually grant access:

### Via Code (Developer Console)

```javascript
// Import the service
import { googleDriveService } from './services/googleDriveService';

// Grant access
await googleDriveService.grantFolderAccess('user@example.com', 'social_media_manager');

// Revoke access
await googleDriveService.revokeFolderAccess('user@example.com');
```

### Via Google Drive UI

1. Open the contracts folder
2. Click "Share"
3. Add the user's email
4. Set appropriate permission level

## Troubleshooting

### "Could not grant Google Drive access"

**Possible causes:**
1. Google Apps Script not authorized for Drive API
   - **Fix**: Run `testAuthorization()` in Apps Script and authorize

2. Folder ID incorrect
   - **Fix**: Check `.env.local` has correct `REACT_APP_GOOGLE_DRIVE_CONTRACTS_FOLDER_ID`

3. User email doesn't exist
   - **Fix**: Ensure user has a valid Google account

4. Script deployment issue
   - **Fix**: Redeploy the Google Apps Script

### "User already has access"

This is normal - the system will update their permission level if needed.

### "Permission denied"

**Possible causes:**
1. Script doesn't have permission to manage the folder
   - **Fix**: Ensure the script owner has Editor access to the folder

2. Folder sharing settings are too restrictive
   - **Fix**: Check folder "General access" settings

## Security Considerations

### ✅ **What's Secure:**
- Access is granted based on role (not arbitrary)
- Only specific roles get access (Social Media Managers, Admins, Content Directors)
- Access can be revoked automatically when users are removed

### ⚠️ **What to Monitor:**
- Review folder access periodically
- Remove access when users leave
- Verify only authorized roles have access

## Future Enhancements

Potential improvements:
1. **Automatic access revocation** when users are deleted
2. **Role change detection** - Update access when user role changes
3. **Access audit log** - Track who was granted/revoked access
4. **Bulk access management** - Grant/revoke for multiple users at once

## Testing

To test the automatic access:

1. **Add a test user** with role "social_media_manager"
2. **Check console** for success message
3. **Verify in Google Drive** that user was added
4. **Test access** - User should be able to see folder

## Support

If you encounter issues:
1. Check browser console for error messages
2. Check Google Apps Script execution logs
3. Verify folder permissions in Google Drive
4. Ensure Google Apps Script has Drive API enabled

