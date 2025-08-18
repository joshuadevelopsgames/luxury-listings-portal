# 🔥 Firebase Firestore Setup Guide

This guide will help you set up Firebase Firestore for the Luxury Listings Portal.

## 📋 **Prerequisites**

- Firebase account
- Google Cloud project
- Node.js and npm installed

## 🚀 **Step 1: Create Firebase Project**

### **1.1 Go to Firebase Console**
- Visit: [https://console.firebase.google.com/](https://console.firebase.google.com/)
- Click: **"Create a project"**

### **1.2 Project Setup**
- **Project name**: `luxury-listings-portal` (or your preferred name)
- **Enable Google Analytics**: Optional (recommended)
- Click: **"Create project"**

### **1.3 Add Web App**
- Click: **"Web"** icon (</>)
- **App nickname**: `luxury-listings-web`
- **Enable Firebase Hosting**: Optional
- Click: **"Register app"**

## ⚙️ **Step 2: Get Configuration**

### **2.1 Copy Config**
After registering, you'll see a config object like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC1234567890abcdefghijklmnopqrstuvwxyz",
  authDomain: "luxury-listings-portal.firebaseapp.com",
  projectId: "luxury-listings-portal",
  storageBucket: "luxury-listings-portal.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdefghijklmnopqrstuvwxyz"
};
```

### **2.2 Save Configuration**
Copy these values - you'll need them for the next step.

## 🔧 **Step 3: Configure Environment Variables**

### **3.1 Create .env.local File**
In your project root, create a file called `.env.local`:

```bash
# OpenAI API Key (replace with your actual key)
REACT_APP_OPENAI_API_KEY=your_openai_api_key_here

# Firebase Configuration (replace with your values)
REACT_APP_FIREBASE_API_KEY=your_actual_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

### **3.2 Replace Configuration Values**
Replace the placeholder values with your actual Firebase config:

```javascript
// Example from Firebase console:
{
  apiKey: "AIzaSyC1234567890abcdefghijklmnopqrstuvwxyz",
  authDomain: "luxury-listings-portal.firebaseapp.com",
  projectId: "luxury-listings-portal",
  storageBucket: "luxury-listings-portal.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdefghijklmnopqrstuvwxyz"
}
```

## 🗄️ **Step 4: Enable Firestore Database**

### **4.1 Go to Firestore**
- In Firebase console, click: **"Firestore Database"**
- Click: **"Create database"**

### **4.2 Security Rules**
- Choose: **"Start in test mode"**
- Click: **"Next"**

### **4.3 Location**
- Choose: **"us-central1"** (or closest to your users)
- Click: **"Done"**

## 🔐 **Step 5: Configure Security Rules**

### **5.1 Go to Rules Tab**
- In Firestore Database, click: **"Rules"** tab
- Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to all users under any document
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

### **5.2 Publish Rules**
- Click: **"Publish"**

## 🚀 **Step 6: Test the Integration**

### **6.1 Build and Deploy**
```bash
npm run build
npx vercel --prod
```

### **6.2 Test Features**
- **Create tasks** - should save to Firebase
- **Update status** - should update in real-time
- **Switch tabs** - should show correct counts
- **Refresh page** - data should persist

## 🔍 **Step 7: Verify in Firebase Console**

### **7.1 Check Data**
- Go to: **Firestore Database** → **Data** tab
- You should see collections for:
  - `pending_users`
  - `approved_users`
  - `tasks`
  - `system_config`

### **7.2 Monitor Usage**
- Go to: **Usage** tab
- Check: **Reads**, **Writes**, **Deletes**

## 💰 **Cost Analysis**

### **Free Tier (Spark Plan)**
- **50,000 reads/day**
- **20,000 writes/day**
- **20,000 deletes/day**
- **1GB stored data**
- **Perfect for development & small teams**

### **Paid Tier (Blaze Plan)**
- **Pay per use** after free tier
- **$0.18 per 100,000 reads**
- **$0.18 per 100,000 writes**
- **$0.18 per 100,000 deletes**
- **$0.18 per GB stored**

## 🔧 **Troubleshooting**

### **Common Issues**

1. **"Firebase App not initialized"**
   - Check your `.env.local` file
   - Ensure all environment variables are set
   - Restart your development server

2. **"Permission denied"**
   - Check Firestore security rules
   - Ensure rules allow read/write access
   - Verify project ID matches

3. **"Network error"**
   - Check internet connection
   - Verify Firebase project is active
   - Check browser console for errors

### **Debug Steps**

1. **Check Environment Variables**
   ```bash
   echo $REACT_APP_FIREBASE_PROJECT_ID
   ```

2. **Check Firebase Console**
   - Verify project exists
   - Check Firestore is enabled
   - Review security rules

3. **Check Browser Console**
   - Look for Firebase errors
   - Check network requests
   - Verify authentication

## 📚 **Additional Resources**

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Pricing](https://firebase.google.com/pricing)
- [Vercel Deployment](https://vercel.com/docs)

---

**Need help?** Check the troubleshooting section or contact support.
