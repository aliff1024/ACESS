'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, BookOpen, Users, CheckCircle, Clock, AlertCircle,
  XCircle, Award, Shield, Eye, FileText, Video, HelpCircle,
  Sparkles, ExternalLink, Calendar, User, Tag, Layers,
  CheckCircle2, Volume2, VolumeX, AlignLeft, Target, Loader2,
  Play, Download, ListChecks, CheckSquare, MessageSquare,
  HelpCircle as QuestionIcon, FileCode, Check, Copy
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import ApprovalModal from './ApprovalModal';
import RejectionModal from './RejectionModal';
import { ConfirmAction } from '../ui/ConfirmAction';
import { toast } from 'sonner';
import { formatDuration } from '@/lib/admin-api';

interface LessonAsset {
  id: string;
  file_name: string;
  file_url: string;
  asset_type: string;
  file_size?: number;
}

interface InteractiveItem {
  id: string;
  title: string;
  content_type: string;
  data: any;
}

interface VideoQuestion {
  id: string;
  timestamp_seconds: number;
  question_text: string;
  options?: string[];
}

interface Checkpoint {
  id: string;
  title: string;
  description?: string;
  sequence_order: number;
}

interface LessonDetail {
  id: string;
  title: string;
  sequence_order: number;
  status: string;
  lesson_type: string;
  estimated_duration?: number | null;
  video_url?: string | null;
  content_html?: string | null;
  transcript?: string | null;
  simplified_summary?: string | null;
  focus_mode_enabled: boolean;
  chunked_content_enabled: boolean;
  has_video: boolean;
  has_pdf: boolean;
  has_quiz: boolean;
  assets?: LessonAsset[];
  assets_count?: number;
  interactive_items?: InteractiveItem[];
  video_questions?: VideoQuestion[];
  checkpoints?: Checkpoint[];
  quiz?: {
    id: string;
    title: string;
    passing_score: number;
    question_count: number;
    questions?: Array<{
      id: string;
      question: string;
      question_type: string;
      explanation?: string;
      options?: Array<{ id: string; option_text: string; is_correct: boolean }>;
    }>;
  } | null;
}

interface CourseData {
  id: string;
  title: string;
  description: string;
  status: string;
  course_type: string;
  difficulty_level: string;
  category: string;
  thumbnail_url?: string | null;
  created_at: string;
  updated_at: string;
  published_at?: string | null;
  certificate_enabled: boolean;
  created_by: string;
  primary_disability_focus?: string | null;
  secondary_disability_focuses?: string[] | null;
  target_reading_age?: string | null;
  supports_tts?: boolean;
  supports_transcripts?: boolean;
  supports_focus_mode?: boolean;
  supports_chunked_learning?: boolean;
  creator?: {
    id: string;
    full_name?: string;
    email?: string;
  } | null;
}

interface StudentItem {
  enrollmentId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  enrolledAt: string;
  status: string;
  completedLessons: number;
  totalLessons: number;
  progressPercent: number;
  hasCertificate: boolean;
  lastActive: string;
  avgScore: number;
}

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

export default function AdminCourseDetail({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [course, setCourse] = useState<CourseData | null>(null);
  const [lessons, setLessons] = useState<LessonDetail[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [stats, setStats] = useState<{
    totalEnrollments: number;
    completedEnrollments: number;
    completionRate: number;
    certificatesIssued: number;
    totalLessons: number;
    publishedLessons: number;
  } | null>(null);

  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'lessons' | 'accessibility' | 'students'>('overview');

  // Inspection Modal States
  const [inspectingLesson, setInspectingLesson] = useState<LessonDetail | null>(null);
  const [inspectionTab, setInspectionTab] = useState<'canvas' | 'easy_read' | 'transcript' | 'quiz' | 'assets'>('canvas');
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);

  // Moderation Modals
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadCourseData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load course details');

      setCourse(data.course);
      setLessons(data.lessons || []);
      setCategories(data.categories || []);
      setStats(data.stats || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  const loadStudents = useCallback(async () => {
    setLoadingStudents(true);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/students`);
      const data = await res.json();
      if (res.ok && data.students) {
        setStudents(data.students);
      }
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setLoadingStudents(false);
    }
  }, [courseId]);

  useEffect(() => {
    loadCourseData();
  }, [loadCourseData]);

  useEffect(() => {
    if (activeTab === 'students') {
      loadStudents();
    }
  }, [activeTab, loadStudents]);

  // Handle SpeechSynthesis TTS
  const handleToggleTTS = (textToSpeak: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      toast.error('Text-to-speech is not supported by your browser.');
      return;
    }

    if (isPlayingTTS) {
      window.speechSynthesis.cancel();
      setIsPlayingTTS(false);
    } else {
      window.speechSynthesis.cancel();
      const clean = textToSpeak.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      if (!clean) {
        toast.info('No readable text found for audio narration.');
        return;
      }
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.onend = () => setIsPlayingTTS(false);
      utterance.onerror = () => setIsPlayingTTS(false);
      window.speechSynthesis.speak(utterance);
      setIsPlayingTTS(true);
    }
  };

  // Stop speech synthesis when closing inspection modal
  useEffect(() => {
    if (!inspectingLesson && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlayingTTS(false);
    }
  }, [inspectingLesson]);

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'published' }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to approve course');
      }
      toast.success('Course approved and published successfully');
      setShowApprovalModal(false);
      loadCourseData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve course');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (targetId: string, reason: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/courses/${targetId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'draft', reason }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to reject course');
      }
      toast.success('Course returned to draft with feedback');
      setShowRejectionModal(false);
      loadCourseData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject course');
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchive = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archived' }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to archive course');
      }
      toast.success('Course archived successfully');
      setShowArchiveConfirm(false);
      loadCourseData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to archive course');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        <span className="text-xs text-gray-500 font-medium">Loading course inspection data...</span>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="p-12 text-center max-w-lg mx-auto">
        <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-gray-900">
          {error === 'Course not found' ? 'Course Not Found' : 'Failed to Load Course'}
        </h2>
        {error && error !== 'Course not found' && <p className="mt-1 text-xs text-gray-500">{error}</p>}
        <Button onClick={() => router.push('/admin/courses')} className="mt-4" variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Course Directory
        </Button>
      </div>
    );
  }

  const isSystemCourse = course.course_type === 'system';
  const isPendingReview = course.status === 'pending_review';

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Oversight Banner & Live Student Preview Launcher */}
      <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border border-purple-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-purple-950">Administrative Course Oversight</h4>
            <p className="text-xs text-purple-700/90 mt-0.5">
              {isSystemCourse
                ? 'Official System Course — Platform-managed reference course.'
                : 'Educator-Owned Course — Quality review and learner experience inspection.'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Live Student Experience Preview Button */}
          <Button
            size="sm"
            onClick={() =>
              router.push(
                `/educator/preview/course/${courseId}?returnTo=${encodeURIComponent(`/admin/courses/${courseId}`)}`
              )
            }
            className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-8 gap-1.5 shadow-xs"
          >
            <Eye className="w-3.5 h-3.5" /> Preview Course as Student
          </Button>

          {isPendingReview && (
            <>
              <Button
                size="sm"
                onClick={() => setShowApprovalModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white text-xs h-8 gap-1.5 shadow-xs"
              >
                <CheckCircle className="w-3.5 h-3.5" /> Approve & Publish
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowRejectionModal(true)}
                className="border-red-300 text-red-700 hover:bg-red-50 text-xs h-8 gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" /> Return to Draft
              </Button>
            </>
          )}
          {course.status === 'published' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowArchiveConfirm(true)}
              className="border-gray-300 text-gray-700 hover:bg-gray-50 text-xs h-8 gap-1.5"
            >
              Archive Course
            </Button>
          )}
        </div>
      </div>

      {/* Course Header Card */}
      <Card className="p-6 rounded-2xl border-0 shadow-sm ring-1 ring-gray-200 bg-white">
        <div className="flex flex-col md:flex-row items-start gap-6">
          <button
            onClick={() => router.push('/admin/courses')}
            aria-label="Back to course management"
            className="rounded-xl p-2.5 transition-colors hover:bg-gray-100 text-gray-600 shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          {/* Thumbnail */}
          <div className="w-full md:w-56 h-36 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden shrink-0 shadow-xs flex items-center justify-center">
            {course.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
            ) : (
              <div className="text-center p-4">
                <BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-1" />
                <span className="text-[11px] text-gray-400 font-medium">No Thumbnail</span>
              </div>
            )}
          </div>

          {/* Course Details */}
          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{course.title}</h1>
                <Badge
                  className={`border text-xs capitalize ${
                    course.status === 'published'
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : course.status === 'pending_review'
                      ? 'bg-amber-50 text-amber-700 border-amber-200 font-semibold'
                      : course.status === 'archived'
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : 'bg-gray-100 text-gray-700 border-gray-200'
                  }`}
                >
                  {course.status.replace('_', ' ')}
                </Badge>
                <Badge className="bg-purple-50 text-purple-800 border-purple-200 text-xs">
                  {isSystemCourse ? 'Official Course' : 'Educator Course'}
                </Badge>
              </div>
              <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                {course.description || 'No course description provided.'}
              </p>
            </div>

            {/* Metadata Tags */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 pt-1">
              <div className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-blue-500" />
                <span className="font-semibold text-gray-700">{course.category || 'General'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                <span className="capitalize font-semibold text-gray-700">{course.difficulty_level || 'All Levels'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                <span>Created {new Date(course.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Creator Card */}
            {course.creator && (
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <User className="w-3.5 h-3.5 text-teal-600" />
                  <span className="text-gray-500">Author:</span>
                  <strong className="text-gray-900">{course.creator.full_name || course.creator.email}</strong>
                  <span className="text-gray-400">({course.creator.email})</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => router.push(`/admin/users/${course.creator?.id}`)}
                  className="text-xs text-purple-700 hover:text-purple-900 hover:bg-purple-50 h-7 px-2.5 gap-1"
                >
                  <ExternalLink className="w-3 h-3" /> View Educator Profile
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 p-1.5 bg-gray-100/90 rounded-2xl w-fit border border-gray-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'overview'
              ? 'bg-white text-purple-900 shadow-sm ring-1 ring-black/5'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-purple-600" />
          Overview & Metrics
        </button>

        <button
          onClick={() => setActiveTab('lessons')}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'lessons'
              ? 'bg-white text-purple-900 shadow-sm ring-1 ring-black/5'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-blue-600" />
          Lessons Inspection ({lessons.length})
        </button>

        <button
          onClick={() => setActiveTab('accessibility')}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'accessibility'
              ? 'bg-white text-purple-900 shadow-sm ring-1 ring-black/5'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-teal-600" />
          Accessibility Profile
        </button>

        <button
          onClick={() => setActiveTab('students')}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'students'
              ? 'bg-white text-purple-900 shadow-sm ring-1 ring-black/5'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-indigo-600" />
          Enrolled Learners ({stats?.totalEnrollments || 0})
        </button>
      </div>

      {/* TAB 1: OVERVIEW & METRICS */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Key Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-4 rounded-xl border-0 shadow-sm ring-1 ring-gray-200 bg-white">
              <span className="text-[11px] font-semibold text-gray-400 uppercase">Enrolled Students</span>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.totalEnrollments ?? 0}</p>
              <span className="text-[11px] text-gray-500">Total learners</span>
            </Card>

            <Card className="p-4 rounded-xl border-0 shadow-sm ring-1 ring-green-200 bg-green-50/40">
              <span className="text-[11px] font-semibold text-green-800 uppercase">Completed Course</span>
              <p className="text-2xl font-bold text-green-700 mt-1">{stats?.completedEnrollments ?? 0}</p>
              <span className="text-[11px] text-green-700">{stats?.completionRate ?? 0}% completion rate</span>
            </Card>

            <Card className="p-4 rounded-xl border-0 shadow-sm ring-1 ring-blue-200 bg-blue-50/40">
              <span className="text-[11px] font-semibold text-blue-800 uppercase">Published Lessons</span>
              <p className="text-2xl font-bold text-blue-700 mt-1">{stats?.publishedLessons ?? 0}</p>
              <span className="text-[11px] text-blue-700">of {stats?.totalLessons ?? 0} total</span>
            </Card>

            <Card className="p-4 rounded-xl border-0 shadow-sm ring-1 ring-purple-200 bg-purple-50/40">
              <span className="text-[11px] font-semibold text-purple-800 uppercase">Certificates Issued</span>
              <p className="text-2xl font-bold text-purple-700 mt-1">{stats?.certificatesIssued ?? 0}</p>
              <span className="text-[11px] text-purple-700">Verified credentials</span>
            </Card>
          </div>

          {/* Details & Target Audience */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6 rounded-2xl border-0 shadow-sm ring-1 ring-gray-200 bg-white space-y-4">
              <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600" /> Course Description & Syllabus
              </h3>
              <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                {course.description || 'No full description provided.'}
              </p>

              {course.target_reading_age && (
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="text-gray-500 font-medium">Target Reading Age:</span>
                  <strong className="text-purple-700">{course.target_reading_age}</strong>
                </div>
              )}
            </Card>

            <Card className="p-6 rounded-2xl border-0 shadow-sm ring-1 ring-gray-200 bg-white space-y-4">
              <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-600" /> Certification & Credential Status
              </h3>
              <div className="space-y-3 text-xs text-gray-700">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <span className="text-gray-500">Unique Certificate:</span>
                  <Badge className={course.certificate_enabled ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600'}>
                    {course.certificate_enabled ? 'ENABLED' : 'SYSTEM ONLY'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <span className="text-gray-500">Publication Date:</span>
                  <strong className="text-gray-900">
                    {course.published_at ? new Date(course.published_at).toLocaleDateString() : 'Not published'}
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Last Modified:</span>
                  <strong className="text-gray-900">
                    {new Date(course.updated_at).toLocaleDateString()}
                  </strong>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: LESSONS INSPECTION */}
      {activeTab === 'lessons' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <Card className="border-0 shadow-sm ring-1 ring-gray-200 rounded-2xl overflow-hidden bg-white">
            <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Course Lessons Roster</h3>
                <p className="text-xs text-gray-500">
                  Inspect student content, video lectures, transcripts, and quizzes. Click any lesson to view full details.
                </p>
              </div>
              <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-xs w-fit">
                {lessons.length} Lesson{lessons.length === 1 ? '' : 's'}
              </Badge>
            </div>

            <div className="divide-y divide-gray-100">
              {lessons.map((l, idx) => (
                <div
                  key={l.id}
                  className="p-4.5 hover:bg-purple-50/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                >
                  <div
                    className="flex items-center gap-4 min-w-0 flex-1 cursor-pointer"
                    onClick={() => {
                      setInspectingLesson(l);
                      setInspectionTab('canvas');
                    }}
                  >
                    <div className="w-8 h-8 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs flex items-center justify-center shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-xs group-hover:text-purple-700 transition-colors truncate">
                        {l.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <Badge
                          className={`border text-[10px] capitalize ${
                            l.status === 'published'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {l.status}
                        </Badge>
                        {l.estimated_duration && (
                          <span className="text-[11px] text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {formatDuration((l.estimated_duration || 0) * 60)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Feature Badges & Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {l.has_video && (
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-semibold flex items-center gap-1 border border-blue-100">
                        <Video className="w-3 h-3" /> Video
                      </span>
                    )}
                    {l.transcript && (
                      <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 text-[10px] font-semibold flex items-center gap-1 border border-teal-100">
                        <Volume2 className="w-3 h-3" /> Transcript
                      </span>
                    )}
                    {l.simplified_summary && (
                      <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-semibold flex items-center gap-1 border border-purple-100">
                        <AlignLeft className="w-3 h-3" /> Easy Read
                      </span>
                    )}
                    {l.has_quiz && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[10px] font-semibold flex items-center gap-1 border border-amber-200">
                        <HelpCircle className="w-3 h-3" /> Quiz ({l.quiz?.question_count || 0})
                      </span>
                    )}
                    {l.assets_count > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[10px] font-semibold flex items-center gap-1 border border-gray-200">
                        <Download className="w-3 h-3" /> {l.assets_count} PDF/File
                      </span>
                    )}

                    {/* Direct Launch Student View */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        router.push(
                          `/educator/preview/lesson/${l.id}?courseId=${courseId}&returnTo=${encodeURIComponent(
                            `/admin/courses/${courseId}`
                          )}`
                        )
                      }
                      className="text-xs text-purple-700 border-purple-200 hover:bg-purple-50 h-7 px-2.5 gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" /> Student View
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setInspectingLesson(l);
                        setInspectionTab('canvas');
                      }}
                      className="text-xs text-gray-700 h-7 px-2 gap-1 group-hover:bg-white"
                    >
                      Inspect Details
                    </Button>
                  </div>
                </div>
              ))}

              {lessons.length === 0 && (
                <div className="p-12 text-center">
                  <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-500 font-medium">No lessons created for this course yet.</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: ACCESSIBILITY PROFILE */}
      {activeTab === 'accessibility' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-150">
          <Card className="p-6 rounded-2xl border-0 shadow-sm ring-1 ring-gray-200 bg-white space-y-4">
            <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider flex items-center gap-2">
              <Target className="w-4 h-4 text-teal-600" /> Disability Focus & Accommodations
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-100">
                <span className="text-[10px] font-semibold text-teal-800 uppercase block">Primary Disability Focus</span>
                <p className="text-sm font-bold text-teal-950 capitalize mt-0.5">
                  {course.primary_disability_focus || 'Universal / All Learners'}
                </p>
              </div>

              {course.secondary_disability_focuses && course.secondary_disability_focuses.length > 0 && (
                <div>
                  <span className="text-gray-400 block uppercase text-[10px] font-semibold mb-1.5">Secondary Focuses</span>
                  <div className="flex flex-wrap gap-1.5">
                    {course.secondary_disability_focuses.map((f) => (
                      <Badge key={f} variant="outline" className="text-xs bg-gray-50 text-gray-700 capitalize">
                        {f}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {categories.length > 0 && (
                <div className="pt-3 border-t border-gray-100">
                  <span className="text-gray-400 block uppercase text-[10px] font-semibold mb-1.5">Accessibility Tags</span>
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map((c) => (
                      <Badge key={c} className="bg-purple-100 text-purple-800 border-0 text-xs">
                        {c}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6 rounded-2xl border-0 shadow-sm ring-1 ring-gray-200 bg-white space-y-4">
            <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" /> Platform Adaptive Feature Support
            </h3>

            <div className="divide-y divide-gray-100 text-xs">
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-gray-700">Text-to-Speech (TTS)</span>
                <Badge className={course.supports_tts !== false ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}>
                  {course.supports_tts !== false ? 'SUPPORTED' : 'UNAVAILABLE'}
                </Badge>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-gray-700">Audio & Video Transcripts</span>
                <Badge className={course.supports_transcripts !== false ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}>
                  {course.supports_transcripts !== false ? 'SUPPORTED' : 'UNAVAILABLE'}
                </Badge>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-gray-700">Focus Mode & High Contrast</span>
                <Badge className={course.supports_focus_mode !== false ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}>
                  {course.supports_focus_mode !== false ? 'SUPPORTED' : 'UNAVAILABLE'}
                </Badge>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-gray-700">Chunked Learning Mode</span>
                <Badge className={course.supports_chunked_learning !== false ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}>
                  {course.supports_chunked_learning !== false ? 'SUPPORTED' : 'UNAVAILABLE'}
                </Badge>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: ENROLLED STUDENTS */}
      {activeTab === 'students' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <Card className="border-0 shadow-sm ring-1 ring-gray-200 rounded-2xl overflow-hidden bg-white">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Enrolled Student Roster</h3>
                <p className="text-xs text-gray-500">Live progress tracking and outcomes for learners enrolled in this course.</p>
              </div>
              <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                {students.length} Student{students.length === 1 ? '' : 's'}
              </Badge>
            </div>

            {loadingStudents ? (
              <div className="p-12 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-purple-600 mx-auto mb-2" />
                <p className="text-xs text-gray-500">Loading student roster...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-200 font-semibold text-gray-500 uppercase">
                    <tr>
                      <th className="px-5 py-3">Learner</th>
                      <th className="px-5 py-3">Enrolled</th>
                      <th className="px-5 py-3">Progress</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Outcome</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {students.map((s) => (
                      <tr key={s.enrollmentId} className="hover:bg-gray-50/60">
                        <td className="px-5 py-3.5">
                          <p className="font-semibold text-gray-900">{s.studentName}</p>
                          <p className="text-[11px] text-gray-500">{s.studentEmail}</p>
                        </td>
                        <td className="px-5 py-3.5 text-gray-500">
                          {new Date(s.enrolledAt).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900 w-8">{s.progressPercent}%</span>
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
                              <div className="h-full rounded-full bg-blue-600" style={{ width: `${s.progressPercent}%` }} />
                            </div>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {s.completedLessons} of {s.totalLessons} lessons
                          </p>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge
                            className={`border text-[10px] capitalize ${
                              s.status === 'at_risk'
                                ? 'bg-red-50 text-red-700 border-red-200 font-semibold'
                                : s.status === 'stalled'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-green-50 text-green-700 border-green-200'
                            }`}
                          >
                            {s.status.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {s.hasCertificate ? (
                            <Badge className="bg-purple-50 text-purple-700 border border-purple-200 text-[10px]">
                              <Award className="w-3 h-3 mr-1" /> Certified
                            </Badge>
                          ) : (
                            <span className="text-[11px] text-gray-400">In progress</span>
                          )}
                        </td>
                      </tr>
                    ))}

                    {students.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-12 text-center text-xs text-gray-500">
                          No students enrolled in this course yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* FULL STUDENT-FIDELITY LESSON INSPECTION MODAL */}
      <Dialog open={!!inspectingLesson} onOpenChange={(o) => !o && setInspectingLesson(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Badge className="bg-purple-100 text-purple-800 border-0 text-[10px] font-bold">
                  STUDENT CONTENT FIDELITY
                </Badge>
                <span className="text-xs text-gray-400 font-medium">Lesson #{inspectingLesson?.sequence_order}</span>
              </div>

              {/* Direct Full-Screen Preview Launcher */}
              {inspectingLesson && (
                <Button
                  size="sm"
                  onClick={() => {
                    setInspectingLesson(null);
                    router.push(
                      `/educator/preview/lesson/${inspectingLesson.id}?courseId=${courseId}&returnTo=${encodeURIComponent(
                        `/admin/courses/${courseId}`
                      )}`
                    );
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-7 gap-1.5 shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Launch Live Student Player
                </Button>
              )}
            </div>

            <DialogTitle className="text-xl font-bold text-gray-900 mt-2">
              {inspectingLesson?.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Complete student-facing multimedia, structured content canvas, easy read summaries, and interactive quizzes.
            </DialogDescription>
          </DialogHeader>

          {inspectingLesson && (
            <div className="space-y-5 pt-2">
              {/* Inspection Sub-Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl w-fit text-xs border border-gray-200">
                <button
                  onClick={() => setInspectionTab('canvas')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                    inspectionTab === 'canvas' ? 'bg-white text-purple-900 shadow-xs font-semibold' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                  Lesson Canvas & Media
                </button>

                {inspectingLesson.simplified_summary && (
                  <button
                    onClick={() => setInspectionTab('easy_read')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                      inspectionTab === 'easy_read' ? 'bg-white text-purple-900 shadow-xs font-semibold' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <AlignLeft className="w-3.5 h-3.5 text-purple-600" />
                    Easy Read Summary
                  </button>
                )}

                {inspectingLesson.transcript && (
                  <button
                    onClick={() => setInspectionTab('transcript')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                      inspectionTab === 'transcript' ? 'bg-white text-purple-900 shadow-xs font-semibold' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Volume2 className="w-3.5 h-3.5 text-teal-600" />
                    Transcript
                  </button>
                )}

                {inspectingLesson.quiz && (
                  <button
                    onClick={() => setInspectionTab('quiz')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                      inspectionTab === 'quiz' ? 'bg-white text-purple-900 shadow-xs font-semibold' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                    Quiz Assessment ({inspectingLesson.quiz.question_count})
                  </button>
                )}

                {(inspectingLesson.assets?.length ?? 0) > 0 && (
                  <button
                    onClick={() => setInspectionTab('assets')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                      inspectionTab === 'assets' ? 'bg-white text-purple-900 shadow-xs font-semibold' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-600" />
                    Attached Files ({inspectingLesson.assets?.length})
                  </button>
                )}
              </div>

              {/* TAB A: LESSON CANVAS & MULTIMEDIA */}
              {inspectionTab === 'canvas' && (
                <div className="space-y-5 text-xs animate-in fade-in duration-150">
                  {/* Embedded Video Player */}
                  {inspectingLesson.video_url && (() => {
                    const ytId = getYouTubeId(inspectingLesson.video_url);
                    return (
                      <div className="rounded-2xl border border-gray-200 overflow-hidden bg-black shadow-xs">
                        <div className="p-3 bg-gray-900 text-white flex items-center justify-between text-xs">
                          <span className="font-semibold flex items-center gap-2">
                            <Video className="w-4 h-4 text-blue-400" /> Embedded Video Lecture
                          </span>
                          <span className="text-[11px] text-gray-400 font-mono">{inspectingLesson.video_url}</span>
                        </div>

                        <div className="relative aspect-video w-full bg-black flex items-center justify-center">
                          {ytId ? (
                            <iframe
                              src={`https://www.youtube-nocookie.com/embed/${ytId}?rel=0&modestbranding=1`}
                              title={inspectingLesson.title}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              className="w-full h-full border-0"
                            />
                          ) : (
                            <video
                              src={inspectingLesson.video_url}
                              controls
                              className="w-full h-full object-contain"
                            >
                              Your browser does not support HTML5 video.
                            </video>
                          )}
                        </div>

                        {/* Interactive Video Questions Timeline */}
                        {inspectingLesson.video_questions && inspectingLesson.video_questions.length > 0 && (
                          <div className="p-3 bg-gray-900/90 border-t border-gray-800 text-white">
                            <span className="text-[10px] font-semibold uppercase text-purple-300 block mb-1">
                              Interactive Video Checkpoint Questions ({inspectingLesson.video_questions.length})
                            </span>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {inspectingLesson.video_questions.map((vq, idx) => (
                                <div key={vq.id} className="p-2 bg-gray-800 rounded-lg text-[11px] border border-gray-700">
                                  <span className="text-purple-400 font-mono">@{Math.floor(vq.timestamp_seconds / 60)}:{(vq.timestamp_seconds % 60).toString().padStart(2, '0')}</span>
                                  <p className="text-gray-200 mt-0.5">{vq.question_text}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Audio TTS Player Bar */}
                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 p-3 rounded-2xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-xs">
                        <Volume2 className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-xs">Audio Narration (Text-to-Speech)</p>
                        <p className="text-[11px] text-gray-500">Listen to this lesson as students experience with TTS enabled.</p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleToggleTTS(inspectingLesson.content_html || inspectingLesson.simplified_summary || '')}
                      className={isPlayingTTS ? 'bg-red-600 hover:bg-red-700 text-white text-xs h-8 gap-1.5' : 'bg-purple-600 hover:bg-purple-700 text-white text-xs h-8 gap-1.5'}
                    >
                      {isPlayingTTS ? (
                        <>
                          <VolumeX className="w-3.5 h-3.5" /> Stop Audio
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" /> Play Narration
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Student Content Canvas */}
                  <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                      <span className="font-bold text-gray-900 text-xs uppercase tracking-wider flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" /> Student Lesson Canvas
                      </span>
                      {inspectingLesson.estimated_duration && (
                        <span className="text-[11px] text-gray-500 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-400" /> ~{inspectingLesson.estimated_duration} min reading time
                        </span>
                      )}
                    </div>

                    {inspectingLesson.content_html ? (
                      <div
                        className="prose prose-purple max-w-none text-gray-800 text-xs leading-relaxed space-y-3"
                        dangerouslySetInnerHTML={{ __html: inspectingLesson.content_html }}
                      />
                    ) : (
                      <p className="text-xs text-gray-400 italic py-4">No text content in this lesson.</p>
                    )}
                  </div>

                  {/* Checkpoints */}
                  {inspectingLesson.checkpoints && inspectingLesson.checkpoints.length > 0 && (
                    <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/40 space-y-2">
                      <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                        <ListChecks className="w-4 h-4 text-amber-700" /> Learning Checkpoints & Tasks
                      </span>
                      <div className="space-y-1.5 pt-1">
                        {inspectingLesson.checkpoints.map((cp, cpIdx) => (
                          <div key={cp.id} className="flex items-start gap-2 text-xs">
                            <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                              {cpIdx + 1}
                            </span>
                            <div>
                              <strong className="text-gray-900">{cp.title}</strong>
                              {cp.description && <p className="text-gray-600 text-[11px] mt-0.5">{cp.description}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB B: EASY READ SUMMARY */}
              {inspectionTab === 'easy_read' && (
                <div className="space-y-4 animate-in fade-in duration-150 text-xs">
                  <div className="p-5 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-purple-950 uppercase tracking-wider text-xs flex items-center gap-2">
                        <AlignLeft className="w-4 h-4 text-purple-700" /> Easy Read / Simplified Summary
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleTTS(inspectingLesson.simplified_summary || '')}
                        className="text-xs h-7 gap-1 border-purple-300 text-purple-800 hover:bg-purple-100"
                      >
                        <Volume2 className="w-3 h-3" /> Read Aloud
                      </Button>
                    </div>

                    <p className="text-xs text-purple-950 leading-relaxed whitespace-pre-wrap font-medium">
                      {inspectingLesson.simplified_summary}
                    </p>
                  </div>
                </div>
              )}

              {/* TAB C: TRANSCRIPT */}
              {inspectionTab === 'transcript' && (
                <div className="space-y-4 animate-in fade-in duration-150 text-xs">
                  <div className="p-5 rounded-2xl bg-teal-50/60 border border-teal-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-teal-950 uppercase tracking-wider text-xs flex items-center gap-2">
                        <Volume2 className="w-4 h-4 text-teal-700" /> Full Audio/Video Transcript
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (inspectingLesson.transcript) {
                            navigator.clipboard.writeText(inspectingLesson.transcript);
                            toast.success('Transcript copied to clipboard');
                          }
                        }}
                        className="text-xs h-7 gap-1 border-teal-300 text-teal-800 hover:bg-teal-100"
                      >
                        <Copy className="w-3 h-3" /> Copy Text
                      </Button>
                    </div>

                    <div className="p-4 bg-white rounded-xl border border-teal-100 max-h-72 overflow-y-auto font-mono text-[11px] leading-relaxed text-gray-800 whitespace-pre-wrap">
                      {inspectingLesson.transcript}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB D: QUIZ ASSESSMENT */}
              {inspectionTab === 'quiz' && inspectingLesson.quiz && (
                <div className="space-y-4 animate-in fade-in duration-150 text-xs">
                  <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">{inspectingLesson.quiz.title}</h4>
                      <p className="text-[11px] text-gray-600 mt-0.5">
                        Students must score at least <strong>{inspectingLesson.quiz.passing_score}%</strong> to pass this quiz checkpoint.
                      </p>
                    </div>
                    <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs font-bold">
                      {inspectingLesson.quiz.question_count} Question{inspectingLesson.quiz.question_count === 1 ? '' : 's'}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    {inspectingLesson.quiz.questions?.map((q, qIdx) => (
                      <div key={q.id} className="p-4 rounded-2xl border border-gray-200 bg-white shadow-xs space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-900 text-xs">
                            Question {qIdx + 1}: {q.question}
                          </span>
                          <Badge variant="outline" className="text-[10px] capitalize bg-gray-50">
                            {q.question_type.replace('_', ' ')}
                          </Badge>
                        </div>

                        {q.options && q.options.length > 0 && (
                          <div className="space-y-1.5 pl-2">
                            {q.options.map((opt) => (
                              <div
                                key={opt.id}
                                className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                                  opt.is_correct
                                    ? 'bg-green-50/80 border-green-300 text-green-900 font-semibold'
                                    : 'bg-gray-50/70 border-gray-200 text-gray-700'
                                }`}
                              >
                                <span>{opt.option_text}</span>
                                {opt.is_correct && (
                                  <Badge className="bg-green-600 text-white border-0 text-[10px] font-bold">
                                    CORRECT ANSWER
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {q.explanation && (
                          <p className="text-[11px] text-gray-500 italic bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                            <strong>Explanation:</strong> {q.explanation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB E: ATTACHED ASSETS */}
              {inspectionTab === 'assets' && (
                <div className="space-y-3 animate-in fade-in duration-150 text-xs">
                  {inspectingLesson.assets?.map((asset) => (
                    <div key={asset.id} className="p-3.5 rounded-2xl border border-gray-200 bg-white flex items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                          <Download className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-xs">{asset.file_name}</p>
                          <span className="text-[11px] text-gray-400 capitalize">{asset.asset_type}</span>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(asset.file_url, '_blank')}
                        className="text-xs text-purple-700 border-purple-200 hover:bg-purple-50 h-7"
                      >
                        <ExternalLink className="w-3.5 h-3.5 mr-1" /> Open File
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Moderation Modals */}
      {showApprovalModal && (
        <ApprovalModal
          course={{
            id: course.id,
            title: course.title,
            creator_name: course.creator?.full_name || course.creator?.email,
          }}
          onClose={() => setShowApprovalModal(false)}
          onApprove={handleApprove}
          loading={actionLoading}
        />
      )}

      {showRejectionModal && (
        <RejectionModal
          course={{
            id: course.id,
            title: course.title,
            creator_name: course.creator?.full_name || course.creator?.email,
          }}
          onClose={() => setShowRejectionModal(false)}
          onReject={(targetId, reason) => handleReject(targetId, reason)}
          loading={actionLoading}
        />
      )}

      <ConfirmAction
        title="Archive Course"
        description={`Are you sure you want to archive "${course.title}"? Learners will no longer be able to discover or enroll in it.`}
        confirmText="Archive"
        confirmClassName="bg-red-600 hover:bg-red-700 text-white"
        icon={<AlertCircle className="w-5 h-5 text-red-600" />}
        onConfirm={handleArchive}
        open={showArchiveConfirm}
        onOpenChange={setShowArchiveConfirm}
        loading={actionLoading}
        loadingText="Archiving..."
      />
    </div>
  );
}
