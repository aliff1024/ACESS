import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { RotateCcw, Book, TrendingUp } from 'lucide-react';

interface AdaptiveRecommendationsProps {
  onStartLesson: (lessonTitle: string) => void;
}

export function AdaptiveRecommendations({ onStartLesson }: AdaptiveRecommendationsProps) {
  const recommendations = [
    {
      type: 'revision',
      title: 'Review: Basic Fractions',
      difficulty: 'Easy',
      description: 'Based on your recent quiz score (65%), we recommend reviewing this topic to strengthen your understanding.',
      icon: RotateCcw,
      color: 'orange',
      badgeColor: 'bg-green-100 text-green-700 border-green-200',
    },
    {
      type: 'standard',
      title: 'Introduction to Decimals',
      difficulty: 'Medium',
      description: 'Continue your math journey with decimals. This lesson builds on your knowledge of fractions.',
      icon: Book,
      color: 'blue',
      badgeColor: 'bg-blue-100 text-blue-700 border-blue-200',
    },
    {
      type: 'advanced',
      title: 'Advanced Problem Solving',
      difficulty: 'Hard',
      description: 'Challenge yourself with complex problem-solving strategies for students ready to excel.',
      icon: TrendingUp,
      color: 'purple',
      badgeColor: 'bg-purple-100 text-purple-700 border-purple-200',
    },
  ];

  const iconColorClasses = {
    orange: 'bg-orange-100 text-orange-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Recommended Next</h2>
        <p className="text-gray-600">
          Personalized lessons based on your learning progress and performance
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {recommendations.map((rec, index) => {
          const Icon = rec.icon;
          return (
            <Card
              key={index}
              className="p-6 rounded-2xl border-2 border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 flex flex-col"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`w-12 h-12 ${iconColorClasses[rec.color as keyof typeof iconColorClasses]} rounded-lg flex items-center justify-center`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <Badge className={`${rec.badgeColor} border`}>
                  {rec.difficulty}
                </Badge>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                {rec.title}
              </h3>

              <p className="text-gray-600 leading-relaxed mb-6 flex-1">
                {rec.description}
              </p>

              <Button
                onClick={() => onStartLesson(rec.title)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Start Lesson
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
