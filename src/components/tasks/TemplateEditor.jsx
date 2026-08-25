import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Edit, Trash2, Save, Sparkles, Share2 } from 'lucide-react';
import { TEMPLATE_ICONS, DEFAULT_TEMPLATE_ICON, getTemplateIcon } from './templateIcons';
import { supabaseService } from '../../services/supabaseService';
import { toast } from 'react-hot-toast';
import { useConfirm } from '../../contexts/ConfirmContext';

const inputClass = 'w-full h-11 px-4 text-[14px] rounded-xl bg-surface border border-hairline-strong text-ink placeholder-ink-muted focus:outline-none focus:ring-2 focus:ring-brand';
const labelClass = 'block text-[13px] font-medium text-ink mb-2';

const TemplateEditor = ({ onClose, currentUser }) => {
  const { confirm } = useConfirm();
  const userEmail = (currentUser?.email || '').toLowerCase().trim();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [shareModal, setShareModal] = useState(null);
  const [shareEmail, setShareEmail] = useState('');
  const [shareableUsers, setShareableUsers] = useState([]);
  const [shareUsersLoading, setShareUsersLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: DEFAULT_TEMPLATE_ICON,
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

  useEffect(() => {
    if (!shareModal) {
      setShareableUsers([]);
      return;
    }
    let cancelled = false;
    setShareUsersLoading(true);
    setShareEmail('');
    supabaseService.getApprovedUsers()
      .then((users) => {
        if (cancelled) return;
        const alreadyShared = (shareModal.sharedWith || []).map((e) => String(e).toLowerCase().trim());
        const list = users.filter((u) => {
          const em = (u.email || u.id || '').toLowerCase().trim();
          return em && em !== userEmail && !alreadyShared.includes(em);
        });
        setShareableUsers(list);
      })
      .catch(() => { if (!cancelled) setShareableUsers([]); })
      .finally(() => { if (!cancelled) setShareUsersLoading(false); });
    return () => { cancelled = true; };
  }, [shareModal, userEmail]);

  const loadTemplates = async () => {
    if (!userEmail) {
      setLoading(false);
      return;
    }
    try {
      const list = await supabaseService.getTaskTemplates(userEmail);
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
        await supabaseService.updateTaskTemplate(editingTemplate.id, formData);
        toast.success('Template updated successfully!');
      } else {
        await supabaseService.createTaskTemplate({ ...formData, ownerEmail: userEmail });
        toast.success('Template created successfully!');
      }
      await loadTemplates();
      setEditingTemplate(null);
      setIsCreating(false);
      setFormData({ name: '', description: '', icon: DEFAULT_TEMPLATE_ICON, tasks: [] });
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    const confirmed = await confirm({ title: 'Delete template', message: 'Are you sure you want to delete this template?', confirmText: 'Delete', variant: 'danger' });
    if (!confirmed) return;
    try {
      await supabaseService.deleteTaskTemplate(templateId);
      toast.success('Template deleted successfully!');
      await loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  const handleShareTemplate = async () => {
    if (!shareModal || !shareEmail.trim()) {
      toast.error('Select a user');
      return;
    }
    const toEmail = shareEmail.trim();
    setSharing(true);
    try {
      await supabaseService.shareTaskTemplateWith(shareModal.id, toEmail, userEmail);
      toast.success(`Template shared. They'll get a notification.`);
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
      icon: template.icon || DEFAULT_TEMPLATE_ICON,
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
    setFormData({ name: '', description: '', icon: DEFAULT_TEMPLATE_ICON, tasks: [] });
  };

  if (loading) {
    return createPortal(
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-surface rounded-xl p-8 text-center border border-hairline-strong shadow-lg min-w-[280px]">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[15px] text-ink-muted">Loading templates...</p>
        </div>
      </div>,
      document.body
    );
  }

  if (isCreating) {
    return createPortal(
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 overflow-y-auto py-8 px-4">
        <div className="bg-surface rounded-xl w-full max-w-4xl border border-hairline-strong shadow-lg overflow-hidden">
          <div className="sticky top-0 bg-surface px-6 py-4 border-b border-hairline flex justify-between items-center">
            <h2 className="text-[20px] font-semibold text-ink">
              {editingTemplate ? 'Edit Template' : 'Create New Template'}
            </h2>
            <button type="button" onClick={resetForm} className="p-2 rounded-lg hover:bg-surface-3 text-ink-muted">
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
                  {TEMPLATE_ICONS.map(({ key, Icon }) => (
                    <button
                      key={key}
                      type="button"
                      aria-label={key}
                      aria-pressed={formData.icon === key}
                      onClick={() => setFormData({ ...formData, icon: key })}
                      className={`p-2.5 rounded-lg border transition-colors ${
                        formData.icon === key
                          ? 'border-brand bg-brand/10 text-brand'
                          : 'border-hairline-strong text-ink-muted hover:border-hairline-strong'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
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
            <div className="border-t border-hairline pt-6">
              <h3 className="text-[17px] font-semibold text-ink mb-4">Template Tasks</h3>
              <div className="space-y-3 p-4 rounded-xl bg-surface-2 border border-hairline mb-4">
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
                <button type="button" onClick={handleAddTask} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-brand text-white text-[14px] font-medium hover:bg-brand-hover">
                  <Plus className="w-4 h-4" />
                  Add Task
                </button>
              </div>
              {formData.tasks.length > 0 ? (
                <div className="space-y-2">
                  {formData.tasks.map((task, index) => (
                    <div key={index} className="flex items-start gap-3 p-4 rounded-xl bg-surface border border-hairline">
                      <span className="text-ink-muted text-[13px] mt-1">{index + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-ink">{task.title}</p>
                        <p className="text-[13px] text-ink-muted mt-0.5">{task.description}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="inline-block px-2 py-0.5 rounded-lg text-[11px] font-medium bg-surface-3 text-ink-muted">{task.priority}</span>
                          <span className="text-[12px] text-ink-muted">{task.category}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveTask(index)}
                        className="p-2 rounded-lg text-danger hover:bg-danger/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-ink-muted text-center py-4 text-[14px]">No tasks added yet</p>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-hairline">
              <button type="button" onClick={resetForm} className="px-3.5 py-2 rounded-xl bg-surface-3 text-ink text-[14px] font-medium hover:bg-hairline-strong">
                Cancel
              </button>
              <button type="button" onClick={handleSaveTemplate} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-brand text-white text-[14px] font-medium hover:bg-brand-hover">
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
      <div className="bg-surface rounded-xl w-full max-w-5xl mb-8 border border-hairline-strong shadow-lg overflow-hidden">
        <div className="sticky top-0 bg-surface px-6 py-4 border-b border-hairline flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand/10 dark:bg-brand/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-brand" />
            </div>
            <h2 className="text-[20px] font-semibold text-ink">Template Manager</h2>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setIsCreating(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand text-white text-[14px] font-medium hover:bg-brand-hover">
              <Plus className="w-4 h-4" />
              New Template
            </button>
            <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-surface-3 text-ink-muted">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-6 space-y-6">
          <p className="text-[14px] text-ink-muted">Create and manage task templates for your team</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <div key={template.id} className="rounded-xl border border-hairline-strong bg-surface-2 p-6 hover:shadow-md hover:border-hairline-strong transition-all">
                <div className="flex items-start justify-between mb-4">
                  {React.createElement(getTemplateIcon(template.icon), { className: "w-6 h-6 text-ink-muted" })}
                  <div className="flex gap-1">
                    {template.isOwner !== false && (
                      <>
                        <button type="button" onClick={() => setShareModal(template)} className="p-2 rounded-lg hover:bg-positive/10 text-positive" title="Share with someone">
                          <Share2 className="w-5 h-5" />
                        </button>
                        <button type="button" onClick={() => handleEditTemplate(template)} className="p-2 rounded-lg hover:bg-brand/10 text-brand">
                          <Edit className="w-5 h-5" />
                        </button>
                        <button type="button" onClick={() => handleDeleteTemplate(template.id)} className="p-2 rounded-lg hover:bg-danger/10 text-danger">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <h3 className="font-semibold text-ink mb-2">{template.name}</h3>
                {template.isOwner === false && template.ownerEmail && (
                  <p className="text-[11px] text-brand mb-1">Shared with you by {template.ownerEmail}</p>
                )}
                <p className="text-[13px] text-ink-muted mb-3 line-clamp-2">{template.description}</p>
                <span className="inline-block px-2.5 py-1 rounded-lg bg-surface-3 text-[12px] text-ink-muted">
                  {template.tasks?.length || 0} tasks
                </span>
              </div>
            ))}
          </div>
          {shareModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
              <div className="bg-surface rounded-xl w-full max-w-md border border-hairline-strong shadow-lg p-6">
                <h3 className="text-[17px] font-semibold text-ink mb-2">Share template</h3>
                <p className="text-[13px] text-ink-muted mb-4">Send &quot;{shareModal.name}&quot; to a teammate. They will get a notification and see it in their templates.</p>
                {shareUsersLoading ? (
                  <p className="text-[13px] text-ink-muted mb-4">Loading users…</p>
                ) : shareableUsers.length === 0 ? (
                  <p className="text-[13px] text-ink-muted mb-4">No other users to share with.</p>
                ) : (
                  <select
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    className={`${inputClass} mb-4`}
                  >
                    <option value="">Select a user</option>
                    {shareableUsers.map((u) => {
                      const em = u.email || u.id;
                      const label = [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.displayName || em;
                      return (
                        <option key={em} value={em}>{label}</option>
                      );
                    })}
                  </select>
                )}
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => { setShareModal(null); setShareEmail(''); }} className="px-4 py-2.5 rounded-xl bg-surface-3 text-ink text-[14px] font-medium">
                    Cancel
                  </button>
                  <button type="button" onClick={handleShareTemplate} disabled={sharing || !shareEmail.trim()} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-positive text-white text-[14px] font-medium hover:bg-positive disabled:opacity-50">
                    <Share2 className="w-4 h-4" />
                    {sharing ? 'Sharing…' : 'Share'}
                  </button>
                </div>
              </div>
            </div>
          )}
          {templates.length === 0 && (
            <div className="text-center py-12">
              <Sparkles className="w-12 h-12 text-ink-muted mx-auto mb-3" />
              <p className="text-[15px] text-ink-muted">No templates yet. Create your first template!</p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default TemplateEditor;
