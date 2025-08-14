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
  "social-media": "bg-blue-100 text-blue-800",
  "productivity": "bg-green-100 text-green-800",
  "design": "bg-purple-100 text-purple-800",
  "communication": "bg-orange-100 text-orange-800",
  "analytics": "bg-indigo-100 text-indigo-800"
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
        <div className="h-8 bg-slate-200 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-slate-200 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Programs</h1>
        <p className="text-slate-600">Get connected to all the tools you'll need for luxury real estate content excellence</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-900">{counts.all}</div>
            <div className="text-sm text-blue-700">Total Tools</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-900">{counts.critical}</div>
            <div className="text-sm text-red-700">Critical Tools</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-900">
              {integrations.filter(app => app.status === 'active').length}
            </div>
            <div className="text-sm text-green-700">Active Tools</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-900">
              {integrations.filter(app => app.setup_required).length}
            </div>
            <div className="text-sm text-purple-700">Setup Required</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <Tabs value={activeFilter} onValueChange={setActiveFilter}>
          <TabsList className="bg-white/80 backdrop-blur-sm">
            <TabsTrigger value="all"> All Tools ({counts.all}) </TabsTrigger>
            <TabsTrigger value="critical"> Critical ({counts.critical}) </TabsTrigger>
            <TabsTrigger value="social-media"> Social Media ({counts["social-media"] || 0}) </TabsTrigger>
            <TabsTrigger value="productivity"> Productivity ({counts.productivity || 0}) </TabsTrigger>
            <TabsTrigger value="design"> Design ({counts.design || 0}) </TabsTrigger>
            <TabsTrigger value="communication"> Communication ({counts.communication || 0}) </TabsTrigger>
            <TabsTrigger value="analytics"> Analytics ({counts.analytics || 0}) </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredIntegrations.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Settings className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500 font-medium">No integrations found for this filter</p>
          </div>
        ) : (
          filteredIntegrations.map((integration) => (
            <AppCard key={integration.id} integration={integration} />
          ))
        )}
      </div>

      {/* Setup Guide */}
      <Card className="bg-gradient-to-r from-slate-50 to-slate-100 border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Content Toolbox Setup Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-slate-900 mb-2">Critical Tools (Setup First)</h4>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• <strong>ClickUp:</strong> Project management and task tracking</li>
                <li>• <strong>Later.com:</strong> Social media scheduling and calendar</li>
                <li>• <strong>Slack:</strong> Team communication and approvals</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-2">Important Tools (Setup Second)</h4>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• <strong>Air.inc:</strong> AI image enhancement</li>
                <li>• <strong>Google Sheets:</strong> Performance tracking</li>
                <li>• <strong>Canva:</strong> Visual content creation</li>
              </ul>
            </div>
          </div>
          <div className="pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-600">
              <strong>Pro Tip:</strong> Start with the critical tools to establish your workflow, then add the design and analytics tools as you become comfortable with the basics.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
