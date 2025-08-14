import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  Settings, 
  ExternalLink, 
  Clock, 
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react';

const AppCard = ({ integration }) => {
  const [showDetails, setShowDetails] = useState(false);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <Info className="w-4 h-4 text-gray-600" />;
    }
  };

  const getCategoryLabel = (category) => {
    const labels = {
      "social-media": "Social Media",
      "productivity": "Productivity",
      "design": "Design & Creative",
      "communication": "Communication",
      "analytics": "Analytics & Data"
    };
    return labels[category] || category;
  };

  const getPriorityLabel = (priority) => {
    const labels = {
      "critical": "Critical",
      "important": "Important",
      "optional": "Optional"
    };
    return labels[priority] || priority;
  };

  const renderConfigurationDetails = () => {
    if (!integration.configuration) return null;

    const config = integration.configuration;
    
    switch (integration.category) {
      case 'productivity':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Workspace:</span>
              <span className="text-slate-600">{config.workspace}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Projects:</span>
              <span className="text-slate-600">{config.projects?.length || 0} active</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Team:</span>
              <span className="text-slate-600">{config.team_members?.length || 0} members</span>
            </div>
          </div>
        );
      
      case 'social-media':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Accounts:</span>
              <span className="text-slate-600">{config.accounts?.length || 0} connected</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Scheduled:</span>
              <span className="text-slate-600">{config.scheduled_posts || 0} posts</span>
            </div>
            {config.next_post && (
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Next Post:</span>
                <span className="text-slate-600">{config.next_post}</span>
              </div>
            )}
          </div>
        );
      
      case 'design':
        if (integration.name === 'Air.inc') {
          return (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">AI Models:</span>
                <span className="text-slate-600">{config.ai_models?.length || 0} available</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Enhanced:</span>
                <span className="text-slate-600">{config.enhanced_images || 0} images</span>
              </div>
              {config.processing_queue > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Queue:</span>
                  <span className="text-slate-600">{config.processing_queue} pending</span>
                </div>
              )}
            </div>
          );
        }
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Brand Kit:</span>
              <span className="text-slate-600">{config.brand_kit}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Templates:</span>
              <span className="text-slate-600">{config.templates || 0} available</span>
            </div>
          </div>
        );
      
      case 'communication':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Workspace:</span>
              <span className="text-slate-600">{config.workspace}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Channels:</span>
              <span className="text-slate-600">{config.channels?.length || 0} active</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Team:</span>
              <span className="text-slate-600">{config.team_members || 0} members</span>
            </div>
          </div>
        );
      
      case 'analytics':
        if (integration.name === 'Google Sheets') {
          return (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Spreadsheets:</span>
                <span className="text-slate-600">{config.spreadsheets?.length || 0} active</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Shared With:</span>
                <span className="text-slate-600">{config.shared_with?.length || 0} teams</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Updated:</span>
                <span className="text-slate-600">{config.last_updated}</span>
              </div>
            </div>
          );
        }
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Accounts:</span>
              <span className="text-slate-600">{config.connected_accounts?.length || 0} connected</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Ad Accounts:</span>
              <span className="text-slate-600">{config.ad_accounts || 0} active</span>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <Card className={`h-full transition-all duration-200 hover:shadow-md ${
      integration.isCritical ? 'border-red-200 bg-red-50/30' : 'border-gray-200 hover:border-blue-300'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="text-2xl">{integration.icon}</div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-semibold text-gray-900 mb-1">
                {integration.name}
              </CardTitle>
              <p className="text-sm text-gray-600 line-clamp-2">
                {integration.description}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {getStatusIcon(integration.status)}
            <Badge 
              variant="outline" 
              className={`text-xs ${integration.statusColor}`}
            >
              {integration.status}
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center gap-2 mt-3">
          <Badge 
            variant="outline" 
            className={`text-xs ${integration.priorityColor}`}
          >
            {getPriorityLabel(integration.priority)}
          </Badge>
          <Badge variant="outline" className="text-xs text-gray-600">
            {getCategoryLabel(integration.category)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Configuration Details */}
        {showDetails && (
          <div className="p-3 bg-gray-50 rounded-lg border">
            <h4 className="font-medium text-sm text-gray-900 mb-2">Configuration Details</h4>
            {renderConfigurationDetails()}
          </div>
        )}
        
        {/* Last Sync Info */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Last sync: {integration.lastSyncFormatted}
          </span>
          {integration.setup_required && (
            <Badge variant="destructive" className="text-xs">
              Setup Required
            </Badge>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </Button>
          
          <Button 
            size="sm" 
            className="flex-1"
            asChild
          >
            <a 
              href={integration.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              Open
            </a>
          </Button>
        </div>
        
        {/* Critical App Warning */}
        {integration.isCritical && (
          <div className="p-2 bg-red-50 rounded border border-red-200">
            <p className="text-xs text-red-800 font-medium">
              ⚠️ Critical tool for content workflow. Ensure this is properly configured.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AppCard;
