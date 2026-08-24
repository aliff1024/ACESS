'use client';

import { useAccessibility } from '@/providers/AccessibilityProvider';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft, Layers, LogOut } from 'lucide-react';
import { type ReactNode } from 'react';

export interface GuidedStep {
  id: string;
  title: string;
  completed: boolean;
}

interface StepByStepGuidanceProps {
  title?: string;
  steps: GuidedStep[];
  currentIndex: number;
  onStepChange?: (index: number) => void;
  onStepComplete?: (stepId: string) => void;
  onExitGuidedMode?: () => void;
  children?: ReactNode;
  embedded?: boolean;
  /** Hides the icon/title/"Step N of M" header and the progress-dot bar —
   *  for use alongside a schedule/itinerary list that already names the
   *  current step and shows its position, so the two don't repeat the
   *  same "where am I" information twice in the same view
   *  (docs/accessibility/00 §4 Phase 5, second addendum: "visual schedule
   *  and step-by-step mode feels redundant"). Controls (Previous/Next/
   *  Exit) and the disabled-Next explanation are unaffected. */
  compact?: boolean;
}

export function StepByStepGuidance({
  title = 'Lesson Steps',
  steps,
  currentIndex,
  onStepChange,
  onStepComplete,
  onExitGuidedMode,
  children,
  embedded,
  compact = false,
}: StepByStepGuidanceProps) {
  const { settings } = useAccessibility();

  if (!settings.step_by_step_enabled) {
    return <>{children}</>;
  }

  if (steps.length === 0) return <>{children}</>;

  const currentStep = steps[currentIndex];

  const canAdvance = currentStep?.completed;
  const isLastStep = currentIndex === steps.length - 1;
  const currentStepId = currentStep?.id;

  const handleNext = () => {
    if (!canAdvance) return;
    if (onStepComplete) onStepComplete(currentStep.id);
    if (currentIndex < steps.length - 1) {
      onStepChange?.(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) onStepChange?.(currentIndex - 1);
  };

  return (
    <>
      <div className={compact ? '' : 'bg-white border-2 border-teal-100 rounded-xl p-5 shadow-sm mb-4'} data-guided-wizard>
        {!compact && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-teal-100 p-1.5 rounded-lg">
                <Layers className="w-5 h-5 text-teal-700" />
              </div>
              <h3 className="font-bold text-gray-900">{title}</h3>
              <span className="ml-auto text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-1 rounded-full">
                Step {currentIndex + 1} of {steps.length}
              </span>
            </div>

            <div className="flex gap-2 mb-4">
              {steps.map((step, i) => (
                <div
                  key={step.id}
                  className={`flex-1 h-1.5 rounded-full transition-colors ${
                    i === currentIndex ? 'bg-teal-500' : i < currentIndex ? 'bg-teal-300' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>

            <h4 className="text-lg font-semibold text-teal-900 mb-1">{currentStep.title}</h4>
            {currentStep.completed && (
              <p className="text-xs text-teal-600 font-medium">Completed</p>
            )}
          </>
        )}

        {/* flex-wrap, not a bare flex row: this card sits inside the
            measure-locked reading column (.content-column, ~60-72ch —
            deliberately narrow for line-length, docs/accessibility/04
            §3.1), and three buttons — Previous, "Exit Step-by-Step Mode",
            Next/Complete — don't fit on one line at that width without
            wrapping. Without it the row silently overflowed its own
            card by ~80px, forcing horizontal scrolling to reach the
            Next button at all — found live, on this exact narrow
            column, which is why it wasn't caught by type-checking or
            lint. */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-gray-100 mt-4">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="text-gray-600"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Previous
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            {onExitGuidedMode && (
              <Button
                variant="ghost"
                onClick={onExitGuidedMode}
                className="text-gray-400 hover:text-gray-600 text-xs"
              >
                <LogOut className="w-3.5 h-3.5 mr-1" /> Exit Step-by-Step Mode
              </Button>
            )}
            {currentStepId === 'content' && !currentStep.completed && (
              <Button
                variant="outline"
                onClick={() => onStepComplete?.(currentStep.id)}
                className="border-teal-300 text-teal-700 hover:bg-teal-50"
              >
                Mark as Read
              </Button>
            )}
            <Button
              onClick={handleNext}
              disabled={!canAdvance}
              aria-describedby={!canAdvance ? 'guided-next-disabled-reason' : undefined}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {isLastStep ? 'Complete Lesson' : 'Next Step'}
              {!isLastStep && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </div>
        </div>
        {/* docs/accessibility/03 §7.2 "the disabled-Next explanation is
            mandatory" / 00 §Phase 5 exit criteria "every disabled Next
            explains why" — this button used to grey out with no stated
            reason at all. */}
        {!canAdvance && (
          <p id="guided-next-disabled-reason" className="text-xs text-gray-500 text-right mt-2">
            Finish &quot;{currentStep.title}&quot; to continue.
          </p>
        )}
      </div>
      {children}
    </>
  );
}
