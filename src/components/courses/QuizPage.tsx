'use client';

import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Progress } from '../ui/progress';
import { Clock, CheckCircle, Loader2 } from 'lucide-react';
import { fetchQuizData } from '@/lib/learner-api';
import type { QuizData, QuizOption } from '@/lib/learner-api';

interface QuizPageProps {
  lessonId: string;
  courseId: string;
  onBack: () => void;
  onSubmit: (score: number, answers: { questionId: string; selectedAnswer: string }[]) => void;
}

export function QuizPage({ lessonId, courseId, onBack, onSubmit }: QuizPageProps) {
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ questionId: string; selectedAnswer: string }[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  useEffect(() => {
    fetchQuizData(lessonId)
      .then(setQuizData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [lessonId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!quizData || quizData.questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="p-8 text-center">
          <p className="text-gray-600 mb-4">No quiz available for this lesson</p>
          <Button onClick={onBack} className="bg-blue-600 text-white">
            Back to Lesson
          </Button>
        </Card>
      </div>
    );
  }

  const questions = quizData.questions;
  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  const handleSelectOption = (optionId: string) => {
    setSelectedOption(optionId);
  };

  const handleNext = () => {
    if (selectedOption) {
      const updatedAnswers = [
        ...answers.filter((a) => a.questionId !== currentQuestion.id),
        { questionId: currentQuestion.id, selectedAnswer: selectedOption },
      ];
      setAnswers(updatedAnswers);
      setSelectedOption(null);

      if (isLastQuestion) {
        const correctCount = updatedAnswers.filter((answer) => {
          const question = questions.find((q) => q.id === answer.questionId);
          const correctOption = question?.options.find((o) => o.is_correct);
          return correctOption && correctOption.id === answer.selectedAnswer;
        }).length;
        const score = (correctCount / questions.length) * 100;
        onSubmit(score, updatedAnswers);
      } else {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        const existing = answers.find((a) => a.questionId === questions[currentQuestionIndex + 1].id);
        setSelectedOption(existing?.selectedAnswer || null);
      }
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      const previousAnswer = answers.find((a) => a.questionId === questions[currentQuestionIndex - 1].id);
      setSelectedOption(previousAnswer?.selectedAnswer || null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-700 mb-6 flex items-center gap-2"
        >
          &larr; Back to Lesson
        </button>

        <Card className="p-8 rounded-2xl border-2 border-gray-200 mb-6">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold text-gray-900">{quizData.title}</h1>
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="w-5 h-5" />
                <span className="text-lg">{quizData.time_limit_seconds ? `${Math.round(quizData.time_limit_seconds / 60)} min` : 'No time limit'}</span>
              </div>
            </div>

            <div className="flex items-center gap-4 mb-2">
              <span className="text-lg font-semibold text-gray-900">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-8 leading-relaxed">
              {currentQuestion.question_text}
            </h2>

            <div className="space-y-4">
              {currentQuestion.options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleSelectOption(option.id)}
                  className={`w-full p-6 rounded-xl border-2 text-left transition-all duration-200 ${
                    selectedOption === option.id
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        selectedOption === option.id
                          ? 'border-blue-600 bg-blue-600'
                          : 'border-gray-300'
                      }`}
                    >
                      {selectedOption === option.id && (
                        <CheckCircle className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <span className="text-lg text-gray-900">{option.option_text}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <Button
              onClick={handlePrevious}
              variant="outline"
              disabled={currentQuestionIndex === 0}
              className="px-8 py-6 text-lg"
            >
              Previous
            </Button>

            <div className="flex gap-2">
              {questions.map((_, index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full ${
                    index < currentQuestionIndex
                      ? 'bg-green-500'
                      : index === currentQuestionIndex
                      ? 'bg-blue-500'
                      : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>

            <Button
              onClick={handleNext}
              disabled={!selectedOption}
              className={`px-8 py-6 text-lg ${
                selectedOption
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isLastQuestion ? 'Submit Quiz' : 'Next Question'}
            </Button>
          </div>
        </Card>

        <div className="text-center text-sm text-gray-600">
          <p>Take your time and read each question carefully</p>
        </div>
      </div>
    </div>
  );
}
