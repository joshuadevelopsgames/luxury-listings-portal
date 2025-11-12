# Google Sheets Import Setup Guide

## 🎉 What's New

Your Content Calendar now supports importing posts directly from Google Sheets with **AI-powered column mapping**! 

## ✨ Features

- 🤖 **AI analyzes your sheet** and automatically maps columns to the right fields
- 📊 Import hundreds of posts in seconds
- ✅ Works with any sheet format - AI figures it out
- 🔒 Secure OAuth authentication
- 👤 User-specific imports (your sheets stay private)

## 🚀 Setup Instructions

### Step 1: Get an OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click **"Create new secret key"**
4. Copy the key (it starts with `sk-...`)
5. **Save it somewhere safe** - you won't be able to see it again!

### Step 2: Add Environment Variable

#### For Local Development:
1. Open your `.env.local` file (or create one in the project root)
2. Add this line:
   ```
   REACT_APP_OPENAI_API_KEY=sk-your-key-here
   ```
3. Restart your development server

#### For Vercel Deployment:
1. Go to your Vercel project dashboard
2. Navigate to **Settings → Environment Variables**
3. Add a new variable:
   - **Name**: `REACT_APP_OPENAI_API_KEY`
   - **Value**: `sk-your-key-here`
   - **Environment**: Production, Preview, Development (select all)
4. Click **Save**
5. Redeploy your project

### Step 3: Verify Google Sheets API is Enabled

The Google Sheets integration uses the same OAuth credentials as your Google Calendar integration, so if that's working, you're all set!

If you need to enable it:
1. Go to https://console.cloud.google.com/
2. Select your project
3. Go to **APIs & Services → Library**
4. Search for **"Google Sheets API"**
5. Click **Enable**

## 💰 Cost Information

### OpenAI Pricing
- Model used: **GPT-4o Mini** (most cost-effective)
- Cost per import: **~$0.005-0.01** (half a cent)
- If 10 people import 4 times/month: **~$0.40-0.80/month**

### Free Tier
OpenAI provides **$5 in free credits** for new accounts, which is good for **500-1,000 imports**!

## 📋 How to Use

### 1. Prepare Your Google Sheet

Your sheet should have:
- **First row**: Column headers (Date, Platform, Caption, etc.)
- **Remaining rows**: Your content posts

Example columns the AI recognizes:
- Date fields: "Date", "Post Date", "Publish Date", "When"
- Platform: "Platform", "Social Media", "Channel"
- Content: "Caption", "Description", "Text", "Post"
- Status: "Status", "State", "Progress"
- Assigned: "Assigned To", "Owner", "Who"

**The AI is smart** - it doesn't need exact column names. It analyzes your headers AND sample data to figure out the mapping!

### 2. Import Your Content

1. Go to **Content Calendar**
2. Click **"Import from Sheets"**
3. Authorize Google Sheets (one-time)
4. Paste your sheet URL
5. Review AI-suggested mappings
6. Adjust if needed
7. Click **"Import"**

Done! All your posts are now in the calendar. 🎉

## 🔧 Troubleshooting

### "OpenAI API key is not configured"
- Make sure you added `REACT_APP_OPENAI_API_KEY` to your environment variables
- Restart your development server or redeploy to Vercel
- Verify the key starts with `sk-`

### "Failed to authorize Google Sheets"
- Make sure Google Sheets API is enabled in your Google Cloud Console
- Check that your OAuth client ID is configured correctly
- Try disconnecting and reconnecting

### "Sheet appears to be empty"
- Make sure your sheet has a header row
- Verify the sheet isn't protected or restricted
- Try copying the sheet URL from the address bar

### AI mapping is wrong
- You can manually adjust any mapping before importing
- The AI makes suggestions, but you have full control

## 🎯 Tips for Best Results

1. **Use clear column headers** - "Post Date" is better than just "Date"
2. **Include sample data** - The AI learns from your first few rows
3. **Be consistent** - Keep the same format throughout your sheet
4. **Review before importing** - Always check the AI's suggestions
5. **Use the same sheet template** - The AI will get better at recognizing your format

## 🔐 Privacy & Security

- **Your data stays private** - We only read the sheet you select
- **No data stored** - Content is imported directly to your browser's localStorage
- **User-specific auth** - Each user authorizes their own Google account
- **Secure tokens** - OAuth tokens are stored per-user and encrypted

## 📞 Support

If you run into any issues:
1. Check the browser console for error messages
2. Verify all environment variables are set correctly
3. Make sure both Google Sheets API and OpenAI API are working
4. Try the fallback mapping (works without AI if OpenAI fails)

---

**Built with ❤️ using OpenAI GPT-4o Mini and Google Sheets API**

