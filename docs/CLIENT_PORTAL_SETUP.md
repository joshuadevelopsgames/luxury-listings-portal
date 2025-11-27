# Client Portal Setup Guide

## Enabling Email/Password Authentication in Firebase

The client portal uses email/password authentication, which needs to be enabled in Firebase Console.

### Steps to Enable:

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com/
   - Select your project: `luxury-listings-portal-e56de`

2. **Enable Email/Password Authentication**
   - Click on "Authentication" in the left sidebar
   - Click "Get started" if you haven't set up authentication yet
   - Go to the "Sign-in method" tab
   - Find "Email/Password" in the list
   - Click on it
   - Toggle "Enable" to ON
   - Click "Save"

3. **Authorized Domains** (if needed)
   - Go to Authentication → Settings → Authorized domains
   - Make sure your domain is listed:
     - `localhost` (for development)
     - `smmluxurylistings.info` (your production domain)
   - Add any other domains you need

### Testing the Client Portal

1. **Create a Test Client**
   - Go to `/client-packages` in the admin portal
   - Click "Add New Client"
   - Add client with email: `joshua@luxury-listings.com`
   - Or use the "Create Test Client Account" button on `/client-login` page (dev mode)

2. **Client Sign Up**
   - Go to `/client-login`
   - Click "Don't have an account? Sign up"
   - Enter email: `joshua@luxury-listings.com`
   - Create a password (min 6 characters)
   - Click "Create Account"

3. **Access Portal**
   - After sign-up, if client profile exists → redirects to `/client-portal`
   - If client profile doesn't exist → redirects to `/client-waiting-for-approval`

### Troubleshooting

**Error: "operation-not-allowed"**
- Email/password authentication is not enabled in Firebase
- Follow steps above to enable it

**Error: 400 Bad Request**
- Usually means email/password auth is not enabled
- Check Firebase Console → Authentication → Sign-in method

**Error: "No client account found"**
- Client needs to be added to Client Packages first
- Use the "Create Test Client Account" button or add manually

### Client Portal Features

Once authenticated, clients can:
- ✅ Approve/reject content calendars
- ✅ Message media managers
- ✅ View analytics dashboard
- ✅ Download monthly reports

