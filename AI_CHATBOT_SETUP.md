# AI Chatbot Setup Guide

## 🚀 **Real AI Integration for Luxury Listings Portal**

The chatbot has been upgraded to use real AI (OpenAI) while maintaining strict focus on only discussing the software application.

## 🔑 **Setup Steps (5 minutes)**

### **1. Get OpenAI API Key**
- Go to [platform.openai.com](https://platform.openai.com)
- Sign up/Login and navigate to API Keys
- Create a new API key
- Copy the key (it starts with `sk-...`)

### **2. Create Environment File**
- In your project root, create a file called `.env.local`
- Add this content:
```bash
REACT_APP_OPENAI_API_KEY=sk-your_actual_api_key_here
```
- Replace `sk-your_actual_api_key_here` with your real API key

### **3. Restart Development Server**
```bash
npm start
```

## 🎯 **How It Works**

### **AI Focus Control**
The system prompt ensures the AI ONLY talks about your software:

```
CRITICAL RULES - YOU MUST FOLLOW THESE:
1. ONLY answer questions about this specific software application
2. NEVER discuss topics outside of this software
3. If asked about anything else, redirect to software questions
4. Use only the context provided about this software
```

### **Context-Aware Responses**
- **Role-based intelligence** - knows what each user can access
- **Feature mapping** - understands the entire app structure
- **Navigation guidance** - helps users find what they need
- **Professional tone** - business-appropriate responses

## 💰 **Cost Analysis**

### **OpenAI GPT-3.5-turbo Pricing:**
- **Input tokens**: ~200 per message = $0.0002
- **Output tokens**: ~150 per response = $0.0003
- **Total per conversation**: ~$0.0005
- **1000 conversations**: ~$0.50
- **10,000 conversations**: ~$5.00

### **Cost Control:**
- **Max tokens**: Limited to 300 per response
- **Efficient prompts**: Optimized system messages
- **Fallback system**: Rule-based responses if API fails

## 🔧 **Technical Features**

### **Smart Fallbacks**
- **API unavailable**: Falls back to rule-based responses
- **API errors**: Graceful error handling
- **No API key**: Works without OpenAI (rule-based)

### **Performance Optimizations**
- **Efficient prompts**: Minimal token usage
- **Response caching**: Avoids duplicate API calls
- **Error recovery**: Automatic fallback on issues

## 📚 **Features the AI Knows About**

### **Employee Features:**
- **My Time Off** - Request vacation, sick leave, personal time
- **Employee Self-Service** - Edit profile, view compensation, documents
- **IT Support** - Submit technical issues with page URLs and screenshots
- **Resources Page** - All tools nested here (Time Off, IT Support, Manager Messages)
- **Dashboard Widgets** - Time Off Widget showing balances and pending requests

### **HR Manager Features:**
- **HR Calendar** - Approve/reject leave requests, team scheduling
- **Team Management** - View and edit all employee information
- **HR Analytics** - Nested in Resources page, not main navigation
- **Operational Dashboard** - Pending leave requests, team satisfaction, absences
- **HR Quick Actions** - Approve requests directly from Dashboard

### **Key Features:**
- **Auto-Save** - All data saves automatically with instant updates
- **Email Notifications** - IT Support tickets email jrsschroeder@gmail.com
- **Role-Based Views** - Each role sees different features
- **No Page Reload** - Reloading keeps you on current page

## 🧪 **Testing the AI**

### **Test Questions:**
1. **"How do I request time off?"**
2. **"Where can I find HR Analytics?"**
3. **"How do I update my personal information?"**
4. **"Where do I submit an IT support ticket?"**
5. **"How do I access the HR Calendar?"**
6. **"Can I edit employee information?"**
7. **"What's in the Resources page?"**

### **Expected Behavior:**
- ✅ **Software questions**: Detailed, helpful responses with emojis and access paths
- ❌ **Off-topic questions**: Redirected to software help
- 🎯 **Role-specific**: HR sees operational features, employees see Self-Service
- 📍 **Navigation help**: "Go to Resources → Click X" format for nested features

## 🚨 **Security & Privacy**

### **API Key Security**
- **Environment variables**: Never hardcoded in code
- **Client-side only**: API calls from browser (safe for public apps)
- **Rate limiting**: OpenAI handles abuse prevention

### **Data Privacy**
- **No data storage**: Conversations not saved
- **No personal info**: Only software-related questions
- **OpenAI privacy**: Follows OpenAI's data policies

## 🔄 **Upgrading to Production**

### **Environment Variables**
```bash
# Development (.env.local)
REACT_APP_OPENAI_API_KEY=sk-dev-key

# Production (Vercel)
REACT_APP_OPENAI_API_KEY=sk-prod-key
```

### **Vercel Deployment**
1. Add environment variable in Vercel dashboard
2. Redeploy the application
3. AI chatbot will work in production

## 🎉 **Benefits**

### **For Users:**
- **Instant help**: No need to search documentation
- **Context-aware**: Knows user's role and permissions
- **Always available**: Help on every page
- **Professional**: Business-appropriate responses

### **For Developers:**
- **Easy maintenance**: Centralized AI service
- **Scalable**: Handles any number of users
- **Cost-effective**: Very low per-conversation cost
- **Reliable**: Fallback system ensures availability

## 🚀 **Ready to Use!**

Once you add your OpenAI API key to `.env.local`, the chatbot will:
1. **Use real AI** for intelligent responses
2. **Stay focused** only on your software
3. **Provide role-specific** help and guidance
4. **Fall back gracefully** if API is unavailable

The AI will understand your entire application and provide helpful, contextual assistance to users! 🤖✨
