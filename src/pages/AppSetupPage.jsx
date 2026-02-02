import React, { useState, useEffect } from "react";
import { User } from "../entities/User";
import { AppIntegration } from "../entities/index";
import { 
  Settings, 
  ExternalLink, 
  Clock, 
  CheckCircle2,
  AlertTriangle,
  Info,
  Zap,
  Layers,
  Palette,
  MessageCircle,
  BarChart3,
  ChevronDown,
  ChevronUp
} from "lucide-react";

const categoryIcons = {
  "social-media": Layers,
  "productivity": Zap,
  "design": Palette,
  "communication": MessageCircle,
  "analytics": BarChart3
};

const categoryLabels = {
  "social-media": "Social Media",
  "productivity": "Productivity",
  "design": "Design & Creative",
  "communication": "Communication",
  "analytics": "Analytics & Data"
};

const priorityLabels = {
  "critical": "Critical",
  "important": "Important",
  "optional": "Optional"
};

export default function AppSetupPage() {
  const [user, setUser] = useState(null);
  const [integrations, setIntegrations] = useState([]);
  const [filteredIntegrations, setFilteredIntegrations] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterIntegrations();
  }, [integrations, activeFilter]);

  const loadData = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);
      const integrationsData = await AppIntegration.list('priority');
      setIntegrations(integrationsData);
    } catch (error) {
      console.error("Error loading integrations:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterIntegrations = () => {
    let filtered = [...integrations];
    if (activeFilter !== "all") {
      if (activeFilter === "critical") {
        filtered = integrations.filter(app => app.priority === "critical");
      } else {
        filtered = integrations.filter(app => app.category === activeFilter);
      }
    }
    const priorityOrder = { critical: 3, important: 2, optional: 1 };
    filtered.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
    setFilteredIntegrations(filtered);
  };

  const getIntegrationCounts = () => {
    const categories = [...new Set(integrations.map(app => app.category))];
    const counts = {};
    counts.all = integrations.length;
    counts.critical = integrations.filter(app => app.priority === "critical").length;
    categories.forEach(category => {
      counts[category] = integrations.filter(app => app.category === category).length;
    });
    return counts;
  };

  const counts = getIntegrationCounts();

  const filters = [
    { value: "all", label: "All Tools", count: counts.all },
    { value: "critical", label: "Critical", count: counts.critical },
    { value: "social-media", label: "Social Media", count: counts["social-media"] || 0 },
    { value: "productivity", label: "Productivity", count: counts.productivity || 0 },
    { value: "design", label: "Design", count: counts.design || 0 },
    { value: "communication", label: "Communication", count: counts.communication || 0 },
    { value: "analytics", label: "Analytics", count: counts.analytics || 0 }
  ];

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 bg-black/5 dark:bg-white/10 rounded-xl animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-black/5 dark:bg-white/10 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-[28px] sm:text-[34px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em]">Programs</h1>
        <p className="text-[15px] text-[#86868b] mt-1">Get connected to all the tools you'll need for luxury real estate content excellence</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-2xl bg-[#0071e3]/10 dark:bg-[#0071e3]/20 p-4">
          <p className="text-[28px] font-semibold text-[#0071e3]">{counts.all}</p>
          <p className="text-[12px] font-medium text-[#0071e3]/80">Total Tools</p>
        </div>
        <div className="rounded-2xl bg-[#ff3b30]/10 dark:bg-[#ff3b30]/20 p-4">
          <p className="text-[28px] font-semibold text-[#ff3b30]">{counts.critical}</p>
          <p className="text-[12px] font-medium text-[#ff3b30]/80">Critical Tools</p>
        </div>
        <div className="rounded-2xl bg-[#34c759]/10 dark:bg-[#34c759]/20 p-4">
          <p className="text-[28px] font-semibold text-[#34c759]">
            {integrations.filter(app => app.status === 'active').length}
          </p>
          <p className="text-[12px] font-medium text-[#34c759]/80">Active Tools</p>
        </div>
        <div className="rounded-2xl bg-[#af52de]/10 dark:bg-[#af52de]/20 p-4">
          <p className="text-[28px] font-semibold text-[#af52de]">
            {integrations.filter(app => app.setup_required).length}
          </p>
          <p className="text-[12px] font-medium text-[#af52de]/80">Setup Required</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setActiveFilter(filter.value)}
            className={`px-4 py-2 rounded-xl text-[13px] font-medium transition-all ${
              activeFilter === filter.value
                ? 'bg-[#0071e3] text-white'
                : 'bg-black/5 dark:bg-white/10 text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'
            }`}
          >
            {filter.label} ({filter.count})
          </button>
        ))}
      </div>

      {/* Integration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredIntegrations.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <div className="w-16 h-16 bg-black/5 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Settings className="w-8 h-8 text-[#86868b]" />
            </div>
            <p className="text-[15px] font-medium text-[#1d1d1f] dark:text-white">No integrations found for this filter</p>
            <p className="text-[13px] text-[#86868b]">Try selecting a different category</p>
          </div>
        ) : (
          filteredIntegrations.map((integration) => (
            <AppCard key={integration.id} integration={integration} />
          ))
        )}
      </div>

      {/* Setup Guide */}
      <div className="rounded-2xl bg-gradient-to-br from-[#0071e3] to-[#5856d6] p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
            <Settings className="w-5 h-5" />
          </div>
          <h3 className="text-[17px] font-semibold">Content Toolbox Setup Guide</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-[14px] font-semibold mb-3 text-white/90">Critical Tools (Setup First)</h4>
            <ul className="space-y-2 text-[13px] text-white/80">
              <li className="flex items-start gap-2">
                <span className="text-white/60">•</span>
                <span><strong className="text-white">ClickUp:</strong> Project management and task tracking</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-white/60">•</span>
                <span><strong className="text-white">Later.com:</strong> Social media scheduling and calendar</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-white/60">•</span>
                <span><strong className="text-white">Slack:</strong> Team communication and approvals</span>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-[14px] font-semibold mb-3 text-white/90">Important Tools (Setup Second)</h4>
            <ul className="space-y-2 text-[13px] text-white/80">
              <li className="flex items-start gap-2">
                <span className="text-white/60">•</span>
                <span><strong className="text-white">Air.inc:</strong> AI image enhancement</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-white/60">•</span>
                <span><strong className="text-white">Google Sheets:</strong> Performance tracking</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-white/60">•</span>
                <span><strong className="text-white">Canva:</strong> Visual content creation</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-6 pt-5 border-t border-white/20">
          <p className="text-[13px] text-white/80">
            <strong className="text-white">Pro Tip:</strong> Start with the critical tools to establish your workflow, then add the design and analytics tools as you become comfortable with the basics.
          </p>
        </div>
      </div>
    </div>
  );
}

function AppCard({ integration }) {
  const [showDetails, setShowDetails] = useState(false);
  const CategoryIcon = categoryIcons[integration.category] || Settings;

  const getStatusStyles = (status) => {
    switch (status) {
      case 'active':
        return { icon: CheckCircle2, color: 'text-[#34c759]', bg: 'bg-[#34c759]/10' };
      case 'pending':
        return { icon: Clock, color: 'text-[#ff9500]', bg: 'bg-[#ff9500]/10' };
      case 'error':
        return { icon: AlertTriangle, color: 'text-[#ff3b30]', bg: 'bg-[#ff3b30]/10' };
      default:
        return { icon: Info, color: 'text-[#86868b]', bg: 'bg-black/5 dark:bg-white/10' };
    }
  };

  const getPriorityStyles = (priority) => {
    switch (priority) {
      case 'critical':
        return 'bg-[#ff3b30]/10 text-[#ff3b30]';
      case 'important':
        return 'bg-[#ff9500]/10 text-[#ff9500]';
      default:
        return 'bg-black/5 dark:bg-white/10 text-[#86868b]';
    }
  };

  const statusInfo = getStatusStyles(integration.status);
  const StatusIcon = statusInfo.icon;

  const renderConfigurationDetails = () => {
    if (!integration.configuration) return null;
    const config = integration.configuration;
    
    const configItems = [];
    
    if (config.workspace) configItems.push({ label: 'Workspace', value: config.workspace });
    if (config.projects?.length) configItems.push({ label: 'Projects', value: `${config.projects.length} active` });
    if (config.team_members?.length || config.team_members) {
      const count = Array.isArray(config.team_members) ? config.team_members.length : config.team_members;
      configItems.push({ label: 'Team', value: `${count} members` });
    }
    if (config.accounts?.length) configItems.push({ label: 'Accounts', value: `${config.accounts.length} connected` });
    if (config.scheduled_posts) configItems.push({ label: 'Scheduled', value: `${config.scheduled_posts} posts` });
    if (config.channels?.length) configItems.push({ label: 'Channels', value: `${config.channels.length} active` });
    if (config.spreadsheets?.length) configItems.push({ label: 'Spreadsheets', value: `${config.spreadsheets.length} active` });
    if (config.ai_models?.length) configItems.push({ label: 'AI Models', value: `${config.ai_models.length} available` });
    if (config.enhanced_images) configItems.push({ label: 'Enhanced', value: `${config.enhanced_images} images` });
    if (config.brand_kit) configItems.push({ label: 'Brand Kit', value: config.brand_kit });
    if (config.templates) configItems.push({ label: 'Templates', value: `${config.templates} available` });
    
    return configItems.length > 0 ? (
      <div className="space-y-2">
        {configItems.map((item, i) => (
          <div key={i} className="flex items-center justify-between text-[12px]">
            <span className="text-[#86868b]">{item.label}</span>
            <span className="font-medium text-[#1d1d1f] dark:text-white">{item.value}</span>
          </div>
        ))}
      </div>
    ) : null;
  };

  return (
    <div className={`rounded-2xl backdrop-blur-xl border p-5 transition-all duration-300 hover:shadow-lg ${
      integration.isCritical 
        ? 'bg-[#ff3b30]/5 dark:bg-[#ff3b30]/10 border-[#ff3b30]/20' 
        : 'bg-white/80 dark:bg-[#1d1d1f]/80 border-black/5 dark:border-white/10 hover:border-[#0071e3]/30'
    }`}>
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="text-2xl">{integration.icon}</div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white">
            {integration.name}
          </h3>
          <p className="text-[12px] text-[#86868b] mt-0.5 line-clamp-2">
            {integration.description}
          </p>
        </div>
      </div>
      
      {/* Status & Priority Badges */}
      <div className="flex items-center gap-2 mb-4">
        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium ${statusInfo.bg} ${statusInfo.color}`}>
          <StatusIcon className="w-3 h-3" />
          {integration.status}
        </span>
        <span className={`inline-flex px-2 py-1 rounded-lg text-[11px] font-medium ${getPriorityStyles(integration.priority)}`}>
          {priorityLabels[integration.priority] || integration.priority}
        </span>
        <span className="inline-flex px-2 py-1 rounded-lg text-[11px] font-medium bg-black/5 dark:bg-white/10 text-[#86868b]">
          {categoryLabels[integration.category] || integration.category}
        </span>
      </div>

      {/* Configuration Details (Expandable) */}
      {showDetails && integration.configuration && (
        <div className="mb-4 p-3 rounded-xl bg-black/[0.02] dark:bg-white/5 border border-black/5 dark:border-white/5">
          <h4 className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wide mb-2">Configuration</h4>
          {renderConfigurationDetails()}
        </div>
      )}
      
      {/* Last Sync & Setup Required */}
      <div className="flex items-center justify-between text-[11px] text-[#86868b] mb-4">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Last sync: {integration.lastSyncFormatted}
        </span>
        {integration.setup_required && (
          <span className="px-2 py-0.5 rounded-md bg-[#ff3b30]/10 text-[#ff3b30] font-medium">
            Setup Required
          </span>
        )}
      </div>
      
      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button 
          onClick={() => setShowDetails(!showDetails)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[12px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
        >
          {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
        
        <a 
          href={integration.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#0071e3] text-white text-[12px] font-medium hover:bg-[#0077ed] transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open
        </a>
      </div>
      
      {/* Critical Warning */}
      {integration.isCritical && (
        <div className="mt-4 p-2.5 rounded-xl bg-[#ff3b30]/10 border border-[#ff3b30]/20">
          <p className="text-[11px] text-[#ff3b30] font-medium flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Critical tool for content workflow. Ensure this is properly configured.
          </p>
        </div>
      )}
    </div>
  );
}
