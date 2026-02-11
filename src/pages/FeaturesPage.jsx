import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Target,
  ArrowRight,
  GitBranch,
  Star,
  Filter,
  FileSpreadsheet,
  Shield,
  Zap,
  Users,
  BarChart3,
  Mail,
  MessageSquare,
  CheckSquare,
  LayoutDashboard,
  Plug,
  FileText,
  Smartphone,
  Send,
  Palette,
  FolderOpen,
  BookOpen,
  Trophy,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { User } from '../entities/User';
import { Tutorial, TutorialProgress } from '../entities/index';
import TutorialCard from '../components/tutorials/TutorialCard';
import TutorialViewer from '../components/tutorials/TutorialViewer';

const categoryColors = {
  strategy: 'bg-[#0071e3]/10 text-[#0071e3]',
  'content-creation': 'bg-[#af52de]/10 text-[#af52de]',
  platforms: 'bg-[#34c759]/10 text-[#34c759]',
  community: 'bg-[#ff9500]/10 text-[#ff9500]',
  advertising: 'bg-[#ff3b30]/10 text-[#ff3b30]',
  analytics: 'bg-[#5856d6]/10 text-[#5856d6]',
  'influencer-marketing': 'bg-[#ff2d55]/10 text-[#ff2d55]',
  'crisis-management': 'bg-[#ffcc00]/10 text-[#ffcc00]',
  tools: 'bg-[#30b0c7]/10 text-[#30b0c7]',
  trends: 'bg-[#64d2ff]/10 text-[#64d2ff]',
  'admin-portal': 'bg-[#ff3b30]/10 text-[#ff3b30]',
};

const salesCrmFeatures = [
  {
    icon: GitBranch,
    title: 'Sales Pipeline',
    description: 'Track deals through qualification, proposal, negotiation, and closing. Pipeline value and weighted forecasts.',
  },
  {
    icon: Target,
    title: 'Lead Management',
    description: 'Hot / warm / cold lead buckets with scoring, source tracking (website, referral, social, events), and status.',
  },
  {
    icon: FileSpreadsheet,
    title: 'Google Sheets CRM Sync',
    description: 'Two-way sync with your Sheets: Warm Leads, Cold Leads, and Contacted Clients tabs. Use your existing workflow.',
  },
  {
    icon: Star,
    title: 'Lead Scoring',
    description: 'Score leads by engagement and fit. Filter and prioritize by score bands for follow-up.',
  },
  {
    icon: Users,
    title: 'Lead-to-Client Conversion',
    description: 'Convert qualified leads to portal clients. Link contacts to existing clients and avoid duplicates.',
  },
  {
    icon: BarChart3,
    title: 'Pipeline Analytics',
    description: 'Total pipeline value, deal count by stage, and weighted value for forecasting.',
  },
  {
    icon: Filter,
    title: 'Custom Pipeline Stages',
    description: 'Configure deal stages and probabilities to match your sales process.',
  },
  {
    icon: Shield,
    title: 'CRM Permissions',
    description: 'Role-based access: view leads, manage leads, view pipeline, and full CRM management.',
  },
  {
    icon: Zap,
    title: 'Quick Add Lead / Deal',
    description: 'Add leads or deals from the portal with contact details, value, and stage in one form.',
  },
];

const addOnFeatures = [
  {
    icon: Mail,
    title: 'Email & Sequence Automation',
    description: 'Multi-step drip sequences by segment (e.g. lead source or score). Schedule touchpoints and keep follow-up consistent.',
  },
  {
    icon: MessageSquare,
    title: 'Interaction Timeline',
    description: 'Log emails, calls, meetings, and notes per lead or contact in one place. See full history at a glance.',
  },
  {
    icon: CheckSquare,
    title: 'Tasks & Reminders',
    description: 'Tasks tied to leads and deals — follow-ups, content deadlines, reviews. Due dates and assignees.',
  },
  {
    icon: LayoutDashboard,
    title: 'Reporting & Dashboards',
    description: 'Pre-built reports: pipeline by stage, lead source mix, conversion by source. Optional client-facing views.',
  },
  {
    icon: Plug,
    title: 'Integrations',
    description: 'Connect Calendly or Cal.com for booking, Mailchimp or similar for campaigns, Zapier or Make for automation.',
  },
  {
    icon: FileText,
    title: 'Research Notes & Sales Insights',
    description: 'Per-lead or per-account notes, pain points, and opportunities. Keep context in one place.',
  },
  {
    icon: Smartphone,
    title: 'Mobile Companion',
    description: 'Light mobile view or app for checking pipeline, tasks, and logging quick touches on the go.',
  },
];

const contentCollaborationFeatures = [
  {
    icon: Send,
    title: 'Client Approval Workflow',
    description: 'Submit content for client review, track approval status and version history. Email or in-portal approval.',
  },
  {
    icon: Palette,
    title: 'Brand Asset Storage',
    description: 'Store client brand guidelines, logos, color codes, and voice/tone in the portal for quick reference.',
  },
  {
    icon: FolderOpen,
    title: 'Content Library',
    description: 'Centralized assets by client and campaign. Tag and filter by platform or theme for reuse.',
  },
];

export default function FeaturesPage() {
  const { currentRole } = useAuth();
  const [user, setUser] = useState(null);
  const [tutorials, setTutorials] = useState([]);
  const [progress, setProgress] = useState([]);
  const [selectedTutorial, setSelectedTutorial] = useState(null);
  const [tutorialsLoading, setTutorialsLoading] = useState(true);
  const [initialTutorialId, setInitialTutorialId] = useState(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tutorialId = urlParams.get('tutorial');
    if (tutorialId) setInitialTutorialId(tutorialId);
    loadTutorials();
  }, []);

  useEffect(() => {
    if (initialTutorialId && tutorials.length > 0) {
      const tutorial = tutorials.find((t) => t.id === initialTutorialId);
      if (tutorial) {
        setSelectedTutorial(tutorial);
        setInitialTutorialId(null);
      }
    }
  }, [initialTutorialId, tutorials]);

  const loadTutorials = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);
      const [tutorialsData, progressData] = await Promise.all([
        Tutorial.list('order_index', currentRole),
        TutorialProgress.filter({ user_email: currentUser.email }),
      ]);
      setTutorials(tutorialsData);
      setProgress(progressData);
    } catch (e) {
      console.error('Error loading tutorials:', e);
    } finally {
      setTutorialsLoading(false);
    }
  };

  const getTutorialProgress = (tutorialId) =>
    progress.find((p) => p.tutorial_id === tutorialId) || {
      status: 'not_started',
      tutorial_id: tutorialId,
      user_email: user?.email,
    };

  const startTutorial = async (tutorial) => {
    const existing = getTutorialProgress(tutorial.id);
    if (existing.status === 'not_started') {
      await TutorialProgress.create({
        user_email: user.email,
        tutorial_id: tutorial.id,
        status: 'in_progress',
        started_at: new Date().toISOString(),
      });
      await loadTutorials();
    }
    setSelectedTutorial(tutorial);
  };

  const completeTutorial = async (tutorialId) => {
    const existing = getTutorialProgress(tutorialId);
    if (existing.id) {
      await TutorialProgress.update(existing.id, {
        status: 'completed',
        completed_at: new Date().toISOString(),
      });
    } else {
      await TutorialProgress.create({
        user_email: user.email,
        tutorial_id: tutorialId,
        status: 'completed',
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      });
    }
    await loadTutorials();
    setSelectedTutorial(null);
  };

  const getOverallProgress = () => {
    const completed = progress.filter((p) => p.status === 'completed').length;
    return tutorials.length > 0 ? Math.round((completed / tutorials.length) * 100) : 0;
  };

  const groupedTutorials = tutorials.reduce((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {});

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
    <div className="min-h-screen relative">
      {/* Full-viewport gradient (fixed so it fills the whole content area) */}
      <div className="fixed inset-0 -z-10 bg-[#f5f5f7] dark:bg-[#1d1d1f]" style={{ minHeight: '100vh', minWidth: '100vw' }} />
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-blue-50/80 via-transparent to-purple-50/50 dark:from-blue-950/30 dark:via-transparent dark:to-purple-950/20" style={{ minHeight: '100vh', minWidth: '100vw' }} />
      <div className="fixed top-[-20%] right-[-10%] w-[800px] h-[800px] rounded-full bg-gradient-to-br from-[#0071e3]/10 to-[#5856d6]/10 blur-3xl -z-10" />
      <div className="fixed bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[#5856d6]/10 to-[#ff2d55]/10 blur-3xl -z-10" />

      <div className="relative max-w-5xl mx-auto px-6 py-12 sm:py-16">
        <Link
          to="/resources"
          className="inline-flex items-center gap-2 text-[13px] text-[#0071e3] dark:text-[#0a84ff] font-medium mb-10 hover:underline"
        >
          <ArrowRight className="w-4 h-4 rotate-180" />
          Back to Resources
        </Link>

        <header className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 dark:bg-white/10 backdrop-blur border border-black/5 dark:border-white/10 mb-6">
            <Sparkles className="w-4 h-4 text-[#0071e3] dark:text-[#0a84ff]" />
            <span className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">Add-ons</span>
          </div>
          <h1 className="text-[40px] sm:text-[56px] font-semibold text-[#1d1d1f] dark:text-white leading-[1.05] tracking-[-0.03em] mb-5">
            Power up your{' '}
            <span className="bg-gradient-to-r from-[#0071e3] to-[#5856d6] bg-clip-text text-transparent">
              portal
            </span>
          </h1>
          <p className="text-[19px] text-[#86868b] max-w-2xl mx-auto leading-relaxed">
            Potential add-ons for your portal — built on the same codebase so we can turn them on quickly and quote accurately.
          </p>
        </header>

        <section>
          <h2 className="text-[22px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em] mb-6">
            Sales and CRM Improvements
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {salesCrmFeatures.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={idx}
                  className="p-6 rounded-2xl bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-black/5 dark:border-white/10 hover:border-[#0071e3]/20 dark:hover:border-[#0a84ff]/30 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0071e3] to-[#5856d6] flex items-center justify-center mb-4 shadow-lg shadow-[#0071e3]/20">
                    <Icon className="w-5 h-5 text-white" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-semibold text-[17px] text-[#1d1d1f] dark:text-white mb-2">{feature.title}</h3>
                  <p className="text-[14px] text-[#86868b] leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-16">
          <h2 className="text-[22px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em] mb-6">
            Content & Collaboration
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {contentCollaborationFeatures.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={idx}
                  className="p-6 rounded-2xl bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-black/5 dark:border-white/10 hover:border-[#0071e3]/20 dark:hover:border-[#0a84ff]/30 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0071e3] to-[#5856d6] flex items-center justify-center mb-4 shadow-lg shadow-[#0071e3]/20">
                    <Icon className="w-5 h-5 text-white" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-semibold text-[17px] text-[#1d1d1f] dark:text-white mb-2">{feature.title}</h3>
                  <p className="text-[14px] text-[#86868b] leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-16">
          <h2 className="text-[22px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em] mb-6">
            Automation & Engagement
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {addOnFeatures.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={idx}
                  className="p-6 rounded-2xl bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-black/5 dark:border-white/10 hover:border-[#0071e3]/20 dark:hover:border-[#0a84ff]/30 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0071e3] to-[#5856d6] flex items-center justify-center mb-4 shadow-lg shadow-[#0071e3]/20">
                    <Icon className="w-5 h-5 text-white" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-semibold text-[17px] text-[#1d1d1f] dark:text-white mb-2">{feature.title}</h3>
                  <p className="text-[14px] text-[#86868b] leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section id="tutorials" className="mt-16">
          <h2 className="text-[22px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em] mb-2">
            Tutorials & Training
          </h2>
          <p className="text-[15px] text-[#86868b] mb-6">Step-by-step guides to get up to speed with our systems.</p>
          {tutorialsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-white/50 dark:bg-white/5 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : tutorials.length === 0 ? (
            <p className="text-[14px] text-[#86868b]">No tutorials available yet.</p>
          ) : (
            <>
              <div className="flex items-center gap-3 bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-2xl p-4 mb-6 w-fit">
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
              <div className="space-y-8">
                {Object.entries(groupedTutorials).map(([category, categoryTutorials]) => (
                  <div key={category}>
                    <div className="flex items-center gap-2 mb-4">
                      <span className={`text-[12px] px-3 py-1 rounded-lg font-medium ${categoryColors[category] || 'bg-black/10 text-[#1d1d1f]'}`}>
                        {category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, ' ')}
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
            </>
          )}
        </section>

        <div className="mt-16 text-center">
          <p className="text-[15px] text-[#86868b] mb-2">Want to add any of these to your package?</p>
          <p className="text-[13px] text-[#86868b]">
            Contact your account manager or sales to get a tailored quote.
          </p>
        </div>
      </div>
    </div>
  );
}
