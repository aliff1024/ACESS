'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from '../ui/breadcrumb';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';
import DOMPurify from 'dompurify';

import { LessonDiscussion } from '../community/LessonDiscussion';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Volume2, VolumeX, FileText, BookOpen, HelpCircle, ChevronLeft, ChevronRight, Loader2, Video, ExternalLink, Shield, Target, Layers, Clock, Maximize2, Minimize2, CheckCircle, Home, Award, Sparkles, MapPin, Lock, Layout, Image, Link, Gamepad2, List, Download, MessageSquare, AlertTriangle } from 'lucide-react';
import { useAccessibility } from '@/providers/AccessibilityProvider';
import { fetchLessonContent, fetchQuizData, submitQuizAttempt, markLessonViewed, completeLesson, fetchLessonCheckpoints, fetchCompletedCheckpointIds, completeLearnerCheckpoint, fetchSystemCourseProgress, fetchLessonProgressMeta, saveLessonProgressMeta } from '@/lib/learner-api';
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
import { TaskChecklist } from '@/components/accessibility/TaskChecklist';
import { VisualSchedule } from '@/components/accessibility/VisualSchedule';
import { StepByStepGuidance, type GuidedStep } from '@/components/accessibility/StepByStepGuidance';

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

function CelebrationAnimation({ animationLevel = 'normal' }: { animationLevel?: string }) {
  if (animationLevel === 'none') {
    return (
      <div className="flex flex-col items-center gap-2 py-2">
        <Award className="w-12 h-12 text-yellow-500" />
      </div>
    );
  }
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
        {showSimplifiedSummary && <span className="font-medium">Step 1: Overview</span>}
        <span className="font-medium">Step 2: Section {currentChunk + 1} of {totalChunks}</span>
        {hasSummary && <span className={currentChunk >= totalChunks - 1 ? 'font-medium' : 'text-indigo-500'}>Step 3: Wrap-up</span>}
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
  isPreview?: boolean;
}



export function LessonViewPage({
  lessonId,
  courseId,
  onBack,
  onNextLesson,
  onPreviousLesson,
  isPreview = false,
}: LessonViewPageProps) {
  useEffect(() => {
    const main = document.getElementById('main-content');
    if (!main) return;
    const handleScroll = () => {
      setIsScrolled(main.scrollTop > 50);
    };
    main.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => main.removeEventListener('scroll', handleScroll);
  }, []);

  const router = useRouter();
  const [lesson, setLesson] = useState<LessonContent | null>(null);
  const [assets, setAssets] = useState<LessonAsset[]>([]);
  const [interactiveContent, setInteractiveContent] = useState<LearnerInteractiveContent[]>([]);
  const [h5pContent, setH5pContent] = useState<LearnerH5PContent[]>([]);
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);
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
  const [completing, setCompleting] = useState(false);

  // Quiz flow state
  const [quizId, setQuizId] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<{ questionId: string; selectedAnswer: string }[]>([]);
  const [showQuizResult, setShowQuizResult] = useState(false);
  const [isReviewingAnswers, setIsReviewingAnswers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [quizResetKey, setQuizResetKey] = useState(0);

  // Completion Tracking (persisted to database)
  const [tracker, setTracker] = useState({ video: false, activity: false, scroll: false, quiz: false });
  const [completedActivityIds, setCompletedActivityIds] = useState<Set<string>>(new Set());
  const [guidedStepIndex, setGuidedStepIndex] = useState(0);
  const [lastCompletedStepIndex, setLastCompletedStepIndex] = useState(-1);
  const [showCompletionPopup, setShowCompletionPopup] = useState(false);
  const [hasDismissedCompletionPopup, setHasDismissedCompletionPopup] = useState(false);
  const [showChecklistPopup, setShowChecklistPopup] = useState(false);

  const { settings, adaptiveOverrides, updateSettings } = useAccessibility();
  const adaptiveLessonModes = adaptiveOverrides.lesson_modes;

  // Focus mode local toggle (learner can override lesson setting)
  const [focusMode, setFocusMode] = useState(false);
  const [focusStep, setFocusStep] = useState(0);

  const [isScrolled, setIsScrolled] = useState(false);
  const [activePhase, setActivePhase] = useState<'content' | 'activity' | 'quiz' | 'finish'>('content');
  const [isResourcesOpen, setIsResourcesOpen] = useState(false);
  const [isDiscussionOpen, setIsDiscussionOpen] = useState(false);
  const [isQuizOpen, setIsQuizOpen] = useState(false);


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
  const contentTopRef = useRef<HTMLDivElement>(null);
  const ttsRateRef = useRef(ttsRate);
  ttsRateRef.current = ttsRate;

  // Video questions state
  const [videoQuestions, setVideoQuestions] = useState<LearnerVideoQuestion[]>([]);
  const [answeredQuestionIds, setAnsweredQuestionIds] = useState<Set<string>>(new Set());
  const [vqCompletedIds, setVqCompletedIds] = useState<Set<string>>(new Set());
  const [temporarilySkippedIds, setTemporarilySkippedIds] = useState<Set<string>>(new Set());
  const [activeVideoQuestion, setActiveVideoQuestion] = useState<LearnerVideoQuestion | null>(null);
  const [selectedVqOption, setSelectedVqOption] = useState<number | null>(null);
  const [vqAnswerFeedback, setVqAnswerFeedback] = useState<{ correct: boolean; correctIndex: number } | null>(null);
  const [selectedActivityTabId, setSelectedActivityTabId] = useState<string | null>(null);

  // Lesson Helper Sidebar state
  const [showHelperSidebar, setShowHelperSidebar] = useState(false);
  const [courseModules, setCourseModules] = useState<{ id: string | null; title: string; lessons: any[] }[]>([]);
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(new Set());

  const playerRef = useRef<YT.Player | null>(null);
  const ytApiReadyRef = useRef(false);
  const [ytApiLoaded, setYtApiLoaded] = useState(false);
  const [viewingAsset, setViewingAsset] = useState<string | null>(null);

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
        // Load lesson progress meta from database
        fetchLessonProgressMeta(lessonId, courseId).then(meta => {
          if (meta) {
            setTracker(meta);
            if (typeof meta.guided_step_index === 'number') setGuidedStepIndex(meta.guided_step_index);
            if (typeof meta.last_completed_step_index === 'number') setLastCompletedStepIndex(meta.last_completed_step_index);
          }
        }).catch(err => console.error('[lesson-progress] load error:', err));
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
          supabase.from('lesson_progress').select('lesson_id').eq('enrollment_id', enrollment.id).eq('is_viewed', true)
            .then(({ data: lpData }) => {
              if (lpData) {
                setCompletedLessons(lpData.length);
                setCompletedLessonIds(new Set(lpData.map(lp => lp.lesson_id)));
              }
            }).catch(() => {});
        }).catch(() => {});
    }).catch(() => {});
    
    Promise.all([
      supabase.from('lessons').select('id, title, sequence_order, chapter_id').eq('course_id', courseId).eq('status', 'published').or('visibility_status.eq.visible,visibility_status.is.null').order('sequence_order', { ascending: true }),
      supabase.from('course_chapters').select('id, title').eq('course_id', courseId).order('sequence_order', { ascending: true })
    ]).then(([lessonsRes, chaptersRes]) => {
      const data = lessonsRes.data;
      const chaptersData = chaptersRes.data;
      if (!data) return;

      const chaptersMap = new Map();
      if (chaptersData) {
        chaptersData.forEach((c) => {
          chaptersMap.set(c.id, { id: c.id, title: c.title, lessons: [] });
        });
      }

      const noChapter: any[] = [];
      data.forEach((l: any) => {
        if (l.chapter_id && chaptersMap.has(l.chapter_id)) {
          chaptersMap.get(l.chapter_id).lessons.push(l);
        } else {
          noChapter.push(l);
        }
      });
      
      const modules = Array.from(chaptersMap.values()).filter(m => m.lessons.length > 0);
      if (noChapter.length > 0) modules.push({ id: null, title: 'Other Lessons', lessons: noChapter });
      setCourseModules(modules);
      
      const idx = data.findIndex((l) => l.id === lessonId);
      if (idx >= 0 && idx < data.length - 1) setNextLessonTitle(data[idx + 1].title);
    }).catch(() => {});
  }, [lessonId, courseId]);

  // YouTube IFrame API + video questions polling
  useEffect(() => {
    const ytId = lesson ? getYouTubeId(lesson.video_url || '') : null;
    if (!ytId) return;

    let cancelled = false;
    let pollInterval: any = null;

    function initPlayer() {
      if (cancelled) return;
      if (playerRef.current) return;
      const el = document.getElementById('youtube-player');
      if (!el) return; // Might be hidden/unmounted
      
      ytApiReadyRef.current = true;
      setYtApiLoaded(true);
      playerRef.current = new window.YT.Player('youtube-player', {
        videoId: ytId!,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          cc_load_policy: settings.captions_enabled ? 1 : 0,
        },
        events: {
          onReady: () => {},
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.ENDED) {
              setTracker((p) => ({ ...p, video: true }));
            }
          },
        },
      });
    }

    if (typeof window.YT === 'undefined' || typeof window.YT.Player === 'undefined') {
      const existingScript = document.getElementById('youtube-api-script');
      if (!existingScript) {
        const tag = document.createElement('script');
        tag.id = 'youtube-api-script';
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        if (firstScriptTag && firstScriptTag.parentNode) {
          firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        } else {
          document.head.appendChild(tag);
        }
      }
      
      pollInterval = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(pollInterval);
          initPlayer();
        }
      }, 100);
    } else {
      initPlayer();
    }

    return () => {
      cancelled = true;
      if (pollInterval) clearInterval(pollInterval);
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [lesson?.video_url, settings.captions_enabled]);

  // Separate useEffect for video question polling to ensure fresh state
  useEffect(() => {
    if (!ytApiLoaded || !playerRef.current || videoQuestions.length === 0) return;

    const intervalId = window.setInterval(() => {
      if (!playerRef.current || activeVideoQuestion) return;
      
      try {
        const currentTime = playerRef.current.getCurrentTime();
        if (typeof currentTime !== 'number') return;
        
        // Reset skipped questions if we rewind before them
        if (temporarilySkippedIds.size > 0) {
          setTemporarilySkippedIds(prev => {
            const nextSkipped = new Set(prev);
            let changed = false;
            videoQuestions.forEach(q => {
              if (nextSkipped.has(q.id) && currentTime < q.timestamp_seconds - 1) {
                nextSkipped.delete(q.id);
                changed = true;
              }
            });
            return changed ? nextSkipped : prev;
          });
        }
        
        const unanswered = videoQuestions.filter(
          (q) => !answeredQuestionIds.has(q.id) && !vqCompletedIds.has(q.id) && !temporarilySkippedIds.has(q.id)
        );
        
        const next = unanswered.find((q) => currentTime >= q.timestamp_seconds);
        if (next) {
          playerRef.current.pauseVideo();
          setActiveVideoQuestion(next);
          setSelectedVqOption(null);
          setVqAnswerFeedback(null);
        }
      } catch (e) {
        // player might not be fully ready
      }
    }, 500);

    return () => window.clearInterval(intervalId);
  }, [ytApiLoaded, videoQuestions, answeredQuestionIds, vqCompletedIds, temporarilySkippedIds, activeVideoQuestion]);

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
    setTracker({ video: false, activity: false, scroll: false, quiz: false });
    
    // Load from localStorage
    if (typeof window !== 'undefined') {
      const savedActs = localStorage.getItem(`lesson_${lessonId}_activities`);
      setCompletedActivityIds(savedActs ? new Set(JSON.parse(savedActs)) : new Set());
      const savedVQs = localStorage.getItem(`lesson_${lessonId}_videoqs`);
      setAnsweredQuestionIds(savedVQs ? new Set(JSON.parse(savedVQs)) : new Set());
      const savedVqCompleted = localStorage.getItem(`lesson_${lessonId}_vqcompleted`);
      setVqCompletedIds(savedVqCompleted ? new Set(JSON.parse(savedVqCompleted)) : new Set());
    } else {
      setCompletedActivityIds(new Set());
      setAnsweredQuestionIds(new Set());
      setVqCompletedIds(new Set());
    }
    
    setShowCompletionPopup(false);
    setHasDismissedCompletionPopup(false);
  }, [lessonId, stopTTS]);

  // Sync state to localStorage and update tracker.activity
  useEffect(() => {
    if (!lessonId) return;
    if (completedActivityIds.size > 0) {
      localStorage.setItem(`lesson_${lessonId}_activities`, JSON.stringify(Array.from(completedActivityIds)));
    }
    if (interactiveContent.length > 0 && completedActivityIds.size >= interactiveContent.length) {
      setTracker(p => ({ ...p, activity: true }));
    } else if (interactiveContent.length === 0) {
      setTracker(p => ({ ...p, activity: true })); // Auto-complete activity tracking if none exist
    }
  }, [completedActivityIds, lessonId, interactiveContent.length]);

  // Sync video questions to localStorage
  useEffect(() => {
    if (!lessonId) return;
    if (answeredQuestionIds.size > 0) {
      localStorage.setItem(`lesson_${lessonId}_videoqs`, JSON.stringify(Array.from(answeredQuestionIds)));
    }
    if (vqCompletedIds.size > 0) {
      localStorage.setItem(`lesson_${lessonId}_vqcompleted`, JSON.stringify(Array.from(vqCompletedIds)));
    }
  }, [answeredQuestionIds, vqCompletedIds, lessonId]);

  useEffect(() => {
    const main = document.getElementById('main-content');
    if (!main) return;
    const onScroll = () => {
      if ((main.clientHeight + main.scrollTop) >= main.scrollHeight - 250) {
        setTracker(p => ({ ...p, scroll: true }));
      }
    };
    main.addEventListener('scroll', onScroll, { passive: true });
    // Also check if already scrolled on mount
    requestAnimationFrame(() => {
      if ((main.clientHeight + main.scrollTop) >= main.scrollHeight - 250) {
        setTracker(p => ({ ...p, scroll: true }));
      }
    });
    return () => main.removeEventListener('scroll', onScroll);
  }, []);

  // Auto-mark content as scrolled when user leaves content phase
  useEffect(() => {
    if (activePhase !== 'content' && contentHtml) {
      setTracker(p => ({ ...p, scroll: true }));
    }
  }, [activePhase]);

  // Completion popup trigger
  useEffect(() => {
    if (!lesson || lessonCompleted) return;
    const needsVideo = lesson?.has_video !== false && !!lesson.video_url;
    const needsActivities = interactiveContent.length > 0;
    const needsQuiz = lesson.has_quiz && quizData;
    
    if (
      (!needsVideo || tracker.video) &&
      (!needsActivities || tracker.activity) &&
      (!needsQuiz || tracker.quiz) &&
      tracker.scroll &&
      !showCompletionPopup &&
      !hasDismissedCompletionPopup
    ) {
      setShowCompletionPopup(true);
    }
  }, [tracker, lesson, interactiveContent.length, quizData, lessonCompleted, showCompletionPopup, hasDismissedCompletionPopup]);

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

  const lessonPhases = lesson ? [
    { id: 'content' as const, name: 'Content', fullName: 'Lesson Content', required: true, done: tracker.scroll && (lesson?.has_video === false || !lesson?.video_url || tracker.video) },
    { id: 'activity' as const, name: 'Activities', fullName: 'Interactive Activities', required: interactiveContent.length > 0, done: tracker.activity },
    { id: 'quiz' as const, name: 'Quiz', fullName: 'Pass Quiz', required: lesson.has_quiz && !!quizData, done: tracker.quiz },
    { id: 'finish' as const, name: 'Finish', fullName: 'Finish Lesson', required: true, done: lessonCompleted },
  ].filter(p => p.required) : [];

  const getPhasePending = (phaseId: string): string[] => {
    const items: string[] = [];
    switch (phaseId) {
      case 'content':
        if (lesson?.has_video !== false && !!lesson?.video_url && !tracker.video) items.push('Watch Video');
        if (!tracker.scroll && contentHtml) items.push('Read Content');
        break;
      case 'activity':
        if (!tracker.activity && interactiveContent.some(a => !completedActivityIds.has(a.id))) items.push('Complete Activities');
        break;
      case 'quiz':
        if (!tracker.quiz && quizData && lesson?.has_quiz !== false) items.push('Pass Quiz');
        break;
      case 'finish':
        if (!lessonCompleted) items.push('Complete Lesson');
        break;
    }
    return items;
  };



  const renderPhaseStepper = (isCompact: boolean = false) => {
    if (lessonPhases.length < 2) return null;
    const activeIndex = lessonPhases.findIndex(p => p.id === activePhase);
    const content = (
        <div className={`flex items-center ${isCompact ? 'justify-end' : 'justify-center'} gap-4 pb-2 w-full`}>
          {lessonPhases.map((p, i) => {
            const pendingItems = getPhasePending(p.id);
            const isActive = activePhase === p.id;
            const hasWarning = isActive && pendingItems.length > 0;
            const isPast = i < activeIndex;

            let hasPrevUndone = false;
            let prevUndoneNames: string[] = [];
            for (let j = 0; j < i; j++) {
              if (!lessonPhases[j].done) {
                hasPrevUndone = true;
                prevUndoneNames.push(lessonPhases[j].fullName);
              }
            }

            let circleStyle: string;
            let labelStyle: string;
            let icon: React.ReactNode;

            if (p.done) {
              circleStyle = 'bg-green-100 text-green-700 border-green-300';
              labelStyle = 'text-green-600';
              icon = <CheckCircle className="w-4 h-4" />;
            } else if (isActive && hasWarning) {
              circleStyle = 'bg-amber-100 text-amber-700 border-amber-300 ring-2 ring-amber-200';
              labelStyle = 'text-amber-700';
              icon = <AlertTriangle className="w-4 h-4" />;
            } else if (isActive) {
              circleStyle = 'bg-blue-100 text-blue-700 border-blue-400 ring-4 ring-blue-200';
              labelStyle = 'text-blue-800 font-bold';
              icon = <span className="font-bold text-xs">{i + 1}</span>;
            } else if (isPast) {
              circleStyle = 'bg-rose-50 text-rose-500 border-rose-300';
              labelStyle = 'text-rose-500';
              icon = <AlertTriangle className="w-3.5 h-3.5" />;
            } else {
              circleStyle = 'bg-gray-50 text-gray-400 border-gray-200';
              labelStyle = 'text-gray-400';
              icon = <span className="font-bold text-xs">{i + 1}</span>;
            }

            return (
              <div key={p.id} className="flex items-center gap-4 group relative">
                <button 
                  onClick={() => {
                    if (hasPrevUndone) {
                      toast.warning(`Complete "${prevUndoneNames.join('", "')}" before moving ahead`);
                    }
                    setActivePhase(p.id);
                    document.getElementById('main-content')?.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`flex flex-col items-center gap-1.5 transition-all cursor-pointer hover:scale-105 ${isActive && !p.done ? 'scale-110' : ''}`}
                >
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 shadow-sm transition-colors ${circleStyle} ${isActive ? 'ring-offset-1' : ''}`}>
                    {icon}
                  </div>
                  <span className={`text-xs font-semibold ${labelStyle} ${isActive && !p.done ? 'underline decoration-dotted underline-offset-2' : ''}`}>
                    {p.name}
                  </span>
                </button>

                {/* Tooltip: bottom-anchored to avoid overflow clipping */}
                {(hasPrevUndone || pendingItems.length > 0) && (
                  <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[10px] py-1.5 px-2.5 rounded-md whitespace-nowrap pointer-events-none z-50 shadow-lg">
                    {hasPrevUndone && <div className="font-semibold mb-0.5">⚠ Incomplete previous phases</div>}
                    {pendingItems.map((item, idx) => <div key={idx}>• {item}</div>)}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-900" />
                  </div>
                )}

                {i < lessonPhases.length - 1 && (
                  <div className={`w-6 h-[2px] shrink-0 ${lessonPhases[i].done ? 'bg-green-300' : 'bg-gray-200'}`} />
                )}
              </div>
            );
          })}
        </div>
    );
    if (isCompact) return content;
    return (
      <div className="mt-3 border-t border-gray-100 pt-4 flex flex-col items-center w-full">
        {content}
      </div>
    );
  };

  const handleCompleteLesson = useCallback(async () => {
    if (completing) return;
    if (isPreview) {
      toast.info('Lesson completion simulated in Preview Mode');
      setLessonCompleted(true);
      return;
    }
    if (!lesson) return;
    setCompleting(true);
    try {
      await completeLesson(lessonId, courseId);
      setLessonCompleted(true);
      
      // Check if course is now fully completed
      try {
        const progress = await fetchSystemCourseProgress(courseId);
        if (progress && progress.progress_pct === 100) {
          toast.success('Congratulations! You have completed the entire course.');
          router.push('/learner/certificates?earned=true');
        }
      } catch (e) {
        console.error('Failed to check course completion', e);
      }
    } finally {
      setCompleting(false);
    }
  }, [isPreview, lessonId, courseId, lesson, router, completing]);

  // Persist tracker + guided step index to database (debounced)
  useEffect(() => {
    if (!enrollmentId || !lessonId) return;
    const timer = setTimeout(() => {
      saveLessonProgressMeta(lessonId, courseId, {
        ...tracker,
        guided_step_index: guidedStepIndex,
        last_completed_step_index: lastCompletedStepIndex,
      }).catch(err => console.error('[lesson-progress] save error:', err));
    }, 300);
    return () => clearTimeout(timer);
  }, [tracker, guidedStepIndex, lastCompletedStepIndex, lessonId, courseId, enrollmentId]);

  const handleQuizSubmit = async (score: number, answers: { questionId: string; selectedAnswer: string }[]) => {
    if (isPreview) {
      toast.info('Quiz submission simulated in Preview Mode');
      setQuizScore(score);
      setQuizAnswers(answers);
      setShowQuizResult(true);
      return;
    }
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
        setTracker((p) => ({ ...p, quiz: true }));
        
        // Check if course is now fully completed
        const progress = await fetchSystemCourseProgress(courseId);
        if (progress && progress.progress_pct === 100) {
          toast.success('Congratulations! You have completed the entire course.');
          router.push('/learner/certificates?earned=true');
        }
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

  const activePreset = settings?.active_preset || 'none';
  const simplifiedMode = settings.simplified_ui ?? (activePreset === 'autism' || activePreset === 'adhd');
  
  // ADHD profile forcefully applies chunked learning and focus mode.
  const effectiveFocusMode = focusMode || activePreset === 'adhd';
  const effectiveChunkedEnabled = settings.chunked_content_mode || lesson.chunked_content_enabled || adaptiveLessonModes.chunked_content || activePreset === 'adhd' || activePreset === 'autism';

  // For Dyslexia, enforce max-w-2xl for better line lengths (typically 60-70 characters).
  // For ADHD, keep focus mode tight.
  const contentContainerClass = settings.distraction_free_mode
    ? 'max-w-full px-4 sm:px-8 xl:px-12'
    : effectiveFocusMode
      ? 'max-w-3xl'
      : activePreset === 'dyslexia'
        ? 'max-w-2xl text-lg' // tighter width, larger text
        : simplifiedMode
          ? 'max-w-4xl'
          : layoutContainer;

  const lineSpacingMap: Record<string, string> = { tight: 'leading-tight', normal: 'leading-normal', relaxed: 'leading-relaxed', wide: 'leading-loose', loose: 'leading-loose' };
  const fontSizeMap: Record<string, string> = { small: 'text-sm prose-sm', medium: 'text-base prose-base', large: 'text-lg prose-lg', xlarge: 'text-xl prose-xl' };
  const contentLineSpacing = lineSpacingMap[settings.line_spacing ?? 'normal'] || 'leading-normal';
  const contentFontSize = fontSizeMap[settings.preferred_font_size ?? 'medium'] || 'text-base prose-base';

  const contentHtml = lesson.content_html || '';
  const educatorLayout = lesson.lesson_layout || 'standard';
  // Autism profile does not use slideshows (too unexpected), prefers explicit chunks
  const isSlideMode = activePreset === 'autism' ? false : (viewMode !== null ? viewMode === 'slide' : educatorLayout === 'slideshow');

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

  const guidedMode = !isSlideMode && !effectiveFocusMode && showChunkNav && (effectiveChunkedEnabled || simplifiedMode || adaptiveLessonModes.guided_mode || activePreset === 'autism');
  const requireCheckpoint = !isSlideMode && (!!lesson.checkpoints_enabled || adaptiveLessonModes.checkpoints || activePreset === 'autism') && showChunkNav && !effectiveFocusMode;
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
    ...interactiveContent.map(activity => ({ id: `activity-${activity.id}` as const, label: activity.title || 'Activity' })),
    { id: 'summary' as const, label: 'Summary' },
  ];
  const currentFocusId = effectiveFocusMode && focusSteps.length > 0 ? focusSteps[Math.min(focusStep, focusSteps.length - 1)]?.id : null;

  const goToPrevChunk = () => {
    setCurrentChunk((c) => Math.max(0, c - 1));
    setAdaptiveHint(null);
    contentTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const goToNextChunk = () => {
    if (!canAdvanceChunk) return;
    setAdaptiveHint(null);
    setCurrentChunk((c) => {
      const next = Math.min(totalChunks - 1, c + 1);
      if (next === totalChunks - 1 && isSlideMode) {
        setTracker((p) => ({ ...p, scroll: true }));
      }
      return next;
    });
    contentTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleCheckpointAcknowledge = async (cp: LearnerLessonCheckpoint) => {
    if (isPreview) {
      toast.info('Checkpoint completed in Preview Mode');
      setAcknowledgedCheckpoints((prev) => new Set(prev).add(cp.sequence_order));
      setCompletedCheckpointIds((prev) => new Set(prev).add(cp.id));
      return;
    }
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


  // ── Guided Step Definitions ──
  const guidedHasVideo = !!(lesson.video_url && lesson.has_video !== false);
  const guidedHasContent = !!contentHtml;
  const guidedHasActivity = interactiveContent.length > 0;
  const guidedHasQuiz = !!(quizData && lesson.has_quiz !== false);

  const guidedSteps: GuidedStep[] = [
    ...(guidedHasVideo ? [{ id: 'video', title: 'Watch Video', completed: tracker.video }] : []),
    ...(guidedHasContent ? [{ id: 'content', title: 'Read Lesson Content', completed: tracker.scroll }] : []),
    ...(guidedHasActivity ? [{ id: 'activity', title: 'Complete Activity', completed: tracker.activity }] : []),
    ...(guidedHasQuiz ? [{ id: 'quiz', title: 'Take Quiz', completed: tracker.quiz }] : []),
  ];

  // Clamp guided step index — never point past the first incomplete step
  const firstIncomplete = guidedSteps.findIndex(s => !s.completed);
  const clampedIndex = firstIncomplete === -1
    ? Math.max(0, guidedSteps.length - 1)
    : Math.min(guidedStepIndex, firstIncomplete);

  // Sync clamped index on mount and when steps change
  useEffect(() => {
    let newIndex = clampedIndex;
    // When re-entering guided mode, resume after last completed step
    if (settings.step_by_step_enabled && lastCompletedStepIndex >= 0) {
      newIndex = Math.min(lastCompletedStepIndex + 1, clampedIndex);
    }
    if (newIndex !== guidedStepIndex && guidedSteps.length > 0) {
      setGuidedStepIndex(newIndex);
    }
  }, [guidedSteps.length, settings.step_by_step_enabled]);

  const handleGuidedStepChange = (index: number) => {
    setGuidedStepIndex(index);
  };

  const handleGuidedStepComplete = (stepId: string) => {
    setLastCompletedStepIndex(guidedStepIndex);
    if (stepId === 'content' && !tracker.scroll) {
      setTracker(p => ({ ...p, scroll: true }));
    }
  };

  const handleExitGuidedMode = () => {
    updateSettings({ ...settings, step_by_step_enabled: false });
    toast('Guided mode disabled. You can re-enable it from Accessibility Settings.');
  };

  // ── Dynamic Executive Function Content ──
  const dynamicTasks = [
    ...(lesson.video_url && lesson.has_video !== false ? [{ id: 'video', title: 'Watch Video', completed: tracker.video, type: 'lesson' as const }] : []),
    ...(contentHtml ? [{ id: 'content', title: 'Read Lesson Content', completed: tracker.scroll, type: 'lesson' as const }] : []),
    ...interactiveContent.map(act => ({ id: `act-${act.id}`, title: `Activity: ${act.title}`, completed: completedActivityIds.has(act.id), type: 'assignment' as const })),
    ...(quizData && lesson.has_quiz !== false ? [{ id: 'quiz', title: 'Pass Quiz', completed: tracker.quiz, type: 'quiz' as const }] : [])
  ];

  const scheduleItems = [
    ...(lesson.video_url && lesson.has_video !== false ? [{ id: 'video', title: 'Watch Video', duration: 'Video', completed: tracker.video }] : []),
    ...(contentHtml ? [{ id: 'content', title: 'Read Core Material', duration: readTime.label, completed: tracker.scroll }] : []),
    ...(interactiveContent.length > 0 ? [{ id: 'activity', title: 'Complete Activities', duration: 'Activities', completed: tracker.activity }] : []),
    ...(quizData && lesson.has_quiz !== false ? [{ id: 'quiz', title: 'Knowledge Check', duration: 'Quiz', completed: tracker.quiz }] : [])
  ];
  const dynamicSchedule = scheduleItems.filter(i => !i.completed).map((item, index) => {
    const type: 'now' | 'next' | 'later' = index === 0 ? 'now' : index === 1 ? 'next' : 'later';
    return { id: item.id, title: item.title, duration: item.duration, type };
  });

  return (
    <div className="min-h-screen bg-background relative">
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {ttsStatusMessage}
      </div>
      {!effectiveFocusMode && (
        <div className="sticky top-0 z-10 bg-card border-b border-border shadow-sm transition-all duration-300">
          <div className={`${layoutContainer} mx-auto px-6 py-3`}>
            {!isScrolled ? (
              <>
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

                <div className="flex items-center justify-between flex-wrap gap-4 mt-2">
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
                    <Badge variant="outline" className="text-gray-600 border-gray-300 text-xs flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3" /> {durationLabel}
                    </Badge>
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

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    {lesson.has_pdf !== false && (
                      <Button variant="outline" size="sm" onClick={() => setIsResourcesOpen(true)} className="flex items-center gap-1.5 font-medium border-orange-200 text-orange-700 hover:bg-orange-50 hover:text-orange-800">
                        <FileText className="w-4 h-4" /> Resources
                      </Button>
                    )}
                    {lesson.allow_discussions && (
                      <Button variant="outline" size="sm" onClick={() => setIsDiscussionOpen(true)} className="flex items-center gap-1.5 font-medium border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800">
                        <MessageSquare className="w-4 h-4" /> Discussion
                      </Button>
                    )}
                    {lesson.has_quiz && (
                      <Button variant="outline" size="sm" onClick={() => setIsQuizOpen(true)} className="flex items-center gap-1.5 font-medium border-purple-200 text-purple-700 hover:bg-purple-50 hover:text-purple-800">
                        <HelpCircle className="w-4 h-4" /> Quiz
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => setShowHelperSidebar(true)} className="flex items-center gap-1.5 font-medium">
                      <List className="w-4 h-4" /> Course Outline
                    </Button>
                  </div>
                </div>

                {lesson.total_lessons > 0 && (
                  <div className="mt-4 flex items-center gap-3">
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

              </>
            ) : (
              <div className="flex flex-col items-center justify-center w-full py-1">
                <div className="flex flex-wrap items-center justify-between w-full gap-4">
                  <div className="flex items-center gap-2 shrink-0">
                    {lesson.has_pdf !== false && (
                      <Button variant="ghost" size="sm" onClick={() => setIsResourcesOpen(true)} className="flex items-center gap-1.5 text-orange-700 hover:bg-orange-50 font-medium">
                        <FileText className="w-4 h-4" /> <span className="hidden sm:inline">Resources</span>
                      </Button>
                    )}
                    {lesson.allow_discussions && (
                      <Button variant="ghost" size="sm" onClick={() => setIsDiscussionOpen(true)} className="flex items-center gap-1.5 text-blue-700 hover:bg-blue-50 font-medium">
                        <MessageSquare className="w-4 h-4" /> <span className="hidden sm:inline">Discussion</span>
                      </Button>
                    )}
                    {lesson.has_quiz && (
                      <Button variant="ghost" size="sm" onClick={() => setActivePhase('quiz')} className="flex items-center gap-1.5 text-purple-700 hover:bg-purple-50 font-medium">
                        <HelpCircle className="w-4 h-4" /> <span className="hidden sm:inline">Quiz</span>
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => setShowHelperSidebar(true)} className="flex items-center gap-1.5 text-gray-700 hover:bg-gray-100 font-medium">
                      <List className="w-4 h-4" /> <span className="hidden sm:inline">Outline</span>
                    </Button>
                  </div>
                  
                  <div className="flex-1 flex justify-end overflow-hidden">
                    {renderPhaseStepper(true)}
                  </div>
                </div>
              </div>
            )}
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

      <div id="lesson-main-content" ref={contentTopRef} className={`learner-view ${contentContainerClass} mx-auto px-6 py-4`}>
          <div className={layout === 'two_column' && !effectiveFocusMode ? 'grid grid-cols-2 gap-6' : 'space-y-8'}>
            
            <div className="block space-y-8" data-guided-container>
      {/* ── Guided Mode Wizard ── */}
      {settings.step_by_step_enabled && guidedSteps.length > 0 && (
        <StepByStepGuidance
          title={lesson.title || 'Lesson Steps'}
          steps={guidedSteps}
          currentIndex={guidedStepIndex}
          onStepChange={handleGuidedStepChange}
          onStepComplete={handleGuidedStepComplete}
          onExitGuidedMode={handleExitGuidedMode}
          embedded
        />
      )}
      {/* ── Phase Stepper ── */}
      {renderPhaseStepper(false)}

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
            <div className={activePhase === 'content' ? 'block' : 'hidden'} id="lesson-video" data-guided-section="video">
              {lesson.video_url && lesson.has_video !== false && (!effectiveFocusMode || currentFocusId === 'video') && (
                <CollapsibleCard
                  icon={<Video className="w-4 h-4 text-rose-600" />}
                  title="Video"
                defaultOpen={true}
                keepMounted={true}
                badge={`1 video${videoQuestions.length > 0 ? ` · ${videoQuestions.length} question${videoQuestions.length === 1 ? '' : 's'}` : ''}`}
              >
                {(() => {
                  const ytId = getYouTubeId(lesson.video_url!);
                  return ytId ? (
                    <div>
                      <div className="relative rounded-xl overflow-hidden bg-black mb-3" style={{ paddingBottom: '56.25%' }}>
                        <div id="youtube-player" className="absolute inset-0 w-full h-full" />
                        {!ytApiLoaded && (
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
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setTemporarilySkippedIds(prev => new Set(prev).add(activeVideoQuestion.id));
                                        setActiveVideoQuestion(null);
                                        setSelectedVqOption(null);
                                        setVqAnswerFeedback(null);
                                      }}
                                      className="px-3 py-1.5 text-xs font-medium rounded-lg text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                                    >
                                      Watch Video Again
                                    </button>
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
                                  </>
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
            </div>

            {/* ── Lesson Content ── */}
            <div className={activePhase === 'content' ? 'block' : 'hidden'} id="lesson-main-content" data-guided-section="content">
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
                  className="relative bg-card border border-border rounded-2xl shadow-sm overflow-hidden"
                  role="region"
                  aria-roledescription="slide"
                  aria-label={`Slide ${currentChunk + 1} of ${totalChunks}`}
                  aria-live="polite"
                >
                  <h2 className="sr-only">Slide {currentChunk + 1}</h2>
                  <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-white/90 backdrop-blur-sm p-1.5 rounded-full border border-gray-200 shadow-sm">
                    <button
                      onClick={handlePlayTTS}
                      aria-pressed={ttsPlaying}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        ttsPlaying
                          ? 'bg-red-100 text-red-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {ttsPlaying ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                      {ttsPlaying ? 'Stop' : 'Listen'}
                    </button>
                    <div className="w-px h-4 bg-gray-300"></div>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider pl-1 hidden sm:inline">Speed</span>
                    <div className="flex gap-0.5 pr-1">
                      {([0.75, 1, 1.25, 1.5] as const).map((speed) => (
                        <button
                          key={speed}
                          onClick={() => {
                            ttsRateRef.current = speed;
                            setTtsRate(speed);
                            if (ttsPlaying) { stopTTS(); speak(); }
                          }}
                          className={`px-1.5 py-0.5 text-[10px] font-medium rounded-md transition-colors ${
                            ttsRate === speed
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {speed}x
                        </button>
                      ))}
                    </div>
                  </div>
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
                          className={`prose max-w-4xl mx-auto text-gray-900 rich-content ${contentLineSpacing} ${contentFontSize} ${
                            simplifiedMode ? 'prose-xl prose-amber' : 'prose-lg'
                          }`}
                          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(currentChunkHtml, { ADD_ATTR: ['data-align', 'style'], ADD_TAGS: ['style'] }) }}
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
                    className={`prose max-w-none text-gray-900 rich-content ${contentLineSpacing} ${contentFontSize} ${
                      simplifiedMode ? 'prose-xl prose-amber' : 'prose-lg'
                    }`}
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(currentChunkHtml, { ADD_ATTR: ['data-align', 'style'], ADD_TAGS: ['style'] }) }}
                  />
                ) : (
                  <div className="text-center py-6">
                    <BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No content for this lesson yet</p>
                  </div>
                )}
              </CollapsibleCard>
            )}

            {/* ── Executive Function Supports ── */}
            {!effectiveFocusMode && (
              <div className="space-y-4">
                <TaskChecklist tasks={dynamicTasks} />
                <VisualSchedule schedule={dynamicSchedule.length > 0 ? dynamicSchedule : undefined} />
              </div>
            )}
            </div>

            {/* ── Native Interactive Activities (tabbed or focus) ── */}
            <div id="lesson-activities" className={activePhase === 'activity' ? 'block' : 'hidden'} data-guided-section="activity">
              {interactiveContent.length > 0 && (() => {
                const sorted = [...interactiveContent].sort((a, b) => a.sequence_order - b.sequence_order);
              
              if (effectiveFocusMode) {
                // In focus mode, render only the active activity
                const focusActivityId = currentFocusId?.replace('activity-', '');
                const activeItem = sorted.find(i => i.id === focusActivityId);
                
                if (!activeItem) return null;
                
                return (
                  <Card className="overflow-hidden border-2 border-indigo-100 shadow-sm mt-8">
                    <div className="bg-indigo-50/50 p-4 border-b border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                          <Gamepad2 className="w-5 h-5 text-indigo-600" />
                          Interactive Practice
                        </h3>
                        <p className="text-sm text-indigo-700/80 mt-1">Complete this activity to test your knowledge.</p>
                      </div>
                      <div className="flex items-center gap-2 text-sm font-medium text-indigo-800 bg-white px-3 py-1.5 rounded-full shadow-sm">
                        {completedActivityIds.has(activeItem.id) ? (
                          <><CheckCircle className="w-4 h-4 text-green-500" /> Completed</>
                        ) : (
                          <><div className="w-4 h-4 rounded-full border-2 border-indigo-400" /> In Progress</>
                        )}
                      </div>
                    </div>
                    <div className="p-6 bg-white">
                      <InteractiveActivityViewer
                        key={activeItem.id}
                        contentType={activeItem.content_type}
                        title={activeItem.title}
                        data={activeItem.content_data as unknown as InteractiveActivityData}
                        onComplete={() => {
                          setCompletedActivityIds((prev) => {
                            const next = new Set(prev).add(activeItem.id);
                            if (next.size === interactiveContent.length) {
                              setTracker((p) => ({ ...p, activity: true }));
                            }
                            return next;
                          });
                        }}
                      />
                    </div>
                  </Card>
                );
              }

              // Standard sequential mode
              const activeId = selectedActivityTabId && sorted.some(i => i.id === selectedActivityTabId) ? selectedActivityTabId : sorted[0].id;
              const activeItem = sorted.find(i => i.id === activeId)!;
              return (
                <CollapsibleCard icon={<Gamepad2 className="w-4 h-4 text-indigo-600" />} title="Interactive Practice" defaultOpen={true} keepMounted={true} badge={`${sorted.length} activities`}>
                  
                  {sorted.length > 1 && (
                    <div className="bg-gray-50 border-b border-gray-200 p-3 overflow-x-auto rounded-t-xl">
                      <div className="flex gap-2 min-w-max">
                        {sorted.map((item) => {
                          const isDone = completedActivityIds.has(item.id);
                          const isActive = activeId === item.id;
                          return (
                            <button
                              key={item.id}
                              onClick={() => setSelectedActivityTabId(item.id)}
                              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                isActive 
                                  ? 'bg-white shadow-sm ring-1 ring-gray-200 text-indigo-700' 
                                  : 'text-gray-600 hover:bg-gray-200/50 hover:text-gray-900'
                              }`}
                            >
                              {isDone ? (
                                <CheckCircle className={`w-4 h-4 ${isActive ? 'text-green-500' : 'text-green-600'}`} />
                              ) : (
                                <div className={`w-4 h-4 rounded-full border-2 ${isActive ? 'border-indigo-400' : 'border-gray-300'}`} />
                              )}
                              <span className="truncate max-w-[150px]">{item.title}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div className="p-6 bg-white">
                    <InteractiveActivityViewer
                      key={activeItem.id}
                      contentType={activeItem.content_type}
                      title={activeItem.title}
                      data={activeItem.content_data as unknown as InteractiveActivityData}
                      onComplete={() => {
                        setCompletedActivityIds((prev) => {
                          const next = new Set(prev).add(activeItem.id);
                          if (next.size === interactiveContent.length) {
                            setTracker((p) => ({ ...p, activity: true }));
                          }
                          return next;
                        });
                      }}
                    />
                  </div>
                </CollapsibleCard>
              );
            })()}
            </div>

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
                    onClick={() => {
                      if (currentDbCheckpoint) {
                        handleCheckpointAcknowledge(currentDbCheckpoint);
                      } else {
                        const newSet = new Set(acknowledgedCheckpoints);
                        newSet.add(currentChunk);
                        setAcknowledgedCheckpoints(newSet);
                      }
                    }}
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
            </div>

            {/* ── PDF Resources ── */}
            <Dialog open={isResourcesOpen} onOpenChange={setIsResourcesOpen}>
                <DialogContent style={{ maxWidth: '1152px', width: '95vw' }} className="max-h-[85vh] overflow-y-auto p-0 sm:p-6 bg-gray-50 rounded-xl">
                <DialogTitle className="sr-only">Resources & Material</DialogTitle>
            {hasPdfAssets && (!effectiveFocusMode || currentFocusId === 'summary') && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Resources & Material</h2>
                    <p className="text-sm text-gray-500">{assets.length} items available for download</p>
                  </div>
                </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {assets.map((asset) => {
                    let Icon = FileText;
                    let bg = "bg-orange-100";
                    let text = "text-orange-700";
                    let desc = "Document";
                    if (asset.kind === 'image') { Icon = Image; bg = "bg-blue-100"; text = "text-blue-700"; desc = "Image file"; }
                    else if (asset.kind === 'video') { Icon = Video; bg = "bg-rose-100"; text = "text-rose-700"; desc = "Video file"; }
                    else if (asset.kind === 'link') { Icon = Link; bg = "bg-emerald-100"; text = "text-emerald-700"; desc = "External link"; }
                    else if (asset.kind === 'pdf') { desc = "PDF document"; }
                    const isPdf = asset.kind === 'pdf' || asset.url.toLowerCase().endsWith('.pdf');
                    const isPptx = asset.url.toLowerCase().endsWith('.pptx');
                    return (
                      <div key={asset.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${bg} ${text}`}>
                            <Icon className="w-6 h-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 mb-1 truncate">{asset.title || 'Untitled Asset'}</h3>
                            <p className="text-sm text-gray-500 mb-4">{desc}</p>
                            <div className="flex gap-2">
                              {(isPdf || isPptx) ? (
                                <Button variant="outline" size="sm" className="w-full" onClick={() => setViewingAsset(viewingAsset === asset.id ? null : asset.id)}>
                                  {viewingAsset === asset.id ? 'Close Viewer' : 'View Resource'}
                                </Button>
                              ) : (
                                <Button variant="outline" size="sm" className="w-full" onClick={() => window.open(asset.url, '_blank')}>
                                  {asset.kind === 'link' ? 'Open Link' : 'Open Resource'}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
              </DialogContent>
            </Dialog>

            {/* ── Quiz ── */}
            <div className={activePhase === 'quiz' ? 'block' : 'hidden'} data-guided-section="quiz">
              {!lesson.has_quiz || !quizData ? (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm mb-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <HelpCircle className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Quiz Available</h3>
                  <p className="text-gray-500">This lesson doesn&apos;t have a quiz. You can continue to the next lesson or review the material.</p>
                </div>
              ) : (
                (!effectiveFocusMode || currentFocusId === 'summary') && (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                        <HelpCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">Knowledge Check</h2>
                        <p className="text-sm text-gray-500">{quizData.questions.length} questions to test your understanding</p>
                      </div>
                    </div>
                    <QuizPage
                      key={quizResetKey}
                      lessonId={lessonId}
                      courseId={courseId}
                      onBack={() => {}}
                      onSubmit={handleQuizSubmit}
                      adaptiveLearningEnabled={!!lesson.adaptive_learning_enabled}
                      simplifiedSummary={lesson.simplified_summary}
                      onSuggestReview={() => {
                        contentTopRef.current?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      hideBackButton={true}
                    />
                  </div>
                )
              )}
            </div>

            {/* ── Chunk Navigation (bottom of content) ── */}
            {showChunkNav && !effectiveFocusMode && !isSlideMode && activePhase === 'content' && (
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
            <div className={activePhase === 'finish' ? 'block' : 'hidden'} data-guided-section="finish">
            {lesson.has_summary_activity && !lessonCompleted && (
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

            {!lessonCompleted && (
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
                <Button onClick={() => {
                  const needsVideo = lesson?.has_video !== false && !!lesson.video_url;
                  const needsActivities = interactiveContent.length > 0;
                  const needsQuiz = lesson.has_quiz && quizData;
                  const isAllCompleted = (!needsVideo || tracker.video) && (!needsActivities || tracker.activity) && (!needsQuiz || tracker.quiz) && tracker.scroll;
                  
                  if (isAllCompleted) {
                    handleCompleteLesson();
                  } else {
                    setShowChecklistPopup(true);
                  }
                }} className="bg-green-600 hover:bg-green-700 text-white" disabled={completing}>
                  {completing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  {completing ? 'Completing...' : 'Complete Lesson'}
                </Button>
              </Card>
            )}

            {lessonCompleted && (
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
                    <CelebrationAnimation animationLevel={settings.animation_level} />
                    <h2 className="text-2xl font-bold text-gray-900 mt-2">Lesson Complete!</h2>
                    <p className="text-sm text-green-700 mt-1">Great work! You can now proceed to the next lesson.</p>
                    {onNextLesson && lesson.sequence_order < lesson.total_lessons ? (
                      <Button onClick={onNextLesson} className="mt-4 bg-green-600 hover:bg-green-700 text-white">
                        {nextLessonTitle ? `Next: ${nextLessonTitle}` : 'Next Lesson'} <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    ) : (
                      <Button onClick={onBack} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white">
                        Back to Course <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    )}
                  </div>
                </Card>
              </motion.div>
            )}

            </div>

            {/* ── PHASE NAVIGATION ── */}
            {(() => {
              const currentPhaseIndex = lessonPhases.findIndex(p => p.id === activePhase);
              if (currentPhaseIndex === -1) return null;
              const prevPhase = currentPhaseIndex > 0 ? lessonPhases[currentPhaseIndex - 1] : null;
              const nextPhase = currentPhaseIndex < lessonPhases.length - 1 ? lessonPhases[currentPhaseIndex + 1] : null;

              if (!prevPhase && !nextPhase) return null;

              const currentPending = getPhasePending(activePhase);

              return (
                <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                  {prevPhase ? (
                    <Button onClick={() => {
                      setActivePhase(prevPhase.id as any);
                      document.getElementById('main-content')?.scrollTo({ top: 0, behavior: 'smooth' });
                    }} variant="outline" className="flex items-center gap-2">
                      <ChevronLeft className="w-4 h-4" /> Previous: {prevPhase.name}
                    </Button>
                  ) : <div />}
                  {nextPhase ? (
                    <Button onClick={() => {
                      if (currentPending.length > 0) {
                        toast.warning(`Complete "${currentPending.join(', ')}" before proceeding`);
                      }
                      setActivePhase(nextPhase.id as any);
                      document.getElementById('main-content')?.scrollTo({ top: 0, behavior: 'smooth' });
                    }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                      {currentPending.length > 0 ? (
                        <><AlertTriangle className="w-4 h-4" /> {currentPending.length} pending — Next: {nextPhase.name}</>
                      ) : (
                        <>Next: {nextPhase.name} <ChevronRight className="w-4 h-4" /></>
                      )}
                    </Button>
                  ) : <div />}
                </div>
              );
            })()}

            {/* ── DISCUSSION TAB ── */}
            {lesson.allow_discussions && (
              <Dialog open={isDiscussionOpen} onOpenChange={setIsDiscussionOpen}>
              <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-0 sm:p-6 bg-gray-50">
                  <DialogTitle className="sr-only">Class Discussion</DialogTitle>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <MessageSquare className="w-6 h-6 text-blue-600" />
                    Class Discussion
                  </h2>
                  <LessonDiscussion lessonId={lesson.id} />
                </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
      </div>

      {!effectiveFocusMode && (
        <div className={`${contentContainerClass} mx-auto px-6 pb-8 bottom-lesson-nav`}>
          <div className="mt-8 flex items-center justify-between gap-4">
            <Button
              onClick={onPreviousLesson}
              variant="outline"
              className="previous-btn px-8 py-6 text-lg"
              disabled={lesson.sequence_order <= 1 && !onPreviousLesson}
            >
              <ChevronLeft className="w-5 h-5 mr-2" />
              Previous Lesson
            </Button>

            <Button
              onClick={() => {
                if (!lessonCompleted) {
                  const needsVideo = lesson?.has_video !== false && !!lesson.video_url;
                  const needsActivities = interactiveContent.length > 0;
                  const needsQuiz = lesson.has_quiz && quizData;
                  const isAllCompleted = (!needsVideo || tracker.video) && (!needsActivities || tracker.activity) && (!needsQuiz || tracker.quiz) && tracker.scroll;
                  
                  if (isAllCompleted && !lesson.has_summary_activity) {
                    handleCompleteLesson();
                  } else if (isAllCompleted && lesson.has_summary_activity) {
                    setActivePhase('finish');
                    document.getElementById('main-content')?.scrollTo({ top: 0, behavior: 'smooth' });
                  } else {
                    setShowChecklistPopup(true);
                  }
                } else {
                  if (onNextLesson) onNextLesson();
                  else router.push(`/learner/courses/${courseId}`);
                }
              }}
              className="simplifiable bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg"
            >
              {onNextLesson && lesson.sequence_order < lesson.total_lessons ? 'Next Lesson' : 'Back to Course'} <ChevronRight className="w-5 h-5 ml-2" />
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
          setIsQuizOpen(false);
        }}
      />

      <AnimatePresence>
        {showHelperSidebar && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHelperSidebar(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-80 bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200"
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <List className="w-5 h-5 text-indigo-600" />
                  Course Outline
                </h3>
                <button onClick={() => setShowHelperSidebar(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {courseModules.map((module, i) => (
                  <div key={module.id || `other-${i}`}>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5" />
                      {module.title}
                    </h4>
                    <div className="space-y-1">
                      {module.lessons.map((l) => {
                        const isCurrent = l.id === lessonId;
                        const isDone = completedLessonIds.has(l.id);
                        return (
                          <button
                            key={l.id}
                            onClick={() => {
                              setShowHelperSidebar(false);
                              if (!isCurrent) {
                                router.push(`/learner/lesson/${l.id}?courseId=${courseId}${isPreview ? '&preview=true' : ''}`);
                              }
                            }}
                            className={`flex items-start gap-2 p-2 rounded-lg text-sm transition-colors text-left w-full ${
                              isCurrent ? 'bg-indigo-50 border border-indigo-100 cursor-default' : 'hover:bg-gray-50 border border-transparent cursor-pointer'
                            }`}
                          >
                            <div className="mt-0.5 shrink-0">
                              {isDone ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              ) : (
                                <div className={`w-4 h-4 rounded-full border-2 ${isCurrent ? 'border-indigo-400' : 'border-gray-300'}`} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`font-medium truncate ${isCurrent ? 'text-indigo-900' : 'text-gray-700'}`}>
                                {l.sequence_order}. {l.title}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <Dialog open={!!viewingAsset} onOpenChange={(open) => !open && setViewingAsset(null)}>
        <DialogContent style={{ maxWidth: '1400px', width: '90vw', height: '90vh' }} className="p-0 overflow-hidden flex flex-col bg-gray-50 rounded-xl">
          <div className="flex items-center justify-between p-4 border-b bg-white">
            <DialogTitle className="text-lg font-semibold text-gray-900">
              {assets.find(a => a.id === viewingAsset)?.title || 'View Resource'}
            </DialogTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => {
                const asset = assets.find(a => a.id === viewingAsset);
                if (asset) window.open(asset.url, '_blank');
              }}>
                Open in New Tab
              </Button>
            </div>
          </div>
          <div className="flex-1 w-full h-full relative">
            {assets.find(a => a.id === viewingAsset) && (() => {
              const asset = assets.find(a => a.id === viewingAsset)!;
              const isPdf = asset.url.toLowerCase().includes('.pdf');
              if (isPdf) {
                return (
                  <object data={asset.url} type="application/pdf" className="w-full h-full absolute inset-0">
                    <iframe src={asset.url} className="w-full h-full border-0 absolute inset-0">
                      This browser does not support PDFs. Please download the PDF to view it.
                    </iframe>
                  </object>
                );
              } else {
                return (
                  <iframe src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(asset.url)}`} className="w-full h-full border-0 absolute inset-0" />
                );
              }
            })()}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showChecklistPopup} onOpenChange={setShowChecklistPopup}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogTitle className="text-xl font-bold mb-4 text-center">Incomplete Tasks</DialogTitle>
          <DialogDescription className="text-gray-600 text-center mb-6">
            You must complete all required actions before marking this lesson as complete.
          </DialogDescription>
          <div className="space-y-3 mb-6">
            {(lesson?.video_url && lesson?.has_video !== false) ? (
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Watch Video</span>
                {tracker.video ? <CheckCircle className="w-5 h-5 text-green-500" /> : <span className="text-red-500 text-sm font-semibold">Not Done</span>}
              </div>
            ) : null}
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-700">Scroll through lesson content</span>
              {tracker.scroll ? <CheckCircle className="w-5 h-5 text-green-500" /> : <span className="text-red-500 text-sm font-semibold">Not Done</span>}
            </div>
            {(interactiveContent.length > 0) ? (
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Complete Interactive Activities</span>
                {tracker.activity ? <CheckCircle className="w-5 h-5 text-green-500" /> : <span className="text-red-500 text-sm font-semibold">Not Done</span>}
              </div>
            ) : null}
            {(lesson?.has_quiz && quizData) ? (
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Pass Quiz</span>
                {tracker.quiz ? <CheckCircle className="w-5 h-5 text-green-500" /> : <span className="text-red-500 text-sm font-semibold">Not Done</span>}
              </div>
            ) : null}
          </div>
          <div className="flex justify-center">
            <Button onClick={() => setShowChecklistPopup(false)}>Got it</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCompletionPopup} onOpenChange={setShowCompletionPopup}>
        <DialogContent className="sm:max-w-md text-center p-6">
          <CelebrationAnimation />
          <DialogTitle className="text-2xl font-bold mt-4">You&apos;re All Done!</DialogTitle>
          <DialogDescription className="text-gray-600 mt-2">
            You&apos;ve completed all required activities for this lesson. Would you like to mark it as complete and move on?
          </DialogDescription>
          <div className="flex gap-3 justify-center mt-6">
            <Button variant="outline" onClick={() => { setShowCompletionPopup(false); setHasDismissedCompletionPopup(true); }}>Stay Here</Button>
            <Button onClick={() => { setShowCompletionPopup(false); setHasDismissedCompletionPopup(true); handleCompleteLesson(); }} className="bg-green-600 hover:bg-green-700" disabled={completing}>
              {completing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {completing ? 'Completing...' : 'Mark as Complete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>


    </div>
  );
}
