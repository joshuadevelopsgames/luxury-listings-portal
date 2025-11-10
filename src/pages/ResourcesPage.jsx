import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
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
  ArrowRight
} from "lucide-react";

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
    id: 1,
    title: "Employee Handbook",
    description: "Complete guide to company policies, benefits, and procedures",
    type: "document",
    category: "policy",
    url: "https://example.com/handbook",
    important: true
  },
  {
    id: 2,
    title: "IT Support Portal",
    description: "Submit tickets and get technical support",
    type: "link",
    category: "support",
    url: "https://example.com/support",
    contact: "it-support@company.com"
  },
  {
    id: 3,
    title: "Team Directory", 
    description: "Contact information for all team members",
    type: "directory",
    category: "contacts",
    url: "https://example.com/directory"
  },
  {
    id: 4,
    title: "Onboarding Video Series",
    description: "Welcome videos from leadership and overview of company culture",
    type: "video",
    category: "training",
    url: "https://example.com/videos"
  },
  {
    id: 5,
    title: "Benefits Guide",
    description: "Comprehensive overview of health insurance, retirement plans, and perks",
    type: "document", 
    category: "benefits",
    url: "https://example.com/benefits",
    important: true
  },
  {
    id: 6,
    title: "Emergency Contacts",
    description: "Important phone numbers for emergencies and urgent situations",
    type: "emergency",
    category: "safety",
    phone: "+1 (555) 123-4567"
  }
];

const typeIcons = {
  internal: Calendar,
  document: FileText,
  link: Globe,
  video: Video,
  directory: Users,
  emergency: Phone
};

const categoryColors = {
  employee: "bg-blue-100 text-blue-800",
  policy: "bg-slate-100 text-slate-800",
  support: "bg-green-100 text-green-800", 
  contacts: "bg-purple-100 text-purple-800",
  training: "bg-orange-100 text-orange-800",
  benefits: "bg-yellow-100 text-yellow-800",
  safety: "bg-red-100 text-red-800"
};

export default function ResourcesPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  
  const filteredResources = resources.filter(resource =>
    resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resource.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resource.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const featuredResource = filteredResources.find(r => r.featured);
  const importantResources = filteredResources.filter(r => r.important && !r.featured);
  const otherResources = filteredResources.filter(r => !r.important && !r.featured);

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Resources & Support</h1>
        <p className="text-slate-600">Everything you need to know, all in one place</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
        <Input
          placeholder="Search resources..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-white/80 backdrop-blur-sm"
        />
      </div>

      {/* Featured Resource - My Time Off */}
      {featuredResource && (
        <section>
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none shadow-xl">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                    <Calendar className="w-8 h-8" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold mb-2">
                      {featuredResource.title}
                    </CardTitle>
                    <p className="text-blue-100 text-base">
                      {featuredResource.description}
                    </p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => navigate(featuredResource.internalPath)}
                className="bg-white text-blue-600 hover:bg-blue-50 font-semibold"
                size="lg"
              >
                Go to My Time Off
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Important Resources */}
      {importantResources.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-semibold text-slate-900">Essential Resources</h2>
            <Badge className="bg-red-100 text-red-800">Must Read</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {importantResources.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} navigate={navigate} />
            ))}
          </div>
        </section>
      )}

      {/* Other Resources */}
      <section>
        <h2 className="text-xl font-semibold text-slate-900 mb-4">All Resources</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {otherResources.length === 0 && importantResources.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Book className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500 font-medium">No resources found</p>
              <p className="text-sm text-slate-400">Try a different search term</p>
            </div>
          ) : (
            otherResources.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} navigate={navigate} />
            ))
          )}
        </div>
      </section>

      {/* Quick Contact Section */}
      <Card className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white border-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Need Help?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              <div>
                <p className="text-sm text-blue-100">HR Support</p>
                <p className="font-medium">hr@company.com</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              <div>
                <p className="text-sm text-blue-100">IT Helpdesk</p>
                <p className="font-medium">+1 (555) 123-4567</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <div>
                <p className="text-sm text-blue-100">Manager</p>
                <p className="font-medium">Ask your buddy!</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ResourceCard({ resource, navigate }) {
  const Icon = typeIcons[resource.type];
  
  return (
    <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 hover:shadow-lg transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-slate-100 rounded-lg">
              <Icon className="w-5 h-5 text-slate-600" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg font-semibold text-slate-900">
                {resource.title}
              </CardTitle>
              <p className="text-sm text-slate-600 mt-1">
                {resource.description}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <Badge className={categoryColors[resource.category]} variant="secondary">
          {resource.category}
        </Badge>
        
        {resource.internalPath && (
          <Button 
            onClick={() => navigate(resource.internalPath)}
            className="w-full" 
            size="sm"
          >
            <ArrowRight className="w-4 h-4 mr-2" />
            Open {resource.title}
          </Button>
        )}
        
        {resource.url && (
          <Button asChild className="w-full" size="sm">
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open Resource
            </a>
          </Button>
        )}
        
        {resource.contact && (
          <div className="text-sm text-slate-600 flex items-center gap-1">
            <Mail className="w-3 h-3" />
            {resource.contact}
          </div>
        )}
        
        {resource.phone && (
          <div className="text-sm text-slate-600 flex items-center gap-1">
            <Phone className="w-3 h-3" />
            {resource.phone}
          </div>
        )}
      </CardContent>
    </Card>
  );
}










