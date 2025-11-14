import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
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

  if (creating) {
    return (
      <div className="modal-overlay bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto py-8 px-4">
        <Card className="w-full max-w-2xl mb-8">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold">
                {editingFilter ? 'Edit Filter' : 'Create Smart Filter'}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCreating(false);
                  setEditingFilter(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6 pb-8">
            {/* Filter Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Urgent Client Work"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Priority Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priorities
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'p1', label: 'P1 (Urgent)', color: 'red' },
                  { value: 'p2', label: 'P2 (High)', color: 'orange' },
                  { value: 'p3', label: 'P3 (Medium)', color: 'blue' },
                  { value: 'p4', label: 'P4 (Low)', color: 'gray' }
                ].map((priority) => (
                  <Badge
                    key={priority.value}
                    variant="outline"
                    className={`cursor-pointer transition-colors ${
                      formData.criteria.priorities?.includes(priority.value)
                        ? `bg-${priority.color}-50 text-${priority.color}-700 border-${priority.color}-300`
                        : 'bg-gray-50 text-gray-600 border-gray-300 hover:bg-blue-50'
                    }`}
                    onClick={() => togglePriority(priority.value)}
                  >
                    {priority.label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Label Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Labels (select all that match)
              </label>
              <div className="flex flex-wrap gap-2">
                {['urgent', 'client-work', 'marketing', 'follow-up', 'important', 'quick-win'].map((label) => (
                  <Badge
                    key={label}
                    variant="outline"
                    className={`cursor-pointer transition-colors ${
                      formData.criteria.labels?.includes(label)
                        ? 'bg-purple-50 text-purple-700 border-purple-300'
                        : 'bg-gray-50 text-gray-600 border-gray-300 hover:bg-purple-50'
                    }`}
                    onClick={() => toggleLabel(label)}
                  >
                    {label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Special Filters */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Special Criteria
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.criteria.hasSubtasks === true}
                    onChange={(e) => setFormData({
                      ...formData,
                      criteria: { ...formData.criteria, hasSubtasks: e.target.checked ? true : null }
                    })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Has subtasks</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.criteria.hasReminders === true}
                    onChange={(e) => setFormData({
                      ...formData,
                      criteria: { ...formData.criteria, hasReminders: e.target.checked ? true : null }
                    })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Has reminders</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.criteria.isRecurring === true}
                    onChange={(e) => setFormData({
                      ...formData,
                      criteria: { ...formData.criteria, isRecurring: e.target.checked ? true : null }
                    })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Recurring tasks only</span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setCreating(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveFilter}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Filter
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="modal-overlay bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto py-8 px-4">
      <Card className="w-full max-w-3xl mb-8">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Filter className="w-6 h-6 text-blue-500" />
              Smart Filters
            </CardTitle>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setCreating(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Filter
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4 pb-8">
          <p className="text-gray-600">
            Create custom views to quickly find specific tasks
          </p>

          {/* Filters List */}
          {filters.length > 0 ? (
            <div className="space-y-3">
              {filters.map((filter) => (
                <Card key={filter.id} className="border border-gray-200 hover:shadow-md transition-all">
                  <CardContent className="p-6 pt-8">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <h3 className="font-semibold text-gray-900">{filter.name}</h3>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                          {filter.criteria.priorities?.length > 0 && (
                            <span className="text-gray-600">
                              Priorities: {filter.criteria.priorities.join(', ')}
                            </span>
                          )}
                          {filter.criteria.labels?.length > 0 && (
                            <span className="text-gray-600">
                              Labels: {filter.criteria.labels.join(', ')}
                            </span>
                          )}
                          {filter.criteria.hasSubtasks && (
                            <Badge variant="outline" className="text-xs">Has subtasks</Badge>
                          )}
                          {filter.criteria.isRecurring && (
                            <Badge variant="outline" className="text-xs">Recurring</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            onApplyFilter(filter);
                            onClose();
                          }}
                          className="text-blue-600 border-blue-300 hover:bg-blue-50"
                        >
                          Apply
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteFilter(filter.id)}
                          className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Filter className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No custom filters yet. Create your first one!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SmartFilters;

