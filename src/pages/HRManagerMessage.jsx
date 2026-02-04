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
  Calendar,
  FileText,
  Heart,
  Shield,
  UserCheck,
  ClipboardList
} from "lucide-react";

export default function HRManagerMessage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome, HR Manager
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Guidelines for managing our team's well-being and HR operations
        </p>
      </div>

      <div className="space-y-6">
        {/* Main Message Card */}
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-900 dark:text-green-400">
              <MessageSquare className="h-5 w-5" />
              Message from Leadership
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
                As HR Manager, you are the guardian of our team culture and employee well-being. 
                Your role is pivotal in ensuring our workplace remains supportive, fair, and 
                productive. Handle every leave request, every concern, and every interaction with 
                empathy and professionalism. Our people are our greatest asset.
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
                    <h4 className="font-semibold text-gray-900 dark:text-white">Leave Management</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Process leave requests promptly, manage balances, and ensure coverage</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">Team Calendar</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Maintain accurate team availability and coordinate schedules</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">Employee Relations</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Address concerns, mediate conflicts, and maintain positive workplace culture</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">Attendance Tracking</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Monitor attendance patterns and address issues proactively</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">Policy Compliance</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Ensure HR policies are followed and keep documentation current</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">HR Reporting</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Generate reports on leave usage, attendance, and HR metrics</p>
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
                  <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900 dark:text-amber-400">Request Response Time</h4>
                    <p className="text-sm text-amber-800 dark:text-amber-500">Process all leave requests within 24-48 hours</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900 dark:text-amber-400">Confidentiality</h4>
                    <p className="text-sm text-amber-800 dark:text-amber-500">Keep all employee information strictly confidential</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900 dark:text-amber-400">Balance Updates</h4>
                    <p className="text-sm text-amber-800 dark:text-amber-500">Keep leave balances accurate and up-to-date</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Heart className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900 dark:text-amber-400">Empathy First</h4>
                    <p className="text-sm text-amber-800 dark:text-amber-500">Approach all situations with understanding and fairness</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leave Request Guidelines */}
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-400">
              <ClipboardList className="h-5 w-5" />
              Leave Request Guidelines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <UserCheck className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900 dark:text-blue-400">Approval Criteria</h4>
                    <p className="text-sm text-blue-800 dark:text-blue-500">Check balance availability, team coverage, and advance notice</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900 dark:text-blue-400">Peak Periods</h4>
                    <p className="text-sm text-blue-800 dark:text-blue-500">Be cautious approving leave during busy periods or project deadlines</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900 dark:text-blue-400">Documentation</h4>
                    <p className="text-sm text-blue-800 dark:text-blue-500">Request documentation for extended sick leave as per policy</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900 dark:text-blue-400">Team Impact</h4>
                    <p className="text-sm text-blue-800 dark:text-blue-500">Consider impact on team workload and client deliverables</p>
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
              <Users className="h-5 w-5" />
              HR Quick Access
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center p-4 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <Calendar className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <h4 className="font-semibold text-gray-900 dark:text-white">HR Calendar</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Manage leave requests</p>
              </div>
              <div className="text-center p-4 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <Users className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <h4 className="font-semibold text-gray-900 dark:text-white">Team Overview</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">View balances & status</p>
              </div>
              <div className="text-center p-4 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <FileText className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <h4 className="font-semibold text-gray-900 dark:text-white">HR Reports</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Analytics & exports</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="border-gray-200 bg-gray-50 dark:bg-gray-900 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">HR Philosophy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Our workplace thrives when every team member feels valued, supported, and heard. 
              Your role is to be a trusted advocate for employees while maintaining operational 
              efficiency. When in doubt, prioritize people - the rest will follow.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-gray-600 dark:text-gray-400">People First</Badge>
              <Badge variant="outline" className="text-gray-600 dark:text-gray-400">Fair & Consistent</Badge>
              <Badge variant="outline" className="text-gray-600 dark:text-gray-400">Confidential</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
