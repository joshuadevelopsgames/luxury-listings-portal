import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle2, Sparkles, Edit, Folder } from 'lucide-react';
import { getTemplateIcon } from './templateIcons';
import { TASK_TEMPLATES } from '../../data/taskTemplates';
import { DailyTask } from '../../entities/DailyTask';
import { supabaseService } from '../../services/supabaseService';
import { toast } from 'react-hot-toast';

const TemplateSelector = ({ onClose, currentUser, onEditTemplate, onTasksCreated }) => {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [creating, setCreating] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const userEmail = (currentUser?.email || '').toLowerCase().trim();

  // Load templates for this user (own + shared with them)
  useEffect(() => {
    const loadTemplates = async () => {
      if (!userEmail) {
        setLoading(false);
        return;
      }
      try {
        let list = await supabaseService.getTaskTemplates(userEmail);
        if (list.length === 0) {
          await supabaseService.initializeDefaultTemplates(TASK_TEMPLATES, userEmail);
          list = await supabaseService.getTaskTemplates(userEmail);
        }
        setTemplates(list);
      } catch (error) {
        console.error('Error loading templates:', error);
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    };
    loadTemplates();
  }, [userEmail]);

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
      toast.success(`Created ${selectedTemplate.tasks.length} tasks from template!`);
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
        <div className="bg-surface rounded-xl p-8 text-center border border-hairline-strong shadow-lg min-w-[280px]">
          <div className="w-8 h-8 border-2 border-positive border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[15px] text-ink-muted">Loading templates...</p>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 overflow-y-auto py-8 px-4">
      <div className="bg-surface rounded-xl w-full max-w-5xl mb-8 border border-hairline-strong shadow-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-hairline flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-positive/10 dark:bg-positive/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-positive" />
            </div>
            <h2 className="text-[20px] font-semibold text-ink">Task Templates</h2>
          </div>
          <div className="flex items-center gap-3">
            {onEditTemplate && (
              <button
                type="button"
                onClick={() => { onClose(); onEditTemplate(); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-3 text-ink text-[13px] font-medium hover:bg-hairline-strong border border-hairline-strong"
              >
                <Edit className="w-4 h-4" />
                My Templates
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-surface-3 flex items-center justify-center transition-colors text-ink-muted"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-[14px] text-ink-muted">
            Choose a template to quickly create a set of related tasks. You see your own templates and any shared with you.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => setSelectedTemplate(template)}
                className={`text-left rounded-xl border p-6 transition-all hover:shadow-md ${
                  selectedTemplate?.id === template.id
                    ? 'border-positive shadow-lg bg-positive/5 dark:bg-positive/10 ring-2 ring-positive/30'
                    : 'border-hairline-strong bg-surface-2 hover:border-hairline-strong'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  {React.createElement(getTemplateIcon(template.icon), { className: "w-6 h-6 text-ink-muted" })}
                  {selectedTemplate?.id === template.id && (
                    <CheckCircle2 className="w-5 h-5 text-positive" />
                  )}
                </div>
                <h3 className="font-semibold text-ink mb-2">{template.name}</h3>
                {template.isOwner === false && template.ownerEmail && (
                  <p className="text-[11px] text-brand mb-1">Shared with you by {template.ownerEmail}</p>
                )}
                <p className="text-[13px] text-ink-muted mb-3">{template.description}</p>
                <span className="inline-block px-2.5 py-1 rounded-lg bg-surface-3 text-[12px] text-ink-muted">
                  {template.tasks.length} tasks
                </span>
              </button>
            ))}
          </div>

          {selectedTemplate && (
            <div className="border-t border-hairline pt-6">
              <h3 className="text-[17px] font-semibold text-ink mb-4">
                Tasks in &quot;{selectedTemplate.name}&quot; template:
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto p-4 rounded-xl bg-surface-2 border border-hairline">
                {selectedTemplate.tasks.map((task, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-xl bg-surface border border-hairline"
                  >
                    <span className="text-ink-muted text-[13px] mt-1">{index + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-ink">{task.title}</p>
                      {task.description && (
                        <p className="text-[13px] text-ink-muted mt-0.5">{task.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className={`inline-block px-2 py-0.5 rounded-lg text-[11px] font-medium ${
                          task.priority === 'high' ? 'bg-warning/10 text-warning' :
                          task.priority === 'medium' ? 'bg-brand/10 text-brand' :
                          'bg-surface-3 text-ink-muted'
                        }`}>
                          {task.priority}
                        </span>
                        <span className="text-[12px] text-ink-muted">⏱ {task.estimated_time}m</span>
                        <span className="text-[12px] text-ink-muted inline-flex items-center gap-1"><Folder className="w-3 h-3" />{task.category}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-hairline">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-surface-3 text-ink text-[14px] font-medium hover:bg-hairline-strong"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplyTemplate}
              disabled={!selectedTemplate || creating}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-positive text-white text-[14px] font-medium hover:bg-positive transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

