export class Tutorial {
  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.description = data.description;
    this.category = data.category;
    this.difficulty = data.difficulty;
    this.estimated_time = data.estimated_time;
    this.order_index = data.order_index;
    this.is_required = data.is_required;
    this.prerequisites = data.prerequisites || [];
    this.content = data.content;
  }

  get formattedTime() {
    if (!this.estimated_time) return 'N/A';
    if (this.estimated_time < 60) {
      return `${this.estimated_time}m`;
    }
    const hours = Math.floor(this.estimated_time / 60);
    const minutes = this.estimated_time % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  get difficultyColor() {
    const colors = {
      beginner: 'bg-green-100 text-green-800 border-green-200',
      intermediate: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      advanced: 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[this.difficulty] || colors.beginner;
  }

  static async list(sortBy = 'order_index', userRole = null) {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Comprehensive social media marketing tutorials based on industry standards
    const mockTutorials = [
      {
        id: 1,
        title: "Social Media Strategy Fundamentals",
        description: "Master the core principles of social media marketing: audience identification, platform selection, content pillars, and brand voice development.",
        category: "strategy",
        difficulty: "beginner",
        estimated_time: 60,
        order_index: 1,
        is_required: true,
        prerequisites: [],
        content: {
          sections: [
            {
              title: "Understanding Your Audience",
              content: "Learn to create detailed buyer personas, analyze demographics, understand pain points, and map the customer journey. Use tools like Facebook Audience Insights, Google Analytics, and social listening platforms to gather data. Identify where your audience spends time online and what content they engage with most."
            },
            {
              title: "Platform Selection & Strategy",
              content: "Evaluate which platforms align with your business goals: Instagram for visual storytelling, LinkedIn for B2B networking, TikTok for trend-driven content, Twitter for real-time engagement, and Facebook for community building. Each platform requires a unique approach and content strategy."
            },
            {
              title: "Content Pillars & Brand Voice",
              content: "Develop 3-5 content pillars that align with your brand values and audience interests. Establish a consistent brand voice that reflects your company personality. Create style guides for tone, language, and visual elements to maintain consistency across all channels."
            },
            {
              title: "Goal Setting & KPIs",
              content: "Set SMART goals (Specific, Measurable, Achievable, Relevant, Time-bound) for your social media efforts. Define key performance indicators like engagement rate, reach, click-through rate, conversion rate, and return on ad spend. Track progress monthly and adjust strategies accordingly."
            }
          ]
        }
      },
      {
        id: 2,
        title: "Content Creation & Visual Design",
        description: "Learn professional content creation techniques including copywriting, graphic design principles, video production, and multi-format content development.",
        category: "content-creation",
        difficulty: "intermediate",
        estimated_time: 90,
        order_index: 2,
        is_required: true,
        prerequisites: [1],
        content: {
          sections: [
            {
              title: "Copywriting for Social Media",
              content: "Master the art of writing compelling social media copy. Learn hook writing techniques, storytelling principles, and platform-specific best practices. Understand character limits, hashtag strategy, and call-to-action optimization. Practice writing for different formats: posts, stories, ads, and captions."
            },
            {
              title: "Visual Design Principles",
              content: "Apply fundamental design principles: hierarchy, contrast, balance, and consistency. Learn color psychology and typography basics. Master aspect ratios for different platforms (1:1 for Instagram posts, 16:9 for YouTube, 9:16 for Stories). Use design tools like Canva, Figma, or Adobe Creative Suite."
            },
            {
              title: "Video Content Production",
              content: "Create engaging video content for platforms like TikTok, Instagram Reels, and YouTube Shorts. Learn basic video editing, storytelling through motion, and platform-specific video requirements. Understand optimal video lengths, thumbnail design, and caption optimization for video content."
            },
            {
              title: "Multi-Format Content Strategy",
              content: "Repurpose content across multiple formats and platforms. Learn to adapt one piece of content into posts, stories, videos, and carousels. Develop content calendars that maximize reach while maintaining quality. Use tools like Later, Buffer, or Hootsuite for content planning and scheduling."
            }
          ]
        }
      },
      {
        id: 3,
        title: "Platform-Specific Best Practices",
        description: "Master the unique features, algorithms, and best practices for each major social media platform to maximize engagement and reach.",
        category: "platforms",
        difficulty: "intermediate",
        estimated_time: 120,
        order_index: 3,
        is_required: true,
        prerequisites: [1, 2],
        content: {
          sections: [
            {
              title: "Instagram Mastery",
              content: "Optimize Instagram posts, stories, reels, and IGTV content. Understand the algorithm factors: engagement rate, recency, relationship, and frequency. Master hashtag strategy, location tagging, and user-generated content campaigns. Learn to use Instagram Shopping, Live features, and collaborative posts effectively."
            },
            {
              title: "LinkedIn B2B Strategy",
              content: "Develop professional content for LinkedIn including thought leadership posts, company updates, and industry insights. Understand LinkedIn's algorithm preferences for engagement and reach. Master networking strategies, content publishing times, and professional hashtag usage. Learn to leverage LinkedIn Groups and Sales Navigator."
            },
            {
              title: "TikTok & Short-Form Video",
              content: "Create viral-worthy content for TikTok, Instagram Reels, and YouTube Shorts. Understand trending sounds, challenges, and hashtag strategies. Learn video editing techniques, storytelling in 15-60 seconds, and community engagement tactics. Master the algorithm factors: watch time, shares, and engagement."
            },
            {
              title: "Twitter & Real-Time Engagement",
              content: "Navigate Twitter's fast-paced environment with real-time content, trending topics, and community engagement. Learn thread writing, quote tweets, and Twitter Spaces. Understand hashtag trends, optimal posting times, and crisis communication strategies. Master the art of concise, impactful messaging."
            }
          ]
        }
      },
      {
        id: 4,
        title: "Community Management & Engagement",
        description: "Build and nurture engaged communities through strategic engagement, moderation, user-generated content, and relationship building.",
        category: "community",
        difficulty: "intermediate",
        estimated_time: 75,
        order_index: 4,
        is_required: true,
        prerequisites: [1, 2],
        content: {
          sections: [
            {
              title: "Community Building Strategies",
              content: "Develop strategies to build authentic, engaged communities around your brand. Create community guidelines, foster meaningful conversations, and encourage user-generated content. Learn to identify and nurture brand advocates, handle negative feedback professionally, and create inclusive spaces for your audience."
            },
            {
              title: "Engagement & Response Management",
              content: "Master the art of community engagement through timely responses, personalized interactions, and proactive community management. Learn to handle comments, direct messages, and mentions across all platforms. Develop response templates for common questions and crisis situations. Use social listening tools to monitor brand mentions and sentiment."
            },
            {
              title: "User-Generated Content Campaigns",
              content: "Design and execute UGC campaigns that encourage community participation. Learn to create hashtag challenges, photo contests, and testimonial campaigns. Understand legal considerations, content rights, and compensation strategies. Develop systems for discovering, curating, and amplifying user-generated content."
            },
            {
              title: "Crisis Management & Moderation",
              content: "Handle social media crises professionally and efficiently. Develop crisis communication protocols, response templates, and escalation procedures. Learn content moderation best practices, community guidelines enforcement, and when to involve legal or PR teams. Practice transparency and authenticity in all communications."
            }
          ]
        }
      },
      {
        id: 5,
        title: "Paid Social Media Advertising",
        description: "Master social media advertising including campaign setup, audience targeting, ad creative optimization, and performance measurement.",
        category: "advertising",
        difficulty: "advanced",
        estimated_time: 90,
        order_index: 5,
        is_required: false,
        prerequisites: [1, 2, 3],
        content: {
          sections: [
            {
              title: "Campaign Strategy & Setup",
              content: "Develop comprehensive paid social media strategies aligned with business objectives. Learn campaign structure, budget allocation, and bidding strategies. Master platform-specific ad formats: Facebook/Instagram ads, LinkedIn sponsored content, Twitter promoted tweets, and TikTok ads. Understand campaign optimization and scaling strategies."
            },
            {
              title: "Audience Targeting & Segmentation",
              content: "Master advanced audience targeting techniques including custom audiences, lookalike audiences, and interest-based targeting. Learn demographic, behavioral, and psychographic segmentation strategies. Understand retargeting campaigns, cross-platform audience building, and audience research tools. Develop data-driven targeting strategies."
            },
            {
              title: "Ad Creative & Copy Optimization",
              content: "Create high-performing ad creative that drives conversions. Learn A/B testing methodologies, creative best practices, and platform-specific requirements. Master ad copywriting, visual design for ads, and call-to-action optimization. Understand creative fatigue and when to refresh ad creative."
            },
            {
              title: "Performance Measurement & Optimization",
              content: "Track and optimize campaign performance using platform analytics and third-party tools. Learn key metrics: CTR, CPC, CPM, conversion rate, and ROAS. Master campaign optimization techniques, budget management, and scaling strategies. Develop reporting frameworks and optimization workflows."
            }
          ]
        }
      },
      {
        id: 6,
        title: "Analytics & Performance Measurement",
        description: "Learn to measure, analyze, and optimize social media performance using data-driven insights and reporting frameworks.",
        category: "analytics",
        difficulty: "advanced",
        estimated_time: 75,
        order_index: 6,
        is_required: true,
        prerequisites: [1, 2, 3],
        content: {
          sections: [
            {
              title: "Social Media Analytics Fundamentals",
              content: "Understand key social media metrics and their business impact. Learn to track engagement rate, reach, impressions, clicks, and conversions. Master platform-specific analytics: Instagram Insights, Facebook Page Insights, LinkedIn Analytics, and Twitter Analytics. Develop custom reporting dashboards and KPI tracking systems."
            },
            {
              title: "Data Analysis & Insights",
              content: "Transform raw data into actionable insights for strategy optimization. Learn data visualization techniques, trend analysis, and competitive benchmarking. Master social listening tools for sentiment analysis and brand monitoring. Develop reporting frameworks that communicate value to stakeholders and drive strategic decisions."
            },
            {
              title: "ROI Measurement & Attribution",
              content: "Measure the return on investment for social media activities. Learn attribution modeling, conversion tracking, and revenue attribution. Master tools like Google Analytics, Facebook Pixel, and platform conversion tracking. Develop frameworks for calculating social media ROI and communicating value to business stakeholders."
            },
            {
              title: "Performance Optimization",
              content: "Use data insights to continuously optimize social media performance. Learn A/B testing methodologies, content optimization strategies, and audience refinement techniques. Master performance benchmarking, competitive analysis, and industry best practices. Develop optimization workflows and continuous improvement processes."
            }
          ]
        }
      },
      {
        id: 7,
        title: "Influencer Marketing & Partnerships",
        description: "Develop strategic influencer partnerships, manage campaigns, and measure the impact of influencer collaborations on brand awareness and conversions.",
        category: "influencer-marketing",
        difficulty: "advanced",
        estimated_time: 60,
        order_index: 7,
        is_required: false,
        prerequisites: [1, 2, 4],
        content: {
          sections: [
            {
              title: "Influencer Strategy & Selection",
              content: "Develop comprehensive influencer marketing strategies aligned with brand objectives. Learn to identify relevant influencers using tools like BuzzSumo, Upfluence, and platform analytics. Master influencer vetting processes, authenticity verification, and audience quality assessment. Understand different influencer tiers and partnership models."
            },
            {
              title: "Campaign Management & Execution",
              content: "Manage end-to-end influencer campaigns from brief development to performance measurement. Learn to create compelling briefs, negotiate partnerships, and manage campaign timelines. Master content approval processes, brand safety measures, and legal compliance requirements. Develop systems for campaign tracking and performance monitoring."
            },
            {
              title: "Partnership Development & Relationship Building",
              content: "Build long-term relationships with influencers and content creators. Learn partnership negotiation, contract development, and relationship management strategies. Master influencer activation programs, ambassador programs, and ongoing collaboration frameworks. Understand compensation models and value exchange strategies."
            },
            {
              title: "Performance Measurement & Optimization",
              content: "Measure the impact of influencer campaigns on brand awareness, engagement, and conversions. Learn to track influencer-specific metrics, attribution modeling, and ROI calculation. Master campaign optimization techniques, influencer performance analysis, and partnership scaling strategies. Develop reporting frameworks for influencer marketing success."
            }
          ]
        }
      },
      {
        id: 8,
        title: "Social Media Crisis Management",
        description: "Handle social media crises professionally, develop crisis communication protocols, and protect brand reputation during challenging situations.",
        category: "crisis-management",
        difficulty: "advanced",
        estimated_time: 45,
        order_index: 8,
        is_required: false,
        prerequisites: [1, 4, 6],
        content: {
          sections: [
            {
              title: "Crisis Prevention & Preparedness",
              content: "Develop proactive crisis prevention strategies and preparedness protocols. Learn risk assessment, monitoring systems, and early warning indicators. Master crisis communication planning, spokesperson training, and escalation procedures. Create crisis response playbooks and communication templates for various scenarios."
            },
            {
              title: "Crisis Response & Communication",
              content: "Execute crisis response strategies with speed, transparency, and authenticity. Learn crisis communication principles, response timing, and messaging strategies. Master stakeholder communication, media relations, and community management during crises. Develop systems for coordinated response across all channels and stakeholders."
            },
            {
              title: "Reputation Management & Recovery",
              content: "Manage brand reputation during and after crisis situations. Learn reputation monitoring, sentiment analysis, and recovery strategies. Master post-crisis communication, stakeholder rebuilding, and long-term reputation management. Develop frameworks for learning from crises and improving future response capabilities."
            },
            {
              title: "Legal & Compliance Considerations",
              content: "Navigate legal and compliance requirements during social media crises. Learn defamation laws, privacy regulations, and platform terms of service. Master legal consultation processes, documentation requirements, and regulatory compliance. Understand when to involve legal counsel and how to protect the organization legally."
            }
          ]
        }
      },
      {
        id: 9,
        title: "Social Media Tools & Technology",
        description: "Master essential social media tools for content creation, scheduling, analytics, and team collaboration to streamline workflows and improve efficiency.",
        category: "tools",
        difficulty: "intermediate",
        estimated_time: 60,
        order_index: 9,
        is_required: false,
        prerequisites: [1, 2],
        content: {
          sections: [
            {
              title: "Content Creation & Design Tools",
              content: "Master essential tools for social media content creation. Learn Canva for graphic design, CapCut for video editing, and Adobe Creative Suite for professional design work. Understand tool integrations, workflow optimization, and team collaboration features. Develop efficient content creation processes and asset management systems."
            },
            {
              title: "Scheduling & Publishing Platforms",
              content: "Optimize content scheduling and publishing workflows using tools like Later, Buffer, Hootsuite, and Sprout Social. Learn content calendar management, cross-platform publishing, and automation strategies. Master scheduling algorithms, optimal posting times, and platform-specific publishing features. Develop content approval workflows and team collaboration processes."
            },
            {
              title: "Analytics & Monitoring Tools",
              content: "Leverage advanced analytics and monitoring tools for comprehensive social media insights. Learn Google Analytics, Facebook Business Suite, and third-party analytics platforms. Master social listening tools, sentiment analysis, and competitive monitoring. Develop custom reporting dashboards and automated monitoring systems."
            },
            {
              title: "Team Collaboration & Workflow Management",
              content: "Streamline team collaboration and workflow management using project management tools. Learn ClickUp, Asana, or Monday.com for task management and team coordination. Master approval workflows, content calendars, and team communication systems. Develop efficient processes for content creation, review, and publishing."
            }
          ]
        }
      },
      {
        id: 10,
        title: "Emerging Trends & Future of Social Media",
        description: "Stay ahead of the curve by understanding emerging social media trends, new platforms, and future developments in digital marketing.",
        category: "trends",
        difficulty: "advanced",
        estimated_time: 45,
        order_index: 10,
        is_required: false,
        prerequisites: [1, 2, 3],
        content: {
          sections: [
            {
              title: "Emerging Platforms & Features",
              content: "Stay current with new social media platforms and emerging features. Learn about emerging platforms like BeReal, Lemon8, and new features on existing platforms. Understand platform adoption strategies, early adopter advantages, and risk assessment for new platforms. Develop frameworks for evaluating and testing new social media opportunities."
            },
            {
              title: "Technology Trends & Innovations",
              content: "Understand emerging technologies shaping social media marketing. Learn about AI-powered content creation, augmented reality, virtual reality, and blockchain applications. Master automation tools, chatbots, and AI-driven optimization strategies. Stay informed about privacy changes, algorithm updates, and platform policy developments."
            },
            {
              title: "Content Format Evolution",
              content: "Adapt to evolving content formats and consumption patterns. Learn about short-form video trends, interactive content, and immersive experiences. Understand content personalization, dynamic content, and adaptive storytelling techniques. Master emerging content formats and platform-specific content innovations."
            },
            {
              title: "Future Strategy Development",
              content: "Develop forward-thinking social media strategies that anticipate future trends. Learn scenario planning, trend forecasting, and adaptive strategy development. Master innovation frameworks, experimentation methodologies, and continuous learning approaches. Develop systems for staying current with industry developments and adapting strategies accordingly."
            }
          ]
        }
      },

      // =========================
      // Admin Portal Build Track
      // =========================
      {
        id: 101,
        title: "Admin Track Overview — Building This Portal",
        description: "Understand the architecture of this portal and the milestones to build it end-to-end.",
        category: "admin-portal",
        difficulty: "beginner",
        estimated_time: 25,
        order_index: 11,
        is_required: true,
        prerequisites: [],
        content: {
          sections: [
            {
              title: "High-Level Architecture",
              content: "This portal uses a modern React stack: Vite for fast development, Firebase for backend services (Auth + Firestore), and Vercel for deployment. The architecture follows a service-oriented pattern with clear separation of concerns. Key services include firestoreService (data operations) and remoteConfigService (dynamic config). State management uses React Context (AuthContext, PendingUsersContext) for global state and local useState for component state. The routing system is role-based, with ProtectedRoute components ensuring users only access authorized pages."
            },
            {
              title: "Data Domains & Collections",
              content: "Firestore collections are designed for specific use cases: approved_users (doc id = email) for authenticated users, pending_users (auto-generated ids) for approval workflow, tasks for daily assignments, and system_config for dynamic settings. Critical design principle: never persist internal 'id' fields to Firestore - always use doc.id for operations. Separate read/write flows for pending vs approved users to maintain data integrity and security."
            },
            {
              title: "Critical UX Patterns",
              content: "Multi-role profile switching allows users to access different dashboards while preserving identity. Admin dashboard shows real-time stats (total users, pending approvals, system uptime). User management provides approve/reject workflows with immediate UI updates. Tutorials and tasks provide structured learning and task management experiences. All interactions use optimistic UI updates for better perceived performance."
            },
            {
              title: "Development Milestones",
              content: "1) Project Setup: Scaffold React app, install dependencies, establish UI components and routing. 2) Firebase Integration: Configure Auth, Firestore, and security rules. 3) Authentication & RBAC: Implement Google Auth, approval workflows, and role-based access control. 4) User Management: Build admin interfaces for user approval and role assignment. 5) Realtime Features: Implement Firestore listeners with proper cleanup and state management. 6) Deployment & Config: Deploy to Vercel and implement Remote Config for dynamic settings."
            }
          ]
        }
      },
      {
        id: 102,
        title: "Project Setup & UI Foundation",
        description: "Initialize the app, establish UI components, routing, and code organization.",
        category: "admin-portal",
        difficulty: "beginner",
        estimated_time: 40,
        order_index: 12,
        is_required: true,
        prerequisites: [101],
        content: {
          sections: [
            {
              title: "Project Initialization with AI",
              content: "Start by asking AI to 'Create a React admin portal with role-based access control, user management, and analytics dashboard.' Specify requirements: Vite for fast development, Tailwind CSS for styling, Lucide React for icons, React Router for navigation. AI will scaffold the project structure with proper folder organization: src/components/ui for reusable components, src/pages for route components, src/services for API calls, src/contexts for state management, and src/entities for data models. Install dependencies: npm install react-router-dom lucide-react date-fns @headlessui/react."
            },
            {
              title: "UI Component System",
              content: "Ask AI to 'Create a design system with Button, Card, Badge, and Input components using Tailwind CSS.' Specify variants: primary/secondary buttons, different card layouts, colored badges for status/roles. AI will create src/components/ui/ with consistent styling and proper TypeScript interfaces. Include accessibility features: proper ARIA labels, keyboard navigation, and focus management. Use a consistent color palette and spacing system throughout the application."
            },
            {
              title: "Routing Architecture",
              content: "Request AI to 'Set up role-based routing with protected routes and navigation.' Create App.jsx with BrowserRouter, define routes for each role (admin, content_director, hr_manager, etc.), and implement ProtectedRoute component that checks user authentication and role permissions. Build AppLayout component with responsive navigation, role switcher, and main content area. Use useLocation hook for active navigation highlighting and breadcrumb generation."
            },
            {
              title: "Code Organization & Patterns",
              content: "Establish clear patterns: services for external API calls (firestoreService), contexts for global state (AuthContext, PendingUsersContext), pages for route components, and entities for data models. Use consistent naming conventions: camelCase for variables, PascalCase for components, kebab-case for files. Implement proper error boundaries, loading states, and error handling throughout the application. Document component APIs and service interfaces for maintainability."
            }
          ]
        }
      },
      {
        id: 103,
        title: "Firebase & Firestore Setup",
        description: "Connect Firebase, create Firestore collections, and prepare secure data flows.",
        category: "admin-portal",
        difficulty: "beginner",
        estimated_time: 45,
        order_index: 13,
        is_required: true,
        prerequisites: [102],
        content: {
          sections: [
            {
              title: "Firebase Project Setup with AI",
              content: "Ask AI to 'Help me set up Firebase for a React admin portal with authentication and Firestore database.' AI will guide you through: 1) Creating a Firebase project in the console, 2) Adding a web app and getting the config object, 3) Enabling Authentication (Google provider) and Firestore Database, 4) Setting up security rules. Create src/firebase.js with the config and export auth, db, and other Firebase services. AI will provide the exact configuration code and security rules for your use case."
            },
            {
              title: "Firestore Collections Design",
              content: "Request AI to 'Design Firestore collections for user management with approval workflow.' AI will suggest: approved_users (doc id = user email) for authenticated users, pending_users (auto-generated ids) for approval queue, tasks for daily assignments, and system_config for dynamic settings. AI will provide the exact collection structure with proper field types and indexing recommendations. Include validation rules and data integrity constraints."
            },
            {
              title: "Critical ID Management",
              content: "Ask AI to 'Help me implement proper Firestore document ID management to avoid conflicts.' Key principle: never persist internal 'id' fields to Firestore documents. Always use the actual Firestore document ID (doc.id) for operations. When reading documents, strip any internal 'id' field from the data before processing. When writing documents, ensure no 'id' field is included in the payload. AI will provide code examples for proper ID handling in CRUD operations."
            },
            {
              title: "Service Layer Implementation",
              content: "Request AI to 'Create a firestoreService with CRUD operations and real-time listeners.' AI will build src/services/firestoreService.js with methods for get/add/update/delete operations, onSnapshot listeners for real-time updates, and proper error handling. Include methods for user management (approveUser, rejectUser), role assignment, and data validation. AI will provide TypeScript interfaces and proper error handling patterns for production use."
            }
          ]
        }
      },
      {
        id: 104,
        title: "Authentication & RBAC",
        description: "Implement Google Auth, approval gate, and multi-role access with a role switcher.",
        category: "admin-portal",
        difficulty: "intermediate",
        estimated_time: 60,
        order_index: 14,
        is_required: true,
        prerequisites: [103],
        content: {
          sections: [
            {
              title: "Authentication Flow with AI",
              content: "Ask AI to 'Implement Firebase Google authentication with user approval workflow.' AI will create: 1) AuthContext for global auth state management, 2) Login component with Google sign-in, 3) User approval logic (first-time users go to pending queue), 4) ProtectedRoute component for role-based access. AI will provide the exact code for handling authentication state, user profile merging, and automatic navigation based on user role. Include proper error handling for auth failures and loading states."
            },
            {
              title: "User Approval & Role Management",
              content: "Request AI to 'Build a user approval system with multi-role assignment.' AI will design: 1) PendingUsersContext for managing approval queue, 2) Admin interface for approving/rejecting users, 3) Role assignment modal with multiple role selection, 4) Data structure for storing roles array and primaryRole. AI will provide code for the approval workflow, role assignment UI, and data validation. Include proper state management for optimistic updates and error handling."
            },
            {
              title: "Role-Based Access Control",
              content: "Ask AI to 'Implement role-based routing and access control.' AI will create: 1) USER_ROLES constants and ROLE_PERMISSIONS mapping, 2) ProtectedRoute component that checks authentication and role permissions, 3) Navigation filtering based on user role, 4) Permission checking utilities. AI will provide the exact routing logic, permission checking functions, and navigation filtering code. Include proper fallbacks for unauthorized access and role-based UI rendering."
            },
            {
              title: "Multi-Role Profile Switching",
              content: "Request AI to 'Create a role switcher component for users with multiple roles.' AI will build: 1) RoleSwitcher component with dropdown interface, 2) Role switching logic that preserves user identity, 3) Dynamic navigation updates based on selected role, 4) Visual indicators for current role and available roles. AI will provide the complete component with proper state management, role validation, and UI feedback. Include accessibility features and proper keyboard navigation."
            }
          ]
        }
      },
      {
        id: 105,
        title: "User Management (Approve/Reject, Multi-Role)",
        description: "Build the admin User Management page: approve/reject, assign multiple roles, and keep Firestore consistent.",
        category: "admin-portal",
        difficulty: "intermediate",
        estimated_time: 60,
        order_index: 15,
        is_required: true,
        prerequisites: [104],
        content: {
          sections: [
            {
              title: "User Management Interface with AI",
              content: "Ask AI to 'Create an admin user management page for approving and rejecting users.' AI will build: 1) UserManagement component with pending users list, 2) Approve/Reject buttons with confirmation dialogs, 3) User details display (email, name, signup date), 4) Real-time updates using Firestore listeners. AI will provide the complete UI with proper loading states, error handling, and success feedback. Include pagination for large user lists and search/filter functionality."
            },
            {
              title: "Critical ID Management in Operations",
              content: "Request AI to 'Help me fix Firestore ID conflicts in user management operations.' AI will identify the common pitfall: using internal 'id' fields instead of Firestore document IDs. AI will provide code for: 1) Proper document reading (strip internal 'id' fields), 2) Correct delete operations (use doc.id), 3) Update operations (avoid ID field conflicts), 4) Data validation before writes. AI will show debugging techniques and error handling for ID-related issues."
            },
            {
              title: "Multi-Role Assignment System",
              content: "Ask AI to 'Build a role assignment modal for assigning multiple roles to users.' AI will create: 1) RoleAssignmentModal component with role selection interface, 2) Checkbox list for multiple role selection, 3) Primary role designation (radio button), 4) Role validation and conflict resolution. AI will provide the complete modal with proper form handling, validation, and submission logic. Include role descriptions, permission previews, and confirmation dialogs."
            },
            {
              title: "State Management & Real-time Updates",
              content: "Request AI to 'Implement stable real-time updates for user management with proper state handling.' AI will design: 1) Local state updates for immediate UI feedback, 2) Firestore listener management with proper cleanup, 3) Optimistic updates for better UX, 4) Conflict resolution between local and server state. AI will provide code for managing listener subscriptions, preventing infinite loops, and handling concurrent updates. Include proper error recovery and state synchronization."
            }
          ]
        }
      },
      {
        id: 106,
        title: "Analytics",
        description: "Analytics page placeholder. Google Analytics has been removed from this site.",
        category: "admin-portal",
        difficulty: "beginner",
        estimated_time: 5,
        order_index: 16,
        is_required: false,
        prerequisites: [105],
        content: {
          sections: [
            {
              title: "Analytics Dashboard",
              content: "The Analytics page is a placeholder. Google Analytics has been removed from this site. Use internal tools or other analytics providers if you need usage data."
            }
          ]
        }
      },
      {
        id: 107,
        title: "Realtime Listeners & State Management",
        description: "Design stable realtime flows with Firestore listeners, debouncing, and optimistic updates.",
        category: "admin-portal",
        difficulty: "intermediate",
        estimated_time: 50,
        order_index: 17,
        is_required: false,
        prerequisites: [105],
        content: {
          sections: [
            {
              title: "Real-time Architecture with AI",
              content: "Ask AI to 'Help me design a real-time architecture using Firestore listeners with proper state management.' AI will explain when to use onSnapshot listeners: 1) For data that must auto-refresh (user counts, pending approvals), 2) For collaborative features, 3) For live updates. AI will provide patterns for: listener lifecycle management, proper cleanup, and avoiding feedback loops. AI will show how to structure listeners to minimize unnecessary re-renders and optimize performance."
            },
            {
              title: "Infinite Loop Prevention",
              content: "Request AI to 'Help me fix infinite loops in React components with Firestore listeners.' AI will identify common causes: 1) useEffect dependencies that change on every render, 2) Re-attaching listeners when array lengths change, 3) State updates that trigger re-renders and re-attach listeners. AI will provide solutions: proper dependency arrays, useCallback for stable references, and immutable state updates. AI will show debugging techniques and prevention strategies."
            },
            {
              title: "Optimistic UI Updates",
              content: "Ask AI to 'Implement optimistic UI updates for better user experience.' AI will design patterns for: 1) Immediate local state updates for user actions, 2) Background server synchronization, 3) Conflict resolution between local and server state, 4) Error handling and rollback strategies. AI will provide code examples for optimistic updates in user management, task completion, and other interactive features. Include proper error recovery and state reconciliation."
            },
            {
              title: "Debugging & Diagnostics",
              content: "Request AI to 'Help me implement proper debugging and diagnostics for real-time features.' AI will provide: 1) Structured logging with stack traces and context, 2) Performance monitoring for listener efficiency, 3) Error boundary implementation for graceful failures, 4) Development tools for state inspection. AI will show how to instrument components for debugging, track listener performance, and identify bottlenecks. Include production-ready logging and monitoring strategies."
            }
          ]
        }
      },
      {
        id: 108,
        title: "Deployment, Remote Config, and Environments",
        description: "Ship with Vercel (Git-based), manage environment config, and use Remote Config for live settings.",
        category: "admin-portal",
        difficulty: "intermediate",
        estimated_time: 45,
        order_index: 18,
        is_required: false,
        prerequisites: [106],
        content: {
          sections: [
            {
              title: "Deployment Strategy with AI",
              content: "Ask AI to 'Help me set up Git-based deployment with Vercel for continuous integration.' AI will guide you through: 1) Connecting your Git repository to Vercel, 2) Setting up automatic deployments on push, 3) Configuring environment variables and build settings, 4) Setting up preview deployments for pull requests. AI will provide the exact configuration, deployment scripts, and best practices for production deployments. Include rollback strategies and deployment monitoring."
            },
            {
              title: "Remote Config Implementation",
              content: "Request AI to 'Help me implement Firebase Remote Config for dynamic application settings.' AI will create: 1) Remote Config initialization and setup, 2) Default configuration values, 3) Dynamic value fetching and caching, 4) Real-time configuration updates. AI will provide the complete implementation for managing dynamic settings like system uptime, feature flags, and configuration parameters. Include proper error handling, fallback values, and configuration validation."
            },
            {
              title: "Security & Secrets Management",
              content: "Ask AI to 'Help me implement secure secrets management for production deployment.' AI will provide: 1) Environment variable configuration for sensitive data, 2) Secure storage of API keys and credentials, 3) Key rotation strategies and procedures, 4) Security best practices for credential management. AI will show how to properly handle secrets in Vercel, avoid committing sensitive data to Git, and implement secure credential storage patterns."
            },
            {
              title: "Monitoring & Observability",
              content: "Request AI to 'Help me implement monitoring and observability for the admin portal.' AI will design: 1) Structured logging throughout the application, 2) Error tracking and alerting systems, 3) Performance monitoring and metrics collection, 4) Health checks and uptime monitoring. AI will provide implementation for error boundaries, performance monitoring, and diagnostic tools. Include production-ready logging strategies and monitoring dashboards."
            }
          ]
        }
      }
    ];

    // Apply role-based filtering
    let filteredTutorials = [...mockTutorials];
    
    if (userRole === 'admin') {
      // Admin users only see admin-portal tutorials
      filteredTutorials = mockTutorials.filter(tutorial => tutorial.category === 'admin-portal');
    } else {
      // Non-admin users see all tutorials EXCEPT admin-portal
      filteredTutorials = mockTutorials.filter(tutorial => tutorial.category !== 'admin-portal');
    }
    
    // Apply sorting
    let sortedTutorials = [...filteredTutorials];
    
    if (sortBy === 'order_index') {
      sortedTutorials.sort((a, b) => a.order_index - b.order_index);
    } else if (sortBy === 'difficulty') {
      const difficultyOrder = { beginner: 1, intermediate: 2, advanced: 3 };
      sortedTutorials.sort((a, b) => difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]);
    }

    return sortedTutorials.map(tutorial => new Tutorial(tutorial));
  }

  static async findById(id) {
    const tutorials = await this.list();
    return tutorials.find(t => t.id === id);
  }
}
