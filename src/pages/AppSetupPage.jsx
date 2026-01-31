import React, { useState, useEffect } from "react";
import { User } from "../entities/User";
import { AppIntegration } from "../entities/index";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Settings, ExternalLink, Clock, User as UserIcon } from "lucide-react";
import AppCard from "../components/setup/AppCard";

const categoryColors = {
  "social-media": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "productivity": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "design": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "communication": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  "analytics": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300"
};

const categoryLabels = {
  "social-media": "Social Media",
  "productivity": "Productivity",
  "design": "Design & Creative",
  "communication": "Communication",
  "analytics": "Analytics & Data"
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
    // Sort by priority
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

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 bg-slate-200 dark:bg-[#2d2d2d] rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-slate-200 dark:bg-[#2d2d2d] rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Programs</h1>
        <p className="text-slate-600 dark:text-gray-400">Get connected to all the tools you'll need for luxury real estate content excellence</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 dark:from-blue-900/20 dark:to-blue-800/20 dark:border-blue-700/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-300">{counts.all}</div>
            <div className="text-sm text-blue-700 dark:text-blue-400">Total Tools</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-red-50 to-red-100 border-red-200 dark:from-red-900/20 dark:to-red-800/20 dark:border-red-700/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-900 dark:text-red-300">{counts.critical}</div>
            <div className="text-sm text-red-700 dark:text-red-400">Critical Tools</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200 dark:from-green-900/20 dark:to-green-800/20 dark:border-green-700/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-900 dark:text-green-300">
              {integrations.filter(app => app.status === 'active').length}
            </div>
            <div className="text-sm text-green-700 dark:text-green-400">Active Tools</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200 dark:from-purple-900/20 dark:to-purple-800/20 dark:border-purple-700/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-900 dark:text-purple-300">
              {integrations.filter(app => app.setup_required).length}
            </div>
            <div className="text-sm text-purple-700 dark:text-purple-400">Setup Required</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <Tabs value={activeFilter} onValueChange={setActiveFilter}>
          <TabsList className="bg-white/80 dark:bg-[#2d2d2d]/80 backdrop-blur-sm flex-wrap">
            <TabsTrigger value="all" className="dark:data-[state=active]:bg-white/10 dark:text-gray-400 dark:data-[state=active]:text-white"> All Tools ({counts.all}) </TabsTrigger>
            <TabsTrigger value="critical" className="dark:data-[state=active]:bg-white/10 dark:text-gray-400 dark:data-[state=active]:text-white"> Critical ({counts.critical}) </TabsTrigger>
            <TabsTrigger value="social-media" className="dark:data-[state=active]:bg-white/10 dark:text-gray-400 dark:data-[state=active]:text-white"> Social Media ({counts["social-media"] || 0}) </TabsTrigger>
            <TabsTrigger value="productivity" className="dark:data-[state=active]:bg-white/10 dark:text-gray-400 dark:data-[state=active]:text-white"> Productivity ({counts.productivity || 0}) </TabsTrigger>
            <TabsTrigger value="design" className="dark:data-[state=active]:bg-white/10 dark:text-gray-400 dark:data-[state=active]:text-white"> Design ({counts.design || 0}) </TabsTrigger>
            <TabsTrigger value="communication" className="dark:data-[state=active]:bg-white/10 dark:text-gray-400 dark:data-[state=active]:text-white"> Communication ({counts.communication || 0}) </TabsTrigger>
            <TabsTrigger value="analytics" className="dark:data-[state=active]:bg-white/10 dark:text-gray-400 dark:data-[state=active]:text-white"> Analytics ({counts.analytics || 0}) </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredIntegrations.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <div className="w-16 h-16 bg-slate-100 dark:bg-[#2d2d2d] rounded-full flex items-center justify-center mx-auto mb-4">
              <Settings className="w-8 h-8 text-slate-400 dark:text-gray-500" />
            </div>
            <p className="text-slate-500 dark:text-gray-400 font-medium">No integrations found for this filter</p>
          </div>
        ) : (
          filteredIntegrations.map((integration) => (
            <AppCard key={integration.id} integration={integration} />
          ))
        )}
      </div>

      {/* Setup Guide */}
      <Card className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-[#2d2d2d] dark:to-[#3d3d3d] border-slate-200 dark:border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 dark:text-white">
            <Settings className="w-5 h-5" />
            Content Toolbox Setup Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Critical Tools (Setup First)</h4>
              <ul className="text-sm text-slate-600 dark:text-gray-400 space-y-1">
                <li>• <strong className="dark:text-gray-300">ClickUp:</strong> Project management and task tracking</li>
                <li>• <strong className="dark:text-gray-300">Later.com:</strong> Social media scheduling and calendar</li>
                <li>• <strong className="dark:text-gray-300">Slack:</strong> Team communication and approvals</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Important Tools (Setup Second)</h4>
              <ul className="text-sm text-slate-600 dark:text-gray-400 space-y-1">
                <li>• <strong className="dark:text-gray-300">Air.inc:</strong> AI image enhancement</li>
                <li>• <strong className="dark:text-gray-300">Google Sheets:</strong> Performance tracking</li>
                <li>• <strong className="dark:text-gray-300">Canva:</strong> Visual content creation</li>
              </ul>
            </div>
          </div>
          <div className="pt-4 border-t border-slate-200 dark:border-white/10">
            <p className="text-sm text-slate-600 dark:text-gray-400">
              <strong className="dark:text-gray-300">Pro Tip:</strong> Start with the critical tools to establish your workflow, then add the design and analytics tools as you become comfortable with the basics.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
