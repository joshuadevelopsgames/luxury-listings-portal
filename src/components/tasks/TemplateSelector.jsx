import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { X, CheckCircle2, Sparkles, Edit } from 'lucide-react';
import { TASK_TEMPLATES } from '../../data/taskTemplates';
import { DailyTask } from '../../entities/DailyTask';
import { firestoreService } from '../../services/firestoreService';
import { PERMISSIONS } from '../../entities/Permissions';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

const TemplateSelector = ({ onClose, currentUser, onEditTemplate }) => {
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto py-8 px-4">
      <Card className="w-full max-w-5xl mb-8 relative">
        {/* Close button - top right corner */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 h-10 w-10 flex items-center justify-center z-20 text-gray-600 hover:text-gray-900 cursor-pointer text-3xl font-bold leading-none transition-colors"
          aria-label="Close"
        >
          ×
        </button>
        
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between pr-16">
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-purple-500" />
              Task Templates
            </CardTitle>
            {canEditTemplates && onEditTemplate && (
              <Button
                variant="outline"
                onClick={() => {
                  onClose();
                  onEditTemplate();
                }}
                className="border-indigo-600 text-indigo-600 hover:bg-indigo-50"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Templates
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <p className="text-gray-600">
            Choose a template to quickly create a set of related tasks
            {canEditTemplates && (
              <span className="ml-2 text-indigo-600 font-medium">
                • You can edit these templates
              </span>
            )}
          </p>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <Card
                key={template.id}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  selectedTemplate?.id === template.id
                    ? 'border-2 border-blue-500 shadow-md'
                    : 'border border-gray-200'
                }`}
                onClick={() => setSelectedTemplate(template)}
              >
                <CardContent className="p-6 pt-8">
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-4xl">{template.icon}</span>
                    {selectedTemplate?.id === template.id && (
                      <CheckCircle2 className="w-5 h-5 text-blue-500" />
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {template.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {template.description}
                  </p>
                  <Badge variant="outline" className="text-xs">
                    {template.tasks.length} tasks
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Selected Template Details */}
          {selectedTemplate && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">
                Tasks in "{selectedTemplate.name}" template:
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto bg-gray-50 p-4 rounded-lg">
                {selectedTemplate.tasks.map((task, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 bg-white rounded border border-gray-200"
                  >
                    <span className="text-gray-400 text-sm mt-1">
                      {index + 1}.
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{task.title}</p>
                      <p className="text-sm text-gray-600">{task.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            task.priority === 'high'
                              ? 'border-orange-300 bg-orange-50 text-orange-700'
                              : task.priority === 'medium'
                              ? 'border-blue-300 bg-blue-50 text-blue-700'
                              : 'border-gray-300 bg-gray-50 text-gray-700'
                          }`}
                        >
                          {task.priority}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          ⏱ {task.estimated_time}m
                        </span>
                        <span className="text-xs text-gray-500">
                          📁 {task.category}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleApplyTemplate}
              disabled={!selectedTemplate || creating}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {creating ? 'Creating Tasks...' : 'Apply Template'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TemplateSelector;

