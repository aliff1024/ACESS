'use client';

import { useState } from 'react';
import { ExternalLink, CheckCircle2, MinusCircle } from 'lucide-react';
import {
  auditLesson,
  EMPTY_SUBJECT,
  type AuditTab,
  type FocusProfile,
} from '@/lib/accessibility-audit';
import { PROFILE_GUIDES } from '@/lib/accessibility-profiles';

/**
 * Reads the exact rule set the engine enforces for each profile, straight from
 * auditLesson against an empty subject. The list can never drift from what the
 * checker actually runs, because it *is* what the checker runs.
 */
function rulesFor(profile: FocusProfile) {
  return auditLesson(EMPTY_SUBJECT, profile).rules;
}

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

const PROFILES: { id: FocusProfile; short: string }[] = [
  { id: 'adhd', short: 'ADHD' },
  { id: 'autism', short: 'Autism' },
  { id: 'dyslexia', short: 'Dyslexia' },
  { id: 'general', short: 'General' },
];

const TONES: Record<'amber' | 'sky' | 'indigo' | 'slate', { active: string; head: string; badge: string }> = {
  amber: { active: 'bg-amber-100 text-amber-900 border-amber-300', head: 'text-amber-900', badge: 'bg-amber-100 text-amber-800' },
  sky: { active: 'bg-sky-100 text-sky-900 border-sky-300', head: 'text-sky-900', badge: 'bg-sky-100 text-sky-800' },
  indigo: { active: 'bg-indigo-100 text-indigo-900 border-indigo-300', head: 'text-indigo-900', badge: 'bg-indigo-100 text-indigo-800' },
  slate: { active: 'bg-slate-100 text-slate-900 border-slate-300', head: 'text-slate-900', badge: 'bg-slate-100 text-slate-800' },
};

export function AllProfilesGuide({ initialProfile = 'general' }: { initialProfile?: FocusProfile }) {
  const [active, setActive] = useState<FocusProfile>(initialProfile);
  const guide = PROFILE_GUIDES[active];
  const tone = TONES[guide.tone];
  const rules = rulesFor(active);

  // Split baseline vs profile-specific. Baseline rule ids all start with "base_".
  const baseline = rules.filter((r) => r.id.startsWith('base_'));
  const specific = rules.filter((r) => !r.id.startsWith('base_'));

  return (
    <div className="space-y-4">
      {/* Profile tabs */}
      <div role="tablist" aria-label="Focus profile" className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        {PROFILES.map((p) => {
          const g = PROFILE_GUIDES[p.id];
          const isActive = active === p.id;
          const t = TONES[g.tone];
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(p.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                isActive ? t.active : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {p.short}
              <span className="ml-1.5 opacity-60 tabular-nums">
                {rulesFor(p.id).length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Principle */}
      <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
        <h4 className={`font-bold text-base ${tone.head}`}>{guide.label}</h4>
        <p className="text-sm text-gray-700 mt-1 leading-relaxed">{guide.principle}</p>
        <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
          {baseline.length} shared baseline checks + {specific.length} {guide.label} specific ={' '}
          {rules.length} total.
        </p>
      </div>

      {/* Baseline */}
      <div>
        <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
          Shared baseline ({baseline.length})
        </h5>
        <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">
          Every lesson is checked against these, regardless of profile.
        </p>
        <ul className="space-y-2">
          {baseline.map((r) => (
            <li key={r.id} className="rounded-lg border border-gray-200 bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 flex flex-wrap items-center gap-2">
                    {r.title}
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wide ${
                        r.severity === 'required'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {r.severity}
                    </span>
                  </p>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">{r.requirement}</p>
                  <p className="text-[10px] text-gray-400 mt-1.5">{r.source}</p>
                </div>
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-md bg-gray-100 text-gray-600">
                  Fix in {TAB_LABELS[r.tab]}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Profile-specific */}
      <div>
        <h5 className={`text-xs font-bold uppercase tracking-wider mb-2 ${tone.head}`}>
          {guide.label} specific ({specific.length})
        </h5>
        <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">
          Extra checks that target how {guide.label === 'General accessibility' ? 'all learners' : `${guide.label} learners`} actually experience a lesson.
        </p>
        <ul className="space-y-2">
          {specific.map((r) => (
            <li key={r.id} className="rounded-lg border border-gray-200 bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 flex flex-wrap items-center gap-2">
                    {r.title}
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wide ${
                        r.severity === 'required'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {r.severity}
                    </span>
                  </p>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">{r.requirement}</p>
                  <p className="text-[10px] text-gray-400 mt-1.5">{r.source}</p>
                </div>
                <span className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-md ${tone.badge}`}>
                  Fix in {TAB_LABELS[r.tab]}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Barriers (narrative) */}
      <div>
        <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
          Why {guide.label === 'General accessibility' ? 'baseline accessibility' : guide.label} matters
        </h5>
        <ul className="space-y-2.5">
          {guide.needs.map((need) => (
            <li key={need.barrier} className="rounded-lg border border-gray-200 bg-white p-3">
              <p className="text-sm font-semibold text-gray-900">{need.barrier}</p>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">{need.experience}</p>
              <ul className="mt-2 space-y-1">
                {need.practices.map((p) => (
                  <li key={p} className="flex items-start gap-1.5 text-xs text-gray-700">
                    <CheckCircle2 className="w-3 h-3 shrink-0 mt-0.5 text-emerald-500" />
                    <span className="leading-relaxed">{p}</span>
                  </li>
                ))}
              </ul>
              {need.enforcedBy.length === 0 && (
                <p className="mt-2 text-[10px] text-gray-400 flex items-center gap-1">
                  <MinusCircle className="w-3 h-3" /> Guidance only, not auto-checked.
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Sources */}
      <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
          Sources for the {guide.label} standards
        </p>
        <ul className="space-y-1.5">
          {guide.references.map((r) => (
            <li key={r.url}>
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-purple-700 hover:text-purple-900 hover:underline inline-flex items-start gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{r.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
