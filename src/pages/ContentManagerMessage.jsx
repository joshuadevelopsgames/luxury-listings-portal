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
  TrendingUp,
  FileText,
  Calendar,
  BarChart3
} from "lucide-react";

export default function ContentManagerMessage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome, Content Manager
        </h1>
        <p className="text-gray-600">
          Important reminders and guidelines for your role
        </p>
      </div>

      <div className="space-y-6">
        {/* Main Message Card */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <MessageSquare className="h-5 w-5" />
              Message from Leadership
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white p-4 rounded-lg border border-blue-200">
              <p className="text-gray-800 leading-relaxed">
                As our Content Manager, you play a crucial role in maintaining the quality and consistency 
                of our luxury real estate content. Your responsibilities extend beyond just content creation 
                to ensuring our brand voice remains premium and our messaging resonates with our high-end clientele.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Key Responsibilities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Key Responsibilities to Monitor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Content Quality Control</h4>
                    <p className="text-sm text-gray-600">Review all content for brand consistency, grammar, and luxury positioning</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Brand Voice Maintenance</h4>
                    <p className="text-sm text-gray-600">Ensure all content reflects our premium, sophisticated brand identity</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Team Coordination</h4>
                    <p className="text-sm text-gray-600">Work closely with social media managers and other team members</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Content Calendar Management</h4>
                    <p className="text-sm text-gray-600">Plan and schedule content across all platforms strategically</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Performance Tracking</h4>
                    <p className="text-sm text-gray-600">Monitor content performance and adjust strategies accordingly</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Client Package Oversight</h4>
                    <p className="text-sm text-gray-600">Ensure client content packages meet expectations and deadlines</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Important Reminders */}
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <AlertTriangle className="h-5 w-5" />
              Critical Reminders
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900">Daily Check-ins</h4>
                    <p className="text-sm text-amber-800">Review pending tasks and content approvals every morning</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900">Team Communication</h4>
                    <p className="text-sm text-amber-800">Maintain clear communication with all team members</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <TrendingUp className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900">Performance Metrics</h4>
                    <p className="text-sm text-amber-800">Track engagement rates and content performance weekly</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900">Documentation</h4>
                    <p className="text-sm text-amber-800">Keep detailed records of content strategies and results</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Access Tools */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Quick Access to Key Tools
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <Calendar className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <h4 className="font-semibold text-gray-900">Content Calendar</h4>
                <p className="text-sm text-gray-600">Plan and schedule content</p>
              </div>
              <div className="text-center p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <Users className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <h4 className="font-semibold text-gray-900">Client Packages</h4>
                <p className="text-sm text-gray-600">Manage client content packages</p>
              </div>
              <div className="text-center p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <FileText className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <h4 className="font-semibold text-gray-900">Resources</h4>
                <p className="text-sm text-gray-600">Access content templates and guides</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="border-gray-200 bg-gray-50">
          <CardHeader>
            <CardTitle className="text-gray-900">Need Help?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-4">
              If you have any questions about your role or need clarification on any processes, 
              don't hesitate to reach out to the leadership team or use the AI assistant available 
              throughout the platform.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-gray-600">Leadership Support</Badge>
              <Badge variant="outline" className="text-gray-600">AI Assistant</Badge>
              <Badge variant="outline" className="text-gray-600">Team Collaboration</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
