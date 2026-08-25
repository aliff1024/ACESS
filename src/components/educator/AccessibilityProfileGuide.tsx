'use client';

import { CheckCircle2, ExternalLink, Eye, Lightbulb } from 'lucide-react';
import type { ProfileGuide } from '@/lib/accessibility-profiles';

const TONES = {
  amber: { border: 'border-amber-200', head: 'text-amber-900', dot: 'bg-amber-400', soft: 'bg-amber-50/60' },
  sky: { border: 'border-sky-200', head: 'text-sky-900', dot: 'bg-sky-400', soft: 'bg-sky-50/60' },
  indigo: { border: 'border-indigo-200', head: 'text-indigo-900', dot: 'bg-indigo-400', soft: 'bg-indigo-50/60' },
  slate: { border: 'border-slate-200', head: 'text-slate-900', dot: 'bg-slate-400', soft: 'bg-slate-50/60' },
} as const;

/**
 * Explains what a focus profile actually needs and why, so the audit result
 * reads as guidance rather than a list of arbitrary rules. Content comes from
 * PROFILE_GUIDES, which reads its numbers from the same THRESHOLDS the engine
 * enforces — the guide can never disagree with the checker.
 */
export function AccessibilityProfileGuide({ guide }: { guide: ProfileGuide }) {
  const tone = TONES[guide.tone];

  return (
    <div className="space-y-4">
      <div className={`rounded-2xl border ${tone.border} ${tone.soft} p-5`}>
        <h4 className={`font-bold text-lg ${tone.head}`}>{guide.label}</h4>
        <p className="text-sm text-gray-700 mt-1.5 leading-relaxed">{guide.principle}</p>
      </div>

      {guide.needs.map((need, index) => (
        <div key={need.barrier} className={`rounded-2xl border ${tone.border} bg-white p-5`}>
          <div className="flex items-start gap-3">
            <span
              className={`shrink-0 w-6 h-6 rounded-full ${tone.dot} text-white text-xs font-bold flex items-center justify-center mt-0.5`}
            >
              {index + 1}
            </span>
            <div className="min-w-0">
              <h5 className={`font-bold text-sm ${tone.head}`}>{need.barrier}</h5>

              <div className="mt-3 flex gap-2.5">
                <Eye className="w-4 h-4 shrink-0 mt-0.5 text-gray-400" />
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    What the learner experiences
                  </p>
                  <p className="text-sm text-gray-700 mt-1 leading-relaxed">{need.experience}</p>
                </div>
              </div>

              <div className="mt-4 flex gap-2.5">
                <Lightbulb className="w-4 h-4 shrink-0 mt-0.5 text-gray-400" />
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    What to do instead
                  </p>
                  <ul className="mt-1.5 space-y-1.5">
                    {need.practices.map((practice) => (
                      <li key={practice} className="flex items-start gap-2 text-sm text-gray-700">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-1 text-emerald-500" />
                        <span className="leading-relaxed">{practice}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {need.enforcedBy.length > 0 && (
                <p className="text-[11px] text-gray-400 mt-3.5 pl-6 leading-relaxed">
                  {need.enforcedBy.length === 1
                    ? 'Checked automatically by 1 standard in the Accessibility tab.'
                    : `Checked automatically by ${need.enforcedBy.length} standards in the Accessibility tab.`}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}

      <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-5">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">
          Where these standards come from
        </p>
        <ul className="space-y-2">
          {guide.references.map((reference) => (
            <li key={reference.url}>
              <a
                href={reference.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-purple-700 hover:text-purple-900 hover:underline inline-flex items-start gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{reference.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
