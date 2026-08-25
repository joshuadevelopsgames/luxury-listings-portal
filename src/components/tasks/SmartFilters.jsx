import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Filter, Save, Trash2, Star } from 'lucide-react';
import { supabaseService } from '../../services/supabaseService';
import { toast } from 'react-hot-toast';
import { useConfirm } from '../../contexts/ConfirmContext';

const SmartFilters = ({ onClose, onApplyFilter, currentUser }) => {
  const { confirm } = useConfirm();
  const [filters, setFilters] = useState([]);
  const [creating, setCreating] = useState(false);
  const [editingFilter, setEditingFilter] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    criteria: {
      priorities: [],
      labels: [],
      categories: [],
      hasSubtasks: null,
      hasReminders: null,
      isRecurring: null
    }
  });

  useEffect(() => {
    loadFilters();
  }, []);

  const loadFilters = async () => {
    try {
      const userFilters = await supabaseService.getSmartFilters(currentUser.email);
      setFilters(userFilters);
    } catch (error) {
      console.error('Error loading filters:', error);
    }
  };

  const handleSaveFilter = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a filter name');
      return;
    }

    try {
      if (editingFilter) {
        await supabaseService.updateSmartFilter(editingFilter.id, formData);
        toast.success('Filter updated!');
      } else {
        await supabaseService.createSmartFilter({
          ...formData,
          userEmail: currentUser.email
        });
        toast.success('Filter created!');
      }
      
      await loadFilters();
      setCreating(false);
      setEditingFilter(null);
      setFormData({ name: '', criteria: { priorities: [], labels: [], categories: [] } });
    } catch (error) {
      console.error('Error saving filter:', error);
      toast.error('Failed to save filter');
    }
  };

  const handleDeleteFilter = async (filterId) => {
    const confirmed = await confirm({ title: 'Delete filter', message: 'Delete this filter?', confirmText: 'Delete', variant: 'danger' });
    if (!confirmed) return;

    try {
      await supabaseService.deleteSmartFilter(filterId);
      toast.success('Filter deleted!');
      await loadFilters();
    } catch (error) {
      console.error('Error deleting filter:', error);
      toast.error('Failed to delete filter');
    }
  };

  const togglePriority = (priority) => {
    const current = formData.criteria.priorities || [];
    const updated = current.includes(priority)
      ? current.filter(p => p !== priority)
      : [...current, priority];
    setFormData({
      ...formData,
      criteria: { ...formData.criteria, priorities: updated }
    });
  };

  const toggleLabel = (label) => {
    const current = formData.criteria.labels || [];
    const updated = current.includes(label)
      ? current.filter(l => l !== label)
      : [...current, label];
    setFormData({
      ...formData,
      criteria: { ...formData.criteria, labels: updated }
    });
  };

  const priorityOptions = [
    { value: 'p1', label: 'P1 (Urgent)', activeClass: 'bg-danger/10 text-danger border-danger/30' },
    { value: 'p2', label: 'P2 (High)', activeClass: 'bg-warning/10 text-warning border-warning/30' },
    { value: 'p3', label: 'P3 (Medium)', activeClass: 'bg-brand/10 text-brand border-brand/30' },
    { value: 'p4', label: 'P4 (Low)', activeClass: 'bg-black/10 dark:bg-white/10 text-ink-muted border-black/20 dark:border-white/20' }
  ];

  if (creating) {
    return createPortal(
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 overflow-y-auto py-8 px-4">
        <div className="bg-surface rounded-xl w-full max-w-2xl mb-8 border border-hairline-strong shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-hairline">
            <h2 className="text-[18px] font-semibold text-ink">
              {editingFilter ? 'Edit Filter' : 'Create Smart Filter'}
            </h2>
            <button
              type="button"
              onClick={() => { setCreating(false); setEditingFilter(null); }}
              className="w-8 h-8 rounded-full hover:bg-surface-3 flex items-center justify-center text-ink-muted"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 space-y-6 pb-8">
            <div>
              <label className="block text-[13px] font-medium text-ink mb-2">Filter Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Urgent Client Work"
                className="w-full h-11 px-4 rounded-xl bg-surface border border-hairline-strong text-ink placeholder-ink-muted focus:outline-none focus:ring-2 focus:ring-brand text-[14px]"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-ink mb-2">Priorities</label>
              <div className="flex flex-wrap gap-2">
                {priorityOptions.map((p) => {
                  const isActive = formData.criteria.priorities?.includes(p.value);
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => togglePriority(p.value)}
                      className={`px-3 py-1.5 rounded-lg text-[13px] font-medium border transition-colors ${
                        isActive ? p.activeClass : 'bg-surface-3 text-ink-muted border-hairline-strong hover:bg-hairline-strong'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-ink mb-2">Labels (select all that match)</label>
              <div className="flex flex-wrap gap-2">
                {['urgent', 'client-work', 'marketing', 'follow-up', 'important', 'quick-win'].map((label) => {
                  const isActive = formData.criteria.labels?.includes(label);
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => toggleLabel(label)}
                      className={`px-3 py-1.5 rounded-lg text-[13px] font-medium border transition-colors ${
                        isActive ? 'bg-brand/10 text-brand border-brand/30' : 'bg-surface-3 text-ink-muted border-hairline-strong hover:bg-brand/10'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-ink mb-2">Special Criteria</label>
              <div className="space-y-2">
                {[
                  { key: 'hasSubtasks', label: 'Has subtasks' },
                  { key: 'hasReminders', label: 'Has reminders' },
                  { key: 'isRecurring', label: 'Recurring tasks only' }
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer text-[14px] text-ink">
                    <input
                      type="checkbox"
                      checked={formData.criteria[key] === true}
                      onChange={(e) => setFormData({
                        ...formData,
                        criteria: { ...formData.criteria, [key]: e.target.checked ? true : null }
                      })}
                      className="h-4 w-4 rounded border-black/20 dark:border-white/20 text-brand focus:ring-brand accent-brand"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-hairline">
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="px-4 py-2.5 rounded-xl bg-surface-3 text-ink text-[14px] font-medium hover:bg-hairline-strong"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveFilter}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-brand text-white text-[14px] font-medium hover:bg-brand-hover"
              >
                <Save className="w-4 h-4" />
                Save Filter
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
      <div className="bg-surface rounded-xl w-full max-w-3xl mb-8 border border-hairline-strong shadow-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-hairline">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand/10 dark:bg-brand/20 flex items-center justify-center">
              <Filter className="w-5 h-5 text-brand" />
            </div>
            <h2 className="text-[20px] font-semibold text-ink">Smart Filters</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand text-white text-[13px] font-medium hover:bg-brand-hover"
            >
              <Plus className="w-4 h-4" />
              New Filter
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-surface-3 flex items-center justify-center text-ink-muted"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-6 space-y-4 pb-8">
          <p className="text-[14px] text-ink-muted">Create custom views to quickly find specific tasks</p>

          {filters.length > 0 ? (
            <div className="space-y-3">
              {filters.map((filter) => (
                <div
                  key={filter.id}
                  className="rounded-xl border border-hairline-strong bg-surface-2 p-5 hover:border-hairline-strong transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="w-4 h-4 text-warning dark:text-[#ff9f0a] shrink-0" />
                        <h3 className="font-semibold text-ink">{filter.name}</h3>
                      </div>
                      <div className="flex flex-wrap gap-2 text-[12px] text-ink-muted">
                        {filter.criteria.priorities?.length > 0 && (
                          <span>Priorities: {filter.criteria.priorities.join(', ')}</span>
                        )}
                        {filter.criteria.labels?.length > 0 && (
                          <span>Labels: {filter.criteria.labels.join(', ')}</span>
                        )}
                        {filter.criteria.hasSubtasks && (
                          <span className="px-2 py-0.5 rounded-lg bg-surface-3">Has subtasks</span>
                        )}
                        {filter.criteria.isRecurring && (
                          <span className="px-2 py-0.5 rounded-lg bg-surface-3">Recurring</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => { onApplyFilter(filter); onClose(); }}
                        className="px-3 py-2 rounded-xl bg-brand/10 dark:bg-brand/20 text-brand text-[13px] font-medium hover:bg-brand/20 dark:hover:bg-brand/30"
                      >
                        Apply
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteFilter(filter.id)}
                        className="p-2 rounded-xl text-danger hover:bg-danger/10 dark:hover:bg-danger/20 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-14 h-14 rounded-xl bg-surface-3 flex items-center justify-center mx-auto mb-4">
                <Filter className="w-7 h-7 text-ink-muted" />
              </div>
              <p className="text-[15px] text-ink-muted">No custom filters yet. Create your first one!</p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SmartFilters;

