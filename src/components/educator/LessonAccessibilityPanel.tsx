'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Accessibility,
  AlertTriangle,
  BookOpen,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Loader2,
  MinusCircle,
  Wand2,
} from 'lucide-react';
import {
  scoreBand,
  type AuditRule,
  type AuditTab,
  type ImageInfo,
  type LessonAuditResult,
} from '@/lib/accessibility-audit';
import type { ProfileGuide } from '@/lib/accessibility-profiles';

const TAB_LABELS: Record<AuditTab, string> = {
  basics: 'Basics',
  content: 'Content',
  media: 'Media',
  activities: 'Activities',
  quiz: 'Quiz',
  assets: 'Resources',
  settings: 'Settings',
  accessibility: 'Accessibility',
};

const BAND_STYLES = {
  critical: { text: 'text-rose-700', ring: 'stroke-rose-500', chipBg: 'bg-rose-50', chipBorder: 'border-rose-200' },
  warning: { text: 'text-amber-700', ring: 'stroke-amber-500', chipBg: 'bg-amber-50', chipBorder: 'border-amber-200' },
  good: { text: 'text-emerald-700', ring: 'stroke-emerald-500', chipBg: 'bg-emerald-50', chipBorder: 'border-emerald-200' },
} as const;

function ScoreRing({ score }: { score: number }) {
  const band = BAND_STYLES[scoreBand(score)];
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(100, Math.max(0, score)) / 100);
  return (
    <div className="relative w-[76px] h-[76px] shrink-0">
      <svg viewBox="0 0 76 76" className="w-full h-full -rotate-90">
        <circle cx="38" cy="38" r={radius} fill="none" strokeWidth="7" className="stroke-gray-200" />
        <circle
          cx="38"
          cy="38"
          r={radius}
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`${band.ring} transition-[stroke-dashoffset] duration-500`}
        />
      </svg>
      <div className={`absolute inset-0 flex items-center justify-center font-black text-lg ${band.text}`}>
        {score}%
      </div>
    </div>
  );
}

function MetricBar({
  metric,
  passed,
}: {
  metric: NonNullable<AuditRule['metric']>;
  /**
   * Colour follows the rule's own verdict, not the raw number. A rule can pass
   * on another route — "22 words plus a video" satisfies the content rule even
   * though 22 is under the 50-word bar — and an amber bar under a green tick
   * would just look like a contradiction.
   */
  passed: boolean;
}) {
  const { value, target, unit, direction } = metric;
  const ceiling = Math.max(value, target) || 1;
  const valuePct = Math.min(100, (value / ceiling) * 100);
  const targetPct = Math.min(100, (target / ceiling) * 100);
  const withinTarget = passed;
  return (
    <div className="mt-2.5">
      <div className="relative h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${withinTarget ? 'bg-emerald-500' : 'bg-amber-500'}`}
          style={{ width: `${valuePct}%` }}
        />
        <div className="absolute inset-y-[-3px] w-0.5 bg-gray-500" style={{ left: `${targetPct}%` }} />
      </div>
      <p className="text-[11px] text-gray-500 mt-1 tabular-nums">
        {value} {unit} &middot; {direction === 'max' ? 'limit' : 'minimum'} {target}
      </p>
    </div>
  );
}

interface RuleCardProps {
  rule: AuditRule;
  busy: boolean;
  onFix: (rule: AuditRule) => void;
  onJump: (tab: AuditTab) => void;
}

function FailingCard({ rule, busy, onFix, onJump }: RuleCardProps) {
  return (
    <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex gap-3 min-w-0">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
          <div className="min-w-0">
            <p className="font-bold text-gray-950 text-sm flex flex-wrap items-center gap-2">
              {rule.title}
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wide ${
                  rule.severity === 'required'
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {rule.severity}
              </span>
            </p>
            <p className="text-xs text-gray-700 mt-1 leading-relaxed">{rule.detail}</p>
            <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">
              <span className="font-semibold text-gray-600">Standard:</span> {rule.requirement}
            </p>
            {rule.metric && <MetricBar metric={rule.metric} passed={false} />}
          </div>
        </div>
        <div className="shrink-0 flex gap-2 sm:flex-col sm:items-end">
          {rule.fix && (
            <Button
              size="sm"
              disabled={busy}
              onClick={() => onFix(rule)}
              className="h-8 text-xs font-semibold px-3 bg-purple-600 hover:bg-purple-700 text-white gap-1.5 whitespace-nowrap"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
              {rule.fix.label}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => onJump(rule.tab)}
            className="h-8 text-xs font-medium px-3 gap-1 whitespace-nowrap"
          >
            {TAB_LABELS[rule.tab]}
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
      <p className="text-[10px] text-gray-400 mt-2.5 pl-8">{rule.source}</p>
    </div>
  );
}

/**
 * Lists every image in the lesson so descriptions can be written right here,
 * next to the finding that asked for them. Sending the educator to the Content
 * tab is not enough — the rich text editor has nowhere to type alt text.
 */
function ImageDescriptions({
  images,
  onChange,
}: {
  images: ImageInfo[];
  onChange: (index: number, alt: string) => void;
}) {
  const undescribed = images.filter((img) => img.alt === null || img.alt.trim() === '').length;

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/70">
        <h4 className="text-sm font-bold text-gray-900">Image descriptions</h4>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
          {undescribed === 0
            ? 'Every image in this lesson has a description.'
            : `${undescribed} of ${images.length} still need one. Describe what the image shows, as if reading the lesson aloud to someone who cannot see it.`}
        </p>
      </div>
      <div className="divide-y divide-gray-100">
        {images.map((img, index) => {
          const missing = img.alt === null || img.alt.trim() === '';
          return (
            <div key={`${img.src}-${index}`} className="flex gap-3 p-3 items-start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.src}
                alt=""
                className="w-16 h-16 object-contain rounded-lg border border-gray-200 bg-gray-50 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <input
                  type="text"
                  value={img.alt ?? ''}
                  onChange={(e) => onChange(index, e.target.value)}
                  placeholder="e.g. A black and white dairy cow standing in a field"
                  aria-label={`Description for image ${index + 1}`}
                  className={`w-full px-3 py-2 text-sm rounded-lg border outline-none transition-colors focus:ring-2 ${
                    missing
                      ? 'border-amber-300 bg-amber-50/40 focus:ring-amber-200'
                      : 'border-gray-200 focus:ring-purple-200'
                  }`}
                />
                <p className="text-[11px] text-gray-400 mt-1 truncate">
                  {missing ? 'No description yet' : 'Described'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface Props {
  result: LessonAuditResult;
  guide: ProfileGuide;
  /** False when the course has no Primary Accessibility Focus selected. */
  focusIsSet: boolean;
  notes: string;
  onNotesChange: (value: string) => void;
  /** Images found in the lesson content, in document order. */
  images: ImageInfo[];
  /** Writes alt text onto the nth image of the lesson content. */
  onImageAltChange: (index: number, alt: string) => void;
  onFix: (rule: AuditRule) => void;
  onJump: (tab: AuditTab) => void;
  onOpenGuide: () => void;
  /** Id of the rule whose fix is currently being applied. */
  busyRuleId: string | null;
  /** Hidden in the course-builder wizard, where there is no course row yet. */
  showNotesField?: boolean;
}

export function LessonAccessibilityPanel({
  result,
  guide,
  focusIsSet,
  notes,
  onNotesChange,
  images,
  onImageAltChange,
  onFix,
  onJump,
  onOpenGuide,
  busyRuleId,
  showNotesField = true,
}: Props) {
  const [showPassing, setShowPassing] = useState(false);
  const [showSkipped, setShowSkipped] = useState(false);

  const failing = result.rules.filter((r) => r.status === 'fail');
  const passing = result.rules.filter((r) => r.status === 'pass');
  const skipped = result.rules.filter((r) => r.status === 'not_applicable');
  const band = BAND_STYLES[scoreBand(result.score)];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Scorecard ── */}
      <div className={`p-5 rounded-2xl border ${band.chipBorder} ${band.chipBg}`}>
        <div className="flex items-start gap-5">
          <ScoreRing score={result.score} />
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-gray-950 flex items-center gap-2">
              <Accessibility className="w-5 h-5 text-purple-600" />
              Accessibility check
            </h3>
            <p className="text-sm text-gray-700 mt-1">
              {result.passed} of {result.applicable} standards met for the{' '}
              <span className="font-semibold text-purple-700">{guide.label}</span> profile.
            </p>
            <p className="text-xs text-gray-500 mt-1.5 italic">&ldquo;{guide.principle}&rdquo;</p>
            <button
              type="button"
              onClick={onOpenGuide}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 hover:text-purple-900 hover:underline"
            >
              <BookOpen className="w-3.5 h-3.5" />
              What does the {guide.label} profile need?
            </button>
          </div>
        </div>

        {!focusIsSet && (
          <div className="mt-4 p-3 rounded-lg bg-white border border-gray-200">
            <p className="text-xs text-gray-700 leading-relaxed">
              <span className="font-semibold">No Primary Accessibility Focus is set on this course.</span>{' '}
              These are the general baseline standards. Choose a focus in the course Settings tab to
              check against the targeted ADHD, autism or dyslexia standards instead.
            </p>
          </div>
        )}

        {result.requiredFailures.length > 0 && (
          <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-white border border-rose-200">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <p className="text-xs text-gray-700 leading-relaxed">
              {result.requiredFailures.length === 1
                ? '1 required standard is not met yet.'
                : `${result.requiredFailures.length} required standards are not met yet.`}{' '}
              You can still save and publish this lesson &mdash; this is guidance, not a gate.
            </p>
          </div>
        )}
      </div>

      {/* ── Needs attention ── */}
      {failing.length > 0 ? (
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
            Needs attention ({failing.length})
          </h4>
          {failing.map((rule) => (
            <FailingCard
              key={rule.id}
              rule={rule}
              busy={busyRuleId === rule.id}
              onFix={onFix}
              onJump={onJump}
            />
          ))}
        </div>
      ) : (
        <div className="p-6 rounded-xl border border-emerald-200 bg-emerald-50/40 flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0" />
          <div>
            <p className="font-bold text-emerald-950 text-sm">Every applicable standard is met.</p>
            <p className="text-xs text-emerald-900/70 mt-0.5">
              This lesson meets all {guide.label} standards the auditor can check automatically.
            </p>
          </div>
        </div>
      )}

      {/* ── Passing ── */}
      {passing.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowPassing((v) => !v)}
            className="w-full flex items-center gap-2 text-sm font-bold text-gray-500 uppercase tracking-wider hover:text-gray-700"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${showPassing ? '' : '-rotate-90'}`} />
            Passing ({passing.length})
          </button>
          {showPassing && (
            <div className="mt-3 space-y-2">
              {passing.map((rule) => (
                <div
                  key={rule.id}
                  className="p-3 rounded-lg border border-emerald-100 bg-emerald-50/30 flex gap-3"
                >
                  <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{rule.title}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{rule.detail}</p>
                    {rule.metric && <MetricBar metric={rule.metric} passed />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Not applicable ── */}
      {skipped.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowSkipped((v) => !v)}
            className="w-full flex items-center gap-2 text-sm font-bold text-gray-400 uppercase tracking-wider hover:text-gray-600"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${showSkipped ? '' : '-rotate-90'}`} />
            Not applicable ({skipped.length})
          </button>
          {showSkipped && (
            <div className="mt-3 space-y-2">
              {skipped.map((rule) => (
                <div key={rule.id} className="p-3 rounded-lg border border-gray-100 bg-gray-50/60 flex gap-3">
                  <MinusCircle className="w-4 h-4 shrink-0 mt-0.5 text-gray-400" />
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-700 text-sm">{rule.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{rule.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-[11px] text-gray-400 mt-3 leading-relaxed">
            Skipped standards are excluded from the score, so a lesson without a video is never
            penalised for having no transcript.
          </p>
        </div>
      )}

      {/* ── Image descriptions ── */}
      {images.length > 0 && (
        <div className="pt-5 border-t border-gray-100">
          <ImageDescriptions images={images} onChange={onImageAltChange} />
        </div>
      )}

      {/* ── Support notes ── */}
      {showNotesField && (
        <div className="pt-5 border-t border-gray-100">
          <label htmlFor="lesson-accessibility-notes" className="block text-sm font-semibold text-gray-900 mb-1">
            Support notes for this lesson
          </label>
          <p className="text-xs text-gray-500 mb-2.5">
            Accommodations, known sticking points, anything a colleague delivering this lesson would
            need to know. Not shown to learners.
          </p>
          <Textarea
            id="lesson-accessibility-notes"
            value={notes}
            onChange={(event) => onNotesChange(event.target.value)}
            placeholder="e.g. Read the worked example aloud before learners attempt the activity."
            className="min-h-[96px] resize-y text-sm"
          />
        </div>
      )}
    </div>
  );
}
