# Firebase Setup Guide for Luxury Listings Portal

## 🔥 **Step 1: Create Firebase Project**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Name it: `luxury-listings-onboarding`
4. Enable Google Analytics (optional)
5. Click "Create project"

## 🔑 **Step 2: Enable Authentication**

1. In your Firebase project, go to "Authentication" in the left sidebar
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Click on "Google" provider
5. Enable it and click "Save"
6. Add your authorized domain (your Vercel domain)

## 📱 **Step 3: Get Configuration**

1. Click the gear icon (⚙️) next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps" section
4. Click the web icon (</>)
5. Register your app with a nickname
6. Copy the `firebaseConfig` object

## ⚙️ **Step 4: Update Configuration**

Replace the placeholder config in `src/firebase.js` with your actual Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

## 🌐 **Step 5: Authorized Domains**

1. In Authentication → Settings → Authorized domains
2. Add your Vercel domain (e.g., `smmluxurylistings.info`)
3. Add `localhost` for local development

## 🚀 **Step 6: Deploy**

1. Update the Firebase config in `src/firebase.js`
2. Deploy to Vercel: `npx vercel --prod`
3. Test the login functionality

## ✅ **What You Get**

- **Google Sign-In**: Users can sign in with their Google accounts
- **Protected Routes**: All app pages require authentication
- **User Management**: Automatic user state management
- **Secure Logout**: Proper session termination
- **Professional UI**: Beautiful login page with your branding

## 🔒 **Security Features**

- Firebase handles all authentication securely
- No passwords stored in your app
- Automatic session management
- Protected routes prevent unauthorized access
- Secure token-based authentication

## 🎯 **Next Steps After Setup**

1. Test login with your Google account
2. Verify protected routes work
3. Check user info displays correctly in header
4. Test logout functionality
5. Deploy to production

## 🆘 **Troubleshooting**

- **CORS errors**: Make sure your domain is in Firebase authorized domains
- **Login not working**: Check Firebase console for errors
- **Routes not protected**: Verify ProtectedRoute component is working
- **User not showing**: Check AuthContext is properly connected

## 📞 **Support**

If you encounter issues:
1. Check Firebase console for error logs
2. Verify configuration values
3. Check browser console for JavaScript errors
4. Ensure all dependencies are installed

