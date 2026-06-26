'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Clock, CheckCircle, Loader2, Flag, AlertTriangle, ChevronLeft, ChevronRight, HelpCircle, BarChart3, RotateCcw, Volume2, Info } from 'lucide-react';
import { fetchQuizData, checkQuizAttempts, fetchQuizAttemptHistory } from '@/lib/learner-api';
import type { QuizData } from '@/lib/learner-api';
import { useAccessibility } from '@/providers/AccessibilityProvider';
import { useTranslation } from '@/lib/useTranslation';

interface QuizPageProps {
  lessonId: string;
  courseId: string;
  onBack: () => void;
  onSubmit: (score: number, answers: { questionId: string; selectedAnswer: string }[]) => void;
  adaptiveLearningEnabled?: boolean;
  simplifiedSummary?: string | null;
  onSuggestReview?: () => void;
  hideBackButton?: boolean;
  simulatedAttempts?: number;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function QuizPage({
  lessonId, courseId, onBack, onSubmit,
  adaptiveLearningEnabled = false,
  simplifiedSummary = null,
  onSuggestReview,
  hideBackButton = false,
  simulatedAttempts = 0,
}: QuizPageProps) {
  const { t } = useTranslation();
  const { settings } = useAccessibility();
  const [activeTab, setActiveTab] = useState<'info' | 'history'>('info');
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState<{ reason: string } | null>(null);
  const [showStartScreen, setShowStartScreen] = useState(true);
  const [attemptHistory, setAttemptHistory] = useState<{ attempt_number: number; score_pct: number; result: string; created_at: string }[]>([]);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [maxAttempts, setMaxAttempts] = useState<number | null>(null);
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
      fetchQuizAttemptHistory(lessonId, courseId),
    ])
      .then(([quiz, attemptCheck, history]) => {
        if (!quiz || quiz.questions.length === 0) {
          setBlocked({ reason: 'no_quiz' });
          return;
        }
        if (!attemptCheck.canAttempt) {
          setBlocked({ reason: attemptCheck.message || 'max_attempts' });
          return;
        }
        setQuizData(quiz);
        setAttemptHistory(history.attempts);
        setUsedAttempts(history.usedAttempts + simulatedAttempts);
        setMaxAttempts(history.maxAttempts);
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
              <p className="text-gray-600 mb-4">{t('quiz.noQuiz')}</p>
            </>
          )}
          {blocked.reason === 'max_attempts' && (
            <>
              <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <p className="text-gray-800 font-semibold mb-2">{t('quiz.maxAttempts')}</p>
              <p className="text-gray-600 mb-4">{t('quiz.maxAttemptsDesc')}</p>
            </>
          )}
          {blocked.reason === 'error' && (
            <>
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">{t('quiz.failedToLoad')}</p>
            </>
          )}
          {!hideBackButton && (
            <Button onClick={onBack} className="bg-blue-600 text-white">
              {t('quiz.backToLesson')}
            </Button>
          )}
        </Card>
      </div>
    );
  }

  if (!quizData) return null;

  const questions = quizData.questions;
  const timeLow = timeRemaining !== null && timeRemaining <= 120;

  if (showStartScreen) {
    const bestScore = attemptHistory.length > 0 ? Math.max(...attemptHistory.map(a => a.score_pct)) : null;
    const avgScore = attemptHistory.length > 0 ? Math.round(attemptHistory.reduce((sum, a) => sum + a.score_pct, 0) / attemptHistory.length) : null;
    const passedCount = attemptHistory.filter(a => a.result === 'pass').length;

    return (
      <div className="min-h-screen bg-gray-50 flex items-start justify-center p-6 pt-10">
        <div className="max-w-2xl w-full space-y-6">
          {/* Quiz header card */}
          <Card className="p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1">{quizData.title}</h1>
                <p className="text-gray-500">{t(questions.length === 1 ? 'quiz.questions' : 'quiz.questions_plural', { n: questions.length })}</p>
              </div>
              {bestScore !== null && (
                <div className="text-right">
                  <p className="text-sm text-gray-500 mb-0.5">{t('quiz.bestScore')}</p>
                  <p className={`text-3xl font-bold ${bestScore >= (quizData.pass_threshold_pct ?? 80) ? 'text-green-600' : 'text-amber-600'}`}>
                    {bestScore}%
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-4 gap-3 mb-6">
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-xs text-blue-600 font-medium mb-1">{t('quiz.questionsLabel')}</p>
                <p className="text-2xl font-bold text-blue-900">{questions.length}</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-4">
                <p className="text-xs text-purple-600 font-medium mb-1">{t('quiz.timeLimit')}</p>
                <p className="text-2xl font-bold text-purple-900">
                  {quizData.time_limit_seconds ? `${Math.round(quizData.time_limit_seconds / 60)} min` : t('quiz.noTimeLimit')}
                </p>
              </div>
              <div className="bg-amber-50 rounded-xl p-4">
                <p className="text-xs text-amber-600 font-medium mb-1">{t('quiz.passThreshold')}</p>
                <p className="text-2xl font-bold text-amber-900">{quizData.pass_threshold_pct ?? 80}%</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-xs text-green-600 font-medium mb-1">{t('quiz.attempts')}</p>
                <p className="text-2xl font-bold text-green-900">
                  {usedAttempts}{maxAttempts ? ` / ${maxAttempts}` : ''}
                </p>
              </div>
            </div>

            {settings.structure_mode === 'checklist' && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5 mb-6 text-blue-900">
                <h3 className="font-bold flex items-center gap-2 mb-2"><Info className="w-5 h-5 text-blue-600"/> {t('quiz.clearExpectations')}</h3>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>{t('quiz.expectation1', { n: questions.length })}</li>
                  {quizData.time_limit_seconds ? <li>{t('quiz.expectationTimed', { n: Math.round(quizData.time_limit_seconds / 60) })}</li> : <li>{t('quiz.expectationUntimed')}</li>}
                  <li>{t('quiz.expectationPass', { pct: quizData.pass_threshold_pct ?? 80 })}</li>
                  {maxAttempts ? <li>{t('quiz.expectationAttempts', { n: maxAttempts - usedAttempts })}</li> : <li>{t('quiz.expectationUnlimited')}</li>}
                  <li>{t('quiz.expectationNoTricks')}</li>
                </ul>
              </div>
            )}

            {attemptHistory.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500 font-medium">{t('quiz.average')}</p>
                  <p className={`text-lg font-bold ${avgScore !== null && avgScore >= (quizData.pass_threshold_pct ?? 80) ? 'text-green-600' : 'text-amber-600'}`}>
                    {avgScore !== null ? `${avgScore}%` : '-'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500 font-medium">{t('quiz.passed')}</p>
                  <p className="text-lg font-bold text-green-600">{passedCount}/{attemptHistory.length}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500 font-medium">{t('quiz.highest')}</p>
                  <p className={`text-lg font-bold ${bestScore !== null && bestScore >= (quizData.pass_threshold_pct ?? 80) ? 'text-green-600' : 'text-amber-600'}`}>
                    {bestScore !== null ? `${bestScore}%` : '-'}
                  </p>
                </div>
              </div>
            )}

            {maxAttempts && usedAttempts >= maxAttempts ? (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6 text-center">
                <AlertTriangle className="w-6 h-6 text-red-500 mx-auto mb-2" />
                <p className="text-red-800 font-semibold">{t('quiz.noAttempts')}</p>
                <p className="text-red-600 text-sm mt-1">{t('quiz.noAttemptsDesc', { n: maxAttempts })}</p>
              </div>
            ) : (
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowStartScreen(false)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg flex-1"
                >
                  {t('quiz.startAttempt')}
                </Button>
                {!hideBackButton && (
                  <Button
                    onClick={onBack}
                    variant="outline"
                    className="px-6 py-6 text-lg"
                  >
                    {t('quiz.backToLesson')}
                  </Button>
                )}
              </div>
            )}
          </Card>

          {/* Attempt history with score bars */}
          {attemptHistory.length > 0 && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-gray-500" />
                {t('quiz.attemptHistory')}
              </h2>
              <div className="space-y-2">
                {attemptHistory.map((attempt) => {
                  const passThreshold = quizData.pass_threshold_pct ?? 80;
                  return (
                    <div
                      key={attempt.attempt_number}
                      className="p-4 rounded-xl border border-gray-200 bg-white"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            attempt.result === 'pass' ? 'bg-green-100' : 'bg-red-100'
                          }`}>
                            <RotateCcw className={`w-4 h-4 ${attempt.result === 'pass' ? 'text-green-600' : 'text-red-600'}`} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{t('quiz.attempt', { n: attempt.attempt_number })}</p>
                            <p className="text-xs text-gray-500">{formatDate(attempt.created_at)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${
                            attempt.result === 'pass' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {attempt.score_pct}%
                          </p>
                          <p className={`text-xs font-medium ${
                            attempt.result === 'pass' ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {attempt.result === 'pass' ? t('quiz.passedLabel') : t('quiz.failedLabel')}
                          </p>
                        </div>
                      </div>
                      {/* Score bar */}
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            attempt.result === 'pass' ? 'bg-green-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${attempt.score_pct}%` }}
                        />
                      </div>
                      {/* Pass threshold marker */}
                      <div className="relative h-0">
                        <div
                          className="absolute top-1 w-0.5 h-3 bg-gray-400"
                          style={{ left: `${passThreshold}%` }}
                          title={`Pass threshold: ${passThreshold}%`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              {maxAttempts && (
                <p className="text-xs text-gray-400 mt-4 text-center">
                  {t('quiz.attemptsUsed', { used: usedAttempts, total: maxAttempts })}
                </p>
              )}
            </Card>
          )}
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ── Top bar ── */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
        {!hideBackButton ? (
          <button onClick={onBack} className="text-blue-600 hover:text-blue-700 flex items-center gap-1.5 text-sm font-medium">
            <ChevronLeft className="w-4 h-4" />
            {t('quiz.backToLesson')}
          </button>
        ) : (
          <div />
        )}
        <h1 className="text-lg font-semibold text-gray-900 truncate mx-4">{quizData.title}</h1>
        <div className="flex items-center gap-3 shrink-0">
          {timeRemaining !== null ? (
            <div className={`quiz-timer flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${
              timeLow && !settings.distraction_free_mode && !settings.simplified_ui ? 'bg-red-50 text-red-700 animate-pulse' : 'bg-gray-100 text-gray-700'
            }`}>
              <Clock className="w-4 h-4" />
              <span className="tabular-nums">{formatTime(timeRemaining)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 text-sm">
              <Clock className="w-4 h-4" />
              {t('quiz.noTimeLimit')}
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* ── Left sidebar ── */}
        {!settings.distraction_free_mode && !settings.simplified_ui && (
          <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0 question-sidebar simplifiable">
          <div className="p-4 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t('quiz.sidebarQuestions')}</p>
            <p className="text-xs text-gray-400">
              {t('quiz.answeredOf', { answered: answeredCount, total: questions.length })}
              {reviewCount > 0 && ` \u00B7 ${t('quiz.flaggedCount', { n: reviewCount })}`}
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
              {t('quiz.answered')}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="w-3 h-3 rounded-full bg-amber-400 shrink-0" />
              {t('quiz.flaggedForReview')}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="w-3 h-3 rounded-full border-2 border-gray-300 shrink-0" />
              {t('quiz.unanswered')}
            </div>
          </div>
        </aside>
        )}

        {/* ── Main content ── */}
        <main className="flex-1 overflow-y-auto p-6 relative">
          <div className={settings.distraction_free_mode ? "max-w-full px-4 sm:px-8 xl:px-12 mx-auto" : "max-w-3xl mx-auto"}>
            
            {!(settings.chunked_content_mode || settings.layout_mode === 'slide') ? (
              // ── FULL SCROLL VIEW (CHUNKED OFF) ──
              <div className="space-y-12 pb-24">
                {questions.map((q, qIndex) => {
                  const savedAnswer = answers.find(a => a.questionId === q.id)?.selectedAnswer;
                  const isMarked = markedForReview.has(q.id);
                  
                  return (
                    <div key={q.id} id={`question-${qIndex}`} className="pt-8 border-t border-gray-200 first:border-0 first:pt-0">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-gray-500">
                          {t('quiz.questionOf', { n: qIndex + 1, total: questions.length })}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setMarkedForReview(prev => {
                              const next = new Set(prev);
                              if (next.has(q.id)) next.delete(q.id);
                              else next.add(q.id);
                              return next;
                            });
                          }}
                          className={`text-sm gap-1.5 ${isMarked ? 'text-amber-600 bg-amber-50 hover:bg-amber-100' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                          <Flag className={`w-4 h-4 ${isMarked ? 'fill-amber-500' : ''}`} />
                          {isMarked ? t('quiz.flaggedForReview') : t('quiz.flagForReview')}
                        </Button>
                      </div>

                      <div className="flex items-start justify-between gap-4 mb-4">
                        <h2 className="text-xl font-semibold text-gray-900 leading-relaxed">
                          {q.question_text}
                        </h2>
                      </div>
                      
                      {q.image_url && (
                        <div className="mt-4 mb-6 rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                          <img src={q.image_url} alt="" className="w-full max-h-64 object-contain" role="presentation" />
                        </div>
                      )}

                      <div className="space-y-3">
                        {q.options.map((option) => (
                          <button
                            key={option.id}
                            onClick={() => {
                              setAnswers(prev => {
                                const rest = prev.filter(a => a.questionId !== q.id);
                                return [...rest, { questionId: q.id, selectedAnswer: option.id }];
                              });
                              // Also set it as selectedOption if it happens to be the current index (keeps states somewhat in sync)
                              if (qIndex === currentQuestionIndex) {
                                setSelectedOption(option.id);
                              }
                            }}
                            className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                              savedAnswer === option.id
                                ? 'border-blue-500 bg-blue-50 shadow-md'
                                : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                  savedAnswer === option.id ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                                }`}>
                                  {savedAnswer === option.id && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                                </div>
                                <span className="text-base text-gray-900">{option.option_text}</span>
                              </div>
                              {option.image_url && (
                                <img
                                  src={option.image_url}
                                  alt=""
                                  className="w-40 h-40 rounded-xl object-contain sm:ml-auto shrink-0 border border-gray-200 bg-gray-50"
                                  role="presentation"
                                />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
                
                <div className="pt-8 border-t border-gray-200 text-center">
                  <Button
                    onClick={handleAutoSubmit}
                    disabled={submitting || answers.length === 0}
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-6 text-lg w-full md:w-auto"
                  >
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                    {submitting ? t('quiz.submitting') : t('quiz.submitQuiz')}
                  </Button>
                </div>
              </div>

            ) : (

              // ── CHUNKED VIEW (STEP-BY-STEP) ──
              <>
                {/* Question header */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-500">
                      {t('quiz.questionOf', { n: currentQuestionIndex + 1, total: questions.length })}
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
                      {markedForReview.has(currentQuestion.id) ? t('quiz.flaggedForReview') : t('quiz.flagForReview')}
                    </Button>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="text-xl font-semibold text-gray-900 leading-relaxed">
                      {currentQuestion.question_text}
                    </h2>
                    {(settings.tts_enabled) && (
                      <Button
                        variant="outline"
                        size="icon"
                        className="shrink-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => {
                          window.speechSynthesis.cancel();
                          const u = new SpeechSynthesisUtterance(currentQuestion.question_text);
                          window.speechSynthesis.speak(u);
                        }}
                        title={t('quiz.readAloud')}
                      >
                        <Volume2 className="w-5 h-5" />
                      </Button>
                    )}
                  </div>
                  {currentQuestion.image_url && (
                    <div className="mt-4 rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                      <img
                        src={currentQuestion.image_url}
                        alt=""
                        className="w-full max-h-64 object-contain"
                        role="presentation"
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
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
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
                        </div>
                        {option.image_url && (
                          <img
                            src={option.image_url}
                            alt=""
                            className="w-40 h-40 rounded-xl object-contain sm:ml-auto shrink-0 border border-gray-200 bg-gray-50"
                            role="presentation"
                          />
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {adaptiveHint && (
                  <Card className="p-4 mb-4 border-2 border-violet-200 bg-violet-50">
                    <p className="text-sm font-semibold text-violet-900 mb-1">{t('quiz.tryAgain')}</p>
                    <p className="text-sm text-violet-800 mb-3">{adaptiveHint}</p>
                    {onSuggestReview && (
                      <Button type="button" variant="outline" size="sm" onClick={onSuggestReview} className="border-violet-300 text-violet-800">
                        {t('quiz.reviewLesson')}
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
                    {t('quiz.previous')}
                  </Button>

                  <div className="flex gap-1.5 hidden md:flex">
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
                          title={t('quiz.questionTooltip', { n: index + 1, answered: isAnswered ? t('quiz.answered') : '', flagged: isMarked ? t('quiz.flagged') : '' })}
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
                      t('quiz.submitQuiz')
                    ) : (
                      <>
                        {t('quiz.next')}
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
