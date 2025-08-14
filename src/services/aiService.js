// AI Service for the Luxury Listings Portal
// This service provides intelligent responses about the app using OpenAI API
// with strict focus on only discussing the software application

class AIService {
  constructor() {
    this.context = {
      appName: "Luxury Listings Portal",
      description: "A comprehensive platform for managing luxury real estate operations with role-based access for Content Directors, Social Media Managers, and HR Managers.",
      features: {
        dashboard: "Main overview page with role-specific content and progress tracking",
        tasks: "Task management system with role-based assignments and progress tracking",
        tutorials: "Step-by-step guides organized by role and difficulty level",
        resources: "Document library with templates, guides, and reference materials",
        calendar: "HR calendar for leave management and team scheduling (HR Managers only)",
        team: "Team management with performance metrics and employee details (HR Managers only)",
        analytics: "HR analytics with performance insights and reporting (HR Managers only)",
        clientPackages: "Client package management and tracking (Content Directors only)",
        programs: "App setup and configuration management"
      },
      roles: {
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
          responsibilities: ["Team management", "Performance tracking", "Leave management", "HR analytics", "Employee development"],
          access: ["Dashboard", "Tasks", "Tutorials", "Resources", "HR Calendar", "Team Management", "HR Analytics"]
        }
      },
      navigation: {
        main: ["Dashboard", "Tutorials", "Tasks", "Resources"],
        contentDirector: ["Client Packages", "Programs"],
        hrManager: ["HR Calendar", "Team Management", "HR Analytics"]
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
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          max_tokens: 300,
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
3. If asked about anything else, respond with: "I'm here to help you with the Luxury Listings Portal software. I can help you with questions about the Dashboard, Tasks, Calendar, Team Management, HR Analytics, Tutorials, Resources, and other app features. What would you like to know about the software?"
4. Use only the context provided about this software
5. Be helpful, friendly, and conversational (not robotic or overly formal)
6. Keep responses concise but informative
7. Always relate answers back to the software functionality
8. For casual greetings like "hi", "hello", "hey", respond naturally and warmly
9. Use emojis occasionally to make responses more friendly and engaging

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

Your purpose is to help users understand and use this specific software application. Stay focused on software-related questions only, but be warm and conversational in your approach.`;
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
    
    // Navigation and finding things
    if (this.matchesPattern(lowerMessage, ['find', 'locate', 'where can i'])) {
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
    return `The Dashboard is your main overview page where you can see your progress, upcoming tasks, and role-specific information.

As a ${role.name}, you have access to:
${role.access.map(feature => `• ${feature}`).join('\n')}

The Dashboard automatically adapts to show content relevant to your role and provides a quick overview of your key metrics and upcoming activities. You can access it from the main navigation at any time.`;
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
    if (userRole === 'hr_manager') {
      return `HR Managers have access to a dedicated HR Calendar page where you can:
• Manage leave requests and approvals
• Track team availability and schedules
• Sync with Google Calendar
• View upcoming time-off and events
• Manage team calendars

You can find the HR Calendar in your navigation menu. It's specifically designed for HR management tasks and team scheduling.`;
    } else {
      return `The HR Calendar is a specialized feature available only to HR Managers. It provides comprehensive calendar management for team scheduling, leave requests, and HR-related events.

If you need calendar functionality, you can:
• Use the main Dashboard to view your personal schedule
• Check the Tasks section for upcoming deadlines
• Contact your HR Manager for scheduling needs`;
    }
  }

  // Team response
  getTeamResponse(userRole) {
    if (userRole === 'hr_manager') {
      return `Team Management is available for HR Managers and provides comprehensive team oversight including:
• Performance metrics and ratings
• Leave balance tracking
• Skills and certifications
• Employee details and contact info
• Department breakdowns
• Team statistics and trends

You can access Team Management from the main navigation. It's designed to give you complete visibility into your team's performance and development.`;
    } else {
      return `Team Management is a specialized feature available only to HR Managers. It provides comprehensive team oversight, performance tracking, and employee management capabilities.

If you need team-related information, you can:
• Check the Dashboard for team overview
• View your personal performance metrics
• Contact your HR Manager for team details`;
    }
  }

  // Analytics response
  getAnalyticsResponse(userRole) {
    if (userRole === 'hr_manager') {
      return `HR Analytics provides detailed insights into team performance, turnover rates, employee satisfaction, and training metrics. 

Key features include:
• Performance distribution and trends
• Department comparisons
• Turnover analysis and costs
• Training completion rates
• Employee satisfaction breakdowns
• Interactive charts and visualizations

You can access HR Analytics from the main navigation. It's designed to help you make data-driven decisions about your team and HR strategies.`;
    } else {
      return `HR Analytics is a specialized feature available only to HR Managers. It provides comprehensive data insights, performance metrics, and HR reporting capabilities.

If you need performance insights, you can:
• Check the Dashboard for your personal metrics
• View your progress in the Tasks section
• Contact your HR Manager for detailed reports`;
    }
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
    return `The Resources section contains helpful documents, templates, and reference materials organized by category.

You can find:
• Templates and forms
• Style guides and standards
• Reference documents
• Best practices
• Training materials

Resources are organized by category and are relevant to your role as a ${role.name}. You can browse, search, and download materials to help with your daily tasks.`;
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
• Dashboard and navigation
• Task management  
• Role-specific features
• Finding resources and tutorials
• Calendar and scheduling
• Team management
• And much more!

What would you like to know about the platform?`;
  }

  // Get role information
  getRoleInfo(userRole) {
    switch (userRole) {
      case 'content_director':
        return this.context.roles.contentDirector;
      case 'social_media_manager':
        return this.context.roles.socialMediaManager;
      case 'hr_manager':
        return this.context.roles.hrManager;
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
