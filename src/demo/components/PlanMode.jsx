import React, { useState } from 'react';
import { CheckCircle2, Circle, HelpCircle, Play, Edit2, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import GlassCard from './ui/GlassCard';
import ModernButton from './ui/ModernButton';
import Badge from './ui/Badge';
import GradientText from './ui/GradientText';

/**
 * PlanMode Component - Apple-style structured planning interface
 * Redesigned with 21st.dev inspired components
 */
const PlanMode = ({ 
  plan, 
  questions = [], 
  onApprove, 
  onModify,
  editable = false 
}) => {
  const [selectedStep, setSelectedStep] = useState(null);
  const [answers, setAnswers] = useState({});
  const [showPreview, setShowPreview] = useState(false);
  const [completedSteps, setCompletedSteps] = useState(new Set());

  const handleAnswer = (questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const toggleStep = (idx) => {
    setSelectedStep(selectedStep === idx ? null : idx);
  };

  const toggleComplete = (idx, e) => {
    e.stopPropagation();
    setCompletedSteps(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const steps = Array.isArray(plan) ? plan : plan?.steps || [];
  const title = plan?.title || 'Execution Plan';
  const description = plan?.description || '';

  const categoryColors = {
    'Safety': 'from-orange-500 to-red-500',
    'Modernization': 'from-blue-500 to-indigo-500',
    'Testing': 'from-green-500 to-teal-500',
    'default': 'from-indigo-500 to-purple-500'
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <GlassCard>
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
              <HelpCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-1">
                {title}
              </h2>
              {description && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="gradient">{steps.length} Steps</Badge>
            <Badge variant="default">{completedSteps.size} Done</Badge>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-zinc-600 dark:text-zinc-400">Progress</span>
            <span className="font-medium text-zinc-900 dark:text-white">
              {Math.round((completedSteps.size / steps.length) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-500"
              style={{ width: `${(completedSteps.size / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Clarifying Questions */}
        {questions.length > 0 && (
          <div className="border-t border-zinc-200/50 dark:border-zinc-700/50 pt-6">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-indigo-500" />
              Clarifying Questions
            </h3>
            <div className="space-y-4">
              {questions.map((q, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                  <p className="text-sm font-medium text-zinc-900 dark:text-white mb-3">{q.question}</p>
                  <div className="flex flex-wrap gap-2">
                    {q.options?.map((opt, optIdx) => (
                      <button
                        key={optIdx}
                        onClick={() => handleAnswer(q.id, opt)}
                        className={`
                          px-4 py-2 rounded-lg text-sm font-medium transition-all
                          ${answers[q.id] === opt 
                            ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-purple-500/25' 
                            : 'bg-white dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-600 border border-zinc-200 dark:border-zinc-600'
                          }
                        `}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </GlassCard>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step, idx) => {
          const isSelected = selectedStep === idx;
          const isCompleted = completedSteps.has(idx);
          const gradient = categoryColors[step.category] || categoryColors.default;

          return (
            <GlassCard
              key={idx}
              padding="p-0"
              className={`cursor-pointer ${isSelected ? 'ring-2 ring-indigo-500' : ''}`}
            >
              <div 
                className="p-4 flex items-start gap-4"
                onClick={() => toggleStep(idx)}
              >
                {/* Checkbox */}
                <button
                  onClick={(e) => toggleComplete(idx, e)}
                  className={`
                    w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-all
                    ${isCompleted 
                      ? 'bg-gradient-to-r from-green-500 to-teal-500 text-white' 
                      : 'border-2 border-zinc-300 dark:border-zinc-600 hover:border-indigo-500'
                    }
                  `}
                >
                  {isCompleted && <CheckCircle2 className="w-4 h-4" />}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-zinc-500">Step {idx + 1}</span>
                    {step.category && (
                      <Badge variant="glass" size="sm" className={`bg-gradient-to-r ${gradient} text-white border-0`}>
                        {step.category}
                      </Badge>
                    )}
                  </div>
                  <p className={`text-sm font-medium ${isCompleted ? 'line-through text-zinc-400' : 'text-zinc-900 dark:text-white'}`}>
                    {step.description}
                  </p>
                  {step.files && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {step.files.map((file, fileIdx) => (
                        <span key={fileIdx} className="text-xs px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono">
                          {file}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Expand Icon */}
                <div className="shrink-0">
                  {isSelected ? (
                    <ChevronDown className="w-5 h-5 text-zinc-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-zinc-400" />
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              {isSelected && step.details && (
                <div className="px-4 pb-4 pt-0 ml-10 border-t border-zinc-200/50 dark:border-zinc-700/50 mt-2 pt-4">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">{step.details}</p>
                </div>
              )}
            </GlassCard>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4">
        <ModernButton
          variant="ghost"
          onClick={() => setShowPreview(!showPreview)}
        >
          <FileText className="w-4 h-4" />
          {showPreview ? 'Hide' : 'Show'} Preview
        </ModernButton>
        
        <div className="flex gap-3">
          {onModify && (
            <ModernButton variant="ghost" onClick={onModify}>
              <Edit2 className="w-4 h-4" />
              Modify
            </ModernButton>
          )}
          {onApprove && (
            <ModernButton variant="gradient" onClick={onApprove} glow>
              <Play className="w-4 h-4" />
              Approve & Execute
            </ModernButton>
          )}
        </div>
      </div>

      {/* Markdown Preview */}
      {showPreview && plan?.markdown && (
        <GlassCard>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">Plan Preview</h3>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{plan.markdown}</ReactMarkdown>
          </div>
        </GlassCard>
      )}
    </div>
  );
};

export default PlanMode;
