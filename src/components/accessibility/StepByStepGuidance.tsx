'use client';

import { useState } from 'react';
import { useAccessibility } from '@/providers/AccessibilityProvider';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft, Layers } from 'lucide-react';

interface Step {
  title: string;
  content: React.ReactNode;
}

interface StepByStepGuidanceProps {
  title?: string;
  steps: Step[];
  onComplete?: () => void;
  children?: React.ReactNode;
}

export function StepByStepGuidance({ title = "Activity Steps", steps, onComplete, children }: StepByStepGuidanceProps) {
  const { settings } = useAccessibility();
  const [currentStep, setCurrentStep] = useState(0);

  if (!settings.step_by_step_enabled) {
    // If not enabled, render the standard children (the full activity at once)
    return <div className="activity-container">{children}</div>;
  }

  if (steps.length === 0) return <>{children}</>;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(c => c + 1);
    } else if (onComplete) {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(c => c - 1);
  };

  return (
    <div className="bg-white border-2 border-teal-100 rounded-xl p-5 shadow-sm my-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="bg-teal-100 p-1.5 rounded-lg">
          <Layers className="w-5 h-5 text-teal-700" />
        </div>
        <h3 className="font-bold text-gray-900">{title}</h3>
        <span className="ml-auto text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-1 rounded-full">
          Step {currentStep + 1} of {steps.length}
        </span>
      </div>

      <div className="mb-6 min-h-[100px]">
        <h4 className="text-lg font-semibold text-teal-900 mb-2">{steps[currentStep].title}</h4>
        <div className="text-gray-700">
          {steps[currentStep].content}
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <Button 
          variant="outline" 
          onClick={handlePrev} 
          disabled={currentStep === 0}
          className="text-gray-600"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Previous
        </Button>
        <Button 
          onClick={handleNext}
          className="bg-teal-600 hover:bg-teal-700 text-white"
        >
          {currentStep === steps.length - 1 ? 'Complete' : 'Next Step'} 
          {currentStep < steps.length - 1 && <ArrowRight className="w-4 h-4 ml-2" />}
        </Button>
      </div>
    </div>
  );
}
