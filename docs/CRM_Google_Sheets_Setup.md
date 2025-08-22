# CRM Google Sheets Integration Setup Guide

Your CRM dashboard can now connect directly to your Google Sheets to pull real-time client data! This guide will walk you through the setup process.

## 🎯 **What This Integration Does**

✅ **Real-time Data Sync** - Pulls live data from your Google Sheets CRM  
✅ **Automatic Lead Categorization** - Intelligently sorts leads into Warm, Contacted, and Cold  
✅ **Smart Column Mapping** - Automatically detects and maps your spreadsheet columns  
✅ **Fallback Protection** - Falls back to mock data if connection fails  
✅ **Manual Sync Control** - Sync data whenever you need fresh information  

## 🚀 **Step-by-Step Setup**

### **Step 1: Get Google Sheets API Key**

1. **Go to [Google Cloud Console](https://console.cloud.google.com/)**
2. **Create a new project** (or select existing one)
   - Click the project dropdown at the top
   - Click "New Project"
   - Name it "Luxury Listings CRM"
   - Click "Create"

3. **Enable Google Sheets API**
   - Go to "APIs & Services" → "Library"
   - Search for "Google Sheets API"
   - Click on it and press "Enable"

4. **Create API Key**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - Copy the generated API key

5. **Restrict the API Key** (IMPORTANT for security)
   - Click on your newly created API key
   - Under "Application restrictions" select "Restrict key"
   - Under "API restrictions" select "Restrict key"
   - Choose "Google Sheets API" from the dropdown
   - Click "Save"

### **Step 2: Configure Your Environment**

1. **Create a `.env` file** in your project root (if it doesn't exist)
2. **Add your API key**:
   ```bash
   REACT_APP_GOOGLE_SHEETS_API_KEY=your_actual_api_key_here
   ```
3. **Replace `your_actual_api_key_here`** with your real API key
4. **Restart your development server** after adding the environment variable

### **Step 3: Verify Your Spreadsheet Structure**

Your Google Sheets should have these columns (in any order):
- **Contact Name** - Client/lead name
- **Phone** - Contact phone number
- **Email** - Contact email address
- **Instagram** - Instagram handle (optional)
- **Status** - Lead status (optional)
- **Last Contact** - Date of last contact
- **Notes** - Additional information about the lead
- **Follow Up Date** - When to follow up (optional)
- **Next Outreach** - When to reach out next (optional)

## 🔧 **Using the Integration**

### **1. Access the Setup Panel**
- Go to your CRM Dashboard
- Click the **"Google Sheets Setup"** button
- The setup panel will appear below the header

### **2. Test the Connection**
- Enter your Google Sheets API key
- Verify the Spreadsheet ID and Sheet Name are correct
- Click **"Test Connection"**
- You should see a green success message with data summary

### **3. Sync Your Data**
- After successful connection, click **"Sync Data"**
- Your CRM will populate with real data from Google Sheets
- The dashboard will show connection status and last sync time

### **4. Manual Sync**
- Use the **"Sync Data"** button anytime to refresh your data
- The system will automatically fall back to mock data if sync fails

## 📊 **How Lead Categorization Works**

The system automatically categorizes your leads based on:

### **Warm Leads** (Green)
- Status contains: "warm", "interested", "active", "engaged", "qualified"
- Notes contain: "interested", "warm"

### **Contacted Clients** (Blue)
- Status contains: "contacted", "called", "emailed", "proposal", "follow up"
- Notes contain: "contacted", "called", "emailed"
- Has a follow-up date set

### **Cold Leads** (Gray)
- All other leads that don't match warm or contacted criteria
- Usually new leads requiring initial outreach

## 🛠️ **Troubleshooting**

### **"API Key Not Configured" Error**
- Make sure you've added `REACT_APP_GOOGLE_SHEETS_API_KEY` to your `.env` file
- Restart your development server after adding the environment variable
- Check that the API key doesn't have extra spaces or characters

### **"Google Sheets API Error"**
- Verify your API key is correct
- Ensure you've enabled the Google Sheets API in Google Cloud Console
- Check that your API key restrictions allow Google Sheets API access

### **"No Data Found" Error**
- Verify the Spreadsheet ID is correct (found in the Google Sheets URL)
- Check that the Sheet Name matches exactly (case-sensitive)
- Ensure your spreadsheet has data in the expected columns

### **"Invalid Data Structure" Error**
- Make sure your spreadsheet has headers in the first row
- Verify you have at least one data row below the headers
- Check that your column names are clear and descriptive

### **Connection Works But No Data Shows**
- Check the browser console for detailed error messages
- Verify your spreadsheet has the expected column structure
- Try refreshing the page and testing the connection again

## 🔒 **Security Best Practices**

1. **Never commit your API key to Git**
   - Keep your `.env` file in `.gitignore`
   - Use environment variables in production

2. **Restrict your API key**
   - Only allow Google Sheets API access
   - Set appropriate usage quotas

3. **Monitor API usage**
   - Check Google Cloud Console for usage statistics
   - Set up alerts for unusual activity

## 📱 **Production Deployment**

When deploying to production:

1. **Set environment variables** in your hosting platform
2. **Use production API keys** (different from development)
3. **Enable proper CORS** if needed
4. **Set up monitoring** for API usage and errors

## 🎉 **You're All Set!**

Once configured, your CRM dashboard will:
- ✅ Display real-time data from Google Sheets
- ✅ Automatically categorize leads
- ✅ Provide manual sync capabilities
- ✅ Show connection status and sync history
- ✅ Fall back gracefully if connection issues occur

Your luxury real estate leads are now seamlessly integrated with your CRM dashboard! 🏠✨
