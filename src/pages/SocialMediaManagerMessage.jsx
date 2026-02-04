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
  Instagram,
  Heart,
  MessageCircle,
  Share2,
  Calendar,
  BarChart3
} from "lucide-react";

export default function SocialMediaManagerMessage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome, Social Media Manager
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Essential guidelines for managing our luxury real estate social presence
        </p>
      </div>

      <div className="space-y-6">
        {/* Main Message Card */}
        <Card className="border-purple-200 bg-purple-50 dark:bg-purple-950/20 dark:border-purple-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-900 dark:text-purple-400">
              <MessageSquare className="h-5 w-5" />
              Message from Leadership
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
              <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
                You are the voice of our luxury real estate clients on social media. Every post, story, 
                and interaction represents their premium brand. Your creativity and strategic thinking 
                drive engagement and build lasting connections with high-net-worth audiences. Make every 
                piece of content count.
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
                    <h4 className="font-semibold text-gray-900 dark:text-white">Content Publishing</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Schedule and post content according to the content calendar and optimal times</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">Community Engagement</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Respond to comments and DMs promptly with our luxury brand voice</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">Hashtag Strategy</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Research and implement effective hashtag strategies for maximum reach</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">Analytics Reporting</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Track metrics, compile reports, and identify growth opportunities</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">Story & Reel Creation</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Create engaging stories and reels that showcase luxury properties</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">Caption Writing</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Craft compelling captions that reflect luxury and drive engagement</p>
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
                    <p className="text-sm text-amber-800 dark:text-amber-500">Reply to all comments and DMs within 2-4 hours during business hours</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Instagram className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900 dark:text-amber-400">Content Consistency</h4>
                    <p className="text-sm text-amber-800 dark:text-amber-500">Maintain consistent posting schedule - never skip scheduled posts</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Heart className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900 dark:text-amber-400">Brand Voice</h4>
                    <p className="text-sm text-amber-800 dark:text-amber-500">Always maintain professional, luxury tone - no slang or casual language</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <TrendingUp className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900 dark:text-amber-400">Trend Awareness</h4>
                    <p className="text-sm text-amber-800 dark:text-amber-500">Stay updated on platform algorithm changes and trending formats</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Engagement Best Practices */}
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-900 dark:text-green-400">
              <Heart className="h-5 w-5" />
              Engagement Best Practices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <MessageCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-green-900 dark:text-green-400">Comments</h4>
                  <p className="text-sm text-green-800 dark:text-green-500">Reply with personalized, thoughtful responses - not generic replies</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Share2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-green-900 dark:text-green-400">Shares</h4>
                  <p className="text-sm text-green-800 dark:text-green-500">Create shareable content that adds value to your audience</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-green-900 dark:text-green-400">Community</h4>
                  <p className="text-sm text-green-800 dark:text-green-500">Engage with related accounts to build network and visibility</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Access Tools */}
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-white">
              <Instagram className="h-5 w-5" />
              Quick Access Tools
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center p-4 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <Calendar className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <h4 className="font-semibold text-gray-900 dark:text-white">Content Calendar</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Schedule posts</p>
              </div>
              <div className="text-center p-4 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <BarChart3 className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <h4 className="font-semibold text-gray-900 dark:text-white">Analytics</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Track performance</p>
              </div>
              <div className="text-center p-4 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <MessageCircle className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <h4 className="font-semibold text-gray-900 dark:text-white">Inbox</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Manage messages</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="border-gray-200 bg-gray-50 dark:bg-gray-900 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Need Support?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              For content approval questions, reach out to your Content Manager. For technical issues 
              or platform access, contact the admin team. Use the AI assistant for caption ideas, 
              hashtag research, and content optimization.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-gray-600 dark:text-gray-400">Content Team</Badge>
              <Badge variant="outline" className="text-gray-600 dark:text-gray-400">AI Assistant</Badge>
              <Badge variant="outline" className="text-gray-600 dark:text-gray-400">Resource Library</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
