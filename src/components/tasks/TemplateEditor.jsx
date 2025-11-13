import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { X, Plus, Edit, Trash2, Save, Sparkles } from 'lucide-react';
import { firestoreService } from '../../services/firestoreService';
import { toast } from 'react-hot-toast';

const TEMPLATE_ICONS = ['👋', '📊', '✍️', '📱', '🏡', '🎯', '💼', '🎨', '📈', '🎉', '⚡', '🚀'];

const TemplateEditor = ({ onClose }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
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
  }, []);

  const loadTemplates = async () => {
    try {
      const firestoreTemplates = await firestoreService.getTaskTemplates();
      setTemplates(firestoreTemplates);
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
        await firestoreService.createTaskTemplate(formData);
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
    if (!window.confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      await firestoreService.deleteTaskTemplate(templateId);
      toast.success('Template deleted successfully!');
      await loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
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

    setFormData({
      ...formData,
      tasks: [...formData.tasks, { ...newTask }]
    });

    setNewTask({
      title: '',
      description: '',
      priority: 'medium',
      estimated_time: 30,
      category: 'Training'
    });
  };

  const handleRemoveTask = (index) => {
    setFormData({
      ...formData,
      tasks: formData.tasks.filter((_, i) => i !== index)
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <p className="text-gray-600">Loading templates...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isCreating) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto py-8 px-4">
        <Card className="w-full max-w-4xl relative">
          {/* Close button - top right corner */}
          <Button
            variant="ghost"
            size="lg"
            onClick={() => {
              setIsCreating(false);
              setEditingTemplate(null);
              setFormData({ name: '', description: '', icon: '✍️', tasks: [] });
            }}
            className="absolute top-4 right-4 h-12 w-12 p-0 z-20 bg-white hover:bg-gray-100 border-2 border-gray-300 rounded-full shadow-sm"
          >
            <X className="w-6 h-6 text-gray-700" />
          </Button>
          
          <CardHeader className="pb-4 pr-20">
            <CardTitle className="text-2xl font-bold">
              {editingTemplate ? 'Edit Template' : 'Create New Template'}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6 max-h-none">
            {/* Template Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., Client Onboarding"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Icon
                </label>
                <div className="flex gap-2 flex-wrap">
                  {TEMPLATE_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon })}
                      className={`text-2xl p-2 rounded-md border-2 ${
                        formData.icon === icon
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Describe what this template is for..."
              />
            </div>

            {/* Tasks */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Template Tasks</h3>
              
              {/* Add Task Form */}
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="Task title..."
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <Button
                  type="button"
                  onClick={handleAddTask}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Task
                </Button>
              </div>

              {/* Task List */}
              {formData.tasks.length > 0 ? (
                <div className="space-y-2">
                  {formData.tasks.map((task, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg">
                      <span className="text-gray-400 text-sm mt-1">{index + 1}.</span>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{task.title}</p>
                        <p className="text-sm text-gray-600">{task.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {task.priority}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {task.category}
                          </span>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveTask(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No tasks added yet</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreating(false);
                  setEditingTemplate(null);
                  setFormData({ name: '', description: '', icon: '✍️', tasks: [] });
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveTemplate}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {editingTemplate ? 'Update Template' : 'Create Template'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto py-8 px-4">
      <Card className="w-full max-w-5xl mb-8 relative">
        {/* Close button - top right corner */}
        <Button
          variant="ghost"
          size="lg"
          onClick={onClose}
          className="absolute top-4 right-4 h-12 w-12 p-0 z-20 bg-white hover:bg-gray-100 border-2 border-gray-300 rounded-full shadow-sm"
        >
          <X className="w-6 h-6 text-gray-700" />
        </Button>
        
        <CardHeader className="pb-4 pr-20">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-indigo-500" />
              Template Manager
            </CardTitle>
            <Button
              onClick={() => setIsCreating(true)}
              className="bg-indigo-600 hover:bg-indigo-700 mr-14"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Template
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <p className="text-gray-600">
            Create and manage task templates for your team
          </p>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <Card key={template.id} className="border border-gray-200 hover:shadow-lg transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-4xl">{template.icon}</span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditTemplate(template)}
                        className="h-8 w-8 p-0 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {template.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {template.description}
                  </p>
                  <Badge variant="outline" className="text-xs">
                    {template.tasks?.length || 0} tasks
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>

          {templates.length === 0 && (
            <div className="text-center py-12">
              <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No templates yet. Create your first template!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TemplateEditor;

