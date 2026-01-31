import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { CheckCircle2, Clock, BookOpen, Target, Calendar, TrendingUp, FileText, Users, BarChart3, ArrowRight, Palette, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TodaysTasks = ({ tasks = [] }) => {
  const [completedTasks, setCompletedTasks] = useState(new Set());
  const navigate = useNavigate();

  const handleTaskToggle = (taskId) => {
    const newCompleted = new Set(completedTasks);
    if (newCompleted.has(taskId)) {
      newCompleted.delete(taskId);
    } else {
      newCompleted.add(taskId);
    }
    setCompletedTasks(newCompleted);
  };

  const getTaskIcon = (category) => {
    switch (category) {
      case 'style-guide':
        return BookOpen;
      case 'tools':
        return Palette;
      case 'research':
        return Eye;
      case 'meeting':
        return Users;
      case 'analytics':
        return BarChart3;
      case 'content':
        return TrendingUp;
      case 'client-relations':
        return Users;
      default:
        return Target;
    }
  };

  const getTaskPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low':
        return 'bg-gray-100 text-gray-600 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getTaskStatusColor = (taskId) => {
    return completedTasks.has(taskId) 
      ? 'bg-green-100 text-green-800 border-green-200' 
      : 'bg-gray-100 text-gray-600 border-gray-200';
  };

  const getTaskStatusIcon = (taskId) => {
    return completedTasks.has(taskId) 
      ? <CheckCircle2 className="w-4 h-4" />
      : <Clock className="w-4 h-4" />;
  };

  const progressPercentage = tasks.length > 0 
    ? Math.round((completedTasks.size / tasks.length) * 100) 
    : 0;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-green-600" />
          Today's Content Tasks
          <Badge variant="secondary" className="ml-2">
            {completedTasks.size}/{tasks.length} Complete
          </Badge>
        </CardTitle>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Progress</span>
            <span className="font-medium text-gray-900">{progressPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-400" />
            <p className="text-lg font-medium">All tasks completed!</p>
            <p className="text-sm">Great job on your content tasks today!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const Icon = getTaskIcon(task.category);
              const isCompleted = completedTasks.has(task.id);
              
              return (
                <div 
                  key={task.id} 
                  className={`p-4 rounded-lg border transition-all ${
                    isCompleted 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-white border-gray-200 hover:border-green-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg border ${getTaskStatusColor(task.id)}`}>
                      {getTaskStatusIcon(task.id)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className={`font-medium text-sm ${
                          isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'
                        }`}>
                          {task.title}
                        </h4>
                        
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getTaskPriorityColor(task.priority)}`}
                          >
                            {task.priority}
                          </Badge>
                        </div>
                      </div>
                      
                      <p className={`text-xs mb-3 ${
                        isCompleted ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {task.description}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Icon className="w-3 h-3" />
                            {task.category.replace('-', ' ')}
                          </span>
                          {task.estimatedTime && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {task.estimatedTime}
                            </span>
                          )}
                        </div>
                        
                        <Checkbox
                          checked={isCompleted}
                          onCheckedChange={() => handleTaskToggle(task.id)}
                          className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <span className="font-medium">Content Excellence</span>
              <p className="text-xs mt-1">Complete tasks to build your luxury content foundation</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/tasks')}>
              View All Tasks <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TodaysTasks;
