import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { 
  MessageSquare, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Target,
  TrendingUp,
  DollarSign,
  Users,
  Phone,
  Mail,
  BarChart3,
  Heart
} from "lucide-react";

export default function SalesManagerMessage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome, Sales Manager
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Guidelines for driving growth and building client relationships
        </p>
      </div>

      <div className="space-y-6">
        {/* Main Message Card */}
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900 dark:text-orange-400">
              <MessageSquare className="h-5 w-5" />
              Message from Leadership
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
              <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
                As Sales Manager, you are the engine of our growth. Every lead you nurture, every 
                relationship you build, and every deal you close directly impacts our success. 
                Remember, we're not just selling services - we're building partnerships with 
                luxury real estate professionals who trust us with their brand.
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
                    <h4 className="font-semibold text-gray-900 dark:text-white">Lead Management</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Qualify leads, track opportunities, and maintain CRM accuracy</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">Client Acquisition</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Convert prospects through consultative selling and value demonstration</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">Pipeline Management</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Keep deals moving through stages and forecast accurately</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">Client Packages</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Create and manage client service packages and pricing</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">Relationship Building</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Nurture long-term relationships and identify upsell opportunities</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">Sales Reporting</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Track KPIs, report on progress, and analyze win/loss patterns</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sales Process */}
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-400">
              <TrendingUp className="h-5 w-5" />
              Sales Process Guidelines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900 dark:text-blue-400">Discovery Calls</h4>
                    <p className="text-sm text-blue-800 dark:text-blue-500">Focus on understanding client needs before presenting solutions</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Heart className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900 dark:text-blue-400">Value Selling</h4>
                    <p className="text-sm text-blue-800 dark:text-blue-500">Emphasize ROI and results over features and pricing</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900 dark:text-blue-400">Follow-Up</h4>
                    <p className="text-sm text-blue-800 dark:text-blue-500">Maintain consistent follow-up without being pushy</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <DollarSign className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900 dark:text-blue-400">Pricing</h4>
                    <p className="text-sm text-blue-800 dark:text-blue-500">Position pricing around value delivered, not cost</p>
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
                    <h4 className="font-semibold text-amber-900 dark:text-amber-400">Response Time</h4>
                    <p className="text-sm text-amber-800 dark:text-amber-500">Respond to new leads within 1 hour during business hours</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Target className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900 dark:text-amber-400">CRM Hygiene</h4>
                    <p className="text-sm text-amber-800 dark:text-amber-500">Update deal stages and notes after every client interaction</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900 dark:text-amber-400">Handoff Process</h4>
                    <p className="text-sm text-amber-800 dark:text-amber-500">Ensure smooth transition when onboarding new clients to the team</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <TrendingUp className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900 dark:text-amber-400">Weekly Reviews</h4>
                    <p className="text-sm text-amber-800 dark:text-amber-500">Review pipeline weekly and identify stuck deals</p>
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
              <DollarSign className="h-5 w-5" />
              Sales Quick Access
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center p-4 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <h4 className="font-semibold text-gray-900 dark:text-white">CRM</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Manage leads & deals</p>
              </div>
              <div className="text-center p-4 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <BarChart3 className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <h4 className="font-semibold text-gray-900 dark:text-white">Pipeline</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Track opportunities</p>
              </div>
              <div className="text-center p-4 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <DollarSign className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <h4 className="font-semibold text-gray-900 dark:text-white">Reports</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Sales analytics</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="border-gray-200 bg-gray-50 dark:bg-gray-900 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Sales Philosophy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              The best salespeople are trusted advisors, not just deal closers. Focus on solving 
              client problems, and the revenue will follow. Every "no" brings you closer to a 
              "yes" - persistence with integrity is the key to success.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-gray-600 dark:text-gray-400">Consultative Selling</Badge>
              <Badge variant="outline" className="text-gray-600 dark:text-gray-400">Client Success</Badge>
              <Badge variant="outline" className="text-gray-600 dark:text-gray-400">Results Driven</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
