# Google Analytics Integration Setup Guide

This guide will help you set up Google Analytics 4 (GA4) integration with your Luxury Listings Portal admin analytics dashboard.

## 📊 Overview

The analytics dashboard currently shows mock data. To display real Google Analytics data, you'll need to:

1. Set up a Google Analytics 4 property
2. Configure the Google Analytics Data API
3. Add authentication credentials
4. Update the analytics service configuration

## 🚀 Step-by-Step Setup

### Step 1: Create Google Analytics 4 Property

1. **Go to Google Analytics**
   - Visit [analytics.google.com](https://analytics.google.com)
   - Sign in with your Google account

2. **Create a new property**
   - Click "Start measuring" or "Create Property"
   - Enter property name: "Luxury Listings Portal"
   - Select your timezone and currency
   - Click "Next"

3. **Configure business information**
   - Select your business size and industry
   - Choose how you plan to use Google Analytics
   - Click "Create"

4. **Set up data stream**
   - Choose "Web" as your platform
   - Enter your website URL: `https://smmluxurylistings.info`
   - Enter stream name: "Luxury Listings Portal"
   - Click "Create stream"

5. **Get your Measurement ID**
   - Copy the Measurement ID (format: G-XXXXXXXXXX)
   - This will be your `propertyId` in the configuration

### Step 2: Enable Google Analytics Data API

1. **Go to Google Cloud Console**
   - Visit [console.cloud.google.com](https://console.cloud.google.com)
   - Create a new project or select existing one

2. **Enable the Analytics Data API**
   - Go to "APIs & Services" > "Library"
   - Search for "Google Analytics Data API"
   - Click on it and press "Enable"

3. **Create credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "Service Account"
   - Enter service account name: "luxury-listings-analytics"
   - Click "Create and Continue"

4. **Grant permissions**
   - Role: "Viewer" (or "Editor" if you need write access)
   - Click "Done"

5. **Create and download key**
   - Click on your service account
   - Go to "Keys" tab
   - Click "Add Key" > "Create new key"
   - Choose "JSON" format
   - Download the JSON file (keep it secure!)

### Step 3: Grant Analytics Access to Service Account

1. **Go back to Google Analytics**
   - Navigate to your GA4 property
   - Go to "Admin" (gear icon)

2. **Add service account as user**
   - In "Property" column, click "Property access management"
   - Click the "+" button
   - Add your service account email (from the JSON file)
   - Grant "Viewer" permissions
   - Click "Add"

### Step 4: Configure the Application

1. **Add environment variables**
   Create or update your `.env.local` file:
   ```env
   # Google Analytics Configuration
   REACT_APP_GA_PROPERTY_ID=G-XXXXXXXXXX
   REACT_APP_GA_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
   ```

2. **Add service account credentials**
   - Create a new file: `src/config/analytics-credentials.json`
   - Paste the contents of your downloaded service account JSON file
   - **Important**: Add this file to `.gitignore` to keep it secure

3. **Update analytics service**
   In `src/services/analyticsService.js`, add this initialization code:
   ```javascript
   // Initialize with your credentials
   import credentials from '../config/analytics-credentials.json';
   
   // In your app initialization
   analyticsService.initialize(
     process.env.REACT_APP_GA_PROPERTY_ID,
     credentials.private_key
   );
   ```

### Step 5: Test the Integration

1. **Deploy your changes**
   ```bash
   npm run build
   ./deploy.sh
   ```

2. **Check the analytics dashboard**
   - Login as admin
   - Go to Analytics page
   - Click "Refresh Data"
   - You should see real data instead of mock data

## 🔧 Configuration Options

### Time Ranges
The dashboard supports multiple time ranges:
- Last 24 hours
- Last 7 days
- Last 30 days
- Last 90 days

### Metrics Available
- Total Users
- Page Views
- Sessions
- Bounce Rate
- Average Session Duration
- New vs Returning Users
- Traffic Sources
- Device Breakdown
- Top Pages
- User Growth Trends

## 🛠️ Troubleshooting

### Common Issues

1. **"Analytics service not configured"**
   - Check that your environment variables are set
   - Verify the service account JSON file is in the correct location
   - Ensure the property ID is correct

2. **"Analytics API error: 403"**
   - Verify the service account has access to your GA4 property
   - Check that the Analytics Data API is enabled
   - Ensure the service account email is added to GA4

3. **"Analytics API error: 400"**
   - Check that your property ID format is correct (G-XXXXXXXXXX)
   - Verify the date range format
   - Ensure all required metrics are available

### Debug Mode

Enable debug logging by adding this to your browser console:
```javascript
localStorage.setItem('analytics-debug', 'true');
```

## 📈 Advanced Features

### Custom Metrics
You can add custom metrics by modifying the API calls in `analyticsService.js`:

```javascript
// Add custom metrics
metrics: [
  { name: 'totalUsers' },
  { name: 'screenPageViews' },
  { name: 'customEvent:button_click' } // Custom event
]
```

### Real-time Data
For real-time analytics, use the Real-time API:
```javascript
// Real-time users
const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runRealtimeReport`);
```

### Export Data
Add export functionality to download reports:
```javascript
// Export to CSV
const csvData = convertToCSV(analyticsData);
downloadCSV(csvData, 'analytics-report.csv');
```

## 🔒 Security Considerations

1. **Never commit credentials to Git**
   - Keep service account JSON files in `.gitignore`
   - Use environment variables for sensitive data

2. **Limit API access**
   - Only grant necessary permissions to service accounts
   - Use "Viewer" role unless write access is needed

3. **Monitor API usage**
   - Google Analytics Data API has quotas
   - Monitor usage in Google Cloud Console

## 📞 Support

If you encounter issues:

1. Check the browser console for error messages
2. Verify your Google Analytics setup
3. Test API calls using Google Cloud Console
4. Check the [Google Analytics Data API documentation](https://developers.google.com/analytics/devguides/reporting/data/v1)

## 🎯 Next Steps

Once basic integration is working:

1. **Add more metrics** - Custom events, conversions, etc.
2. **Create custom reports** - Role-specific analytics
3. **Set up alerts** - Notifications for important metrics
4. **Add data visualization** - Charts, graphs, and dashboards
5. **Implement caching** - Reduce API calls and improve performance

---

**Note**: This setup guide assumes you have admin access to both Google Analytics and Google Cloud Console. If you need help with any specific step, refer to the official Google documentation or contact your system administrator.
