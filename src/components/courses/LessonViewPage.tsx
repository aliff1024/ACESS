'use client';

import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Volume2, FileText, BookOpen, HelpCircle, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { fetchLessonContent, fetchQuizData, submitQuizAttempt, markLessonViewed } from '@/lib/learner-api';
import { fetchLessonAssets } from '@/lib/educator-api';
import type { LessonContent, QuizData } from '@/lib/learner-api';
import type { LessonAsset } from '@/lib/educator-api';
import { PdfViewer } from './PdfViewer';
import { QuizPage } from './QuizPage';
import { QuizResultModal } from './QuizResultModal';
import { ReviewAnswersPage } from './ReviewAnswersPage';
import { toast } from 'sonner';

interface LessonViewPageProps {
  lessonId: string;
  courseId: string;
  onBack: () => void;
  onNextLesson?: () => void;
  onPreviousLesson?: () => void;
}

type TabId = 'content' | 'pdf' | 'quiz';

export function LessonViewPage({
  lessonId,
  courseId,
  onBack,
  onNextLesson,
  onPreviousLesson,
}: LessonViewPageProps) {
  const [lesson, setLesson] = useState<LessonContent | null>(null);
  const [assets, setAssets] = useState<LessonAsset[]>([]);
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTranscript, setShowTranscript] = useState(false);
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('content');

  // Quiz flow state
  const [quizId, setQuizId] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<{ questionId: string; selectedAnswer: string }[]>([]);
  const [showQuizResult, setShowQuizResult] = useState(false);
  const [isReviewingAnswers, setIsReviewingAnswers] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchLessonContent(lessonId),
      fetchLessonAssets(lessonId).catch(() => [] as LessonAsset[]),
      fetchQuizData(lessonId),
    ])
      .then(([lessonData, assetData, quizResult]) => {
        if (lessonData) {
          setLesson(lessonData);
          markLessonViewed(lessonId, courseId).catch(() => {});
        }
        setAssets(assetData);
        if (quizResult) {
          setQuizData(quizResult);
          setQuizId(quizResult.id);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [lessonId, courseId]);

  const handlePlayTTS = () => {
    setIsPlayingTTS(!isPlayingTTS);
  };

  const hasPdfAssets = assets.length > 0;
  const hasQuiz = quizData !== null;

  const tabs: { id: TabId; label: string; icon: typeof BookOpen }[] = [
    { id: 'content', label: 'Lesson', icon: BookOpen },
    ...(hasPdfAssets ? [{ id: 'pdf' as const, label: 'PDF Materials', icon: FileText }] : []),
    ...(hasQuiz ? [{ id: 'quiz' as const, label: 'Quiz', icon: HelpCircle }] : []),
  ];

  const handleQuizSubmit = async (score: number, answers: { questionId: string; selectedAnswer: string }[]) => {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Lesson not found</p>
      </div>
    );
  }

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

  const contentHtml = lesson.content_html || '';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={onBack}
              className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
            >
              &larr; Back to Course
            </button>
            <div className="text-sm text-gray-600">
              Lesson {lesson.sequence_order} of {lesson.total_lessons}
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{lesson.title}</h1>
        </div>
      </div>

      {activeTab !== 'quiz' && (
        <div className="max-w-6xl mx-auto px-6 py-4 mt-2">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Accessibility Tools</h2>
            <div className="flex gap-4">
              <Button
                onClick={handlePlayTTS}
                className={`${
                  isPlayingTTS ? 'bg-blue-700' : 'bg-blue-600'
                } hover:bg-blue-700 text-white`}
              >
                <Volume2 className="w-5 h-5 mr-2" />
                {isPlayingTTS ? 'Stop TTS' : 'Play TTS'}
              </Button>
              <Button
                onClick={() => setShowTranscript(!showTranscript)}
                variant="outline"
                className="border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                <FileText className="w-5 h-5 mr-2" />
                {showTranscript ? 'Hide Transcript' : 'Show Transcript'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex gap-1 border-b border-gray-200 mb-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-5 h-5" /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Content Tab ── */}
        {activeTab === 'content' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className={showTranscript ? 'lg:col-span-2' : 'lg:col-span-3'}>
              <Card className="p-8 rounded-2xl border-2 border-gray-200">
                <div
                  className="prose prose-lg max-w-none text-gray-900 leading-relaxed"
                  style={{ fontSize: '18px', lineHeight: '1.8' }}
                  dangerouslySetInnerHTML={{ __html: contentHtml }}
                />
              </Card>
            </div>

            {showTranscript && lesson.transcript && (
              <div className="lg:col-span-1">
                <Card className="p-6 rounded-2xl border-2 border-gray-200 sticky top-24">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Transcript
                  </h3>
                  <div className="text-gray-700 leading-relaxed space-y-4 text-sm max-h-[600px] overflow-y-auto">
                    {lesson.transcript.split('\n\n').map((paragraph, index) => (
                      <p key={index}>{paragraph}</p>
                    ))}
                  </div>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* ── PDF Tab ── */}
        {activeTab === 'pdf' && (
          <div className="space-y-6">
            {assets.map((asset) => (
              <PdfViewer key={asset.id} url={asset.url} title={asset.title || 'PDF Document'} />
            ))}
          </div>
        )}

        {/* ── Quiz Tab ── */}
        {activeTab === 'quiz' && (
          <QuizPage
            lessonId={lessonId}
            courseId={courseId}
            onBack={() => setActiveTab('content')}
            onSubmit={handleQuizSubmit}
          />
        )}
      </div>

      <div className="max-w-6xl mx-auto px-6 pb-8">
        <div className="mt-8 flex items-center justify-between gap-4">
          <Button
            onClick={onPreviousLesson}
            variant="outline"
            className="px-8 py-6 text-lg"
            disabled={lesson.sequence_order <= 1}
          >
            <ChevronLeft className="w-5 h-5 mr-2" />
            Previous Lesson
          </Button>

          <div className="flex gap-3">
            {hasQuiz && (
              <Button
                onClick={() => setActiveTab('quiz')}
                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-6 text-lg"
              >
                <HelpCircle className="w-5 h-5 mr-2" />
                Take Quiz
              </Button>
            )}
          </div>

          <Button
            onClick={onNextLesson}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg"
            disabled={lesson.sequence_order >= lesson.total_lessons}
          >
            Next Lesson
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>

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
          setActiveTab('content');
        }}
      />
    </div>
  );
}
