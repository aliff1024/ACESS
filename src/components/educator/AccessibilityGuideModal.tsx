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
  BookOpen,
  Volume2,
  Clock,
  Layout,
  Flame,
  FolderTree,
  Eye,
  CheckSquare,
  Heading,
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
      <DialogContent className="sm:max-w-5xl md:max-w-5xl lg:max-w-5xl w-[96vw] max-h-[92vh] overflow-y-auto p-6 sm:p-10">
        <DialogHeader className="border-b border-gray-100 pb-5">
          <div className="flex items-center gap-3 text-purple-700 mb-1">
            <div className="p-2.5 bg-purple-100 rounded-2xl">
              <Accessibility className="w-7 h-7 text-purple-700" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black text-gray-950">
                Accessibility Compliance Engine &amp; Standards Guide
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-500 mt-0.5">
                Understand how the automated audit tests your courses against WCAG 2.2 and cognitive accessibility (COGA) guidelines.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-8 pt-3 text-sm text-gray-700">
          {/* ── Section 1: Complete List of 14 Standards ── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div className="flex items-center gap-2 font-bold text-gray-950 text-base">
                <Sliders className="w-5 h-5 text-purple-600" />
                The 14 Evaluated Standards Checklist
              </div>
              <span className="text-xs bg-purple-100 text-purple-800 font-bold px-2.5 py-1 rounded-full">
                4 Course + 10 Lesson Standards
              </span>
            </div>

            {/* Part A: 4 Course-Level Settings */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-black text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-600" />
                Part A: 4 Course-Level Settings (Global Switches)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-purple-50/50 rounded-xl border border-purple-100 space-y-1">
                  <div className="flex items-center justify-between font-bold text-xs text-purple-950">
                    <span className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5 text-purple-600" /> 1. Focus Mode Available</span>
                    <span className="text-[10px] bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded font-mono">WCAG 2.2 §2.2.4</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Ensures learners can strip away all sidebars, navigation bars, and competing visual distractions to focus purely on the study material.
                  </p>
                </div>

                <div className="p-3.5 bg-purple-50/50 rounded-xl border border-purple-100 space-y-1">
                  <div className="flex items-center justify-between font-bold text-xs text-purple-950">
                    <span className="flex items-center gap-1.5"><Layout className="w-3.5 h-3.5 text-purple-600" /> 2. Chunked Learning Delivery</span>
                    <span className="text-[10px] bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded font-mono">W3C COGA §4.2</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Allows long lessons to be broken into micro-segments with step progression rather than one overwhelming, continuous vertical scroll.
                  </p>
                </div>

                <div className="p-3.5 bg-purple-50/50 rounded-xl border border-purple-100 space-y-1">
                  <div className="flex items-center justify-between font-bold text-xs text-purple-950">
                    <span className="flex items-center gap-1.5"><Flame className="w-3.5 h-3.5 text-purple-600" /> 3. Learning Streaks &amp; Gamification</span>
                    <span className="text-[10px] bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded font-mono">W3C COGA Obj 7</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Provides streak tracking, unlockable badges, and milestone rewards to maintain momentum for learners with dopamine/executive function difficulties.
                  </p>
                </div>

                <div className="p-3.5 bg-purple-50/50 rounded-xl border border-purple-100 space-y-1">
                  <div className="flex items-center justify-between font-bold text-xs text-purple-950">
                    <span className="flex items-center gap-1.5"><FolderTree className="w-3.5 h-3.5 text-purple-600" /> 4. Chapter Hierarchy &amp; Notes</span>
                    <span className="text-[10px] bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded font-mono">WCAG 2.2 §1.3.1</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Requires clear module grouping and educator support guidance so learners know what prerequisites and expectations exist upfront.
                  </p>
                </div>
              </div>
            </div>

            {/* Part B: 10 Lesson Content Standards */}
            <div className="space-y-2.5 pt-2">
              <h4 className="text-xs font-black text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                Part B: 10 Lesson Content Standards (Deep-Scanned Markup)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-blue-50/40 rounded-xl border border-blue-100 space-y-1">
                  <p className="font-bold text-xs text-blue-950 flex items-center justify-between">
                    <span>5. Teachable Content Present</span>
                    <span className="text-[10px] text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">Min 50 words / video</span>
                  </p>
                  <p className="text-xs text-gray-600">Rejects blank or stub lessons. Learners must have real material or a video lecture to work from.</p>
                </div>

                <div className="p-3 bg-blue-50/40 rounded-xl border border-blue-100 space-y-1">
                  <p className="font-bold text-xs text-blue-950 flex items-center justify-between">
                    <span>6. Logical Heading Structure</span>
                    <span className="text-[10px] text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">WCAG 2.4.6 AA</span>
                  </p>
                  <p className="text-xs text-gray-600">Long content (&gt;200 words) must use H2/H3 headings without skipping levels for screen readers and skim-readers.</p>
                </div>

                <div className="p-3 bg-blue-50/40 rounded-xl border border-blue-100 space-y-1">
                  <p className="font-bold text-xs text-blue-950 flex items-center justify-between">
                    <span>7. Video Transcript Provided</span>
                    <span className="text-[10px] text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">WCAG 1.2.1 A</span>
                  </p>
                  <p className="text-xs text-gray-600">Every lesson with a video must provide a text transcript for deaf, hard-of-hearing, and reading-preferred students.</p>
                </div>

                <div className="p-3 bg-blue-50/40 rounded-xl border border-blue-100 space-y-1">
                  <p className="font-bold text-xs text-blue-950 flex items-center justify-between">
                    <span>8. Estimated Time is Set</span>
                    <span className="text-[10px] text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">COGA Obj 5</span>
                  </p>
                  <p className="text-xs text-gray-600">Displays reading/study duration beforehand so students can plan attention blocks without anxiety.</p>
                </div>

                <div className="p-3 bg-blue-50/40 rounded-xl border border-blue-100 space-y-1">
                  <p className="font-bold text-xs text-blue-950 flex items-center justify-between">
                    <span>9. Clean Semantic Spacing</span>
                    <span className="text-[10px] text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">WCAG 1.3.1</span>
                  </p>
                  <p className="text-xs text-gray-600">Prohibits empty &lt;p&gt;&lt;br&gt;&lt;/p&gt; spacers which disrupt screen readers; spacing must use CSS margins.</p>
                </div>

                <div className="p-3 bg-blue-50/40 rounded-xl border border-blue-100 space-y-1">
                  <p className="font-bold text-xs text-blue-950 flex items-center justify-between">
                    <span>10. Attention Session Pacing</span>
                    <span className="text-[10px] text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">COGA Pattern 5.1</span>
                  </p>
                  <p className="text-xs text-gray-600">Caps estimated lesson duration at ≤20 minutes to prevent cognitive exhaustion and working memory failure.</p>
                </div>

                <div className="p-3 bg-blue-50/40 rounded-xl border border-blue-100 space-y-1">
                  <p className="font-bold text-xs text-blue-950 flex items-center justify-between">
                    <span>11. Distraction-Free Focus Mode</span>
                    <span className="text-[10px] text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">WCAG 2.2.4 AAA</span>
                  </p>
                  <p className="text-xs text-gray-600">Lesson enables the learner to collapse extraneous course sidebars and read with zero peripheral movement.</p>
                </div>

                <div className="p-3 bg-blue-50/40 rounded-xl border border-blue-100 space-y-1">
                  <p className="font-bold text-xs text-blue-950 flex items-center justify-between">
                    <span>12. Content Broken Into Chunks</span>
                    <span className="text-[10px] text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">COGA Pattern 4.2</span>
                  </p>
                  <p className="text-xs text-gray-600">Enables pagination or bite-sized step views so readers take in 1 idea at a time.</p>
                </div>

                <div className="p-3 bg-blue-50/40 rounded-xl border border-blue-100 space-y-1">
                  <p className="font-bold text-xs text-blue-950 flex items-center justify-between">
                    <span>13. Interactive Checkpoints</span>
                    <span className="text-[10px] text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">COGA Obj 6</span>
                  </p>
                  <p className="text-xs text-gray-600">Requires at least one quiz, video question, flashcard, or reflection task (&ldquo;Something to do, not just read&rdquo;).</p>
                </div>

                <div className="p-3 bg-blue-50/40 rounded-xl border border-blue-100 space-y-1">
                  <p className="font-bold text-xs text-blue-950 flex items-center justify-between">
                    <span>14. No Unbroken Wall of Text</span>
                    <span className="text-[10px] text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">Max 150 words/p</span>
                  </p>
                  <p className="text-xs text-gray-600">Restricts paragraphs from exceeding word limits. Dense walls of unbroken text cause severe reading dropoff.</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Section 2: Deep Dive: The 3 Accessibility Focus Profiles ── */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div className="flex items-center gap-2 font-bold text-gray-950 text-base">
                <Target className="w-5 h-5 text-purple-600" />
                Comparison: How the 3 Profiles Differ in Auditing
              </div>
              <span className="text-xs text-gray-500">
                Selected Focus: <strong className="text-purple-700 capitalize">{currentFocus}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* ADHD Card */}
              <div className={`p-5 rounded-2xl border flex flex-col justify-between space-y-3 ${currentFocus === 'adhd' ? 'bg-purple-50/80 border-purple-300 ring-2 ring-purple-200' : 'bg-gray-50/70 border-gray-200'}`}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-sm text-purple-950 flex items-center gap-1.5">
                      🎯 ADHD Focus
                    </span>
                    {currentFocus === 'adhd' && <span className="text-[10px] bg-purple-200 text-purple-800 font-bold px-2 py-0.5 rounded-full">Current</span>}
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Designed for students with executive function differences, working memory constraints, and sustained attention challenges.
                  </p>
                  <div className="space-y-1.5 pt-2 border-t border-purple-100 text-xs">
                    <p className="font-bold text-purple-900">What the Auditor Checks Specifically:</p>
                    <ul className="space-y-1 text-gray-600 list-disc list-inside text-[11px]">
                      <li><strong>Duration:</strong> Strict maximum 20 min per lesson.</li>
                      <li><strong>Text Chunks:</strong> Max 150 words per continuous block.</li>
                      <li><strong>Active Recall:</strong> Requires interactive quizzes or video questions.</li>
                      <li><strong>Focus Mode &amp; Streaks:</strong> Mandates distraction-free view &amp; habit gamification.</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Dyslexia Card */}
              <div className={`p-5 rounded-2xl border flex flex-col justify-between space-y-3 ${currentFocus === 'dyslexia' ? 'bg-purple-50/80 border-purple-300 ring-2 ring-purple-200' : 'bg-gray-50/70 border-gray-200'}`}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-sm text-purple-950 flex items-center gap-1.5">
                      📖 Dyslexia Focus
                    </span>
                    {currentFocus === 'dyslexia' && <span className="text-[10px] bg-purple-200 text-purple-800 font-bold px-2 py-0.5 rounded-full">Current</span>}
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Designed for students with phonological decoding, visual crowding, and processing speed barriers.
                  </p>
                  <div className="space-y-1.5 pt-2 border-t border-purple-100 text-xs">
                    <p className="font-bold text-purple-900">What the Auditor Checks Specifically:</p>
                    <ul className="space-y-1 text-gray-600 list-disc list-inside text-[11px]">
                      <li><strong>Paragraph Length:</strong> Max 80 words per paragraph.</li>
                      <li><strong>Sentence Length:</strong> Max 30 words per sentence.</li>
                      <li><strong>Reading Grade:</strong> Automated Flesch–Kincaid formula target (Grade 8).</li>
                      <li><strong>Visual Noise:</strong> Max 15% italic/underline; requires lists &amp; TTS audio.</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Autism & Sensory Card */}
              <div className={`p-5 rounded-2xl border flex flex-col justify-between space-y-3 ${currentFocus === 'autism' ? 'bg-purple-50/80 border-purple-300 ring-2 ring-purple-200' : 'bg-gray-50/70 border-gray-200'}`}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-sm text-purple-950 flex items-center gap-1.5">
                      🧩 Autism &amp; Sensory
                    </span>
                    {currentFocus === 'autism' && <span className="text-[10px] bg-purple-200 text-purple-800 font-bold px-2 py-0.5 rounded-full">Current</span>}
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Designed for students requiring predictable routines, literal clarity, sensory calm, and structured milestones.
                  </p>
                  <div className="space-y-1.5 pt-2 border-t border-purple-100 text-xs">
                    <p className="font-bold text-purple-900">What the Auditor Checks Specifically:</p>
                    <ul className="space-y-1 text-gray-600 list-disc list-inside text-[11px]">
                      <li><strong>Learning Objectives:</strong> Minimum 2 explicit, listed goals.</li>
                      <li><strong>Plain Summary:</strong> Minimum 15 words simplified executive summary.</li>
                      <li><strong>Predictable Sequencing:</strong> Step-by-step progress timelines.</li>
                      <li><strong>Zero Sensory Surprises:</strong> No flashing animations or sudden changes.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Section 3: Context-Aware Rule Skipping ── */}
          <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-950 text-sm">
              <Lightbulb className="w-4 h-4 text-amber-600 shrink-0" />
              Why do some lessons show 10/10 while others show 8/9?
            </div>
            <p className="text-xs text-amber-900/90 leading-relaxed">
              The engine automatically skips inapplicable rules:
            </p>
            <ul className="text-xs text-amber-900/90 space-y-1.5 list-disc list-inside">
              <li>
                If a lesson contains a <strong>video</strong>, it is tested on all <strong>10 rules</strong> (including &ldquo;Video has a transcript&rdquo;).
              </li>
              <li>
                If a lesson has <strong>no video</strong> (text-only), the transcript rule is <strong>automatically excluded</strong>. The lesson is graded out of <strong>9 applicable rules</strong> so you are never penalized unfairly.
              </li>
            </ul>
          </div>

          {/* ── Section 4: Score Thresholds & Action Steps ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-3 bg-green-50/70 border border-green-200 rounded-xl text-xs space-y-1">
              <p className="font-bold text-green-900 flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-green-600" /> 80% – 100% (Compliant)</p>
              <p className="text-gray-600">Course is accessible and approved for publishing to students.</p>
            </div>
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-1">
              <p className="font-bold text-amber-900 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-amber-600" /> 50% – 79% (Warning)</p>
              <p className="text-gray-600">Has non-critical items (e.g. paragraph length, missing lists) to tune.</p>
            </div>
            <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl text-xs space-y-1">
              <p className="font-bold text-rose-900 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-rose-600" /> 0% – 49% (Blocker)</p>
              <p className="text-gray-600">Has severe blockers (empty lesson content, missing video transcripts).</p>
            </div>
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
