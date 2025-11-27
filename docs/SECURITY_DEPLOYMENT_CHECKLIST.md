# Security Deployment Checklist

## ✅ Completed

- [x] **Firestore Rules** - Improved rules published
  - User data protection enabled
  - Admin-only collections secured
  - Explicit collection permissions configured

## 🔴 Critical - Next Steps

### 1. Firebase Storage Rules (URGENT)

**Status**: ⚠️ **Not Deployed** - Contract files may be publicly accessible

**Action Required:**
1. Go to: https://console.firebase.google.com/project/luxury-listings-portal-e56de/storage/rules
2. Copy the contents of `storage.rules` file
3. Paste into Firebase Console
4. Click "Publish"

**Why it matters:**
- Contract files uploaded to Firebase Storage need protection
- Without rules, files may be publicly accessible via URL
- This is critical for client contract security

### 2. Test Firestore Rules

**Verify these work:**
- [ ] Users can access their own profile
- [ ] Users can create/edit tasks
- [ ] Clients can access their portal data
- [ ] Admins can manage users
- [ ] Non-admins cannot modify `analytics_config` or `system_config`

**How to test:**
1. Log in as a regular user
2. Try to access different features
3. Verify no permission errors appear
4. Check browser console for any Firestore errors

### 3. Google Drive Folder Security

**Status**: ⚠️ **Needs Configuration**

**Action Required:**
1. Go to Google Drive folder: https://drive.google.com/drive/folders/1ld1rW8eTnWth2UDfRBrqGywZzsEPOJJw
2. Click "Share" button
3. Set sharing to "Restricted" (only people with access)
4. Add team members only
5. Remove "Anyone with the link" if enabled

**Why it matters:**
- Contract files stored in Google Drive need restricted access
- Prevents unauthorized access via shared links

## ⚠️ Medium Priority

### 4. Remove Hardcoded API Keys

**Files with hardcoded keys:**
- `src/services/crmGoogleSheetsService.js` (line 9)
- `src/pages/ITSupportPage.jsx` (line 315)

**Action:**
- Move these to environment variables
- Remove fallback defaults

### 5. API Key Restrictions

**In Google Cloud Console:**
1. Go to APIs & Services → Credentials
2. For each API key:
   - Restrict to specific domains (your Vercel domain)
   - Restrict to specific APIs only
   - Set usage quotas if needed

## 📊 Security Score Update

**Before:** 4/10
**After Firestore Rules:** 7/10
**After Storage Rules:** 8/10
**After Google Drive Config:** 8.5/10
**After API Key Cleanup:** 9/10

## 🎯 Current Status

- ✅ **Firestore Rules**: Deployed (7/10 security)
- ⚠️ **Storage Rules**: Not deployed (CRITICAL)
- ⚠️ **Google Drive**: Needs configuration
- ⚠️ **API Keys**: Some still hardcoded

## Next Immediate Action

**Deploy Storage Rules** - This is the most critical remaining item for contract file security.

