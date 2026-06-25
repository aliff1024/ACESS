'use client';

import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Input } from '../ui/input';
import { ArrowLeft, BookOpen, Clock, Activity, Target, Mail, Send, CheckCircle2, AlertCircle, Calendar, MessageSquare, Loader2, Eye, ShieldAlert } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { 
  fetchStudentsDeepProgress, 
  fetchStudentTimeline, 
  sendEducatorNotification,
  DetailedStudentProgress,
  TimelineEvent
} from '@/lib/educator-analytics-api';
import Link from 'next/link';
import { formatDistanceToNow, format } from 'date-fns';

export function StudentDetailDashboard({ studentId }: { studentId: string }) {
  const [student, setStudent] = useState<DetailedStudentProgress | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showMsgBox, setShowMsgBox] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: user } = await supabase.auth.getUser();
        if (user.user) {
          const students = await fetchStudentsDeepProgress(user.user.id);
          const currentStudent = students.find(s => s.id === studentId);
          if (currentStudent) {
            setStudent(currentStudent);
            const events = await fetchStudentTimeline(studentId, user.user.id);
            setTimeline(events);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [studentId]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !student) return;
    try {
      setIsSending(true);
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        await sendEducatorNotification(student.id, user.user.id, messageText, 'message');
        setMessageText('');
        setShowMsgBox(false);
        alert('Message sent to student successfully!');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
        <p className="text-gray-500">Loading student profile...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200">
          Student not found or you don&apos;t have access.
        </div>
        <Link href="/educator/students">
          <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2"/> Back to Students</Button>
        </Link>
      </div>
    );
  }

  const formatTimeSpent = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="hidden md:flex w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 items-center justify-center text-white text-3xl font-bold shadow-md">
            {student.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold text-gray-900">{student.name}</h1>
              {student.status === 'at-risk' && (
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                  At Risk
                </Badge>
              )}
              {student.status === 'inactive' && (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                  Inactive
                </Badge>
              )}
            </div>
            <p className="text-gray-500">{student.email}</p>
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
              <span className="flex items-center gap-1"><Clock className="w-4 h-4"/> Last active: {formatDistanceToNow(new Date(student.lastActive))} ago</span>
              <span className="flex items-center gap-1"><Target className="w-4 h-4"/> {student.courses.length} Enrolled Courses</span>
            </div>
            {student.accessibility_prefs && Object.keys(student.accessibility_prefs).length > 0 && (
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className="text-sm font-semibold text-gray-500 mr-1"><ShieldAlert className="w-4 h-4 inline mr-1 text-indigo-500" /> UDL Profile:</span>
                {student.accessibility_prefs.active_preset && student.accessibility_prefs.active_preset !== 'none' && (
                  <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200">{student.accessibility_prefs.active_preset.replace('_friendly', '').toUpperCase()}</Badge>
                )}
                {student.accessibility_prefs.dyslexia_friendly_font && (
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200">Dyslexia Font</Badge>
                )}
                {student.accessibility_prefs.animation_level && student.accessibility_prefs.animation_level !== 'normal' && (
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200">Animation: {student.accessibility_prefs.animation_level}</Badge>
                )}
                {student.accessibility_prefs.chunked_content_mode && (
                  <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200">Chunked Content</Badge>
                )}
                {student.accessibility_prefs.reading_spotlight && (
                  <Badge className="bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200">Reading Spotlight</Badge>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button 
            onClick={() => setShowMsgBox(!showMsgBox)}
            className="bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
          >
            <Mail className="w-4 h-4 mr-2" /> Message Student
          </Button>
          <Link href="/educator/students">
            <Button variant="outline" className="w-full sm:w-auto">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          </Link>
        </div>
      </div>

      {/* Message Box */}
      {showMsgBox && (
        <Card className="p-6 border-0 shadow-sm ring-1 ring-purple-200 bg-purple-50/50 rounded-2xl animate-in slide-in-from-top-4 fade-in duration-200">
          <h3 className="font-medium text-purple-900 mb-3 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" /> Send direct message to {student.name}
          </h3>
          <div className="flex gap-3">
            <Input 
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
              placeholder="e.g. 'I noticed you haven&apos;t logged in recently, please catch up on Lesson 3.'" 
              className="bg-white border-purple-200 focus:border-purple-500 focus:ring-purple-500"
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={!messageText.trim() || isSending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-5 border-0 shadow-sm ring-1 ring-gray-200 rounded-2xl bg-white">
          <p className="text-sm font-medium text-gray-500 mb-1">Overall Progress</p>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-bold text-gray-900">{student.totalProgress}%</p>
          </div>
          <Progress value={student.totalProgress} className="h-1.5 mt-3" />
        </Card>
        <Card className="p-5 border-0 shadow-sm ring-1 ring-gray-200 rounded-2xl bg-white">
          <p className="text-sm font-medium text-gray-500 mb-1">Learning Streak</p>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-bold text-gray-900">{student.learningStreak}</p>
            <span className="text-gray-500 mb-1 font-medium">Days</span>
          </div>
        </Card>
        <Card className="p-5 border-0 shadow-sm ring-1 ring-gray-200 rounded-2xl bg-white">
          <p className="text-sm font-medium text-gray-500 mb-1">Total Time</p>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-bold text-gray-900">{formatTimeSpent(student.courses.reduce((acc, c) => acc + c.timeSpentSeconds, 0))}</p>
          </div>
        </Card>
        <Card className="p-5 border-0 shadow-sm ring-1 ring-gray-200 rounded-2xl bg-white">
          <p className="text-sm font-medium text-gray-500 mb-1">Avg Score</p>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-bold text-gray-900">
              {Math.round(student.courses.reduce((acc, c) => acc + c.avgScore, 0) / (student.courses.length || 1))}%
            </p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col - Course Progress & Accessibility */}
        <div className="lg:col-span-2 space-y-8">
          
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-900">Course Progress</h3>
            {student.courses.length === 0 ? (
              <p className="text-gray-500">Not enrolled in any courses.</p>
            ) : (
              student.courses.map(course => (
                <Card key={course.id} className="p-6 border-0 shadow-sm ring-1 ring-gray-200 rounded-2xl bg-white hover:ring-gray-300 transition-shadow">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
                    <div>
                      <h4 className="font-bold text-gray-900 text-lg">{course.title}</h4>
                      <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                        <Clock className="w-3.5 h-3.5" /> Time spent: {formatTimeSpent(course.timeSpentSeconds)}
                      </p>
                    </div>
                    {course.status === 'completed' ? (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-0">Completed</Badge>
                    ) : course.status === 'at-risk' ? (
                      <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 border-0">Falling Behind</Badge>
                    ) : (
                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-0">In Progress</Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-gray-700">Completion</span>
                        <span className="font-bold text-gray-900">{course.progress}%</span>
                      </div>
                      <Progress value={course.progress} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-gray-700">Average Quiz Score</span>
                        <span className="font-bold text-gray-900">{course.avgScore}%</span>
                      </div>
                      <Progress value={course.avgScore} className="h-2 [&>div]:bg-green-500" />
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-900">Accessibility Profile</h3>
            <Card className="p-6 border-0 shadow-sm ring-1 ring-blue-200 bg-blue-50/30 rounded-2xl">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Eye className="w-5 h-5 text-blue-700" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Learning Preferences</h4>
                  <p className="text-sm text-gray-600 mb-4">Understanding the student&apos;s accessibility needs can help tailor interventions.</p>
                  
                  <div className="flex flex-wrap gap-2">
                    {student.accessibility_prefs ? (
                      <>
                        {student.accessibility_prefs.dyslexia_friendly_font && (
                          <Badge variant="secondary" className="bg-white border-blue-200 text-blue-800">Dyslexia Font: On</Badge>
                        )}
                        {student.accessibility_prefs.tts_enabled && (
                          <Badge variant="secondary" className="bg-white border-blue-200 text-blue-800">Text-to-Speech: On</Badge>
                        )}
                        {student.accessibility_prefs.distraction_free_mode && (
                          <Badge variant="secondary" className="bg-white border-blue-200 text-blue-800">Focus Mode: Enabled</Badge>
                        )}
                        {student.accessibility_prefs.reading_spotlight && (
                          <Badge variant="secondary" className="bg-white border-blue-200 text-blue-800">Reading Spotlight: Enabled</Badge>
                        )}
                        {student.accessibility_prefs.chunked_content_mode && (
                          <Badge variant="secondary" className="bg-white border-blue-200 text-blue-800">Chunked Content: On</Badge>
                        )}
                        {student.accessibility_prefs.simplified_ui && (
                          <Badge variant="secondary" className="bg-white border-blue-200 text-blue-800">Simplified UI: On</Badge>
                        )}
                        {(!student.accessibility_prefs.dyslexia_friendly_font && !student.accessibility_prefs.tts_enabled && !student.accessibility_prefs.distraction_free_mode && !student.accessibility_prefs.reading_spotlight && !student.accessibility_prefs.chunked_content_mode && !student.accessibility_prefs.simplified_ui) && (
                           <span className="text-sm text-gray-500">No specific accessibility features enabled.</span>
                        )}
                      </>
                    ) : (
                      <span className="text-sm text-gray-500">No accessibility data available.</span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>
          
        </div>

        {/* Right Col - Activity Timeline */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-gray-900">Activity Timeline</h3>
          <Card className="p-6 border-0 shadow-sm ring-1 ring-gray-200 rounded-2xl bg-white max-h-[600px] overflow-y-auto">
            {timeline.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No recent activity found.</p>
            ) : (
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
                {timeline.map((event, i) => (
                  <div key={event.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-blue-50 text-blue-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      {event.type === 'enrollment' && <BookOpen className="w-4 h-4" />}
                      {event.type === 'lesson_view' && <Eye className="w-4 h-4" />}
                      {event.type === 'quiz_attempt' && <Target className="w-4 h-4" />}
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                      <div className="flex items-center justify-between space-x-2 mb-1">
                        <div className="font-bold text-gray-900 text-sm">{event.title}</div>
                        <time className="text-xs font-medium text-gray-500">{format(new Date(event.timestamp), 'MMM d, h:mm a')}</time>
                      </div>
                      <div className="text-xs text-gray-600">{event.courseTitle}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

      </div>
    </div>
  );
}
