import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { X, CheckCircle2, Sparkles } from 'lucide-react';
import { getAllTemplates } from '../../data/taskTemplates';
import { DailyTask } from '../../entities/DailyTask';
import { toast } from 'react-hot-toast';

const TemplateSelector = ({ onClose, currentUser }) => {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [creating, setCreating] = useState(false);
  
  const templates = getAllTemplates();

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-5xl my-8">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-500" />
            Task Templates
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <p className="text-gray-600">
            Choose a template to quickly create a set of related tasks
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
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-3xl">{template.icon}</span>
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

