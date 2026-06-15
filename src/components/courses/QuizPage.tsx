'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Clock, CheckCircle, Loader2, Flag, AlertTriangle, ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react';
import { fetchQuizData, checkQuizAttempts } from '@/lib/learner-api';
import type { QuizData } from '@/lib/learner-api';

interface QuizPageProps {
  lessonId: string;
  courseId: string;
  onBack: () => void;
  onSubmit: (score: number, answers: { questionId: string; selectedAnswer: string }[]) => void;
  adaptiveLearningEnabled?: boolean;
  simplifiedSummary?: string | null;
  onSuggestReview?: () => void;
}

export function QuizPage({
  lessonId, courseId, onBack, onSubmit,
  adaptiveLearningEnabled = false,
  simplifiedSummary = null,
  onSuggestReview,
}: QuizPageProps) {
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState<{ reason: string } | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ questionId: string; selectedAnswer: string }[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [adaptiveHint, setAdaptiveHint] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSubmitRef = useRef<() => void>(() => {});
  const answersRef = useRef(answers);

  const calculateScore = useCallback((answersList: { questionId: string; selectedAnswer: string }[]) => {
    if (!quizData) return 0;
    const correctCount = answersList.filter((answer) => {
      const question = quizData.questions.find((q) => q.id === answer.questionId);
      const correctOption = question?.options.find((o) => o.is_correct);
      return correctOption && correctOption.id === answer.selectedAnswer;
    }).length;
    return (correctCount / quizData.questions.length) * 100;
  }, [quizData]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleAutoSubmit = useCallback(() => {
    clearTimer();
    setSubmitting(true);
    const score = calculateScore(answersRef.current);
    onSubmit(score, answersRef.current);
  }, [clearTimer, calculateScore, onSubmit]);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    autoSubmitRef.current = handleAutoSubmit;
  }, [handleAutoSubmit]);

  useEffect(() => {
    Promise.all([
      fetchQuizData(lessonId),
      checkQuizAttempts(lessonId, courseId),
    ])
      .then(([quiz, attemptCheck]) => {
        if (!quiz || quiz.questions.length === 0) {
          setBlocked({ reason: 'no_quiz' });
          return;
        }
        if (!attemptCheck.canAttempt) {
          setBlocked({ reason: attemptCheck.message || 'max_attempts' });
          return;
        }
        setQuizData(quiz);
        if (quiz.time_limit_seconds && quiz.time_limit_seconds > 0) {
          setTimeRemaining(quiz.time_limit_seconds);
        }
      })
      .catch(() => setBlocked({ reason: 'error' }))
      .finally(() => setLoading(false));

    return () => clearTimer();
  }, [lessonId, courseId, clearTimer]);

  const isTimerActive = timeRemaining !== null && timeRemaining > 0;

  useEffect(() => {
    if (!isTimerActive) return;
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearTimer();
          autoSubmitRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearTimer();
  }, [isTimerActive, clearTimer]);

  const handleSelectOption = (optionId: string) => {
    setSelectedOption(optionId);
    setAdaptiveHint(null);
  };

  const navigateToQuestion = (index: number) => {
    if (selectedOption !== null) {
      const updatedAnswers = [
        ...answers.filter((a) => a.questionId !== quizData!.questions[currentQuestionIndex].id),
        { questionId: quizData!.questions[currentQuestionIndex].id, selectedAnswer: selectedOption },
      ];
      setAnswers(updatedAnswers);
    }
    setCurrentQuestionIndex(index);
    const existing = answers.find((a) => a.questionId === quizData!.questions[index].id);
    setSelectedOption(existing?.selectedAnswer || null);
  };

  const handleNext = () => {
    if (!quizData) return;
    if (selectedOption !== null) {
      const question = quizData.questions[currentQuestionIndex];
      const correctOption = question.options.find((o) => o.is_correct);
      const isWrong = correctOption && correctOption.id !== selectedOption;

      if (adaptiveLearningEnabled && isWrong) {
        const hint = simplifiedSummary
          ? `That answer wasn't quite right. Re-read the simplified summary: "${simplifiedSummary.slice(0, 160)}${simplifiedSummary.length > 160 ? '…' : ''}"`
          : 'That answer wasn\'t quite right. Try reviewing the lesson section related to this question before continuing.';
        setAdaptiveHint(hint);
        return;
      }

      setAdaptiveHint(null);
      const updatedAnswers = [
        ...answers.filter((a) => a.questionId !== question.id),
        { questionId: question.id, selectedAnswer: selectedOption },
      ];
      setAnswers(updatedAnswers);

      if (currentQuestionIndex === quizData.questions.length - 1) {
        setSubmitting(true);
        const score = calculateScore(updatedAnswers);
        onSubmit(score, updatedAnswers);
      } else {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        const existing = updatedAnswers.find((a) => a.questionId === quizData.questions[currentQuestionIndex + 1].id);
        setSelectedOption(existing?.selectedAnswer || null);
      }
    }
  };

  const handlePrevious = () => {
    if (!quizData) return;
    if (currentQuestionIndex > 0) {
      if (selectedOption !== null) {
        const updatedAnswers = [
          ...answers.filter((a) => a.questionId !== quizData.questions[currentQuestionIndex].id),
          { questionId: quizData.questions[currentQuestionIndex].id, selectedAnswer: selectedOption },
        ];
        setAnswers(updatedAnswers);
      }
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      const existing = answers.find((a) => a.questionId === quizData.questions[currentQuestionIndex - 1].id);
      setSelectedOption(existing?.selectedAnswer || null);
    }
  };

  const toggleMarkForReview = () => {
    if (!quizData) return;
    const qId = quizData.questions[currentQuestionIndex].id;
    setMarkedForReview((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const answeredCount = answers.length;
  const reviewCount = markedForReview.size;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (blocked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="p-8 text-center max-w-md">
          {blocked.reason === 'no_quiz' && (
            <>
              <HelpCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No quiz available for this lesson</p>
            </>
          )}
          {blocked.reason === 'max_attempts' && (
            <>
              <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <p className="text-gray-800 font-semibold mb-2">Maximum attempts reached</p>
              <p className="text-gray-600 mb-4">You have used all available attempts for this quiz.</p>
            </>
          )}
          {blocked.reason === 'error' && (
            <>
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">Failed to load quiz. Please try again.</p>
            </>
          )}
          <Button onClick={onBack} className="bg-blue-600 text-white">
            Back to Lesson
          </Button>
        </Card>
      </div>
    );
  }

  if (!quizData) return null;

  const questions = quizData.questions;
  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;
  const timeLow = timeRemaining !== null && timeRemaining <= 120;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ── Top bar ── */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
        <button onClick={onBack} className="text-blue-600 hover:text-blue-700 flex items-center gap-1.5 text-sm font-medium">
          <ChevronLeft className="w-4 h-4" />
          Back to Lesson
        </button>
        <h1 className="text-lg font-semibold text-gray-900 truncate mx-4">{quizData.title}</h1>
        <div className="flex items-center gap-3 shrink-0">
          {timeRemaining !== null ? (
            <div className={`quiz-timer flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${
              timeLow ? 'bg-red-50 text-red-700 animate-pulse' : 'bg-gray-100 text-gray-700'
            }`}>
              <Clock className="w-4 h-4" />
              <span className="tabular-nums">{formatTime(timeRemaining)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 text-sm">
              <Clock className="w-4 h-4" />
              No time limit
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* ── Left sidebar ── */}
        <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0 question-sidebar simplifiable">
          <div className="p-4 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Questions</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {answeredCount} of {questions.length} answered
              {reviewCount > 0 && ` · ${reviewCount} flagged`}
            </p>
          </div>
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {questions.map((q, index) => {
              const isCurrent = index === currentQuestionIndex;
              const isAnswered = answers.some((a) => a.questionId === q.id);
              const isMarked = markedForReview.has(q.id);

              let dotStyle = 'border-2 border-gray-300 bg-white';
              let ringStyle = '';
              if (isCurrent) ringStyle = 'ring-2 ring-blue-400';
              if (isAnswered) dotStyle = 'bg-green-500 border-green-500 text-white';
              if (isMarked && !isAnswered) dotStyle = 'bg-amber-400 border-amber-400 text-white';
              if (isMarked && isAnswered) dotStyle = 'bg-green-500 border-green-500 text-white';

              return (
                <button
                  key={q.id}
                  onClick={() => navigateToQuestion(index)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isCurrent
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : isAnswered
                      ? 'text-gray-700 hover:bg-gray-50'
                      : 'text-gray-500 hover:bg-gray-50'
                  } ${ringStyle}`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${dotStyle}`}>
                    {isAnswered ? <CheckCircle className="w-3.5 h-3.5" /> : index + 1}
                  </span>
                  <span className="truncate">Question {index + 1}</span>
                  {isMarked && <Flag className="w-3.5 h-3.5 text-amber-500 ml-auto shrink-0" />}
                </button>
              );
            })}
          </nav>
          <div className="p-3 border-t border-gray-100 space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="w-3 h-3 rounded-full bg-green-500 shrink-0" />
              Answered
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="w-3 h-3 rounded-full bg-amber-400 shrink-0" />
              Flagged for review
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="w-3 h-3 rounded-full border-2 border-gray-300 shrink-0" />
              Unanswered
            </div>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto">
            {/* Question header */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-500">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMarkForReview}
                  className={`flag-for-review text-sm gap-1.5 ${
                    markedForReview.has(currentQuestion.id)
                      ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Flag className={`w-4 h-4 ${markedForReview.has(currentQuestion.id) ? 'fill-amber-500' : ''}`} />
                  {markedForReview.has(currentQuestion.id) ? 'Flagged for Review' : 'Flag for Review'}
                </Button>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 leading-relaxed">
                {currentQuestion.question_text}
              </h2>
              {currentQuestion.image_url && (
                <div className="mt-4 rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                  <img
                    src={currentQuestion.image_url}
                    alt="Question illustration"
                    className="w-full max-h-64 object-contain"
                  />
                </div>
              )}
            </div>

            {/* Options */}
            <div className="space-y-3 mb-8">
              {currentQuestion.options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleSelectOption(option.id)}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                    selectedOption === option.id
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        selectedOption === option.id
                          ? 'border-blue-600 bg-blue-600'
                          : 'border-gray-300'
                      }`}
                    >
                      {selectedOption === option.id && (
                        <CheckCircle className="w-3.5 h-3.5 text-white" />
                      )}
                    </div>
                    <span className="text-base text-gray-900">{option.option_text}</span>
                    {option.image_url && (
                      <img
                        src={option.image_url}
                        alt=""
                        className="w-10 h-10 rounded-lg object-cover ml-auto shrink-0"
                      />
                    )}
                  </div>
                </button>
              ))}
            </div>

            {adaptiveHint && (
              <Card className="p-4 mb-4 border-2 border-violet-200 bg-violet-50">
                <p className="text-sm font-semibold text-violet-900 mb-1">Try again</p>
                <p className="text-sm text-violet-800 mb-3">{adaptiveHint}</p>
                {onSuggestReview && (
                  <Button type="button" variant="outline" size="sm" onClick={onSuggestReview} className="border-violet-300 text-violet-800">
                    Review lesson content
                  </Button>
                )}
              </Card>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <Button
                onClick={handlePrevious}
                variant="outline"
                disabled={isFirstQuestion}
                className="gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>

              <div className="flex gap-1.5">
                {questions.map((_, index) => {
                  const isCurrent = index === currentQuestionIndex;
                  const isAnswered = answers.some((a) => a.questionId === questions[index].id);
                  const isMarked = markedForReview.has(questions[index].id);
                  let bg = 'bg-gray-300';
                  if (isAnswered) bg = 'bg-green-500';
                  if (isMarked && !isAnswered) bg = 'bg-amber-400';
                  if (isCurrent) bg = 'bg-blue-500';
                  return (
                    <button
                      key={index}
                      onClick={() => navigateToQuestion(index)}
                      className={`w-2.5 h-2.5 rounded-full ${bg} transition-colors`}
                      title={`Question ${index + 1}${isAnswered ? ' (answered)' : ''}${isMarked ? ' (flagged)' : ''}`}
                    />
                  );
                })}
              </div>

              <Button
                onClick={handleNext}
                disabled={!selectedOption || submitting}
                className={`gap-1.5 ${
                  selectedOption && !submitting
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isLastQuestion ? (
                  'Submit Quiz'
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
