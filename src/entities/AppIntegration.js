export class AppIntegration {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.category = data.category;
    this.priority = data.priority;
    this.status = data.status;
    this.icon = data.icon;
    this.url = data.url;
    this.last_sync = data.last_sync;
    this.setup_required = data.setup_required;
    this.configuration = data.configuration;
  }

  get priorityColor() {
    const colors = {
      critical: 'bg-red-100 text-red-800 border-red-200',
      important: 'bg-orange-100 text-orange-800 border-orange-200',
      optional: 'bg-gray-100 text-gray-600 border-gray-200'
    };
    return colors[this.priority] || colors.optional;
  }

  get statusColor() {
    const colors = {
      active: 'bg-green-100 text-green-800 border-green-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      inactive: 'bg-gray-100 text-gray-600 border-gray-200',
      error: 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[this.status] || colors.inactive;
  }

  get isCritical() {
    return this.priority === 'critical';
  }

  get isActive() {
    return this.status === 'active';
  }

  get lastSyncFormatted() {
    if (!this.last_sync) return 'Never';
    const date = new Date(this.last_sync);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  }

  static async list(sortBy = 'priority') {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Mock data for luxury real estate content tools
    const mockIntegrations = [
      {
        id: 1,
        name: "ClickUp",
        description: "Project management and task tracking for content pipeline and team collaboration",
        category: "productivity",
        priority: "critical",
        status: "active",
        icon: "📋",
        url: "https://clickup.com",
        last_sync: new Date().toISOString(),
        setup_required: false,
        configuration: {
          workspace: "Luxury Real Estate Content",
          projects: ["Content Calendar", "Post Production", "Analytics Review"],
          team_members: ["Sarah Mitchell", "Pankaj Sharma", "Emma Rodriguez"]
        }
      },
      {
        id: 2,
        name: "Later.com",
        description: "Social media scheduling and content calendar management for Instagram, Facebook, and Twitter",
        category: "social-media",
        priority: "critical",
        status: "active",
        icon: "📅",
        url: "https://later.com",
        last_sync: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        setup_required: false,
        configuration: {
          accounts: ["@luxury_listings", "@IG_Mansions", "@IG_Interiors"],
          scheduled_posts: 12,
          next_post: "Tomorrow at 9:00 AM"
        }
      },
      {
        id: 3,
        name: "Air.inc",
        description: "AI-powered image enhancement and visual content optimization for luxury properties",
        category: "design",
        priority: "important",
        status: "active",
        icon: "🎨",
        url: "https://air.inc",
        last_sync: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
        setup_required: false,
        configuration: {
          ai_models: ["Luxury Real Estate", "Interior Design", "Architecture"],
          enhanced_images: 45,
          processing_queue: 3
        }
      },
      {
        id: 4,
        name: "Slack",
        description: "Team communication and content approval workflows for real-time collaboration",
        category: "communication",
        priority: "important",
        status: "active",
        icon: "💬",
        url: "https://slack.com",
        last_sync: new Date().toISOString(),
        setup_required: false,
        configuration: {
          workspace: "Luxury Real Estate Content",
          channels: ["#content-approval", "#design-requests", "#analytics", "#general"],
          team_members: 8,
          recent_activity: "High"
        }
      },
      {
        id: 5,
        name: "Google Sheets",
        description: "Content performance tracking, competitor analysis, and editorial calendar management",
        category: "analytics",
        priority: "important",
        status: "active",
        icon: "📊",
        url: "https://sheets.google.com",
        last_sync: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
        setup_required: false,
        configuration: {
          spreadsheets: ["Content Performance", "Competitor Analysis", "Editorial Calendar", "Fact-Check Log"],
          shared_with: ["Content Team", "Marketing Team"],
          last_updated: "1 hour ago"
        }
      },
      {
        id: 6,
        name: "Canva",
        description: "Visual content creation and template management for luxury real estate posts",
        category: "design",
        priority: "important",
        status: "active",
        icon: "🎭",
        url: "https://canva.com",
        last_sync: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
        setup_required: false,
        configuration: {
          brand_kit: "Luxury Real Estate",
          templates: 25,
          team_members: 5
        }
      },
      {
        id: 7,
        name: "CapCut",
        description: "Video editing and short-form content creation for luxury property showcases",
        category: "design",
        priority: "optional",
        status: "active",
        icon: "🎬",
        url: "https://capcut.com",
        last_sync: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
        setup_required: false,
        configuration: {
          projects: 8,
          templates: 12,
          export_formats: ["MP4", "MOV", "GIF"]
        }
      },
      {
        id: 8,
        name: "Meta Business Suite",
        description: "Cross-platform analytics, ad management, and content performance insights",
        category: "analytics",
        priority: "important",
        status: "active",
        icon: "📈",
        url: "https://business.facebook.com",
        last_sync: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
        setup_required: false,
        configuration: {
          connected_accounts: ["@luxury_listings", "@IG_Mansions", "@IG_Interiors"],
          ad_accounts: 2,
          insights_available: true
        }
      }
    ];

    // Apply sorting
    let sortedIntegrations = [...mockIntegrations];
    
    if (sortBy === 'priority') {
      const priorityOrder = { critical: 3, important: 2, optional: 1 };
      sortedIntegrations.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
    } else if (sortBy === 'name') {
      sortedIntegrations.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'category') {
      sortedIntegrations.sort((a, b) => a.category.localeCompare(b.category));
    }

    return sortedIntegrations.map(integration => new AppIntegration(integration));
  }

  static async filter(filters = {}) {
    const allIntegrations = await this.list();
    
    let filtered = allIntegrations;
    
    if (filters.category && filters.category !== 'all') {
      filtered = filtered.filter(integration => integration.category === filters.category);
    }
    
    if (filters.priority && filters.priority !== 'all') {
      filtered = filtered.filter(integration => integration.priority === filters.priority);
    }
    
    if (filters.status) {
      filtered = filtered.filter(integration => integration.status === filters.status);
    }

    return filtered;
  }

  static async update(id, updates) {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // In a real app, this would update the database
    // For now, we'll just return success
    return { success: true, id };
  }
}
