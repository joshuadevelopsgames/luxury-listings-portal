import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Edit, Trash2, Save, Sparkles, Share2 } from 'lucide-react';
import { firestoreService } from '../../services/firestoreService';
import { toast } from 'react-hot-toast';
import { useConfirm } from '../../contexts/ConfirmContext';

const TEMPLATE_ICONS = ['👋', '📊', '✍️', '📱', '🏡', '🎯', '💼', '🎨', '📈', '🎉', '⚡', '🚀'];

const inputClass = 'w-full h-11 px-4 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]';
const labelClass = 'block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2';

const TemplateEditor = ({ onClose, currentUser }) => {
  const { confirm } = useConfirm();
  const userEmail = (currentUser?.email || '').toLowerCase().trim();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [shareModal, setShareModal] = useState(null);
  const [shareEmail, setShareEmail] = useState('');
  const [sharing, setSharing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '✍️',
    tasks: []
  });
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    estimated_time: 30,
    category: 'Training'
  });

  useEffect(() => {
    loadTemplates();
  }, [userEmail]);

  const loadTemplates = async () => {
    if (!userEmail) {
      setLoading(false);
      return;
    }
    try {
      const list = await firestoreService.getTaskTemplates(userEmail);
      setTemplates(list);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!formData.name || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (formData.tasks.length === 0) {
      toast.error('Please add at least one task to the template');
      return;
    }
    try {
      if (editingTemplate) {
        await firestoreService.updateTaskTemplate(editingTemplate.id, formData);
        toast.success('Template updated successfully!');
      } else {
        await firestoreService.createTaskTemplate({ ...formData, ownerEmail: userEmail });
        toast.success('Template created successfully!');
      }
      await loadTemplates();
      setEditingTemplate(null);
      setIsCreating(false);
      setFormData({ name: '', description: '', icon: '✍️', tasks: [] });
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    const confirmed = await confirm({ title: 'Delete template', message: 'Are you sure you want to delete this template?', confirmText: 'Delete', variant: 'danger' });
    if (!confirmed) return;
    try {
      await firestoreService.deleteTaskTemplate(templateId);
      toast.success('Template deleted successfully!');
      await loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  const handleShareTemplate = async () => {
    if (!shareModal || !shareEmail.trim()) {
      toast.error('Enter an email address');
      return;
    }
    setSharing(true);
    try {
      await firestoreService.shareTaskTemplateWith(shareModal.id, shareEmail.trim(), userEmail);
      toast.success(`Template shared with ${shareEmail.trim()}. They'll get a notification.`);
      setShareModal(null);
      setShareEmail('');
    } catch (error) {
      console.error('Share failed:', error);
      toast.error(error.message || 'Failed to share template');
    } finally {
      setSharing(false);
    }
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description,
      icon: template.icon || '✍️',
      tasks: template.tasks || []
    });
    setIsCreating(true);
  };

  const handleAddTask = () => {
    if (!newTask.title || !newTask.description) {
      toast.error('Please fill in task title and description');
      return;
    }
    setFormData({ ...formData, tasks: [...formData.tasks, { ...newTask }] });
    setNewTask({ title: '', description: '', priority: 'medium', estimated_time: 30, category: 'Training' });
  };

  const handleRemoveTask = (index) => {
    setFormData({ ...formData, tasks: formData.tasks.filter((_, i) => i !== index) });
  };

  const resetForm = () => {
    setIsCreating(false);
    setEditingTemplate(null);
    setFormData({ name: '', description: '', icon: '✍️', tasks: [] });
  };

  if (loading) {
    return createPortal(
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl p-8 text-center border border-black/10 dark:border-white/10 shadow-2xl min-w-[280px]">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[15px] text-[#86868b]">Loading templates...</p>
        </div>
      </div>,
      document.body
    );
  }

  if (isCreating) {
    return createPortal(
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 overflow-y-auto py-8 px-4">
        <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl w-full max-w-4xl border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden">
          <div className="sticky top-0 bg-white dark:bg-[#1d1d1f] px-6 py-4 border-b border-black/5 dark:border-white/10 flex justify-between items-center">
            <h2 className="text-[20px] font-semibold text-[#1d1d1f] dark:text-white">
              {editingTemplate ? 'Edit Template' : 'Create New Template'}
            </h2>
            <button type="button" onClick={resetForm} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-[#86868b]">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Template Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={inputClass}
                  placeholder="e.g., Client Onboarding"
                />
              </div>
              <div>
                <label className={labelClass}>Icon</label>
                <div className="flex gap-2 flex-wrap">
                  {TEMPLATE_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon })}
                      className={`text-2xl p-2 rounded-xl border-2 transition-colors ${
                        formData.icon === icon
                          ? 'border-[#0071e3] bg-[#0071e3]/10 dark:bg-[#0071e3]/20'
                          : 'border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className={labelClass}>Description *</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className={`${inputClass} py-3 resize-none`}
                placeholder="Describe what this template is for..."
              />
            </div>
            <div className="border-t border-black/5 dark:border-white/10 pt-6">
              <h3 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white mb-4">Template Tasks</h3>
              <div className="space-y-3 p-4 rounded-xl bg-black/[0.02] dark:bg-white/5 border border-black/5 dark:border-white/10 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="Task title..."
                    className={inputClass}
                  />
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    className={inputClass}
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Task description..."
                  rows={2}
                  className={`${inputClass} py-3 resize-none`}
                />
                <button type="button" onClick={handleAddTask} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0071e3] text-white text-[14px] font-medium hover:bg-[#0077ed]">
                  <Plus className="w-4 h-4" />
                  Add Task
                </button>
              </div>
              {formData.tasks.length > 0 ? (
                <div className="space-y-2">
                  {formData.tasks.map((task, index) => (
                    <div key={index} className="flex items-start gap-3 p-4 rounded-xl bg-white dark:bg-[#2c2c2e] border border-black/5 dark:border-white/10">
                      <span className="text-[#86868b] text-[13px] mt-1">{index + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[#1d1d1f] dark:text-white">{task.title}</p>
                        <p className="text-[13px] text-[#86868b] mt-0.5">{task.description}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="inline-block px-2 py-0.5 rounded-lg text-[11px] font-medium bg-black/5 dark:bg-white/10 text-[#86868b]">{task.priority}</span>
                          <span className="text-[12px] text-[#86868b]">{task.category}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveTask(index)}
                        className="p-2 rounded-lg text-[#ff3b30] hover:bg-[#ff3b30]/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[#86868b] text-center py-4 text-[14px]">No tasks added yet</p>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-black/5 dark:border-white/10">
              <button type="button" onClick={resetForm} className="px-5 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[14px] font-medium hover:bg-black/10 dark:hover:bg-white/15">
                Cancel
              </button>
              <button type="button" onClick={handleSaveTemplate} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0071e3] text-white text-[14px] font-medium hover:bg-[#0077ed]">
                <Save className="w-4 h-4" />
                {editingTemplate ? 'Update Template' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 overflow-y-auto py-8 px-4">
      <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl w-full max-w-5xl mb-8 border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden">
        <div className="sticky top-0 bg-white dark:bg-[#1d1d1f] px-6 py-4 border-b border-black/5 dark:border-white/10 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0071e3]/10 dark:bg-[#0071e3]/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#0071e3]" />
            </div>
            <h2 className="text-[20px] font-semibold text-[#1d1d1f] dark:text-white">Template Manager</h2>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setIsCreating(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0071e3] text-white text-[14px] font-medium hover:bg-[#0077ed]">
              <Plus className="w-4 h-4" />
              New Template
            </button>
            <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-[#86868b]">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-6 space-y-6">
          <p className="text-[14px] text-[#86868b]">Create and manage task templates for your team</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <div key={template.id} className="rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/5 p-6 hover:shadow-lg hover:border-black/20 dark:hover:border-white/20 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <span className="text-4xl">{template.icon}</span>
                  <div className="flex gap-1">
                    {template.isOwner !== false && (
                      <>
                        <button type="button" onClick={() => setShareModal(template)} className="p-2 rounded-lg hover:bg-[#34c759]/10 text-[#34c759]" title="Share with someone">
                          <Share2 className="w-5 h-5" />
                        </button>
                        <button type="button" onClick={() => handleEditTemplate(template)} className="p-2 rounded-lg hover:bg-[#0071e3]/10 text-[#0071e3]">
                          <Edit className="w-5 h-5" />
                        </button>
                        <button type="button" onClick={() => handleDeleteTemplate(template.id)} className="p-2 rounded-lg hover:bg-[#ff3b30]/10 text-[#ff3b30]">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <h3 className="font-semibold text-[#1d1d1f] dark:text-white mb-2">{template.name}</h3>
                {template.isOwner === false && template.ownerEmail && (
                  <p className="text-[11px] text-[#0071e3] mb-1">Shared with you by {template.ownerEmail}</p>
                )}
                <p className="text-[13px] text-[#86868b] mb-3 line-clamp-2">{template.description}</p>
                <span className="inline-block px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/10 text-[12px] text-[#86868b]">
                  {template.tasks?.length || 0} tasks
                </span>
              </div>
            ))}
          </div>
          {shareModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
              <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl w-full max-w-md border border-black/10 dark:border-white/10 shadow-2xl p-6">
                <h3 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white mb-2">Share template</h3>
                <p className="text-[13px] text-[#86868b] mb-4">Send &quot;{shareModal.name}&quot; to a teammate. They will get a notification and see it in their templates.</p>
                <input
                  type="email"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="teammate@example.com"
                  className={`${inputClass} mb-4`}
                />
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => { setShareModal(null); setShareEmail(''); }} className="px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[14px] font-medium">
                    Cancel
                  </button>
                  <button type="button" onClick={handleShareTemplate} disabled={sharing || !shareEmail.trim()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#34c759] text-white text-[14px] font-medium hover:bg-[#2db14e] disabled:opacity-50">
                    <Share2 className="w-4 h-4" />
                    {sharing ? 'Sharing…' : 'Share'}
                  </button>
                </div>
              </div>
            </div>
          )}
          {templates.length === 0 && (
            <div className="text-center py-12">
              <Sparkles className="w-12 h-12 text-[#86868b] mx-auto mb-3" />
              <p className="text-[15px] text-[#86868b]">No templates yet. Create your first template!</p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default TemplateEditor;
