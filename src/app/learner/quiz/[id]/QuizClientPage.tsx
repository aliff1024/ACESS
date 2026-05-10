'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { QuizPage } from '@/components/courses/QuizPage';
import { QuizResultModal } from '@/components/courses/QuizResultModal';
import { ReviewAnswersPage } from '@/components/courses/ReviewAnswersPage';
import { fetchQuizData, submitQuizAttempt } from '@/lib/learner-api';
import { toast } from 'sonner';

export default function QuizClientPage({ lessonId }: { lessonId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get('courseId') || '';
  const [quizId, setQuizId] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<{ questionId: string; selectedAnswer: string }[]>([]);
  const [showQuizResult, setShowQuizResult] = useState(false);
  const [isReviewingAnswers, setIsReviewingAnswers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    fetchQuizData(lessonId).then((data) => {
      if (data) setQuizId(data.id);
    }).catch(() => {});
  }, [lessonId]);

  const handleSubmit = async (score: number, answers: { questionId: string; selectedAnswer: string }[]) => {
    if (!quizId || !courseId || submitting) return;
    setSubmitting(true);
    setQuizAnswers(answers);
    try {
      const transformed = answers.map((a) => ({
        questionId: a.questionId,
        selectedOptionId: a.selectedAnswer,
      }));
      const result = await submitQuizAttempt({ quizId, courseId, answers: transformed });
      setQuizScore(result.score);
      if (result.passed) {
        toast.success('Quiz passed!');
      }
    } catch {
      setQuizScore(score);
      toast.error('Failed to save quiz attempt');
    } finally {
      setSubmitting(false);
      setShowQuizResult(true);
    }
  };

  if (isReviewingAnswers) {
    return (
      <ReviewAnswersPage
        lessonId={lessonId}
        answers={quizAnswers}
        onBack={() => {
          setIsReviewingAnswers(false);
          setShowQuizResult(true);
        }}
        onRetryQuiz={() => {
          setIsReviewingAnswers(false);
          setShowQuizResult(false);
          setQuizAnswers([]);
        }}
      />
    );
  }

  return (
    <>
      <QuizPage
        key={resetKey}
        lessonId={lessonId}
        courseId={courseId}
        onBack={() => router.push(`/learner/lesson/${lessonId}?courseId=${courseId}`)}
        onSubmit={handleSubmit}
      />

      <QuizResultModal
        isOpen={showQuizResult}
        score={quizScore}
        onClose={() => setShowQuizResult(false)}
        onReviewAnswers={() => {
          setShowQuizResult(false);
          setIsReviewingAnswers(true);
        }}
        onRetryQuiz={() => {
          setShowQuizResult(false);
          setQuizAnswers([]);
          setResetKey((k) => k + 1);
        }}
        onContinueLearning={() => {
          setShowQuizResult(false);
          router.push(`/learner/courses/${courseId}`);
        }}
      />
    </>
  );
}
