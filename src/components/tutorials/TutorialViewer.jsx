import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  ArrowLeft,
  Play,
  Pause,
  FileText,
  Video,
  ExternalLink,
  Star,
  Trophy
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const TutorialViewer = ({ tutorial, progress, onComplete, onBack }) => {
  const [currentSection, setCurrentSection] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeSpent, setTimeSpent] = useState(progress.timeSpent || 0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizScore, setQuizScore] = useState(0);

  // Prefer real tutorial content from the entity; fallback to placeholders
  const hasCustomSections = Array.isArray(tutorial?.content?.sections) && tutorial.content.sections.length > 0;
  const perSectionMinutes = hasCustomSections
    ? Math.max(1, Math.round((tutorial.estimated_time || 0) / tutorial.content.sections.length))
    : 5;

  const fallbackSections = [
    {
      id: 1,
      title: 'Introduction',
      content: `# Welcome to ${tutorial.title}\n\nThis tutorial will guide you through the essential concepts and practical steps to get you up and running.\n\n## What You'll Learn\n\n- Key concepts and terminology\n- Step-by-step procedures\n- Best practices and tips\n- Common pitfalls to avoid\n\n## Prerequisites\n\n${tutorial.prerequisites.length > 0 ? `Make sure you've completed the following tutorials first:\n${tutorial.prerequisites.map(id => `- Tutorial ${id}`).join('\n')}` : 'No prerequisites required - you can start right away!'}\n\n## Estimated Time\n\nThis tutorial should take approximately **${tutorial.formattedTime}** to complete.`,
      type: 'markdown',
      duration: perSectionMinutes
    }
  ];

  const tutorialSections = hasCustomSections
    ? tutorial.content.sections.map((section, index) => ({
        id: index + 1,
        title: section.title || `Section ${index + 1}`,
        content: section.content || '',
        type: 'markdown',
        duration: perSectionMinutes
      }))
    : fallbackSections;

  // Timer effect for tracking time spent
  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        setTimeSpent(prev => prev + 1);
      }, 60000); // Update every minute
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleSectionChange = (direction) => {
    if (direction === 'next' && currentSection < tutorialSections.length - 1) {
      setCurrentSection(currentSection + 1);
    } else if (direction === 'prev' && currentSection > 0) {
      setCurrentSection(currentSection - 1);
    }
  };

  const handleQuizSubmit = () => {
    // Simple quiz scoring - in a real app, this would be more sophisticated
    let score = 0;
    if (quizAnswers.q1 === 'B') score += 33;
    if (quizAnswers.q2 === 'B') score += 33;
    if (quizAnswers.q3 === 'C') score += 34;
    
    setQuizScore(score);
    setShowQuiz(false);
  };

  const handleComplete = async () => {
    // Update progress with final time spent
    await onComplete();
  };

  const currentSectionData = tutorialSections[currentSection];
  const progressPercentage = ((currentSection + 1) / tutorialSections.length) * 100;
  const isLastSection = currentSection === tutorialSections.length - 1;
  const requiresQuiz = tutorialSections.some(s => s.type === 'quiz');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={onBack}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Tutorials
              </Button>
              
              <div className="h-6 w-px bg-gray-300" />
              
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {tutorial.title}
                </h1>
                <p className="text-sm text-gray-500">
                  Section {currentSection + 1} of {tutorialSections.length}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Time Spent</p>
                <p className="text-lg font-semibold text-gray-900">
                  {Math.floor(timeSpent / 60)}h {timeSpent % 60}m
                </p>
              </div>
              
              <Button
                variant={isPlaying ? "outline" : "default"}
                size="sm"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                {isPlaying ? 'Pause' : 'Resume'}
              </Button>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tutorial Sections</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {tutorialSections.map((section, index) => (
                  <button
                    key={section.id}
                    onClick={() => setCurrentSection(index)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      currentSection === index
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        currentSection === index
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{section.title}</p>
                        <p className="text-xs text-gray-500">{section.duration} min</p>
                      </div>
                      {index < currentSection && (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
            
            {/* Tutorial info */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Tutorial Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm text-gray-600">
                    Difficulty: {tutorial.difficulty}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-gray-600">
                    Estimated: {tutorial.formattedTime}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-600">
                    Category: {tutorial.category}
                  </span>
                </div>
                {tutorial.isRequired && (
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-red-600 font-medium">
                      Required for onboarding
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main content area */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl">
                    {currentSectionData.title}
                  </CardTitle>
                  <Badge variant="outline">
                    {currentSectionData.type === 'quiz' ? 'Assessment' : 'Content'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="prose prose-gray max-w-none">
                {currentSectionData.type === 'quiz' ? (
                  <div className="space-y-6">
                    <ReactMarkdown>{currentSectionData.content}</ReactMarkdown>
                    
                    {!showQuiz ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-blue-800">
                            Ready to test your knowledge? Click the button below to start the quiz.
                          </p>
                        </div>
                        <Button onClick={() => setShowQuiz(true)} className="w-full">
                          Start Quiz
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-4">
                          <div>
                            <p className="font-medium mb-2">Question 1:</p>
                            <p className="mb-3">What is the most important first step in any procedure?</p>
                            <div className="space-y-2">
                              {['A', 'B', 'C', 'D'].map((option) => (
                                <label key={option} className="flex items-center gap-3 cursor-pointer">
                                  <input
                                    type="radio"
                                    name="q1"
                                    value={option}
                                    checked={quizAnswers.q1 === option}
                                    onChange={(e) => setQuizAnswers(prev => ({ ...prev, q1: e.target.value }))}
                                    className="w-4 h-4 text-blue-600"
                                  />
                                  <span className="text-sm">
                                    {option}) {option === 'A' ? 'Start immediately' : 
                                             option === 'B' ? 'Review safety guidelines' :
                                             option === 'C' ? 'Ask a colleague' : 'Skip to the end'}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <p className="font-medium mb-2">Question 2:</p>
                            <p className="mb-3">Which of the following is a best practice?</p>
                            <div className="space-y-2">
                              {['A', 'B', 'C', 'D'].map((option) => (
                                <label key={option} className="flex items-center gap-3 cursor-pointer">
                                  <input
                                    type="radio"
                                    name="q2"
                                    value={option}
                                    checked={quizAnswers.q2 === option}
                                    onChange={(e) => setQuizAnswers(prev => ({ ...prev, q2: e.target.value }))}
                                    className="w-4 h-4 text-blue-600"
                                  />
                                  <span className="text-sm">
                                    {option}) {option === 'A' ? 'Rushing through steps' :
                                             option === 'B' ? 'Documenting your progress' :
                                             option === 'C' ? 'Ignoring warnings' : 'Working alone always'}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <p className="font-medium mb-2">Question 3:</p>
                            <p className="mb-3">What should you do if you're unsure about a step?</p>
                            <div className="space-y-2">
                              {['A', 'B', 'C', 'D'].map((option) => (
                                <label key={option} className="flex items-center gap-3 cursor-pointer">
                                  <input
                                    type="radio"
                                    name="q3"
                                    value={option}
                                    checked={quizAnswers.q3 === option}
                                    onChange={(e) => setQuizAnswers(prev => ({ ...prev, q3: e.target.value }))}
                                    className="w-4 h-4 text-blue-600"
                                  />
                                  <span className="text-sm">
                                    {option}) {option === 'A' ? 'Guess and continue' :
                                             option === 'B' ? 'Skip it entirely' :
                                             option === 'C' ? 'Ask for clarification' : 'Pretend you understand'}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        <Button onClick={handleQuizSubmit} className="w-full">
                          Submit Quiz
                        </Button>
                      </div>
                    )}
                    
                    {quizScore > 0 && (
                      <div className={`p-4 rounded-lg border ${
                        quizScore >= 80 ? 'bg-green-50 border-green-200' :
                        quizScore >= 60 ? 'bg-yellow-50 border-yellow-200' :
                        'bg-red-50 border-red-200'
                      }`}>
                        <div className="text-center">
                          <h3 className="font-semibold text-lg mb-2">Quiz Results</h3>
                          <p className={`text-2xl font-bold ${
                            quizScore >= 80 ? 'text-green-700' :
                            quizScore >= 60 ? 'text-yellow-700' :
                            'text-red-700'
                          }`}>
                            {quizScore}%
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {quizScore >= 80 ? 'Excellent! You have a strong understanding.' :
                             quizScore >= 60 ? 'Good work! Review the material to improve.' :
                             'Keep studying! Review the tutorial content and try again.'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <ReactMarkdown>{currentSectionData.content}</ReactMarkdown>
                )}
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6">
              <Button
                variant="outline"
                onClick={() => handleSectionChange('prev')}
                disabled={currentSection === 0}
              >
                Previous Section
              </Button>
              
              <div className="flex items-center gap-3">
                {isLastSection ? (
                  <Button 
                    onClick={handleComplete}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={requiresQuiz && quizScore === 0}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Complete Tutorial
                  </Button>
                ) : (
                  <Button 
                    onClick={() => handleSectionChange('next')}
                    disabled={currentSection === tutorialSections.length - 1}
                  >
                    Next Section
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorialViewer;
