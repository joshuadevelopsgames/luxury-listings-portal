import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

import { 
  BookOpen, 
  Clock, 
  Play, 
  Lock,
  CheckCircle2,
  ArrowRight,
  Star,
  Palette,
  Target,
  BarChart3,
  TrendingUp,
  Shield
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NextTutorials = ({ tutorials }) => {
  const navigate = useNavigate();

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

  const getPrerequisitesMet = (tutorial) => {
    // This would typically check against user's completed tutorials
    // For now, we'll simulate that prerequisites are met
    return tutorial.prerequisites.length === 0;
  };

  const getTutorialStatus = (tutorial) => {
    if (getPrerequisitesMet(tutorial)) {
      return { status: 'available', color: 'text-green-600', bgColor: 'bg-green-50' };
    } else {
      return { status: 'locked', color: 'text-gray-500', bgColor: 'bg-gray-50' };
    }
  };

  const getTutorialIcon = (category) => {
    switch (category) {
      case 'brand-voice':
        return BookOpen;
      case 'workflow':
        return Target;
      case 'tools':
        return Palette;
      case 'fact-checking':
        return Shield;
      case 'post-structure':
        return TrendingUp;
      case 'analytics':
        return BarChart3;
      default:
        return BookOpen;
    }
  };

  if (tutorials.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Next Content Tutorials
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-400" />
            <p className="text-lg font-medium">All content tutorials completed!</p>
            <p className="text-sm">You're ready to lead luxury real estate content strategy!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Next Content Tutorials
          <Badge variant="secondary" className="ml-2">
            {tutorials.length} available
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {tutorials.map((tutorial, index) => {
            const status = getTutorialStatus(tutorial);
            const isAvailable = status.status === 'available';
            const Icon = getTutorialIcon(tutorial.category);
            
            return (
              <div 
                key={tutorial.id} 
                className={`p-4 rounded-lg border transition-all ${
                  isAvailable 
                    ? 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm' 
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${status.bgColor}`}>
                    {isAvailable ? (
                      <Icon className={`w-5 h-5 ${status.color}`} />
                    ) : (
                      <Lock className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className={`font-medium text-sm ${
                        isAvailable ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {tutorial.title}
                      </h4>
                      
                      <div className="flex items-center gap-2">
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
                      </div>
                    </div>
                    
                    <p className={`text-xs mb-3 ${
                      isAvailable ? 'text-gray-600' : 'text-gray-400'
                    }`}>
                      {tutorial.description}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {tutorial.formattedTime}
                        </span>
                        <span className="flex items-center gap-1">
                          <Icon className="w-3 h-3" />
                          {tutorial.category.replace('-', ' ')}
                        </span>
                        {tutorial.isRequired && (
                          <Badge variant="destructive" className="text-xs">
                            Required
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {tutorial.prerequisites.length > 0 && (
                          <Badge variant="outline" className="text-xs text-gray-500">
                            {tutorial.prerequisites.length} prereq{tutorial.prerequisites.length !== 1 ? 's' : ''}
                          </Badge>
                        )}
                        
                        {isAvailable ? (
                          <Button size="sm" className="h-8 px-3" onClick={() => navigate(`/tutorials/${tutorial.id}`)}>
                            <Play className="w-3 h-3 mr-1" />
                            Start
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" disabled className="h-8 px-3">
                            <Lock className="w-3 h-3" />
                            Locked
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {/* Prerequisites info */}
                    {tutorial.prerequisites.length > 0 && !isAvailable && (
                      <div className="mt-3 p-2 bg-yellow-50 rounded border border-yellow-200">
                        <p className="text-xs text-yellow-800">
                          Complete prerequisite tutorials to unlock this content
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <span className="font-medium">Content Leadership Path</span>
              <p className="text-xs mt-1">Follow the recommended order for luxury content mastery</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/tutorials')}>
              View All Tutorials
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NextTutorials;
