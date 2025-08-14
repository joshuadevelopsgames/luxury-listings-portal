# Luxury Listings Portal

A comprehensive content leadership platform for luxury real estate professionals.

## 🚀 Deployment to smmluxurylistings.info

### Option 1: Vercel Deployment (Recommended)

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy the app:**
   ```bash
   vercel
   ```

4. **Add custom domain:**
   - Go to Vercel dashboard
   - Select your project
   - Go to Settings → Domains
   - Add `smmluxurylistings.info`
   - Update DNS records as instructed

### Option 2: Manual Build & Deploy

1. **Build the app:**
   ```bash
   npm run build
   ```

2. **Upload the `build` folder** to your web hosting provider

3. **Configure your domain** to point to the hosting provider

## 🔧 Google Apps Script Setup

1. **Deploy the Google Apps Script** from `google-apps-script.js`
2. **Update the script URL** in `src/pages/ClientPackages.jsx`
3. **Test the integration** with your domain

## 🎯 Features

- ✅ Client package management
- ✅ Google Sheets integration
- ✅ Real-time data sync
- ✅ Professional onboarding interface
- ✅ Mobile responsive design

## 🛠️ Development

```bash
npm start          # Start development server
npm run build      # Build for production
npm test           # Run tests
```

## 📱 Access

Once deployed, your app will be available at:
- **Production**: https://smmluxurylistings.info
- **Development**: http://localhost:3000
