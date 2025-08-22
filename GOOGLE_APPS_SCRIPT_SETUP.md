# Google Apps Script Setup Guide

## 🚀 **Why This is Needed**

The Google Sheets API **does not allow write operations** with API keys. API keys only work for reading data. For writing to Google Sheets, we need to use Google Apps Script.

## 📋 **Step-by-Step Setup**

### **Step 1: Create Google Apps Script**

1. **Go to [script.google.com](https://script.google.com)**
2. **Click "New Project"**
3. **Delete the default code** and paste the contents of `google-apps-script.js`
4. **Save the project** (Ctrl+S or Cmd+S)
5. **Name it** "Client Packages Manager"

### **Step 2: Deploy as Web App**

1. **Click "Deploy"** → **"New deployment"**
2. **Choose type**: "Web app"
3. **Description**: "Client Packages Manager v1"
4. **Execute as**: "Me" (your Google account)
5. **Who has access**: "Anyone" (for now - we can secure it later)
6. **Click "Deploy"**

### **Step 3: Get the Web App URL**

1. **Copy the Web App URL** that looks like:
   ```
   https://script.google.com/macros/s/AKfycbz.../exec
   ```
2. **Replace the placeholder** in `src/pages/ClientPackages.jsx`:
   ```javascript
   const GOOGLE_APPS_SCRIPT_URL = 'YOUR_ACTUAL_URL_HERE';
   ```

### **Step 4: Test the Setup**

1. **Open your browser** and go to the Web App URL
2. **You should see**: `{"success":true,"message":"Google Apps Script is running"}`
3. **If you see this**, the script is working correctly

## 🔧 **How It Works**

### **Read Operations** (Still use API Key)
- Fetching client data
- Reading from Google Sheets
- Displaying current data

### **Write Operations** (Use Google Apps Script)
- Updating client packages
- Adding new clients
- Approving/rejecting clients

## 🛡️ **Security Considerations**

### **Current Setup (Development)**
- Web app is public (anyone can access)
- Good for testing and development
- Not recommended for production

### **Production Setup (Later)**
- Add authentication to the web app
- Use OAuth2 tokens
- Implement rate limiting
- Add request validation

## 🎯 **Benefits of This Approach**

1. **Full Write Access**: Can update, add, and modify Google Sheets
2. **No OAuth2 Complexity**: Simpler than setting up OAuth2
3. **Serverless**: No backend server needed
4. **Google Native**: Uses Google's own infrastructure
5. **Cost Effective**: Free for reasonable usage

## 🚨 **Troubleshooting**

### **If you get CORS errors:**
- Make sure the web app URL is correct
- Check that the deployment is set to "Anyone" access
- Verify the script is deployed successfully

### **If you get 404 errors:**
- Check that the web app URL is correct
- Make sure the script is deployed
- Try accessing the URL directly in browser

### **If you get permission errors:**
- Make sure the script has access to your Google Sheets
- Check that the spreadsheet ID is correct
- Verify the sheet name matches exactly

## 📞 **Next Steps**

1. **Deploy the Google Apps Script** following the steps above
2. **Update the URL** in the React app
3. **Test the functionality** by editing a client package
4. **Enjoy real-time Google Sheets integration!** 🎉

---

**Need help?** The Google Apps Script approach is much more reliable than trying to use API keys for write operations. Once set up, your app will have full read/write access to Google Sheets!



