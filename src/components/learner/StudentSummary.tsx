'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BookOpen, CheckCircle, Save, Send, Target, Lightbulb, AlertCircle, Loader2, FileText, Video, Type, Layers, Maximize2, Minimize2, Eye, EyeOff, ListChecks, ChevronRight } from 'lucide-react'
import { fetchLessonSummary, saveLessonSummary, submitLessonSummary, completeLesson } from '@/lib/learner-api'
import { useTranslation } from '@/lib/useTranslation'

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
  const { t } = useTranslation()
  const [content, setContent] = useState('')
  const [status, setStatus] = useState<'loading' | 'draft' | 'submitted'>('loading')
  const [completed, setCompleted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [, setSummaryId] = useState<string | null>(null)
  const [focusMode, setFocusMode] = useState(false)
  const [showHints, setShowHints] = useState(true)
  const [completing, setCompleting] = useState(false)

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
  const progressPercent = Math.min((wordCount / wordTarget) * 100, 100)

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
      <Card className="p-10 rounded-2xl border border-indigo-100 bg-white/50 backdrop-blur-sm shadow-sm flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
        <p className="text-sm font-medium text-indigo-600 animate-pulse">{t('summary.loading')}</p>
      </Card>
    )
  }

  const handleMarkComplete = async () => {
    if (completing) return
    setCompleting(true)
    try {
      await completeLesson(lessonId, courseId)
      setCompleted(true)
      onComplete?.()
    } finally {
      setCompleting(false)
    }
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
      <Card className="p-8 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50/50 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-200/30 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
        <div className="flex items-start gap-5 relative z-10">
          <div className="bg-emerald-100 p-3 rounded-full shrink-0">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-emerald-900 mb-1">{t('summary.submitted')}</h3>
            <p className="text-sm text-emerald-700/80 mb-4">{t('summary.submittedDesc')}</p>
            {content && (
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-emerald-100 shadow-sm mb-4">
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{content}</p>
                <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
                  <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200">{t('summary.words', { n: wordCount })}</Badge>
                </div>
              </div>
            )}
            {!completed && (
              <Button onClick={handleMarkComplete} disabled={completing} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all">
                {completing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />} {t('summary.markComplete')}
              </Button>
            )}
            {completed && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 rounded-lg text-emerald-800 font-semibold border border-emerald-200 shadow-sm">
                <CheckCircle className="w-5 h-5" /> {t('summary.completed')}
              </div>
            )}
          </div>
        </div>
      </Card>
    )
  }

  const SourceIcon = sourceIcons[source] || BookOpen

  return (
    <Card className={`overflow-hidden rounded-2xl border transition-all duration-500 ${focusMode ? 'fixed inset-4 z-50 overflow-y-auto bg-slate-50 shadow-2xl border-indigo-200' : 'bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/30 border-indigo-100 shadow-sm'}`}>
      {/* Premium Header */}
      <div className={`px-6 pt-6 pb-4 border-b border-indigo-50/60 bg-white/40 backdrop-blur-md ${focusMode ? 'sticky top-0 z-10 shadow-sm' : ''}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="bg-indigo-100/80 p-2.5 rounded-xl shrink-0 shadow-inner">
              <BookOpen className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-900 to-blue-800">{t('summary.title')}</h3>
              <p className="text-sm text-slate-600 mt-0.5">
                {t('summary.writeBasedOn', { source: sourceLabels[source] || 'the lesson content' })}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Badge variant="outline" className="text-[11px] text-indigo-700 border-indigo-200 bg-indigo-50/50 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full">
                  <SourceIcon className="w-3.5 h-3.5" /> {source.charAt(0).toUpperCase() + source.slice(1).replace('_', ' ')}
                </Badge>
                <Badge variant="outline" className="text-[11px] text-purple-700 border-purple-200 bg-purple-50/50 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full">
                  <Target className="w-3.5 h-3.5" /> {t('summary.target', { n: wordTarget })}
                </Badge>
              </div>
            </div>
          </div>
          <button
            onClick={() => setFocusMode(!focusMode)}
            className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors bg-white/50 border border-slate-100 shadow-sm"
            title={focusMode ? t('summary.exitFocus') : t('summary.enterFocus')}
          >
            {focusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className={`p-6 ${focusMode ? 'max-w-4xl mx-auto' : ''}`}>
        {/* Dynamic Hints Section */}
        {keyPoints.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5" /> {t('summary.keyConcepts')}
              </h4>
              <button 
                onClick={() => setShowHints(!showHints)} 
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
              >
                {showHints ? <><EyeOff className="w-3.5 h-3.5" /> {t('summary.hide')}</> : <><Eye className="w-3.5 h-3.5" /> {t('summary.show')}</>}
              </button>
            </div>
            
            <div className={`transition-all duration-300 origin-top overflow-hidden ${showHints ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="flex flex-wrap gap-2 mb-2">
                {keyPoints.map((point, i) => (
                  <div key={i} className="text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200/60 rounded-lg px-3 py-1.5 shadow-sm">
                    {point}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {reflectionQuestions.length > 0 && (
          <div className="mb-6 bg-blue-50/50 border border-blue-100 rounded-xl p-4 shadow-sm">
            <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-blue-600" /> {t('summary.reflection')}
            </h4>
            <ul className="space-y-1.5">
              {reflectionQuestions.map((q, i) => (
                <li key={i} className="text-sm text-blue-800/80 flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">•</span> {q}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Text Area and Progress */}
        <div className="relative group">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('summary.placeholder')}
            rows={focusMode ? 16 : 8}
            className={`text-base bg-white/70 backdrop-blur-md border-indigo-100 shadow-inner focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 transition-all rounded-xl resize-y ${focusMode ? 'min-h-[400px] text-lg leading-relaxed' : ''}`}
            style={focusMode ? { fontSize: '1.125rem', lineHeight: '1.8' } : undefined}
          />
          
          {/* Progress Bar Container */}
          <div className="mt-4 flex items-center gap-4 bg-white/60 p-3 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex-1">
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 rounded-full ${meetsTarget ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-sm font-bold ${meetsTarget ? 'text-emerald-600' : 'text-slate-600'}`}>
                <span className="text-sm font-bold">{wordCount}</span> <span className="text-slate-400 font-medium">/ {wordTarget} {t('summary.words', { n: wordTarget })}</span>
              </span>
              {meetsTarget && <CheckCircle className="w-5 h-5 text-emerald-500 animate-in zoom-in" />}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-8 pt-6 border-t border-slate-100">
          <Button 
            variant="outline" 
            onClick={handleSaveDraft} 
            disabled={!content.trim() || saving} 
            className="flex-1 rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold"
          >
            {saving && !meetsTarget ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {t('summary.saveDraft')}
          </Button>
          <Button 
            onClick={handleSubmitAndComplete} 
            disabled={!meetsTarget || saving} 
            className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/20 transition-all"
          >
            {saving && meetsTarget ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            {t('summary.submit')}
          </Button>
        </div>
      </div>
    </Card>
  )
}

