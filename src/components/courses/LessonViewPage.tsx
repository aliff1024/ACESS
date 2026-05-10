'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Volume2, FileText, BookOpen, HelpCircle, ChevronLeft, ChevronRight, ChevronDown, Loader2, Video, ExternalLink, Plus, Shield, Target, Eye, EyeOff, Layers } from 'lucide-react';
import { fetchLessonContent, fetchQuizData, submitQuizAttempt, markLessonViewed } from '@/lib/learner-api';
import { fetchLessonAssets } from '@/lib/educator-api';
import { supabase } from '@/lib/supabase';
import type { LessonContent, QuizData } from '@/lib/learner-api';
import type { LessonAsset } from '@/lib/educator-api';
import { PdfViewer } from './PdfViewer';
import { QuizPage } from './QuizPage';
import { QuizResultModal } from './QuizResultModal';
import { ReviewAnswersPage } from './ReviewAnswersPage';
import { toast } from 'sonner';

// ─── Utils ────────────────────────────────────────────────────────────────

function getYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

// ─── Sub-components ──────────────────────────────────────────────────────

function CollapsibleCard({ icon, title, defaultOpen, badge, action, children }: {
  icon: React.ReactNode;
  title: string;
  defaultOpen: boolean;
  badge?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
      <div className="flex items-center gap-3 px-5 py-4">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-3 flex-1 text-left hover:bg-gray-50 transition-colors rounded-lg py-1 -ml-1 px-1"
        >
          <span className="shrink-0">{icon}</span>
          <span className="flex-1 font-semibold text-sm text-gray-900">{title}</span>
          {badge && <Badge variant="secondary" className="shrink-0 text-xs">{badge}</Badge>}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>
        {action && <span className="shrink-0">{action}</span>}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-gray-100 pt-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

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
  const [isSystemCourse, setIsSystemCourse] = useState(false);
  const [simplifiedMode, setSimplifiedMode] = useState(false);
  const [learningObjectives, setLearningObjectives] = useState<string | null>(null);
  const [chapterTitle, setChapterTitle] = useState<string | null>(null);
  const [prerequisiteTitle, setPrerequisiteTitle] = useState<string | null>(null);

  // Quiz flow state
  const [quizId, setQuizId] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<{ questionId: string; selectedAnswer: string }[]>([]);
  const [showQuizResult, setShowQuizResult] = useState(false);
  const [isReviewingAnswers, setIsReviewingAnswers] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    supabase.from('courses').select('course_type, guided_learning_enabled').eq('id', courseId).single().then(({ data }) => {
      if (data) setIsSystemCourse(data.course_type === 'system');
    }).catch(() => {});
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
    // Fetch extra lesson fields for system courses
    supabase.from('lessons').select('learning_objectives, chapter_id, prerequisite_lesson_id')
      .eq('id', lessonId).single().then(({ data: extra }) => {
        if (extra) {
          setLearningObjectives(extra.learning_objectives);
          if (extra.chapter_id) {
            supabase.from('course_chapters').select('title').eq('id', extra.chapter_id).single()
              .then(({ data: ch }) => { if (ch) setChapterTitle(ch.title); }).catch(() => {});
          }
          if (extra.prerequisite_lesson_id) {
            supabase.from('lessons').select('title').eq('id', extra.prerequisite_lesson_id).single()
              .then(({ data: pre }) => { if (pre) setPrerequisiteTitle(pre.title); }).catch(() => {});
          }
        }
      }).catch(() => {});
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
            <div className="flex items-center gap-3 text-sm text-gray-600">
              {chapterTitle && (
                <span className="flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-purple-500" />
                  {chapterTitle}
                  <span className="text-gray-300 mx-1">|</span>
                </span>
              )}
              Lesson {lesson.sequence_order} of {lesson.total_lessons}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <h1 className={`font-bold text-gray-900 ${simplifiedMode ? 'text-4xl' : 'text-3xl'}`}>{lesson.title}</h1>
            {isSystemCourse && (
              <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-xs flex items-center gap-1 shrink-0">
                <Shield className="w-3 h-3" /> Official Course
              </Badge>
            )}
            {prerequisiteTitle && (
              <Badge variant="outline" className="text-amber-700 border-amber-300 text-xs shrink-0">
                Requires: {prerequisiteTitle}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* ── Learning Objectives (system courses) ── */}
      {isSystemCourse && learningObjectives && (
        <div className="max-w-6xl mx-auto px-6 py-4 mt-2">
          <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-5">
            <h2 className="text-sm font-bold text-purple-800 mb-2 flex items-center gap-2">
              <Target className="w-4 h-4" /> Learning Objectives
            </h2>
            <p className="text-purple-900 text-sm leading-relaxed">{learningObjectives}</p>
          </div>
        </div>
      )}

      {activeTab !== 'quiz' && (
        <div className={`max-w-6xl mx-auto px-6 py-4 mt-2`}>
          <div className={`${isSystemCourse && simplifiedMode ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'} border-2 rounded-xl p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-semibold ${isSystemCourse && simplifiedMode ? 'text-amber-900' : 'text-gray-900'}`}>Accessibility Tools</h2>
              {isSystemCourse && (
                <button
                  onClick={() => setSimplifiedMode(!simplifiedMode)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    simplifiedMode
                      ? 'bg-amber-600 text-white hover:bg-amber-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {simplifiedMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {simplifiedMode ? 'Standard Mode' : 'Simplified Mode'}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handlePlayTTS}
                className={`${
                  isPlayingTTS ? 'bg-blue-700' : isSystemCourse && simplifiedMode ? 'bg-amber-700' : 'bg-blue-600'
                } hover:bg-blue-700 text-white`}
              >
                <Volume2 className="w-5 h-5 mr-2" />
                {isPlayingTTS ? 'Stop TTS' : 'Play TTS'}
              </Button>
              <Button
                onClick={() => setShowTranscript(!showTranscript)}
                variant="outline"
                className={`border-blue-300 text-blue-700 hover:bg-blue-100`}
              >
                <FileText className="w-5 h-5 mr-2" />
                {showTranscript ? 'Hide Transcript' : 'Show Transcript'}
              </Button>
            </div>
            {simplifiedMode && (
              <div className="mt-3 pt-3 border-t border-amber-200">
                <p className="text-xs text-amber-700">Simplified mode: reduced visual clutter, focused content layout</p>
              </div>
            )}
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
          <div className="space-y-5">
            {/* ── Video ── */}
            {lesson.video_url && (
              <CollapsibleCard
                icon={<Video className="w-4 h-4 text-rose-600" />}
                title="Video"
                defaultOpen={true}
                badge="1 video"
              >
                {(() => {
                  const ytId = getYouTubeId(lesson.video_url!);
                  return ytId ? (
                    <div>
                      <div className="relative rounded-xl overflow-hidden bg-black mb-3" style={{ paddingBottom: '56.25%' }}>
                        <iframe
                          src={`https://www.youtube.com/embed/${ytId}`}
                          title="Lesson video"
                          className="absolute inset-0 w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                      <a href={lesson.video_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-gray-400 hover:text-blue-600 flex items-center gap-1 transition-colors">
                        <ExternalLink className="w-3 h-3" /> Open in YouTube
                      </a>
                    </div>
                  ) : (
                    <a href={lesson.video_url} target="_blank" rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 text-sm break-all underline underline-offset-2 flex items-center gap-1">
                      <ExternalLink className="w-3.5 h-3.5" /> {lesson.video_url}
                    </a>
                  );
                })()}
              </CollapsibleCard>
            )}

            {/* ── Lesson Content ── */}
            <CollapsibleCard
              icon={<BookOpen className="w-4 h-4 text-blue-600" />}
              title="Lesson Content"
              defaultOpen={true}
              badge={contentHtml ? 'ready' : undefined}
            >
              {contentHtml ? (
                <div
                  className={`prose max-w-none text-gray-900 leading-relaxed ${
                    simplifiedMode ? 'prose-xl prose-amber' : 'prose-lg'
                  }`}
                  style={{ fontSize: simplifiedMode ? '22px' : '18px', lineHeight: simplifiedMode ? '2' : '1.8' }}
                  dangerouslySetInnerHTML={{ __html: contentHtml }}
                />
              ) : (
                <div className="text-center py-6">
                  <BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No content for this lesson yet</p>
                </div>
              )}
            </CollapsibleCard>

            {/* ── Transcript ── */}
            {lesson.transcript && (
              <CollapsibleCard
                icon={<FileText className="w-4 h-4 text-purple-600" />}
                title="Transcript"
                defaultOpen={showTranscript}
                badge="available"
              >
                <div className="text-gray-700 leading-relaxed space-y-4 text-sm max-h-[600px] overflow-y-auto">
                  {lesson.transcript.split('\n\n').map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              </CollapsibleCard>
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
