import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { 
  MessageSquare, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Users,
  Target,
  Shield,
  Settings,
  Database,
  Lock,
  Activity,
  Bell
} from "lucide-react";

export default function AdminMessage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome, System Administrator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Critical guidelines and responsibilities for system administration
        </p>
      </div>

      <div className="space-y-6">
        {/* Main Message Card */}
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-900 dark:text-red-400">
              <MessageSquare className="h-5 w-5" />
              Message from Leadership
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
                As System Administrator, you hold the keys to our entire platform. Your role is critical 
                in maintaining system security, user management, and ensuring smooth operations across 
                all departments. With great power comes great responsibility - every action you take 
                affects the entire organization.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Key Responsibilities */}
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-white">
              <Target className="h-5 w-5" />
              Key Responsibilities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">User Access Management</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Approve new users, assign roles, and manage permissions across the platform</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">Security Oversight</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Monitor for suspicious activity, manage API keys, and ensure data protection</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">System Configuration</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Manage integrations, configure system settings, and maintain platform health</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">Data Integrity</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Ensure database consistency, manage backups, and protect sensitive information</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">User Support</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Help team members with access issues, account recovery, and technical problems</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">Audit & Compliance</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Review access logs, generate reports, and maintain compliance standards</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Critical Reminders */}
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              Critical Reminders
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Lock className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900 dark:text-amber-400">Credential Security</h4>
                    <p className="text-sm text-amber-800 dark:text-amber-500">Never share admin credentials. Use secure password practices and enable 2FA</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900 dark:text-amber-400">Pending User Reviews</h4>
                    <p className="text-sm text-amber-800 dark:text-amber-500">Check for pending user approvals daily - don't leave people waiting</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Activity className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900 dark:text-amber-400">System Monitoring</h4>
                    <p className="text-sm text-amber-800 dark:text-amber-500">Regularly check system health, error logs, and API rate limits</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Bell className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900 dark:text-amber-400">Alert Response</h4>
                    <p className="text-sm text-amber-800 dark:text-amber-500">Respond promptly to security alerts and user escalations</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Access Tools */}
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-white">
              <Shield className="h-5 w-5" />
              Admin Quick Access
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center p-4 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <h4 className="font-semibold text-gray-900 dark:text-white">User Management</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Manage users and roles</p>
              </div>
              <div className="text-center p-4 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <Settings className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <h4 className="font-semibold text-gray-900 dark:text-white">Permissions</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Configure access controls</p>
              </div>
              <div className="text-center p-4 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <Database className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <h4 className="font-semibold text-gray-900 dark:text-white">System Health</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Monitor platform status</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="border-gray-200 bg-gray-50 dark:bg-gray-900 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Emergency Protocols</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              In case of security incidents, data breaches, or system failures, follow the emergency 
              response protocols. Document all incidents and notify leadership immediately.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-gray-600 dark:text-gray-400">Security Incidents</Badge>
              <Badge variant="outline" className="text-gray-600 dark:text-gray-400">Data Protection</Badge>
              <Badge variant="outline" className="text-gray-600 dark:text-gray-400">System Recovery</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
