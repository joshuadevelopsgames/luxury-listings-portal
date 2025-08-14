import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { 
  BookOpen, 
  Clock, 
  Play, 
  CheckCircle2,
  Lock,
  Star,
  ArrowRight
} from 'lucide-react';

const TutorialCard = ({ tutorial, progress, onStart }) => {
  const getDifficultyIcon = (difficulty) => {
    switch (difficulty) {
      case 'beginner':
        return <Star className="w-4 h-4 text-green-500 fill-current" />;
      case 'intermediate':
        return <Star className="w-4 h-4 text-yellow-500 fill-current" />;
      case 'advanced':
        return <Star className="w-4 h-4 text-red-500 fill-current" />;
      default:
        return <Star className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'not_started':
        return 'bg-gray-100 text-gray-600 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'in_progress':
        return <BookOpen className="w-4 h-4" />;
      case 'not_started':
        return <BookOpen className="w-4 h-4" />;
      default:
        return <BookOpen className="w-4 h-4" />;
    }
  };

  const getPrerequisitesMet = (tutorial) => {
    // This would typically check against user's completed tutorials
    // For now, we'll simulate that prerequisites are met
    return tutorial.prerequisites.length === 0;
  };

  const isLocked = !getPrerequisitesMet(tutorial);
  const canStart = !isLocked && progress.status !== 'completed';

  return (
    <Card className={`h-full transition-all duration-200 hover:shadow-md ${
      progress.status === 'completed' 
        ? 'border-green-200 bg-green-50/30' 
        : 'border-gray-200 hover:border-blue-300'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
              {tutorial.title}
            </CardTitle>
            
            <div className="flex items-center gap-2 mb-3">
              {getDifficultyIcon(tutorial.difficulty)}
              <Badge 
                variant="outline" 
                className={`text-xs ${
                  tutorial.difficulty === 'beginner' ? 'border-green-200 text-green-700' :
                  tutorial.difficulty === 'intermediate' ? 'border-yellow-200 text-yellow-700' :
                  'border-red-200 text-red-700'
                }`}
              >
                {tutorial.difficulty}
              </Badge>
              
              {tutorial.isRequired && (
                <Badge variant="destructive" className="text-xs">
                  Required
                </Badge>
              )}
            </div>
          </div>
          
          <div className={`p-2 rounded-lg border ${getStatusColor(progress.status)}`}>
            {getStatusIcon(progress.status)}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600 line-clamp-3">
          {tutorial.description}
        </p>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {tutorial.formattedTime}
            </span>
            <span className="flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              {tutorial.category}
            </span>
          </div>
          
          {/* Prerequisites */}
          {tutorial.prerequisites.length > 0 && (
            <div className="text-xs text-gray-500">
              <span className="font-medium">Prerequisites:</span> {tutorial.prerequisites.length} tutorial{tutorial.prerequisites.length !== 1 ? 's' : ''}
            </div>
          )}
          
          {/* Progress indicator */}
          {progress.status === 'in_progress' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Progress</span>
                <span className="font-medium text-gray-900">
                  {progress.timeSpent ? `${progress.timeSpent}m` : 'Just started'}
                </span>
              </div>
              <Progress value={progress.timeSpent ? Math.min((progress.timeSpent / tutorial.estimatedTime) * 100, 100) : 10} className="h-2" />
            </div>
          )}
          
          {/* Resources count */}
          {tutorial.resources && tutorial.resources.length > 0 && (
            <div className="text-xs text-gray-500">
              <span className="font-medium">Resources:</span> {tutorial.resources.length} available
            </div>
          )}
        </div>
        
        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          {isLocked ? (
            <Button 
              variant="outline" 
              disabled 
              className="flex-1"
              title="Complete prerequisites to unlock"
            >
              <Lock className="w-4 h-4 mr-2" />
              Locked
            </Button>
          ) : progress.status === 'completed' ? (
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => onStart(tutorial)}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Review
            </Button>
          ) : (
            <Button 
              onClick={() => onStart(tutorial)}
              className="flex-1"
              disabled={!canStart}
            >
              {progress.status === 'in_progress' ? (
                <>
                  <BookOpen className="w-4 h-4 mr-2" />
                  Continue
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Start
                </>
              )}
            </Button>
          )}
          
          <Button 
            variant="ghost" 
            size="sm"
            className="px-3"
            title="View details"
          >
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TutorialCard;
