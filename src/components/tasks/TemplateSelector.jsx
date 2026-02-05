import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle2, Sparkles, Edit } from 'lucide-react';
import { TASK_TEMPLATES } from '../../data/taskTemplates';
import { DailyTask } from '../../entities/DailyTask';
import { firestoreService } from '../../services/firestoreService';
import { PERMISSIONS } from '../../entities/Permissions';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

const TemplateSelector = ({ onClose, currentUser, onEditTemplate, onTasksCreated }) => {
  const { hasPermission } = useAuth();
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [creating, setCreating] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const canEditTemplates = hasPermission(PERMISSIONS.EDIT_TASK_TEMPLATES);

  // Load templates from Firestore on mount
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const firestoreTemplates = await firestoreService.getTaskTemplates();
        
        // If no templates in Firestore, initialize with defaults
        if (firestoreTemplates.length === 0) {
          await firestoreService.initializeDefaultTemplates(TASK_TEMPLATES);
          const newTemplates = await firestoreService.getTaskTemplates();
          setTemplates(newTemplates);
        } else {
          setTemplates(firestoreTemplates);
        }
      } catch (error) {
        console.error('Error loading templates:', error);
        // Fallback to default templates
        setTemplates(Object.values(TASK_TEMPLATES));
      } finally {
        setLoading(false);
      }
    };

    loadTemplates();
  }, []);

  const handleApplyTemplate = async () => {
    if (!selectedTemplate) return;

    setCreating(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Create all tasks from template
      const promises = selectedTemplate.tasks.map((task, index) => {
        // Spread tasks over the next few days
        const daysOffset = Math.floor(index / 3); // 3 tasks per day
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + daysOffset);
        
        return DailyTask.create({
          title: task.title,
          description: task.description,
          category: task.category,
          priority: task.priority,
          due_date: dueDate.toISOString().split('T')[0],
          estimated_time: task.estimated_time,
          assigned_to: currentUser.email,
          status: 'pending',
          labels: [selectedTemplate.name]
        });
      });

      await Promise.all(promises);
      onTasksCreated?.();
      toast.success(`✨ Created ${selectedTemplate.tasks.length} tasks from template!`);
      onClose();
    } catch (error) {
      console.error('Error applying template:', error);
      toast.error('Failed to create tasks from template');
    } finally {
      setCreating(false);
    }
  };

    if (loading) {
    return createPortal(
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl p-8 text-center border border-black/10 dark:border-white/10 shadow-2xl min-w-[280px]">
          <div className="w-8 h-8 border-2 border-[#34c759] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[15px] text-[#86868b]">Loading templates...</p>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 overflow-y-auto py-8 px-4">
      <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl w-full max-w-5xl mb-8 border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#34c759]/10 dark:bg-[#34c759]/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#34c759]" />
            </div>
            <h2 className="text-[20px] font-semibold text-[#1d1d1f] dark:text-white">Task Templates</h2>
          </div>
          <div className="flex items-center gap-3">
            {canEditTemplates && onEditTemplate && (
              <button
                type="button"
                onClick={() => { onClose(); onEditTemplate(); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[13px] font-medium hover:bg-black/10 dark:hover:bg-white/15 border border-black/10 dark:border-white/10"
              >
                <Edit className="w-4 h-4" />
                Edit Templates
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center transition-colors text-[#86868b]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-[14px] text-[#86868b]">
            Choose a template to quickly create a set of related tasks
            {canEditTemplates && (
              <span className="ml-2 text-[#34c759] font-medium">• You can edit these templates</span>
            )}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => setSelectedTemplate(template)}
                className={`text-left rounded-2xl border p-6 transition-all hover:shadow-lg ${
                  selectedTemplate?.id === template.id
                    ? 'border-[#34c759] shadow-lg bg-[#34c759]/5 dark:bg-[#34c759]/10 ring-2 ring-[#34c759]/30'
                    : 'border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/5 hover:border-black/20 dark:hover:border-white/20'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <span className="text-4xl">{template.icon}</span>
                  {selectedTemplate?.id === template.id && (
                    <CheckCircle2 className="w-5 h-5 text-[#34c759]" />
                  )}
                </div>
                <h3 className="font-semibold text-[#1d1d1f] dark:text-white mb-2">{template.name}</h3>
                <p className="text-[13px] text-[#86868b] mb-3">{template.description}</p>
                <span className="inline-block px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/10 text-[12px] text-[#86868b]">
                  {template.tasks.length} tasks
                </span>
              </button>
            ))}
          </div>

          {selectedTemplate && (
            <div className="border-t border-black/5 dark:border-white/10 pt-6">
              <h3 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white mb-4">
                Tasks in &quot;{selectedTemplate.name}&quot; template:
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto p-4 rounded-xl bg-black/[0.02] dark:bg-white/5 border border-black/5 dark:border-white/10">
                {selectedTemplate.tasks.map((task, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-[#2c2c2e] border border-black/5 dark:border-white/10"
                  >
                    <span className="text-[#86868b] text-[13px] mt-1">{index + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#1d1d1f] dark:text-white">{task.title}</p>
                      {task.description && (
                        <p className="text-[13px] text-[#86868b] mt-0.5">{task.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className={`inline-block px-2 py-0.5 rounded-lg text-[11px] font-medium ${
                          task.priority === 'high' ? 'bg-[#ff9500]/10 text-[#ff9500]' :
                          task.priority === 'medium' ? 'bg-[#0071e3]/10 text-[#0071e3]' :
                          'bg-black/5 dark:bg-white/10 text-[#86868b]'
                        }`}>
                          {task.priority}
                        </span>
                        <span className="text-[12px] text-[#86868b]">⏱ {task.estimated_time}m</span>
                        <span className="text-[12px] text-[#86868b]">📁 {task.category}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-black/5 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[14px] font-medium hover:bg-black/10 dark:hover:bg-white/15"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplyTemplate}
              disabled={!selectedTemplate || creating}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#34c759] text-white text-[14px] font-medium hover:bg-[#2db14e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" />
              {creating ? 'Creating Tasks...' : 'Apply Template'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default TemplateSelector;

