'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { QuizPage } from '@/components/courses/QuizPage';
import { QuizResultModal } from '@/components/courses/QuizResultModal';
import { ReviewAnswersPage } from '@/components/courses/ReviewAnswersPage';

type QuizAnswer = { questionId: string; selectedAnswer: string };

export default function QuizClientPage({ lessonId, courseId }: { lessonId: string; courseId: string }) {
  const router = useRouter();
  const [quizScore, setQuizScore] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<QuizAnswer[]>([]);
  const [showQuizResult, setShowQuizResult] = useState(false);
  const [isReviewingAnswers, setIsReviewingAnswers] = useState(false);

  if (isReviewingAnswers) {
    return (
      <ReviewAnswersPage
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
        onBack={() => router.push(`/learner/lesson/${lessonId}?courseId=${courseId}`)}
        onSubmit={(score, answers) => {
          setQuizScore(score);
          setQuizAnswers(answers);
          setShowQuizResult(true);
        }}
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
        }}
        onContinueLearning={() => {
          setShowQuizResult(false);
          router.push(`/learner/courses/${courseId}`);
        }}
      />
    </>
  );
}
