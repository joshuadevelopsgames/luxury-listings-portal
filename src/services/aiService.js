// AI Service for the Luxury Listings Portal
// This service provides intelligent responses about the app using OpenAI API
// with strict focus on only discussing the software application

class AIService {
  constructor() {
    this.context = {
      appName: "Luxury Listings Portal",
      description: "A comprehensive platform for managing luxury real estate operations with role-based access for Content Directors, Social Media Managers, HR Managers, and Sales Managers. All data is saved to Firestore with real-time updates.",
      features: {
        dashboard: "Main overview page with role-specific content, stats, and quick actions. HR dashboard shows operational metrics like pending leave requests and team satisfaction.",
        tasks: "Task management system with role-based assignments and progress tracking",
        tutorials: "Step-by-step guides organized by role and difficulty level",
        resources: "Document library with templates, guides, and quick access to My Time Off, Manager Messages, IT Support, and HR Analytics (for HR). Everything is nested here for easy access.",
        myTimeOff: "Employee time-off management where users can request vacation, sick leave, personal time, view balances, and track request status (pending/approved/rejected). Updates automatically in real-time.",
        selfService: "Employee Self-Service portal with tabs for Overview, Personal Info (editable), Time Off, Compensation, and Documents. HR managers can edit all employee fields.",
        itSupport: "IT Support intake form where employees can submit technical issues with page URLs, screenshots, and descriptions. Sends email to jrsschroeder@gmail.com and updates automatically.",
        calendar: "HR calendar for leave management, team scheduling, and Google Calendar sync (HR Managers only)",
        team: "Team management showing employee details, editable by HR managers (HR Managers only)",
        analytics: "HR analytics with team performance, retention rates, turnover analysis, and satisfaction metrics (HR Managers only, accessed via Resources page)",
        clientPackages: "Client package management with automatic updates (Content Directors only)",
        programs: "App setup and configuration management",
        crm: "CRM for lead management and tracking (Sales Managers only)",
        salesPipeline: "Sales pipeline visualization and deal tracking (Sales Managers only)",
        leadManagement: "Lead generation and management (Sales Managers only)"
      },
      roles: {
        admin: {
          name: "System Administrator",
          responsibilities: ["User management", "Role assignment", "System administration", "Security management", "System monitoring", "All profile access"],
          access: ["Dashboard", "User Management", "All Profiles", "All Features", "System Administration", "Role Assignment"]
        },
        contentDirector: {
          name: "Content Director",
          responsibilities: ["Content strategy", "Editorial planning", "Client package management", "Content performance tracking"],
          access: ["Dashboard", "Tasks", "Tutorials", "Resources", "Client Packages", "Programs"]
        },
        socialMediaManager: {
          name: "Social Media Manager",
          responsibilities: ["Social media strategy", "Content creation", "Campaign management", "Analytics and reporting"],
          access: ["Dashboard", "Tasks", "Tutorials", "Resources"]
        },
        hrManager: {
          name: "HR Manager",
          responsibilities: ["Leave request management", "Performance reviews", "Team operations", "Employee relations", "Attendance tracking"],
          access: ["Dashboard (operational metrics)", "HR Calendar (leave requests)", "Team Management", "Resources (includes HR Analytics)", "Self-Service (edit all employee fields)", "My Time Off", "IT Support"]
        },
        salesManager: {
          name: "Sales Manager",
          responsibilities: ["CRM management", "Lead generation", "Sales pipeline", "Deal tracking", "Client relationships", "Sales analytics"],
          access: ["Dashboard", "Tasks", "Tutorials", "Resources", "CRM Dashboard", "Sales Pipeline", "Lead Management"]
        }
      },
      navigation: {
        main: ["Dashboard", "Tasks", "Resources", "Self-Service"],
        admin: ["User Management", "All Profiles", "System Administration"],
        contentDirector: ["Client Packages (next to Dashboard)", "Programs"],
        hrManager: ["HR Calendar", "Team Management"],
        salesManager: ["CRM Dashboard", "Sales Pipeline", "Lead Management"],
        nestedInResources: ["My Time Off (featured)", "Manager Messages", "IT Support", "HR Analytics (HR only)"]
      },
      keyFeatures: {
        autoSave: "All data saves automatically with real-time updates across all users",
        editableProfiles: "HR managers can edit all employee information fields except Employee ID",
        emailNotifications: "IT Support tickets automatically email jrsschroeder@gmail.com",
        roleBasedUI: "Each role sees different dashboard content and menu options",
        autoSync: "Client Packages updates automatically",
        noPageReload: "Reloading a page keeps you on that page (no redirect to dashboard)"
      }
    };
  }

  // Main method to get AI response using OpenAI API
  async getResponse(userMessage, userRole = null) {
    try {
      // Check if OpenAI API key is available
      if (!process.env.REACT_APP_OPENAI_API_KEY) {
        // Fallback to rule-based responses if no API key
        return this.generateRuleBasedResponse(userMessage, userRole);
      }

      // Use OpenAI API for intelligent responses
      return await this.getOpenAIResponse(userMessage, userRole);
    } catch (error) {
      console.error('AI Service Error:', error);
      
      // Fallback to rule-based responses on error
      return this.generateRuleBasedResponse(userMessage, userRole);
    }
  }

  // Get response from OpenAI API
  async getOpenAIResponse(userMessage, userRole) {
    try {
      // Create the system prompt that keeps AI focused on the software
      const systemPrompt = this.createSystemPrompt(userRole);
      
      // Make API call to OpenAI
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          max_tokens: 500,
          temperature: 0.7,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw error;
    }
  }

  // Create focused system prompt that keeps AI on topic
  createSystemPrompt(userRole) {
    const role = this.getRoleInfo(userRole);
    
    return `You are a friendly, helpful AI assistant for the Luxury Listings Portal software application.

CRITICAL RULES - YOU MUST FOLLOW THESE:
1. ONLY answer questions about this specific software application
2. NEVER discuss topics outside of this software
3. If asked about anything else, respond with: "I'm here to help you with the Luxury Listings Portal software. I can help you with questions about the Dashboard, My Time Off, Employee Self-Service, IT Support, HR Calendar, Team Management, HR Analytics, Client Packages, CRM, Sales Pipeline, and other app features. What would you like to know about the software?"
4. Use only the context provided about this software
5. Be helpful, friendly, and conversational (not robotic or overly formal)
6. Keep responses concise but informative
7. Always relate answers back to the software functionality
8. For casual greetings like "hi", "hello", "hey", respond naturally and warmly
9. Use emojis occasionally to make responses more friendly and engaging
10. Many features are nested in the Resources page (My Time Off, Manager Messages, IT Support, HR Analytics) - always mention this when relevant

SOFTWARE CONTEXT:
Application Name: ${this.context.appName}
Description: ${this.context.description}

Current User Role: ${role.name}
Role Responsibilities: ${role.responsibilities.join(', ')}
Role Access: ${role.access.join(', ')}

Available Features:
${Object.entries(this.context.features).map(([key, desc]) => `- ${key}: ${desc}`).join('\n')}

Navigation Structure:
- Main Navigation: ${this.context.navigation.main.join(', ')}
- Role-Specific: ${this.context.navigation[userRole] ? this.context.navigation[userRole].join(', ') : 'None'}
- Nested in Resources Page: ${this.context.navigation.nestedInResources.join(', ')}

Key Technical Features:
${Object.entries(this.context.keyFeatures).map(([key, desc]) => `- ${key}: ${desc}`).join('\n')}

Your purpose is to help users understand and use this specific software application. Stay focused on software-related questions only, but be warm and conversational in your approach. Always mention how to access features (e.g., "Go to Resources → Click X" for nested features).`;
  }

  // Fallback rule-based responses (used when OpenAI is unavailable)
  generateRuleBasedResponse(userMessage, userRole) {
    const lowerMessage = userMessage.toLowerCase();
    
    // Greetings and casual conversation
    if (this.matchesPattern(lowerMessage, ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'sup', 'whats up'])) {
      return this.getGreetingResponse(userRole);
    }
    
    // Help and general questions
    if (this.matchesPattern(lowerMessage, ['help', 'how to', 'what is', 'where is'])) {
      return this.getHelpResponse(lowerMessage, userRole);
    }
    
    // Specific feature questions
    if (this.matchesPattern(lowerMessage, ['dashboard', 'home', 'main page'])) {
      return this.getDashboardResponse(userRole);
    }
    
    if (this.matchesPattern(lowerMessage, ['tasks', 'todo', 'assignments'])) {
      return this.getTasksResponse(userRole);
    }
    
    if (this.matchesPattern(lowerMessage, ['calendar', 'hr calendar', 'leave'])) {
      return this.getCalendarResponse(userRole);
    }
    
    if (this.matchesPattern(lowerMessage, ['team', 'management', 'employees'])) {
      return this.getTeamResponse(userRole);
    }
    
    if (this.matchesPattern(lowerMessage, ['analytics', 'reports', 'metrics'])) {
      return this.getAnalyticsResponse(userRole);
    }
    
    if (this.matchesPattern(lowerMessage, ['tutorials', 'training', 'learning'])) {
      return this.getTutorialsResponse(userRole);
    }
    
    if (this.matchesPattern(lowerMessage, ['resources', 'files', 'documents'])) {
      return this.getResourcesResponse(userRole);
    }
    
    if (this.matchesPattern(lowerMessage, ['client packages', 'clients'])) {
      return this.getClientPackagesResponse(userRole);
    }
    
    if (this.matchesPattern(lowerMessage, ['profile', 'role', 'switch'])) {
      return this.getRoleResponse(userRole);
    }
    
    if (this.matchesPattern(lowerMessage, ['logout', 'sign out', 'exit'])) {
      return this.getLogoutResponse();
    }
    
    // Time off and leave
    if (this.matchesPattern(lowerMessage, ['time off', 'vacation', 'sick leave', 'pto', 'leave request'])) {
      return this.getTimeOffResponse(userRole);
    }
    
    // Self-service
    if (this.matchesPattern(lowerMessage, ['self-service', 'self service', 'update profile', 'personal info'])) {
      return this.getSelfServiceResponse(userRole);
    }
    
    // IT Support
    if (this.matchesPattern(lowerMessage, ['it support', 'tech support', 'technical issue', 'bug', 'problem'])) {
      return this.getITSupportResponse(userRole);
    }
    
    // Navigation and finding things
    if (this.matchesPattern(lowerMessage, ['find', 'locate', 'where can i', 'how do i'])) {
      return this.getNavigationResponse(lowerMessage, userRole);
    }
    
    // Performance and progress
    if (this.matchesPattern(lowerMessage, ['progress', 'performance', 'stats'])) {
      return this.getPerformanceResponse(userRole);
    }
    
    // Default response
    return this.getDefaultResponse(userMessage);
  }

  // Helper method to check if message matches patterns
  matchesPattern(message, patterns) {
    return patterns.some(pattern => message.includes(pattern));
  }

  // Greeting responses
  getGreetingResponse(userRole) {
    const role = this.getRoleInfo(userRole);
    const greetings = [
      `Hi there! 👋 How can I help you with the Luxury Listings Portal today?`,
      `Hello! 😊 I'm here to help you navigate the platform. What would you like to know?`,
      `Hey! 👋 Ready to help you with your ${role.name} tasks. What's on your mind?`,
      `Hi! 😄 How can I assist you with the portal today?`,
      `Hello there! 👋 What would you like to explore in the Luxury Listings Portal?`
    ];
    
    // Pick a random greeting for variety
    const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
    return randomGreeting;
  }

  // Help responses
  getHelpResponse(message, userRole) {
    if (message.includes('help')) {
      return `I'd be happy to help! I can assist you with navigating the ${this.context.appName}, understanding different features, managing tasks, and more. 

What specific area would you like help with? I can help with:
• Dashboard and navigation
• Task management
• Role-specific features
• Finding resources and tutorials
• And much more!

Just ask me a specific question and I'll guide you through it.`;
    }
    
    return "I'm here to help! What would you like to know about the app?";
  }

  // Dashboard response
  getDashboardResponse(userRole) {
    const role = this.getRoleInfo(userRole);
    const isHR = userRole === 'hr_manager' || userRole === 'admin';
    
    let dashboardDetails = `📊 **Dashboard** is your main overview page with role-specific widgets!

As a ${role.name}, you'll see:
${role.access.map(feature => `• ${feature}`).join('\n')}

**Dashboard Features:**
• Welcome card with role-specific priorities
• Quick stats (4 cards showing key metrics)
`;

    if (isHR) {
      dashboardDetails += `• **HR-Specific Widgets:**
  - Pending Leave Requests (with approve/reject buttons)
  - Today's Team Status (who's out, recent hires)
  - Upcoming Performance Reviews
  - Quick Actions (HR Calendar, Team Analytics, etc.)
• Focus on operational metrics, not training
• Shows real pending leave count and team satisfaction`;
    } else {
      dashboardDetails += `• Today's Tasks widget
• Next Tutorials widget  
• **Time Off Widget** - shows your vacation/sick leave balances, pending requests, and upcoming time off`;
    }

    dashboardDetails += `\n\n📍 **Access:** Click "Dashboard" - it's the first item in navigation`;
    
    return dashboardDetails;
  }

  // Tasks response
  getTasksResponse(userRole) {
    const role = this.getRoleInfo(userRole);
    return `Tasks can be found in the 'Tasks' section of the main navigation. 

Here's what you can do:
• View your assigned tasks and deadlines
• Mark tasks as complete
• Track your progress and completion rates
• See role-specific task types

Each role has different types of tasks relevant to their responsibilities. ${role.name}s typically work on ${role.responsibilities.join(', ')} related tasks.

You can access Tasks from the main navigation menu.`;
  }

  // Calendar response
  getCalendarResponse(userRole) {
    if (userRole === 'hr_manager' || userRole === 'admin') {
      return `📅 **HR Calendar** is your operational hub for managing team leave and schedules!

**Key Features:**
• 📋 Approve/reject leave requests with one click
• 👥 See who's out today (team absences)
• 📊 View team member vacation/sick day balances
• 📅 Visual calendar with all leave marked
• 🔄 Sync with Google Calendar
• 🏖️ Track vacation, sick leave, and personal time

**HR Dashboard Focus:**
The HR dashboard is operational, not training-focused! You'll see:
• Pending leave requests (3 awaiting approval)
• Team absences today (2 out, 23 present)
• Team satisfaction (4.4/5.0)
• Quick access to approve requests

📍 **Access:** Click "HR Calendar" in your navigation menu. Perfect for day-to-day HR operations!`;
    } else {
      return `The HR Calendar is a specialized feature available only to HR Managers. It provides comprehensive calendar management for team scheduling, leave requests, and HR-related events.

**To request time off:**
📍 Go to Resources → Click "My Time Off" (big blue card at top)

If you need calendar functionality, you can:
• Use the main Dashboard to view your personal schedule
• Check the Tasks section for upcoming deadlines
• Contact your HR Manager for scheduling needs`;
    }
  }

  // Team response
  getTeamResponse(userRole) {
    if (userRole === 'hr_manager' || userRole === 'admin') {
      return `👥 **Team Management** is your HR command center with full employee oversight!

**Features:**
• View and edit employee details
• Performance metrics and ratings
• Leave balance tracking
• Skills and certifications
• Department breakdowns
• Team statistics and trends
• Edit any employee field (except Employee ID)

**Editing Employee Info:**
HR Managers can click "Edit" on any employee to update:
• Name, Email, Phone, Address
• Department, Position, Manager
• Start Date and other details

All changes save automatically and update instantly! ✅

📍 **Access:** Click "Team Management" in your navigation menu`;
    } else {
      return `Team Management is a specialized feature available only to HR Managers. It provides comprehensive team oversight, performance tracking, and employee management capabilities.

**To view/edit your own info:**
📍 Go to Self-Service → Personal Info tab (you can edit phone & address)

If you need team-related information, you can:
• Check the Dashboard for team overview
• View your personal performance metrics
• Contact your HR Manager for team details`;
    }
  }

  // Analytics response
  getAnalyticsResponse(userRole) {
    if (userRole === 'hr_manager' || userRole === 'admin') {
      return `HR Analytics provides detailed insights into team performance, turnover rates, employee satisfaction, and metrics. 

Key features include:
• Performance distribution and trends
• Department comparisons  
• Turnover analysis and costs
• Employee satisfaction breakdowns
• Retention rates and team statistics
• Interactive charts and visualizations

📍 **How to Access:** Go to Resources page → Click "HR Analytics" card in the Essential Resources section. It's nested there instead of the main navigation for a cleaner menu.`;
    } else {
      return `HR Analytics is a specialized feature available only to HR Managers. It provides comprehensive data insights, performance metrics, and HR reporting capabilities.

If you need performance insights, you can:
• Check the Dashboard for your personal metrics
• View your progress in the Tasks section
• Contact your HR Manager for detailed reports`;
    }
  }

  // Time Off response
  getTimeOffResponse(userRole) {
    return `📅 **My Time Off** is where you can manage all your vacation, sick leave, and personal time!

Features:
• Request time off (vacation, sick leave, personal time)
• View your leave balances and remaining days
• Track request status (pending/approved/rejected)
• See your request history
• Get instant updates when HR approves or rejects

📍 **How to Access:**
1. Go to Resources page → Click the big blue "My Time Off" card at the top
2. Or use the Time Off widget on your Dashboard
3. Or go to Self-Service → Time Off tab

Your requests are sent to HR managers instantly! ✅`;
  }

  // Self-Service response
  getSelfServiceResponse(userRole) {
    const isHR = userRole === 'hr_manager' || userRole === 'admin';
    
    return `🏢 **Employee Self-Service** is your personal portal with 5 tabs:

**📋 Overview Tab:**
• Personal summary with avatar
• Time off balances
• Recent requests

**👤 Personal Info Tab:**
• View and edit your information
${isHR ? '• HR Managers can edit ALL employee fields (name, email, department, position, etc.)' : '• You can edit: Phone & Address'}
${isHR ? '' : '• Contact HR to change: Name, Email, Department, Position'}

**📅 Time Off Tab:**
• Quick link to My Time Off page
• Balance overview

**💰 Compensation Tab:**
• Salary information
• Benefits details
• Pay schedule

**📄 Documents Tab:**
• Pay stubs, W-2s, policies
• Download capability

📍 **Access:** Click "Self-Service" in the main navigation bar`;
  }

  // IT Support response
  getITSupportResponse(userRole) {
    return `🛠️ **IT Support Portal** lets you submit technical issues and get help!

**Submit a Ticket With:**
• Issue title and category (Technical/Access/Account/Other)
• Priority level (Low/Medium/High/Urgent)
• 🔗 Page URL - link to where the problem is
• 📸 Screenshot URL - upload to imgur.com, paste link
• Detailed description of the issue

**What Happens:**
✅ Your ticket is saved automatically
📧 Email sent to jrsschroeder@gmail.com
📊 You can track ticket status (pending/in progress/resolved)
🔔 Get updates on your ticket

📍 **How to Access:** Resources page → Click "IT Support Portal" card

Perfect for bugs, access issues, or any technical problems!`;
  }

  // Tutorials response
  getTutorialsResponse(userRole) {
    const role = this.getRoleInfo(userRole);
    return `Tutorials are available in the 'Tutorials' section and provide step-by-step guidance on using different features of the ${this.context.appName}.

The tutorials are:
• Organized by role and difficulty level
• Designed to help you get the most out of the platform
• Updated regularly with new features
• Accessible from the main navigation

As a ${role.name}, you'll find tutorials specifically tailored to your responsibilities including ${role.responsibilities.join(', ')}.`;
  }

  // Resources response
  getResourcesResponse(userRole) {
    const role = this.getRoleInfo(userRole);
    const isHR = userRole === 'hr_manager' || userRole === 'admin';
    
    return `📚 **Resources** is your one-stop hub for everything you need!

**🌟 Featured at the Top:**
• **My Time Off** (big blue card) - Request vacation/sick leave

**📋 Essential Resources:**
• Manager Messages
• IT Support Portal
${isHR ? '• HR Analytics (HR Managers only)' : ''}
• Employee Handbook

**📑 Other Resources:**
• Team Directory
• Training videos
• Benefits guide
• Emergency contacts

**Why Resources is Great:**
Everything is nested here for easy access! Instead of cluttering the navigation menu, key tools like My Time Off, Manager Messages, IT Support${isHR ? ', and HR Analytics' : ''} are organized in the Resources page.

📍 **Access:** Click "Resources" in the main navigation`;
  }

  // Client packages response
  getClientPackagesResponse(userRole) {
    if (userRole === 'content_director') {
      return `Client Packages is a specialized feature for Content Directors that allows you to:
• Manage client package offerings
• Track package performance
• Monitor client engagement
• Analyze package effectiveness
• Create and modify package structures

You can access Client Packages from the main navigation. It's designed to help you manage and optimize your content offerings for different client segments.`;
    } else {
      return `Client Packages is a specialized feature available only to Content Directors. It provides comprehensive client package management, tracking, and optimization capabilities.

If you need information about client packages, you can:
• Check the Dashboard for overview information
• Contact your Content Director for details
• Review the Resources section for related materials`;
    }
  }

  // Role response
  getRoleResponse(userRole) {
    const role = this.getRoleInfo(userRole);
    return `You can switch between different user roles using the Profile dropdown in the top navigation. 

Currently, you're logged in as a ${role.name} with access to:
${role.access.map(feature => `• ${feature}`).join('\n')}

Each role (Content Director, Social Media Manager, HR Manager) has access to different features and views tailored to their responsibilities. You can switch roles to explore different perspectives of the platform.`;
  }

  // Logout response
  getLogoutResponse() {
    return `To log out, click the logout button (power icon) in the top right corner of the navigation bar. 

This will:
• Return you to the login page
• Clear your current session
• Require you to log in again to access the platform

The logout button is always visible in the top navigation for easy access.`;
  }

  // Navigation response
  getNavigationResponse(message, userRole) {
    const role = this.getRoleInfo(userRole);
    
    // Check if they're asking about IT Support related things
    if (message.includes('bug') || message.includes('problem') || message.includes('issue') || message.includes('technical') || message.includes('support') || message.includes('report')) {
      return this.getITSupportResponse(userRole);
    }
    
    // Check if they're asking about time off
    if (message.includes('time off') || message.includes('vacation') || message.includes('sick leave') || message.includes('pto') || message.includes('leave')) {
      return this.getTimeOffResponse(userRole);
    }
    
    // Check if they're asking about profile or personal info
    if (message.includes('profile') || message.includes('personal info') || message.includes('edit') || message.includes('update')) {
      return this.getSelfServiceResponse(userRole);
    }
    
    if (message.includes('dashboard')) {
      return "The Dashboard is accessible from the main navigation at the top of every page. It's the first item in the navigation menu.";
    }
    
    if (message.includes('tasks')) {
      return "Tasks can be found in the main navigation menu. Look for the 'Tasks' item in the top navigation bar.";
    }
    
    if (message.includes('tutorials')) {
      return "Tutorials are available in the main navigation. Look for the 'Tutorials' item in the top navigation bar.";
    }
    
    if (message.includes('resources')) {
      return "Resources can be found in the main navigation. Look for the 'Resources' item in the top navigation bar.";
    }
    
    return `To find features in the ${this.context.appName}, use the main navigation menu at the top of every page. Your role as a ${role.name} gives you access to: ${role.access.join(', ')}.`;
  }

  // Performance response
  getPerformanceResponse(userRole) {
    const role = this.getRoleInfo(userRole);
    return `Your performance and progress can be tracked in several places:

• Dashboard: Overview of your key metrics and progress
• Tasks: Completion rates and upcoming deadlines
• Role-specific features: Specialized metrics for your role

As a ${role.name}, you can monitor your performance in areas like ${role.responsibilities.join(', ')}. The Dashboard provides a quick overview, while specific sections offer detailed insights.`;
  }

  // Default response
  getDefaultResponse(userMessage) {
    return `I'm not quite sure what you're asking about "${userMessage}". 😊 

I'm here to help you with the Luxury Listings Portal! You can ask me about:
• 📊 Dashboard and navigation
• ✅ Task management  
• 📅 My Time Off (vacation/sick leave requests)
• 🏢 Employee Self-Service (update profile, view compensation)
• 🛠️ IT Support (submit technical issues)
• 📚 Resources (everything is nested here!)
• 📅 HR Calendar (leave management)
• 👥 Team Management
• 📈 HR Analytics
• 📦 Client Packages
• 💼 CRM & Sales Pipeline
• And much more!

What would you like to know about the platform?`;
  }

  // Get role information
  getRoleInfo(userRole) {
    switch (userRole) {
      case 'admin':
        return this.context.roles.admin;
      case 'content_director':
        return this.context.roles.contentDirector;
      case 'social_media_manager':
        return this.context.roles.socialMediaManager;
      case 'hr_manager':
        return this.context.roles.hrManager;
      case 'sales_manager':
        return this.context.roles.salesManager;
      default:
        return this.context.roles.contentDirector; // Default fallback
    }
  }

  // Method to check if OpenAI is available
  isOpenAIAvailable() {
    return !!process.env.REACT_APP_OPENAI_API_KEY;
  }

  // Method to upgrade to real AI API (for future use)
  async upgradeToRealAI(userMessage, userRole) {
    // This method can be implemented later to use OpenAI or other AI services
    // For now, it falls back to rule-based responses
    return this.getResponse(userMessage, userRole);
  }
}

export default AIService;
