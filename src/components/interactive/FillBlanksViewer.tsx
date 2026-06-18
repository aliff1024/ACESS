import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { FillBlanksData, FillBlanksMode } from '@/lib/interactive-types'
import { CheckCircle2, XCircle, RotateCcw } from 'lucide-react'

interface FillBlanksViewerProps {
  data: FillBlanksData
  accessibilitySettings?: Record<string, unknown>
  onComplete?: () => void
}

export function FillBlanksViewer({ data, onComplete }: FillBlanksViewerProps) {
  const mode: FillBlanksMode = data.mode ?? 'typing'
  const segments = data.segments ?? []
  
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [revealed, setRevealed] = useState(false)
  const [score, setScore] = useState<{correct: number, total: number} | null>(null)

  const blankIndices = segments.map((s, i) => (s.isBlank ? i : -1)).filter((i) => i >= 0)
  const allFilled = blankIndices.every((idx) => (answers[idx] ?? '').trim().length > 0)

  // Generate word bank if mode is 'word_bank'
  const wordBank = useMemo(() => {
    if (mode !== 'word_bank') return []
    const words = segments.filter(s => s.isBlank && s.answer).map(s => s.answer!)
    if (data.extra_words) {
      words.push(...data.extra_words)
    }
    return Array.from(new Set(words)).sort(() => Math.random() - 0.5)
  }, [segments, mode, data.extra_words])

  const checkAnswers = () => {
    let correct = 0
    blankIndices.forEach((idx) => {
      const userAnswer = (answers[idx] ?? '').trim().toLowerCase()
      const correctAnswer = (segments[idx].answer ?? '').trim().toLowerCase()
      if (userAnswer === correctAnswer) correct++
    })
    setScore({ correct, total: blankIndices.length })
    setRevealed(true)
    onComplete?.()
  }

  const resetActivity = () => {
    setAnswers({})
    setRevealed(false)
    setScore(null)
  }

  const isCorrect = (idx: number) => {
    if (!revealed) return null
    const userAnswer = (answers[idx] ?? '').trim().toLowerCase()
    const correctAnswer = (segments[idx].answer ?? '').trim().toLowerCase()
    return userAnswer === correctAnswer ? 'correct' : 'incorrect'
  }

  if (segments.length === 0) {
    return <p className="text-gray-500 italic text-center p-8 bg-gray-50 border-2 border-dashed rounded-xl">No content in this activity.</p>
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      
      {/* Score Display */}
      {revealed && score && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm">
          <h3 className="text-xl font-bold mb-2">Activity Complete!</h3>
          <div className="flex items-center justify-center gap-4 text-2xl mb-6">
            <span className={score.correct === score.total ? 'text-green-600' : 'text-blue-600'}>
              {score.correct} / {score.total} Correct
            </span>
            <span className="text-gray-300">|</span>
            <span className="font-semibold text-gray-700">{Math.round((score.correct / score.total) * 100)}%</span>
          </div>
          <div className="flex justify-center gap-3">
            <Button onClick={resetActivity} variant="outline"><RotateCcw className="w-4 h-4 mr-2" /> Try Again</Button>
            <Button onClick={() => {
              const correct: Record<number, string> = {}
              blankIndices.forEach((idx) => correct[idx] = segments[idx].answer ?? '')
              setAnswers(correct)
            }} variant="default">Show Answers</Button>
          </div>
        </div>
      )}

      {/* Word Bank Display */}
      {mode === 'word_bank' && !revealed && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-blue-800 mb-3 uppercase tracking-wider">Word Bank</h4>
          <div className="flex flex-wrap gap-2">
            {wordBank.map((word, i) => {
              const timesUsed = Object.values(answers).filter(a => a === word).length
              const totalNeeded = segments.filter(s => s.answer === word).length
              const isExhausted = timesUsed >= totalNeeded
              return (
                <span key={i} className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${isExhausted ? 'bg-gray-100 text-gray-400 border-gray-200 line-through' : 'bg-white text-blue-700 border-blue-200 shadow-sm'}`}>
                  {word}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Main Content area */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 md:p-8 shadow-sm">
        <div className="text-lg md:text-xl leading-loose md:leading-loose text-gray-800">
          {segments.map((seg, idx) => {
            if (seg.isBlank) {
              const result = isCorrect(idx)
              
              // Render Select Dropdown for Word Bank or Mixed Mode with options
              if (mode === 'word_bank' || (mode === 'mixed' && seg.options && seg.options.length > 0)) {
                let options = mode === 'word_bank' ? wordBank : (seg.options || [])
                // Add correct answer to options if not present (just in case)
                if (mode === 'mixed' && seg.answer && !options.includes(seg.answer)) {
                  options = [...options, seg.answer]
                }
                
                return (
                  <span key={idx} className="inline-block mx-1 relative">
                    <select
                      value={answers[idx] ?? ''}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [idx]: e.target.value }))}
                      disabled={revealed}
                      className={`h-10 px-8 py-1 rounded-md border-b-2 appearance-none bg-gray-50 focus:outline-none focus:border-blue-500 font-semibold text-center min-w-[120px] shadow-inner transition-colors cursor-pointer ${
                        result === 'correct' ? 'border-green-500 bg-green-50 text-green-700' :
                        result === 'incorrect' ? 'border-red-500 bg-red-50 text-red-700' :
                        'border-gray-300 text-blue-600 hover:bg-blue-50/50'
                      }`}
                    >
                      <option value="" disabled>Select...</option>
                      {options.map((opt, i) => (
                        <option key={i} value={opt}>{opt}</option>
                      ))}
                    </select>
                    {/* Custom Dropdown Arrow since we hid default */}
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                    {revealed && result === 'correct' && <CheckCircle2 className="absolute -top-3 -right-3 w-5 h-5 text-green-500 bg-white rounded-full" />}
                    {revealed && result === 'incorrect' && <XCircle className="absolute -top-3 -right-3 w-5 h-5 text-red-500 bg-white rounded-full" />}
                    {revealed && result === 'incorrect' && (
                      <span className="absolute top-full left-0 mt-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded shadow-sm whitespace-nowrap z-10">
                        {seg.answer}
                      </span>
                    )}
                  </span>
                )
              }

              // Render Free Typing Input
              return (
                <span key={idx} className="inline-block mx-1 relative">
                  <Input
                    value={answers[idx] ?? ''}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [idx]: e.target.value }))}
                    placeholder={seg.text || "______"}
                    disabled={revealed}
                    className={`h-10 px-3 py-1 rounded-md border-b-2 border-t-0 border-x-0 bg-gray-50 focus-visible:ring-0 focus-visible:border-blue-500 font-semibold text-center min-w-[120px] shadow-inner transition-colors ${
                      result === 'correct' ? 'border-green-500 bg-green-50 text-green-700' :
                      result === 'incorrect' ? 'border-red-500 bg-red-50 text-red-700' :
                      'border-gray-300 text-blue-600'
                    }`}
                  />
                  {revealed && result === 'correct' && <CheckCircle2 className="absolute -top-3 -right-3 w-5 h-5 text-green-500 bg-white rounded-full" />}
                  {revealed && result === 'incorrect' && <XCircle className="absolute -top-3 -right-3 w-5 h-5 text-red-500 bg-white rounded-full" />}
                  {revealed && result === 'incorrect' && (
                    <span className="absolute top-full left-0 mt-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded shadow-sm whitespace-nowrap z-10">
                      {seg.answer}
                    </span>
                  )}
                </span>
              )
            }

            // Static Text
            return <span key={idx} className="whitespace-pre-wrap">{seg.text} </span>
          })}
        </div>
      </div>

      {!revealed && (
        <div className="flex justify-end sticky bottom-6 z-20">
          <Button onClick={checkAnswers} size="lg" className="shadow-lg hover:shadow-xl transition-shadow text-base px-8 h-14 rounded-full" disabled={!allFilled}>
            Check Answers
          </Button>
        </div>
      )}
    </div>
  )
}
