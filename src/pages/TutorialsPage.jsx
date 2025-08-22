import React, { useState, useEffect } from "react";
import { User } from "../entities/User";
import { Tutorial, TutorialProgress } from "../entities/index";
import { useAuth } from "../contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import { 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  Play, 
  ArrowLeft,
  FileText,
  Trophy
} from "lucide-react";

import TutorialCard from "../components/tutorials/TutorialCard";
import TutorialViewer from "../components/tutorials/TutorialViewer";

const categoryColors = {
  strategy: "bg-blue-100 text-blue-800",
  "content-creation": "bg-purple-100 text-purple-800", 
  platforms: "bg-green-100 text-green-800",
  community: "bg-orange-100 text-orange-800",
  advertising: "bg-red-100 text-red-800",
  analytics: "bg-indigo-100 text-indigo-800",
  "influencer-marketing": "bg-pink-100 text-pink-800",
  "crisis-management": "bg-yellow-100 text-yellow-800",
  tools: "bg-teal-100 text-teal-800",
  trends: "bg-cyan-100 text-cyan-800",
  "admin-portal": "bg-red-100 text-red-800"
};

export default function TutorialsPage() {
  const { currentRole } = useAuth();
  const [user, setUser] = useState(null);
  const [tutorials, setTutorials] = useState([]);
  const [progress, setProgress] = useState([]);
  const [selectedTutorial, setSelectedTutorial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialTutorialId, setInitialTutorialId] = useState(null);

  useEffect(() => {
    // Check URL params for direct tutorial access
    const urlParams = new URLSearchParams(window.location.search);
    const tutorialId = urlParams.get('tutorial');
    if (tutorialId) {
      setInitialTutorialId(tutorialId);
    }
    loadData();
  }, []);

  useEffect(() => {
    if (initialTutorialId && tutorials.length > 0) {
      const tutorial = tutorials.find(t => t.id === initialTutorialId);
      if (tutorial) {
        setSelectedTutorial(tutorial);
        setInitialTutorialId(null);
      }
    }
  }, [initialTutorialId, tutorials]);

  const loadData = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);

      const [tutorialsData, progressData] = await Promise.all([
        Tutorial.list('order_index', currentRole),
        TutorialProgress.filter({ user_email: currentUser.email })
      ]);

      setTutorials(tutorialsData);
      setProgress(progressData);
    } catch (error) {
      console.error("Error loading tutorials:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTutorialProgress = (tutorialId) => {
    return progress.find(p => p.tutorial_id === tutorialId) || 
           { status: 'not_started', tutorial_id: tutorialId, user_email: user?.email };
  };

  const startTutorial = async (tutorial) => {
    const existingProgress = getTutorialProgress(tutorial.id);
    
    if (existingProgress.status === 'not_started') {
      await TutorialProgress.create({
        user_email: user.email,
        tutorial_id: tutorial.id,
        status: 'in_progress',
        started_at: new Date().toISOString()
      });
      await loadData();
    }
    
    setSelectedTutorial(tutorial);
  };

  const completeTutorial = async (tutorialId) => {
    const existingProgress = getTutorialProgress(tutorialId);
    
    if (existingProgress.id) {
      await TutorialProgress.update(existingProgress.id, {
        status: 'completed',
        completed_at: new Date().toISOString()
      });
    } else {
      await TutorialProgress.create({
        user_email: user.email,
        tutorial_id: tutorialId,
        status: 'completed',
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      });
    }
    
    await loadData();
    setSelectedTutorial(null);
  };

  const getOverallProgress = () => {
    const completed = progress.filter(p => p.status === 'completed').length;
    return tutorials.length > 0 ? Math.round((completed / tutorials.length) * 100) : 0;
  };

  const groupedTutorials = tutorials.reduce((acc, tutorial) => {
    const category = tutorial.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(tutorial);
    return acc;
  }, {});

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

  if (selectedTutorial) {
    return (
      <TutorialViewer
        tutorial={selectedTutorial}
        progress={getTutorialProgress(selectedTutorial.id)}
        onComplete={() => completeTutorial(selectedTutorial.id)}
        onBack={() => setSelectedTutorial(null)}
      />
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Training Tutorials</h1>
          <p className="text-slate-600">Complete these modules to get up to speed with our systems</p>
        </div>
        <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-lg p-4">
          <Trophy className="w-6 h-6 text-yellow-500" />
          <div>
            <p className="text-sm font-medium text-slate-900">Overall Progress</p>
            <div className="flex items-center gap-2 mt-1">
              <Progress value={getOverallProgress()} className="w-24 h-2" />
              <span className="text-sm font-bold text-slate-700">{getOverallProgress()}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {Object.entries(groupedTutorials).map(([category, categoryTutorials]) => (
          <div key={category}>
            <div className="flex items-center gap-2 mb-4">
              <Badge className={categoryColors[category]} variant="secondary">
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </Badge>
              <span className="text-sm text-slate-500">
                {categoryTutorials.length} tutorial{categoryTutorials.length !== 1 ? 's' : ''}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categoryTutorials.map((tutorial) => (
                <TutorialCard
                  key={tutorial.id}
                  tutorial={tutorial}
                  progress={getTutorialProgress(tutorial.id)}
                  onStart={() => startTutorial(tutorial)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

