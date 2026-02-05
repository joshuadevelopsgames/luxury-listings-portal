import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { 
  FileCode, 
  ListChecks, 
  GitBranch, 
  Code2, 
  Sparkles, 
  ExternalLink,
  Github,
  Star,
  Zap,
  Layers
} from 'lucide-react';

// Import custom demo styles
import './styles.css';

// New UI Components
import ShaderBackground from './components/ui/ShaderBackground';
import GlassCard from './components/ui/GlassCard';
import GradientText from './components/ui/GradientText';
import ModernButton from './components/ui/ModernButton';
import FloatingDock from './components/ui/FloatingDock';
import FeatureCard from './components/ui/FeatureCard';
import Badge from './components/ui/Badge';

// Feature Components
import DiffPreview from './components/DiffPreview';
import PlanMode from './components/PlanMode';
import ChangeTracker from './components/ChangeTracker';
import CodeEditor from './components/CodeEditor';

/**
 * DemoPage - Modern Apple-like demo showcase
 * Redesigned with 21st.dev inspired components
 */
const DemoPage = () => {
  const [activeTab, setActiveTab] = useState('home');

  // Sample data
  const sampleOldCode = `function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price;
  }
  return total;
}`;

  const sampleNewCode = `function calculateTotal(items) {
  if (!items || items.length === 0) {
    return 0;
  }
  return items.reduce((total, item) => {
    return total + (item.price || 0);
  }, 0);
}`;

  const samplePlan = {
    title: 'Refactor calculateTotal function',
    description: 'Improve the calculateTotal function with better error handling and modern JavaScript',
    steps: [
      { description: 'Add null/empty check for items array', category: 'Safety', files: ['src/utils/calculations.js'], completed: false },
      { description: 'Replace for loop with reduce method', category: 'Modernization', files: ['src/utils/calculations.js'], completed: false },
      { description: 'Add null check for item.price', category: 'Safety', files: ['src/utils/calculations.js'], completed: false },
      { description: 'Update unit tests', category: 'Testing', files: ['src/utils/calculations.test.js'], completed: false }
    ],
    markdown: `# Refactor calculateTotal function\n\n## Steps\n1. Add null/empty check\n2. Replace for loop with reduce\n3. Add null check for price\n4. Update tests`
  };

  const sampleChanges = [
    { path: 'src/utils/calculations.js', type: 'modified', additions: 5, deletions: 4, timestamp: Date.now() - 3600000 },
    { path: 'src/utils/calculations.test.js', type: 'added', additions: 15, deletions: 0, timestamp: Date.now() - 1800000 }
  ];

  const features = [
    { id: 'diff', icon: FileCode, title: 'Diff Preview', description: 'Visual code comparison with side-by-side and unified views', gradient: 'from-blue-500 to-cyan-500' },
    { id: 'plan', icon: ListChecks, title: 'Plan Mode', description: 'AI-powered structured planning with clarifying questions', gradient: 'from-indigo-500 to-purple-500', badge: 'AI' },
    { id: 'changes', icon: GitBranch, title: 'Change Tracker', description: 'Git-like change tracking with staging and commits', gradient: 'from-orange-500 to-pink-500' },
    { id: 'editor', icon: Code2, title: 'Code Editor', description: 'Modern code editor with syntax highlighting', gradient: 'from-green-500 to-teal-500' },
  ];

  const stats = [
    { label: 'Components', value: '130+', icon: Layers },
    { label: 'Downloads', value: '50K+', icon: Zap },
    { label: 'Stars', value: '4.6K', icon: Star },
  ];

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'diff':
        return (
          <div className="space-y-8 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
            <div className="text-center max-w-2xl mx-auto">
              <Badge variant="primary" className="mb-4">Diff Preview</Badge>
              <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-3">
                Compare Code Changes
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                See exactly what changes are being made with beautiful side-by-side and unified diff views.
              </p>
            </div>
            <DiffPreview
              oldCode={sampleOldCode}
              newCode={sampleNewCode}
              fileName="src/utils/calculations.js"
              unified={false}
            />
            <DiffPreview
              oldCode={sampleOldCode}
              newCode={sampleNewCode}
              fileName="src/utils/calculations.js"
              unified={true}
            />
          </div>
        );

      case 'plan':
        return (
          <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
            <div className="text-center max-w-2xl mx-auto mb-8">
              <Badge variant="gradient" className="mb-4">AI Powered</Badge>
              <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-3">
                Structured Planning
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                AI asks clarifying questions and builds structured plans before execution.
              </p>
            </div>
            <PlanMode
              plan={samplePlan}
              questions={[
                { id: '1', question: 'Should we maintain backward compatibility?', options: ['Yes', 'No'] },
                { id: '2', question: 'Default return value for empty arrays?', options: ['0', 'null', 'undefined'] }
              ]}
              onApprove={() => toast.success('Plan approved!')}
              onModify={() => toast('Modifying plan...')}
            />
          </div>
        );

      case 'changes':
        return (
          <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
            <div className="text-center max-w-2xl mx-auto mb-8">
              <Badge variant="warning" className="mb-4">Git Integration</Badge>
              <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-3">
                Track Your Changes
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                Visual change tracking with staging, commits, and branch management.
              </p>
            </div>
            <ChangeTracker
              changes={sampleChanges}
              onStage={(path) => console.log('Staging:', path)}
              onCommit={(files) => toast.success(`Committing ${files.length} files`)}
              onDiscard={() => console.log('Discarding...')}
            />
          </div>
        );

      case 'editor':
        return (
          <div className="space-y-8 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
            <div className="text-center max-w-2xl mx-auto">
              <Badge variant="success" className="mb-4">Code Editor</Badge>
              <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-3">
                Modern Code Editing
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                Write and edit code with syntax highlighting and line numbers.
              </p>
            </div>
            <CodeEditor
              initialValue={sampleNewCode}
              language="javascript"
              fileName="calculations.js"
              onSave={(value) => toast.success('Code saved!')}
            />
          </div>
        );

      default:
        return (
          <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
            {/* Hero Section */}
            <div className="text-center max-w-4xl mx-auto mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-sm text-zinc-600 dark:text-zinc-400 mb-6">
                <Sparkles className="w-4 h-4" />
                <span>Inspired by</span>
                <a href="https://21st.dev" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
                  21st.dev
                </a>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
                <GradientText variant="purple" as="span" className="block">
                  Build Beautiful
                </GradientText>
                <span className="text-zinc-900 dark:text-white">
                  Developer Tools
                </span>
              </h1>
              
              <p className="text-xl text-zinc-600 dark:text-zinc-400 mb-8 max-w-2xl mx-auto leading-relaxed">
                A showcase of modern UI components for code review, planning, and change tracking. 
                Designed with Apple-like aesthetics and 21st.dev inspiration.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-4">
                <a href="https://github.com/21st-dev/1Code" target="_blank" rel="noopener noreferrer">
                  <ModernButton variant="gradient" size="lg" glow>
                    <Github className="w-5 h-5" />
                    View on GitHub
                  </ModernButton>
                </a>
                <a href="https://21st.dev" target="_blank" rel="noopener noreferrer">
                  <ModernButton variant="ghost" size="lg">
                    Explore Components
                    <ExternalLink className="w-4 h-4" />
                  </ModernButton>
                </a>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto mb-16">
              {stats.map((stat, idx) => (
                <GlassCard key={idx} className="text-center" hover={false}>
                  <stat.icon className="w-6 h-6 mx-auto mb-2 text-indigo-600 dark:text-indigo-400" />
                  <div className="text-2xl font-bold text-zinc-900 dark:text-white">{stat.value}</div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">{stat.label}</div>
                </GlassCard>
              ))}
            </div>

            {/* Feature Cards */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white text-center mb-8">
                Explore Features
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                {features.map((feature) => (
                  <FeatureCard
                    key={feature.id}
                    icon={feature.icon}
                    title={feature.title}
                    description={feature.description}
                    gradient={feature.gradient}
                    badge={feature.badge}
                    onClick={() => setActiveTab(feature.id)}
                  />
                ))}
              </div>
            </div>

            {/* Tech Stack */}
            <GlassCard className="text-center">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">Built With</h3>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {['React', 'Tailwind CSS', 'Lucide Icons', 'Glassmorphism', 'Gradients'].map((tech) => (
                  <Badge key={tech} variant="glass">{tech}</Badge>
                ))}
              </div>
            </GlassCard>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Background */}
      <ShaderBackground variant="mesh" />

      {/* Main Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12 pb-32">
        {/* Header */}
        <header className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-pink-500 rounded-xl blur-lg opacity-50" />
              <div className="relative w-10 h-10 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
            </div>
            <div>
              <h1 className="font-semibold text-zinc-900 dark:text-white">1Code Demo</h1>
              <p className="text-xs text-zinc-500">Modern UI Components</p>
            </div>
          </div>

          {activeTab !== 'home' && (
            <ModernButton 
              variant="ghost" 
              size="sm"
              onClick={() => setActiveTab('home')}
            >
              ← Back to Home
            </ModernButton>
          )}
        </header>

        {/* Content */}
        {renderContent()}
      </div>

      {/* Floating Dock */}
      <FloatingDock activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default DemoPage;
