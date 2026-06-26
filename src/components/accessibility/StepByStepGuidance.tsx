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
}

export function StepByStepGuidance({
  title = 'Lesson Steps',
  steps,
  currentIndex,
  onStepChange,
  onStepComplete,
  onExitGuidedMode,
  children,
  embedded
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
      <div className="bg-white border-2 border-teal-100 rounded-xl p-5 shadow-sm mb-4" data-guided-wizard>
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

        <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-4">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="text-gray-600"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Previous
          </Button>
          <div className="flex items-center gap-2">
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
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {isLastStep ? 'Complete Lesson' : 'Next Step'}
              {!isLastStep && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </div>
        </div>
      </div>
      {children}
    </>
  );
}
