import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { 
  MessageSquare, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Target,
  Palette,
  Image,
  Layers,
  Sparkles,
  FileImage,
  Folder,
  Eye
} from "lucide-react";

export default function GraphicDesignerMessage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome, Graphic Designer
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Creative guidelines and design standards for luxury real estate content
        </p>
      </div>

      <div className="space-y-6">
        {/* Main Message Card */}
        <Card className="border-pink-200 bg-pink-50 dark:bg-pink-950/20 dark:border-pink-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-pink-900 dark:text-pink-400">
              <MessageSquare className="h-5 w-5" />
              Message from Leadership
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-pink-200 dark:border-pink-800">
              <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
                Your designs are the visual heartbeat of our luxury real estate brand. Every graphic, 
                every post, every story must exude elegance, sophistication, and premium quality. 
                Your creative vision transforms properties into aspirational lifestyles. Take pride 
                in your craft - you're creating art that sells dreams.
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
                    <h4 className="font-semibold text-gray-900 dark:text-white">Social Media Graphics</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Create stunning posts, stories, and reels graphics for Instagram and other platforms</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">Brand Consistency</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Maintain visual consistency across all client brands and materials</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">Photo Enhancement</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Edit and enhance property photos to showcase luxury features</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">Template Design</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Create reusable templates for various content types and campaigns</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">Asset Organization</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Upload and organize completed designs in the resource library</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">Project Turnaround</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Complete assigned tasks within deadlines while maintaining quality</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Design Standards */}
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-400">
              <Palette className="h-5 w-5" />
              Design Standards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900 dark:text-blue-400">Luxury Aesthetic</h4>
                    <p className="text-sm text-blue-800 dark:text-blue-500">Clean lines, sophisticated typography, premium color palettes</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Eye className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900 dark:text-blue-400">Visual Hierarchy</h4>
                    <p className="text-sm text-blue-800 dark:text-blue-500">Guide viewer attention with proper balance and focal points</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Layers className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900 dark:text-blue-400">File Organization</h4>
                    <p className="text-sm text-blue-800 dark:text-blue-500">Use proper naming conventions and layered files for edits</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Image className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900 dark:text-blue-400">Export Quality</h4>
                    <p className="text-sm text-blue-800 dark:text-blue-500">Export at proper resolutions for each platform</p>
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
                    <h4 className="font-semibold text-amber-900 dark:text-amber-400">Deadline Priority</h4>
                    <p className="text-sm text-amber-800 dark:text-amber-500">Check task deadlines daily and communicate early if you need more time</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FileImage className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900 dark:text-amber-400">Source Files</h4>
                    <p className="text-sm text-amber-800 dark:text-amber-500">Always save and upload source files, not just exports</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Eye className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900 dark:text-amber-400">Proofread</h4>
                    <p className="text-sm text-amber-800 dark:text-amber-500">Double-check all text for typos before marking complete</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Palette className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900 dark:text-amber-400">Brand Guidelines</h4>
                    <p className="text-sm text-amber-800 dark:text-amber-500">Reference client brand guidelines for every project</p>
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
              <Palette className="h-5 w-5" />
              Designer Quick Access
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center p-4 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <FileImage className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <h4 className="font-semibold text-gray-900 dark:text-white">My Tasks</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">View assigned projects</p>
              </div>
              <div className="text-center p-4 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <Folder className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <h4 className="font-semibold text-gray-900 dark:text-white">Resources</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Brand assets & templates</p>
              </div>
              <div className="text-center p-4 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <Layers className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <h4 className="font-semibold text-gray-900 dark:text-white">Upload</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Submit completed work</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="border-gray-200 bg-gray-50 dark:bg-gray-900 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Creative Support</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              For design direction questions, consult with the Content Manager. For asset requests 
              or brand guidelines, check the Resources section. Need inspiration? Browse our 
              completed projects gallery or use the AI assistant for creative ideas.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-gray-600 dark:text-gray-400">Content Team</Badge>
              <Badge variant="outline" className="text-gray-600 dark:text-gray-400">Brand Resources</Badge>
              <Badge variant="outline" className="text-gray-600 dark:text-gray-400">AI Assistant</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
