import React, { useState, useEffect } from "react";
import { User } from "../entities/User";
import { Tutorial, TutorialProgress } from "../entities/index";
import { useAuth } from "../contexts/AuthContext";
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
import { PERMISSIONS } from "../entities/Permissions";

const categoryColors = {
  strategy: "bg-[#0071e3]/10 text-[#0071e3]",
  "content-creation": "bg-[#af52de]/10 text-[#af52de]", 
  platforms: "bg-[#34c759]/10 text-[#34c759]",
  community: "bg-[#ff9500]/10 text-[#ff9500]",
  advertising: "bg-[#ff3b30]/10 text-[#ff3b30]",
  analytics: "bg-[#5856d6]/10 text-[#5856d6]",
  "influencer-marketing": "bg-[#ff2d55]/10 text-[#ff2d55]",
  "crisis-management": "bg-[#ffcc00]/10 text-[#ffcc00]",
  tools: "bg-[#30b0c7]/10 text-[#30b0c7]",
  trends: "bg-[#64d2ff]/10 text-[#64d2ff]",
  "admin-portal": "bg-[#ff3b30]/10 text-[#ff3b30]"
};

export default function TutorialsPage() {
  const { currentRole, hasPermission } = useAuth();
  
  // Check permissions
  const canManageTutorials = hasPermission(PERMISSIONS.MANAGE_TUTORIALS);
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
      <div className="space-y-6 sm:space-y-8">
        <div className="h-8 bg-black/5 dark:bg-white/10 rounded-xl animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-black/5 dark:bg-white/10 rounded-2xl animate-pulse"></div>
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
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] sm:text-[34px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em]">Training Tutorials</h1>
          <p className="text-[15px] text-[#86868b] mt-1">Complete these modules to get up to speed with our systems</p>
        </div>
        <div className="flex items-center gap-3 bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-2xl p-4">
          <Trophy className="w-6 h-6 text-[#ffcc00]" />
          <div>
            <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">Overall Progress</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-24 h-2 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#34c759] rounded-full transition-all"
                  style={{ width: `${getOverallProgress()}%` }}
                />
              </div>
              <span className="text-[13px] font-semibold text-[#1d1d1f] dark:text-white">{getOverallProgress()}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {Object.entries(groupedTutorials).map(([category, categoryTutorials]) => (
          <div key={category}>
            <div className="flex items-center gap-2 mb-4">
              <span className={`text-[12px] px-3 py-1 rounded-lg font-medium ${categoryColors[category]}`}>
                {category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ')}
              </span>
              <span className="text-[13px] text-[#86868b]">
                {categoryTutorials.length} tutorial{categoryTutorials.length !== 1 ? 's' : ''}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

