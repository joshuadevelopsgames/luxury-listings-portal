# Contract Management Setup Guide

## Overview

The contract management system allows you to upload client contracts to Google Drive and store contract metadata in Firestore and Google Sheets.

## Security Improvements

✅ **API Keys moved to environment variables**
- No more hardcoded API keys in source code
- Keys stored securely in `.env.local` file
- `.env.local` is gitignored (never committed)

## Setup Steps

### 1. Create Environment Variables File

Create a `.env.local` file in your project root:

```bash
# Copy from .env.example
cp .env.example .env.local
```

### 2. Add Your API Keys

Edit `.env.local` and add your actual API keys:

```bash
REACT_APP_GOOGLE_SHEETS_API_KEY=your_actual_key_here
REACT_APP_GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id_here
REACT_APP_GOOGLE_APPS_SCRIPT_URL=your_script_url_here
REACT_APP_GOOGLE_DRIVE_API_KEY=your_drive_key_here
REACT_APP_GOOGLE_DRIVE_CONTRACTS_FOLDER_ID=your_folder_id_here
```

### 3. Set Up Google Drive Folder

1. Go to [Google Drive](https://drive.google.com)
2. Create a folder called "Client Contracts"
3. Right-click the folder → Share → Get shareable link
4. Copy the folder ID from the URL (the long string after `/folders/`)
5. Add it to `.env.local` as `REACT_APP_GOOGLE_DRIVE_CONTRACTS_FOLDER_ID`

### 4. Update Google Apps Script

Your Google Apps Script needs to handle contract uploads. Add this function to `google-apps-script.js`:

```javascript
function uploadContract(e) {
  try {
    const action = e.parameter.action;
    if (action !== 'uploadContract') return;
    
    const fileBlob = e.parameter.file;
    const clientId = e.parameter.clientId;
    const contractName = e.parameter.contractName;
    const folderName = e.parameter.folderName || 'Client Contracts';
    
    // Get or create folder
    const folders = DriveApp.getFoldersByName(folderName);
    let folder;
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(folderName);
    }
    
    // Create client subfolder
    const clientFolders = folder.getFoldersByName(clientId);
    let clientFolder;
    if (clientFolders.hasNext()) {
      clientFolder = clientFolders.next();
    } else {
      clientFolder = folder.createFolder(clientId);
    }
    
    // Upload file
    const file = clientFolder.createFile(fileBlob);
    
    return {
      success: true,
      fileId: file.getId(),
      fileUrl: file.getUrl(),
      webViewLink: file.getUrl()
    };
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}
```

### 5. Restart Development Server

After adding environment variables:

```bash
npm start
# or
yarn start
```

## Usage

### Uploading Contracts

1. Go to Clients page → Click on a client
2. Scroll to "Contracts" section
3. Click "Upload Contract"
4. Select contract file (PDF, DOCX, or image)
5. Fill in contract details:
   - Contract name
   - Contract type
   - Dates (start, end, renewal)
   - Package details
   - Pricing information
   - Payment terms
6. Click "Upload Contract"

### Viewing Contracts

- Active contract is highlighted at the top
- All contracts listed below
- Click "View" to open in Google Drive
- Click "Download" to download the file

### Contract Status

Contracts automatically show status:
- **Active** (green) - Current contract
- **Expiring Soon** (yellow) - Expires within 30 days
- **Expired** (red) - Past end date

## File Storage Structure

```
Google Drive:
└── Client Contracts/
    └── {clientId}/
        └── {contractName}.pdf

Firestore:
└── client_contracts/
    └── {contractId}/
        ├── clientId
        ├── contractName
        ├── driveFileId
        ├── driveFileUrl
        ├── contractDetails
        └── ...

Google Sheets:
└── Client Packages sheet
    └── Contract columns (optional backup)
```

## Security Best Practices

1. ✅ **Never commit `.env.local` to git**
2. ✅ **Use restricted API keys** (limit to specific domains/IPs)
3. ✅ **Use Google Apps Script** for server-side operations
4. ✅ **Enable 2FA** on Google accounts
5. ✅ **Regularly audit** Drive folder sharing permissions
6. ✅ **Use service accounts** for production (more secure)

## Troubleshooting

**Error: "API key not set"**
- Make sure `.env.local` exists in project root
- Restart development server after adding keys
- Check that keys start with `REACT_APP_`

**Error: "Failed to upload contract"**
- Check Google Apps Script is deployed
- Verify Drive folder permissions
- Check browser console for detailed errors

**Contracts not showing**
- Check Firestore console for contract documents
- Verify client ID matches
- Check browser console for errors

