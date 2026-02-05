import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "react-hot-toast";
import AppSetupPage from "./AppSetupPage";
import { USER_ROLES } from "../entities/UserRoles";
import { 
  FileText, 
  ExternalLink, 
  Search, 
  Book, 
  Video, 
  Users,
  Phone,
  Mail,
  Globe,
  Calendar,
  ArrowRight,
  MessageSquare,
  BarChart3,
  BookOpen,
  Settings
} from "lucide-react";

// Role to message page mapping
const roleMessagePages = {
  [USER_ROLES.ADMIN]: '/admin-message',
  [USER_ROLES.DIRECTOR]: '/director-message',
  [USER_ROLES.CONTENT_DIRECTOR]: '/content-manager-message',
  [USER_ROLES.SOCIAL_MEDIA_MANAGER]: '/social-media-manager-message',
  [USER_ROLES.GRAPHIC_DESIGNER]: '/graphic-designer-message',
  [USER_ROLES.HR_MANAGER]: '/hr-manager-message',
  [USER_ROLES.SALES_MANAGER]: '/sales-manager-message',
};

const resources = [
  {
    id: 0,
    title: "My Time Off",
    description: "Request vacation, sick leave, and manage your time-off balance",
    type: "internal",
    category: "employee",
    internalPath: "/my-time-off",
    important: true,
    featured: true
  },
  {
    id: 101,
    title: "Add-ons",
    description: "Potential add-ons we can quote for your portal — Sales & CRM and more",
    type: "internal",
    category: "training",
    internalPath: "/features",
    important: true,
    featured: true
  },
  {
    id: 100,
    title: "Tutorials & Training",
    description: "Step-by-step guides and video tutorials for all roles",
    type: "internal",
    category: "training",
    internalPath: "/tutorials",
    important: true,
    featured: true
  },
  {
    id: 99,
    title: "Manager Messages",
    description: "Role-specific guidelines, responsibilities, and important updates for your position",
    type: "message",
    category: "employee",
    internalPath: "dynamic-role-message", // Special marker for role-based routing
    important: true
  },
  {
    id: 98,
    title: "HR Analytics",
    description: "View team performance metrics, retention rates, and HR insights",
    type: "analytics",
    category: "hr",
    internalPath: "/hr-analytics",
    important: true,
    hrOnly: true
  },
  {
    id: 1,
    title: "Employee Handbook",
    description: "Complete guide to company policies, benefits, and procedures",
    type: "document",
    category: "policy",
    comingSoon: true,
    important: true
  },
  {
    id: 2,
    title: "Feedback and Technical Support",
    description: "Submit a bug report, feature request, or chat with the developer",
    type: "internal",
    category: "support",
    internalPath: "/feedback-support",
    buttonLabel: "Open feedback and technical support page",
    important: true
  },
  {
    id: 3,
    title: "Team Directory",
    description: "Contact information for all team members",
    type: "directory",
    category: "contacts",
    internalPath: "/team-directory",
    important: true
  },
  {
    id: 4,
    title: "Onboarding Video Series",
    description: "Welcome videos from leadership and overview of company culture",
    type: "video",
    category: "training",
    comingSoon: true
  },
  {
    id: 5,
    title: "Benefits Guide",
    description: "Comprehensive overview of health insurance, retirement plans, and perks",
    type: "document",
    category: "benefits",
    comingSoon: true,
    important: true
  }
];

const typeIcons = {
  internal: Calendar,
  document: FileText,
  link: Globe,
  video: Video,
  directory: Users,
  message: MessageSquare,
  analytics: BarChart3
};

const categoryColors = {
  employee: "bg-[#0071e3]/10 text-[#0071e3]",
  policy: "bg-black/5 dark:bg-white/10 text-[#86868b]",
  support: "bg-[#34c759]/10 text-[#34c759]", 
  contacts: "bg-[#af52de]/10 text-[#af52de]",
  training: "bg-[#ff9500]/10 text-[#ff9500]",
  benefits: "bg-[#ff9500]/10 text-[#ff9500]",
  hr: "bg-[#5856d6]/10 text-[#5856d6]"
};

export default function ResourcesPage() {
  const navigate = useNavigate();
  const { currentRole, isSystemAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("resources");
  
  // Filter resources based on role
  const roleFilteredResources = resources.filter(resource => {
    // If resource is HR-only, only show to HR managers
    if (resource.hrOnly) {
      return currentRole === 'hr_manager' || currentRole === 'admin';
    }
    return true;
  });
  
  const filteredResources = roleFilteredResources.filter(resource =>
    resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resource.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resource.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const featuredResource = filteredResources.find(r => r.featured);
  const importantResources = filteredResources.filter(r => r.important && !r.featured);
  const otherResources = filteredResources.filter(r => !r.important && !r.featured);

  return (
    <div className="w-full">
      <div className="px-6 pt-6 pb-4">
        <div className="inline-flex p-1 rounded-xl bg-black/5 dark:bg-white/10">
          <button 
            onClick={() => setActiveTab("resources")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${
              activeTab === "resources"
                ? 'bg-white dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-white shadow-sm'
                : 'text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Resources
          </button>
          <button 
            onClick={() => setActiveTab("programs")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${
              activeTab === "programs"
                ? 'bg-white dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-white shadow-sm'
                : 'text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4" />
            Programs
          </button>
        </div>
      </div>

      {activeTab === "resources" && (
        <div className="p-6 space-y-8 max-w-6xl mx-auto">
          <div>
            <h1 className="text-[28px] sm:text-[34px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em]">Resources & Support</h1>
            <p className="text-[15px] text-[#86868b] mt-1">Everything you need to know, all in one place</p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#86868b] w-4 h-4" />
            <input
              placeholder="Search resources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-11 pl-10 pr-4 text-[15px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
            />
          </div>

          {/* Featured Resource - My Time Off */}
          {featuredResource && (
            <section>
              <div className="bg-gradient-to-br from-[#0071e3] to-[#5856d6] text-white rounded-2xl shadow-xl overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                      <Calendar className="w-8 h-8" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-[22px] font-semibold mb-2">
                        {featuredResource.title}
                      </h2>
                      <p className="text-white/80 text-[15px]">
                        {featuredResource.description}
                      </p>
                    </div>
                  </div>
                  <div className="mt-5">
                    <button 
                      onClick={() => navigate(featuredResource.internalPath)}
                      className="flex items-center gap-2 px-5 py-3 bg-white text-[#0071e3] rounded-xl text-[15px] font-semibold hover:bg-white/90 transition-colors"
                    >
                      Go to My Time Off
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Important Resources */}
          {importantResources.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">Essential Resources</h2>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#ff3b30]/10 text-[#ff3b30] font-medium">Must Read</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {importantResources.map((resource) => (
                  <ResourceCard key={resource.id} resource={resource} navigate={navigate} currentRole={currentRole} isSystemAdmin={isSystemAdmin} />
                ))}
              </div>
            </section>
          )}

          {/* Other Resources */}
          <section>
            <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white mb-4">All Resources</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {otherResources.length === 0 && importantResources.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <div className="w-16 h-16 bg-black/5 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Book className="w-8 h-8 text-[#86868b]" />
                  </div>
                  <p className="text-[15px] font-medium text-[#1d1d1f] dark:text-white">No resources found</p>
                  <p className="text-[13px] text-[#86868b]">Try a different search term</p>
                </div>
              ) : (
                otherResources.map((resource) => (
                  <ResourceCard key={resource.id} resource={resource} navigate={navigate} currentRole={currentRole} isSystemAdmin={isSystemAdmin} />
                ))
              )}
            </div>
          </section>

          {/* Quick Contact Section */}
          <div className="bg-gradient-to-r from-[#0071e3] to-[#5856d6] text-white rounded-2xl overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Phone className="w-5 h-5" />
                <h3 className="text-[17px] font-semibold">Need Help?</h3>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[12px] text-white/70">HR Support</p>
                    <a href="mailto:matthew@luxury-listings.com" className="text-[14px] font-medium hover:underline block">matthew@luxury-listings.com</a>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[12px] text-white/70">Urgent Technical Support #</p>
                    <a href="tel:+17783862548" className="text-[14px] font-medium hover:underline block">+1 (778) 386-2548</a>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[12px] text-white/70">Manager</p>
                    <a href="mailto:michelle@luxury-listings.com" className="text-[14px] font-medium hover:underline block">michelle@luxury-listings.com</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "programs" && (
        <AppSetupPage />
      )}
    </div>
  );
}

function ResourceCard({ resource, navigate, currentRole, isSystemAdmin }) {
  const Icon = typeIcons[resource.type];
  
  // Handle dynamic role-based routing for Manager Messages
  const getInternalPath = () => {
    if (resource.internalPath === 'dynamic-role-message') {
      // System admins always see the admin message
      if (isSystemAdmin) {
        return '/admin-message';
      }
      return roleMessagePages[currentRole] || '/content-manager-message';
    }
    return resource.internalPath;
  };
  
  return (
    <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 p-5 hover:shadow-lg transition-all duration-300">
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2.5 bg-black/5 dark:bg-white/10 rounded-xl">
          <Icon className="w-5 h-5 text-[#1d1d1f] dark:text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white">
            {resource.title}
          </h3>
          <p className="text-[13px] text-[#86868b] mt-0.5 line-clamp-2">
            {resource.description}
          </p>
        </div>
      </div>
      
      <div className="space-y-3">
        <span className={`inline-flex text-[11px] px-2 py-1 rounded-md font-medium ${categoryColors[resource.category]}`}>
          {resource.category}
        </span>
        
        {resource.comingSoon && (
          <button
            type="button"
            onClick={() => toast('Coming Soon!')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0071e3] text-white text-[13px] font-medium hover:bg-[#0077ed] transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            Open Resource
          </button>
        )}
        
        {!resource.comingSoon && resource.internalPath && (
          <button 
            onClick={() => navigate(getInternalPath())}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0071e3] text-white text-[13px] font-medium hover:bg-[#0077ed] transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            {resource.buttonLabel || `Open ${resource.title}`}
          </button>
        )}
        
        {!resource.comingSoon && resource.url && (
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0071e3] text-white text-[13px] font-medium hover:bg-[#0077ed] transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open Resource
          </a>
        )}
        
        {resource.contact && (
          <div className="text-[12px] text-[#86868b] flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5" />
            {resource.contact}
          </div>
        )}
        
        {resource.phone && (
          <div className="text-[12px] text-[#86868b] flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5" />
            {resource.phone}
          </div>
        )}
      </div>
    </div>
  );
}










