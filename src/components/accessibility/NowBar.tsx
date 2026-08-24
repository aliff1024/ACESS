'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronDown, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AutoSaveIndicator } from './AutoSaveIndicator';
import { TaskChecklist } from './TaskChecklist';
import { ProgressTimeline } from './ProgressTimeline';

interface NowBarTask {
  id: string;
  title: string;
  completed: boolean;
  type: 'lesson' | 'quiz' | 'assignment';
}

interface NowBarTimelineNode {
  id: string;
  title: string;
  status: 'completed' | 'current' | 'upcoming';
}

interface NowBarProps {
  currentActionLabel: string;
  estimatedMinutes?: number;
  progressPercent: number;
  tasks: NowBarTask[];
  timelineNodes: NowBarTimelineNode[];
  autoSaving: boolean;
  autoSavedAt: Date | null;
  autoSaveError: boolean;
  onBack: () => void;
}

/**
 * ADHD's "Zone A" (docs/accessibility/03 §6.1) — and, as of this build, the
 * *only* orientation chrome an ADHD-preset learner gets in a lesson.
 *
 * The ADHD preset forces effectiveFocusMode on (via `activePreset === 'adhd'`
 * in its definition in LessonViewPage), which hides the normal <header> —
 * that's by design, focus mode is meant to remove distractions. But the
 * *other* header variant, the manually-toggled "Focus Mode Slide
 * Navigation" bar, only renders when the raw `focusMode` state is true,
 * which ADHD's forced focus never sets — it only sets the *derived*
 * effectiveFocusMode. So before this component existed, an ADHD-preset
 * learner in the common case (no explicit lesson.focus_mode_enabled) got
 * neither header: no lesson title, no back button, nothing. Layered on top
 * of that, the same forced focus mode was hiding the Task Checklist,
 * Progress Timeline and Auto-Save indicator the preset itself turns on —
 * docs/accessibility/02 §4.2, the worst bug found in this audit: applying
 * ADHD support hid the very supports it advertised.
 *
 * NowBar fixes both at once by taking over as ADHD's persistent header:
 * back navigation, what to do right now, how far through the lesson, and
 * the save state, always visible — plus the checklist and progress
 * timeline one press away instead of permanently hidden. It intentionally
 * carries no "Continue" button of its own; the lesson content's existing
 * Next/Continue controls remain the one place that action lives, per
 * docs/accessibility/01 §4.3 ("one next action, always visible" means one,
 * not two competing ones).
 *
 * Sticky is safe here specifically because nothing else occupies top:0 in
 * this state — the normal header and the focus-mode slide nav are both
 * absent exactly when this renders (see the gating condition where this
 * is used in LessonViewPage). That is not true for the Dyslexia
 * ReadingToolbar, which sits below a header whose height changes on
 * scroll, which is why that component is deliberately not sticky.
 */
export function NowBar({
  currentActionLabel,
  estimatedMinutes,
  progressPercent,
  tasks,
  timelineNodes,
  autoSaving,
  autoSavedAt,
  autoSaveError,
  onBack,
}: NowBarProps) {
  const [expanded, setExpanded] = useState(false);
  const doneCount = tasks.filter((t) => t.completed).length;

  return (
    <div className="sticky top-0 z-30 bg-card/95 backdrop-blur-sm border-b border-border shadow-sm">
      <div className="content-column mx-auto px-4 py-2.5">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={onBack} aria-label="Back to course">
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold tracking-wider text-primary uppercase shrink-0">Now</span>
              <span className="text-sm font-semibold text-foreground truncate">{currentActionLabel}</span>
              {estimatedMinutes ? (
                <span className="text-xs text-muted-foreground shrink-0">~{estimatedMinutes} min</span>
              ) : null}
            </div>
            <div className="h-1.5 rounded-full bg-muted mt-1.5 overflow-hidden" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100} aria-label="Lesson progress">
              <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <AutoSaveIndicator lastSavedAt={autoSavedAt} saving={autoSaving} error={autoSaveError} />
            {tasks.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                aria-controls="now-bar-tasks"
              >
                <ListChecks className="w-3.5 h-3.5" />
                {doneCount}/{tasks.length}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
              </Button>
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <div id="now-bar-tasks" className="content-column mx-auto px-4 pb-4 space-y-4">
          <TaskChecklist tasks={tasks} />
          <ProgressTimeline nodes={timelineNodes.length > 0 ? timelineNodes : undefined} />
        </div>
      )}
    </div>
  );
}
