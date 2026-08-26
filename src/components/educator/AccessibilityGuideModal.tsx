'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Accessibility,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  Sparkles,
  Layers,
  Video,
  Sliders,
  FileText,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AccessibilityGuideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentFocus?: string;
}

export function AccessibilityGuideModal({
  open,
  onOpenChange,
  currentFocus = 'adhd',
}: AccessibilityGuideModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[96vw] max-h-[92vh] overflow-y-auto p-6 sm:p-10">
        <DialogHeader className="border-b border-gray-100 pb-5">
          <div className="flex items-center gap-3 text-purple-700 mb-1">
            <div className="p-2.5 bg-purple-100 rounded-2xl">
              <Accessibility className="w-7 h-7 text-purple-700" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black text-gray-950">
                Accessibility Compliance Engine Guide
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-500 mt-0.5">
                Learn how the automated audit evaluates your courses and guides you to 100% WCAG compliance.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-2 text-sm text-gray-700">
          {/* ── Section 1: The 2-Tier Audit Engine ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-bold text-gray-950 text-base">
              <Sliders className="w-5 h-5 text-purple-600" />
              1. How the 14 Standards are Evaluated
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Every course is scored across two distinct tiers:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 bg-purple-50/60 rounded-xl border border-purple-100 space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-purple-900 text-sm">
                  <span className="w-6 h-6 rounded-full bg-purple-200 text-purple-800 text-xs flex items-center justify-center font-bold">4</span>
                  Course-Level Settings
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Evaluates whole-course toggles, including Focus Mode support, Chunked Learning delivery, Learning Streaks, and Chapter hierarchy.
                </p>
              </div>
              <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-blue-900 text-sm">
                  <span className="w-6 h-6 rounded-full bg-blue-200 text-blue-800 text-xs flex items-center justify-center font-bold">10</span>
                  Lesson Content Standards
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Deep-scans each lesson&apos;s markup: Heading structure, paragraph length (&lt;150 words), video transcripts, duration pacing, and interactive tasks.
                </p>
              </div>
            </div>
          </div>

          {/* ── Section 2: Why Rule Skipping Happens (Context-Aware Scoring) ── */}
          <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-950 text-sm">
              <Lightbulb className="w-4 h-4 text-amber-600 shrink-0" />
              Why do some lessons show 10/10 while others show 8/9?
            </div>
            <p className="text-xs text-amber-900/90 leading-relaxed">
              The engine uses <strong>Context-Aware Relevance</strong>:
            </p>
            <ul className="text-xs text-amber-900/90 space-y-1.5 list-disc list-inside">
              <li>
                If a lesson contains a <strong>video</strong>, it is tested on all <strong>10 rules</strong> (including &ldquo;Video has a transcript&rdquo;).
              </li>
              <li>
                If a lesson has <strong>no video</strong> (text-only), the transcript rule is <strong>automatically skipped</strong>. The lesson is graded out of <strong>9 applicable rules</strong> so you are never penalized for something that doesn&apos;t exist.
              </li>
            </ul>
          </div>

          {/* ── Section 3: Profile-Specific Testing ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-bold text-gray-950 text-base">
              <Target className="w-5 h-5 text-purple-600" />
              2. How Rules Change Per Learning Profile
            </div>
            <p className="text-xs text-gray-600">
              The engine tunes its requirements depending on the course&apos;s selected primary focus:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className={`p-3.5 rounded-xl border space-y-1.5 ${currentFocus === 'adhd' ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="font-bold text-xs text-gray-900 flex items-center justify-between">
                  <span>🎯 ADHD Profile</span>
                  {currentFocus === 'adhd' && <span className="text-[10px] bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded font-semibold">Active</span>}
                </div>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  Demands sub-20 min sessions, distraction-free view, chunked micro-learning, and interactive activities to prevent attention fatigue.
                </p>
              </div>

              <div className={`p-3.5 rounded-xl border space-y-1.5 ${currentFocus === 'dyslexia' ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="font-bold text-xs text-gray-900 flex items-center justify-between">
                  <span>📖 Dyslexia Profile</span>
                  {currentFocus === 'dyslexia' && <span className="text-[10px] bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded font-semibold">Active</span>}
                </div>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  Enforces short paragraphs (&lt;80 words), plain sentences (&lt;30 words), minimal italic noise, and audio text-to-speech availability.
                </p>
              </div>

              <div className={`p-3.5 rounded-xl border space-y-1.5 ${currentFocus === 'autism' ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="font-bold text-xs text-gray-900 flex items-center justify-between">
                  <span>🧩 Autism & Sensory</span>
                  {currentFocus === 'autism' && <span className="text-[10px] bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded font-semibold">Active</span>}
                </div>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  Requires clear step objectives, plain-language summaries, predictable scroll navigation, and zero abrupt animations.
                </p>
              </div>
            </div>
          </div>

          {/* ── Section 4: Score Bands ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-bold text-gray-950 text-base">
              <Sparkles className="w-5 h-5 text-purple-600" />
              3. Score Bands & Publishing Readiness
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="p-3 bg-green-50/70 border border-green-200 rounded-xl">
                <p className="font-bold text-green-900 text-xs flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  80% – 100% (Good)
                </p>
                <p className="text-[11px] text-green-800/90 mt-1">
                  Ready to publish. High accessibility across all learners.
                </p>
              </div>
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
                <p className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  50% – 79% (Warning)
                </p>
                <p className="text-[11px] text-amber-800/90 mt-1">
                  Usable, but minor improvements recommended before publishing.
                </p>
              </div>
              <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl">
                <p className="font-bold text-rose-900 text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  0% – 49% (Critical)
                </p>
                <p className="text-[11px] text-rose-800/90 mt-1">
                  Has severe blockers (e.g. empty lessons, missing transcripts).
                </p>
              </div>
            </div>
          </div>

          {/* ── Section 5: How to Reach 100% in 3 Steps ── */}
          <div className="p-4 bg-purple-50/80 rounded-xl border border-purple-200 space-y-2">
            <h4 className="font-bold text-purple-950 text-sm flex items-center gap-1.5">
              🚀 How to Reach 100% Quickly:
            </h4>
            <ol className="text-xs text-purple-900 space-y-1.5 list-decimal list-inside">
              <li>
                Check the <strong>&ldquo;Needs Fixes&rdquo;</strong> tab to see only the failing items.
              </li>
              <li>
                Click <strong>&ldquo;Quick Fix&rdquo;</strong> on course settings to enable features with 1 click.
              </li>
              <li>
                Click <strong>&ldquo;Edit Lesson&rdquo;</strong> to jump directly into the editor and fix transcripts, headings, or chunking.
              </li>
            </ol>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4 mt-2 flex justify-end">
          <Button
            type="button"
            className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-5"
            onClick={() => onOpenChange(false)}
          >
            Got it, Back to Course
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
