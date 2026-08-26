'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  Target,
  BookOpen,
  Volume2,
  Sliders,
  CheckCircle,
  Eye,
  Layout,
  Flame,
  Clock,
  Zap,
  CheckSquare,
  ShieldCheck,
  Palette,
  ArrowRight,
} from 'lucide-react';

interface AccessibilityRecommendationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyPreset: (presetId: string) => void;
  activePreset?: string;
}

export function AccessibilityRecommendationsDialog({
  open,
  onOpenChange,
  onApplyPreset,
  activePreset = 'adhd',
}: AccessibilityRecommendationsDialogProps) {
  const [selectedTab, setSelectedTab] = useState<'adhd' | 'dyslexia' | 'autism'>(
    activePreset === 'dyslexia' ? 'dyslexia' : activePreset === 'autism' ? 'autism' : 'adhd'
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl md:max-w-5xl w-[96vw] max-h-[90vh] overflow-y-auto p-6 sm:p-8">
        <DialogHeader className="border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-100 rounded-2xl">
              <Sparkles className="w-6 h-6 text-purple-700" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black text-gray-950">
                Recommended Accessibility Specs &amp; Rationale
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-gray-500 mt-0.5">
                Scientifically-backed configuration recommendations tailored for neurodiverse learners, including why each setting helps.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Profile Switcher Tabs */}
        <div className="flex flex-wrap gap-2 pt-2 border-b border-gray-100 pb-4">
          <button
            type="button"
            onClick={() => setSelectedTab('adhd')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
              selectedTab === 'adhd'
                ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-300'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Target className="w-4 h-4" />
            🎯 ADHD Profile
          </button>

          <button
            type="button"
            onClick={() => setSelectedTab('dyslexia')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
              selectedTab === 'dyslexia'
                ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-300'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            📖 Dyslexia Profile
          </button>

          <button
            type="button"
            onClick={() => setSelectedTab('autism')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
              selectedTab === 'autism'
                ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-300'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Zap className="w-4 h-4" />
            🧩 Autism &amp; Sensory Profile
          </button>
        </div>

        {/* Tab Content */}
        <div className="space-y-6 pt-2">
          {/* ── 🎯 ADHD TAB ── */}
          {selectedTab === 'adhd' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Header Goal Banner */}
              <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-black text-purple-950 text-base flex items-center gap-2">
                    🎯 ADHD Focus &amp; Attention Protection
                  </h3>
                  <p className="text-xs text-purple-900/90 mt-1 leading-relaxed">
                    Designed to minimize cognitive fatigue, prevent attention wandering, protect working memory, and sustain executive momentum.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    onApplyPreset('adhd');
                    onOpenChange(false);
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-4 shrink-0 shadow-xs"
                >
                  Apply ADHD Specs <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </div>

              {/* Recommended Specs Grid */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-gray-500 uppercase tracking-wider">
                  Recommended Configuration Specs:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                    <p className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <Layout className="w-4 h-4 text-purple-600" /> Chunked Content Mode
                    </p>
                    <p className="text-xs text-purple-700 font-semibold">Spec: Active (Micro-steps)</p>
                    <p className="text-[11px] text-gray-500">Presents lesson content in bite-sized chunks rather than an intimidating long scroll.</p>
                  </div>

                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                    <p className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <Eye className="w-4 h-4 text-purple-600" /> Reading Spotlight / Ruler
                    </p>
                    <p className="text-xs text-purple-700 font-semibold">Spec: Enabled</p>
                    <p className="text-[11px] text-gray-500">Darkens surrounding paragraphs to anchor the eyes onto the active reading line.</p>
                  </div>

                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                    <p className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-purple-600" /> Distraction-Free View
                    </p>
                    <p className="text-xs text-purple-700 font-semibold">Spec: Enabled</p>
                    <p className="text-[11px] text-gray-500">Collapses course sidebars, banners, and auxiliary widgets during study.</p>
                  </div>

                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                    <p className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <CheckSquare className="w-4 h-4 text-purple-600" /> Task Checklist &amp; Timeline
                    </p>
                    <p className="text-xs text-purple-700 font-semibold">Spec: Enabled</p>
                    <p className="text-[11px] text-gray-500">Interactive step-by-step checklist providing frequent dopamine checkpoint rewards.</p>
                  </div>

                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                    <p className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <Palette className="w-4 h-4 text-purple-600" /> Background Tint &amp; Font
                    </p>
                    <p className="text-xs text-purple-700 font-semibold">Spec: Soft Grey / Arial 18px</p>
                    <p className="text-[11px] text-gray-500">1.6x line spacing + 20% word spacing to prevent line skipping.</p>
                  </div>

                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                    <p className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-purple-600" /> Auto-Save &amp; Streaks
                    </p>
                    <p className="text-xs text-purple-700 font-semibold">Spec: Continuous</p>
                    <p className="text-[11px] text-gray-500">Saves responses constantly so attention shifts never result in lost work.</p>
                  </div>
                </div>
              </div>

              {/* Why It Helps - Detailed Breakdown */}
              <div className="p-4 bg-white rounded-2xl border border-gray-200 space-y-3 shadow-2xs">
                <h4 className="text-sm font-bold text-gray-950 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" /> Why These Settings Help ADHD Learners:
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-600 leading-relaxed">
                  <div className="p-3 bg-purple-50/30 rounded-xl border border-purple-100">
                    <p className="font-bold text-purple-950 mb-1">1. Reduces Working Memory Load</p>
                    ADHD learners have temporary working memory constraints. Long scrolling pages create cognitive panic. Chunking information into short micro-steps allows the brain to process one concept completely before advancing.
                  </div>

                  <div className="p-3 bg-purple-50/30 rounded-xl border border-purple-100">
                    <p className="font-bold text-purple-950 mb-1">2. Prevents Visual Eye Drifting</p>
                    The Reading Spotlight acts as an overlay guide that keeps the visual focus anchored, stopping involuntary eye jumping to bottom paragraphs or peripheral screen items.
                  </div>

                  <div className="p-3 bg-purple-50/30 rounded-xl border border-purple-100">
                    <p className="font-bold text-purple-950 mb-1">3. Combats Peripheral Over-Stimulation</p>
                    Distraction-free mode eliminates side menus and visual noise, lowering the brain energy required to ignore irrelevant interface elements.
                  </div>

                  <div className="p-3 bg-purple-50/30 rounded-xl border border-purple-100">
                    <p className="font-bold text-purple-950 mb-1">4. Sustains Dopamine with Checkpoints</p>
                    Micro-task checklists and progress timelines offer visual proof of completion, generating positive feedback loops that prevent motivation crashes.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── 📖 DYSLEXIA TAB ── */}
          {selectedTab === 'dyslexia' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Header Goal Banner */}
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-black text-amber-950 text-base flex items-center gap-2">
                    📖 Dyslexia Visual &amp; Phonological Decoding
                  </h3>
                  <p className="text-xs text-amber-900/90 mt-1 leading-relaxed">
                    Designed to eliminate visual crowding, reduce letter inversions ($b/d/p/q$), ease scotopic glare, and provide dual-coding audio support.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    onApplyPreset('dyslexia');
                    onOpenChange(false);
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-4 shrink-0 shadow-xs"
                >
                  Apply Dyslexia Specs <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </div>

              {/* Recommended Specs Grid */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-gray-500 uppercase tracking-wider">
                  Recommended Configuration Specs:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                    <p className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-purple-600" /> Font Typography
                    </p>
                    <p className="text-xs text-purple-700 font-semibold">Spec: Atkinson Hyperlegible / OpenDyslexic</p>
                    <p className="text-[11px] text-gray-500">Distinct letter stems and weighted baselines stop letter flipping.</p>
                  </div>

                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                    <p className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-purple-600" /> Sizing &amp; Spacing
                    </p>
                    <p className="text-xs text-purple-700 font-semibold">Spec: 19px • 1.7x Line • +40% Word</p>
                    <p className="text-[11px] text-gray-500">Expanded spacing eliminates the &ldquo;crowding effect&rdquo; where letters blur together.</p>
                  </div>

                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                    <p className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <Palette className="w-4 h-4 text-purple-600" /> Background Tint
                    </p>
                    <p className="text-xs text-purple-700 font-semibold">Spec: Soft Cream / Light Yellow</p>
                    <p className="text-[11px] text-gray-500">Mutes harsh stark white background glare (Meares-Irlen syndrome relief).</p>
                  </div>

                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                    <p className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <Volume2 className="w-4 h-4 text-purple-600" /> Text-to-Speech (TTS)
                    </p>
                    <p className="text-xs text-purple-700 font-semibold">Spec: Enabled (Dual-Coding)</p>
                    <p className="text-[11px] text-gray-500">Simultaneous spoken voice narration while reading text aloud.</p>
                  </div>

                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                    <p className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <Eye className="w-4 h-4 text-purple-600" /> Reading Spotlight Guide
                    </p>
                    <p className="text-xs text-purple-700 font-semibold">Spec: Enabled</p>
                    <p className="text-[11px] text-gray-500">Acts as a digital reading finger/ruler to keep track of the current line.</p>
                  </div>

                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                    <p className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <Layout className="w-4 h-4 text-purple-600" /> Chunked Layout
                    </p>
                    <p className="text-xs text-purple-700 font-semibold">Spec: Chunked Micro-View</p>
                    <p className="text-[11px] text-gray-500">Short paragraphs (&lt;80 words) and list formatting to avoid walls of text.</p>
                  </div>
                </div>
              </div>

              {/* Why It Helps - Detailed Breakdown */}
              <div className="p-4 bg-white rounded-2xl border border-gray-200 space-y-3 shadow-2xs">
                <h4 className="text-sm font-bold text-gray-950 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" /> Why These Settings Help Dyslexic Learners:
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-600 leading-relaxed">
                  <div className="p-3 bg-amber-50/30 rounded-xl border border-amber-100">
                    <p className="font-bold text-amber-950 mb-1">1. Prevents Letter Confusion &amp; Swapping</p>
                    Dyslexia-friendly typefaces (like Atkinson Hyperlegible) have uniquely distinguishable glyphs for easily confused pairs like <strong>b/d</strong>, <strong>p/q</strong>, and <strong>I/l/1</strong>.
                  </div>

                  <div className="p-3 bg-amber-50/30 rounded-xl border border-amber-100">
                    <p className="font-bold text-amber-950 mb-1">2. Alleviates Visual Crowding &amp; Swimming</p>
                    Increased letter and line spacing prevents words from visually blurring into the lines above and below, allowing comfortable saccadic eye tracking.
                  </div>

                  <div className="p-3 bg-amber-50/30 rounded-xl border border-amber-100">
                    <p className="font-bold text-amber-950 mb-1">3. Eliminates Glare &amp; Visual Stress</p>
                    High contrast black-on-stark-white creates vibrating optical glare. Warm cream tints calm optical nerves, letting learners read for extended periods without headaches.
                  </div>

                  <div className="p-3 bg-amber-50/30 rounded-xl border border-amber-100">
                    <p className="font-bold text-amber-950 mb-1">4. Dual-Coding Audio Reinforcement</p>
                    Listening to spoken audio while reading printed words bypasses phonological bottlenecking and dramatically improves reading comprehension.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── 🧩 AUTISM & SENSORY TAB ── */}
          {selectedTab === 'autism' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Header Goal Banner */}
              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-black text-blue-950 text-base flex items-center gap-2">
                    🧩 Autism &amp; Sensory Overload Protection
                  </h3>
                  <p className="text-xs text-blue-900/90 mt-1 leading-relaxed">
                    Designed to provide structural predictability, remove sensory shock triggers (animations, sudden audio), and deliver clear step objectives.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    onApplyPreset('autism');
                    onOpenChange(false);
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-4 shrink-0 shadow-xs"
                >
                  Apply Autism Specs <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </div>

              {/* Recommended Specs Grid */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-gray-500 uppercase tracking-wider">
                  Recommended Configuration Specs:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                    <p className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-purple-600" /> Animations Level
                    </p>
                    <p className="text-xs text-purple-700 font-semibold">Spec: None / Zero Transitions</p>
                    <p className="text-[11px] text-gray-500">Stops motion sickness and prevents sudden sensory trigger reactions.</p>
                  </div>

                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                    <p className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <Palette className="w-4 h-4 text-purple-600" /> Color &amp; Background Tint
                    </p>
                    <p className="text-xs text-purple-700 font-semibold">Spec: Pale Blue / Muted Colors</p>
                    <p className="text-[11px] text-gray-500">Soft cool tones provide psychological calmness and prevent sensory overload.</p>
                  </div>

                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                    <p className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-purple-600" /> Visual Schedule
                    </p>
                    <p className="text-xs text-purple-700 font-semibold">Spec: Enabled</p>
                    <p className="text-[11px] text-gray-500">Shows all steps, sections, and remaining time upfront for complete predictability.</p>
                  </div>

                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                    <p className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <CheckSquare className="w-4 h-4 text-purple-600" /> Step-by-Step Guidance
                    </p>
                    <p className="text-xs text-purple-700 font-semibold">Spec: Enabled</p>
                    <p className="text-[11px] text-gray-500">Provides clear sequential milestones without unexpected branching.</p>
                  </div>

                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                    <p className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <Layout className="w-4 h-4 text-purple-600" /> Layout &amp; Structure
                    </p>
                    <p className="text-xs text-purple-700 font-semibold">Spec: Scroll + Checklist Structure</p>
                    <p className="text-[11px] text-gray-500">Ensures linear, predictable flow with explicit learning objectives.</p>
                  </div>

                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                    <p className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <Volume2 className="w-4 h-4 text-purple-600" /> Audio &amp; Captions
                    </p>
                    <p className="text-xs text-purple-700 font-semibold">Spec: Captions On, No Autoplay</p>
                    <p className="text-[11px] text-gray-500">Zero involuntary sound effects or loud alerts that could trigger sensory distress.</p>
                  </div>
                </div>
              </div>

              {/* Why It Helps - Detailed Breakdown */}
              <div className="p-4 bg-white rounded-2xl border border-gray-200 space-y-3 shadow-2xs">
                <h4 className="text-sm font-bold text-gray-950 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" /> Why These Settings Help Autistic Learners:
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-600 leading-relaxed">
                  <div className="p-3 bg-blue-50/30 rounded-xl border border-blue-100">
                    <p className="font-bold text-blue-950 mb-1">1. Prevents Sensory Over-Arousal &amp; Meltdowns</p>
                    Autistic individuals process visual and auditory sensory inputs with heightened intensity. Disabling animations and muting harsh saturation prevents neurological overload.
                  </div>

                  <div className="p-3 bg-blue-50/30 rounded-xl border border-blue-100">
                    <p className="font-bold text-blue-950 mb-1">2. Eradicates Ambiguity &amp; Uncertainty Anxiety</p>
                    Visual schedules and step-by-step progress bars make the learning sequence 100% predictable, reassuring the student about what to expect next.
                  </div>

                  <div className="p-3 bg-blue-50/30 rounded-xl border border-blue-100">
                    <p className="font-bold text-blue-950 mb-1">3. Calming Color Environment</p>
                    Cool pale blue tints and low-contrast settings create an emotionally safe, calm interface that reduces environmental stress.
                  </div>

                  <div className="p-3 bg-blue-50/30 rounded-xl border border-blue-100">
                    <p className="font-bold text-blue-950 mb-1">4. Literal, Structured Checkpoints</p>
                    Checklist structure mode strips ambiguous idioms and provides straightforward, sequential goal criteria.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 pt-4 mt-4 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            You can customize any individual slider after applying a recommended preset.
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs font-semibold"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
