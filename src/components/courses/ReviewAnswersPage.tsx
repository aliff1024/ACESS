'use client';

import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { CheckCircle, XCircle, BookOpen, RotateCcw, Loader2 } from 'lucide-react';
import { fetchQuizData } from '@/lib/learner-api';
import type { QuizData, QuizOption } from '@/lib/learner-api';

interface ReviewAnswersPageProps {
  lessonId: string;
  answers: { questionId: string; selectedAnswer: string }[];
  onBack: () => void;
  onRetryQuiz: () => void;
}

export function ReviewAnswersPage({ lessonId, answers, onBack, onRetryQuiz }: ReviewAnswersPageProps) {
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuizData(lessonId)
      .then(setQuizData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [lessonId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!quizData) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <p className="text-gray-600">Quiz data not found</p>
      </div>
    );
  }

  const questions = quizData.questions;

  const getOptionById = (questionId: string, optionId: string): QuizOption | undefined => {
    const q = questions.find((q) => q.id === questionId);
    return q?.options.find((o) => o.id === optionId);
  };

  const correctCount = answers.filter((answer) => {
    const question = questions.find((q) => q.id === answer.questionId);
    const correctOption = question?.options.find((o) => o.is_correct);
    return correctOption && correctOption.id === answer.selectedAnswer;
  }).length;

  const score = Math.round((correctCount / questions.length) * 100);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-700 mb-6 flex items-center gap-2"
        >
          &larr; Back to Results
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Answer Review</h1>
              <p className="text-gray-600">Review your answers and learn from explanations</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 mb-1">Your Score</p>
              <p className={`text-4xl font-bold ${
                score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {score}%
              </p>
              <p className="text-sm text-gray-600">
                {correctCount} of {questions.length} correct
              </p>
            </div>
          </div>

          <Button onClick={onRetryQuiz} className="bg-blue-600 hover:bg-blue-700 text-white">
            <RotateCcw className="w-5 h-5 mr-2" />
            Retry Quiz
          </Button>
        </div>

        <div className="space-y-6">
          {questions.map((question, index) => {
            const userAnswer = answers.find((a) => a.questionId === question.id);
            const selectedOption = userAnswer ? getOptionById(question.id, userAnswer.selectedAnswer) : null;
            const correctOption = question.options.find((o) => o.is_correct);
            const isCorrect = userAnswer?.selectedAnswer === correctOption?.id;

            return (
              <Card key={question.id} className="p-6 rounded-2xl border-2 border-gray-200">
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isCorrect ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {isCorrect ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-gray-500">
                        Question {index + 1}
                      </span>
                      <Badge className={isCorrect ? 'bg-green-600' : 'bg-red-600'}>
                        {isCorrect ? 'Correct' : 'Incorrect'}
                      </Badge>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      {question.question_text}
                    </h3>
                  </div>
                </div>

                <div className="space-y-3 mb-4 ml-16">
                  {question.options.map((option) => {
                    const isUserAnswer = userAnswer?.selectedAnswer === option.id;
                    const isCorrectAnswer = option.is_correct;

                    return (
                      <div
                        key={option.id}
                        className={`p-4 rounded-lg border-2 ${
                          isCorrectAnswer
                            ? 'border-green-500 bg-green-50'
                            : isUserAnswer && !isCorrect
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-gray-900">{option.option_text}</span>
                          {isCorrectAnswer && (
                            <Badge className="bg-green-600 text-white ml-auto">
                              Correct Answer
                            </Badge>
                          )}
                          {isUserAnswer && !isCorrect && (
                            <Badge className="bg-red-600 text-white ml-auto">
                              Your Answer
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="ml-16 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <BookOpen className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Explanation</h4>
                      <p className="text-gray-700 leading-relaxed">{correctOption?.option_text} is correct.</p>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <Button onClick={onBack} variant="outline" className="px-8 py-6 text-lg">
            Back to Results
          </Button>
        </div>
      </div>
    </div>
  );
}
