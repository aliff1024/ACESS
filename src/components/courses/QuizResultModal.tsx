'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { CheckCircle, XCircle, TrendingUp, RotateCcw, BookOpen } from 'lucide-react';

interface QuizResultModalProps {
  isOpen: boolean;
  score: number;
  onClose: () => void;
  onReviewAnswers: () => void;
  onRetryQuiz: () => void;
  onContinueLearning: () => void;
}

export function QuizResultModal({
  isOpen,
  score,
  onClose,
  onReviewAnswers,
  onRetryQuiz,
  onContinueLearning,
}: QuizResultModalProps) {
  const getFeedback = () => {
    if (score < 60) {
      return {
        title: 'You Need Revision',
        message: 'It looks like you might benefit from reviewing the lesson material before moving forward. Take your time and revisit the key concepts.',
        icon: <XCircle className="w-20 h-20 text-red-500" />,
        color: 'red',
        recommendation: 'We recommend revisiting previous lessons to strengthen your understanding.',
      };
    } else if (score < 80) {
      return {
        title: 'Good Progress!',
        message: 'You have a solid understanding of the material. Keep up the good work and continue building on this foundation.',
        icon: <TrendingUp className="w-20 h-20 text-yellow-500" />,
        color: 'yellow',
        recommendation: 'Continue with the next lesson to build on your knowledge.',
      };
    } else {
      return {
        title: 'Excellent Work!',
        message: 'Outstanding! You have demonstrated a strong grasp of the concepts. You are ready to move on to more advanced topics.',
        icon: <CheckCircle className="w-20 h-20 text-green-500" />,
        color: 'green',
        recommendation: 'Unlock advanced lessons and continue your learning journey!',
      };
    }
  };

  const feedback = getFeedback();

  const getScoreColor = () => {
    if (score < 60) return 'text-red-600';
    if (score < 80) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getScoreBackground = () => {
    if (score < 60) return 'bg-red-50 border-red-200';
    if (score < 80) return 'bg-yellow-50 border-yellow-200';
    return 'bg-green-50 border-green-200';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-3xl text-center">Quiz Results</DialogTitle>
          <DialogDescription className="text-center text-gray-600">
            Here's how you performed on this quiz
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          <div className="flex flex-col items-center mb-8">
            {feedback.icon}

            <div className={`mt-6 px-8 py-4 rounded-2xl border-2 ${getScoreBackground()}`}>
              <div className="text-center">
                <p className="text-lg text-gray-600 mb-2">Your Score</p>
                <p className={`text-6xl font-bold ${getScoreColor()}`}>
                  {Math.round(score)}%
                </p>
              </div>
            </div>

            <h3 className="text-2xl font-bold text-gray-900 mt-6 mb-3">
              {feedback.title}
            </h3>
            <p className="text-center text-gray-600 text-lg leading-relaxed max-w-lg">
              {feedback.message}
            </p>
          </div>

          <div className={`p-6 rounded-xl border-2 mb-6 ${
            score < 60 ? 'bg-red-50 border-red-200' :
            score < 80 ? 'bg-blue-50 border-blue-200' :
            'bg-purple-50 border-purple-200'
          }`}>
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Recommended Next Steps
            </h4>
            <p className="text-gray-700">{feedback.recommendation}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={onReviewAnswers}
              variant="outline"
              className="py-6 flex flex-col items-center gap-2 h-auto"
            >
              <BookOpen className="w-6 h-6" />
              <span>Review Answers</span>
            </Button>

            <Button
              onClick={onRetryQuiz}
              variant="outline"
              className="py-6 flex flex-col items-center gap-2 h-auto"
            >
              <RotateCcw className="w-6 h-6" />
              <span>Retry Quiz</span>
            </Button>

            <Button
              onClick={onContinueLearning}
              className="bg-blue-600 hover:bg-blue-700 text-white py-6 flex flex-col items-center gap-2 h-auto"
            >
              <TrendingUp className="w-6 h-6" />
              <span>Continue Learning</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
