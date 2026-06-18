'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BookOpen, CheckCircle, Save, Send, Target, Lightbulb, AlertCircle, Loader2, FileText, Video, Type, Layers, Maximize2, Minimize2, Eye, EyeOff, ListChecks, ChevronRight } from 'lucide-react'
import { fetchLessonSummary, saveLessonSummary, submitLessonSummary, completeLesson } from '@/lib/learner-api'

interface StudentSummaryProps {
  lessonId: string
  courseId: string
  wordTarget: number
  keyPoints: string[]
  reflectionQuestions: string[]
  source: string
  onComplete?: () => void
}

export function StudentSummary({ lessonId, courseId, wordTarget, keyPoints, reflectionQuestions, source, onComplete }: StudentSummaryProps) {
  const [content, setContent] = useState('')
  const [status, setStatus] = useState<'loading' | 'draft' | 'submitted'>('loading')
  const [completed, setCompleted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [, setSummaryId] = useState<string | null>(null)
  const [focusMode, setFocusMode] = useState(false)
  const [showHints, setShowHints] = useState(true)
  const [aiFeedback, setAiFeedback] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    fetchLessonSummary(lessonId, courseId).then((data) => {
      if (data) {
        setContent(data.content)
        setStatus(data.status as 'draft' | 'submitted')
        setSummaryId(data.id)
      } else {
        setStatus('draft')
      }
    }).catch(() => setStatus('draft'))
  }, [lessonId])

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0
  const meetsTarget = wordCount >= wordTarget

  const handleSaveDraft = async () => {
    setSaving(true)
    try {
      await saveLessonSummary(lessonId, courseId, content, wordCount)
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async () => {
    if (!meetsTarget) return
    setSaving(true)
    try {
      await submitLessonSummary(lessonId, courseId, content, wordCount)
      setStatus('submitted')
    } finally {
      setSaving(false)
    }
  }

  const handleCheckSummary = async () => {
    setChecking(true)
    setAiFeedback(null)
    if (!content.trim()) { setChecking(false); return }

    const covered = keyPoints.filter(kp => content.toLowerCase().includes(kp.toLowerCase()))
    const missing = keyPoints.filter(kp => !content.toLowerCase().includes(kp.toLowerCase()))

    let feedback = ''
    if (covered.length > 0) {
      feedback += `✅ Covered key points: ${covered.length}/${keyPoints.length}\n`
    }
    if (missing.length > 0) {
      feedback += `\n📋 Missing key points to consider:\n${missing.map(m => `  • ${m}`).join('\n')}\n`
    }
    if (wordCount < wordTarget) {
      feedback += `\n📝 Try to reach ${wordTarget} words (currently ${wordCount})`
    } else if (wordCount >= wordTarget) {
      feedback += `\n✅ Word count target met (${wordCount}/${wordTarget})`
    }
    if (covered.length === keyPoints.length && wordCount >= wordTarget) {
      feedback += '\n\n🌟 Great job! Your summary covers all key points!'
    }

    setAiFeedback(feedback)
    setChecking(false)
  }

  const sourceLabels: Record<string, string> = {
    video: 'the lesson video',
    pdf: 'the PDF resources',
    lesson_text: 'the lesson text',
    entire_lesson: 'all lesson materials',
  }

  const sourceIcons: Record<string, typeof Video> = {
    video: Video,
    pdf: FileText,
    lesson_text: Type,
    entire_lesson: Layers,
  }

  if (status === 'loading') {
    return (
      <Card className="p-6 rounded-xl border-2 border-blue-200">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      </Card>
    )
  }

  const handleMarkComplete = async () => {
    await completeLesson(lessonId, courseId)
    setCompleted(true)
    onComplete?.()
  }

  const handleSubmitAndComplete = async () => {
    if (!meetsTarget) return
    setSaving(true)
    try {
      await submitLessonSummary(lessonId, courseId, content, wordCount)
      setStatus('submitted')
    } finally {
      setSaving(false)
    }
  }

  if (status === 'submitted') {
    return (
      <Card className="p-6 rounded-xl border-2 border-green-200 bg-green-50">
        <div className="flex items-start gap-4">
          <CheckCircle className="w-6 h-6 text-green-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-green-800 mb-1">Summary Submitted</h3>
            <p className="text-sm text-green-700 mb-3">Your summary has been submitted for review.</p>
            {content && (
              <div className="bg-white rounded-lg p-4 border border-green-200">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{content}</p>
                <p className="text-xs text-gray-400 mt-2">{wordCount} words</p>
              </div>
            )}
            {!completed && (
              <Button onClick={handleMarkComplete} className="mt-3 bg-green-600 hover:bg-green-700 text-white">
                <CheckCircle className="w-4 h-4 mr-2" /> Mark Complete
              </Button>
            )}
            {completed && (
              <div className="flex items-center gap-2 mt-3 text-green-700">
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold">Lesson Completed</span>
              </div>
            )}
          </div>
        </div>
      </Card>
    )
  }

  const SourceIcon = sourceIcons[source] || BookOpen

  return (
    <Card className={`p-6 rounded-xl border-2 border-blue-200 transition-all ${focusMode ? 'fixed inset-4 z-50 overflow-y-auto bg-white shadow-2xl' : ''}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <BookOpen className="w-6 h-6 text-blue-600 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-semibold text-gray-900">Student Summary</h3>
            <p className="text-sm text-gray-600">
              Write a summary based on {sourceLabels[source] || 'the lesson content'}.
            </p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-[10px] text-blue-700 border-blue-200 flex items-center gap-1">
                <SourceIcon className="w-3 h-3" /> {source.charAt(0).toUpperCase() + source.slice(1).replace('_', ' ')}
              </Badge>
              <Badge variant="outline" className="text-[10px] text-purple-700 border-purple-200">
                Target: {wordTarget} words
              </Badge>
            </div>
          </div>
        </div>
        <button
          onClick={() => setFocusMode(!focusMode)}
          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          title={focusMode ? 'Exit focus mode' : 'Focus mode'}
        >
          {focusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {showHints && keyPoints.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-semibold text-amber-800">Key Points to Cover:</span>
            </div>
            <button onClick={() => setShowHints(false)} className="text-amber-400 hover:text-amber-600">
              <EyeOff className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {keyPoints.map((point, i) => (
              <Badge key={i} variant="secondary" className="text-xs bg-amber-100 text-amber-800 border-amber-200">
                {point}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {!showHints && keyPoints.length > 0 && (
        <button onClick={() => setShowHints(true)} className="mb-4 text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1">
          <Eye className="w-3 h-3" /> Show key points
        </button>
      )}

      {reflectionQuestions.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-blue-800">Reflection Questions:</span>
          </div>
          <ul className="space-y-1">
            {reflectionQuestions.map((q, i) => (
              <li key={i} className="text-sm text-blue-900">• {q}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="relative">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your summary here. Focus on the key concepts and demonstrate your understanding..."
          rows={focusMode ? 16 : 10}
          className={`text-base mb-3 transition-all ${focusMode ? 'min-h-[400px] text-lg leading-relaxed' : ''}`}
          style={focusMode ? { fontSize: '1.125rem', lineHeight: '1.8' } : undefined}
        />
        <div className="absolute bottom-6 right-3">
          {content.trim() && (
            <span className="text-xs text-gray-400 bg-white px-2 py-0.5 rounded-full border border-gray-200">
              {content.trim().split(/\s+/).length} words
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className={`w-4 h-4 ${meetsTarget ? 'text-green-500' : 'text-gray-400'}`} />
          <span className={`text-sm ${meetsTarget ? 'text-green-700' : 'text-gray-500'}`}>
            {wordCount} / {wordTarget} words
          </span>
          {meetsTarget && <CheckCircle className="w-4 h-4 text-green-500" />}
        </div>
        {!meetsTarget && wordCount > 0 && (
          <div className="flex items-center gap-1 text-xs text-amber-600">
            <AlertCircle className="w-3 h-3" />
            <span>Need {wordTarget - wordCount} more words</span>
          </div>
        )}
      </div>

      {/* AI Feedback Section */}
      <div className="mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCheckSummary}
          disabled={!content.trim() || checking}
          className="text-xs"
        >
          {checking ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <ListChecks className="w-3 h-3 mr-1" />}
          Check My Summary
        </Button>
        {aiFeedback && (
          <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm whitespace-pre-wrap text-gray-700">
            {aiFeedback}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={handleSaveDraft} disabled={!content.trim() || saving} className="flex-1">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Draft'}
        </Button>
        <Button onClick={handleSubmitAndComplete} disabled={!meetsTarget || saving} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
          <Send className="w-4 h-4 mr-2" />
          Submit Summary
        </Button>
      </div>
    </Card>
  )
}


