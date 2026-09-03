'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle, ChevronDown, Wand2, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AuditRule, AuditTab, LessonAuditResult } from '@/lib/accessibility-audit';

/**
 * Compact, floating per-tab accessibility summary.
 *
 * Renders as a floating pill in the top-right of the tab pane, level with the title.
 * Clicking the pill expands into a detailed floating card.
 * Clicking close (X) collapses it back to the floating pill.
 */
interface Props {
  tab: AuditTab;
  result: LessonAuditResult;
  onFix: (rule: AuditRule) => void;
  onOpenAccessibility: () => void;
  busyRuleId: string | null;
}

export function TabAuditStrip({ tab, result, onFix, onOpenAccessibility, busyRuleId }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [showPassing, setShowPassing] = useState(false);

  const rules = result.rules.filter((r) => r.tab === tab && r.status !== 'not_applicable');
  if (rules.length === 0) return null;

  const failing = rules.filter((r) => r.status === 'fail');
  const passing = rules.filter((r) => r.status === 'pass');
  const hasFailing = failing.length > 0;

  const chipColour = hasFailing
    ? 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100 shadow-md ring-1 ring-amber-400/30'
    : 'bg-emerald-50 border-emerald-300 text-emerald-900 hover:bg-emerald-100 shadow-md ring-1 ring-emerald-400/30';

  return (
    <div className="sticky top-0 z-20 flex justify-end h-0 pointer-events-none">
      <div className="relative inline-block pointer-events-auto">
        {/* Collapsed floating pill badge */}
        {!expanded && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-md text-xs font-bold transition-all transform hover:scale-105 active:scale-95 ${chipColour}`}
            title="Click to view accessibility checks for this tab"
          >
            {hasFailing ? (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            ) : (
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            )}
            <span>
              {hasFailing
                ? `${failing.length} issue${failing.length === 1 ? '' : 's'} on this tab`
                : `All ${passing.length} passing on this tab`}
            </span>
            <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-0.5" />
          </button>
        )}

        {/* Expanded floating card */}
        {expanded && (
          <div
            className={`w-[min(540px,88vw)] max-h-[calc(85vh-130px)] overflow-y-auto rounded-2xl border shadow-2xl p-4 transition-all animate-in fade-in zoom-in-95 duration-200 ${
              hasFailing
                ? 'border-amber-300 bg-white/95 ring-1 ring-amber-400/30 backdrop-blur-md'
                : 'border-emerald-300 bg-white/95 ring-1 ring-emerald-400/30 backdrop-blur-md'
            }`}
            role="region"
            aria-label="Accessibility checks for this tab"
          >
            <div className="flex items-start justify-between gap-3 pb-3 mb-3 border-b border-gray-100">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className={`p-1.5 rounded-lg shrink-0 ${hasFailing ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {hasFailing ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900">Accessibility checks on this tab</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {hasFailing
                      ? `${failing.length} need${failing.length === 1 ? 's' : ''} attention, ${passing.length} passing.`
                      : `All ${passing.length} check${passing.length === 1 ? '' : 's'} for this tab pass.`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={onOpenAccessibility}
                  className="text-xs font-semibold text-purple-700 hover:text-purple-900 hover:underline px-2 py-1 rounded-md hover:bg-purple-50 transition-colors whitespace-nowrap"
                >
                  Open tab →
                </button>
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                  title="Collapse"
                  aria-label="Collapse accessibility strip"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {failing.length > 0 && (
              <ul className="space-y-2.5">
                {failing.map((r) => (
                  <li key={r.id} className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 shadow-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900">{r.title}</p>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                              r.severity === 'required'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {r.severity}
                          </span>
                        </div>
                        <p className="text-xs text-gray-700 mt-1 leading-relaxed">{r.detail}</p>
                        <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">
                          <span className="font-semibold text-gray-600">How to fix:</span> {r.requirement}
                        </p>
                      </div>
                      {r.fix && (
                        <Button
                          size="sm"
                          disabled={busyRuleId === r.id}
                          onClick={() => onFix(r)}
                          className="shrink-0 h-8 text-xs font-semibold px-3 bg-purple-600 hover:bg-purple-700 text-white gap-1.5 shadow-sm whitespace-nowrap"
                        >
                          {busyRuleId === r.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Wand2 className="w-3 h-3" />
                          )}
                          {r.fix.label}
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {passing.length > 0 && (
              <div className={failing.length > 0 ? 'mt-3 pt-3 border-t border-gray-100' : ''}>
                <button
                  type="button"
                  onClick={() => setShowPassing((v) => !v)}
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showPassing ? 'rotate-180' : ''}`} />
                  {showPassing ? 'Hide' : 'Show'} passing checks ({passing.length})
                </button>
                {showPassing && (
                  <ul className="mt-2.5 space-y-2">
                    {passing.map((r) => (
                      <li key={r.id} className="flex items-start gap-2 text-xs text-gray-700 bg-gray-50/80 rounded-lg p-2 border border-gray-100">
                        <CheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-600" />
                        <div className="min-w-0">
                          <span className="font-semibold text-gray-900">{r.title}:</span>{' '}
                          <span className="text-gray-600">{r.detail}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
