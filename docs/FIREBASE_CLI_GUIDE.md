# Firebase CLI Guide

## Installation

### Option 1: Using npm (Recommended - Already Installed)
```bash
npm install -g firebase-tools
```

### Option 2: Using npx (No Installation Needed)
```bash
npx firebase-tools <command>
```

### Option 3: Using Local Installation (Your Current Setup)
```bash
./node_modules/.bin/firebase <command>
```

**Your project already has `firebase-tools` installed locally** (version 14.17.0), so you can use:
```bash
./node_modules/.bin/firebase <command>
```

Or add to your `package.json` scripts:
```json
{
  "scripts": {
    "firebase": "firebase"
  }
}
```

Then use: `npm run firebase <command>`

---

## Authentication

### Login
```bash
firebase login
# or
./node_modules/.bin/firebase login
```

This will:
1. Open your browser
2. Ask you to sign in with Google
3. Grant permissions to Firebase CLI
4. Save credentials locally

### Check Login Status
```bash
firebase login:list
```

### Logout
```bash
firebase logout
```

### Login with Specific Account
```bash
firebase login --no-localhost
```
(Useful if you can't open browser, gives you a code to paste)

---

## Project Management

### List Projects
```bash
firebase projects:list
```

### Set Default Project
```bash
firebase use <project-id>
# Example:
firebase use luxury-listings-portal-e56de
```

### Check Current Project
```bash
firebase use
```

### Initialize Firebase in Project
```bash
firebase init
```

This will:
- Create `firebase.json` (already exists in your project ✅)
- Set up hosting, Firestore, functions, etc.
- Configure project settings

---

## Firestore Commands

### Deploy Security Rules
```bash
firebase deploy --only firestore:rules
```

**With project specified:**
```bash
firebase deploy --only firestore:rules --project luxury-listings-portal-e56de
```

**Using local installation:**
```bash
./node_modules/.bin/firebase deploy --only firestore:rules --project luxury-listings-portal-e56de
```

### Deploy Firestore Indexes
```bash
firebase deploy --only firestore:indexes
```

### Deploy Both Rules and Indexes
```bash
firebase deploy --only firestore
```

### Test Rules Locally (Before Deploying)
```bash
firebase emulators:start --only firestore
```

### View Current Rules
```bash
firebase firestore:rules:get
```

---

## Hosting Commands

### Deploy to Hosting
```bash
firebase deploy --only hosting
```

### Deploy Specific Files
```bash
firebase deploy --only hosting:site-name
```

### Preview Before Deploying
```bash
firebase hosting:channel:deploy preview-channel-name
```

---

## Functions Commands

### Deploy Functions
```bash
firebase deploy --only functions
```

### Deploy Specific Function
```bash
firebase deploy --only functions:functionName
```

---

## General Deployment

### Deploy Everything
```bash
firebase deploy
```

### Deploy Multiple Services
```bash
firebase deploy --only firestore:rules,hosting,functions
```

### Deploy to Specific Project
```bash
firebase deploy --project luxury-listings-portal-e56de
```

---

## Common Workflows

### 1. Deploy Firestore Rules (Your Current Need)

**Step 1: Login**
```bash
./node_modules/.bin/firebase login
```

**Step 2: Set Project**
```bash
./node_modules/.bin/firebase use luxury-listings-portal-e56de
```

**Step 3: Deploy Rules**
```bash
./node_modules/.bin/firebase deploy --only firestore:rules
```

**Or all in one:**
```bash
./node_modules/.bin/firebase deploy --only firestore:rules --project luxury-listings-portal-e56de
```

### 2. Test Rules Locally

```bash
# Start emulator
./node_modules/.bin/firebase emulators:start --only firestore

# In another terminal, test your app against emulator
# Update firebase.js to point to emulator
```

### 3. View Deployment History

```bash
firebase hosting:channel:list
```

---

## Troubleshooting

### Error: "Not logged in"
```bash
firebase login
```

### Error: "Not in a Firebase app directory"
- Make sure `firebase.json` exists (✅ you have this)
- Make sure you're in the project root directory

### Error: "Permission denied" (403)
- You're logged in with wrong account
- Account doesn't have access to the project
- Solution: Login with correct account or ask project owner for access

### Error: "Project not found"
- Check project ID: `luxury-listings-portal-e56de`
- Verify you have access: `firebase projects:list`
- Make sure project exists in Firebase Console

### Check Firebase CLI Version
```bash
firebase --version
# or
./node_modules/.bin/firebase --version
```

---

## Your Current Setup

### Files You Have:
- ✅ `firebase.json` - Firebase configuration
- ✅ `firestore.rules` - Security rules (ready to deploy)
- ✅ `firestore.indexes.json` - Indexes configuration
- ✅ `node_modules/.bin/firebase` - CLI installed locally

### Quick Deploy Script

You can add this to `package.json`:

```json
{
  "scripts": {
    "deploy:rules": "firebase deploy --only firestore:rules --project luxury-listings-portal-e56de",
    "deploy:firestore": "firebase deploy --only firestore --project luxury-listings-portal-e56de"
  }
}
```

Then use:
```bash
npm run deploy:rules
```

---

## Next Steps for You

1. **Login to Firebase CLI:**
   ```bash
   ./node_modules/.bin/firebase login
   ```

2. **Verify you have access:**
   ```bash
   ./node_modules/.bin/firebase projects:list
   ```
   (Should show `luxury-listings-portal-e56de`)

3. **Deploy Firestore rules:**
   ```bash
   ./node_modules/.bin/firebase deploy --only firestore:rules --project luxury-listings-portal-e56de
   ```

4. **Verify deployment:**
   - Check Firebase Console → Firestore → Rules
   - Should show your updated rules

---

## Alternative: Use Firebase Console

If CLI doesn't work, you can always:
1. Go to [Firebase Console](https://console.firebase.google.com/project/luxury-listings-portal-e56de/firestore/rules)
2. Copy contents of `firestore.rules`
3. Paste into editor
4. Click "Publish"

This is often easier for one-off deployments!
