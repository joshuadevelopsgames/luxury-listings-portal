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
  BarChart3,
  Briefcase,
  Calendar,
  FileText,
  Star
} from "lucide-react";

export default function DirectorMessage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome, Director
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Strategic leadership guidelines and team oversight responsibilities
        </p>
      </div>

      <div className="space-y-6">
        {/* Main Message Card */}
        <Card className="border-indigo-200 bg-indigo-50 dark:bg-indigo-950/20 dark:border-indigo-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-indigo-900 dark:text-indigo-400">
              <MessageSquare className="h-5 w-5" />
              Message from Leadership
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-indigo-200 dark:border-indigo-800">
              <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
                As Director, you are the bridge between strategy and execution. Your role is to ensure 
                our team delivers exceptional results while maintaining high standards of quality and 
                professionalism. Lead by example, foster collaboration, and drive our luxury real estate 
                brand forward with vision and purpose.
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
                    <h4 className="font-semibold text-gray-900 dark:text-white">Strategic Planning</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Set quarterly goals, define KPIs, and align team efforts with business objectives</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">Team Leadership</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Guide content managers, social media teams, and designers toward excellence</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">Task Template Management</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Create and maintain task templates to standardize workflows across clients</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">Client Relations</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Maintain high-level client relationships and ensure satisfaction with deliverables</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">Performance Analytics</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Review team performance, content metrics, and ROI across all campaigns</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">Quality Assurance</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Ensure all output meets luxury brand standards and client expectations</p>
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
                  <Calendar className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900 dark:text-amber-400">Weekly Team Check-ins</h4>
                    <p className="text-sm text-amber-800 dark:text-amber-500">Hold weekly meetings to review progress and address blockers</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <TrendingUp className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900 dark:text-amber-400">Monthly Reporting</h4>
                    <p className="text-sm text-amber-800 dark:text-amber-500">Prepare comprehensive performance reports for stakeholders</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900 dark:text-amber-400">Team Development</h4>
                    <p className="text-sm text-amber-800 dark:text-amber-500">Invest in team growth through feedback, training, and mentorship</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Star className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900 dark:text-amber-400">Client Excellence</h4>
                    <p className="text-sm text-amber-800 dark:text-amber-500">Proactively identify opportunities to exceed client expectations</p>
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
              <Briefcase className="h-5 w-5" />
              Director Quick Access
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center p-4 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <BarChart3 className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <h4 className="font-semibold text-gray-900 dark:text-white">Analytics</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">View performance metrics</p>
              </div>
              <div className="text-center p-4 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <Users className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <h4 className="font-semibold text-gray-900 dark:text-white">Team Overview</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Monitor team activity</p>
              </div>
              <div className="text-center p-4 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <FileText className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <h4 className="font-semibold text-gray-900 dark:text-white">Task Templates</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Manage workflow templates</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="border-gray-200 bg-gray-50 dark:bg-gray-900 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Leadership Philosophy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Great leadership is about empowering others to do their best work. Focus on removing 
              obstacles, providing clear direction, and celebrating wins. Your success is measured 
              by the success of your team.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-gray-600 dark:text-gray-400">Strategic Vision</Badge>
              <Badge variant="outline" className="text-gray-600 dark:text-gray-400">Team Empowerment</Badge>
              <Badge variant="outline" className="text-gray-600 dark:text-gray-400">Excellence</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
