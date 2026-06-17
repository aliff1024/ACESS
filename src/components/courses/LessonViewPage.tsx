'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from '../ui/breadcrumb';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Volume2, VolumeX, FileText, BookOpen, HelpCircle, ChevronLeft, ChevronRight, Loader2, Video, ExternalLink, Shield, Target, Layers, Clock, Maximize2, Minimize2, CheckCircle, Home, Award, Sparkles, MapPin, Lock, Layout } from 'lucide-react';
import { useAccessibility } from '@/providers/AccessibilityProvider';
import { fetchLessonContent, fetchQuizData, submitQuizAttempt, markLessonViewed, completeLesson, fetchLessonCheckpoints, fetchCompletedCheckpointIds, completeLearnerCheckpoint } from '@/lib/learner-api';
import type { LessonContent, QuizData, LearnerLessonCheckpoint } from '@/lib/learner-api';
import { shouldAutoEnableEasyRead } from '@/lib/accessibility-utils';
import { trackAdaptation } from '@/lib/adaptive-engine';
import { fetchLessonAssets } from '@/lib/educator-api';
import { supabase } from '@/lib/supabase';
import type { LessonAsset } from '@/lib/educator-api';
import { PdfViewer } from './PdfViewer';
import { QuizPage } from './QuizPage';
import { QuizResultModal } from './QuizResultModal';
import { ReviewAnswersPage } from './ReviewAnswersPage';
import { StudentSummary } from '@/components/learner/StudentSummary';
import { InteractiveActivityViewer } from '@/components/interactive/InteractiveActivityViewer';
import type { InteractiveActivityData } from '@/lib/interactive-types';
import { fetchLessonInteractiveContent, fetchLessonVideoQuestions, fetchLessonH5PContent } from '@/lib/learner-api';
import type { LearnerInteractiveContent, LearnerVideoQuestion, LearnerH5PContent } from '@/lib/learner-api';
import { H5PViewer } from '@/components/h5p/H5PViewer';
import { toast } from 'sonner';
import { CollapsibleCard } from '@/components/ui/CollapsibleCard';

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

function computeReadTime(contentHtml: string, estimatedDuration?: number | null): { label: string; minutes: number } {
  if (estimatedDuration) return { label: `${estimatedDuration} min read`, minutes: estimatedDuration };
  const text = contentHtml.replace(/<[^>]*>/g, '').trim();
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(wordCount / 200));
  return { label: `~${minutes} min read`, minutes };
}

function CelebrationAnimation() {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      className="flex flex-col items-center gap-2 py-2"
    >
      <motion.div
        animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.2, 1] }}
        transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
      >
        <Award className="w-12 h-12 text-yellow-500" />
      </motion.div>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            initial={{ y: 0, opacity: 0 }}
            animate={{ y: [-10, -25, -10], opacity: [0, 1, 0] }}
            transition={{ duration: 1.5, delay: i * 0.3, repeat: Infinity, repeatDelay: 1 }}
          >
            <Sparkles className={`w-5 h-5 ${i === 1 ? 'text-yellow-400' : 'text-orange-400'}`} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────

function GuidedPathBanner({
  currentChunk,
  totalChunks,
  estimatedDuration,
  hasSummary,
  showSimplifiedSummary,
}: {
  currentChunk: number;
  totalChunks: number;
  estimatedDuration?: number | null;
  hasSummary: boolean;
  showSimplifiedSummary: boolean;
}) {
  const sectionProgress = Math.round(((currentChunk + 1) / totalChunks) * 100);
  return (
    <Card className="p-4 border-2 border-indigo-200 bg-indigo-50">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-indigo-600 shrink-0" />
          <span className="text-sm font-semibold text-indigo-900">Guided lesson path</span>
        </div>
        {estimatedDuration && (
          <span className="text-xs text-indigo-700 bg-indigo-100 px-2 py-1 rounded-full">
            About {estimatedDuration} min — take a break anytime
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-indigo-800 mb-3">
        {showSimplifiedSummary && <span className="font-medium">① Overview</span>}
        <span className="font-medium">② Section {currentChunk + 1} of {totalChunks}</span>
        {hasSummary && <span className={currentChunk >= totalChunks - 1 ? 'font-medium' : 'text-indigo-500'}>③ Wrap-up</span>}
      </div>
      <div className="h-2 bg-indigo-200 rounded-full overflow-hidden" role="progressbar" aria-valuenow={sectionProgress} aria-valuemin={0} aria-valuemax={100} aria-label="Section progress">
        <div className="h-full bg-indigo-600 rounded-full transition-all duration-300" style={{ width: `${sectionProgress}%` }} />
      </div>
    </Card>
  );
}

function ChunkNavigation({
  currentChunk,
  totalChunks,
  guidedMode,
  canAdvance,
  requireCheckpoint,
  onPrev,
  onNext,
  position,
}: {
  currentChunk: number;
  totalChunks: number;
  guidedMode: boolean;
  canAdvance: boolean;
  requireCheckpoint: boolean;
  onPrev: () => void;
  onNext: () => void;
  position: 'top' | 'bottom';
}) {
  const isLast = currentChunk >= totalChunks - 1;
  const sectionLabel = currentChunk === 0 ? 'Intro' : `Section ${currentChunk} of ${totalChunks - 1}`;

  if (guidedMode && position === 'top') return null;

  return (
    <div className={`flex items-center justify-between chunk-nav ${position === 'bottom' ? 'pt-2' : ''}`}>
      <Badge variant="secondary" className="text-xs">
        {guidedMode ? `Step ${currentChunk + 1} of ${totalChunks}` : sectionLabel}
      </Badge>
      <div className="flex gap-2 items-center">
        {currentChunk > 0 && (
          <Button variant="outline" size="sm" onClick={onPrev}>
            <ChevronLeft className="w-4 h-4" /> {guidedMode ? 'Previous' : position === 'bottom' ? 'Prev Section' : 'Prev'}
          </Button>
        )}
        {!isLast && (
          <Button
            size="sm"
            onClick={onNext}
            disabled={!canAdvance}
            className={guidedMode ? 'bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50' : ''}
            variant={guidedMode ? 'default' : 'outline'}
            title={!canAdvance && requireCheckpoint ? 'Complete the check-in below before continuing' : undefined}
          >
            {!canAdvance && requireCheckpoint ? (
              <Lock className="w-4 h-4 mr-1" />
            ) : (
              <ChevronRight className="w-4 h-4 mr-1" />
            )}
            {guidedMode ? 'Continue to next section' : position === 'bottom' ? 'Next Section' : 'Next'}
          </Button>
        )}
        {guidedMode && isLast && canAdvance && (
          <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">All sections complete</Badge>
        )}
      </div>
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
  const [interactiveContent, setInteractiveContent] = useState<LearnerInteractiveContent[]>([]);
  const [h5pContent, setH5pContent] = useState<LearnerH5PContent[]>([]);
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('content');
  const [isSystemCourse, setIsSystemCourse] = useState(false);
  const [learningObjectives, setLearningObjectives] = useState<string | null>(null);
  const [chapterTitle, setChapterTitle] = useState<string | null>(null);
  const [prerequisiteTitle, setPrerequisiteTitle] = useState<string | null>(null);
  const [courseTitle, setCourseTitle] = useState<string>('');
  const [completedLessons, setCompletedLessons] = useState(0);
  const [nextLessonTitle, setNextLessonTitle] = useState<string | null>(null);
  const [acknowledgedCheckpoints, setAcknowledgedCheckpoints] = useState<Set<number>>(new Set());
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const [lessonCheckpoints, setLessonCheckpoints] = useState<LearnerLessonCheckpoint[]>([]);
  const [completedCheckpointIds, setCompletedCheckpointIds] = useState<Set<string>>(new Set());
  const [adaptiveHint, setAdaptiveHint] = useState<string | null>(null);

  // Lesson completion state
  const [lessonCompleted, setLessonCompleted] = useState(false);
  const [summarySubmitted, setSummarySubmitted] = useState(false);

  // Quiz flow state
  const [quizId, setQuizId] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<{ questionId: string; selectedAnswer: string }[]>([]);
  const [showQuizResult, setShowQuizResult] = useState(false);
  const [isReviewingAnswers, setIsReviewingAnswers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [quizResetKey, setQuizResetKey] = useState(0);

  const { settings, adaptiveOverrides } = useAccessibility();
  const adaptiveLessonModes = adaptiveOverrides.lesson_modes;

  // Focus mode local toggle (learner can override lesson setting)
  const [focusMode, setFocusMode] = useState(false);
  const [focusStep, setFocusStep] = useState(0);
  // View mode: slide (split by <hr>) or scroll (continuous)
  const [viewMode, setViewMode] = useState<'slide' | 'scroll' | null>(null);
  // Chunked content navigation
  const [currentChunk, setCurrentChunk] = useState(0);
  // TTS ref and state
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const ttsTextRef = useRef('');
  const ttsAutoStarted = useRef(false);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [ttsStatusMessage, setTtsStatusMessage] = useState('');
  const [ttsRate, setTtsRate] = useState(settings.tts_rate ?? 1);
  const ttsRateRef = useRef(ttsRate);
  ttsRateRef.current = ttsRate;

  // Video questions state
  const [videoQuestions, setVideoQuestions] = useState<LearnerVideoQuestion[]>([]);
  const [answeredQuestionIds, setAnsweredQuestionIds] = useState<Set<string>>(new Set());
  const [vqCompletedIds, setVqCompletedIds] = useState<Set<string>>(new Set());
  const [activeVideoQuestion, setActiveVideoQuestion] = useState<LearnerVideoQuestion | null>(null);
  const [selectedVqOption, setSelectedVqOption] = useState<number | null>(null);
  const [vqAnswerFeedback, setVqAnswerFeedback] = useState<{ correct: boolean; correctIndex: number } | null>(null);
  const [selectedActivityTabId, setSelectedActivityTabId] = useState<string | null>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ytApiReadyRef = useRef(false);
  const answeredQuestionIdsRef = useRef(answeredQuestionIds);
  answeredQuestionIdsRef.current = answeredQuestionIds;
  const vqCompletedIdsRef = useRef(vqCompletedIds);
  vqCompletedIdsRef.current = vqCompletedIds;
  const activeVideoQuestionRef = useRef(activeVideoQuestion);
  activeVideoQuestionRef.current = activeVideoQuestion;

  useEffect(() => {
    setLoading(true);
    supabase.from('courses').select('course_type, guided_learning_enabled').eq('id', courseId).single().then(({ data }) => {
      if (data) setIsSystemCourse(data.course_type === 'system');
    }).catch(() => {});
    // Check lesson completion status
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('enrollments').select('id').eq('user_id', user.id).eq('course_id', courseId).neq('status', 'dropped').maybeSingle().then(({ data: enrollment }) => {
        if (!enrollment) return;
        setEnrollmentId(enrollment.id);
        supabase.from('lesson_progress').select('is_viewed, summary_completed').eq('enrollment_id', enrollment.id).eq('lesson_id', lessonId).maybeSingle().then(({ data: lp }) => {
          if (lp?.is_viewed) setLessonCompleted(true);
          if (lp?.summary_completed) setSummarySubmitted(true);
        }).catch(() => {});
      }).catch(() => {});
    }).catch(() => {});

    Promise.all([
      fetchLessonContent(lessonId),
      fetchLessonAssets(lessonId).catch(() => [] as LessonAsset[]),
      fetchQuizData(lessonId),
      fetchLessonInteractiveContent(lessonId).catch(() => []),
      fetchLessonVideoQuestions(lessonId).catch(() => []),
      fetchLessonH5PContent(lessonId).catch(() => []),
    ])
      .then(([lessonData, assetData, quizResult, interactiveData, vqData, h5pData]) => {
        if (lessonData) {
          setLesson(lessonData);
          markLessonViewed(lessonId, courseId).catch(() => {});
        }
        setAssets(assetData);
        setInteractiveContent(interactiveData);
        setVideoQuestions(vqData);
        setH5pContent(h5pData);
        if (quizResult) {
          setQuizData(quizResult);
          setQuizId(quizResult.id);
        }
      })
      .catch((err) => { console.error('Lesson load error:', err); })
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
    // Fetch course title, progress count, and next lesson title
    supabase.from('courses').select('title').eq('id', courseId).single()
      .then(({ data }) => { if (data) setCourseTitle(data.title); }).catch(() => {});
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('enrollments').select('id').eq('user_id', user.id).eq('course_id', courseId).neq('status', 'dropped').maybeSingle()
        .then(({ data: enrollment }) => {
          if (!enrollment) return;
          supabase.from('lesson_progress').select('id', { count: 'exact', head: true }).eq('enrollment_id', enrollment.id).eq('is_viewed', true)
            .then(({ count }) => setCompletedLessons(count ?? 0)).catch(() => {});
        }).catch(() => {});
    }).catch(() => {});
    supabase.from('lessons').select('title').eq('course_id', courseId).or('visibility_status.eq.visible,visibility_status.is.null').order('sequence_order', { ascending: true })
      .then(({ data }) => {
        if (!data) return;
        const idx = data.findIndex((l) => l.id === lessonId);
        if (idx >= 0 && idx < data.length - 1) setNextLessonTitle(data[idx + 1].title);
      }).catch(() => {});
  }, [lessonId, courseId]);

  // YouTube IFrame API + video questions polling
  useEffect(() => {
    const ytId = lesson ? getYouTubeId(lesson.video_url || '') : null;
    if (!ytId || videoQuestions.length === 0) return;

    let cancelled = false;

    function onYouTubeIframeAPIReady() {
      if (cancelled) return;
      ytApiReadyRef.current = true;
      playerRef.current = new YT.Player('youtube-player', {
        videoId: ytId!,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          cc_load_policy: settings.captions_enabled ? 1 : 0,
        },
        events: {
          onReady: () => {
            // Start polling for video questions
            if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
            checkIntervalRef.current = setInterval(() => {
              if (!playerRef.current || activeVideoQuestionRef.current) return;
              const currentTime = playerRef.current.getCurrentTime();
              const unanswered = videoQuestions.filter(
                (q) => !answeredQuestionIdsRef.current.has(q.id) && !vqCompletedIdsRef.current.has(q.id)
              );
              // Find the first unanswered question whose timestamp we've passed
              const next = unanswered.find((q) => currentTime >= q.timestamp_seconds);
              if (next) {
                playerRef.current.pauseVideo();
                setActiveVideoQuestion(next);
                setSelectedVqOption(null);
                setVqAnswerFeedback(null);
              }
            }, 500);
          },
          onStateChange: (event) => {
            // Could use for future enhancements
          },
        },
      });
    }

    // Load YouTube IFrame API if not already loaded
    if (typeof YT === 'undefined' || !YT.Player) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.onload = () => {
        // The API calls onYouTubeIframeAPIReady when loaded
      };
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode!.insertBefore(tag, firstScriptTag);
      // Override the global callback
      (window as unknown as Record<string, unknown>).onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;
    } else {
      onYouTubeIframeAPIReady();
    }

    return () => {
      cancelled = true;
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [lesson?.video_url, videoQuestions.length, settings.captions_enabled]);

  const speak = useCallback(() => {
    const text = ttsTextRef.current;
    if (!text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = ttsRateRef.current;
    if (settings.tts_voice_uri) {
      const voice = window.speechSynthesis.getVoices().find((v) => v.voiceURI === settings.tts_voice_uri);
      if (voice) utterance.voice = voice;
    }
    utteranceRef.current = utterance;
    utterance.onstart = () => {
      setTtsPlaying(true);
      setTtsStatusMessage('Reading lesson aloud');
    };
    utterance.onend = () => {
      setTtsPlaying(false);
      setTtsStatusMessage('Finished reading');
    };
    utterance.onerror = () => {
      setTtsPlaying(false);
      setTtsStatusMessage('');
    };
    window.speechSynthesis.speak(utterance);
  }, [settings.tts_voice_uri]);

  const stopTTS = useCallback(() => {
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setTtsPlaying(false);
    setTtsStatusMessage('Stopped reading');
  }, []);

  useEffect(() => {
    ttsAutoStarted.current = false;
    setTtsStatusMessage('');
    setCurrentChunk(0);
    setAcknowledgedCheckpoints(new Set());
    setCompletedCheckpointIds(new Set());
    setLessonCheckpoints([]);
    setAdaptiveHint(null);
    setEnrollmentId(null);
    stopTTS();
  }, [lessonId, stopTTS]);

  useEffect(() => {
    if (!lessonId || !(lesson?.checkpoints_enabled || adaptiveLessonModes.checkpoints)) return;
    fetchLessonCheckpoints(lessonId)
      .then(setLessonCheckpoints)
      .catch(() => setLessonCheckpoints([]));
  }, [lessonId, lesson?.checkpoints_enabled]);

  useEffect(() => {
    if (!enrollmentId || !lessonId || !(lesson?.checkpoints_enabled || adaptiveLessonModes.checkpoints)) return;
    fetchCompletedCheckpointIds(enrollmentId, lessonId)
      .then(setCompletedCheckpointIds)
      .catch(() => setCompletedCheckpointIds(new Set()));
  }, [enrollmentId, lessonId, lesson?.checkpoints_enabled]);

  // Auto-enable focus mode if adaptive engine recommends it and lesson supports it
  useEffect(() => {
    if (lesson && adaptiveLessonModes.focus_mode && lesson.focus_mode_enabled) {
      setFocusMode(true);
    }
  }, [lesson?.id, adaptiveLessonModes.focus_mode]);

  useEffect(() => {
    if (!lesson) return;
    const contentHtml = lesson.content_html || '';
    const educatorLayoutSetting = lesson.lesson_layout || 'standard';
    const slideshowActive = viewMode !== null ? viewMode === 'slide' : educatorLayoutSetting === 'slideshow';
    const lessonChunks = !contentHtml
      ? null
      : slideshowActive
        ? contentHtml.split(/<hr\s*\/?>/i).filter((p) => p.trim())
        : !lesson.chunked_content_enabled
          ? null
          : contentHtml.split(/<h2\b[^>]*>/i).filter((p) => p.trim());
    const chunkHtml = lessonChunks && lessonChunks.length > 0
      ? (currentChunk === 0 ? lessonChunks[0] : slideshowActive ? lessonChunks[currentChunk] : `<h2>${lessonChunks[currentChunk]}`)
      : contentHtml;
    ttsTextRef.current = chunkHtml.replace(/<[^>]*>/g, '').trim();

    if (settings.tts_enabled && ttsTextRef.current && !ttsAutoStarted.current) {
      ttsAutoStarted.current = true;
      const timer = setTimeout(() => speak(), 600);
      return () => clearTimeout(timer);
    }
  }, [lesson, currentChunk, settings.tts_enabled, speak]);

  // Keyboard navigation for slideshow mode
  useEffect(() => {
    if (!lesson || !isSlideMode) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goToPrevChunk(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goToNextChunk(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const handlePlayTTS = useCallback(() => {
    if (ttsPlaying) {
      stopTTS();
    } else {
      trackAdaptation('tts', { lessonId, courseId });
      speak();
    }
  }, [ttsPlaying, speak, stopTTS, lessonId, courseId]);

  const hasPdfAssets = assets.length > 0;
  if (hasPdfAssets) {}
  const hasQuiz = quizData !== null;

  const handleCompleteLesson = async () => {
    await completeLesson(lessonId, courseId);
    setLessonCompleted(true);
  };

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

  const layout = lesson.lesson_layout || 'standard';
  const layoutContainer = layout === 'focus' ? 'max-w-4xl' : layout === 'two_column' || layout === 'wide' ? 'max-w-7xl' : 'max-w-6xl';

  const simplifiedMode = settings.simplified_ui ?? false;
  const effectiveFocusMode = focusMode;
  const effectiveChunkedEnabled = lesson.chunked_content_enabled || adaptiveLessonModes.chunked_content;
  const contentContainerClass = effectiveFocusMode
    ? 'max-w-3xl'
    : simplifiedMode
      ? 'max-w-4xl'
      : layoutContainer;

  const lineSpacingMap: Record<string, string> = { tight: 'leading-tight', normal: 'leading-normal', relaxed: 'leading-relaxed', wide: 'leading-loose', loose: 'leading-loose' };
  const fontSizeMap: Record<string, string> = { small: 'text-sm', medium: 'text-base', large: 'text-lg', xlarge: 'text-xl' };
  const contentLineSpacing = lineSpacingMap[settings.line_spacing ?? 'normal'] || 'leading-normal';
  const contentFontSize = fontSizeMap[settings.preferred_font_size ?? 'medium'] || 'text-base';

  const contentHtml = lesson.content_html || '';
  const educatorLayout = lesson.lesson_layout || 'standard';
  const isSlideMode = viewMode !== null ? viewMode === 'slide' : educatorLayout === 'slideshow';

  const chunks = !contentHtml
    ? null
    : isSlideMode
      ? contentHtml.split(/<hr\s*\/?>/i).filter(p => p.trim())
      : !effectiveChunkedEnabled
        ? null
        : contentHtml.split(/<h2\b[^>]*>/i).filter(p => p.trim());

  const currentChunkHtml = chunks && chunks.length > 0
    ? (currentChunk === 0 ? chunks[0] : isSlideMode ? chunks[currentChunk] : `<h2>${chunks[currentChunk]}`)
    : contentHtml;

  const totalChunks = chunks?.length ?? 0;
  const showChunkNav = totalChunks > 1;

  const guidedMode = !isSlideMode && !effectiveFocusMode && showChunkNav && (effectiveChunkedEnabled || simplifiedMode || adaptiveLessonModes.guided_mode);
  const requireCheckpoint = !isSlideMode && (!!lesson.checkpoints_enabled || adaptiveLessonModes.checkpoints) && showChunkNav && !effectiveFocusMode;
  const currentDbCheckpoint = lessonCheckpoints.length > 0
    ? (lessonCheckpoints.find((cp) => cp.sequence_order === currentChunk) ?? lessonCheckpoints[currentChunk] ?? null)
    : null;
  const checkpointPending = requireCheckpoint && (
    currentDbCheckpoint
      ? currentDbCheckpoint.required && !completedCheckpointIds.has(currentDbCheckpoint.id)
      : !acknowledgedCheckpoints.has(currentChunk)
  );
  const canAdvanceChunk = !checkpointPending;
  const isLastChunk = currentChunk >= totalChunks - 1;
  const showEndOfLessonContent = !effectiveFocusMode && (!guidedMode || (isLastChunk && canAdvanceChunk));
  const highlightSimplifiedSummary = simplifiedMode || shouldAutoEnableEasyRead(settings.preferred_reading_level) || adaptiveLessonModes.simplified_summary;

  const focusSteps = [
    ...(lesson.video_url && lesson.has_video !== false ? [{ id: 'video' as const, label: 'Video' }] : []),
    ...(contentHtml ? [{ id: 'content' as const, label: 'Lesson Content' }] : []),
    ...(interactiveContent.length > 0 ? [{ id: 'activities' as const, label: 'Activities' }] : []),
    { id: 'summary' as const, label: 'Summary' },
  ];
  const currentFocusId = effectiveFocusMode && focusSteps.length > 0 ? focusSteps[Math.min(focusStep, focusSteps.length - 1)]?.id : null;

  const goToPrevChunk = () => {
    setCurrentChunk((c) => Math.max(0, c - 1));
    setAdaptiveHint(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToNextChunk = () => {
    if (!canAdvanceChunk) return;
    setAdaptiveHint(null);
    setCurrentChunk((c) => Math.min(totalChunks - 1, c + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const acknowledgeCheckpoint = async () => {
    setAcknowledgedCheckpoints((prev) => {
      const next = new Set(prev);
      next.add(currentChunk);
      return next;
    });
    setAdaptiveHint(null);
    trackAdaptation('guided_mode', { lessonId, courseId });
    if (currentDbCheckpoint && enrollmentId) {
      try {
        await completeLearnerCheckpoint(currentDbCheckpoint.id, enrollmentId);
        setCompletedCheckpointIds((prev) => new Set([...prev, currentDbCheckpoint.id]));
      } catch {
        /* keep session acknowledgment */
      }
    }
  };

  const handleReviewAgain = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (lesson.adaptive_learning_enabled) {
      const hint = currentDbCheckpoint?.description
        || (lesson.simplified_summary ? lesson.simplified_summary.slice(0, 220) : null)
        || 'Review this section carefully. Focus on the main idea before moving on.';
      setAdaptiveHint(hint);
    }
  };

  const readTime = computeReadTime(lesson.content_html || '', lesson.estimated_duration);
  const durationLabel = guidedMode && lesson.estimated_duration
    ? `About ${lesson.estimated_duration} min — take a break anytime`
    : readTime.label;

  const tabs: { id: TabId; label: string; icon: typeof BookOpen }[] = [
    { id: 'content', label: 'Lesson', icon: BookOpen },
    ...(lesson.has_pdf !== false ? [{ id: 'pdf' as const, label: 'PDF Materials', icon: FileText }] : []),
    ...(lesson.has_quiz !== false ? [{ id: 'quiz' as const, label: 'Quiz', icon: HelpCircle }] : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {ttsStatusMessage}
      </div>
      {!effectiveFocusMode && (
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
          <div className={`${layoutContainer} mx-auto px-6 py-3`}>
            <Breadcrumb className="mb-2 simplifiable">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <button onClick={onBack} className="flex items-center gap-1 text-blue-600 hover:text-blue-700">
                      <Home className="w-3.5 h-3.5" /> Courses
                    </button>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <button onClick={onBack} className="hover:text-blue-600">{courseTitle || 'Course'}</button>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{lesson.title}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <div className="flex items-center justify-between mb-2">
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

            <div className="flex items-center gap-3 flex-wrap">
              <h1 className={`font-bold text-gray-900 ${simplifiedMode ? 'text-4xl' : 'text-3xl'}`}>{lesson.title}</h1>
              {!simplifiedMode && lesson.focus_mode_enabled && !effectiveFocusMode && (
                <button
                  onClick={() => {
                    setFocusMode(true);
                    setFocusStep(0);
                    trackAdaptation('focus_mode', { lessonId, courseId });
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors shrink-0"
                >
                  <Maximize2 className="w-3.5 h-3.5" /> Focus
                </button>
              )}
              {(() => (
                  <Badge variant="outline" className="text-gray-600 border-gray-300 text-xs flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3" /> {durationLabel}
                  </Badge>
                ))()}
              {adaptiveOverrides.active_recommendation && (
                <Badge className="bg-violet-100 text-violet-700 border-violet-200 text-xs flex items-center gap-1 shrink-0">
                  <Sparkles className="w-3 h-3" /> Adaptive
                </Badge>
              )}
              {isSystemCourse && (
                <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-xs flex items-center gap-1 shrink-0 simplifiable">
                  <Shield className="w-3 h-3" /> Official Course
                </Badge>
              )}
              {prerequisiteTitle && (
                <Badge variant="outline" className="text-amber-700 border-amber-300 text-xs shrink-0 simplifiable">
                  Requires: {prerequisiteTitle}
                </Badge>
              )}
            </div>

            {lesson.total_lessons > 0 && (
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-blue-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${lesson.total_lessons > 0 ? Math.round((completedLessons / lesson.total_lessons) * 100) : 0}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {completedLessons} of {lesson.total_lessons} lessons complete
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Learning Objectives (system courses) ── */}
      {isSystemCourse && learningObjectives && (!effectiveFocusMode || currentFocusId === 'summary') && (
          <div className={`${layoutContainer} mx-auto px-6 py-4 mt-2 simplifiable`}>
          <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-5">
            <h2 className="text-sm font-bold text-purple-800 mb-2 flex items-center gap-2">
              <Target className="w-4 h-4" /> Learning Objectives
            </h2>
            <p className="text-purple-900 text-sm leading-relaxed">{learningObjectives}</p>
          </div>
        </div>
      )}

      {/* ── Key Concepts ── */}
      {lesson.summary_key_points && lesson.summary_key_points.length > 0 && (!effectiveFocusMode || currentFocusId === 'summary') && (
        <div className={`${layoutContainer} mx-auto px-6 py-4 mt-2`}>
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-5">
            <h2 className="text-sm font-bold text-emerald-800 mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Key Concepts
            </h2>
            <ul className="space-y-2">
              {lesson.summary_key_points.map((point: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-emerald-900 text-sm">
                  <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ── Focus Mode Slide Navigation ── */}
      {focusMode && !simplifiedMode && focusSteps.length > 0 && (
        <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
            <h2 className="font-bold text-gray-900 text-sm truncate">{lesson.title}</h2>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] text-gray-500 font-medium whitespace-nowrap">
                {focusStep + 1} / {focusSteps.length}
              </span>
              <button
                onClick={() => setFocusStep(Math.max(0, focusStep - 1))}
                disabled={focusStep === 0}
                className="p-1 rounded border border-gray-200 disabled:opacity-30 hover:bg-gray-100 transition-colors"
                aria-label="Previous section"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setFocusStep(Math.min(focusSteps.length - 1, focusStep + 1))}
                disabled={focusStep >= focusSteps.length - 1}
                className="p-1 rounded border border-gray-200 disabled:opacity-30 hover:bg-gray-100 transition-colors"
                aria-label="Next section"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setFocusMode(false)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              >
                <Minimize2 className="w-3.5 h-3.5" /> Exit
              </button>
            </div>
          </div>
          <div className="max-w-4xl mx-auto px-4 pb-1.5">
            <div className="flex gap-1">
              {focusSteps.map((step, i) => (
                <button
                  key={step.id}
                  onClick={() => setFocusStep(i)}
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${
                    i === focusStep
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {step.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div id="lesson-main-content" className={`${contentContainerClass} mx-auto px-6 py-4`}>
        {!effectiveFocusMode && (
          <div className="flex gap-1 border-b border-gray-200 mb-6 simplifiable tab-bar">
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
        )}

        {simplifiedMode && !effectiveFocusMode && (
          <div className="calm-mode-nav flex flex-wrap gap-2 mb-6" role="navigation" aria-label="Lesson sections">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab(tab.id)}
                  className="h-auto py-2"
                >
                  <Icon className="w-4 h-4 mr-2" /> {tab.label}
                </Button>
              );
            })}
          </div>
        )}

        {/* ── Content Tab ── */}
        {activeTab === 'content' && (
          <div className={layout === 'two_column' && !effectiveFocusMode ? 'grid grid-cols-2 gap-6' : 'space-y-5'}>
            {/* ── Simplified Summary Card ── */}
            {(simplifiedMode || highlightSimplifiedSummary || (effectiveFocusMode && currentFocusId === 'summary')) && lesson.simplified_summary && (
              <Card className={`p-6 border-2 ${highlightSimplifiedSummary ? 'border-amber-400 ring-2 ring-amber-200' : 'border-amber-200'} bg-amber-50`}>
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-5 h-5 text-amber-600" />
                  <h3 className="font-semibold text-amber-900">Simplified Summary</h3>
                  {guidedMode && <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300">Step 1 — start here</Badge>}
                  {highlightSimplifiedSummary && !simplifiedMode && (
                    <Badge className="text-[10px] bg-amber-200 text-amber-900">Recommended for your reading level</Badge>
                  )}
                </div>
                <p className="text-amber-800 text-sm leading-relaxed">{lesson.simplified_summary}</p>
              </Card>
            )}

            {guidedMode && (
              <GuidedPathBanner
                currentChunk={currentChunk}
                totalChunks={totalChunks}
                estimatedDuration={lesson.estimated_duration}
                hasSummary={!!lesson.has_summary_activity}
                showSimplifiedSummary={simplifiedMode && !!lesson.simplified_summary}
              />
            )}

            {/* ── Video (optional) ── */}
            {lesson.video_url && lesson.has_video !== false && (!effectiveFocusMode || currentFocusId === 'video') && (
              <CollapsibleCard
                icon={<Video className="w-4 h-4 text-rose-600" />}
                title="Video"
                defaultOpen={true}
                badge={`1 video${videoQuestions.length > 0 ? ` · ${videoQuestions.length} question${videoQuestions.length === 1 ? '' : 's'}` : ''}`}
              >
                {(() => {
                  const ytId = getYouTubeId(lesson.video_url!);
                  return ytId ? (
                    <div>
                      <div className="relative rounded-xl overflow-hidden bg-black mb-3" style={{ paddingBottom: '56.25%' }}>
                        <div id="youtube-player" className="absolute inset-0 w-full h-full" />
                        {!ytApiReadyRef.current && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                            <Loader2 className="w-8 h-8 animate-spin text-white" />
                          </div>
                        )}
                        {/* ── Video Question Overlay ── */}
                        {activeVideoQuestion && (
                          <div className="absolute inset-0 z-10 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm">
                            <div className="w-full max-w-sm bg-white rounded-xl shadow-2xl overflow-hidden">
                              <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-rose-50 to-orange-50">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-rose-500" />
                                  <span className="text-sm font-semibold text-gray-900">Video Question</span>
                                  <span className="text-[10px] font-mono bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded ml-auto">
                                    {activeVideoQuestion.timestamp_seconds}s
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">{activeVideoQuestion.title}</p>
                              </div>
                              <div className="px-4 py-3">
                                <p className="text-sm font-medium text-gray-900 mb-3">{activeVideoQuestion.question_text}</p>
                                <div className="space-y-2">
                                  {activeVideoQuestion.options.map((opt, i) => (
                                    <label
                                      key={i}
                                      className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                                        selectedVqOption === i
                                          ? vqAnswerFeedback
                                            ? i === activeVideoQuestion.correct_option_index
                                              ? 'border-green-400 bg-green-50'
                                              : 'border-red-400 bg-red-50'
                                            : 'border-blue-400 bg-blue-50'
                                          : vqAnswerFeedback && i === activeVideoQuestion.correct_option_index
                                            ? 'border-green-400 bg-green-50'
                                            : 'border-gray-200 hover:border-gray-300 bg-white'
                                      }`}
                                    >
                                      <input
                                        type="radio"
                                        name="vq_answer"
                                        value={i}
                                        checked={selectedVqOption === i}
                                        onChange={() => !vqAnswerFeedback && setSelectedVqOption(i)}
                                        disabled={!!vqAnswerFeedback}
                                        className="shrink-0"
                                      />
                                      <span className={`text-sm ${vqAnswerFeedback && i === activeVideoQuestion.correct_option_index ? 'font-semibold text-green-800' : 'text-gray-700'}`}>
                                        {opt}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                              <div className="px-4 py-2.5 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-2">
                                {vqAnswerFeedback ? (
                                  <>
                                    <span className={`text-xs font-medium ${vqAnswerFeedback.correct ? 'text-green-700' : 'text-red-700'}`}>
                                      {vqAnswerFeedback.correct ? '✓ Correct!' : `✗ The correct answer was: ${activeVideoQuestion.options[activeVideoQuestion.correct_option_index]}`}
                                    </span>
                                    <button type="button" onClick={() => {
                                      const timestamp = activeVideoQuestion.timestamp_seconds;
                                      setActiveVideoQuestion(null);
                                      setSelectedVqOption(null);
                                      setVqAnswerFeedback(null);
                                      playerRef.current?.seekTo(timestamp + 2, true);
                                      playerRef.current?.playVideo();
                                    }} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                                      Continue
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={selectedVqOption === null}
                                    onClick={() => {
                                      const correct = selectedVqOption === activeVideoQuestion.correct_option_index;
                                      setVqAnswerFeedback({ correct, correctIndex: activeVideoQuestion.correct_option_index });
                                      setVqCompletedIds((prev) => new Set(prev).add(activeVideoQuestion.id));
                                      if (correct) {
                                        setAnsweredQuestionIds((prev) => new Set(prev).add(activeVideoQuestion.id));
                                      }
                                    }}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                      selectedVqOption === null
                                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                    }`}
                                  >
                                    Submit Answer
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      {/* Video Questions (shown below player) */}
                      {videoQuestions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {videoQuestions.map((q) => (
                            <span
                              key={q.id}
                              className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                answeredQuestionIds.has(q.id)
                                  ? 'bg-green-50 text-green-700 border-green-200'
                                  : 'bg-amber-50 text-amber-600 border-amber-200'
                              }`}
                            >
                              {answeredQuestionIds.has(q.id) ? '✓ ' : '○ '}
                              {q.timestamp_seconds}s — {q.title}
                            </span>
                          ))}
                        </div>
                      )}
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
            {/* View mode toggle */}
            {(!effectiveFocusMode || currentFocusId === 'content') && contentHtml && (
              <div className="flex items-center justify-end gap-2 mb-3">
                <button
                  onClick={() => {
                    setViewMode(isSlideMode ? 'scroll' : 'slide');
                    trackAdaptation('slideshow', { lessonId, courseId });
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isSlideMode
                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {isSlideMode ? (
                    <><FileText className="w-3.5 h-3.5" /> Scroll View</>
                  ) : (
                    <><Layout className="w-3.5 h-3.5" /> Slide View</>
                  )}
                </button>
              </div>
            )}

            {showChunkNav && !effectiveFocusMode && !isSlideMode && (
              <ChunkNavigation
                currentChunk={currentChunk}
                totalChunks={totalChunks}
                guidedMode={guidedMode}
                canAdvance={canAdvanceChunk}
                requireCheckpoint={requireCheckpoint}
                onPrev={goToPrevChunk}
                onNext={goToNextChunk}
                position="top"
              />
            )}

            {isSlideMode ? (
              /* ── Slideshow View ── */
              <div className="space-y-4">
                {showChunkNav && (
                  <>
                    {/* Progress bar */}
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
                        Slide {currentChunk + 1} of {totalChunks}
                      </span>
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all duration-300"
                          style={{ width: `${((currentChunk + 1) / totalChunks) * 100}%` }}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Slide content */}
                <div
                  className="relative bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
                  role="region"
                  aria-roledescription="slide"
                  aria-label={`Slide ${currentChunk + 1} of ${totalChunks}`}
                  aria-live="polite"
                >
                  <h2 className="sr-only">Slide {currentChunk + 1}</h2>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentChunk}
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      className="p-8 md:p-12"
                    >
                      {currentChunkHtml ? (
                        <div
                          className={`prose max-w-4xl mx-auto text-gray-900 ${contentLineSpacing} ${contentFontSize} ${
                            simplifiedMode ? 'prose-xl prose-amber' : 'prose-lg'
                          } [&_img]:max-h-[50vh] [&_img]:w-auto [&_img]:mx-auto [&_img]:rounded-xl [&_img]:shadow-md`}
                          dangerouslySetInnerHTML={{ __html: currentChunkHtml }}
                        />
                      ) : (
                        <div className="text-center py-12">
                          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500">This slide is empty</p>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>

                  {showChunkNav && (
                    <>
                      {/* Slide navigation arrows */}
                      <div className="absolute inset-y-0 left-0 flex items-center">
                        {currentChunk > 0 && (
                          <button
                            onClick={goToPrevChunk}
                            className="ml-2 p-2 rounded-full bg-white/90 shadow-md border border-gray-200 hover:bg-white hover:shadow-lg transition-all text-gray-600 hover:text-gray-900"
                            aria-label="Previous slide"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                      <div className="absolute inset-y-0 right-0 flex items-center">
                        {currentChunk < totalChunks - 1 && (
                          <button
                            onClick={goToNextChunk}
                            className="mr-2 p-2 rounded-full bg-white/90 shadow-md border border-gray-200 hover:bg-white hover:shadow-lg transition-all text-gray-600 hover:text-gray-900"
                            aria-label="Next slide"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {showChunkNav && (
                  /* Slide dots */
                  <div className="flex justify-center gap-1.5">
                    {Array.from({ length: totalChunks }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentChunk(i)}
                        className={`w-2 h-2 rounded-full transition-all ${
                          i === currentChunk
                            ? 'bg-blue-600 w-4'
                            : 'bg-gray-300 hover:bg-gray-400'
                        }`}
                        aria-label={`Go to slide ${i + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* ── Standard Content View ── */
              <CollapsibleCard
                icon={<BookOpen className="w-4 h-4 text-blue-600" />}
                title={showChunkNav ? (guidedMode ? `Section ${currentChunk + 1} of ${totalChunks}` : `Lesson Content (${totalChunks} sections)`) : 'Lesson Content'}
                defaultOpen={true}
                badge={currentChunkHtml ? 'ready' : undefined}
              >
                <div className="flex items-center gap-2 pb-3 mb-3 border-b border-gray-100">
                  <button
                    onClick={handlePlayTTS}
                    aria-pressed={ttsPlaying}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      ttsPlaying
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {ttsPlaying ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    {ttsPlaying ? 'Stop' : 'Listen'}
                  </button>
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider">Speed</span>
                  {([0.5, 0.75, 1, 1.25, 1.5, 2] as const).map((speed) => (
                    <button
                      key={speed}
                      onClick={() => {
                        ttsRateRef.current = speed;
                        setTtsRate(speed);
                        if (ttsPlaying) { stopTTS(); speak(); }
                      }}
                      className={`px-2 py-0.5 text-[10px] font-medium rounded-md transition-colors ${
                        ttsRate === speed
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
                {currentChunkHtml ? (
                  <div
                    className={`prose max-w-none text-gray-900 ${contentLineSpacing} ${contentFontSize} ${
                      simplifiedMode ? 'prose-xl prose-amber' : 'prose-lg'
                    }`}
                    dangerouslySetInnerHTML={{ __html: currentChunkHtml }}
                  />
                ) : (
                  <div className="text-center py-6">
                    <BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No content for this lesson yet</p>
                  </div>
                )}
              </CollapsibleCard>
            )}

            {/* ── Native Interactive Activities (tabbed) ── */}
            {(!effectiveFocusMode || currentFocusId === 'activities') && interactiveContent.length > 0 && (() => {
              const sorted = [...interactiveContent].sort((a, b) => a.sequence_order - b.sequence_order);
              const activeId = selectedActivityTabId && sorted.some(i => i.id === selectedActivityTabId) ? selectedActivityTabId : sorted[0].id;
              const activeItem = sorted.find(i => i.id === activeId)!;
              return (
                <div className="space-y-3">
                  {sorted.length > 1 && (
                    <div className="flex border-b border-gray-200 overflow-x-auto">
                      {sorted.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setSelectedActivityTabId(item.id)}
                          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
                            activeId === item.id
                              ? 'border-blue-500 text-blue-700'
                              : 'border-transparent text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          <span className={`uppercase ${activeId === item.id ? 'text-blue-600' : 'text-gray-400'}`}>{item.content_type.replace('_', ' ')}</span>
                          <span className="text-gray-400 truncate max-w-[120px]">{item.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <InteractiveActivityViewer
                    key={activeItem.id}
                    contentType={activeItem.content_type}
                    title={activeItem.title}
                    data={activeItem.content_data as unknown as InteractiveActivityData}
                    accessibilitySettings={activeItem.accessibility_settings}
                  />
                </div>
              );
            })()}

            {/* ── H5P Activities ── */}
            {h5pContent.length > 0 && (
              <div className="space-y-4 mt-4">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-800 text-sm">Interactive Activities (H5P)</h3>
                </div>
                {h5pContent.map((item) => (
                  <H5PViewer key={item.id} content={item} />
                ))}
              </div>
            )}

            {adaptiveHint && (
              <Card className="p-4 border-2 border-violet-200 bg-violet-50">
                <p className="text-sm font-semibold text-violet-900 mb-1">Adaptive learning suggestion</p>
                <p className="text-sm text-violet-800">{adaptiveHint}</p>
              </Card>
            )}

            {/* ── Check-in Point ── */}
            {checkpointPending && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 bg-orange-50 border-2 border-orange-200 rounded-xl"
                role="region"
                aria-label="Section check-in"
              >
                <div className="flex items-center gap-3 mb-3">
                  <HelpCircle className="w-5 h-5 text-orange-600" />
                  <h3 className="font-semibold text-orange-900">
                    {currentDbCheckpoint?.title || 'Check-in before you continue'}
                  </h3>
                  {currentDbCheckpoint && (
                    <Badge variant="outline" className="text-[10px] capitalize border-orange-300 text-orange-700">
                      {currentDbCheckpoint.checkpoint_type}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-orange-800 mb-4">
                  {currentDbCheckpoint?.description || (guidedMode
                    ? 'Take a moment to make sure you understood this section. You need to check in before moving to the next part.'
                    : 'Did you understand this section before moving on?')}
                </p>
                {lessonCheckpoints.length > 0 && (
                  <p className="text-xs text-orange-700 mb-3">
                    Checkpoint {completedCheckpointIds.size + 1} of {lessonCheckpoints.length}
                  </p>
                )}
                <div className="flex gap-3">
                  <Button
                    onClick={acknowledgeCheckpoint}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Yes, I understand — continue
                  </Button>
                  <Button
                    onClick={handleReviewAgain}
                    variant="outline"
                    className="border-orange-300 text-orange-700 hover:bg-orange-100"
                  >
                    No, let me review again
                  </Button>
                </div>
              </motion.div>
            )}

            {requireCheckpoint && !canAdvanceChunk && guidedMode && (
              <p className="text-xs text-indigo-600 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Complete the check-in above to unlock the next section.
              </p>
            )}

            {/* ── Chunk Navigation (bottom of content) ── */}
            {showChunkNav && !effectiveFocusMode && !isSlideMode && (
              <ChunkNavigation
                currentChunk={currentChunk}
                totalChunks={totalChunks}
                guidedMode={guidedMode}
                canAdvance={canAdvanceChunk}
                requireCheckpoint={requireCheckpoint}
                onPrev={goToPrevChunk}
                onNext={goToNextChunk}
                position="bottom"
              />
            )}
            {/* ── Student Summary (optional) ── */}
            {lesson.has_summary_activity && (showEndOfLessonContent || (effectiveFocusMode && currentFocusId === 'summary')) && (
              <div>
                {guidedMode && (
                  <div className="mb-3 flex items-center gap-2">
                    <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-xs">Step 3 — Wrap-up</Badge>
                    <span className="text-sm text-gray-600">Complete this activity to finish the lesson.</span>
                  </div>
                )}
                <StudentSummary
                lessonId={lessonId}
                courseId={courseId}
                wordTarget={lesson.summary_word_target ?? 100}
                keyPoints={lesson.summary_key_points || []}
                reflectionQuestions={lesson.summary_reflection_questions || []}
                source={lesson.summary_source || 'entire_lesson'}
                onComplete={() => { setLessonCompleted(true); setSummarySubmitted(true); }}
                />
              </div>
            )}

            {/* ── End-of-lesson completion (when no summary activity) ── */}
            {!lesson.has_summary_activity && (showEndOfLessonContent || (effectiveFocusMode && currentFocusId === 'summary')) && !lessonCompleted && (
              <Card className="p-6 rounded-xl border-2 border-blue-200 bg-white mt-6">
                <div className="flex items-start gap-3 mb-4">
                  <CheckCircle className="w-6 h-6 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Complete This Lesson</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Click the button below when you&apos;ve finished reviewing the lesson content.
                    </p>
                  </div>
                </div>
                <Button onClick={handleCompleteLesson} className="bg-green-600 hover:bg-green-700 text-white">
                  <CheckCircle className="w-4 h-4 mr-2" /> Mark Complete
                </Button>
              </Card>
            )}
            {!lesson.has_summary_activity && (showEndOfLessonContent || (effectiveFocusMode && currentFocusId === 'summary')) && lessonCompleted && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Card className="p-8 rounded-xl border-2 border-yellow-300 bg-gradient-to-br from-yellow-50 to-green-50 mt-6 overflow-hidden relative">
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="absolute top-0 left-1/4 w-2 h-2 bg-yellow-400 rounded-full animate-ping" />
                    <div className="absolute top-2 right-1/3 w-1.5 h-1.5 bg-orange-400 rounded-full animate-ping" style={{ animationDelay: '0.5s' }} />
                    <div className="absolute bottom-1 left-1/3 w-1.5 h-1.5 bg-green-400 rounded-full animate-ping" style={{ animationDelay: '1s' }} />
                    <div className="absolute top-1/2 right-1/4 w-1 h-1 bg-yellow-300 rounded-full animate-ping" style={{ animationDelay: '0.8s' }} />
                  </motion.div>
                  <div className="flex flex-col items-center text-center relative z-10">
                    <CelebrationAnimation />
                    <h3 className="text-xl font-bold text-green-800 mt-2">Lesson Completed!</h3>
                    <p className="text-sm text-green-700 mt-1">Great work! You can now proceed to the next lesson.</p>
                    {onNextLesson && lesson.sequence_order < lesson.total_lessons && (
                      <Button onClick={onNextLesson} className="mt-4 bg-green-600 hover:bg-green-700 text-white">
                        {nextLessonTitle ? `Next: ${nextLessonTitle}` : 'Next Lesson'} <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    )}
                  </div>
                </Card>
              </motion.div>
            )}
          </div>
        )}

        {/* ── PDF Tab (optional) ── */}
        {activeTab === 'pdf' && lesson.has_pdf !== false && (
          <div className="space-y-6">
            {assets.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No PDF resources for this lesson</p>
              </div>
            ) : (
              assets.map((asset) => (
                <PdfViewer key={asset.id} url={asset.url} title={asset.title || 'PDF Document'} />
              ))
            )}
          </div>
        )}

        {/* ── Quiz Tab (optional) ── */}
        {activeTab === 'quiz' && (
          lesson.has_quiz === false ? (
            <div className="text-center py-12">
              <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Quiz is not available for this lesson</p>
            </div>
          ) : (
            <QuizPage
              key={quizResetKey}
              lessonId={lessonId}
              courseId={courseId}
              onBack={() => setActiveTab('content')}
              onSubmit={handleQuizSubmit}
              adaptiveLearningEnabled={!!lesson.adaptive_learning_enabled}
              simplifiedSummary={lesson.simplified_summary}
              onSuggestReview={() => {
                setActiveTab('content');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )
        )}
      </div>

      {!effectiveFocusMode && (
        <div className={`${contentContainerClass} mx-auto px-6 pb-8 bottom-lesson-nav`}>
          <div className="mt-8 flex items-center justify-between gap-4">
            <Button
              onClick={onPreviousLesson}
              variant="outline"
              className="previous-btn px-8 py-6 text-lg"
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
              disabled={!onNextLesson || lesson.sequence_order >= lesson.total_lessons}
              title={nextLessonTitle || ''}
            >
              {nextLessonTitle ? nextLessonTitle : 'Next Lesson'}
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      )}

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
          setQuizResetKey((k) => k + 1);
        }}
        onContinueLearning={() => {
          setShowQuizResult(false);
          setActiveTab('content');
        }}
      />
    </div>
  );
}
