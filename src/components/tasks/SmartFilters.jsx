import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Filter, Save, Trash2, Star } from 'lucide-react';
import { firestoreService } from '../../services/firestoreService';
import { toast } from 'react-hot-toast';

const SmartFilters = ({ onClose, onApplyFilter, currentUser }) => {
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
      const userFilters = await firestoreService.getSmartFilters(currentUser.email);
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
        await firestoreService.updateSmartFilter(editingFilter.id, formData);
        toast.success('Filter updated!');
      } else {
        await firestoreService.createSmartFilter({
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
    if (!window.confirm('Delete this filter?')) return;

    try {
      await firestoreService.deleteSmartFilter(filterId);
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
    { value: 'p1', label: 'P1 (Urgent)', activeClass: 'bg-[#ff3b30]/10 text-[#ff3b30] border-[#ff3b30]/30' },
    { value: 'p2', label: 'P2 (High)', activeClass: 'bg-[#ff9500]/10 text-[#ff9500] border-[#ff9500]/30' },
    { value: 'p3', label: 'P3 (Medium)', activeClass: 'bg-[#0071e3]/10 text-[#0071e3] border-[#0071e3]/30' },
    { value: 'p4', label: 'P4 (Low)', activeClass: 'bg-black/10 dark:bg-white/10 text-[#86868b] border-black/20 dark:border-white/20' }
  ];

  if (creating) {
    return createPortal(
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 overflow-y-auto py-8 px-4">
        <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl w-full max-w-2xl mb-8 border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/10">
            <h2 className="text-[18px] font-semibold text-[#1d1d1f] dark:text-white">
              {editingFilter ? 'Edit Filter' : 'Create Smart Filter'}
            </h2>
            <button
              type="button"
              onClick={() => { setCreating(false); setEditingFilter(null); }}
              className="w-8 h-8 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-[#86868b]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 space-y-6 pb-8">
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">Filter Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Urgent Client Work"
                className="w-full h-11 px-4 rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] text-[14px]"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">Priorities</label>
              <div className="flex flex-wrap gap-2">
                {priorityOptions.map((p) => {
                  const isActive = formData.criteria.priorities?.includes(p.value);
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => togglePriority(p.value)}
                      className={`px-3 py-1.5 rounded-lg text-[13px] font-medium border transition-colors ${
                        isActive ? p.activeClass : 'bg-black/5 dark:bg-white/10 text-[#86868b] border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/15'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">Labels (select all that match)</label>
              <div className="flex flex-wrap gap-2">
                {['urgent', 'client-work', 'marketing', 'follow-up', 'important', 'quick-win'].map((label) => {
                  const isActive = formData.criteria.labels?.includes(label);
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => toggleLabel(label)}
                      className={`px-3 py-1.5 rounded-lg text-[13px] font-medium border transition-colors ${
                        isActive ? 'bg-[#af52de]/10 text-[#af52de] border-[#af52de]/30' : 'bg-black/5 dark:bg-white/10 text-[#86868b] border-black/10 dark:border-white/10 hover:bg-[#af52de]/10'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">Special Criteria</label>
              <div className="space-y-2">
                {[
                  { key: 'hasSubtasks', label: 'Has subtasks' },
                  { key: 'hasReminders', label: 'Has reminders' },
                  { key: 'isRecurring', label: 'Recurring tasks only' }
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer text-[14px] text-[#1d1d1f] dark:text-white">
                    <input
                      type="checkbox"
                      checked={formData.criteria[key] === true}
                      onChange={(e) => setFormData({
                        ...formData,
                        criteria: { ...formData.criteria, [key]: e.target.checked ? true : null }
                      })}
                      className="h-4 w-4 rounded border-black/20 dark:border-white/20 text-[#0071e3] focus:ring-[#0071e3] accent-[#0071e3]"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-black/5 dark:border-white/10">
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[14px] font-medium hover:bg-black/10 dark:hover:bg-white/15"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveFilter}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0071e3] text-white text-[14px] font-medium hover:bg-[#0077ed]"
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
      <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl w-full max-w-3xl mb-8 border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0071e3]/10 dark:bg-[#0071e3]/20 flex items-center justify-center">
              <Filter className="w-5 h-5 text-[#0071e3]" />
            </div>
            <h2 className="text-[20px] font-semibold text-[#1d1d1f] dark:text-white">Smart Filters</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0071e3] text-white text-[13px] font-medium hover:bg-[#0077ed]"
            >
              <Plus className="w-4 h-4" />
              New Filter
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-[#86868b]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-6 space-y-4 pb-8">
          <p className="text-[14px] text-[#86868b]">Create custom views to quickly find specific tasks</p>

          {filters.length > 0 ? (
            <div className="space-y-3">
              {filters.map((filter) => (
                <div
                  key={filter.id}
                  className="rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/5 p-5 hover:border-black/20 dark:hover:border-white/20 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="w-4 h-4 text-[#ff9500] dark:text-[#ff9f0a] shrink-0" />
                        <h3 className="font-semibold text-[#1d1d1f] dark:text-white">{filter.name}</h3>
                      </div>
                      <div className="flex flex-wrap gap-2 text-[12px] text-[#86868b]">
                        {filter.criteria.priorities?.length > 0 && (
                          <span>Priorities: {filter.criteria.priorities.join(', ')}</span>
                        )}
                        {filter.criteria.labels?.length > 0 && (
                          <span>Labels: {filter.criteria.labels.join(', ')}</span>
                        )}
                        {filter.criteria.hasSubtasks && (
                          <span className="px-2 py-0.5 rounded-lg bg-black/5 dark:bg-white/10">Has subtasks</span>
                        )}
                        {filter.criteria.isRecurring && (
                          <span className="px-2 py-0.5 rounded-lg bg-black/5 dark:bg-white/10">Recurring</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => { onApplyFilter(filter); onClose(); }}
                        className="px-3 py-2 rounded-xl bg-[#0071e3]/10 dark:bg-[#0071e3]/20 text-[#0071e3] text-[13px] font-medium hover:bg-[#0071e3]/20 dark:hover:bg-[#0071e3]/30"
                      >
                        Apply
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteFilter(filter.id)}
                        className="p-2 rounded-xl text-[#ff3b30] hover:bg-[#ff3b30]/10 dark:hover:bg-[#ff3b30]/20 transition-colors"
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
              <div className="w-14 h-14 rounded-2xl bg-black/5 dark:bg-white/10 flex items-center justify-center mx-auto mb-4">
                <Filter className="w-7 h-7 text-[#86868b]" />
              </div>
              <p className="text-[15px] text-[#86868b]">No custom filters yet. Create your first one!</p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SmartFilters;

