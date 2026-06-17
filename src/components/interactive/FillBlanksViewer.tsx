import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { FillBlanksData } from '@/lib/interactive-types'

interface FillBlanksViewerProps {
  data: FillBlanksData
  accessibilitySettings?: Record<string, unknown>
}

export function FillBlanksViewer({ data }: FillBlanksViewerProps) {
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [revealed, setRevealed] = useState(false)
  const segments = data.segments ?? []

  const blankIndices = segments
    .map((s, i) => (s.isBlank ? i : -1))
    .filter((i) => i >= 0)

  const allFilled = blankIndices.every((idx) => (answers[idx] ?? '').trim().length > 0)

  const checkAnswers = () => {
    setRevealed(true)
  }

  const isCorrect = (idx: number) => {
    if (!revealed) return null
    const userAnswer = (answers[idx] ?? '').trim().toLowerCase()
    const correct = (segments[idx].answer ?? '').trim().toLowerCase()
    return userAnswer === correct ? 'correct' : 'incorrect'
  }

  return (
    <div className="space-y-6">
      <div className="text-lg leading-relaxed">
        {segments.map((seg, idx) => {
          if (seg.isBlank) {
            const result = isCorrect(idx)
            return (
              <span key={idx} className="inline-block mx-1">
                <Input
                  value={answers[idx] ?? ''}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [idx]: e.target.value }))}
                  placeholder="______"
                  className={`inline-block w-40 mx-1 text-center ${
                    result === 'correct' ? 'border-green-500 bg-green-50' :
                    result === 'incorrect' ? 'border-red-500 bg-red-50' :
                    ''
                  }`}
                  disabled={revealed}
                />
                {revealed && result === 'incorrect' && (
                  <span className="text-xs text-green-600 ml-1">({seg.answer})</span>
                )}
              </span>
            )
          }
          return <span key={idx}>{seg.text} </span>
        })}
      </div>
      <div className="flex justify-end gap-3">
        {!revealed ? (
          <Button type="button" onClick={checkAnswers} disabled={!allFilled}>
            Check Answers
          </Button>
        ) : (
          <>
            <Button type="button" variant="outline" onClick={() => { setRevealed(false); setAnswers({}) }}>
              Reset
            </Button>
            <Button type="button" variant="outline" onClick={() => {
              const correct: Record<number, string> = {}
              blankIndices.forEach((idx) => {
                correct[idx] = segments[idx].answer ?? ''
              })
              setAnswers(correct)
            }}>
              Show Answers
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
